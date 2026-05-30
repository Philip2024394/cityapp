'use client'
// ============================================================================
// AvailabilitySwitcher — first-screen centerpiece on the car + rider home
// ----------------------------------------------------------------------------
// Three-state availability switch (online / busy / offline) shared between
// /dashboard/car and /dashboard/rider. The current state renders as a large
// 80-96px pill at the top; the two other states sit beneath as ~56px
// secondary buttons in a 2-col grid.
//
// Safety gating: switching FROM online → busy or online → offline requires
// a 3-second press-and-hold, with a yellow progress ring growing around the
// button. Release before completion cancels + resets. This prevents drivers
// from accidentally tapping themselves out of marketplace visibility mid-
// ride. All other transitions (offline ↔ busy, etc.) fire immediately.
//
// Data layer: posts to POST /api/drivers/availability — same endpoint the
// rider-side GoOnlineToggle uses. The API also flips session_started_at
// across the online↔offline edge, so we don't need to manage that here.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'

export type Availability = 'online' | 'busy' | 'offline'

type Props = {
  value:    Availability
  onChange: (next: Availability) => void
}

type StateStyle = {
  label:    string
  bg:       string
  text:     string
  dot:      string
  ringHex:  string
}

// Containers stay neutral; only the dot signals state (matches founder's
// "remove color from containers, use the dot as the beacon" direction).
// Online's dot has a continuous satellite ping; during a 3-second hold on
// any target, that target's dot pings too as the live-confirmation signal.
const STATES: Record<Availability, StateStyle> = {
  online:  { label: 'ONLINE',  bg: '#FFFFFF', text: '#0A0A0A', dot: '#16A34A', ringHex: '#16A34A' },
  busy:    { label: 'BUSY',    bg: '#FFFFFF', text: '#0A0A0A', dot: '#F97316', ringHex: '#F97316' },
  offline: { label: 'OFFLINE', bg: '#FFFFFF', text: '#0A0A0A', dot: '#B91C1C', ringHex: '#B91C1C' },
}

const HOLD_MS = 3000

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch { /* ignore */ }
  }
}

