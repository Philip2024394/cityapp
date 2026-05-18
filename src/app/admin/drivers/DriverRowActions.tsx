'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, BadgeCheck } from 'lucide-react'
import type { DriverAccountStatus, SubscriptionStatus } from '@/types/database'

export default function DriverRowActions({
  driverId, driverStatus, subStatus,
}: {
  driverId: string
  driverStatus: DriverAccountStatus
  subStatus: SubscriptionStatus | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function callAdmin(url: string, body: Record<string, unknown>) {
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Update failed')
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setError((e as Error).message || 'Update failed')
    }
  }

  async function suspend() {
    if (!confirm('Suspend this rider? They will be removed from discovery until reactivated.')) return
    await callAdmin(`/api/admin/drivers/${driverId}`, { action: 'suspend' })
  }
  async function reactivate() {
    await callAdmin(`/api/admin/drivers/${driverId}`, { action: 'activate' })
  }
  async function markPaid() {
    const ref = window.prompt('Bank transfer reference (optional)') ?? ''
    await callAdmin(`/api/admin/subscriptions/${driverId}`, {
      action: 'mark_paid',
      payment_reference: ref.trim() || undefined,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {driverStatus === 'active' ? (
        <button onClick={suspend} disabled={pending} className="action-btn action-btn-danger disabled:opacity-60">
          <Ban className="w-3.5 h-3.5" />
          Suspend
        </button>
      ) : (
        <button onClick={reactivate} disabled={pending} className="action-btn action-btn-success disabled:opacity-60">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Reactivate
        </button>
      )}
      {(subStatus === 'trial' || subStatus === 'past_due' || subStatus === 'canceled' || subStatus === 'active') && (
        <button onClick={markPaid} disabled={pending} className="action-btn action-btn-primary disabled:opacity-60">
          <BadgeCheck className="w-3.5 h-3.5" />
          Mark paid · +30 days
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
          transition: background 0.15s ease, border-color 0.15s ease;
          min-height: 32px;
        }
        .action-btn:hover { background: rgba(255,255,255,0.07); }
        .action-btn-danger { color: #EF4444; border-color: rgba(239,68,68,0.30); }
        .action-btn-danger:hover { background: rgba(239,68,68,0.10); }
        .action-btn-success { color: #22C55E; border-color: rgba(34,197,94,0.30); }
        .action-btn-success:hover { background: rgba(34,197,94,0.10); }
        .action-btn-primary { color: #FACC15; border-color: rgba(250,204,21,0.35); }
        .action-btn-primary:hover { background: rgba(250,204,21,0.10); }
      `}</style>
    </div>
  )
}
