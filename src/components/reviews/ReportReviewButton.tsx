'use client'
import { useState } from 'react'
import { Flag, Loader2, Check } from 'lucide-react'

// ============================================================================
// ReportReviewButton — tiny inline "Report" link under each review card.
// ----------------------------------------------------------------------------
// Required by Play Store user-generated-content policy: every UGC surface
// must expose a public takedown path. Tap → confirm → fire endpoint →
// review disappears from list (status='flagged' → public read RLS hides it).
//
// On success: replaces the button with a "Reported — under review" pill so
// the reporter sees feedback without a modal.
// ============================================================================

export default function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'sending' | 'done' | 'error'>('idle')

  async function send() {
    setState('sending')
    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, { method: 'POST' })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted/70 mt-1.5">
        <Check className="w-3 h-3" style={{ color: '#22C55E' }} />
        Reported — under review
      </span>
    )
  }

  if (state === 'confirming') {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={send}
          className="text-[11px] font-bold px-2 py-1 rounded transition active:scale-95"
          style={{ background: 'rgba(239,68,68,0.10)', color: '#F87171', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          Confirm report
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="text-[11px] text-muted/70 hover:text-ink transition"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setState('confirming')}
      disabled={state === 'sending'}
      className="inline-flex items-center gap-1 text-[11px] text-muted/60 hover:text-red-400 transition mt-1.5 disabled:opacity-60"
      aria-label="Report this review"
    >
      {state === 'sending' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
      {state === 'error' ? 'Error — try again' : 'Report'}
    </button>
  )
}
