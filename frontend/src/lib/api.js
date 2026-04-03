function getApiUrl() {
  if (typeof window === 'undefined')
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4036'
  const port = window.location.port
  if (!port || port === '80' || port === '443') {
    return `${window.location.protocol}//${window.location.hostname}`
  }
  const backendPort = process.env.NEXT_PUBLIC_API_PORT || '4036'
  return `${window.location.protocol}//${window.location.hostname}:${backendPort}`
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('racha_token')
}

async function request(path, options = {}) {
  const url = `${getApiUrl()}${path}`
  const token = getToken()
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new Error(`No se pudo conectar al servidor: ${url}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      `El servidor respondio con ${res.status} (${contentType || 'sin content-type'}) en ${url}. Verifica que el backend esta corriendo en el puerto correcto.`
    )
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error de servidor')
  return data
}

export const api = {
  getGoogleAuthUrl() {
    return `${getApiUrl()}/api/auth/google`
  },

  login(email, name) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    })
  },

  getMe() {
    return request('/api/auth/me')
  },

  getStreaks() {
    return request('/api/streaks')
  },

  getLeaderboard() {
    return request('/api/streaks/leaderboard')
  },

  getActiveSession() {
    return request('/api/study/active')
  },

  getSessions() {
    return request('/api/study/sessions')
  },

  submitStudy(photoFile) {
    const form = new FormData()
    form.append('photo', photoFile)
    return request('/api/study/submit', { method: 'POST', body: form })
  },

  startStudy(photoFile) {
    const form = new FormData()
    form.append('photo', photoFile)
    return request('/api/study/start', { method: 'POST', body: form })
  },

  completeStudy(photoFile) {
    const form = new FormData()
    form.append('photo', photoFile)
    return request('/api/study/complete', { method: 'POST', body: form })
  },

  getWhatsAppStatus() {
    return request('/api/whatsapp/status')
  },

  sendChatMessage(message, conversationId, image) {
    const body = { message }
    if (conversationId) body.conversationId = conversationId
    if (image) body.image = image
    return request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  getChatConversations() {
    return request('/api/chat/conversations')
  },

  createChatConversation(title) {
    return request('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  },

  deleteChatConversation(id) {
    return request(`/api/chat/conversations/${id}`, { method: 'DELETE' })
  },

  getChatMessages(conversationId, limit = 50, offset = 0) {
    return request(
      `/api/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    )
  },

  transcribeAudio(audioBlob) {
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.webm')
    return request('/api/chat/transcribe', { method: 'POST', body: form })
  },

  getReminder() {
    return request('/api/reminders')
  },

  saveReminder(phoneNumber, hour, minute, timezone) {
    return request('/api/reminders', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, hour, minute, timezone }),
    })
  },

  deleteReminder(id) {
    return request(`/api/reminders/${id}`, { method: 'DELETE' })
  },
}
