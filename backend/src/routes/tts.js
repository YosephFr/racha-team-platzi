import { Router } from 'express'
import { synthesize } from '../tts/elevenlabs.js'

export const ttsRouter = Router()

ttsRouter.post('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })

  const { text } = req.body
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Texto requerido' })
  }

  try {
    const audioUrl = await synthesize(text)
    if (!audioUrl) {
      return res.status(503).json({ error: 'TTS no disponible' })
    }
    res.json({ audioUrl })
  } catch (err) {
    console.error('[tts] Error:', err)
    res.status(500).json({ error: 'Error generando audio' })
  }
})
