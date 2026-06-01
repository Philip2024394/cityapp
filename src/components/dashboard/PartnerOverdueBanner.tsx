'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, Clock } from 'lucide-react'

// PartnerOverdueBanner
// ────────────────────────────────────────────────────────────────────────────
// Sticky strip mounted ABOVE every driver-dashboard page (car/rider/truck/
// bus/jeep layouts). Two states:
//
//   • SUSPENDED → red banner: "Partner Program Deactivated — every partner in
//     the community is skipping you. Pay all overdue invoices to reactivate."
//
//   • ELIGIBLE with at least one partner_booking row where
//     due_at < now() < due_at + 24h → yellow countdown banner. Counts down to
//     the soonest deactivate_at (= oldest_due_at + 24h) so the driver sees
//     exactly how many hours/minutes remain.
//
// On first dashboard load per session a one-time sterner popup modal fires
// repeating the consequences list. Tracked via sessionStorage key
// `partner-overdue-popup-shown` so the user doesn't get nagged on every
// route change in the same session.
//
// Data source: /api/drivers/me/partner-balances (already returns
// program status + bookings list with due_at).

type Booking = {
  id: string
  due_at: string
  status: string
}

type Program = {
  partner_program_status: 'eligible' | 'opted_out' | 'suspended'
}

type Balances = {
  bookings: Booking[]
  program: Program | null
}

type Mode = 'idle' | 'suspended' | 'overdue-warning'

const POPUP_KEY = 'partner-overdue-popup-shown'

