'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Send,
  Sparkles,
  BookOpen,
  TrendingUp,
  MessageCircle,
  Menu,
  Mic,
  Square,
  Image as ImageIcon,
  X,
  Play,
  Pause,
  Bot,
  User,
  Flame,
  Zap,
  CheckCheck,
  Plus,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import ChatDrawer from './ChatDrawer'

const SUGGESTIONS = [
  { icon: TrendingUp, text: 'Como va mi racha?' },
  { icon: BookOpen, text: 'Que curso me recomendas?' },
  { icon: Sparkles, text: 'Motivame a estudiar hoy' },
  { icon: Flame, text: 'Iniciar sesion de estudio' },
]

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimestamp(ts) {
  const s = String(ts || '')
  const normalized = s.includes('Z') || s.includes('+') ? s : s.replace(' ', 'T') + 'Z'
  const d = new Date(normalized)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function AudioPlayer({ src, isUser }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => {
      setPlaying(false)
      setProgress(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.pause()
    else audio.play()
    setPlaying(!playing)
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent-dim'
        )}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          className={cn('h-1 rounded-full overflow-hidden', isUser ? 'bg-white/20' : 'bg-border')}
        >
          <div
            className={cn('h-full rounded-full transition-all', isUser ? 'bg-white' : 'bg-accent')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn('text-[10px]', isUser ? 'text-white/70' : 'text-muted')}>
          {formatTime(Math.floor(playing ? progress : duration))}
        </span>
      </div>
    </div>
  )
}

function ToolCallBadge({ toolResult }) {
  const icons = {
    start_study: Flame,
    get_streak_info: TrendingUp,
    complete_streak: Zap,
    get_user_info: User,
    send_notification: MessageCircle,
    validate_study: CheckCheck,
    reject_image: X,
  }
  const labels = {
    start_study: 'Sesion iniciada',
    get_streak_info: 'Info de racha',
    complete_streak: 'Racha completada',
    get_user_info: 'Info de usuario',
    send_notification: 'Notificacion enviada',
    validate_study: 'Estudio validado',
    reject_image: 'Imagen rechazada',
  }

  const Icon = icons[toolResult.tool] || Zap
  const label = labels[toolResult.tool] || toolResult.tool

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-dim text-xs font-medium">
      <Icon size={12} />
      {label}
    </div>
  )
}

