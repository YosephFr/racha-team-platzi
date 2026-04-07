import { Router } from 'express'
import { writeFileSync, unlinkSync } from 'fs'
import sharp from 'sharp'
import { analyzeImage } from '../ai/provider.js'
import { runStudyFlow } from '../ai/engine.js'
import { queries } from '../db/index.js'

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

    const processedPath = await processImage(rawPath)
    try {
      unlinkSync(rawPath)
    } catch {}

    console.log('[study/submit] Analyzing image with vision...')
    const analysis = await analyzeImage(processedPath)
    console.log('[study/submit] Vision analysis:', JSON.stringify(analysis))

    const activeSession = queries.getActiveSession(req.user.userId)
    const isEnd = !!activeSession

    const metadataBlock = `
=== DESCRIPCION VISUAL ===
${analysis.visualDescription || 'No disponible'}

=== DATOS EXTRAIDOS POR VISION ===
- Curso: ${analysis.course || analysis.classTitle || 'No detectado'}
- Slug: ${analysis.courseSlug || 'No detectado'}
- Clase: ${analysis.classTitle || 'No detectada'}
- Numero: ${analysis.classNumber || '?'}${analysis.totalClasses ? ` de ${analysis.totalClasses}` : ''}
- Leccion: ${analysis.lesson || 'No detectada'}
- Progreso: ${analysis.progress || 'No detectado'}
- Instructor: ${analysis.instructor || 'No detectado'}
- Video: ${analysis.videoDuration || '?'} (pos: ${analysis.videoPosition || '?'})
- Plataforma: ${analysis.platform || 'No detectada'}
- Tipo: ${analysis.contentType || 'No detectado'}
- URL: ${analysis.url || 'No visible'}
- Subtitulos: ${analysis.subtitles || 'No visibles'}
- Es Platzi: ${analysis.isPlatzi ? 'SI' : 'NO'}
- Borrosa: ${analysis.isBlurry ? 'SI' : 'NO'}`

    let userMessage
    if (isEnd) {
      userMessage = `El usuario quiere COMPLETAR su sesion de estudio. Tiene una sesion activa que inicio con:
- Curso inicial: ${activeSession.start_course || 'Desconocido'}
- Leccion inicial: ${activeSession.start_lesson || 'Desconocida'}
- Clase inicial: ${activeSession.start_class_number || 'Desconocida'}

Ahora subio esta foto:
${metadataBlock}

Si es valido, usa validate_study con isValid=true, luego complete_streak, luego send_notification celebrando.
Si NO es valido, usa reject_image explicando por que.`
    } else {
      userMessage = `El usuario quiere INICIAR una sesion de estudio. Subio esta foto:
${metadataBlock}

Acepta capturas de la web de Platzi, la app movil de Platzi (reproductor con fondo oscuro, "CLASE X DE Y" arriba), y el reproductor desktop. Si la imagen muestra contenido de Platzi de cualquier forma reconocible, apruebalo.
Si es una captura valida de Platzi, usa start_study con TODOS los datos disponibles del curso, luego send_notification avisando al grupo.
Si NO es valido, usa reject_image explicando por que.`
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
    res.status(500).json({ error: 'Error al procesar la imagen' })
  }
})

studyRouter.post('/start', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  if (!req.file) return res.status(400).json({ error: 'Foto requerida' })

  try {
    const rawPath = req.file.path
    const processedPath = await processImage(rawPath)
    try {
      unlinkSync(rawPath)
    } catch {}
    const analysis = await analyzeImage(processedPath)

    const userMessage = `INICIO DE SESION DE ESTUDIO.
El usuario subio una foto de Platzi. Analisis de la imagen:
- Curso: ${analysis.course || analysis.classTitle || 'No detectado'}
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
    const rawPath = req.file.path
    const processedPath = await processImage(rawPath)
    try {
      unlinkSync(rawPath)
    } catch {}
    const analysis = await analyzeImage(processedPath)

    const userMessage = `FIN DE SESION DE ESTUDIO.
El usuario subio su foto final. La sesion inicio con:
- Curso inicial: ${activeSession.start_course || 'Desconocido'}
- Leccion inicial: ${activeSession.start_lesson || 'Desconocida'}
- Clase inicial: ${activeSession.start_class_number || 'Desconocida'}

Foto final muestra:
- Curso: ${analysis.course || analysis.classTitle || 'No detectado'}
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
