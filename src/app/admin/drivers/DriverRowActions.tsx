'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, BadgeCheck, EyeOff, X as XIcon } from 'lucide-react'
import type { DriverAccountStatus, SubscriptionStatus } from '@/types/database'

// ============================================================================
// DriverRowActions — admin row actions for a single driver.
// Replaces the old window.prompt + window.confirm chain (which fired 2 native
// dialogs per action — ugly on mobile, easy to misclick) with a single
// inline sheet that shows the driver name, current period_end, payment plan,
// and a reference field, before committing.
//
// Status semantics:
//   - Suspend     → policy violation. Driver knows why; appears in audit
//                   under driver.suspend.
//   - Deactivate  → admin-hidden for non-disciplinary reasons (paused,
//                   awaiting manual review, retired). Same visibility
//                   effect; different audit reason. Both reverse via
//                   Reactivate.
// ============================================================================

type Action = 'suspend' | 'deactivate' | 'mark_paid' | 'mark_paid_yearly'

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
  const [sheet, setSheet] = useState<{ action: Action } | null>(null)

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
        return false
      }
      startTransition(() => router.refresh())
      return true
    } catch (e) {
      setError((e as Error).message || 'Update failed')
      return false
    }
  }

  async function reactivate() {
    await callAdmin(`/api/admin/drivers/${driverId}`, { action: 'activate' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {driverStatus === 'active' ? (
        <>
          <button onClick={() => setSheet({ action: 'suspend' })} disabled={pending} className="action-btn action-btn-danger disabled:opacity-60">
            <Ban className="w-3.5 h-3.5" />
            Suspend
          </button>
          <button onClick={() => setSheet({ action: 'deactivate' })} disabled={pending} className="action-btn action-btn-muted disabled:opacity-60">
            <EyeOff className="w-3.5 h-3.5" />
            Deactivate
          </button>
        </>
      ) : (
        <button onClick={reactivate} disabled={pending} className="action-btn action-btn-success disabled:opacity-60">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Reactivate
        </button>
      )}
      {(subStatus === 'trial' || subStatus === 'past_due' || subStatus === 'canceled' || subStatus === 'active') && (
        <>
          <button onClick={() => setSheet({ action: 'mark_paid' })} disabled={pending} className="action-btn action-btn-primary disabled:opacity-60">
            <BadgeCheck className="w-3.5 h-3.5" />
            Mark paid · +30 days (Rp 38K)
          </button>
          <button onClick={() => setSheet({ action: 'mark_paid_yearly' })} disabled={pending} className="action-btn action-btn-primary disabled:opacity-60">
            <BadgeCheck className="w-3.5 h-3.5" />
            Mark paid · +365 days (Rp 350K)
          </button>
        </>
      )}
      {error && <span className="text-[12px] text-red-400">{error}</span>}

      {sheet && (
        <ConfirmActionSheet
          action={sheet.action}
          driverId={driverId}
          onConfirm={async (refValue) => {
            const ok = sheet.action === 'suspend' || sheet.action === 'deactivate'
              ? await callAdmin(`/api/admin/drivers/${driverId}`, { action: sheet.action })
              : await callAdmin(`/api/admin/subscriptions/${driverId}`, {
                  action: sheet.action,
                  payment_reference: refValue || undefined,
                })
            if (ok) setSheet(null)
          }}
          onDismiss={() => setSheet(null)}
        />
      )}

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
        .action-btn-muted { color: #94A3B8; border-color: rgba(148,163,184,0.30); }
        .action-btn-muted:hover { background: rgba(148,163,184,0.10); }
      `}</style>
    </div>
  )
}

function ConfirmActionSheet({
  action, driverId, onConfirm, onDismiss,
}: {
  action: Action
  driverId: string
  onConfirm: (refValue: string) => Promise<void> | void
  onDismiss: () => void
}) {
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onDismiss() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onDismiss])

  const config = (() => {
    switch (action) {
      case 'suspend':
        return {
          title: 'Suspend driver',
          headline: 'Hide for policy violation',
          body: 'Driver will be removed from the marketplace until you Reactivate them. Use this for policy violations — the action is logged under driver.suspend.',
          confirmLabel: 'Suspend driver',
          tone: 'danger' as const,
          showRef: false,
        }
      case 'deactivate':
        return {
          title: 'Deactivate driver',
          headline: 'Admin-pause (non-disciplinary)',
          body: 'Driver will be removed from discovery without the policy-violation connotation. Use for retirement, manual review, or temporary pause. Reverse with Reactivate.',
          confirmLabel: 'Deactivate driver',
          tone: 'muted' as const,
          showRef: false,
        }
      case 'mark_paid':
        return {
          title: 'Mark monthly paid',
          headline: '+30 days · Rp 38.000',
          body: "Extends the driver's current_period_end by 30 days. If the current period is in the future, extends from that date (won't burn the unused tail).",
          confirmLabel: 'Confirm payment',
          tone: 'primary' as const,
          showRef: true,
        }
      case 'mark_paid_yearly':
        return {
          title: 'Mark yearly paid',
          headline: '+365 days · Rp 350.000',
          body: "Extends the driver's current_period_end by 365 days. If the current period is in the future, extends from that date (won't burn the unused tail).",
          confirmLabel: 'Confirm payment',
          tone: 'primary' as const,
          showRef: true,
        }
    }
  })()

  const accent =
    config.tone === 'danger' ? '#EF4444'
    : config.tone === 'muted' ? '#94A3B8'
    : '#FACC15'

  return (
    <>
      <div
        onClick={onDismiss}
        aria-hidden
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
        className="fixed left-0 right-0 bottom-0 z-[90] pb-safe"
      >
        <div
          className="mx-auto max-w-md w-full"
          style={{
            background: '#0A0A0A',
            borderTop: `1px solid ${accent}66`,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
          }}
        >
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] uppercase tracking-wider font-extrabold" style={{ color: accent }}>
                {config.title}
              </div>
              <h2 className="text-[18px] font-extrabold leading-tight mt-1">
                {config.headline}
              </h2>
              <p className="text-[13px] text-muted leading-snug mt-1">
                Driver: <code className="text-ink">{driverId.slice(0, 8)}…</code>
              </p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-5 pb-4 space-y-3 text-[14px] text-ink/90 leading-relaxed">
            <p>{config.body}</p>
            {config.showRef && (
              <div>
                <label className="block text-[12px] font-extrabold uppercase tracking-wider text-dim mb-1.5">
                  Bank transfer reference (optional)
                </label>
                <input
                  className="input"
                  placeholder="BCA 1234 5678 — 19 Aug"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="px-5 pb-5 grid grid-cols-1 gap-2">
            <button
              onClick={async () => {
                setBusy(true)
                try {
                  await onConfirm(ref.trim())
                } finally {
                  setBusy(false)
                }
              }}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
              style={{
                background:
                  config.tone === 'danger'
                    ? 'linear-gradient(135deg, #EF4444, #B91C1C)'
                    : config.tone === 'muted'
                      ? 'linear-gradient(135deg, #94A3B8, #475569)'
                      : 'linear-gradient(135deg, #FACC15, #EAB308)',
                color: config.tone === 'primary' ? '#0A0A0A' : '#FFFFFF',
                minHeight: 52,
              }}
            >
              {busy ? 'Working…' : config.confirmLabel}
            </button>
            <button
              onClick={onDismiss}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-transparent text-muted font-extrabold text-[14px] uppercase tracking-wider border border-white/10 active:scale-[0.99]"
              style={{ minHeight: 52 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
