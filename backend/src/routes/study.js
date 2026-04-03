import { Router } from 'express'
import { writeFileSync } from 'fs'
import sharp from 'sharp'
import { analyzeImage } from '../ai/provider.js'
import { runStudyFlow } from '../ai/engine.js'
import { queries } from '../db/index.js'

async function extractExifMetadata(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata()
    const exif = metadata.exif ? parseExifBuffer(metadata.exif) : {}
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      density: metadata.density,
      dateTime: exif.DateTime || exif.DateTimeOriginal || null,
      make: exif.Make || null,
      model: exif.Model || null,
      software: exif.Software || null,
      gpsLatitude: exif.GPSLatitude || null,
      gpsLongitude: exif.GPSLongitude || null,
      isScreenshot: !!(
        metadata.hasAlpha ||
        (exif.Software && /screenshot|snip|capture/i.test(exif.Software))
      ),
    }
  } catch {
    return {}
  }
}

function parseExifBuffer(buffer) {
  try {
    const str = buffer.toString('ascii')
    const fields = {}
    const patterns = [
      ['DateTime', /DateTime\x00(.{19})/],
      ['DateTimeOriginal', /DateTimeOriginal\x00(.{19})/],
      ['Make', /Make\x00([^\x00]{2,30})/],
      ['Model', /Model\x00([^\x00]{2,40})/],
      ['Software', /Software\x00([^\x00]{2,40})/],
    ]
    for (const [key, regex] of patterns) {
      const match = str.match(regex)
      if (match) fields[key] = match[1].trim()
    }
    return fields
  } catch {
    return {}
  }
}

export const studyRouter = Router()

async function processImage(inputPath) {
  const outputPath = inputPath.replace(/\.[^.]+$/, '-processed.jpg')

  let buffer = await sharp(inputPath)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  let quality = 75
  while (buffer.length > 2 * 1024 * 1024 && quality > 30) {
    buffer = await sharp(inputPath)
      .rotate()
      .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer()
    quality -= 10
  }

  writeFileSync(outputPath, buffer)
  console.log(
    `[study] Image processed: ${(buffer.length / 1024).toFixed(0)}KB (quality: ${quality < 75 ? quality + 10 : 85})`
  )
  return outputPath
}

