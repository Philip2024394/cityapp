'use client'
import { useEffect, useState } from 'react'
import { Power } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'
import { useDriverLocationPing, type DriverLocationPingState } from '@/hooks/useDriverLocationPing'

type Props = {
  defaultOnline?: boolean
  onChange?: (online: boolean) => void
}

export default function GoOnlineToggle({ defaultOnline = false, onChange }: Props) {
  const [online, setOnline] = useState(defaultOnline)
  const [ping, setPing] = useState<DriverLocationPingState>({
    status: 'idle', lastSentAt: null, lastError: null,
  })
  const haptic = useHaptic()

  // Live location loop — only runs while the toggle is online. The hook
  // handles permission prompts, watchPosition, and the throttled POST
  // to /api/drivers/location (which auto-flips between 'online' and
  // 'busy' based on detected movement, server-side).
  useDriverLocationPing(online, { onStatus: setPing })

  // Reflect the loaded server-side state on first mount, then leave
  // subsequent flips to the user's tap.
  useEffect(() => {
    setOnline(defaultOnline)
  }, [defaultOnline])

  async function toggle() {
    const next = !online
    setOnline(next)
    haptic.impact()
    onChange?.(next)
    // Persist availability immediately. Going online → 'online'; going
    // offline → 'offline'. Once 'online', the location ping loop will
    // flip to 'busy' / 'online' based on movement; we don't need to
    // overwrite that here.
    try {
      await fetch('/api/drivers/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next ? 'online' : 'offline' }),
      })
    } catch {
      /* offline / network blip — UI optimistically reflects, server
         will catch up on the next successful call. */
    }
  }

  const gpsHint = (() => {
    if (!online) return 'GPS permission required'
    if (ping.status === 'denied') return 'Location permission denied — tap to allow'
    if (ping.status === 'unavailable') return 'GPS unavailable on this device'
    if (ping.status === 'requesting') return 'Locating…'
    if (ping.lastSentAt) {
      const ageS = Math.max(0, Math.round((Date.now() - ping.lastSentAt) / 1000))
      return `Live — last update ${ageS < 5 ? 'just now' : `${ageS}s ago`}`
    }
    return 'Live location updates every 30 seconds'
  })()

  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
        style={{
          opacity: online ? 1 : 0,
          background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.18) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={online ? 'dot-online' : 'dot-offline'} />
            <span className="text-[13px] font-extrabold tracking-wider uppercase text-muted">
              {online ? 'Online — Customers can see you' : 'Offline'}
            </span>
          </div>
          <div className="text-xl font-extrabold mt-1.5">
            {online ? 'You are visible on the marketplace' : 'Go online to receive quotes'}
          </div>
          <div className="text-[13px] text-dim mt-1">{gpsHint}</div>
        </div>

        <button
          onClick={toggle}
          className="shrink-0 relative"
          aria-label={online ? 'Go offline' : 'Go online'}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-bg transition-all"
            style={{
              background: online
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : 'linear-gradient(135deg, #FACC15, #EAB308)',
              boxShadow: online
                ? '0 0 28px rgba(34,197,94,0.55)'
                : '0 0 20px rgba(250,204,21,0.45)',
            }}
          >
            <Power className="w-7 h-7" strokeWidth={3} />
          </div>
        </button>
      </div>
    </div>
  )
}