async function postAvailability(state: Availability): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch('/api/drivers/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: state }),
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export default function AvailabilitySwitcher({ value, onChange }: Props) {
  const [optimistic, setOptimistic] = useState<Availability>(value)
  const [pending,    setPending]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  // 0–1 fill of the hold-to-confirm ring. Bound to the currently-held button.
  const [holdProgress, setHoldProgress] = useState(0)
  const [holdingTarget, setHoldingTarget] = useState<Availability | null>(null)

  const rafRef     = useRef<number | null>(null)
  const startedRef = useRef<number>(0)

  // Keep optimistic in sync if the parent reloads with a new value.
  useEffect(() => { setOptimistic(value) }, [value])

  const active = optimistic
  const otherStates: Availability[] =
    active === 'online'  ? ['busy', 'offline'] :
    active === 'busy'    ? ['online', 'offline'] :
                           ['online', 'busy']

  const cancelHold = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setHoldProgress(0)
    setHoldingTarget(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => cancelHold(), [cancelHold])

  const commit = useCallback(async (next: Availability) => {
    if (pending || next === active) return
    setPending(true)
    setError(null)
    // Optimistic flip
    const prev = active
    setOptimistic(next)
    onChange(next)
    const ok = await postAvailability(next)
    setPending(false)
    if (!ok) {
      // Rollback
      setOptimistic(prev)
      onChange(prev)
      setError('Tidak bisa sinkron. Coba lagi.')
      vibrate(20)
    }
  }, [active, onChange, pending])

  // The two transitions that require a 3s hold (safety gates).
  function isHoldRequired(from: Availability, to: Availability): boolean {
    return from === 'online' && (to === 'busy' || to === 'offline')
  }

  function tickHold(target: Availability) {
    if (rafRef.current === null) return
    const now = performance.now()
    const elapsed = now - startedRef.current
    const p = Math.min(1, elapsed / HOLD_MS)
    setHoldProgress(p)
    if (p >= 1) {
      // Completed — fire haptic + commit
      rafRef.current = null
      setHoldingTarget(null)
      setHoldProgress(0)
      vibrate([60, 30, 60])
      void commit(target)
      return
    }
    rafRef.current = requestAnimationFrame(() => tickHold(target))
  }

  function onPointerDownState(target: Availability, e: React.PointerEvent<HTMLButtonElement>) {
    if (pending) return
    if (target === active) return
    if (!isHoldRequired(active, target)) return
    // Capture so pointer-leave still fires onPointerCancel-equivalents cleanly.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    setHoldingTarget(target)
    setHoldProgress(0)
    startedRef.current = performance.now()
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => tickHold(target))
  }

  function onPointerEndState(target: Availability) {
    if (holdingTarget === target && holdProgress < 1) {
      // Released early
      cancelHold()
      vibrate(20)
    }
  }

  function onTapNonHold(target: Availability) {
    if (pending) return
    if (target === active) return
    if (isHoldRequired(active, target)) return
    void commit(target)
  }

  return (
    <section className="mb-4">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-black/55 px-1">
        AVAILABILITY
      </div>
      <p className="text-[11px] text-black/55 leading-snug mt-0.5 mb-2 px-1">
        Tap to switch. Customers see this on your public profile.
      </p>

      {/* BIG active pill — full-width, 80-96px tall */}
      <BigPill state={active} pending={pending} />

      {/* Two secondary buttons */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {otherStates.map((target) => {
          const requiresHold = isHoldRequired(active, target)
          const isHolding = holdingTarget === target
          return (
            <SmallPill
              key={target}
              target={target}
              requiresHold={requiresHold}
              isHolding={isHolding}
              holdProgress={isHolding ? holdProgress : 0}
              disabled={pending}
              onPointerDown={(e) => onPointerDownState(target, e)}
              onPointerUp={() => onPointerEndState(target)}
              onPointerLeave={() => onPointerEndState(target)}
              onPointerCancel={() => onPointerEndState(target)}
              onClick={() => onTapNonHold(target)}
            />
          )
        })}
      </div>

      {error && (
        <div className="mt-2 text-[11px] font-bold text-red-700 leading-snug px-1">{error}</div>
      )}
    </section>
  )
}

// ─── Visual building blocks ─────────────────────────────────────────────

function BigPill({ state, pending }: { state: Availability; pending: boolean }) {
  const s = STATES[state]
  const isOnline = state === 'online'
  return (
    <div
      className="relative w-full rounded-3xl flex items-center justify-center gap-3 transition"
      style={{
        minHeight: 88,
        background: '#FFFFFF',
        color: s.text,
        border: '1px solid #E4E4E7',
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
        opacity: pending ? 0.85 : 1,
      }}
      aria-live="polite"
      aria-label={`Current availability: ${s.label}`}
    >
      {/* Dot with satellite ping. Only the ONLINE state pings continuously
          (signals "live, broadcasting"). Busy + offline render a still dot. */}
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        {isOnline && (
          <span
            className="absolute inline-flex h-3.5 w-3.5 rounded-full opacity-75 animate-ping"
            style={{ background: s.dot }}
          />
        )}
        <span
          className="relative inline-flex w-3.5 h-3.5 rounded-full"
          style={{
            background: s.dot,
            boxShadow: isOnline ? `0 0 10px ${s.dot}` : 'none',
          }}
        />
      </span>
      <span className="text-[20px] font-black tracking-wider tabular-nums">{s.label}</span>
    </div>
  )
}

function SmallPill({
  target, requiresHold, isHolding, holdProgress, disabled,
  onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onClick,
}: {
  target:        Availability
  requiresHold:  boolean
  isHolding:     boolean
  holdProgress:  number
  disabled:      boolean
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp:   () => void
  onPointerLeave:() => void
  onPointerCancel:() => void
  onClick:       () => void
}) {
  const s = STATES[target]
  // Green tick mark draws in during the 3-second hold as the live progress
  // signal. The pinging dot + the tick path animating in together replace
  // the previous yellow border progress ring.
  const tickPathLength = 24
  const tickDashOffset = tickPathLength * (1 - holdProgress)

  const secondaryLabel = requiresHold
    ? (isHolding ? 'KEEP HOLDING…' : 'HOLD 3s')
    : null

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      className="relative w-full rounded-2xl flex flex-col items-center justify-center gap-0.5 transition active:scale-[0.99] disabled:opacity-60"
      style={{
        minHeight: 60,
        background: '#FFFFFF',
        color: s.text,
        border: '1.5px solid #E4E4E7',
      }}
      aria-label={`Switch to ${s.label}${requiresHold ? ', hold to confirm' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {/* Dot — pings during a 3-second hold as live confirmation. */}
        <span className="relative inline-flex items-center justify-center" aria-hidden>
          {isHolding && (
            <span
              className="absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping"
              style={{ background: s.dot }}
            />
          )}
          <span
            className="relative inline-flex w-2.5 h-2.5 rounded-full"
            style={{
              background: s.dot,
              boxShadow: isHolding ? `0 0 8px ${s.dot}` : 'none',
            }}
          />
        </span>
        <span className="text-[13px] font-black tracking-wider">{s.label}</span>
        {/* Green tick — draws in as the hold completes. Replaces the
            previous yellow border progress ring. */}
        {isHolding && (
          <svg
            viewBox="0 0 16 16"
            className="ml-0.5 w-3.5 h-3.5"
            aria-hidden
          >
            <path
              d="M3 8 L7 12 L13 5"
              fill="none"
              stroke="#16A34A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={tickPathLength}
              strokeDashoffset={tickDashOffset}
              style={{ transition: 'stroke-dashoffset 60ms linear' }}
            />
          </svg>
        )}
      </div>
      {secondaryLabel && (
        <span
          className="text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: isHolding ? '#16A34A' : 'rgba(10,10,10,0.45)' }}
        >
          {secondaryLabel}
        </span>
      )}
    </button>
  )
}
