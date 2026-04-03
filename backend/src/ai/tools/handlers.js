import { queries } from '../../db/index.js'
import { calculateStreak, getStreakInfo, getEffectiveDate } from '../../services/streak.js'
import { notifyGroup } from '../../whatsapp/notify.js'
import { sendMessage, isReady } from '../../whatsapp/session-manager.js'

export async function handleToolCall(name, args, context) {
  const { userId, sessionId } = context
  console.log(`[tool] Executing: ${name}`, JSON.stringify(args))

  switch (name) {
    case 'start_study': {
      const session = queries.getActiveSession(userId)
      if (session) {
        console.log(`[tool] start_study: User ${userId} already has active session ${session.id}`)
        return { ok: true, sessionId: session.id, message: 'Ya tienes una sesion activa' }
      }
      const meta = {
        course: args.course,
        lesson: args.lesson,
        classNumber: args.classNumber,
        classTitle: args.classTitle,
        courseSlug: args.courseSlug,
        instructor: args.instructor,
        progress: args.progress,
        totalClasses: args.totalClasses,
        contentType: args.contentType,
      }
      const newSession = queries.createSession(userId, context.photoPath, meta)
      if (context.imageMetadata) {
        queries.updateSessionMetadata(newSession.id, context.imageMetadata)
      }
      console.log(`[tool] start_study: Created session ${newSession.id} for user ${userId}`)
      return { ok: true, sessionId: newSession.id, course: args.course, lesson: args.lesson }
    }

    case 'validate_study': {
      const activeSession = queries.getActiveSession(userId)
      if (!activeSession) {
        console.log(`[tool] validate_study: No active session for user ${userId}`)
        return { ok: false, error: 'No hay sesion activa para validar' }
      }

      const endMeta = {
        course: args.endCourse,
        lesson: args.endLesson,
        classNumber: args.endClassNumber,
      }

      queries.completeSession(
        activeSession.id,
        context.photoPath,
        endMeta,
        args.classesCompleted || 0,
        args.isValid
      )

      console.log(
        `[tool] validate_study: Session ${activeSession.id} validated=${args.isValid}, classes=${args.classesCompleted || 0}`
      )
      return {
        ok: true,
        sessionId: activeSession.id,
        validated: args.isValid,
        classesCompleted: args.classesCompleted || 0,
        startCourse: activeSession.start_course,
        endCourse: args.endCourse,
      }
    }

    case 'complete_streak': {
      const effectiveDate = getEffectiveDate()
      const active = queries.getActiveSession(userId)
      queries.markStreak(userId, effectiveDate, active?.id || sessionId)
      const streak = calculateStreak(userId)
      console.log(`[tool] complete_streak: User ${userId} streak=${streak} date=${effectiveDate}`)
      return { ok: true, date: effectiveDate, currentStreak: streak }
    }

    case 'get_streak_info': {
      const info = getStreakInfo(userId)
      console.log(`[tool] get_streak_info: User ${userId} streak=${info.currentStreak}`)
      return { ok: true, ...info }
    }

    case 'send_notification': {
      console.log(`[tool] send_notification: "${(args.message || '').slice(0, 80)}..."`)
      const result = await notifyGroup(args.message)
      return { ok: true, ...result }
    }

    case 'get_user_info': {
      const user = queries.getUserById(userId)
      if (!user) return { ok: false, error: 'Usuario no encontrado' }
      const streak = calculateStreak(userId)
      console.log(`[tool] get_user_info: ${user.name} (${user.email}), streak=${streak}`)
      return {
        ok: true,
        name: user.name,
        email: user.email,
        currentStreak: streak,
      }
    }

    case 'send_private_notification': {
      const phone = (args.phoneNumber || '').replace(/[^0-9]/g, '')
      if (!phone || !args.message) return { ok: false, error: 'phoneNumber y message requeridos' }
      if (!isReady()) return { ok: false, error: 'WhatsApp no disponible' }
      try {
        await sendMessage(`${phone}@c.us`, args.message)
        console.log(`[tool] send_private_notification: Sent to ${phone}`)
        return { ok: true, sentTo: phone }
      } catch (err) {
        console.error(`[tool] send_private_notification failed:`, err.message)
        return { ok: false, error: err.message }
      }
    }

    case 'reject_image': {
      console.log(`[tool] reject_image: "${args.reason}"`)
      return { ok: true, rejected: true, reason: args.reason }
    }

    default:
      console.warn(`[tool] Unknown tool: ${name}`)
      return { ok: false, error: `Tool desconocida: ${name}` }
  }
}