studyRouter.post('/submit', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  if (!req.file) return res.status(400).json({ error: 'Foto requerida' })

  try {
    const rawPath = req.file.path
    console.log(
      `[study/submit] Received image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)}KB)`
    )

    const exif = await extractExifMetadata(rawPath)
    console.log('[study/submit] EXIF metadata:', JSON.stringify(exif))

    const processedPath = await processImage(rawPath)

    console.log('[study/submit] Analyzing image with vision...')
    const analysis = await analyzeImage(processedPath)
    analysis.exif = exif
    console.log('[study/submit] Vision analysis:', JSON.stringify(analysis))

    const activeSession = queries.getActiveSession(req.user.userId)
    const isEnd = !!activeSession

    let userMessage
    if (isEnd) {
      userMessage = `El usuario quiere COMPLETAR su sesion de estudio. Tiene una sesion activa que inicio con:
- Curso inicial: ${activeSession.start_course || 'Desconocido'}
- Leccion inicial: ${activeSession.start_lesson || 'Desconocida'}
- Clase inicial: ${activeSession.start_class_number || 'Desconocida'}

Ahora subio una foto que muestra:
- Curso: ${analysis.course || 'No detectado'}
- Leccion: ${analysis.lesson || 'No detectada'}
- Clase: ${analysis.classNumber || 'No detectada'}
- Progreso: ${analysis.progress || 'No detectado'}
- Info adicional: ${analysis.additionalInfo || 'Ninguna'}

Si es una captura valida de Platzi y se ve avance, usa validate_study con isValid=true, luego complete_streak, luego send_notification celebrando.
Si NO es una captura valida de Platzi, usa reject_image explicando por que.`
    } else {
      userMessage = `El usuario quiere INICIAR una sesion de estudio. Subio una foto que muestra:
- Curso: ${analysis.course || 'No detectado'}
- Leccion: ${analysis.lesson || 'No detectada'}
- Clase: ${analysis.classNumber || 'No detectada'}
- Progreso: ${analysis.progress || 'No detectado'}
- Info adicional: ${analysis.additionalInfo || 'Ninguna'}

Si es una captura valida de Platzi, usa start_study con los datos del curso, luego send_notification avisando al grupo.
Si NO es una captura valida de Platzi, usa reject_image explicando por que.`
    }

    console.log('[study/submit] Running AI flow...')
    const aiResult = await runStudyFlow(req.user.userId, userMessage, {
      photoPath: processedPath,
      sessionId: activeSession?.id,
      imageMetadata: analysis,
    })
    console.log('[study/submit] AI result:', {
      message: aiResult.message,
      tools: aiResult.toolResults.map((t) => t.tool),
      iterations: aiResult.iterations,
    })

    let action = 'unknown'
    let validated = false
    const toolNames = aiResult.toolResults.map((t) => t.tool)

    if (toolNames.includes('reject_image')) {
      action = 'rejected'
    } else if (toolNames.includes('start_study')) {
      action = 'started'
    } else if (toolNames.includes('validate_study') || toolNames.includes('complete_streak')) {
      action = 'completed'
      validated = aiResult.toolResults.some(
        (t) => t.tool === 'validate_study' && t.result?.validated
      )
    }

    const session =
      queries.getActiveSession(req.user.userId) ||
      (activeSession ? queries.getSessionById(activeSession.id) : null)

    res.json({
      action,
      message: aiResult.message,
      session,
      analysis,
      validated,
      toolResults: aiResult.toolResults,
    })
  } catch (err) {
    console.error('[study/submit] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

studyRouter.post('/start', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  if (!req.file) return res.status(400).json({ error: 'Foto requerida' })

  try {
    const processedPath = await processImage(req.file.path)
    const analysis = await analyzeImage(processedPath)

    const userMessage = `INICIO DE SESION DE ESTUDIO.
El usuario subio una foto de Platzi. Analisis de la imagen:
- Curso: ${analysis.course || 'No detectado'}
- Leccion: ${analysis.lesson || 'No detectada'}
- Clase: ${analysis.classNumber || 'No detectada'}
- Progreso: ${analysis.progress || 'No detectado'}
- Info adicional: ${analysis.additionalInfo || 'Ninguna'}

Si es una captura valida de Platzi, usa start_study para registrar y send_notification para avisar al grupo.
Si NO es una captura valida de Platzi, usa reject_image.`

    const aiResult = await runStudyFlow(req.user.userId, userMessage, { photoPath: processedPath })
    const activeSession = queries.getActiveSession(req.user.userId)

    res.json({
      message: aiResult.message,
      session: activeSession,
      analysis,
    })
  } catch (err) {
    console.error('[study/start] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

studyRouter.post('/complete', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  if (!req.file) return res.status(400).json({ error: 'Foto requerida' })

  const activeSession = queries.getActiveSession(req.user.userId)
  if (!activeSession) {
    return res.status(400).json({ error: 'No hay sesion activa. Inicia una sesion primero.' })
  }

  try {
    const processedPath = await processImage(req.file.path)
    const analysis = await analyzeImage(processedPath)

    const userMessage = `FIN DE SESION DE ESTUDIO.
El usuario subio su foto final. La sesion inicio con:
- Curso inicial: ${activeSession.start_course || 'Desconocido'}
- Leccion inicial: ${activeSession.start_lesson || 'Desconocida'}
- Clase inicial: ${activeSession.start_class_number || 'Desconocida'}

Foto final muestra:
- Curso: ${analysis.course || 'No detectado'}
- Leccion: ${analysis.lesson || 'No detectada'}
- Clase: ${analysis.classNumber || 'No detectada'}
- Progreso: ${analysis.progress || 'No detectado'}
- Info adicional: ${analysis.additionalInfo || 'Ninguna'}

Valida si el usuario realmente avanzo. Si es valido, usa validate_study, luego complete_streak, luego send_notification celebrando.`

    const aiResult = await runStudyFlow(req.user.userId, userMessage, {
      photoPath: processedPath,
      sessionId: activeSession.id,
    })

    const updatedSession = queries.getSessionById(activeSession.id)

    res.json({
      message: aiResult.message,
      session: updatedSession,
      analysis,
      validated: updatedSession?.validated === 1,
    })
  } catch (err) {
    console.error('[study/complete] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

studyRouter.get('/sessions', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const sessions = queries.getUserSessions(req.user.userId)
  res.json({ sessions })
})

studyRouter.get('/active', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const session = queries.getActiveSession(req.user.userId)
  res.json({ session: session || null })
})
