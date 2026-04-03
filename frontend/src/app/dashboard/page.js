'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import BottomNav from '@/components/BottomNav'
import HomeTab from '@/components/HomeTab'
import RachaTab from '@/components/RachaTab'
import ChatTab from '@/components/ChatTab'
import ProfileTab from '@/components/ProfileTab'
import StudyTab from '@/components/StudyTab'

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('home')
  const [streakData, setStreakData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const mainRef = useRef(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    api.getStreaks().then(setStreakData).catch(console.error)
    api
      .getLeaderboard()
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(console.error)
  }, [user])

  const switchTab = useCallback((tab) => {
    setActiveTab(tab)
    requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = 0
      window.scrollTo(0, 0)
    })
  }, [])

  const handleStudyComplete = useCallback(() => {
    switchTab('home')
    if (user) {
      api.getStreaks().then(setStreakData).catch(console.error)
      api
        .getLeaderboard()
        .then((d) => setLeaderboard(d.leaderboard || []))
        .catch(console.error)
    }
  }, [user, switchTab])

  const handleLogout = useCallback(() => {
    logout()
    router.replace('/login')
  }, [logout, router])

  const refreshData = useCallback(() => {
    if (!user) return
    api.getStreaks().then(setStreakData).catch(console.error)
    api
      .getLeaderboard()
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(console.error)
  }, [user])

  useEffect(() => {
    function onFocus() {
      refreshData()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshData])

  if (loading || !user) return null

  const streak = streakData?.currentStreak || 0

  return (
    <div className="min-h-dvh flex flex-col">
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-nav-safe">
        <div className={activeTab === 'chat' ? 'h-[calc(100dvh-6rem)]' : 'hidden'}>
          <ChatTab />
        </div>

        {activeTab === 'home' && (
          <HomeTab
            user={user}
            streak={streak}
            streakData={streakData}
            leaderboard={leaderboard}
            onStudy={() => switchTab('study')}
            onTabChange={switchTab}
          />
        )}

        {activeTab === 'racha' && <RachaTab streakData={streakData} />}

        {activeTab === 'study' && <StudyTab onComplete={handleStudyComplete} />}

        {activeTab === 'profile' && (
          <ProfileTab user={user} streakData={streakData} onLogout={handleLogout} />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={switchTab} streak={streak} />
    </div>
  )
}
