/* global fetch */
import { config } from '../../config.js'
import { queries } from '../../db/index.js'

export const name = 'deepseek'
export const supportsVisionInChat = false
export const supportsServerConversation = false

export function isConfigured() {
  return Boolean(config.deepseek.apiKey)
}

function toolsToChatCompletions(tools) {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name || t.function?.name,
      description: t.description || t.function?.description,
      parameters: t.parameters || t.function?.parameters || { type: 'object', properties: {} },
    },
  }))
}

const HISTORY_LIMIT = 20

function loadHistory(conversation) {
  if (conversation.ephemeral || !conversation.chatConversationId) return []
  try {
    const rows = queries.getChatMessages(conversation.chatConversationId, HISTORY_LIMIT, 0)
    const messages = []
    for (const row of rows) {
      const content = (row.content || '').trim()
      if (!content) continue
      if (row.role === 'user' || row.role === 'assistant') {
        messages.push({ role: row.role, content })
      }
    }
    if (messages.length && messages[messages.length - 1].role === 'user') {
      messages.pop()
    }
    return messages
  } catch (err) {
    console.warn('[ai/deepseek] history load failed:', err.message)
    return []
  }
}

async function callChatCompletions(messages, tools) {
  const baseUrl = config.deepseek.baseUrl.replace(/\/$/, '')
  const url = `${baseUrl}/chat/completions`
  const body = {
    model: config.deepseek.chatModel,
    messages,
    tools,
    tool_choice: 'auto',
    stream: false,
  }
  if (config.deepseek.reasoningEffort) {
    body.reasoning_effort = config.deepseek.reasoningEffort
  }
  if (config.deepseek.maxTokens) body.max_tokens = config.deepseek.maxTokens

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepSeek ${res.status}: ${text.slice(0, 500)}`)
  }
  return res.json()
}

function extractAssistantMessage(response) {
  return response?.choices?.[0]?.message || null
}

export async function runFlow({
  systemPrompt,
  userMessage,
  tools,
  conversation,
  context,
  handleToolCall,
  maxIterations = 10,
}) {
  const chatTools = toolsToChatCompletions(tools)
  const history = loadHistory(conversation)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]

  let iterations = 0
  const toolResults = []
  let finalText = ''
  const seenSignatures = new Set()

  while (iterations < maxIterations) {
    iterations++
    console.log(`[ai/deepseek] Iteration ${iterations}, sending to model...`)

    const response = await callChatCompletions(messages, chatTools)
    const assistantMessage = extractAssistantMessage(response)
    if (!assistantMessage) {
      console.warn('[ai/deepseek] Empty response, breaking')
      break
    }

    const toolCalls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : []
    const text = (assistantMessage.content || '').trim()
    console.log(
      `[ai/deepseek] Response: ${toolCalls.length} tool calls, text: "${text.slice(0, 100)}"`
    )

    if (!toolCalls.length) {
      finalText = text
      break
    }

    const signature = toolCalls.map((c) => `${c.function?.name}:${c.function?.arguments}`).join('|')
    if (seenSignatures.has(signature)) {
      console.warn('[ai/deepseek] Tool call loop detected, breaking')
      finalText = text || 'Listo, todo procesado.'
      break
    }
    seenSignatures.add(signature)

    const replayMessage = {
      role: 'assistant',
      content: assistantMessage.content ?? null,
      tool_calls: toolCalls.map((c) => ({
        id: c.id,
        type: 'function',
        function: { name: c.function.name, arguments: c.function.arguments },
      })),
    }
    if (assistantMessage.reasoning_content) {
      replayMessage.reasoning_content = assistantMessage.reasoning_content
    }
    messages.push(replayMessage)

    for (const call of toolCalls) {
      const callName = call.function?.name
      const rawArgs = call.function?.arguments
      let args = {}
      try {
        args = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : rawArgs || {}
      } catch (err) {
        console.warn(`[ai/deepseek] Tool args parse failed for ${callName}:`, err.message)
      }
      console.log(`[ai/deepseek] Tool call: ${callName}(${JSON.stringify(args)})`)
      const toolResult = await handleToolCall(callName, args, context)
      console.log(
        `[ai/deepseek] Tool result: ${callName} ->`,
        JSON.stringify(toolResult).slice(0, 200)
      )
      toolResults.push({ tool: callName, args, result: toolResult })
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      })
    }
  }

  console.log(
    `[ai/deepseek] Flow complete: ${iterations} iterations, ${toolResults.length} tool calls, text: "${finalText.slice(0, 100)}"`
  )
  return { message: finalText, toolResults, iterations }
}