export default function ChatTab() {
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const imageInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const audioUrlsRef = useRef([])
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      api
        .getChatConversations()
        .then((d) => setConversations(d.conversations || []))
        .catch(console.error)
    }
  }, [])

  useEffect(() => {
    const urls = audioUrlsRef.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const loadMessages = useCallback(async (convId) => {
    try {
      const data = await api.getChatMessages(convId)
      setMessages(
        (data.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          imageUrl: m.image_url,
          audioUrl: m.audio_url,
          toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : null,
          ts: m.created_at,
        }))
      )
    } catch (err) {
      console.error('[chat] Error loading messages:', err)
    }
  }, [])

  const selectConversation = useCallback(
    async (convId) => {
      setActiveConvId(convId)
      await loadMessages(convId)
    },
    [loadMessages]
  )

  const handleNewChat = useCallback(() => {
    setActiveConvId(null)
    setMessages([])
    setPendingImage(null)
  }, [])

  const handleDeleteConversation = useCallback(
    async (convId) => {
      await api.deleteChatConversation(convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConvId === convId) {
        setActiveConvId(null)
        setMessages([])
      }
    },
    [activeConvId]
  )

  const refreshConversations = useCallback(async () => {
    try {
      const d = await api.getChatConversations()
      setConversations(d.conversations || [])
    } catch {}
  }, [])

  const sendMessage = useCallback(
    async (text, image) => {
      if (sending) return
      if (!text?.trim() && !image) return
      const userText = text?.trim() || ''

      const userMsg = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userText,
        imageUrl: image || null,
        ts: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setPendingImage(null)
      setSending(true)

      try {
        const data = await api.sendChatMessage(userText || null, activeConvId, image || null)

        if (!activeConvId && data.conversationId) {
          setActiveConvId(data.conversationId)
        }

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          audioUrl: data.audioUrl || null,
          toolCalls: data.toolResults?.length > 0 ? data.toolResults : null,
          ts: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
        await refreshConversations()
      } catch (err) {
        const errMsg = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Lo siento, hubo un error. Intenta de nuevo.',
          ts: new Date().toISOString(),
          error: true,
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setSending(false)
      }
    },
    [sending, activeConvId, refreshConversations]
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input, pendingImage)
  }

  const handleSuggestion = (text) => sendMessage(text)

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setPendingImage(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(blob)
        audioUrlsRef.current.push(audioUrl)

        const userMsg = {
          id: `voice-${Date.now()}`,
          role: 'user',
          content: '',
          audioUrl,
          ts: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMsg])
        setSending(true)

        try {
          const { text } = await api.transcribeAudio(blob)
          if (text) {
            setMessages((prev) =>
              prev.map((m) => (m.id === userMsg.id ? { ...m, content: text } : m))
            )
            const data = await api.sendChatMessage(text, activeConvId)
            if (!activeConvId && data.conversationId) {
              setActiveConvId(data.conversationId)
            }
            const aiMsg = {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              content: data.message,
              toolCalls: data.toolResults?.length > 0 ? data.toolResults : null,
              ts: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, aiMsg])
            await refreshConversations()
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: 'No pude procesar el audio. Intenta de nuevo.',
              ts: new Date().toISOString(),
              error: true,
            },
          ])
        } finally {
          setSending(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    } catch (err) {
      console.error('Mic access denied:', err)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full max-w-md lg:max-w-none mx-auto lg:mx-0 relative lg:flex-row">
      <ChatDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        activeId={activeConvId}
        onNewChat={handleNewChat}
        onSelect={selectConversation}
        onDelete={handleDeleteConversation}
      />

      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 border-r border-border bg-card/50 h-full">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-foreground">Conversaciones</h2>
        </div>
        <div className="px-4 pb-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 text-accent-dim font-medium text-sm transition-colors hover:bg-accent/20"
          >
            <Plus size={18} />
            Nueva conversacion
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-none px-3 pb-6">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted text-sm">
              <MessageSquare size={24} className="mb-2 opacity-50" />
              <span>Sin conversaciones</span>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors',
                    conv.id === activeConvId
                      ? 'bg-accent/10'
                      : 'hover:bg-surface active:bg-elevated'
                  )}
                >
                  <MessageSquare
                    size={16}
                    className={cn(
                      'flex-shrink-0',
                      conv.id === activeConvId ? 'text-accent-dim' : 'text-muted'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm truncate block',
                        conv.id === activeConvId ? 'text-accent-dim font-medium' : 'text-foreground'
                      )}
                    >
                      {conv.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteConversation(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 h-full">
        <header className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-surface hover:bg-elevated transition-colors lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="font-heading text-lg leading-tight">Indi</h1>
              <p className="text-[11px] text-muted">Tu asistente de estudio</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-sm shadow-accent/20">
            <Bot size={16} className="text-white" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-none px-4">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full pb-10 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="font-heading text-lg mb-1">Hola! Soy Indi</h2>
              <p className="text-sm text-muted text-center mb-6 max-w-[260px]">
                Tu asistente personal de estudio. Preguntame lo que quieras.
              </p>
              <div className="grid grid-cols-2 gap-2.5 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:border-accent/40 transition-colors active:scale-[0.97]"
                  >
                    <s.icon size={16} className="text-accent-dim shrink-0" />
                    <span className="text-xs text-foreground leading-tight">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'flex max-w-[85%] gap-2',
                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5',
                          msg.role === 'user'
                            ? 'bg-elevated text-muted'
                            : 'bg-accent/10 text-accent-dim'
                        )}
                      >
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-accent text-white rounded-tr-md'
                              : msg.error
                                ? 'bg-danger/10 text-danger rounded-tl-md'
                                : 'bg-card border border-border text-foreground rounded-tl-md shadow-card'
                          )}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt=""
                              className="rounded-xl mb-2 max-h-48 w-auto"
                            />
                          )}
                          {msg.audioUrl && (
                            <AudioPlayer src={msg.audioUrl} isUser={msg.role === 'user'} />
                          )}
                          {msg.content && (
                            <p className={msg.audioUrl ? 'mt-2 text-xs opacity-70 italic' : ''}>
                              {msg.content}
                            </p>
                          )}
                        </div>
                        {msg.toolCalls && msg.role === 'assistant' && (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {msg.toolCalls.map((tc, j) => (
                              <ToolCallBadge key={j} toolResult={tc} />
                            ))}
                          </div>
                        )}
                        <span
                          className={cn(
                            'text-[10px] px-1',
                            msg.role === 'user' ? 'text-muted text-right' : 'text-muted'
                          )}
                        >
                          {msg.ts ? formatTimestamp(msg.ts) : ''}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-full bg-accent/10 text-accent-dim flex items-center justify-center flex-shrink-0">
                      <Bot size={14} />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 flex gap-1.5 shadow-card">
                      <div className="w-2 h-2 rounded-full bg-muted typing-dot" />
                      <div className="w-2 h-2 rounded-full bg-muted typing-dot" />
                      <div className="w-2 h-2 rounded-full bg-muted typing-dot" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 pb-3 pt-2">
          {pendingImage && (
            <div className="mb-2 relative inline-block">
              <img src={pendingImage} alt="" className="h-16 rounded-xl border border-border" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center shadow-sm"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {isRecording ? (
            <div className="flex items-center gap-3 bg-danger/5 rounded-2xl p-2 pl-5 border border-danger/20">
              <div className="w-3 h-3 bg-danger rounded-full animate-pulse" />
              <span className="text-sm font-medium text-danger flex-1">
                Grabando {formatTime(recordingTime)}
              </span>
              <button
                onClick={stopRecording}
                className="w-10 h-10 bg-danger text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                <Square size={14} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center text-muted hover:text-accent-dim transition-colors rounded-xl hover:bg-surface flex-shrink-0"
              >
                <ImageIcon size={18} />
              </button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={imageInputRef}
                onChange={handleImageSelect}
              />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-card border border-border text-foreground text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
              />
              {input.trim() || pendingImage ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shrink-0"
                >
                  <Send size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={sending}
                  className="w-10 h-10 flex items-center justify-center text-muted hover:text-accent-dim transition-colors rounded-xl hover:bg-surface disabled:opacity-40 flex-shrink-0"
                >
                  <Mic size={20} />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
