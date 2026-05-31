'use client'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import {
  FOUNDER_COHORT_CAP,
  MONTHLY_PRICE_LABEL,
} from '@/lib/pricing/constants'

// Founder cohort counter — drop-in marketing widget.
//
// Renders "X of 1000 founder slots remaining · Rp 38.000/month for life"
// with a yellow accent. Hits /api/founder-cohort once on mount; falls
// back to a neutral "Founder pricing — Rp 38.000/month for life" line
// when the count is unavailable (so the page never reads broken).
//
// Use on: driver landing (/drivers), driver signup pages, the CityDrivers
// homepage above-the-fold, and any "join now" surface where urgency
// matters.

type Variant = 'banner' | 'pill' | 'compact'

export default function FounderCohortCounter({
  variant = 'banner',
  className,
}: {
  variant?: Variant
  className?: string
}) {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/founder-cohort', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { remaining: number | null; cap: number } | null) => {
        if (cancelled) return
        setRemaining(j?.remaining ?? null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  // Once the cap is reached, the counter politely retires itself.
  if (loaded && remaining === 0) return null

  const remainingLabel = remaining != null
    ? `${remaining.toLocaleString('id-ID')} of ${FOUNDER_COHORT_CAP.toLocaleString('id-ID')}`
    : null

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold ${className ?? ''}`}
        style={{
          background: '#FFFBEA',
          color: '#0A0A0A',
          border: '1px solid rgba(250,204,21,0.55)',
        }}
      >
        <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#EAB308' }} />
        {remainingLabel
          ? <>{remainingLabel} founder slots left · {MONTHLY_PRICE_LABEL}/bulan</>
          : <>Founder · {MONTHLY_PRICE_LABEL}/bulan seumur hidup</>}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`text-[12px] font-bold text-black/70 ${className ?? ''}`}>
        {remainingLabel
          ? <>
              <span style={{ color: '#EAB308' }} className="font-black">{remainingLabel}</span>
              {' '}founder slots left · {MONTHLY_PRICE_LABEL}/bulan seumur hidup
            </>
          : <>Founder pricing · {MONTHLY_PRICE_LABEL}/bulan seumur hidup</>}
      </div>
    )
  }

  // Default — banner. The dominant marketing call-out.
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${className ?? ''}`}
      style={{
        background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
        boxShadow: '0 4px 16px rgba(250,204,21,0.35)',
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(10,10,10,0.10)' }}
      >
        <Sparkles className="w-4.5 h-4.5" strokeWidth={2.5} style={{ color: '#0A0A0A' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-black/65">
          Founder cohort — pricing locked for life
        </div>
        <div className="text-[14px] font-black text-black leading-tight mt-0.5">
          {remainingLabel
            ? <>{remainingLabel} slots left · {MONTHLY_PRICE_LABEL}/bulan</>
            : <>First {FOUNDER_COHORT_CAP.toLocaleString('id-ID')} drivers · {MONTHLY_PRICE_LABEL}/bulan</>}
        </div>
      </div>
    </div>
  )
}
