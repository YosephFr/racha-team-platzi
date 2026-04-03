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
import { Home, Flame, MessageCircle, User, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'racha', icon: Flame, label: 'Racha' },
    { id: 'chat', icon: MessageCircle, label: 'Indi' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ]

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-card border-r border-border flex-col z-40">
        <div className="px-5 pt-6 pb-2">
          <h1 className="font-heading text-lg text-foreground">Racha Team</h1>
          <p className="text-xs text-muted">Platzi</p>
        </div>

        <div className="px-4 py-4 mx-1 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center overflow-hidden border border-border shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-muted">
                {(user?.name || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => switchTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeTab === item.id
                  ? 'bg-accent/10 text-accent-dim'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              )}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.25 : 1.75} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => switchTab('study')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            <BookOpen size={18} />
            Estudiar
          </button>
        </div>

        <div className="px-5 pb-6 pt-3 border-t border-border flex items-center gap-2">
          <Flame size={16} className="text-streak-2" />
          <span className="text-sm font-semibold text-foreground">{streak}</span>
          <span className="text-xs text-muted">dias de racha</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-dvh lg:ml-60">
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden pb-nav-safe lg:pb-0"
        >
          <div className={activeTab === 'chat' ? 'h-[calc(100dvh-6rem)] lg:h-dvh' : 'hidden'}>
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
    </div>
  )
}
