import { config } from '../../config.js'
import * as openaiChat from './openai-chat.js'
import * as deepseekChat from './deepseek-chat.js'
import * as openaiVision from './openai-vision.js'
import * as geminiVision from './gemini-vision.js'

const CHAT_PROVIDERS = {
  openai: openaiChat,
  deepseek: deepseekChat,
}

const VISION_PROVIDERS = {
  openai: openaiVision,
  gemini: geminiVision,
}

let cachedChatProvider = null
let cachedVisionProvider = null

export function getChatProvider() {
  if (cachedChatProvider) return cachedChatProvider
  const name = config.ai.chatProvider
  const provider = CHAT_PROVIDERS[name]
  if (!provider) {
    throw new Error(
      `AI_CHAT_PROVIDER invalido: "${name}". Opciones: ${Object.keys(CHAT_PROVIDERS).join(', ')}`
    )
  }
  if (!provider.isConfigured()) {
    throw new Error(
      `Chat provider "${name}" no configurado. Falta ${name === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'}.`
    )
  }
  cachedChatProvider = provider
  return provider
}

export function getVisionProvider() {
  if (cachedVisionProvider) return cachedVisionProvider
  const name = config.ai.visionProvider
  const provider = VISION_PROVIDERS[name]
  if (!provider) {
    throw new Error(
      `AI_VISION_PROVIDER invalido: "${name}". Opciones: ${Object.keys(VISION_PROVIDERS).join(', ')}`
    )
  }
  if (!provider.isConfigured()) {
    throw new Error(
      `Vision provider "${name}" no configurado. Falta ${name === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'}.`
    )
  }
  cachedVisionProvider = provider
  return provider
}

export function describeProviders() {
  return {
    chat: {
      name: config.ai.chatProvider,
      configured: CHAT_PROVIDERS[config.ai.chatProvider]?.isConfigured() ?? false,
    },
    vision: {
      name: config.ai.visionProvider,
      configured: VISION_PROVIDERS[config.ai.visionProvider]?.isConfigured() ?? false,
    },
  }
}
