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

const VISION_PROMPT = `Analiza esta imagen en detalle. Determina si muestra contenido de la plataforma Platzi (educacion online).

FORMATOS VALIDOS DE PLATZI:
- Interfaz web de Platzi (platzi.com): reproductor de video, barra lateral, lista de clases, URL visible
- App movil de Platzi: reproductor de video con overlay oscuro, titulo de clase arriba (ej: "CLASE 6 DE 15"), nombre del curso, barra de progreso, seccion de comentarios abajo, tabs de Recursos/Comentarios/Clases
- Reproductor de video de Platzi en desktop: titulo de la clase en la parte superior con fondo oscuro/verde, numero de clase (ej: "Clase 6 de 15 - Curso Gratis de..."), video con controles de play/pause/15s, miniatura del instructor
- Cualquier captura que muestre contenido educativo de Platzi de forma reconocible

INSTRUCCIONES:
1. Extrae TODA la informacion visible:
   - URL del navegador si es visible (platzi.com/clases/nombre-del-curso)
   - Titulo de la clase (puede estar arriba del video como "CLASE X DE Y" o en un header)
   - Nombre del curso completo
   - Leccion, modulo o seccion
   - Numero de clase y total (ej: "6 de 15")
   - Porcentaje o barra de progreso
   - Nombre del profesor/instructor (si aparece su nombre o miniatura)
   - Duracion del video y posicion actual
   - Tipo de contenido: video, lectura, quiz, proyecto
   - Subtitulos o texto visible en el video
   - Comentarios visibles de otros estudiantes

2. Si la imagen esta borrosa o ilegible: indica que no se puede leer bien pero intenta extraer lo que puedas.

3. Si NO es contenido de Platzi: indica claramente que no es Platzi.

Responde con DOS secciones separadas por "---":

PRIMERA SECCION: Descripcion visual detallada de todo lo que ves en la imagen (interfaz, colores, elementos, texto, contexto). 3-5 oraciones.

---

SEGUNDA SECCION: JSON valido con los datos extraidos:
{
  "isPlatzi": true/false,
  "isBlurry": true/false,
  "course": "nombre completo del curso (en app movil puede no estar visible: usa el titulo de la clase si no hay otro dato) o null",
  "courseSlug": "slug de la URL (ej: curso-de-react-2025) o null",
  "lesson": "nombre de la leccion/modulo o null",
  "classTitle": "titulo exacto de la clase o null",
  "classNumber": "numero de clase (ej: '6') o null",
  "totalClasses": "total de clases del curso (ej: '15') o null",
  "progress": "porcentaje de progreso (ej: '22%') o null",
  "instructor": "nombre del profesor o null",
  "videoDuration": "duracion del video (ej: '08:32') o null",
  "videoPosition": "posicion actual del video (ej: '00:27') o null",
  "contentType": "video/lectura/quiz/proyecto o null",
  "url": "URL completa visible en el navegador o null",
  "subtitles": "texto de subtitulos visibles o null",
  "platform": "web/app-movil/desktop-player o null",
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
    max_tokens: 2048,
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
    const parts = text.split('---')
    const visualDescription = (parts[0] || '').trim()
    const jsonPart = (parts[1] || parts[0] || '').trim()
    const cleaned = jsonPart
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1) throw new Error('No JSON found')
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
    parsed.visualDescription = visualDescription
    return parsed
  } catch {
    return {
      course: null,
      lesson: null,
      classNumber: null,
      progress: null,
      visualDescription: text,
      additionalInfo: text,
    }
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
