'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Calendar, TrendingUp, Trophy, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import StreakCalendar from './StreakCalendar'
import { api } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export default function RachaTab({ streakData }) {
  const [sessions, setSessions] = useState([])
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    api
      .getSessions()
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [])

  const stats = [
    {
      label: 'Racha actual',
      value: streakData?.currentStreak || 0,
      icon: TrendingUp,
      color: 'text-accent-dim',
    },
    {
      label: 'Mejor racha',
      value: streakData?.bestStreak || 0,
      icon: Trophy,
      color: 'text-streak-2',
    },
    {
      label: 'Total dias',
      value: streakData?.totalDays || 0,
      icon: Calendar,
      color: 'text-violet',
    },
    {
      label: 'Sesiones',
      value: streakData?.totalSessions || 0,
      icon: Clock,
      color: 'text-accent-dim',
    },
  ]

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 5)

  return (
    <div className="px-5 pt-6 pb-4 max-w-md mx-auto">
      <div className="bg-mesh" />

      <motion.h1 {...fadeUp} className="font-heading text-xl mb-5">
        Tu Racha
      </motion.h1>

      <motion.section {...fadeUp} transition={{ delay: 0.04 }} className="card-base p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-accent-dim" />
          <h3 className="font-heading text-sm text-muted">Ultimos 30 dias</h3>
        </div>
        <StreakCalendar calendar={streakData?.calendar || []} />
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent" />
            <span className="text-[10px] text-muted">Completado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-surface ring-1.5 ring-accent" />
            <span className="text-[10px] text-muted">Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-surface" />
            <span className="text-[10px] text-muted">Pendiente</span>
          </div>
        </div>
      </motion.section>

      <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="grid grid-cols-2 gap-3 mb-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card-base p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
            <p className="font-heading text-2xl text-foreground">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.section {...fadeUp} transition={{ delay: 0.12 }} className="card-base p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-violet" />
          <h3 className="font-heading text-sm text-muted">Historial de sesiones</h3>
        </div>

        {loadingSessions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl skeleton" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 skeleton rounded" />
                  <div className="h-2.5 w-1/3 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-muted text-sm text-center py-6">Aun no hay sesiones de estudio</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {visibleSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-1">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold',
                      s.validated ? 'bg-accent/15 text-accent-dim' : 'bg-surface text-muted'
                    )}
                  >
                    {s.validated ? '✓' : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {s.start_course || 'Sesion de estudio'}
                    </p>
                    <p className="text-xs text-muted">{formatRelativeTime(s.created_at)}</p>
                  </div>
                  {s.classes_completed > 0 && (
                    <span className="text-xs text-accent-dim font-semibold">
                      {s.classes_completed} clases
                    </span>
                  )}
                </div>
              ))}
            </div>
            {sessions.length > 5 && (
              <button
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="flex items-center gap-1 text-xs text-accent-dim font-medium mt-3 mx-auto"
              >
                {showAllSessions ? 'Ver menos' : `Ver todas (${sessions.length})`}
                {showAllSessions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </>
        )}
      </motion.section>
    </div>
  )
}
