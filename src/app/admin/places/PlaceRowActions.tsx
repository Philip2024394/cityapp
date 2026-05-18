'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, BadgeCheck, Ban, RotateCcw } from 'lucide-react'

type PlaceStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export default function PlaceRowActions({
  placeId,
  status,
  hasPaid,
}: {
  placeId: string
  status: PlaceStatus
  hasPaid: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function call(body: Record<string, unknown>) {
    setError(null)
    try {
      const res = await fetch(`/api/admin/places/${placeId}`, {
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
    if (!confirm('Approve this listing? It becomes publicly visible on /places immediately and starts a 2-month free trial (paid_until = today + 60 days).')) return
    await call({ action: 'approve' })
  }
  async function reject() {
    const note = window.prompt('Reason for rejection (will be saved on the row):')
    if (note === null) return
    await call({ action: 'reject', rejection_note: note.trim() || 'No reason provided' })
  }
  async function markPaid() {
    const ref = window.prompt('Payment reference (optional — e.g. bank transfer ID):') ?? ''
    if (!confirm('Mark as paid? Extends paid_until by 30 days (Rp 30.000/month) and sets listing_tier = "paid".')) return
    await call({ action: 'mark_paid', payment_reference: ref.trim() || undefined })
  }
  async function suspend() {
    if (!confirm('Suspend this listing? It will be hidden from /places until reactivated.')) return
    await call({ action: 'suspend' })
  }
  async function reactivate() {
    await call({ action: 'reactivate' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Approve / Reject — only meaningful on pending rows */}
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

      {/* Mark paid — applies once a listing exists (any status except rejected) */}
      {status !== 'rejected' && !hasPaid && (
        <button onClick={markPaid} disabled={pending} className="action-btn action-btn-primary disabled:opacity-60">
          <BadgeCheck className="w-3.5 h-3.5" />
          Mark paid · +30 days
        </button>
      )}

      {/* Suspend / Reactivate — toggles between approved and suspended */}
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
