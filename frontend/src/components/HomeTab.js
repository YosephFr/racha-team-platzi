'use client'

import { motion } from 'motion/react'
import { TrendingUp, BookOpen, Clock, Trophy, ChevronRight } from 'lucide-react'
import StreakMascot from './StreakMascot'
import { getStreakLevel } from '@/lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export default function HomeTab({ user, streak, streakData, leaderboard, onStudy, onTabChange }) {
  const level = getStreakLevel(streak)

  const stats = [
    { label: 'Racha actual', value: streak, icon: TrendingUp, color: 'text-accent-dim' },
    {
      label: 'Mejor racha',
      value: streakData?.bestStreak || 0,
      icon: Trophy,
      color: 'text-streak-2',
    },
    {
      label: 'Total dias',
      value: streakData?.totalDays || 0,
      icon: BookOpen,
      color: 'text-violet',
    },
    {
      label: 'Sesiones',
      value: streakData?.totalSessions || 0,
      icon: Clock,
      color: 'text-accent-dim',
    },
  ]

  return (
    <div className="px-5 pt-6 pb-4 max-w-md lg:max-w-5xl mx-auto">
      <div className="bg-mesh" />

      <motion.header
        {...fadeUp}
        transition={{ delay: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-sm text-muted">Hola,</p>
          <h1 className="font-heading text-xl text-foreground">{user?.name || 'Estudiante'}</h1>
        </div>
        <button
          onClick={() => onTabChange('profile')}
          className="w-10 h-10 rounded-full bg-surface flex items-center justify-center overflow-hidden border-2 border-accent lg:hidden"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-muted">
              {(user?.name || 'U')[0].toUpperCase()}
            </span>
          )}
        </button>
      </motion.header>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        <div>
          <motion.section {...fadeUp} transition={{ delay: 0.04 }} className="text-center mb-6">
            <StreakMascot streak={streak} />
            <h2 className="font-heading text-5xl text-gradient-fire mt-3 leading-none">{streak}</h2>
            <p className="text-muted text-sm mt-1">
              {streak === 0 ? 'Sin racha activa' : streak === 1 ? 'dia de racha' : 'dias de racha'}
            </p>
            {streakData?.todayCompleted && (
              <span className="inline-block mt-2 px-3 py-1 bg-accent/15 text-accent-dim rounded-full text-xs font-semibold">
                Racha del dia completada
              </span>
            )}
          </motion.section>

          {!streakData?.todayCompleted && (
            <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="mb-6">
              <button
                onClick={onStudy}
                className="w-full py-4 rounded-2xl font-semibold text-base bg-accent text-white glow-accent active:scale-[0.97] transition-transform"
              >
                Estudiar ahora
              </button>
            </motion.div>
          )}
        </div>

        <div>
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.12 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
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

          {leaderboard.length > 1 && (
            <motion.section {...fadeUp} transition={{ delay: 0.16 }} className="card-base p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm text-muted">Ranking del equipo</h3>
                <button
                  onClick={() => onTabChange('racha')}
                  className="text-accent-dim text-xs flex items-center gap-0.5"
                >
                  Ver todo <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-2.5">
                {leaderboard.slice(0, 5).map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-medium text-muted">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-xs font-semibold text-muted overflow-hidden border border-border">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.name?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <span className="flex-1 text-sm text-foreground truncate">{u.name}</span>
                    <span className="font-semibold text-sm text-accent-dim">{u.streak}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  )
}
