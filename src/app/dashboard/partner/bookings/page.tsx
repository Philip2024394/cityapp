'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AppNav from '@/components/layout/AppNav'
import PartnerBookingRow, { type Booking } from '@/components/partners/PartnerBookingRow'

// Partner bookings list — one route, one filter per visit.
// The four drawer entries (Pending / Overdue / Settled / All) all point
// here with ?status=<filter>. Keeping it one page means a single fetch
// pathway + the BookingRow component stays identical across views.

type Partner = {
  id: string
  slug: string
  name: string
  partner_type: string
  status: string
  commission_rate: number
  city: string | null
}

type StatusFilter = 'pending' | 'overdue' | 'settled' | 'all'
const VALID_FILTERS: ReadonlyArray<StatusFilter> = ['pending', 'overdue', 'settled', 'all']

const FILTER_TITLES: Record<StatusFilter, string> = {
  pending:  'Pending bookings',
  overdue:  'Overdue bookings',
  settled:  'Settled bookings',
  all:      'All bookings',
}

const FILTER_EMPTY: Record<StatusFilter, string> = {
  pending: 'No pending bookings — every commission is up to date.',
  overdue: 'No overdue bookings. Nice.',
  settled: 'No settled bookings yet — they appear here once a driver pays.',
  all:     'No bookings yet — share your QR code so guests can start booking.',
}

export default function PartnerBookingsPage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <PartnerBookingsInner />
    </Suspense>
  )
}

function PartnerBookingsInner() {
  const search = useSearchParams()
  const raw = (search?.get('status') || 'pending').toLowerCase()
  const filter: StatusFilter = (VALID_FILTERS as ReadonlyArray<string>).includes(raw)
    ? (raw as StatusFilter)
    : 'pending'

  const [partners, setPartners] = useState<Partner[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/partners/me/bookings', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { partners: Partner[]; bookings: Booking[] }
      setPartners(j.partners || [])
      setBookings(j.bookings || [])
    } catch {
      setErr('fetch_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  if (loading) {
    return (
      <Shell>
        <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto">
          <div className="h-6 bg-white/5 rounded w-1/3 mb-3 animate-pulse" />
          <div className="space-y-2">
            {[0,1,2,3].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </Shell>
    )
  }

  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 pb-24 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/partner/bookings" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }

  if (partners.length === 0) {
    return (
      <Shell>
        <div className="px-4 pt-20 pb-24 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Not a partner yet</h1>
          <Link href="/partners/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
            Register as partner
          </Link>
        </div>
      </Shell>
    )
  }

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true
    if (filter === 'pending') return b.status === 'pending'
    if (filter === 'settled') return b.status === 'settled'
    if (filter === 'overdue') return b.status === 'pending' && new Date(b.due_at) < new Date()
    return true
  })

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto">
        <Link href="/dashboard/partner" className="text-[12px] text-ink/60 hover:text-ink inline-block mb-3">
          ← Back to partner dashboard
        </Link>
        <h1 className="text-[24px] font-black mb-2">{FILTER_TITLES[filter]}</h1>
        <p className="text-[13px] text-ink/60 mb-5">
          {partners[0].name} · <span className="font-mono text-ink/40">{partners[0].slug}</span>
          <span className="text-ink/50"> · {filtered.length} {filtered.length === 1 ? 'booking' : 'bookings'}</span>
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/60 text-[13px] shadow-card">
            {FILTER_EMPTY[filter]}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => (
              <PartnerBookingRow key={b.id} booking={b} onAction={reload} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      <AppNav />
      {children}
    </main>
  )
}
