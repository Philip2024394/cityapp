'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// Compact action-button cluster used by the unified /admin/providers
// page. Posts to /api/admin/providers, refreshes the server page on
// success. Reasons (for reject/dispute) prompt inline.

type Action =
  | 'approve' | 'reject' | 'suspend' | 'activate'
  | 'toggle_mock_visibility'
  | 'settle' | 'dispute' | 'waive'

type ButtonSpec = { action: Action; label: string; tone: 'primary' | 'danger' | 'warn' | 'ghost'; needsReason?: boolean }

export default function ProviderActions({
  table,
  id,
  buttons,
}: {
  table: string
  id: string
  buttons: ButtonSpec[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<Action | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run(b: ButtonSpec) {
    let reason: string | undefined
    if (b.needsReason) {
      const r = window.prompt(`Reason for "${b.label}"? (optional)`) ?? undefined
      reason = r ?? undefined
    }
    setBusy(b.action); setErr(null)
    try {
      const r = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, action: b.action, reason }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setErr(j.error || 'failed')
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setErr('network')
    } finally {
      setBusy(null)
    }
  }

  function style(tone: ButtonSpec['tone']): string {
    switch (tone) {
      case 'primary': return 'bg-brand text-bg'
      case 'danger':  return 'bg-red-500/20 text-red-200 border border-red-500/40'
      case 'warn':    return 'bg-yellow-400/15 text-yellow-200 border border-yellow-400/35'
      default:        return 'bg-white/5 text-ink border border-ink/15'
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {buttons.map((b) => (
        <button
          key={b.action}
          onClick={() => run(b)}
          disabled={!!busy || pending}
          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition disabled:opacity-50 ${style(b.tone)}`}
        >
          {busy === b.action ? '…' : b.label}
        </button>
      ))}
      {err && <span className="text-[11px] text-red-300">err: {err}</span>}
    </div>
  )
}
