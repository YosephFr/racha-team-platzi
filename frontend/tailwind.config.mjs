/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#fafbf8',
        surface: '#f2f4ed',
        card: '#ffffff',
        elevated: '#e8ebe0',
        foreground: '#1a1d12',
        muted: '#7b8272',
        border: '#e2e5d9',
        accent: {
          DEFAULT: '#98ca3f',
          hover: '#7db32e',
          dim: '#5a8421',
          glow: 'rgba(152,202,63,0.25)',
        },
        violet: {
          DEFAULT: '#8730f5',
          glow: 'rgba(135,48,245,0.15)',
        },
        success: '#98ca3f',
        danger: '#e53256',
        streak: {
          0: '#9CA3AF',
          1: '#FCD34D',
          2: '#F97316',
          3: '#EA580C',
          4: '#DC2626',
          5: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '28px',
      },
      spacing: {
        nav: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        elevated: '0 12px 32px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)',
        float: '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fire-flicker': 'fire-flicker 1.5s ease-in-out infinite alternate',
        'fire-breathe': 'fire-breathe 2s ease-in-out infinite',
        'ember-rise': 'ember-rise 2s ease-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fire-flicker': {
          '0%': { transform: 'scale(1) rotate(-1deg)' },
          '100%': { transform: 'scale(1.04) rotate(1deg)' },
        },
        'fire-breathe': {
          '0%, 100%': { transform: 'scaleY(1)', opacity: '1' },
          '50%': { transform: 'scaleY(1.06)', opacity: '0.9' },
        },
        'ember-rise': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.7' },
          '100%': { transform: 'translateY(-50px) scale(0)', opacity: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
