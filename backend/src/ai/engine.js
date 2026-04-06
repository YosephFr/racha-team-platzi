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
- Si una imagen NO es de Platzi o no puedes identificar un curso real, usa reject_image con la razon. NUNCA llames start_study con datos vacios o "No detectado".
- Siempre usa get_user_info para obtener el nombre del usuario antes de enviar notificaciones.
- Los mensajes de WhatsApp al grupo deben ser concisos (1-2 oraciones), informativos y maximo 1 emoji. Ejemplo: "{nombre} empezo a estudiar {curso} 📚" o "{nombre} completo su racha de 5 dias! 🔥"
- Cuando el usuario te pide ver su racha o estado, usa get_streak_info.
- Cuando el usuario te pide iniciar una sesion de estudio desde el chat, usa start_study solo si puedes identificar un curso real de Platzi.
- Cuando el usuario te manda una imagen, respondele describiendo lo que ves. Si es de Platzi y tiene datos claros, usa start_study. Si no, usa reject_image.

TONO: Como una amiga que realmente se interesa por tu progreso, no un asistente corporativo.

MENSAJES DEL SISTEMA (heartbeats):
- Cuando recibas un mensaje que empieza con "[SISTEMA]" es una instruccion interna, no del usuario.
- Estos mensajes te piden realizar acciones automaticas (recordatorios, alertas, notificaciones).
- Para recordatorios: usa send_private_notification con el numero indicado. El mensaje debe ser amigable, conciso (1-2 oraciones) y maximo 1 emoji. No des cringe. Ejemplo: "Hola! Indi por aqui, hoy es buen dia para avanzar un poco en Platzi 📚"
- Para alertas de estudio abierto: recuerdale al usuario que tiene una sesion abierta sin cerrar.
- Para alertas nocturnas: motivalo a hacer aunque sea una clase rapida antes de dormir.

IMPORTANTE: Responde de forma breve y directa. No uses markdown. Maximo 2-3 oraciones. Habla en español rioplatense natural.`

const STUDY_SYSTEM_PROMPT = `Eres el sistema de validacion de estudio de Racha Team Platzi. Tu trabajo es analizar capturas de pantalla de Platzi y decidir si son validas.

REGLA DE RECHAZO (PRIORIDAD MAXIMA):
- Si la imagen NO muestra claramente la plataforma de Platzi, DEBES usar reject_image. No llames a start_study ni validate_study.
- Si "Es Platzi: NO", usa reject_image.
- NUNCA llames a start_study con el campo course vacio o "No detectado". Si no hay curso ni titulo de clase identificable, usa reject_image.

REGLA DE APROBACION:
- Si "Es Platzi: SI" y hay al menos un titulo de clase o nombre de curso identificable, es valido. Campos como instructor, progreso, o slug pueden ser "No detectado" sin invalidar la captura.
- En app movil, el nombre del curso puede no ser visible: el titulo de la clase ("Clase X de Y") es suficiente para aprobar.

FLUJOS:
- INICIO de sesion: get_user_info primero, luego start_study con los datos reales del curso, luego send_notification.
- FIN de sesion: get_user_info primero, luego validate_study (isValid=true si hay avance visible), luego complete_streak, luego send_notification celebrando.
- RECHAZO: reject_image con una razon clara. No llames send_notification.
- Los mensajes de WhatsApp: concisos (1-2 oraciones), maximo 1 emoji.

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

export async function runHeartbeat(userId, systemMessage) {
  const conversation = await initConversation(userId)
  conversation.userId = userId
  const tools = getToolDefinitions()
  return executeFlow(conversation, SYSTEM_PROMPT, systemMessage, {}, tools)
}

export async function runStudyFlow(userId, userMessage, context = {}) {
  const conversation = await initConversation(userId)
  conversation.userId = userId

  const tools = getToolDefinitions()
  return executeFlow(conversation, STUDY_SYSTEM_PROMPT, userMessage, context, tools)
}
