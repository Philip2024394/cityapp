'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Handshake, Loader2, AlertTriangle } from 'lucide-react'

// Driver-side "Accept partner-referred bookings" toggle. Lives in
// /dashboard/{bike,car,bus,truck}/info between the existing profile
// fields. Mirrors the founder spec:
//   • Default: opted_out  (driver must explicitly opt in)
//   • Suspended → toggle is locked until partner marks bookings settled
//   • Opt-in commits 8% of published rate per confirmed booking, paid
//     to the partner within 48 hours

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

  const toggle = useCallback(async (optIn: boolean) => {
    setError(null)
    setPending(true)
    try {
      const r = await fetch('/api/drivers/me/partner-program', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ optIn }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j?.message || j?.error || 'Update failed')
        return
      }
      setStatus(j.status as Status)
    } catch {
      setError('Network error')
    } finally {
      setPending(false)
    }
  }, [])

  if (status === null) return null

  const isOptedIn   = status === 'eligible'
  const isSuspended = status === 'suspended'

  return (
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
          <p className="mt-1 text-[12.5px] text-black/65 leading-relaxed">
            Receive bookings from hotels, villas, and tour operators that
            display our QR. You pay the partner 8% of your published rate
            within 48 hours of each confirmed booking.
          </p>
          <Link
            href="/cityriders/partner"
            className="mt-1.5 inline-flex text-[11.5px] font-bold text-[#A16207] hover:text-[#854D0E] underline underline-offset-2"
          >
            How the program works →
          </Link>
        </div>
      </div>

      {isSuspended ? (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 flex gap-2.5">
          <AlertTriangle className="shrink-0 w-4 h-4 text-red-600 mt-0.5" strokeWidth={2.5} />
          <div className="text-[12.5px] text-red-800 leading-relaxed">
            <strong>You are suspended.</strong> {suspendedReason || 'Outstanding partner commissions overdue.'}
            <br />
            Settle with the partner; they will mark you paid and you&apos;ll
            reactivate automatically.
          </div>
        </div>
      ) : (
        <label className="mt-4 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isOptedIn}
            disabled={pending}
            onChange={(e) => void toggle(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-[#FACC15]"
          />
          <span className="text-[13px] font-bold leading-snug">
            {pending && <Loader2 className="inline w-3.5 h-3.5 mr-1 animate-spin" />}
            Accept partner-referred bookings (8% commission per confirmed trip)
          </span>
        </label>
      )}

      {error && (
        <p className="mt-2 text-[12px] text-red-600 font-semibold">{error}</p>
      )}
    </section>
  )
}
