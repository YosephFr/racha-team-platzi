'use client'

import { getStreakLevel } from '@/lib/utils'

const PHASES = [
  { outer: '#9CA3AF', inner: '#D1D5DB', eye: '#6B7280', label: 'Apagado' },
  { outer: '#FCD34D', inner: '#FBBF24', eye: '#92400E', label: 'Chispa' },
  { outer: '#F97316', inner: '#FB923C', eye: '#7C2D12', label: 'Fuego' },
  { outer: '#EA580C', inner: '#DC2626', eye: '#7C2D12', label: 'Ardiendo' },
  { outer: '#DC2626', inner: '#B91C1C', eye: '#450A0A', label: 'Inferno' },
  { outer: '#F59E0B', inner: '#D97706', eye: '#451A03', label: 'Legendario' },
]

const BASE_SIZES = [48, 56, 64, 76, 88, 96]

function Eyes({ level }) {
  if (level === 0) {
    return (
      <g>
        <ellipse cx="13" cy="22" rx="1.6" ry="1.2" fill="#6B7280" opacity="0.7" />
        <ellipse cx="23" cy="22" rx="1.6" ry="1.2" fill="#6B7280" opacity="0.7" />
        <line
          x1="11"
          y1="19.5"
          x2="14"
          y2="20.5"
          stroke="#6B7280"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.5"
        />
        <line
          x1="25"
          y1="19.5"
          x2="22"
          y2="20.5"
          stroke="#6B7280"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
    )
  }

  if (level === 1) {
    return (
      <g>
        <circle cx="13" cy="21.5" r="1.5" fill="#92400E">
          <animate
            attributeName="r"
            values="1.5;0.3;1.5"
            dur="3.5s"
            repeatCount="indefinite"
            keyTimes="0;0.03;0.06"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
            calcMode="spline"
          />
        </circle>
        <circle cx="23" cy="21.5" r="1.5" fill="#92400E">
          <animate
            attributeName="r"
            values="1.5;0.3;1.5"
            dur="3.5s"
            repeatCount="indefinite"
            keyTimes="0;0.03;0.06"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
            calcMode="spline"
          />
        </circle>
      </g>
    )
  }

  if (level === 2) {
    return (
      <g>
        <circle cx="13" cy="21" r="1.8" fill="#7C2D12" />
        <circle cx="23" cy="21" r="1.8" fill="#7C2D12" />
        <circle cx="13.7" cy="20.3" r="0.5" fill="white" opacity="0.8" />
        <circle cx="23.7" cy="20.3" r="0.5" fill="white" opacity="0.8" />
      </g>
    )
  }

  if (level === 3) {
    return (
      <g>
        <path
          d="M11 21.5 Q13 19.5 15 21.5"
          stroke="#7C2D12"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M21 21.5 Q23 19.5 25 21.5"
          stroke="#7C2D12"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }

  if (level === 4) {
    return (
      <g>
        <circle cx="13" cy="21" r="2.2" fill="#450A0A" />
        <circle cx="23" cy="21" r="2.2" fill="#450A0A" />
        <circle cx="13.8" cy="20" r="0.7" fill="white" opacity="0.9" />
        <circle cx="23.8" cy="20" r="0.7" fill="white" opacity="0.9" />
        <circle cx="12.2" cy="21.5" r="0.35" fill="white" opacity="0.5" />
        <circle cx="22.2" cy="21.5" r="0.35" fill="white" opacity="0.5" />
        <circle cx="13" cy="17" r="0.8" fill="#FCD34D" opacity="0.6">
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="23" cy="17" r="0.8" fill="#FCD34D" opacity="0.6">
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="1.5s"
            repeatCount="indefinite"
            begin="0.3s"
          />
        </circle>
      </g>
    )
  }

  return (
    <g>
      <polygon
        points="13,18.5 14.2,20.8 11.8,20.8"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="0.4"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.2s" repeatCount="indefinite" />
      </polygon>
      <polygon
        points="13,23.5 14.2,21.2 11.8,21.2"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="0.4"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.2s" repeatCount="indefinite" />
      </polygon>
      <polygon
        points="23,18.5 24.2,20.8 21.8,20.8"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="0.4"
      >
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.2s"
          repeatCount="indefinite"
          begin="0.2s"
        />
      </polygon>
      <polygon
        points="23,23.5 24.2,21.2 21.8,21.2"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="0.4"
      >
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.2s"
          repeatCount="indefinite"
          begin="0.2s"
        />
      </polygon>
      <circle cx="13" cy="21" r="1" fill="#451A03" />
      <circle cx="23" cy="21" r="1" fill="#451A03" />
    </g>
  )
}

export default function StreakMascot({ streak, size: overrideSize }) {
  const level = getStreakLevel(streak)
  const phase = PHASES[level]
  const size = overrideSize || BASE_SIZES[level]

  const animClass = [
    '',
    'mascot-blink',
    'mascot-sway',
    'mascot-flame',
    'mascot-flame',
    'mascot-flame',
  ][level]

  return (
    <div className="relative flex items-center justify-center">
      {level >= 4 && (
        <div
          className="absolute rounded-full"
          style={{
            width: size * 1.4,
            height: size * 1.4,
            background: `radial-gradient(circle, ${phase.outer}25 0%, transparent 70%)`,
            animation: 'mascot-aura 2s ease-in-out infinite',
          }}
        />
      )}

      {level >= 3 && (
        <div
          className="absolute rounded-full blur-xl"
          style={{
            width: size * 0.6,
            height: size * 0.3,
            bottom: -4,
            background: `${phase.outer}40`,
            animation: 'mascot-glow 2s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        className={animClass}
        style={{ filter: level === 0 ? 'saturate(0) opacity(0.5)' : 'none' }}
      >
        {level >= 5 && (
          <defs>
            <linearGradient
              id="mascotGold"
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
          fill={level >= 5 ? 'url(#mascotGold)' : phase.outer}
          d="M35 19c0-2.062-.367-4.039-1.04-5.868-.46 5.389-3.333 8.157-6.335 6.868-2.812-1.208-.917-5.917-.777-8.164.236-3.809-.012-8.169-6.931-11.794 2.875 5.5.333 8.917-2.333 9.125-2.958.231-5.667-2.542-4.667-7.042-3.238 2.386-3.332 6.402-2.333 9 1.042 2.708-.042 4.958-2.583 5.208-2.84.28-4.418-3.041-2.963-8.333C2.52 10.965 1 14.805 1 19c0 9.389 7.611 17 17 17s17-7.611 17-17z"
        >
          {level >= 2 && (
            <animate
              attributeName="d"
              dur="2s"
              repeatCount="indefinite"
              values="M35 19c0-2.062-.367-4.039-1.04-5.868-.46 5.389-3.333 8.157-6.335 6.868-2.812-1.208-.917-5.917-.777-8.164.236-3.809-.012-8.169-6.931-11.794 2.875 5.5.333 8.917-2.333 9.125-2.958.231-5.667-2.542-4.667-7.042-3.238 2.386-3.332 6.402-2.333 9 1.042 2.708-.042 4.958-2.583 5.208-2.84.28-4.418-3.041-2.963-8.333C2.52 10.965 1 14.805 1 19c0 9.389 7.611 17 17 17s17-7.611 17-17z;M35 19c0-2.062-.367-4.039-1.04-5.868-.46 5.389-3.333 8.657-6.335 7.368-2.812-1.208-.917-6.417-.777-8.664.236-3.809-.012-7.669-6.931-11.294 2.875 5.5.333 8.417-2.333 8.625-2.958.231-5.667-2.042-4.667-6.542-3.238 2.386-3.332 5.902-2.333 8.5 1.042 2.708-.042 5.458-2.583 5.708-2.84.28-4.418-3.541-2.963-8.833C2.52 10.465 1 14.305 1 18.5c0 9.389 7.611 17.5 17 17.5s17-8.111 17-17z;M35 19c0-2.062-.367-4.039-1.04-5.868-.46 5.389-3.333 8.157-6.335 6.868-2.812-1.208-.917-5.917-.777-8.164.236-3.809-.012-8.169-6.931-11.794 2.875 5.5.333 8.917-2.333 9.125-2.958.231-5.667-2.542-4.667-7.042-3.238 2.386-3.332 6.402-2.333 9 1.042 2.708-.042 4.958-2.583 5.208-2.84.28-4.418-3.041-2.963-8.333C2.52 10.965 1 14.805 1 19c0 9.389 7.611 17 17 17s17-7.611 17-17z"
            />
          )}
        </path>

        <path
          fill={phase.inner}
          d="M28.394 23.999c.148 3.084-2.561 4.293-4.019 3.709-2.106-.843-1.541-2.291-2.083-5.291s-2.625-5.083-5.708-6c2.25 6.333-1.247 8.667-3.08 9.084-1.872.426-3.753-.001-3.968-4.007C7.352 23.668 6 26.676 6 30c0 .368.023.73.055 1.09C9.125 34.124 13.342 36 18 36s8.875-1.876 11.945-4.91c.032-.36.055-.722.055-1.09 0-2.187-.584-4.236-1.606-6.001z"
          opacity={level === 0 ? 0.4 : 0.85}
        />

        <Eyes level={level} />

        {level >= 5 && (
          <>
            {[
              { cx: 5, cy: 14, r: 1, dur: '1.6s', delay: '0s' },
              { cx: 31, cy: 12, r: 0.8, dur: '1.8s', delay: '0.3s' },
              { cx: 10, cy: 6, r: 0.7, dur: '2s', delay: '0.6s' },
              { cx: 28, cy: 4, r: 0.9, dur: '1.7s', delay: '0.4s' },
              { cx: 18, cy: 2, r: 1, dur: '1.5s', delay: '0.8s' },
            ].map((p, i) => (
              <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#FCD34D" opacity="0">
                <animate
                  attributeName="cy"
                  values={`${p.cy + 8};${p.cy};${p.cy - 5}`}
                  dur={p.dur}
                  begin={p.delay}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;0.7;0"
                  dur={p.dur}
                  begin={p.delay}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </>
        )}

        {level >= 3 && level < 5 && (
          <>
            {[
              { cx: 6, cy: 16, r: 0.7, dur: '2s', delay: '0s' },
              { cx: 30, cy: 14, r: 0.6, dur: '2.2s', delay: '0.4s' },
              { cx: 12, cy: 5, r: 0.5, dur: '1.8s', delay: '0.7s' },
            ].map((p, i) => (
              <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={phase.outer} opacity="0">
                <animate
                  attributeName="cy"
                  values={`${p.cy + 6};${p.cy};${p.cy - 4}`}
                  dur={p.dur}
                  begin={p.delay}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;0.5;0"
                  dur={p.dur}
                  begin={p.delay}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </>
        )}
      </svg>
    </div>
  )
}
