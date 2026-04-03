const tools = [
  {
    type: 'function',
    name: 'start_study',
    description:
      'Registra el inicio de una sesion de estudio. Llamar cuando el usuario sube una captura valida de Platzi para iniciar su sesion.',
    parameters: {
      type: 'object',
      properties: {
        course: { type: 'string', description: 'Nombre del curso detectado en la captura' },
        lesson: { type: 'string', description: 'Leccion o modulo actual' },
        classNumber: { type: 'string', description: 'Numero de clase' },
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
      'Envia una notificacion al grupo de WhatsApp. Generar un mensaje creativo, divertido y diferente cada vez. Incluir emojis.',
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
