const tools = [
  {
    type: 'function',
    name: 'start_study',
    description:
      'Registra el inicio de una sesion de estudio. Llamar cuando el usuario sube una captura valida de Platzi para iniciar su sesion.',
    parameters: {
      type: 'object',
      properties: {
        course: { type: 'string', description: 'Nombre completo del curso' },
        courseSlug: { type: 'string', description: 'Slug del curso de la URL' },
        lesson: { type: 'string', description: 'Leccion o modulo/seccion actual' },
        classTitle: { type: 'string', description: 'Titulo exacto de la clase' },
        classNumber: { type: 'string', description: 'Numero de clase (ej: "5")' },
        totalClasses: { type: 'string', description: 'Total de clases del curso' },
        progress: { type: 'string', description: 'Porcentaje de progreso' },
        instructor: { type: 'string', description: 'Nombre del instructor' },
        contentType: { type: 'string', description: 'Tipo: video, lectura, quiz, proyecto' },
      },
      required: ['course'],
    },
  },
  {
    type: 'function',
    name: 'validate_study',
    description:
      'Valida y completa una sesion de estudio. Llamar cuando el usuario sube su foto final para demostrar que avanzo en su estudio.',
    parameters: {
      type: 'object',
      properties: {
        endCourse: { type: 'string', description: 'Curso al finalizar' },
        endLesson: { type: 'string', description: 'Leccion al finalizar' },
        endClassNumber: { type: 'string', description: 'Numero de clase al finalizar' },
        classesCompleted: {
          type: 'number',
          description: 'Cantidad estimada de clases completadas',
        },
        isValid: {
          type: 'boolean',
          description: 'true si el usuario realmente avanzo en su estudio',
        },
      },
      required: ['isValid'],
    },
  },
  {
    type: 'function',
    name: 'complete_streak',
    description:
      'Marca la racha del dia como completada. Solo llamar despues de validar el estudio exitosamente con validate_study.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'function',
    name: 'get_streak_info',
    description:
      'Obtiene informacion de la racha actual del usuario: dias consecutivos, si hoy esta completada, calendario.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'function',
    name: 'send_notification',
    description:
      'Envia una notificacion al grupo de WhatsApp. El mensaje debe ser conciso (1-2 oraciones), informativo, y puede incluir maximo 1 emoji. No uses muchos emojis ni mensajes largos. Ejemplo: "{nombre} empezo a estudiar {curso} 📚"',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensaje creativo para el grupo de WhatsApp' },
      },
      required: ['message'],
    },
  },
  {
    type: 'function',
    name: 'get_user_info',
    description: 'Obtiene el perfil del usuario actual (nombre, email, racha).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'function',
    name: 'send_private_notification',
    description:
      'Envia un mensaje privado de WhatsApp a un usuario especifico. Usar para recordatorios personalizados. El mensaje debe ser conciso (1-2 oraciones), amigable y maximo 1 emoji.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Numero de telefono del destinatario (solo digitos, con codigo de pais)',
        },
        message: { type: 'string', description: 'Mensaje conciso y amigable para el usuario' },
      },
      required: ['phoneNumber', 'message'],
    },
  },
  {
    type: 'function',
    name: 'reject_image',
    description:
      'Rechaza una imagen que NO es una captura valida de Platzi. Llamar cuando la foto no muestra la plataforma de Platzi o no es legible.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Razon por la que la imagen fue rechazada' },
      },
      required: ['reason'],
    },
  },
]

export function getToolDefinitions() {
  return tools
}
