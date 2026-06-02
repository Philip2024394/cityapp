'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================================
// AutoRefresh — silently re-fetches /admin/drivers every 30s.
// ----------------------------------------------------------------------------
// The drivers admin list shows last_active_at + availability, which drift in
// real time. Rather than wire WebSockets we just call router.refresh() on a
// fixed interval; the parent page is force-dynamic so the Supabase queries
// re-run on each refresh. No state of its own — purely a side effect.
// ============================================================================

export default function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
