'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import StreakMascot from '@/components/StreakMascot'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard')
  }, [user, authLoading, router])

  if (authLoading) return null

  function handleGoogleLogin() {
    window.location.href = api.getGoogleAuthUrl()
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden px-6 bg-background">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-accent/[0.08] blur-[100px]" />
        <div className="absolute bottom-[-5%] right-1/4 w-[260px] h-[260px] rounded-full bg-violet/[0.04] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center lg:bg-card lg:p-10 lg:rounded-3xl lg:shadow-elevated lg:border lg:border-border">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5"
        >
          <StreakMascot streak={15} size={88} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="font-heading text-3xl text-foreground mb-1.5">Racha Team</h1>
          <p className="text-muted text-sm">Mantene tu racha de estudio en Platzi</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="w-full"
        >
          {error && (
            <p className="text-danger text-xs text-center mb-3">
              {error === 'auth_cancelled'
                ? 'Inicio de sesion cancelado'
                : error === 'invalid_state'
                  ? 'Sesion expirada. Intenta de nuevo.'
                  : 'Error al iniciar sesion. Intenta de nuevo.'}
            </p>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-card border border-border text-foreground font-semibold shadow-card hover:shadow-card-hover transition-all active:scale-[0.97]"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Acceder con Google
          </button>
        </motion.div>
      </div>
    </div>
  )
}
