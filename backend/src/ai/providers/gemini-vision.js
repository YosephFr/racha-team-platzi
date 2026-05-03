/* global fetch */
import { config } from '../../config.js'
import { IMAGE_DATAURL_PROMPT, readImageAsBase64, parseDataUrl } from './prompts.js'

export const name = 'gemini'

export function isConfigured() {
  return Boolean(config.gemini.apiKey)
}

function getEndpoint(model) {
  const base = config.gemini.baseUrl.replace(/\/$/, '')
  return `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.gemini.apiKey)}`
}

async function callGenerateContent(payload) {
  const url = getEndpoint(config.gemini.visionModel)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 500)}`)
  }
  return res.json()
}

function extractFirstText(response) {
  const candidates = response?.candidates || []
  for (const cand of candidates) {
    const parts = cand?.content?.parts || []
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text) return part.text
    }
  }
  return ''
}

function safeParseJson(text, fallback) {
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    // fall through to fenced/embedded JSON extraction below
  }
  const cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return fallback
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return fallback
  }
}

const VISION_SYSTEM = `Eres un analizador de imagenes de la plataforma Platzi (educacion online). Tu tarea es devolver JSON estructurado con TODA la informacion visible en la captura. Responde SIEMPRE con un objeto JSON valido, sin texto adicional fuera del JSON.`

const VISION_USER = `Analiza la captura. Determina si muestra contenido de Platzi en cualquiera de sus formatos (web, app movil con "CLASE X DE Y", reproductor desktop). Devuelve un JSON con esta forma exacta (usa null cuando un campo no aplique):
{
  "visualDescription": "descripcion visual de 3-5 oraciones (interfaz, colores, elementos, texto, contexto)",
  "isPlatzi": true | false,
  "isBlurry": true | false,
  "course": "nombre completo del curso o null",
  "courseSlug": "slug del curso (ej: curso-de-react-2025) o null",
  "lesson": "leccion/modulo o null",
  "classTitle": "titulo exacto de la clase o null",
  "classNumber": "numero de clase (ej: '6') o null",
  "totalClasses": "total de clases (ej: '15') o null",
  "progress": "porcentaje (ej: '22%') o null",
  "instructor": "nombre del instructor o null",
  "videoDuration": "duracion (ej: '08:32') o null",
  "videoPosition": "posicion actual (ej: '00:27') o null",
  "contentType": "video|lectura|quiz|proyecto o null",
  "url": "URL completa visible o null",
  "subtitles": "subtitulos visibles o null",
  "platform": "web|app-movil|desktop-player o null",
  "additionalInfo": "datos adicionales o null"
}`

const CERTIFICATE_SYSTEM = `Eres un extractor de datos de certificados de Platzi. Devuelves JSON estructurado SIN texto adicional fuera del JSON.`

const CERTIFICATE_USER = `Analiza el certificado de Platzi. Devuelve un JSON con esta forma exacta (usa null cuando no aplique):
{
  "visualDescription": "descripcion visual del certificado (2-3 oraciones)",
  "isPlatziCertificate": true | false,
  "isReadable": true | false,
  "courseName": "nombre del curso o null",
  "studentName": "nombre del estudiante o null",
  "completionDate": "fecha YYYY-MM-DD o null",
  "totalHours": "horas o null",
  "totalClasses": "numero de clases o null",
  "certificateId": "ID alfanumerico o null",
  "certificateUrl": "URL de verificacion o null",
  "schoolName": "escuela/ruta o null",
  "instructorName": "instructor o null",
  "additionalInfo": "datos adicionales o null"
}`

async function structuredVisionCall(systemText, userText, base64, mimeType, fallback) {
  const payload = {
    system_instruction: { parts: [{ text: systemText }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }, { inline_data: { mime_type: mimeType, data: base64 } }],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.2,
    },
  }
  const response = await callGenerateContent(payload)
  const text = extractFirstText(response)
  return safeParseJson(text, { ...fallback, visualDescription: text || '' })
}

export async function analyzeImage(imagePath) {
  const { base64, mimeType } = readImageAsBase64(imagePath)
  return structuredVisionCall(VISION_SYSTEM, VISION_USER, base64, mimeType, {
    isPlatzi: false,
    isBlurry: false,
    course: null,
    lesson: null,
    classNumber: null,
    progress: null,
    additionalInfo: null,
  })
}

export async function analyzeCertificate(imagePath) {
  const { base64, mimeType } = readImageAsBase64(imagePath)
  return structuredVisionCall(CERTIFICATE_SYSTEM, CERTIFICATE_USER, base64, mimeType, {
    isPlatziCertificate: false,
    isReadable: false,
    courseName: null,
    additionalInfo: null,
  })
}

export async function analyzeImageDataUrl(dataUrl) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw new Error('dataUrl invalido')
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: IMAGE_DATAURL_PROMPT },
          { inline_data: { mime_type: parsed.mimeType, data: parsed.base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.4 },
  }
  const response = await callGenerateContent(payload)
  return extractFirstText(response)
}
