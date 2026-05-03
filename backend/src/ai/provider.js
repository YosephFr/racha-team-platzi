import { getVisionProvider } from './providers/index.js'

export async function analyzeImage(imagePath) {
  return getVisionProvider().analyzeImage(imagePath)
}

export async function analyzeCertificate(imagePath) {
  return getVisionProvider().analyzeCertificate(imagePath)
}

export async function analyzeImageDataUrl(dataUrl) {
  return getVisionProvider().analyzeImageDataUrl(dataUrl)
}
