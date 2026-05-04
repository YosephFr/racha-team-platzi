'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  User,
  Mail,
  LogOut,
  Trophy,
  Calendar,
  BookOpen,
  Flame,
  Bell,
  Clock,
  Phone,
  Trash2,
  Check,
  Globe,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getStreakLevel, getStreakLabel } from '@/lib/utils'
import UpdateBell from './UpdateBell'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

const LEVEL_COLORS = ['#9CA3AF', '#FCD34D', '#F97316', '#EA580C', '#DC2626', '#F59E0B']

const COUNTRIES = [
  { code: 'AR', label: 'Argentina', prefix: '+54' },
  { code: 'CO', label: 'Colombia', prefix: '+57' },
  { code: 'PE', label: 'Peru', prefix: '+51' },
]

export default function ProfileTab({ user, streakData, onLogout, onTabChange }) {
  const [reminder, setReminder] = useState(null)
  const [country, setCountry] = useState('AR')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [reminderHour, setReminderHour] = useState('09')
  const [reminderMinute, setReminderMinute] = useState('00')
  const [savingReminder, setSavingReminder] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)

  const streak = streakData?.currentStreak || 0
  const level = getStreakLevel(streak)

  useEffect(() => {
    api
      .getReminder()
      .then((d) => {
        if (d.reminder) {
          setReminder(d.reminder)
          const c = d.reminder.country || 'AR'
          const pref = COUNTRIES.find((x) => x.code === c)?.prefix.replace('+', '') || ''
          const num = d.reminder.phone_number || ''
          setPhoneNumber(num.startsWith(pref) ? num.slice(pref.length) : num)
          setCountry(c)
          setReminderHour(String(d.reminder.hour).padStart(2, '0'))
          setReminderMinute(String(d.reminder.minute).padStart(2, '0'))
        }
      })
      .catch(() => {})
  }, [])

  const handleSaveReminder = async () => {
    if (!phoneNumber || savingReminder) return
    setSavingReminder(true)
    setReminderSaved(false)
    try {
      const digits = phoneNumber.replace(/[^0-9]/g, '')
      const prefix = selectedCountry.prefix.replace('+', '')
      const fullNumber = digits.startsWith(prefix) ? digits : prefix + digits
      const data = await api.saveReminder(
        fullNumber,
        Number(reminderHour),
        Number(reminderMinute),
        country
      )
      setReminder(data.reminder)
      setReminderSaved(true)
      setTimeout(() => setReminderSaved(false), 2000)
    } catch (err) {
      console.error('Error saving reminder:', err)
    } finally {
      setSavingReminder(false)
    }
  }

  const handleDeleteReminder = async () => {
    if (!reminder) return
    try {
      await api.deleteReminder(reminder.id)
      setReminder(null)
      setPhoneNumber('')
      setCountry('AR')
      setReminderHour('09')
      setReminderMinute('00')
    } catch (err) {
      console.error('Error deleting reminder:', err)
    }
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0]

  const profileStats = [
    { label: 'Racha actual', value: streak, icon: Flame, color: 'text-accent-dim' },
    {
      label: 'Mejor racha',
      value: streakData?.bestStreak || 0,
      icon: Trophy,
      color: 'text-streak-2',
    },
    {
      label: 'Dias totales',
      value: streakData?.totalDays || 0,
      icon: Calendar,
      color: 'text-violet',
    },
    {
      label: 'Sesiones',
      value: streakData?.totalSessions || 0,
      icon: BookOpen,
      color: 'text-accent-dim',
    },
  ]

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  return (
    <div className="px-5 pt-6 pb-4 max-w-md lg:max-w-4xl mx-auto">
      <div className="bg-mesh" />

      <motion.div {...fadeUp} className="flex items-center justify-between mb-5">
        <h1 className="font-heading text-xl">Perfil</h1>
        <div className="lg:hidden">
          <UpdateBell variant="floating" />
        </div>
      </motion.div>

      <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6 lg:items-start">
        <div>
          <motion.section
            {...fadeUp}
            transition={{ delay: 0.04 }}
            className="card-base p-5 mb-5 lg:mb-0 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-3 border-2 border-border overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-muted" />
              )}
            </div>
            <h2 className="font-heading text-lg">{user?.name || 'Usuario'}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Mail size={13} className="text-muted" />
              <span className="text-sm text-muted">{user?.email || ''}</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-surface text-xs font-semibold"
              style={{ color: LEVEL_COLORS[level] }}
            >
              <Flame size={12} />
              {getStreakLabel(level)}
            </div>
          </motion.section>
        </div>

        <div>
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.08 }}
            className="grid grid-cols-2 gap-3 mb-5 lg:mb-0"
          >
            {profileStats.map((stat) => (
              <div key={stat.label} className="card-base p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={16} className={stat.color} />
                  <span className="text-xs text-muted">{stat.label}</span>
                </div>
                <p className="font-heading text-2xl text-foreground">{stat.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {onTabChange && (
        <motion.button
          {...fadeUp}
          transition={{ delay: 0.1 }}
          onClick={() => onTabChange('chat')}
          className="card-base p-4 mb-5 flex items-center gap-3 w-full text-left active:scale-[0.98] transition-transform lg:hidden"
        >
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
            <MessageCircle size={20} className="text-accent-dim" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-foreground">Indi</p>
            <p className="text-xs text-muted">Chatea con tu asistente de estudio</p>
          </div>
          <ChevronRight size={18} className="text-muted shrink-0" />
        </motion.button>
      )}

      <motion.section {...fadeUp} transition={{ delay: 0.12 }} className="card-base p-4 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-accent-dim" />
          <h3 className="font-heading text-sm text-foreground">Recordatorio diario por WhatsApp</h3>
        </div>

        <p className="text-xs text-muted mb-4">
          Recibiras un recordatorio por WhatsApp a la hora local que elijas.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted mb-1.5 block flex items-center gap-1.5">
              <Globe size={12} />
              Pais
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors appearance-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.prefix})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block flex items-center gap-1.5">
              <Phone size={12} />
              Numero de WhatsApp
            </label>
            <div className="flex gap-2">
              <span className="px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-muted shrink-0">
                {selectedCountry.prefix}
              </span>
              <input
                type="tel"
                placeholder="9 11 1234-5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block flex items-center gap-1.5">
              <Clock size={12} />
              Hora del recordatorio
            </label>
            <div className="flex gap-2 items-center">
              <select
                value={reminderHour}
                onChange={(e) => setReminderHour(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors appearance-none text-center"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-muted font-bold">:</span>
              <select
                value={reminderMinute}
                onChange={(e) => setReminderMinute(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors appearance-none text-center"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveReminder}
              disabled={!phoneNumber || savingReminder}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.97] transition-all"
            >
              {reminderSaved ? (
                <>
                  <Check size={14} />
                  Guardado
                </>
              ) : savingReminder ? (
                'Guardando...'
              ) : (
                <>
                  <Bell size={14} />
                  {reminder ? 'Actualizar' : 'Activar'}
                </>
              )}
            </button>
            {reminder && (
              <button
                onClick={handleDeleteReminder}
                className="w-11 h-11 rounded-xl bg-danger/10 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.section>

      <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-danger/10 text-danger font-semibold text-sm hover:bg-danger/20 transition-colors active:scale-[0.97]"
        >
          <LogOut size={18} />
          Cerrar sesion
        </button>
      </motion.div>

      <motion.p
        {...fadeUp}
        transition={{ delay: 0.2 }}
        className="text-center text-[10px] text-muted/50 mt-6"
      >
        Racha Team Platzi v0.5.0
      </motion.p>
    </div>
  )
}
