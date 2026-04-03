import OpenAI from 'openai'
import { config } from '../config.js'
import { queries } from '../db/index.js'

let client = null

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey })
  }
  return client
}

export async function initConversation(userId) {
  let conversationId = queries.getConversationId(userId)
  if (conversationId) {
    return { conversationId }
  }

  const conv = await getClient().conversations.create({
    metadata: { user_id: String(userId) },
  })
  conversationId = conv.id
  queries.saveConversationId(userId, conversationId)
  return { conversationId }
}

export async function initChatConversation(userId, chatConversationId) {
  const chatConv = queries.getChatConversation(chatConversationId, userId)
  if (chatConv?.openai_conversation_id) {
    return { conversationId: chatConv.openai_conversation_id, chatConversationId }
  }

  const conv = await getClient().conversations.create({
    metadata: { user_id: String(userId), chat_conversation_id: chatConversationId },
  })
  queries.saveChatConversationOpenAIId(chatConversationId, conv.id)
  return { conversationId: conv.id, chatConversationId }
}

export function buildInput(systemPrompt, userMessage) {
  return [
    { role: 'developer', type: 'message', content: [{ type: 'input_text', text: systemPrompt }] },
    { role: 'user', type: 'message', content: [{ type: 'input_text', text: userMessage }] },
  ]
}

export function buildImageInput(systemPrompt, userMessage, imageDataUrl) {
  return [
    { role: 'developer', type: 'message', content: [{ type: 'input_text', text: systemPrompt }] },
    {
      role: 'user',
      type: 'message',
      content: [
        { type: 'input_text', text: userMessage },
        { type: 'input_image', image_url: imageDataUrl },
      ],
    },
  ]
}

export async function callResponses(input, conversation, tools) {
  const payload = {
    model: config.openai.chatModel,
    input,
    tools,
    tool_choice: 'auto',
    conversation: conversation.conversationId,
    reasoning: { effort: config.openai.reasoningEffort },
  }

  try {
    return await getClient().responses.create(payload)
  } catch (err) {
    if (err.status === 404 || (err.status === 400 && err.message?.includes('conversation'))) {
      console.warn('[ai] Conversation not found, recreating...')
      const conv = await getClient().conversations.create({
        metadata: { user_id: String(conversation.userId) },
      })
      conversation.conversationId = conv.id
      if (conversation.chatConversationId) {
        queries.saveChatConversationOpenAIId(conversation.chatConversationId, conv.id)
      } else {
        queries.saveConversationId(conversation.userId, conv.id)
      }
      payload.conversation = conv.id
      return await getClient().responses.create(payload)
    }
    throw err
  }
}

export function extractText(response) {
  if (response.output_text) return response.output_text
  for (const item of response.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.type === 'output_text') return content.text
      }
    }
  }
  return ''
}

export function extractToolCalls(response) {
  return (response.output || []).filter((item) => item.type === 'function_call')
}

export function formatToolResult(callId, result) {
  return {
    type: 'function_call_output',
    call_id: callId,
    output: JSON.stringify(result),
  }
}

const VISION_PROMPT = `Analiza esta captura de pantalla en detalle. Determina si es de la plataforma Platzi (educacion online).

INSTRUCCIONES:
1. Si ves la interfaz de Platzi (logo, cursos, clases, reproductor de video, barra lateral):
   - Lee la URL del navegador si es visible para extraer el slug del curso (platzi.com/clases/nombre-del-curso)
   - Lee el header/titulo de la clase visible
   - Identifica el nombre de la leccion o modulo/seccion
   - Identifica el numero de clase si aparece (ej: "Clase 5 de 23")
   - Lee el porcentaje o barra de progreso si es visible
   - Extrae el total de clases del curso si aparece
   - Nombre del profesor o instructor si es visible
   - Duracion del video si aparece
   - Si hay comentarios visibles o interacciones, indicar
   - Tipo de contenido: video, lectura, quiz, proyecto

2. Si la imagen esta borrosa o ilegible: indica que no se puede leer bien.

3. Si NO es una captura de Platzi: indica claramente que no es Platzi.

Responde UNICAMENTE con JSON valido:
{
  "isPlatzi": true/false,
  "isBlurry": true/false,
  "course": "nombre completo del curso o null",
  "courseSlug": "slug de la URL (ej: curso-de-react-2025) o null",
  "lesson": "nombre de la leccion/modulo o null",
  "classTitle": "titulo exacto de la clase o null",
  "classNumber": "numero de clase (ej: '5') o null",
  "totalClasses": "total de clases del curso (ej: '23') o null",
  "progress": "porcentaje de progreso (ej: '22%') o null",
  "instructor": "nombre del profesor o null",
  "videoDuration": "duracion del video (ej: '12:34') o null",
  "contentType": "video/lectura/quiz/proyecto o null",
  "url": "URL completa visible en el navegador o null",
  "additionalInfo": "cualquier otro dato relevante o null"
}`

export async function analyzeImage(imagePath) {
  const { readFileSync } = await import('fs')
  const imageData = readFileSync(imagePath)
  const base64 = imageData.toString('base64')
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
  const dataUrl = `data:${mimeType};base64,${base64}`

  const response = await getClient().chat.completions.create({
    model: config.openai.visionModel,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  })

  const text = response.choices[0].message.content
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    return JSON.parse(cleaned)
  } catch {
    return { course: null, lesson: null, classNumber: null, progress: null, additionalInfo: text }
  }
}

export async function analyzeImageDataUrl(dataUrl) {
  const response = await getClient().chat.completions.create({
    model: config.openai.visionModel,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe detalladamente lo que ves en esta imagen. Si es una captura de pantalla de Platzi (plataforma de educacion online), extrae: nombre del curso, leccion, numero de clase, URL visible, progreso. Si no es de Platzi, describe lo que ves. Si esta borrosa, indicalo. Responde en español de forma natural y concisa.`,
          },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  })

  return response.choices[0].message.content
}
