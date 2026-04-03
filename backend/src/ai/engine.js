import {
  initConversation,
  initChatConversation,
  buildInput,
  buildImageInput,
  callResponses,
  extractText,
  extractToolCalls,
  formatToolResult,
  analyzeImageDataUrl,
} from './provider.js'
import { getToolDefinitions } from './tools/definitions.js'
import { handleToolCall } from './tools/handlers.js'

const MAX_ITERATIONS = 10

const SYSTEM_PROMPT = `Eres Indi, la asistente de estudio de Racha Team Platzi. Eres una compañera de estudio real, no un bot generico.

PERSONALIDAD:
- Motivadora y energetica, pero genuina, no empalagosa ni artificial
- Usas expresiones coloquiales naturales (dale, vamos, crack, genial, buenisimo)
- Celebras logros con entusiasmo real, no con frases genericas
- Tienes humor ligero y referencias a cultura pop cuando encajan
- Si el usuario lleva dias sin estudiar, le dices con cariño que vuelva, sin culpa
- Das tips concretos de estudio y productividad cuando viene al caso
- Recomiendas cursos de Platzi basandote en lo que el usuario esta estudiando

COMPORTAMIENTO CON HERRAMIENTAS:
- Cuando recibes un analisis de foto de INICIO de sesion: usa start_study para registrar, luego send_notification con un mensaje creativo avisando al grupo que el usuario empezo a estudiar.
- Cuando recibes un analisis de foto de FIN de sesion: usa validate_study para verificar progreso. Si es valido, usa complete_streak y luego send_notification celebrando. Si no es valido, explica por que.
- Siempre usa get_user_info para obtener el nombre del usuario antes de enviar notificaciones.
- Los mensajes de WhatsApp deben ser CREATIVOS, DIVERTIDOS y DIFERENTES cada vez. Usa emojis, referencias a pop culture, memes, frases motivacionales originales.
- Cuando el usuario te pide ver su racha o estado, usa get_streak_info.
- Cuando el usuario te pide iniciar una sesion de estudio desde el chat, usa start_study.
- Cuando el usuario te manda una imagen y el analisis indica que es de Platzi, puedes usar start_study para iniciar sesion automaticamente.
- Cuando el usuario te manda una imagen, respondele describiendo lo que ves y dando contexto util.

TONO: Como una amiga que realmente se interesa por tu progreso, no un asistente corporativo.

IMPORTANTE: Responde de forma breve y directa. No uses markdown. Maximo 2-3 oraciones. Habla en español rioplatense natural.`

const STUDY_SYSTEM_PROMPT = `Eres el sistema de validacion de estudio de Racha Team Platzi. Tu trabajo es analizar capturas de pantalla de Platzi y decidir si son validas.

REGLAS ESTRICTAS:
1. Si la descripcion de la imagen menciona que se ve la plataforma de Platzi (cursos, clases, progreso), ES VALIDA.
2. Si la imagen no muestra Platzi o no es una captura de pantalla de estudio, usa reject_image.
3. Para INICIO de sesion: usa get_user_info primero, luego start_study con los datos del curso, luego send_notification.
4. Para FIN de sesion: usa get_user_info primero, luego validate_study (isValid=true si hay avance visible), luego complete_streak, luego send_notification celebrando.
5. Los mensajes de WhatsApp deben ser CREATIVOS y DIFERENTES cada vez. Usa emojis y humor.

FLUJO OBLIGATORIO:
- Siempre llama get_user_info PRIMERO para saber el nombre del usuario.
- Luego ejecuta la accion correspondiente (start_study, validate_study+complete_streak, o reject_image).
- Si la accion fue exitosa (no reject), llama send_notification con un mensaje divertido.

Responde de forma breve y directa. Maximo 2 oraciones. Sin markdown.`

async function executeFlow(conversation, systemPrompt, userMessage, context, tools) {
  let currentInput

  if (context.image) {
    currentInput = buildImageInput(systemPrompt, userMessage, context.image)
  } else {
    currentInput = buildInput(systemPrompt, userMessage)
  }

  let iterations = 0
  const toolResults = []
  let finalText = ''
  const seenSignatures = new Set()

  while (iterations < MAX_ITERATIONS) {
    iterations++
    console.log(`[ai] Iteration ${iterations}, sending to model...`)

    const response = await callResponses(currentInput, conversation, tools)
    const toolCalls = extractToolCalls(response)

    console.log(
      `[ai] Response: ${toolCalls.length} tool calls, text: "${(extractText(response) || '').slice(0, 100)}"`
    )

    if (!toolCalls.length) {
      finalText = extractText(response)
      break
    }

    const signature = toolCalls.map((c) => `${c.name}:${c.arguments}`).join('|')
    if (seenSignatures.has(signature)) {
      console.warn('[ai] Tool call loop detected, breaking')
      finalText = extractText(response) || 'Listo, todo procesado.'
      break
    }
    seenSignatures.add(signature)

    const results = []
    for (const call of toolCalls) {
      const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments
      console.log(`[ai] Tool call: ${call.name}(${JSON.stringify(args)})`)
      const result = await handleToolCall(call.name, args, {
        userId: conversation.userId,
        ...context,
      })
      console.log(`[ai] Tool result: ${call.name} ->`, JSON.stringify(result).slice(0, 200))
      toolResults.push({ tool: call.name, args, result })
      results.push(formatToolResult(call.call_id, result))
    }

    currentInput = results
  }

  console.log(
    `[ai] Flow complete: ${iterations} iterations, ${toolResults.length} tool calls, text: "${finalText.slice(0, 100)}"`
  )

  return {
    message: finalText,
    toolResults,
    iterations,
  }
}

export async function runAIFlow(userId, userMessage, context = {}, chatConversationId = null) {
  let conversation
  if (chatConversationId) {
    conversation = await initChatConversation(userId, chatConversationId)
  } else {
    conversation = await initConversation(userId)
  }
  conversation.userId = userId

  if (context.image) {
    console.log('[ai] Image detected in context, analyzing with vision...')
    try {
      const visionText = await analyzeImageDataUrl(context.image)
      console.log('[ai] Vision analysis:', visionText.slice(0, 200))
      userMessage = `${userMessage}\n\n[Analisis de la imagen enviada por el usuario]:\n${visionText}`
      delete context.image
    } catch (err) {
      console.error('[ai] Vision analysis failed:', err.message)
      userMessage = `${userMessage}\n\n[El usuario envio una imagen pero no se pudo analizar]`
      delete context.image
    }
  }

  const tools = getToolDefinitions()
  return executeFlow(conversation, SYSTEM_PROMPT, userMessage, context, tools)
}

export async function runStudyFlow(userId, userMessage, context = {}) {
  const conversation = await initConversation(userId)
  conversation.userId = userId

  const tools = getToolDefinitions()
  return executeFlow(conversation, STUDY_SYSTEM_PROMPT, userMessage, context, tools)
}
