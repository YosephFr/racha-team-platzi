'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('racha_token', urlToken)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = localStorage.getItem('racha_token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('racha_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, name) => {
    const data = await api.login(email, name)
    localStorage.setItem('racha_token', data.token)
    setUser(data.user)
    return data.user
  }, [])

  const loginWithToken = useCallback(async (token) => {
    localStorage.setItem('racha_token', token)
    const data = await api.getMe()
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('racha_token')
    setUser(null)
  }, [])

  return (
    <AuthContext value={{ user, loading, login, loginWithToken, logout }}>{children}</AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
