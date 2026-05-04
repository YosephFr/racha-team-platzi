'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const POLL_INTERVAL = 60_000
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || ''

export async function applyUpdate() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {
    /* ignore */
  }
  window.location.reload()
}

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [checking, setChecking] = useState(false)
  const detectedRef = useRef(false)

  const check = useCallback(async (manual = false) => {
    if (detectedRef.current || !BUILD_ID) {
      if (manual) setChecking(false)
      return false
    }
    if (manual) setChecking(true)
    try {
      const res = await fetch('/version', { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      if (data?.buildId && data.buildId !== BUILD_ID) {
        detectedRef.current = true
        setUpdateAvailable(true)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      if (manual) setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (!BUILD_ID) return

    const id = requestAnimationFrame(() => check())
    const timer = setInterval(() => check(), POLL_INTERVAL)

    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    const onFocus = () => check()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelAnimationFrame(id)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  return { updateAvailable, checking, checkNow: () => check(true), applyUpdate }
}
