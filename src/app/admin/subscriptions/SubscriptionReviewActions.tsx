'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

// ============================================================================
// SubscriptionReviewActions — approve/reject buttons + reject-notes modal
// ----------------------------------------------------------------------------
// Mounted on each pending row in /admin/subscriptions. Calls the two API
// endpoints in /api/admin/subscriptions/[id]/{approve,reject}.
//
// Reject requires admin_notes (min 5 chars) per the founder spec — gives
// the driver some context when admin re-renders the row in their dashboard
// later. We use a small inline modal rather than window.prompt() so the
// notes box can validate length without round-trips.
// ============================================================================

export default function SubscriptionReviewActions({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function approve() {
    if (!confirm('Mark this payment as verified? The driver listing stays active (paid_until is unchanged).')) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Approve failed')
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setError((e as Error).message || 'Approve failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitReject() {
    const trimmed = notes.trim()
    if (trimmed.length < 5) {
      setError('Notes must be at least 5 characters')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Reject failed')
        return
      }
      setRejectOpen(false)
      setNotes('')
      startTransition(() => router.refresh())
    } catch (e) {
      setError((e as Error).message || 'Reject failed')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = pending || submitting

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={approve}
        disabled={busy}
        className="action-btn action-btn-success disabled:opacity-60"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Approve
      </button>
      <button
        onClick={() => { setError(null); setRejectOpen(true) }}
        disabled={busy}
        className="action-btn action-btn-danger disabled:opacity-60"
      >
        <XCircle className="w-3.5 h-3.5" />
        Reject
      </button>

      {error && <span className="text-[13px] text-red-400">{error}</span>}

      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => !submitting && setRejectOpen(false)}
        >
          <div
            className="card p-4 w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-extrabold">Reject this payment</h3>
            <p className="text-[13px] text-muted">
              The driver&apos;s <span className="font-mono">paid_until</span> will revert to
              the most recent verified payment (or be cleared if none). Tell them why so
              they can re-upload a valid screenshot.
            </p>
            <label className="block text-[13px]">
              <span className="block font-bold mb-1">Admin notes <span className="text-dim">(min 5 chars, shown to driver)</span></span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-[13px] text-ink focus:outline-none focus:border-brand"
                placeholder="e.g. Screenshot is unreadable / wrong amount / different recipient name"
                autoFocus
                disabled={submitting}
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => { setRejectOpen(false); setNotes('') }}
                disabled={submitting}
                className="action-btn disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={submitting || notes.trim().length < 5}
                className="action-btn action-btn-danger disabled:opacity-60"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject payment
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .action-btn {
          display: inline-flex; align-items: center; gap: 0.375rem;
          padding: 0.4rem 0.85rem; border-radius: 0.5rem;
          font-size: 13px; font-weight: 800;
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
      `}</style>
    </div>
  )
}
