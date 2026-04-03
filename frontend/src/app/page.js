'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-accent typing-dot" />
        <div className="w-2 h-2 rounded-full bg-accent typing-dot" />
        <div className="w-2 h-2 rounded-full bg-accent typing-dot" />
      </div>
    </div>
  )
}
