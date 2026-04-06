'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    api
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, name) => {
    const data = await api.login(email, name)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {}
    setUser(null)
  }, [])

  return <AuthContext value={{ user, loading, login, logout }}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
