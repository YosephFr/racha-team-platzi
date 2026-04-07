import { config } from '../config.js'
import { queries } from '../db/index.js'

function getEffectiveToday() {
  const now = new Date()
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: config.streak.timezone }))
  if (localTime.getHours() < config.streak.resetHour) {
    localTime.setDate(localTime.getDate() - 1)
  }
  return formatDate(localTime)
}

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
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

export function calculateStreak(userId) {
  const today = getEffectiveToday()
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
  const today = getEffectiveToday()
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

export function calculateLeaderboardStreak(userId) {
  const today = getEffectiveToday()
  const yearAgo = addDays(today, -365)
  const allDays = queries.getStreakDays(userId, yearAgo, today)
  const completedDates = new Set(allDays.filter((d) => d.completed).map((d) => d.date))

  if (!completedDates.size) return 0

  const sorted = [...completedDates].sort()
  let checkDate = sorted[sorted.length - 1]
  let streak = 0

  const MAX_LOOKBACK = 365
  let lookback = 0

  while (lookback < MAX_LOOKBACK) {
    lookback++

    if (isExcluded(checkDate)) {
      checkDate = addDays(checkDate, -1)
      continue
    }

    if (isOptional(checkDate)) {
      if (completedDates.has(checkDate)) streak++
      checkDate = addDays(checkDate, -1)
      continue
    }

    if (isRequired(checkDate)) {
      if (completedDates.has(checkDate)) {
        streak++
        checkDate = addDays(checkDate, -1)
        continue
      }
      break
    }

    checkDate = addDays(checkDate, -1)
  }

  return streak
}

export function getEffectiveDate() {
  return getEffectiveToday()
}
