'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Camera,
  Image,
  Upload,
  Sparkles,
  CheckCircle,
  XCircle,
  Timer,
  BookOpen,
} from 'lucide-react'
import { api } from '@/lib/api'
import StreakMascot from './StreakMascot'

function ConfettiPiece({ delay, color }) {
  const left = Math.random() * 100
  const dur = 1.5 + Math.random() * 1.5
  return (
    <div
      className="absolute top-0"
      style={{
        left: `${left}%`,
        width: 6 + Math.random() * 4,
        height: 6 + Math.random() * 4,
        background: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        animation: `confetti-fall ${dur}s ease-in ${delay}s forwards`,
      }}
    />
  )
}

function StudyTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const normalized =
      startedAt.includes('Z') || startedAt.includes('+')
        ? startedAt
        : startedAt.replace(' ', 'T') + 'Z'
    const start = new Date(normalized).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const hours = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60)
  const secs = elapsed % 60
  const totalMins = elapsed / 60

  let timerColor = '#DC2626'
  let timerLabel = 'Seguí asi...'
  if (totalMins >= 30) {
    timerColor = '#98ca3f'
    timerLabel = 'Excelente sesion!'
  } else if (totalMins >= 15) {
    timerColor = '#F59E0B'
    timerLabel = 'Buen ritmo!'
  }

  const formatted =
    hours > 0
      ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div className="text-center">
      <p
        className="font-heading text-5xl tabular-nums tracking-tight"
        style={{ color: timerColor }}
      >
        {formatted}
      </p>
      <p className="text-sm mt-2" style={{ color: timerColor }}>
        {timerLabel}
      </p>
      <div className="flex justify-center gap-1 mt-3">
        {[15, 25, 30].map((m) => (
          <div
            key={m}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: 40,
              background: totalMins >= m ? timerColor : '#e2e5d9',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ScannerOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl">
      <div
        className="absolute left-0 right-0 h-0.5 bg-accent shadow-[0_0_8px_rgba(152,202,63,0.6)]"
        style={{
          animation: 'scanner-line 2s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 bg-accent/5" />
    </div>
  )
}

export default function StudyTab({ onComplete, todayCompleted }) {
  const [activeSession, setActiveSession] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [aiMessage, setAiMessage] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const fileRef = useRef(null)
  const galleryRef = useRef(null)

  useEffect(() => {
    api
      .getActiveSession()
      .then((d) => {
        if (d.session) {
          setActiveSession(d.session)
          setPhase('studying')
        } else {
          setPhase('capture')
        }
      })
      .catch(() => setPhase('capture'))
  }, [])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function clearPreview() {
    setPreview(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || processing) return
    setProcessing(true)
    setAiMessage('')

    try {
      const data = await api.submitStudy(selectedFile)

      setAiMessage(data.message)
      setResult(data)

      if (data.action === 'started') {
        setActiveSession(data.session)
        setPhase('studying')
      } else if (data.action === 'completed') {
        setPhase('result')
        if (data.validated) {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }
      } else if (data.action === 'rejected') {
        setPhase('result')
      } else {
        setPhase('result')
      }
    } catch (err) {
      setAiMessage(err.message || 'Error al procesar la foto')
      setPhase('result')
      setResult({ action: 'error' })
    } finally {
      setProcessing(false)
    }
  }, [selectedFile, processing])

  const handleDone = useCallback(() => {
    if (onComplete) onComplete()
  }, [onComplete])

  const handleRetry = useCallback(() => {
    setPhase('capture')
    setResult(null)
    setAiMessage('')
    clearPreview()
  }, [])

  const handleFinishStudy = useCallback(async () => {
    if (processing) return
    setProcessing(true)
    setAiMessage('')
    clearPreview()

    try {
      const data = await api.endStudy()
      const streak = data.streak?.currentStreak ?? 0
      const already = data.streak?.alreadyCompleted
      const courseLabel = activeSession?.start_course || 'tu curso'
      const message = already
        ? 'Sesion cerrada. Hoy tu racha ya estaba completa.'
        : streak > 1
          ? `Listo. Cerraste ${courseLabel} y completaste tu racha de ${streak} dias.`
          : `Listo. Cerraste ${courseLabel} y arrancaste tu racha.`

      setActiveSession(null)
      setAiMessage(message)
      setResult({ action: 'completed', validated: !already })
      setPhase('result')
      if (!already) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }
    } catch (err) {
      setAiMessage(err.message || 'No se pudo cerrar la sesion')
      setResult({ action: 'error' })
      setPhase('result')
    } finally {
      setProcessing(false)
    }
  }, [activeSession, processing])

  const confettiColors = ['#98ca3f', '#FCD34D', '#8730f5', '#7db32e', '#F97316', '#b8e06a']
  const isEnd = phase === 'capture' && !!activeSession

  const isExtraSession = todayCompleted && phase === 'capture'

  return (
    <div className="px-5 pt-6 pb-4 max-w-md mx-auto relative">
      <div className="bg-mesh" />

      {showConfetti && (
        <div className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece
              key={i}
              delay={Math.random() * 0.5}
              color={confettiColors[i % confettiColors.length]}
            />
          ))}
        </div>
      )}

      {isExtraSession && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-4 py-3 rounded-2xl bg-accent/10 border border-accent/20"
        >
          <p className="text-sm text-accent-dim font-medium">Racha de hoy completada</p>
          <p className="text-xs text-muted mt-0.5">Podes seguir estudiando sin afectar tu racha</p>
        </motion.div>
      )}

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-heading text-xl mb-5"
      >
        {phase === 'loading'
          ? 'Cargando...'
          : phase === 'studying'
            ? 'Estudiando...'
            : isEnd
              ? 'Terminar sesion'
              : isExtraSession
                ? 'Sesion adicional'
                : 'Iniciar estudio'}
      </motion.h1>

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card-base p-8 text-center"
          >
            <div className="flex gap-1.5 justify-center">
              <div className="w-2 h-2 rounded-full bg-accent typing-dot" />
              <div className="w-2 h-2 rounded-full bg-accent typing-dot" />
              <div className="w-2 h-2 rounded-full bg-accent typing-dot" />
            </div>
          </motion.div>
        )}

        {phase === 'studying' && !processing && (
          <motion.div
            key="studying"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <div className="card-base p-6 text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-accent-dim" />
              </div>
              {activeSession?.start_course && (
                <p className="text-sm text-muted mb-4">{activeSession.start_course}</p>
              )}
              <StudyTimer startedAt={activeSession?.started_at} />
            </div>

            <button
              onClick={handleFinishStudy}
              className="w-full py-4 rounded-2xl font-semibold text-base bg-accent text-white glow-accent active:scale-[0.97] transition-transform"
            >
              Terminar sesion de estudio
            </button>
          </motion.div>
        )}

        {phase === 'capture' && !processing && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <div className="card-base p-5 text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                {isEnd ? (
                  <CheckCircle size={24} className="text-accent-dim" />
                ) : (
                  <Sparkles size={24} className="text-accent-dim" />
                )}
              </div>
              <h2 className="font-heading text-lg mb-1.5">
                {isEnd ? 'Mostra tu avance' : 'Captura de Platzi'}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {isEnd
                  ? `Subi una captura mostrando hasta donde llegaste en ${activeSession?.start_course || 'tu curso'}`
                  : 'Subi una captura de pantalla de Platzi mostrando el curso que vas a estudiar'}
              </p>
            </div>

            {!preview ? (
              <div className="flex gap-3">
                <label className="flex-1 flex flex-col items-center gap-2.5 py-7 rounded-2xl bg-card border border-border border-dashed cursor-pointer hover:border-accent/40 transition-colors active:scale-[0.97]">
                  <Camera size={24} className="text-accent-dim" />
                  <span className="text-xs font-medium text-muted">Camara</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
                <label className="flex-1 flex flex-col items-center gap-2.5 py-7 rounded-2xl bg-card border border-border border-dashed cursor-pointer hover:border-accent/40 transition-colors active:scale-[0.97]">
                  <Image size={24} className="text-violet" />
                  <span className="text-xs font-medium text-muted">Galeria</span>
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="relative rounded-2xl overflow-hidden border border-border mb-3">
                  <img
                    src={preview}
                    alt="Vista previa"
                    className="w-full h-auto max-h-[260px] object-cover"
                  />
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={clearPreview}
                    className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-muted hover:text-danger transition-colors active:scale-90 shrink-0"
                  >
                    <XCircle size={20} />
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 h-12 rounded-2xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <Upload size={16} />
                    {isEnd ? 'Completar sesion' : 'Iniciar estudio'}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {processing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {preview && (
              <div className="relative rounded-2xl overflow-hidden border border-border mb-4">
                <img
                  src={preview}
                  alt="Analizando"
                  className="w-full h-auto max-h-[260px] object-cover"
                />
                <ScannerOverlay />
              </div>
            )}
            <div className="card-base p-6 text-center">
              {selectedFile ? (
                <>
                  <p className="text-sm font-semibold text-accent-dim">Analizando con IA</p>
                  <p className="text-xs text-muted mt-1">Procesando tu captura de Platzi...</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-accent-dim">Cerrando sesion</p>
                  <p className="text-xs text-muted mt-1">Marcando tu racha del dia...</p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="card-base p-6 text-center mb-4">
              {result?.action === 'completed' && result?.validated ? (
                <>
                  <StreakMascot streak={30} size={72} />
                  <h2 className="font-heading text-xl mt-3 text-gradient-fire">
                    {todayCompleted && !showConfetti ? 'Sesion registrada!' : 'Racha completada!'}
                  </h2>
                  {todayCompleted && !showConfetti && (
                    <p className="text-sm text-muted mt-1">Buen laburo sumando horas de estudio</p>
                  )}
                </>
              ) : result?.action === 'started' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} className="text-accent-dim" />
                  </div>
                  <h2 className="font-heading text-lg">Sesion iniciada!</h2>
                  <p className="text-sm text-muted mt-1">
                    A estudiar. Cuando termines, volve a subir una foto.
                  </p>
                </>
              ) : result?.action === 'rejected' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-3">
                    <XCircle size={28} className="text-danger" />
                  </div>
                  <h2 className="font-heading text-lg">Foto no valida</h2>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={28} className="text-muted" />
                  </div>
                  <h2 className="font-heading text-lg">Resultado</h2>
                </>
              )}
            </div>

            {aiMessage && (
              <div className="bg-surface rounded-2xl p-4 mb-4 border-l-2 border-accent">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="text-accent-dim shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{aiMessage}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleDone}
              className="w-full py-4 rounded-2xl bg-accent text-white font-semibold glow-accent active:scale-[0.97] transition-transform"
            >
              Volver al inicio
            </button>

            {(result?.action === 'rejected' || result?.action === 'error') && (
              <button
                onClick={handleRetry}
                className="w-full py-3 mt-2 rounded-2xl text-sm text-muted hover:text-foreground transition-colors"
              >
                Intentar con otra foto
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
