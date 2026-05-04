'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import {
  Calendar,
  TrendingUp,
  Trophy,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart as PieIcon,
  Timer,
} from 'lucide-react'
import StreakCalendar from './StreakCalendar'
import UpdateBell from './UpdateBell'
import { api } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'

const DailyAreaChart = dynamic(() => import('./Charts').then((m) => m.DailyAreaChart), {
  ssr: false,
  loading: () => <div className="h-[160px] skeleton rounded-xl" />,
})

const ClassesBarChart = dynamic(() => import('./Charts').then((m) => m.ClassesBarChart), {
  ssr: false,
  loading: () => <div className="h-[160px] skeleton rounded-xl" />,
})

const CourseDonut = dynamic(() => import('./Charts').then((m) => m.CourseDonut), {
  ssr: false,
  loading: () => <div className="h-[120px] skeleton rounded-xl" />,
})

const HourHeatmap = dynamic(() => import('./Charts').then((m) => m.HourHeatmap), {
  ssr: false,
  loading: () => <div className="h-[100px] skeleton rounded-xl" />,
})

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export default function RachaTab({ streakData }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    api
      .getSessions()
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
    api
      .getStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  const statCards = [
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
      label: 'Horas totales',
      value: stats?.summary?.totalHours || 0,
      icon: Clock,
      color: 'text-violet',
    },
    {
      label: 'Clases',
      value: stats?.summary?.totalClasses || streakData?.totalSessions || 0,
      icon: BookOpen,
      color: 'text-accent-dim',
    },
  ]

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 5)

  const sessionsWithDuration = sessions.map((s) => {
    let durationMin = 0
    if (s.started_at && s.completed_at) {
      durationMin = Math.round((new Date(s.completed_at) - new Date(s.started_at)) / 60000)
      if (durationMin < 0 || durationMin > 480) durationMin = 0
    }
    return { ...s, durationMin }
  })

  return (
    <div className="px-5 pt-6 pb-4 max-w-md lg:max-w-5xl mx-auto">
      <div className="bg-mesh" />

      <motion.div {...fadeUp} className="flex items-center justify-between mb-5">
        <h1 className="font-heading text-xl">Tu Racha</h1>
        <div className="lg:hidden">
          <UpdateBell variant="floating" />
        </div>
      </motion.div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="space-y-5">
          <motion.section {...fadeUp} transition={{ delay: 0.04 }} className="card-base p-4">
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

          {stats?.dailyStudy?.length > 2 && (
            <motion.section {...fadeUp} transition={{ delay: 0.06 }} className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-accent-dim" />
                <h3 className="font-heading text-sm text-muted">Tiempo de estudio diario</h3>
              </div>
              <DailyAreaChart data={stats.dailyStudy} />
            </motion.section>
          )}

          {stats?.weeklyStudy?.length > 0 && (
            <motion.section {...fadeUp} transition={{ delay: 0.07 }} className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-violet" />
                <h3 className="font-heading text-sm text-muted">Clases por semana</h3>
              </div>
              <ClassesBarChart data={stats.weeklyStudy} />
            </motion.section>
          )}
        </div>

        <div className="space-y-5 mt-5 lg:mt-0">
          <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="grid grid-cols-2 gap-3">
            {statCards.map((stat) => (
              <div key={stat.label} className="card-base p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={16} className={stat.color} />
                  <span className="text-xs text-muted">{stat.label}</span>
                </div>
                <p className="font-heading text-2xl text-foreground">{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {stats?.courses?.length > 0 && (
            <motion.section {...fadeUp} transition={{ delay: 0.1 }} className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <PieIcon size={16} className="text-violet" />
                <h3 className="font-heading text-sm text-muted">Cursos estudiados</h3>
              </div>
              <CourseDonut data={stats.courses} />
            </motion.section>
          )}

          {stats?.hourDistribution?.some((h) => h > 0) && (
            <motion.section {...fadeUp} transition={{ delay: 0.11 }} className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer size={16} className="text-accent-dim" />
                <h3 className="font-heading text-sm text-muted">Horarios de estudio</h3>
              </div>
              <HourHeatmap data={stats.hourDistribution} />
            </motion.section>
          )}

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
                  {visibleSessions.map((s) => {
                    const dur = sessionsWithDuration.find((sd) => sd.id === s.id)
                    return (
                      <div key={s.id} className="flex items-center gap-3 py-1">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                            s.validated ? 'bg-accent/15 text-accent-dim' : 'bg-surface text-muted'
                          )}
                        >
                          {s.validated ? '✓' : '—'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {s.start_course || 'Sesion de estudio'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <span>{formatRelativeTime(s.created_at)}</span>
                            {dur?.durationMin > 0 && <span>{dur.durationMin} min</span>}
                          </div>
                        </div>
                        {s.classes_completed > 0 && (
                          <span className="text-xs text-accent-dim font-semibold shrink-0">
                            {s.classes_completed} clases
                          </span>
                        )}
                      </div>
                    )
                  })}
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
      </div>
    </div>
  )
}