export default function PartnerOverdueBanner() {
  const [data, setData] = useState<Balances | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const [popupOpen, setPopupOpen] = useState(false)
  const [dismissedSession, setDismissedSession] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await fetch('/api/drivers/me/partner-balances', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json() as Balances
        if (!cancelled) setData(j)
      } catch { /* swallow — non-critical chrome */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Tick once a minute so the countdown stays fresh.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const { mode, deactivateAtMs } = useMemo<{
    mode: Mode; deactivateAtMs: number | null
  }>(() => {
    if (!data) return { mode: 'idle', deactivateAtMs: null }
    if (data.program?.partner_program_status === 'suspended') {
      return { mode: 'suspended', deactivateAtMs: null }
    }
    if (data.program?.partner_program_status !== 'eligible') {
      return { mode: 'idle', deactivateAtMs: null }
    }
    // Find the soonest deactivate_at among pending bookings that are already
    // past due_at but not yet past due_at + 24h.
    let soonest: number | null = null
    for (const b of data.bookings) {
      if (b.status !== 'pending') continue
      const due = new Date(b.due_at).getTime()
      if (Number.isNaN(due)) continue
      const deactivateAt = due + 24 * 60 * 60 * 1000
      if (due < now && now < deactivateAt) {
        if (soonest === null || deactivateAt < soonest) soonest = deactivateAt
      }
    }
    if (soonest === null) return { mode: 'idle', deactivateAtMs: null }
    return { mode: 'overdue-warning', deactivateAtMs: soonest }
  }, [data, now])

  // Fire the one-time popup on first load if either banner state is active.
  useEffect(() => {
    if (mode === 'idle') return
    try {
      const shown = window.sessionStorage.getItem(POPUP_KEY)
      if (shown === '1') return
      window.sessionStorage.setItem(POPUP_KEY, '1')
      setPopupOpen(true)
    } catch { /* sessionStorage disabled — just skip the popup */ }
  }, [mode])

  if (mode === 'idle' || dismissedSession) return null

  return (
    <>
      {mode === 'suspended' ? (
        <SuspendedBanner />
      ) : (
        <OverdueBanner deactivateAtMs={deactivateAtMs!} now={now} />
      )}
      {popupOpen && (
        <ConsequencesPopup
          mode={mode}
          deactivateAtMs={deactivateAtMs}
          now={now}
          onClose={() => { setPopupOpen(false); setDismissedSession(false) }}
        />
      )}
    </>
  )
}

// ─── Banners ───────────────────────────────────────────────────────────────

function SuspendedBanner() {
  return (
    <div
      role="alert"
      className="w-full border-b"
      style={{ background: '#FEE2E2', borderColor: '#FCA5A5' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-start gap-3">
        <AlertTriangle
          className="shrink-0 w-5 h-5 mt-0.5"
          style={{ color: '#DC2626' }}
          strokeWidth={2.5}
          aria-hidden
        />
        <div className="flex-1 min-w-0 text-[13px] leading-snug text-[#7F1D1D]">
          <strong className="font-extrabold">Partner Program Deactivated</strong>
          {' — '}every partner in the community is skipping you. Pay all overdue
          invoices to reactivate.{' '}
          <Link
            href="/dashboard/balances"
            className="font-extrabold underline underline-offset-2 whitespace-nowrap"
            style={{ color: '#991B1B' }}
          >
            View balances →
          </Link>
        </div>
      </div>
    </div>
  )
}

function OverdueBanner({ deactivateAtMs, now }: { deactivateAtMs: number; now: number }) {
  const remainingMs = Math.max(0, deactivateAtMs - now)
  const remainingHours   = Math.floor(remainingMs / (60 * 60 * 1000))
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
  return (
    <div
      role="alert"
      className="w-full border-b"
      style={{ background: '#FFFBEA', borderColor: '#FACC15' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-start gap-3">
        <Clock
          className="shrink-0 w-5 h-5 mt-0.5"
          style={{ color: '#A16207' }}
          strokeWidth={2.5}
          aria-hidden
        />
        <div className="flex-1 min-w-0 text-[13px] leading-snug" style={{ color: '#713F12' }}>
          <strong className="font-extrabold">Partner payment overdue.</strong>{' '}
          Deactivation in{' '}
          <span className="font-extrabold whitespace-nowrap">
            {remainingHours}h {remainingMinutes}m
          </span>
          . Pay now to keep your spot in the community.{' '}
          <Link
            href="/dashboard/balances"
            className="font-extrabold underline underline-offset-2 whitespace-nowrap"
            style={{ color: '#854D0E' }}
          >
            View balances →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── One-time-per-session sterner popup ────────────────────────────────────

function ConsequencesPopup({
  mode, deactivateAtMs, now, onClose,
}: {
  mode: Mode
  deactivateAtMs: number | null
  now: number
  onClose: () => void
}) {
  const isSuspended = mode === 'suspended'
  const remainingMs = deactivateAtMs ? Math.max(0, deactivateAtMs - now) : 0
  const remainingHours   = Math.floor(remainingMs / (60 * 60 * 1000))
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))

  const accent      = isSuspended ? '#DC2626' : '#A16207'
  const accentBg    = isSuspended ? '#FEE2E2' : '#FFFBEA'
  const accentBorder = isSuspended ? '#FCA5A5' : '#FACC15'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-overdue-popup-title"
      className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-black/60 hover:bg-black/5"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>

        <div className="p-6 pt-7">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
            style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accent }}
          >
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-[13px] font-extrabold uppercase tracking-wider">
              {isSuspended ? 'Deactivated' : 'Action required'}
            </span>
          </div>

          <h2
            id="partner-overdue-popup-title"
            className="text-[22px] font-black leading-tight"
          >
            {isSuspended
              ? 'You are deactivated from the partner community.'
              : 'You are overdue. Deactivation is hours away.'}
          </h2>

          {!isSuspended && deactivateAtMs && (
            <p className="mt-2 text-[13px] font-bold" style={{ color: accent }}>
              Time remaining: {remainingHours}h {remainingMinutes}m
            </p>
          )}

          <p className="mt-3 text-[13px] text-black/70 leading-relaxed">
            {isSuspended
              ? 'Until you settle every overdue invoice, you are skipped by every partner in the CityDrivers community.'
              : 'If you do not settle every overdue invoice in time, you will be deactivated. Once deactivated:'}
          </p>

          <ul className="mt-4 space-y-1.5 text-[13px] text-black/85 leading-relaxed list-disc pl-5">
            <li>No hotel will refer guests to you.</li>
            <li>No villa will refer guests to you.</li>
            <li>No gym, tour guide, restaurant, marketing partner, or street guide will refer guests to you.</li>
            <li><strong>Every partner in our community skips you</strong> until you settle every overdue payment.</li>
            <li>Your ranking in the directory may drop.</li>
          </ul>

          <p className="mt-4 text-[13px] text-black/70 leading-relaxed">
            The moment you pay every overdue invoice and the partner marks you
            settled, you are back in. No appeal needed.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center rounded-2xl bg-white border border-black/15 text-[#0A0A0A] text-[14px] font-extrabold active:scale-[0.98] transition"
              style={{ minHeight: 48 }}
            >
              Got it
            </button>
            <Link
              href="/dashboard/balances"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center rounded-2xl text-[14px] font-extrabold active:scale-[0.98] transition"
              style={{
                minHeight:    48,
                background:   isSuspended ? '#DC2626' : '#FACC15',
                color:        isSuspended ? '#FFFFFF' : '#0A0A0A',
                boxShadow:    isSuspended
                  ? '0 8px 24px rgba(220,38,38,0.45)'
                  : '0 8px 24px rgba(250,204,21,0.45)',
              }}
            >
              View balances →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
