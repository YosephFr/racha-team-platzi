import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { config } from '../config.js'

const TTS_DIR = resolve('./data/uploads/tts')
mkdirSync(TTS_DIR, { recursive: true })

const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
}

export async function synthesize(text) {
  const apiKey = config.elevenlabs.apiKey
  if (!apiKey) {
    console.warn('[tts] ELEVENLABS_API_KEY not configured, skipping TTS')
    return null
  }

  const voiceId = config.elevenlabs.voiceId
  const modelId = config.elevenlabs.model
  const outputFormat = 'mp3_44100_128'

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
  const payload = {
    model_id: modelId,
    text,
    voice_settings: VOICE_SETTINGS,
    output_format: outputFormat,
  }

  console.log(`[tts] Generating speech: ${text.slice(0, 80)}...`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      accept: 'application/octet-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    console.error(`[tts] ElevenLabs API error ${response.status}: ${errText.slice(0, 300)}`)
    return null
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const filename = `tts-${Date.now()}.mp3`
  const filePath = resolve(TTS_DIR, filename)
  writeFileSync(filePath, buffer)

  console.log(`[tts] Audio saved: ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`)
  return `/uploads/tts/${filename}`
}
