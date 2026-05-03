import OpenAI from 'openai'
import { config } from '../../config.js'
import {
  VISION_PROMPT,
  CERTIFICATE_VISION_PROMPT,
  IMAGE_DATAURL_PROMPT,
  parseStructuredVisionResponse,
  readImageAsDataUrl,
} from './prompts.js'

export const name = 'openai'

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

async function callVision(prompt, dataUrl, maxTokens) {
  const response = await getClient().chat.completions.create({
    model: config.openai.visionModel,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  })
  return response.choices[0].message.content
}

export async function analyzeImage(imagePath) {
  const dataUrl = readImageAsDataUrl(imagePath)
  const text = await callVision(VISION_PROMPT, dataUrl, 2048)
  return parseStructuredVisionResponse(text, {
    course: null,
    lesson: null,
    classNumber: null,
    progress: null,
  })
}

export async function analyzeCertificate(imagePath) {
  const dataUrl = readImageAsDataUrl(imagePath)
  const text = await callVision(CERTIFICATE_VISION_PROMPT, dataUrl, 2048)
  return parseStructuredVisionResponse(text, {
    isPlatziCertificate: false,
    isReadable: false,
    courseName: null,
  })
}

export async function analyzeImageDataUrl(dataUrl) {
  return callVision(IMAGE_DATAURL_PROMPT, dataUrl, 1024)
}
