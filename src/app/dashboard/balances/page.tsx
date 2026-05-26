'use client'
import { useEffect, useState } from 'react'

// Driver-side view: what you owe to each partner from attributed bookings.
// Settlement happens OUTSIDE IndoCity (cash / GoPay / transfer). When
// the partner marks paid, the row disappears from here. If you don't pay
// within 7 days you get suspended from the partner program.

type Balance = {
  partner_id: string
  partner_name: string
  partner_slug: string
  contact_whatsapp: string | null
  contact_phone: string | null
  outstanding_idr: number
  bookings_count: number
  oldest_due_at: string | null
  is_overdue: boolean
}

type Booking = {
  id: string
  partner_id: string
  partner_name: string
  pickup_name: string | null
  dropoff_name: string | null
  fare_idr: number
  commission_idr: number
  status: 'pending' | 'settled' | 'disputed' | 'waived'
  created_at: string
  due_at: string
}

type Program = {
  partner_program_status: 'eligible' | 'suspended' | 'opted_out'
  partner_suspended_at?: string | null
  partner_suspended_reason?: string | null
}

export default function DriverBalancesPage() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/drivers/me/partner-balances', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) { setErr('not_signed_in'); return null }
        return r.json()
      })
      .then((j: { balances: Balance[]; bookings: Booking[]; program: Program } | null) => {
        if (!j) return
        setBalances(j.balances || [])
        setBookings(j.bookings || [])
        setProgram(j.program || null)
      })
      .catch(() => setErr('fetch_failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Shell><div className="px-4 pt-6"><div className="h-6 w-1/3 bg-white/5 rounded animate-pulse" /></div></Shell>
  if (err === 'not_signed_in') return <Shell><div className="p-6 text-center text-ink/60 text-[13px]">Sign in to view balances.</div></Shell>

  const totalOwed = balances.reduce((s, b) => s + b.outstanding_idr, 0)
  const suspended = program?.partner_program_status === 'suspended'

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
        <h1 className="text-[24px] font-black mb-1">Partner balances</h1>
        <p className="text-[13px] text-ink/60 mb-6">
          What you owe to hotel/villa partners for guests they sent you.
        </p>

        {suspended && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 mb-6">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-red-300 mb-1">
              Partner program suspended
            </div>
            <p className="text-[13px] text-ink/80 mb-2">
              {program?.partner_suspended_reason ?? 'Outstanding commissions overdue.'}
            </p>
            <p className="text-[11px] text-ink/60">
              Settle all overdue balances with the partners below. Your account auto-reactivates when the last overdue row is marked paid.
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-brand/15 border border-brand/30 p-4 mb-6">
          <div className="text-[10px] uppercase tracking-wider font-bold text-ink/60 mb-1">
            Total outstanding
          </div>
          <div className="text-[28px] font-black text-brand">
            Rp {totalOwed.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-ink/60 mt-1">
            across {balances.length} partner{balances.length === 1 ? '' : 's'}
          </div>
        </div>

        {balances.length === 0 ? (
          <div className="text-center py-12 text-ink/40 text-[13px]">
            No outstanding partner commissions. You're all clear.
          </div>
        ) : (
          <section className="space-y-3 mb-8">
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-ink/60">By partner</h2>
            {balances.map((b) => (
              <PartnerBalanceRow key={b.partner_id} balance={b} />
            ))}
          </section>
        )}

        {bookings.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-ink/60 mb-3">
              Recent bookings
            </h2>
            {bookings.slice(0, 30).map((b) => (
              <div key={b.id} className="rounded-xl bg-white/[0.03] border border-ink/10 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-ink truncate">{b.partner_name}</div>
                  <div className="text-[10px] text-ink/40 truncate">
                    {new Date(b.created_at).toLocaleDateString('id-ID')} · {b.pickup_name ?? '—'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-[13px] font-extrabold ${b.status === 'settled' ? 'text-green-400' : b.status === 'pending' ? 'text-brand' : 'text-ink/50'}`}>
                    Rp {b.commission_idr.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-ink/40">{b.status}</div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </Shell>
  )
}

function PartnerBalanceRow({ balance: b }: { balance: Balance }) {
  const waLink = b.contact_whatsapp
    ? `https://wa.me/${b.contact_whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Halo, saya driver IndoCity. Saya akan transfer komisi Rp ${b.outstanding_idr.toLocaleString('id-ID')} (${b.bookings_count} booking) hari ini. Mohon konfirmasi nomor rekening / GoPay.`
      )}`
    : null

  return (
    <div className={`rounded-xl p-4 border ${b.is_overdue ? 'border-red-500/40 bg-red-500/5' : 'border-ink/10 bg-white/[0.03]'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-[14px] text-ink">{b.partner_name}</div>
          <div className="text-[11px] text-ink/50 mt-0.5">
            {b.bookings_count} booking{b.bookings_count === 1 ? '' : 's'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-black text-[18px] text-brand">
            Rp {b.outstanding_idr.toLocaleString('id-ID')}
          </div>
          {b.oldest_due_at && (
            <div className={`text-[10px] mt-0.5 ${b.is_overdue ? 'text-red-400' : 'text-ink/40'}`}>
              {b.is_overdue ? 'OVERDUE' : `due ${new Date(b.oldest_due_at).toLocaleDateString('id-ID')}`}
            </div>
          )}
        </div>
      </div>
      {waLink && (
        <a href={waLink} target="_blank" rel="noopener"
          className="block w-full text-center rounded-full bg-brand text-bg px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider mt-2"
        >
          Settle via WhatsApp
        </a>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-bg text-ink">{children}</main>
}
