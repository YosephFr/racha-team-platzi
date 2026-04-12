'use client'

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const ACCENT = '#98ca3f'
const ACCENT_HOVER = '#7ab52e'
const VIOLET = '#8730f5'
const MUTED = '#7b8272'
const SURFACE = '#f2f4ed'
const FOREGROUND = '#1a1d12'
const COURSE_COLORS = [ACCENT, VIOLET, '#f59e0b', '#ef4444', '#3b82f6', '#ec4899']

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-card text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || FOREGROUND }}>
          {p.value} {unit || p.name}
        </p>
      ))}
    </div>
  )
}

export function WeeklyBarChart({ data }) {
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke={SURFACE} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip unit="min" />} cursor={{ fill: `${SURFACE}80` }} />
        <Bar dataKey="minutes" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DailyAreaChart({ data }) {
  if (!data?.length) return null

  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5).replace('-', '/'),
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={SURFACE} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: MUTED }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip unit="min" />} />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#areaGradient)"
          animationDuration={1000}
          dot={false}
          activeDot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CourseDonut({ data }) {
  if (!data?.length) return null

  const top = data.slice(0, 5)
  const rest = data.slice(5)
  const chartData =
    rest.length > 0
      ? [
          ...top,
          {
            name: 'Otros',
            minutes: rest.reduce((s, c) => s + c.minutes, 0),
            sessions: rest.reduce((s, c) => s + c.sessions, 0),
          },
        ]
      : top

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={34}
            outerRadius={54}
            paddingAngle={3}
            dataKey="minutes"
            animationDuration={800}
            stroke="none"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COURSE_COLORS[i % COURSE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5 min-w-0">
        {chartData.map((c, i) => (
          <div key={c.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: COURSE_COLORS[i % COURSE_COLORS.length] }}
            />
            <span className="text-xs text-foreground truncate">{c.name}</span>
            <span className="text-[10px] text-muted ml-auto shrink-0">{c.sessions}s</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ClassesBarChart({ data }) {
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke={SURFACE} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip unit="clases" />} cursor={{ fill: `${SURFACE}80` }} />
        <Bar dataKey="classes" fill={VIOLET} radius={[6, 6, 0, 0]} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Sparkline({ data, dataKey, color, height = 32 }) {
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color})`}
          animationDuration={600}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HourHeatmap({ data }) {
  if (!data?.length) return null

  const max = Math.max(...data, 1)
  const blocks = [
    { label: 'Manana', range: [6, 12] },
    { label: 'Tarde', range: [12, 18] },
    { label: 'Noche', range: [18, 24] },
    { label: 'Madrugada', range: [0, 6] },
  ]

  return (
    <div className="space-y-2">
      {blocks.map((block) => (
        <div key={block.label}>
          <p className="text-[10px] text-muted mb-1">{block.label}</p>
          <div className="flex gap-1">
            {Array.from({ length: block.range[1] - block.range[0] }, (_, i) => {
              const hour = block.range[0] + i
              const count = data[hour] || 0
              const intensity = count / max
              return (
                <div
                  key={hour}
                  className="flex-1 h-5 rounded"
                  style={{
                    background:
                      count === 0
                        ? SURFACE
                        : `color-mix(in srgb, ${ACCENT} ${Math.round(intensity * 100)}%, ${SURFACE})`,
                  }}
                  title={`${hour}:00 — ${count} sesiones`}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
