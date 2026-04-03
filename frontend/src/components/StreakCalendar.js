'use client'

import { cn } from '@/lib/utils'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export default function StreakCalendar({ calendar }) {
  const today = new Date().toISOString().split('T')[0]
  const completedSet = new Set((calendar || []).filter((d) => d.completed).map((d) => d.date))

  const days = []
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 29)

  const firstDow = start.getDay()
  for (let i = 0; i < firstDow; i++) {
    days.push({ date: null, label: '' })
  }

  for (let i = 0; i < 30; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6

    days.push({
      date: dateStr,
      label: d.getDate(),
      completed: completedSet.has(dateStr),
      isToday: dateStr === today,
      isWeekend,
    })
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              'aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all relative',
              !d.date && 'invisible',
              d.date && !d.completed && !d.isToday && 'bg-surface text-muted/60',
              d.date && !d.completed && d.isWeekend && 'bg-surface/50 text-muted/40',
              d.completed && 'bg-accent text-white font-bold shadow-sm shadow-accent/20',
              d.isToday &&
                !d.completed &&
                'ring-2 ring-accent ring-offset-1 ring-offset-background text-accent-dim font-bold',
              d.isToday &&
                d.completed &&
                'ring-2 ring-accent-hover ring-offset-1 ring-offset-background'
            )}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
