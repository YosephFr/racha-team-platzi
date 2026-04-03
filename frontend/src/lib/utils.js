import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getStreakLevel(streak) {
  if (streak === 0) return 0
  if (streak <= 2) return 1
  if (streak <= 6) return 2
  if (streak <= 13) return 3
  if (streak <= 29) return 4
  return 5
}

export function getStreakLabel(level) {
  const labels = ['Apagado', 'Chispa', 'Fuego', 'Ardiendo', 'Inferno', 'Legendario']
  return labels[level] || labels[0]
}

function parseUTCDate(str) {
  if (!str) return new Date()
  const s = String(str)
  if (s.includes('Z') || s.includes('+')) return new Date(s)
  return new Date(s.replace(' ', 'T') + 'Z')
}

export function formatRelativeTime(dateStr) {
  const date = parseUTCDate(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'ahora'
  if (diffMins < 60) return `hace ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays}d`
}

export async function compressImage(file, maxSizeMB = 2) {
  if (!file || !file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX_DIM = 1920
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              quality -= 0.1
              tryCompress()
            } else {
              resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryCompress()
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}
