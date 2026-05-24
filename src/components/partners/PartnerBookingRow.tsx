'use client'
import { useState } from 'react'

// Single row in the partner bookings list. Extracted so the main
// /dashboard/partner page and the per-filter /dashboard/partner/bookings
// pages share the same UI + settlement actions.

export type Booking = {
  id: string
  partner_id: string
  pickup_name: string | null
  dropoff_name: string | null
  fare_idr: number
  commission_idr: number
  status: 'pending' | 'settled' | 'disputed' | 'waived'
  created_at: string
  due_at: string
  driver: { business_name: string; slug: string; whatsapp_e164: string } | null
}

export default function PartnerBookingRow({
  booking: b, onAction,
}: { booking: Booking; onAction: () => void }) {
  const [busy, setBusy] = useState(false)
  const overdue = b.status === 'pending' && new Date(b.due_at) < new Date()
  const dueIn = (() => {
    const ms = new Date(b.due_at).getTime() - Date.now()
    if (ms < 0) return `${Math.ceil(-ms / (24 * 3600_000))}d overdue`
    return `due in ${Math.ceil(ms / (24 * 3600_000))}d`
  })()

  async function act(action: 'settled' | 'disputed' | 'waived') {
    if (busy) return
    const reason = action === 'disputed' ? (window.prompt('Reason for dispute?') || '') : ''
    setBusy(true)
    try {
      const r = await fetch('/api/partners/me/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, action, reason }),
      })
      if (r.ok) onAction()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`rounded-xl p-3 border ${
      overdue ? 'border-red-500/40 bg-black/85'
      : b.status === 'settled' ? 'border-green-500/40 bg-black/85'
      : 'border-white/10 bg-black/85'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[13px] text-ink truncate">
            {b.driver?.business_name ?? 'Unknown driver'}
          </div>
          <div className="text-[11px] text-ink/60 mt-0.5 truncate">
            {b.pickup_name ?? '—'} → {b.dropoff_name ?? '—'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-extrabold text-[14px] text-brand">
            Rp {b.commission_idr.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-ink/50">of Rp {b.fare_idr.toLocaleString('id-ID')}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-wider font-bold">
          <StatusPill status={b.status} overdue={overdue} dueLabel={dueIn} />
        </div>
        {b.status === 'pending' && (
          <div className="flex gap-1.5">
            <button
              onClick={() => act('settled')}
              disabled={busy}
              className="bg-brand text-bg rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider hover:brightness-105 disabled:opacity-50"
            >
              Mark paid
            </button>
            <button
              onClick={() => act('disputed')}
              disabled={busy}
              className="bg-white/5 text-ink/70 border border-ink/15 rounded-full px-3 py-1 text-[10px] font-bold hover:bg-white/10 disabled:opacity-50"
            >
              Dispute
            </button>
          </div>
        )}
      </div>

      {b.driver?.whatsapp_e164 && b.status === 'pending' && (
        <a
          href={`https://wa.me/${b.driver.whatsapp_e164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
            `Halo! Booking dari ${new Date(b.created_at).toLocaleDateString('id-ID')} — komisi mitra Rp ${b.commission_idr.toLocaleString('id-ID')} sudah jatuh tempo. Mohon segera transfer ya.`
          )}`}
          target="_blank" rel="noopener"
          className="block text-[10px] text-brand mt-2 hover:underline"
        >
          → Tagih via WhatsApp
        </a>
      )}
    </div>
  )
}

function StatusPill({ status, overdue, dueLabel }: { status: string; overdue: boolean; dueLabel: string }) {
  if (status === 'settled')   return <span className="text-green-400">Settled</span>
  if (status === 'disputed')  return <span className="text-orange-400">Disputed</span>
  if (status === 'waived')    return <span className="text-ink/50">Waived</span>
  if (overdue)                return <span className="text-red-400">{dueLabel}</span>
  return <span className="text-ink/60">{dueLabel}</span>
}
