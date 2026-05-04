'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, RefreshCw, Loader2 } from 'lucide-react'
import { useUpdateChecker } from '@/lib/use-update-checker'

export default function UpdateBell({ variant = 'sidebar' }) {
  const { updateAvailable, checking, checkNow, applyUpdate } = useUpdateChecker()
  const [open, setOpen] = useState(false)
  const [justChecked, setJustChecked] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const handleManualCheck = async () => {
    setJustChecked(false)
    const found = await checkNow()
    if (!found) {
      setJustChecked(true)
      setTimeout(() => setJustChecked(false), 3000)
    }
  }

  const buttonClasses =
    variant === 'sidebar'
      ? 'w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors active:scale-90 shrink-0 relative'
      : 'w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors active:scale-90 shrink-0 relative'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={buttonClasses}
        title={updateAvailable ? 'Hay una nueva version' : 'Notificaciones'}
        aria-label="Notificaciones"
      >
        <Bell size={16} strokeWidth={1.75} />
        {updateAvailable && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-card animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 bg-card rounded-2xl border border-border shadow-xl min-w-[260px] z-[100] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Notificaciones
              </span>
            </div>
            {updateAvailable ? (
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <RefreshCw size={16} className="text-accent-dim" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Nueva version disponible
                    </p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Actualiza para ver los ultimos cambios. Tu sesion no se pierde.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    applyUpdate()
                    setOpen(false)
                  }}
                  className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <RefreshCw size={14} />
                  Actualizar ahora
                </button>
              </div>
            ) : (
              <div className="p-5 flex flex-col items-center gap-3">
                {justChecked ? (
                  <p className="text-xs text-accent-dim font-medium">Todo al dia</p>
                ) : (
                  <>
                    <p className="text-xs text-muted">Sin notificaciones</p>
                    <button
                      onClick={handleManualCheck}
                      disabled={checking}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface/80 text-muted text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {checking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      {checking ? 'Buscando...' : 'Buscar actualizaciones'}
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
