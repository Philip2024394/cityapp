import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#0A0A0A',
        bg2:       '#111111',
        ink:       '#FFFFFF',
        muted:     'rgba(255,255,255,0.55)',
        dim:       'rgba(255,255,255,0.35)',
        line:      'rgba(255,255,255,0.08)',
        brand:     '#FACC15',
        brand2:    '#EAB308',
        online:    '#22C55E',
        offline:   '#64748B',
        danger:    '#EF4444',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        glow:     '0 0 24px rgba(250,204,21,0.35)',
        glowSoft: '0 0 18px rgba(250,204,21,0.18)',
        online:   '0 0 18px rgba(34,197,94,0.55)',
        card:     '0 12px 32px rgba(0,0,0,0.35)',
      },
      animation: {
        'pulse-online': 'pulseOnline 1.8s ease-in-out infinite',
        'float':         'float 3.4s ease-in-out infinite',
        'shimmer':       'shimmer 1.4s linear infinite',
        'fade-up':       'fadeUp 0.5s ease-out both',
      },
      keyframes: {
        pulseOnline: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.6)' },
          '70%':      { boxShadow: '0 0 0 14px rgba(34,197,94,0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
