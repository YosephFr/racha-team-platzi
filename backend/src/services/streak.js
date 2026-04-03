import { config } from '../config.js'
import { queries } from '../db/index.js'

function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay()
}

function isExcluded(dateStr) {
  return config.streak.excludedDates.includes(dateStr)
}

function isRequired(dateStr) {
  if (isExcluded(dateStr)) return false
  const dow = getDayOfWeek(dateStr)
  return config.streak.requiredDays.includes(dow)
}

function isOptional(dateStr) {
  if (isExcluded(dateStr)) return false
  const dow = getDayOfWeek(dateStr)
  return config.streak.optionalDays.includes(dow)
}

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

export function calculateStreak(userId) {
  const today = formatDate(new Date())
  let currentStreak = 0
  let checkDate = today

  const todayCompleted = queries.getStreakDay(userId, today)
  if (!todayCompleted?.completed) {
    if (isRequired(today)) {
      checkDate = addDays(today, -1)
    }
  }

  const MAX_LOOKBACK = 365
  let lookback = 0

  while (lookback < MAX_LOOKBACK) {
    lookback++

    if (isExcluded(checkDate)) {
      checkDate = addDays(checkDate, -1)
      continue
    }

    if (isOptional(checkDate)) {
      const streak = queries.getStreakDay(userId, checkDate)
      if (streak?.completed) {
        currentStreak++
      }
      checkDate = addDays(checkDate, -1)
      continue
    }

    if (isRequired(checkDate)) {
      const streak = queries.getStreakDay(userId, checkDate)
      if (streak?.completed) {
        currentStreak++
        checkDate = addDays(checkDate, -1)
        continue
      }
      break
    }

    checkDate = addDays(checkDate, -1)
  }

  return currentStreak
}

export function getStreakInfo(userId) {
  const today = formatDate(new Date())
  const thirtyDaysAgo = addDays(today, -30)
  const streakDays = queries.getStreakDays(userId, thirtyDaysAgo, today)
  const currentStreak = calculateStreak(userId)
  const todayCompleted = !!queries.getStreakDay(userId, today)?.completed
  const todayRequired = isRequired(today)
  const todayOptional = isOptional(today)
  const todayExcluded = isExcluded(today)

  return {
    currentStreak,
    todayCompleted,
    todayRequired,
    todayOptional,
    todayExcluded,
    calendar: streakDays.map((s) => ({ date: s.date, completed: !!s.completed })),
  }
}
