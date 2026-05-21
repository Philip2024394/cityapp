'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

// ============================================================================
// DeleteTourGuideButton — owner-side delete with confirm step.
// Calls DELETE /api/tour-guide/[id] (owner-scoped RLS) and refreshes
// the dashboard afterwards.
// ============================================================================

export default function DeleteTourGuideButton({
  listingId, label,
}: { listingId: string; label: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function handleDelete() {
    setPhase('deleting'); setErr(null)
    try {
      const res = await fetch(`/api/tour-guide/${listingId}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !j.ok) throw new Error(j?.error || `Delete failed (${res.status})`)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
      setPhase('error')
    }
  }

  if (phase === 'confirm') {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-red-300 font-extrabold">Hapus {label}?</span>
        <button
          type="button"
          onClick={handleDelete}
          className="px-2 py-0.5 rounded-md text-white font-extrabold uppercase tracking-wider"
          style={{ background: 'rgba(239,68,68,0.45)' }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          className="px-2 py-0.5 rounded-md text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (phase === 'deleting') {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider text-muted">
        <Loader2 className="w-3 h-3 animate-spin" /> Deleting…
      </span>
    )
  }

  if (phase === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-red-400">
        {err}
        <button type="button" onClick={() => setPhase('idle')} className="ml-1 underline text-muted hover:text-ink">try again</button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPhase('confirm')}
      className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider text-red-400 hover:text-red-300"
    >
      <Trash2 className="w-3 h-3" />
      Delete
    </button>
  )
}
