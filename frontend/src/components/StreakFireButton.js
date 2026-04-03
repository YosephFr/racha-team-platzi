'use client'

import { getStreakLevel } from '@/lib/utils'

const PHASES = [
  { ring: '#9CA3AF', bg: '#F3F4F6', outer: '#9CA3AF', inner: '#D1D5DB' },
  { ring: '#FCD34D', bg: '#FEF9E7', outer: '#FCD34D', inner: '#FBBF24' },
  { ring: '#F97316', bg: '#FFF4E6', outer: '#F97316', inner: '#FB923C' },
  { ring: '#EA580C', bg: '#FEF2E6', outer: '#EA580C', inner: '#DC2626' },
  { ring: '#DC2626', bg: '#FEE6E6', outer: '#DC2626', inner: '#B91C1C' },
  { ring: '#F59E0B', bg: '#FEF6E0', outer: '#F59E0B', inner: '#D97706' },
]

export default function StreakFireButton({ streak, onClick, isActive }) {
  const level = getStreakLevel(streak)
  const phase = PHASES[level]
  const btnSize = 54 + Math.min(level * 2, 10)
  const iconSize = 22 + level * 1.5

  return (
    <button
      onClick={onClick}
      className="relative -mt-5 flex flex-col items-center outline-none group"
      aria-label="Estudiar"
    >
      {level > 0 && (
        <div
          className="absolute rounded-full blur-xl"
          style={{
            width: btnSize + 16,
            height: btnSize + 16,
            top: -8,
            background: `radial-gradient(circle, ${phase.ring}30 0%, transparent 70%)`,
            animation: 'mascot-glow 2s ease-in-out infinite',
          }}
        />
      )}

      <div
        className="relative rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
        style={{
          width: btnSize,
          height: btnSize,
          background: `linear-gradient(145deg, ${phase.bg}, #ffffff)`,
          boxShadow: isActive
            ? `0 0 0 2.5px ${phase.ring}, 0 4px 16px ${phase.ring}40`
            : `0 0 0 2px ${phase.ring}90, 0 4px 14px rgba(0,0,0,0.08)`,
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 36 36"
          fill="none"
          style={{
            animation: level > 0 ? 'fire-flicker 1.5s ease-in-out infinite alternate' : 'none',
            filter: level === 0 ? 'saturate(0) opacity(0.5)' : 'none',
          }}
        >
          {level >= 5 && (
            <defs>
              <linearGradient
                id="btnGold"
                x1="0"
                y1="0"
                x2="36"
                y2="36"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>
          )}
          <path
            fill={level >= 5 ? 'url(#btnGold)' : phase.outer}
            d="M35 19c0-2.062-.367-4.039-1.04-5.868-.46 5.389-3.333 8.157-6.335 6.868-2.812-1.208-.917-5.917-.777-8.164.236-3.809-.012-8.169-6.931-11.794 2.875 5.5.333 8.917-2.333 9.125-2.958.231-5.667-2.542-4.667-7.042-3.238 2.386-3.332 6.402-2.333 9 1.042 2.708-.042 4.958-2.583 5.208-2.84.28-4.418-3.041-2.963-8.333C2.52 10.965 1 14.805 1 19c0 9.389 7.611 17 17 17s17-7.611 17-17z"
          />
          <path
            fill={phase.inner}
            d="M28.394 23.999c.148 3.084-2.561 4.293-4.019 3.709-2.106-.843-1.541-2.291-2.083-5.291s-2.625-5.083-5.708-6c2.25 6.333-1.247 8.667-3.08 9.084-1.872.426-3.753-.001-3.968-4.007C7.352 23.668 6 26.676 6 30c0 .368.023.73.055 1.09C9.125 34.124 13.342 36 18 36s8.875-1.876 11.945-4.91c.032-.36.055-.722.055-1.09 0-2.187-.584-4.236-1.606-6.001z"
            opacity={level === 0 ? 0.4 : 0.85}
          />
        </svg>
      </div>

      <span
        className="text-[10px] font-semibold mt-1 transition-colors duration-300"
        style={{ color: isActive ? phase.ring : '#7b8272' }}
      >
        Estudiar
      </span>
    </button>
  )
}
