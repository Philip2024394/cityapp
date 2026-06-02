'use client'

// ============================================================================
// SnoozeCard — driver-initiated 48h self-snooze toggle
// ----------------------------------------------------------------------------
// Renders under the AvailabilitySwitcher on /dashboard/rider /dashboard/car
// etc. Tapping "Snooze 48h" posts to /api/drivers/me/snooze and drops the
// driver to the bottom of randomised listings for 48 hours. The countdown
// auto-clears once expired (the API treats past timestamps as null).
//
// LEGAL POSTURE (Permenhub PM 12/2019 + 118/2018):
//   This is a DRIVER-ONLY action — the platform never sets snoozed_until
//   in reaction to a customer tap or a missed booking. There are no
//   bookings on this platform; this is a self-managed availability
//   signal that the directory listing query respects. See
//   feedback_cityriders_no_dispatch_ever for the regulatory rationale.
//
// Visuals: matches AvailabilitySwitcher chrome — white card, dot beacon,
// 13px text floor, ≥44px tap targets.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'

type Props = {
  /** Initial snooze timestamp (ISO) if any. Parent should fetch from /api/drivers/me/snooze on mount. */
  initialSnoozedUntil?: string | null
  /** Hours to snooze. Default 48 — clamp [1, 168] is enforced server-side. */
  defaultHours?: number
}

function isFuture(iso: string | null): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  return Number.isFinite(t) && t > Date.now()
}

function formatRemaining(iso: string): string {
  const diff = Date.parse(iso) - Date.now()
  if (diff <= 0) return 'ending…'
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const mins = Math.floor((diff % (60 * 60 * 1000)) / 60_000)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remH = hours % 24
    return `${days}d ${remH}h left`
  }
  if (hours >= 1) return `${hours}h ${mins}m left`
  return `${mins}m left`
}

export default function SnoozeCard({ initialSnoozedUntil = null, defaultHours = 48 }: Props) {
  const [snoozedUntil, setSnoozedUntil] = useState<string | null>(initialSnoozedUntil)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const active = isFuture(snoozedUntil)

  // First-render sync — fetch the canonical state in case the parent
  // didn't pre-load it (the loader doesn't need to know about the snooze
  // column for the rest of the dashboard to work).
  useEffect(() => {
    if (initialSnoozedUntil !== null) return
    let cancelled = false
    fetch('/api/drivers/me/snooze', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return
        const v = (j.snoozed_until as string | null) ?? null
        if (v) setSnoozedUntil(v)
      })
      .catch(() => { /* swallow */ })
    return () => { cancelled = true }
  }, [initialSnoozedUntil])

  // Live countdown — tick once a minute while a snooze is active.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [active])

  // Auto-clear when the timestamp passes (visual only — DB row is harmless
  // until next listing query, which treats it as expired).
  useEffect(() => {
    if (!snoozedUntil) return
    const t = Date.parse(snoozedUntil)
    if (!Number.isFinite(t)) return
    const remaining = t - now
    if (remaining <= 0) setSnoozedUntil(null)
  }, [snoozedUntil, now])

  const snooze = useCallback(async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/drivers/me/snooze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: defaultHours }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Could not snooze')
      } else {
        setSnoozedUntil(json.snoozed_until ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not snooze')
    } finally {
      setPending(false)
    }
  }, [pending, defaultHours])

  const clear = useCallback(async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/drivers/me/snooze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Could not clear')
      } else {
        setSnoozedUntil(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear')
    } finally {
      setPending(false)
    }
  }, [pending])

  return (
    <section className="mb-4">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-black/55 px-1">
        SNOOZE
      </div>
      <p className="text-[11px] text-black/55 leading-snug mt-0.5 mb-2 px-1">
        {active
          ? 'You are at the bottom of the randomised cards. Your profile is still visible — scroll-deep.'
          : 'Off-duty for a day or two? Drop yourself to the bottom of the randomised cards for 48h. You can end it anytime.'}
      </p>

      <div
        className="w-full rounded-3xl flex items-center justify-between gap-3 px-4 py-3"
        style={{
          minHeight: 72,
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          opacity: pending ? 0.85 : 1,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative inline-flex items-center justify-center" aria-hidden>
            <span
              className="relative inline-flex w-3 h-3 rounded-full"
              style={{
                background: active ? '#A78BFA' : '#94A3B8',
                boxShadow: active ? '0 0 8px #A78BFA' : 'none',
              }}
            />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-black tracking-wide text-black truncate">
              {active ? 'SNOOZED' : 'AVAILABLE'}
            </div>
            {active && snoozedUntil ? (
              <div className="text-[11px] font-bold text-black/55 tabular-nums">
                {formatRemaining(snoozedUntil)}
              </div>
            ) : null}
          </div>
        </div>

        {active ? (
          <button
            type="button"
            disabled={pending}
            onClick={clear}
            className="shrink-0 inline-flex items-center justify-center px-4 rounded-2xl text-[13px] font-extrabold uppercase tracking-wider active:scale-[0.99] disabled:opacity-60"
            style={{
              minHeight: 44,
              background: '#0A0A0A',
              color: '#FACC15',
              border: '1px solid #0A0A0A',
            }}
          >
            {pending ? 'Ending…' : 'End snooze'}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={snooze}
            className="shrink-0 inline-flex items-center justify-center px-4 rounded-2xl text-[13px] font-extrabold uppercase tracking-wider active:scale-[0.99] disabled:opacity-60"
            style={{
              minHeight: 44,
              background: '#FACC15',
              color: '#0A0A0A',
              border: '1px solid #FACC15',
            }}
          >
            {pending ? 'Setting…' : `Snooze ${defaultHours}h`}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 text-[11px] font-bold text-red-700 leading-snug px-1">{error}</div>
      )}
    </section>
  )
}
