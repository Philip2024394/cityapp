'use client'
import { useEffect, useState } from 'react'
import { Power, Clock, X as XIcon } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'
import { useDriverLocationPing, type DriverLocationPingState } from '@/hooks/useDriverLocationPing'
import { useWakeLock } from '@/hooks/useWakeLock'
import { isNative } from '@/lib/capacitor/isNative'
import { startNativeBackgroundPing, stopNativeBackgroundPing } from '@/lib/capacitor/locationBridge'

type Props = {
  defaultOnline?: boolean
  defaultOnlineUntil?: string | null
  onChange?: (online: boolean) => void
}

// Allowed shift durations the driver can pick from. `null` = "until I
// toggle off" — no auto-expiry. The marketplace filters expired drivers
// out so a forgotten session doesn't pollute results overnight.
type ShiftHours = 1 | 2 | 4 | null
const SHIFT_OPTIONS: ReadonlyArray<{ value: ShiftHours; label: string }> = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: null, label: 'Until I toggle off' },
]

function formatUntilTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  const d = new Date(t)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export default function GoOnlineToggle({ defaultOnline = false, defaultOnlineUntil = null, onChange }: Props) {
  const [online, setOnline] = useState(defaultOnline)
  const [onlineUntil, setOnlineUntil] = useState<string | null>(defaultOnlineUntil)
  const [showShiftPicker, setShowShiftPicker] = useState(false)
  const [ping, setPing] = useState<DriverLocationPingState>({
    status: 'idle', lastSentAt: null, lastError: null,
  })
  const haptic = useHaptic()

  // Live location loop — only runs while the toggle is online.
  useDriverLocationPing(online, { onStatus: setPing })
  // Wake Lock — keep the screen on while online so the location watcher
  // doesn't get killed by OS screen sleep. PWA-only mitigation; not
  // a substitute for native background location, but covers the
  // "driver props phone up while working" use case.
  useWakeLock(online)

  useEffect(() => {
    setOnline(defaultOnline)
    setOnlineUntil(defaultOnlineUntil)
  }, [defaultOnline, defaultOnlineUntil])

  async function goOnline(hours: ShiftHours) {
    setShowShiftPicker(false)
    setOnline(true)
    haptic.impact()
    onChange?.(true)
    // On native: start the foreground-service background ping. It survives
    // phone lock / backgrounding. On web: the useDriverLocationPing hook
    // (already running because `online` flipped true) handles it within
    // the foreground tab.
    if (isNative()) {
      void startNativeBackgroundPing()
    }
    try {
      const res = await fetch('/api/drivers/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: 'online', online_until_hours: hours }),
      })
      if (res.ok) {
        const j = await res.json().catch(() => ({}))
        setOnlineUntil(j?.online_until ?? null)
      }
    } catch {
      /* offline / network blip — UI optimistically reflects */
    }
  }

  async function goOffline() {
    setOnline(false)
    setOnlineUntil(null)
    haptic.impact()
    onChange?.(false)
    if (isNative()) {
      void stopNativeBackgroundPing()
    }
    try {
      await fetch('/api/drivers/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: 'offline' }),
      })
    } catch { /* ignore */ }
  }

  function onPress() {
    if (online) {
      void goOffline()
    } else {
      setShowShiftPicker(true)
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

  const untilTime = formatUntilTime(onlineUntil)

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
          {online && untilTime && (
            <div className="text-[13px] mt-2 inline-flex items-center gap-1.5 font-bold" style={{ color: '#22C55E' }}>
              <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
              Online until {untilTime}
            </div>
          )}
        </div>

        <button
          onClick={onPress}
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
              minWidth: 80,
              minHeight: 80,
            }}
          >
            <Power className="w-7 h-7" strokeWidth={3} />
          </div>
        </button>
      </div>

      {/* Shift duration picker — bottom sheet on first online toggle. */}
      {showShiftPicker && (
        <ShiftPicker
          onPick={(h) => void goOnline(h)}
          onDismiss={() => setShowShiftPicker(false)}
        />
      )}
    </div>
  )
}

function ShiftPicker({ onPick, onDismiss }: { onPick: (h: ShiftHours) => void; onDismiss: () => void }) {
  return (
    <>
      <div
        onClick={onDismiss}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How long will you be online?"
        className="fixed inset-x-0 bottom-0 z-50 animate-[fadeUp_0.25s_ease-out]"
      >
        <div
          className="max-w-2xl mx-auto rounded-t-3xl p-5 pb-safe space-y-4"
          style={{
            background: 'rgba(20,20,20,0.97)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderBottom: 'none',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-extrabold">How long will you be online?</h2>
              <p className="text-[13px] text-muted mt-1 leading-relaxed">
                We&apos;ll auto-flip you offline so you never stay listed when you&apos;re not actually working.
                You can always toggle off sooner.
              </p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="space-y-2">
            {SHIFT_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onPick(opt.value)}
                className="w-full p-4 rounded-2xl font-extrabold text-[14px] text-ink active:scale-[0.99] transition flex items-center justify-between gap-2"
                style={{
                  background: 'rgba(34,197,94,0.10)',
                  border: '1px solid rgba(34,197,94,0.40)',
                  minHeight: 52,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                  {opt.label}
                </span>
                {opt.value !== null && (
                  <span className="text-[12px] font-bold text-muted">
                    until {formatUntilTime(new Date(Date.now() + opt.value * 3600 * 1000).toISOString())}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
