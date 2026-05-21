'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

// ============================================================================
// RefreshButton — manual re-fetch for /admin/health.
// ----------------------------------------------------------------------------
// The page is `force-dynamic`, so router.refresh() re-runs the server
// component and re-issues every Supabase query. We deliberately do NOT
// poll on an interval — health snapshots are cheap but not free, and a
// human refreshing on demand is the right cadence for an ops dashboard
// that has no SLAs attached to it yet.
// ============================================================================

export default function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold border border-line bg-white/5 hover:bg-white/10 disabled:opacity-50 transition"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${pending ? 'animate-spin' : ''}`} />
      {pending ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
