import { Router } from 'express'
import { randomUUID } from 'crypto'
import { queries } from '../db/index.js'
import { runAIFlow } from '../ai/engine.js'
import { synthesize } from '../tts/elevenlabs.js'
import OpenAI from 'openai'
import { config } from '../config.js'

export const chatRouter = Router()

chatRouter.get('/conversations', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const conversations = queries.getChatConversations(req.user.userId)
  res.json({ conversations })
})

chatRouter.post('/conversations', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const { title } = req.body
  const id = randomUUID()
  const conversation = queries.createChatConversation(
    id,
    req.user.userId,
    title || 'Nueva conversacion'
  )
  res.json({ conversation })
})

chatRouter.delete('/conversations/:id', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  queries.deleteChatConversation(req.params.id, req.user.userId)
  res.json({ ok: true })
})

chatRouter.get('/conversations/:id/messages', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const conv = queries.getChatConversation(req.params.id, req.user.userId)
  if (!conv) return res.status(404).json({ error: 'Conversacion no encontrada' })

  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0
  const messages = queries.getChatMessages(req.params.id, limit, offset)
  const total = queries.getChatMessageCount(req.params.id)
  res.json({ messages, total })
})

function shouldGenerateVoice(convId, toolResults) {
  const messageCount = queries.getChatMessageCount(convId)
  if (messageCount <= 1) return true
  if (toolResults.some((t) => t.tool === 'complete_streak')) return true
  return false
}

chatRouter.post('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })

  const { conversationId, image } = req.body
  const message = typeof req.body.message === 'string' ? req.body.message.slice(0, 10000) : null
  if (!message && !image) {
    return res.status(400).json({ error: 'Mensaje requerido' })
  }

  try {
    let convId = conversationId
    if (convId) {
      const conv = queries.getChatConversation(convId, req.user.userId)
      if (!conv) return res.status(404).json({ error: 'Conversacion no encontrada' })
    } else {
      const id = randomUUID()
      const title = (message || 'Imagen').slice(0, 60)
      queries.createChatConversation(id, req.user.userId, title)
      convId = id
    }

    if (message) {
      queries.addChatMessage(convId, 'user', message, image || null, null, null)
    } else if (image) {
      queries.addChatMessage(convId, 'user', null, image, null, null)
    }

    const userText = message || 'El usuario envio una imagen para analizar.'
    const context = {}
    if (image) context.image = image

    const result = await runAIFlow(req.user.userId, userText, context, convId)

    let audioUrl = null
    if (result.message && shouldGenerateVoice(convId, result.toolResults)) {
      try {
        audioUrl = await synthesize(result.message)
      } catch (err) {
        console.error('[chat] TTS failed:', err.message)
      }
    }

    const toolCalls = result.toolResults.length > 0 ? result.toolResults : null
    queries.addChatMessage(convId, 'assistant', result.message, null, audioUrl, toolCalls)

    res.json({
      message: result.message,
      conversationId: convId,
      toolResults: result.toolResults,
      audioUrl,
    })
  } catch (err) {
    console.error('[chat] Error:', err)
    res.status(500).json({ error: 'Error al procesar el mensaje' })
  }
})

chatRouter.post('/transcribe', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })

  const file = req.file
  if (!file) return res.status(400).json({ error: 'Audio requerido' })

  try {
    const client = new OpenAI({ apiKey: config.openai.apiKey })
    const { File } = await import('node:buffer')
    const audioFile = new File([file.buffer], file.originalname || 'audio.webm', {
      type: file.mimetype,
    })
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })
    res.json({ text: transcription.text })
  } catch (err) {
    console.error('[chat/transcribe] Error:', err)
    res.status(500).json({ error: 'Error al transcribir audio' })
  }
})
