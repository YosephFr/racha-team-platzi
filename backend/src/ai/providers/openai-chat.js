import OpenAI from 'openai'
import { config } from '../../config.js'
import { queries } from '../../db/index.js'

export const name = 'openai'
export const supportsVisionInChat = true
export const supportsServerConversation = true

let client = null

function getClient() {
  if (!client) {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY no configurada')
    }
    client = new OpenAI({ apiKey: config.openai.apiKey })
  }
  return client
}

export function isConfigured() {
  return Boolean(config.openai.apiKey)
}

async function resolveServerConversation(conversation) {
  const { userId, chatConversationId, ephemeral } = conversation

  if (ephemeral) {
    const conv = await getClient().conversations.create({
      metadata: { user_id: String(userId), type: 'study' },
    })
    return conv.id
  }

  if (chatConversationId) {
    const chatConv = queries.getChatConversation(chatConversationId, userId)
    if (chatConv?.openai_conversation_id) return chatConv.openai_conversation_id
    const conv = await getClient().conversations.create({
      metadata: { user_id: String(userId), chat_conversation_id: chatConversationId },
    })
    queries.saveChatConversationOpenAIId(chatConversationId, conv.id)
    return conv.id
  }

  const existing = queries.getConversationId(userId)
  if (existing) return existing
  const conv = await getClient().conversations.create({
    metadata: { user_id: String(userId) },
  })
  queries.saveConversationId(userId, conv.id)
  return conv.id
}

async function recreateConversation(conversation) {
  const { userId, chatConversationId } = conversation
  const conv = await getClient().conversations.create({
    metadata: { user_id: String(userId) },
  })
  if (chatConversationId) {
    queries.saveChatConversationOpenAIId(chatConversationId, conv.id)
  } else {
    queries.saveConversationId(userId, conv.id)
  }
  return conv.id
}

function buildInput(systemPrompt, userMessage, image) {
  const userContent = [{ type: 'input_text', text: userMessage }]
  if (image) userContent.push({ type: 'input_image', image_url: image })
  return [
    { role: 'developer', type: 'message', content: [{ type: 'input_text', text: systemPrompt }] },
    { role: 'user', type: 'message', content: userContent },
  ]
}

async function callResponses(input, conversationId, tools, conversation) {
  const payload = {
    model: config.openai.chatModel,
    input,
    tools,
    tool_choice: 'auto',
    conversation: conversationId,
    reasoning: { effort: config.openai.reasoningEffort },
  }
  try {
    return { response: await getClient().responses.create(payload), conversationId }
  } catch (err) {
    const recreate =
      err.status === 404 ||
      (err.status === 400 &&
        (err.message?.includes('conversation') || err.message?.includes('No tool output found')))
    if (!recreate) throw err
    console.warn('[ai/openai] Conversation broken, recreating...')
    const newId = await recreateConversation(conversation)
    payload.conversation = newId
    return { response: await getClient().responses.create(payload), conversationId: newId }
  }
}

function extractText(response) {
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

function extractToolCalls(response) {
  return (response.output || []).filter((item) => item.type === 'function_call')
}

function formatToolResult(callId, result) {
  return {
    type: 'function_call_output',
    call_id: callId,
    output: JSON.stringify(result),
  }
}

export async function runFlow({
  systemPrompt,
  userMessage,
  image,
  tools,
  conversation,
  context,
  handleToolCall,
  maxIterations = 10,
}) {
  let conversationId = await resolveServerConversation(conversation)

  let currentInput = buildInput(systemPrompt, userMessage, image)
  let iterations = 0
  const toolResults = []
  let finalText = ''
  const seenSignatures = new Set()

  while (iterations < maxIterations) {
    iterations++
    console.log(`[ai/openai] Iteration ${iterations}, sending to model...`)

    const result = await callResponses(currentInput, conversationId, tools, conversation)
    conversationId = result.conversationId
    const response = result.response
    const toolCalls = extractToolCalls(response)
    console.log(
      `[ai/openai] Response: ${toolCalls.length} tool calls, text: "${(extractText(response) || '').slice(0, 100)}"`
    )

    if (!toolCalls.length) {
      finalText = extractText(response)
      break
    }

    const signature = toolCalls.map((c) => `${c.name}:${c.arguments}`).join('|')
    if (seenSignatures.has(signature)) {
      console.warn('[ai/openai] Tool call loop detected, breaking')
      finalText = extractText(response) || 'Listo, todo procesado.'
      break
    }
    seenSignatures.add(signature)

    const results = []
    for (const call of toolCalls) {
      const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments
      console.log(`[ai/openai] Tool call: ${call.name}(${JSON.stringify(args)})`)
      const toolResult = await handleToolCall(call.name, args, context)
      console.log(
        `[ai/openai] Tool result: ${call.name} ->`,
        JSON.stringify(toolResult).slice(0, 200)
      )
      toolResults.push({ tool: call.name, args, result: toolResult })
      results.push(formatToolResult(call.call_id, toolResult))
    }
    currentInput = results
  }

  console.log(
    `[ai/openai] Flow complete: ${iterations} iterations, ${toolResults.length} tool calls, text: "${finalText.slice(0, 100)}"`
  )
  return { message: finalText, toolResults, iterations }
}
