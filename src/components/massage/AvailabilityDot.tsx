'use client'

// Live availability indicator. Green pulse = online (taking bookings),
// orange = busy, grey = offline. Used in marketplace cards, detail page,
// and dashboard header.

import type { MassageAvailability } from '@/lib/massage/types'

// Two-colour scheme per spec: green pulse for online, solid orange for
// busy OR offline (both = not taking bookings right now).
const COLORS: Record<MassageAvailability, { fill: string; ring: string; label: string }> = {
  online:  { fill: '#22C55E', ring: 'rgba(34,197,94,0.55)',  label: 'Online · available' },
  busy:    { fill: '#F97316', ring: 'rgba(249,115,22,0.45)', label: 'Busy' },
  offline: { fill: '#F97316', ring: 'rgba(249,115,22,0.45)', label: 'Offline' },
}

export default function AvailabilityDot({
  availability,
  size = 10,
  withLabel = false,
}: {
  availability: MassageAvailability
  size?: number
  withLabel?: boolean
}) {
  const c = COLORS[availability]
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-bold text-ink/85">
      <span
        aria-label={c.label}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: c.fill,
          boxShadow: availability === 'online'
            ? `0 0 0 0 ${c.ring}`
            : 'none',
          animation: availability === 'online' ? 'massagePulse 1.6s ease-in-out infinite' : 'none',
          display: 'inline-block',
        }}
      />
      {withLabel && <span>{c.label}</span>}
      <style>{`
        @keyframes massagePulse {
          0%, 100% { box-shadow: 0 0 0 0 ${COLORS.online.ring}; }
          70%      { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
      `}</style>
    </span>
  )
}
