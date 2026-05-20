'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, BadgeCheck, Ban, RotateCcw } from 'lucide-react'

type RentalStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export default function RentalRowActions({
  rentalId,
  status,
  hasPaid,
}: {
  rentalId: string
  status: RentalStatus
  hasPaid: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function call(body: Record<string, unknown>) {
    setError(null)
    try {
      const res = await fetch(`/api/admin/rentals/${rentalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || 'Update failed'); return }
      startTransition(() => router.refresh())
    } catch (e) {
      setError((e as Error).message || 'Update failed')
    }
  }

  async function approve() {
    if (!confirm('Approve this rental? It becomes publicly visible on /rent immediately and starts a 7-day free trial (paid_until = today + 7 days).')) return
    await call({ action: 'approve' })
  }
  async function reject() {
    const note = window.prompt('Reason for rejection:')
    if (note === null) return
    await call({ action: 'reject', rejection_note: note.trim() || 'No reason provided' })
  }
  async function markPaid() {
    const ref = window.prompt('Payment reference (optional — bank transfer ID):') ?? ''
    if (!confirm('Mark as paid (monthly)? Extends paid_until by 30 days (Rp 38.000/month) and sets listing_tier = "paid".')) return
    await call({ action: 'mark_paid', payment_reference: ref.trim() || undefined })
  }
  async function markPaidYearly() {
    const ref = window.prompt('Payment reference (optional — bank transfer ID):') ?? ''
    if (!confirm('Mark as paid (yearly)? Extends paid_until by 365 days (Rp 350.000/year) and sets listing_tier = "paid".')) return
    await call({ action: 'mark_paid_yearly', payment_reference: ref.trim() || undefined })
  }
  async function suspend() {
    if (!confirm('Suspend this rental? It will be hidden from /rent until reactivated.')) return
    await call({ action: 'suspend' })
  }
  async function reactivate() {
    await call({ action: 'reactivate' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'pending' && (
        <>
          <button onClick={approve} disabled={pending} className="action-btn action-btn-success disabled:opacity-60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </button>
          <button onClick={reject} disabled={pending} className="action-btn action-btn-danger disabled:opacity-60">
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        </>
      )}

      {status !== 'rejected' && !hasPaid && (
        <>
          <button onClick={markPaid} disabled={pending} className="action-btn action-btn-primary disabled:opacity-60">
            <BadgeCheck className="w-3.5 h-3.5" />
            Mark paid · +30 days (Rp 38K)
          </button>
          <button onClick={markPaidYearly} disabled={pending} className="action-btn action-btn-primary disabled:opacity-60">
            <BadgeCheck className="w-3.5 h-3.5" />
            Mark paid · +365 days (Rp 350K)
          </button>
        </>
      )}

      {status === 'approved' && (
        <button onClick={suspend} disabled={pending} className="action-btn action-btn-warn disabled:opacity-60">
          <Ban className="w-3.5 h-3.5" />
          Suspend
        </button>
      )}
      {status === 'suspended' && (
        <button onClick={reactivate} disabled={pending} className="action-btn action-btn-success disabled:opacity-60">
          <RotateCcw className="w-3.5 h-3.5" />
          Reactivate
        </button>
      )}

      {error && <span className="text-[12px] text-red-400">{error}</span>}

      <style jsx>{`
        .action-btn {
          display: inline-flex; align-items: center; gap: 0.375rem;
          padding: 0.375rem 0.75rem; border-radius: 0.5rem;
          font-size: 12px; font-weight: 800;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.85);
          transition: all 120ms;
        }
        .action-btn:hover { background: rgba(255,255,255,0.08); }
        .action-btn-success { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.35); color: #22C55E; }
        .action-btn-success:hover { background: rgba(34,197,94,0.20); }
        .action-btn-danger  { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.35); color: #EF4444; }
        .action-btn-danger:hover { background: rgba(239,68,68,0.18); }
        .action-btn-warn    { background: rgba(249,115,22,0.10); border-color: rgba(249,115,22,0.35); color: #F97316; }
        .action-btn-warn:hover { background: rgba(249,115,22,0.18); }
        .action-btn-primary { background: rgba(250,204,21,0.12); border-color: rgba(250,204,21,0.40); color: #FACC15; }
        .action-btn-primary:hover { background: rgba(250,204,21,0.22); }
      `}</style>
    </div>
  )
}
