import { Router } from 'express'
import { unlinkSync } from 'fs'
import { analyzeImage } from '../ai/provider.js'
import { runStudyFlow } from '../ai/engine.js'
import { queries } from '../db/index.js'
import { getStreakInfo, calculateStreak, getEffectiveDate } from '../services/streak.js'
import { processImage } from '../services/image.js'
import { notifyGroup } from '../whatsapp/notify.js'

export const studyRouter = Router()

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
    const streakInfo = getStreakInfo(req.user.userId)

    if (isEnd) {
      const alreadyDoneToday = streakInfo.todayCompleted
      userMessage = `El usuario quiere COMPLETAR su sesion de estudio. Tiene una sesion activa que inicio con:
- Curso inicial: ${activeSession.start_course || 'Desconocido'}
- Leccion inicial: ${activeSession.start_lesson || 'Desconocida'}
- Clase inicial: ${activeSession.start_class_number || 'Desconocida'}
${alreadyDoneToday ? '- NOTA: El usuario YA completo su racha de hoy. Esta es una sesion adicional. Registra la sesion pero NO notifiques al grupo.' : ''}

Ahora subio esta foto:
${metadataBlock}

Si es valido, usa validate_study con isValid=true, luego complete_streak.${alreadyDoneToday ? ' No uses send_notification (ya se notifico hoy).' : ' Si la racha es nueva (alreadyCompleted=false), usa send_notification celebrando.'}
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

    const completeStreakInfo = getStreakInfo(req.user.userId)
    const alreadyDoneToday = completeStreakInfo.todayCompleted

    const userMessage = `FIN DE SESION DE ESTUDIO.
El usuario subio su foto final. La sesion inicio con:
- Curso inicial: ${activeSession.start_course || 'Desconocido'}
- Leccion inicial: ${activeSession.start_lesson || 'Desconocida'}
- Clase inicial: ${activeSession.start_class_number || 'Desconocida'}
${alreadyDoneToday ? '- NOTA: El usuario YA completo su racha de hoy. Esta es una sesion adicional. Registra la sesion pero NO notifiques al grupo.' : ''}

Foto final muestra:
- Curso: ${analysis.course || analysis.classTitle || 'No detectado'}
- Leccion: ${analysis.lesson || 'No detectada'}
- Clase: ${analysis.classNumber || 'No detectada'}
- Progreso: ${analysis.progress || 'No detectado'}
- Info adicional: ${analysis.additionalInfo || 'Ninguna'}

Valida si el usuario realmente avanzo. Si es valido, usa validate_study, luego complete_streak.${alreadyDoneToday ? ' No uses send_notification (ya se notifico hoy).' : ' Si la racha es nueva (alreadyCompleted=false), usa send_notification celebrando.'}`

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

studyRouter.post('/end', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })

  const userId = req.user.userId
  const activeSession = queries.getActiveSession(userId)
  if (!activeSession) {
    return res.status(400).json({ error: 'No hay sesion activa para terminar' })
  }

  try {
    const closedSession = queries.endSessionQuick(activeSession.id)

    const streakInfoBefore = getStreakInfo(userId)
    const effectiveDate = getEffectiveDate()
    let alreadyCompleted = streakInfoBefore.todayCompleted
    if (!alreadyCompleted) {
      queries.markStreak(userId, effectiveDate, activeSession.id)
    }
    const currentStreak = calculateStreak(userId)

    let notified = null
    if (!alreadyCompleted) {
      const user = queries.getUserById(userId)
      const name = user?.name || 'Alguien'
      const courseLabel = activeSession.start_course || 'su curso'
      const streakLine = currentStreak > 1 ? ` — racha de ${currentStreak} dias` : ''
      const message = `${name} cerro su sesion en ${courseLabel}${streakLine} 🔥`
      try {
        notified = await notifyGroup(message)
      } catch (err) {
        console.error('[study/end] notifyGroup failed:', err.message)
      }
    }

    console.log(
      `[study/end] user=${userId} session=${activeSession.id} alreadyCompleted=${alreadyCompleted} streak=${currentStreak}`
    )
    res.json({
      action: 'completed',
      session: closedSession,
      streak: { currentStreak, alreadyCompleted, date: effectiveDate },
      notified,
    })
  } catch (err) {
    console.error('[study/end] Error:', err)
    res.status(500).json({ error: 'No se pudo cerrar la sesion' })
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
