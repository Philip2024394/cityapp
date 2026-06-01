'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Handshake, Loader2, AlertTriangle, X } from 'lucide-react'

// Driver-side "Accept partner-referred bookings" toggle. Lives in
// /dashboard/{bike,car,bus,truck,jeep}/info between the existing profile
// fields. Mirrors the founder spec (2026-06-01 stricter flow):
//   • Default: opted_out  (driver must explicitly opt in)
//   • Suspended → toggle is locked until partner marks bookings settled
//   • Opting IN now opens a T&Cs modal first; the API rejects opt-in
//     unless `acceptedTerms: true` is in the PATCH body
//   • Commits 8% of published rate per confirmed booking, paid to the
//     partner within 48h (72h hard deactivation threshold)

type Status = 'eligible' | 'opted_out' | 'suspended'

type Response = {
  status: Status
  suspendedAt: string | null
  suspendedReason: string | null
}

export default function PartnerProgramSection() {
  const [status, setStatus] = useState<Status | null>(null)
  const [pending, setPending] = useState(false)
  const [suspendedReason, setSuspendedReason] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTerms, setShowTerms] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/drivers/me/partner-program', { cache: 'no-store' })
        if (!r.ok) return
        const j = (await r.json()) as Response
        setStatus(j.status)
        setSuspendedReason(j.suspendedReason)
      } catch { /* swallow — section just won't render */ }
    })()
  }, [])

  const commit = useCallback(async (optIn: boolean, acceptedTerms: boolean) => {
    setError(null)
    setPending(true)
    try {
      const r = await fetch('/api/drivers/me/partner-program', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ optIn, acceptedTerms }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j?.message || j?.error || 'Update failed')
        return
      }
      setStatus(j.status as Status)
      setShowTerms(false)
    } catch {
      setError('Network error')
    } finally {
      setPending(false)
    }
  }, [])

  const onCheckboxChange = useCallback((checked: boolean) => {
    if (checked) {
      // Intercept opt-IN → show T&Cs modal before flipping the row.
      setShowTerms(true)
      return
    }
    // Opt-OUT goes straight through (no T&Cs needed to leave).
    void commit(false, false)
  }, [commit])

  if (status === null) return null

  const isOptedIn   = status === 'eligible'
  const isSuspended = status === 'suspended'

  return (
    <>
      <section
        className="rounded-2xl border bg-white p-5 mt-4"
        style={{ borderColor: '#FACC15' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#FFFBEA', border: '1px solid #FACC15' }}
            aria-hidden
          >
            <Handshake className="w-5 h-5 text-[#0A0A0A]" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-extrabold leading-tight">
              CityDrivers Partner Program
            </h3>
            <p className="mt-1 text-[13px] text-black/65 leading-relaxed">
              Receive bookings from hotels, villas, and tour operators that
              display our QR. You pay the partner 8% of your published rate
              within 48 hours of each confirmed booking. 24-hour grace, then
              deactivation from the entire partner community.
            </p>
            <Link
              href="/cityriders/partner"
              className="mt-1.5 inline-flex text-[13px] font-bold text-[#A16207] hover:text-[#854D0E] underline underline-offset-2"
            >
              How the program works →
            </Link>
          </div>
        </div>

        {isSuspended ? (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 flex gap-2.5">
            <AlertTriangle className="shrink-0 w-4 h-4 text-red-600 mt-0.5" strokeWidth={2.5} />
            <div className="text-[13px] text-red-800 leading-relaxed">
              <strong>You are deactivated.</strong> {suspendedReason || 'Outstanding partner commissions overdue.'}
              <br />
              Every partner in the community is skipping you until you settle.
              When the partner marks you paid, you reactivate automatically.
            </div>
          </div>
        ) : (
          <label className="mt-4 flex items-start gap-3 cursor-pointer" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              checked={isOptedIn}
              disabled={pending}
              onChange={(e) => onCheckboxChange(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#FACC15]"
            />
            <span className="text-[13px] font-bold leading-snug">
              {pending && <Loader2 className="inline w-3.5 h-3.5 mr-1 animate-spin" />}
              Accept partner-referred bookings (8% commission per confirmed trip)
            </span>
          </label>
        )}

        {error && (
          <p className="mt-2 text-[13px] text-red-600 font-semibold">{error}</p>
        )}
      </section>

      {showTerms && (
        <PartnerTermsModal
          pending={pending}
          error={error}
          onCancel={() => { setShowTerms(false); setError(null) }}
          onConfirm={() => void commit(true, true)}
        />
      )}
    </>
  )
}

// ─── T&Cs modal ────────────────────────────────────────────────────────────

function PartnerTermsModal({
  pending, error, onCancel, onConfirm,
}: {
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-terms-title"
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-black/60 hover:bg-black/5"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>

        <div className="p-6 pt-7">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
            style={{ background: '#FFFBEA', border: '1px solid #FACC15' }}
          >
            <Handshake className="w-3.5 h-3.5 text-[#0A0A0A]" strokeWidth={2.5} />
            <span className="text-[13px] font-extrabold uppercase tracking-wider">
              Partner Program
            </span>
          </div>

          <h2 id="partner-terms-title" className="text-[22px] font-black leading-tight">
            Partner Program — Community Promise
          </h2>
          <p className="mt-2 text-[13px] text-black/60 leading-relaxed">
            Read carefully before you opt in. These are the rules every driver
            and every partner in our community agrees to.
          </p>

          <ol className="mt-5 space-y-4 text-[13px] text-black/85 leading-relaxed">
            <Rule n={1} title="Payment due every 48 hours">
              After each booking from a partner QR, you owe 8% of the fare.
              You have 48 hours to pay the partner directly — WhatsApp, cash,
              transfer, QRIS — whatever you arrange together.
            </Rule>
            <Rule n={2} title="24-hour warning">
              If you have not paid 48 hours after the booking, a warning
              banner appears on your dashboard. You get 1 more day to settle
              up. We will remind you, every page, every visit.
            </Rule>
            <Rule n={3} title="After 72 hours total — you are deactivated">
              <ul className="mt-2 space-y-1.5 list-disc pl-5 text-[13px]">
                <li>No hotel will refer guests to you.</li>
                <li>No villa will refer guests to you.</li>
                <li>No gym, tour guide, restaurant, marketing partner, or street guide will refer guests to you.</li>
                <li><strong>Every partner in our community skips you</strong> until you settle every overdue payment.</li>
                <li>Your ranking in the directory may drop.</li>
              </ul>
            </Rule>
            <Rule n={4} title="Auto-reactivation">
              The moment you pay every overdue invoice and the partner marks
              you settled, you are back in. No appeal needed, no waiting list.
            </Rule>
            <Rule n={5} title="This is a community promise">
              Partners trust drivers to pay on time. Failure to respect that
              promise is not acceptable. Every member of the partner
              community — from street tour guides to villa concierges — has
              a position. We protect each other.
            </Rule>
          </ol>

          <label
            className="mt-6 flex items-start gap-3 rounded-xl border border-[#FACC15] bg-[#FFFBEA] p-3 cursor-pointer"
            style={{ minHeight: 44 }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#FACC15]"
            />
            <span className="text-[13px] font-bold leading-snug text-[#0A0A0A]">
              I have read and agree to the Partner Program terms.
            </span>
          </label>

          {error && (
            <p className="mt-3 text-[13px] text-red-600 font-semibold">{error}</p>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 inline-flex items-center justify-center rounded-2xl bg-white border border-black/15 text-[#0A0A0A] text-[14px] font-extrabold active:scale-[0.98] transition disabled:opacity-60"
              style={{ minHeight: 48 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!agreed || pending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.98] transition disabled:opacity-50 disabled:shadow-none"
              style={{ minHeight: 48 }}
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Agree &amp; opt in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Rule({
  n, title, children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-extrabold"
        style={{ background: '#FACC15', color: '#0A0A0A' }}
      >
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[14px] text-[#0A0A0A] leading-snug">
          {title}
        </div>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  )
}
