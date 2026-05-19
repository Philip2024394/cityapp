'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function PayoutRowActions({ payoutId }: { payoutId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function call(body: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error || 'Action failed')
        return
      }
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  async function markPaid() {
    const ref = window.prompt('Bank transfer reference / provider txn ID:')
    if (ref === null) return
    if (!confirm('Mark paid? This also flips the linked referrals to paid.')) return
    await call({ action: 'mark_paid', provider_txn_id: ref.trim() || undefined })
  }
  async function cancel() {
    const reason = window.prompt('Reason for cancelling this payout:')
    if (!reason?.trim()) return
    await call({ action: 'cancel', notes: reason.trim() })
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 items-end">
      <button
        type="button"
        onClick={markPaid}
        disabled={busy}
        className="px-2.5 py-1 rounded-md bg-online/15 border border-online/40 text-online text-[11px] font-extrabold uppercase tracking-wider hover:bg-online/22 transition disabled:opacity-60"
      >
        Mark paid
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/40 text-red-400 text-[11px] font-extrabold uppercase tracking-wider hover:bg-red-500/20 transition disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  )
}
