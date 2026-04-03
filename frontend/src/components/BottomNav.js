'use client'

import { Home, Flame, MessageCircle, User } from 'lucide-react'
import StreakFireButton from './StreakFireButton'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'home', icon: Home, label: 'Inicio' },
  { id: 'racha', icon: Flame, label: 'Racha' },
  { id: 'study', icon: null, label: 'Estudiar' },
  { id: 'chat', icon: MessageCircle, label: 'Indi' },
  { id: 'profile', icon: User, label: 'Perfil' },
]

export default function BottomNav({ activeTab, onTabChange, streak }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="glass-strong rounded-3xl px-2 py-2 flex items-end justify-between shadow-float">
          {tabs.map((tab) => {
            if (tab.id === 'study') {
              return (
                <div key={tab.id} className="flex-1 flex justify-center">
                  <StreakFireButton
                    streak={streak}
                    onClick={() => onTabChange('study')}
                    isActive={activeTab === 'study'}
                  />
                </div>
              )
            }

            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200',
                  isActive ? 'text-accent-dim' : 'text-muted'
                )}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    className="transition-all duration-200"
                  />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-accent" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors duration-200',
                    isActive ? 'text-accent-dim' : 'text-muted'
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
