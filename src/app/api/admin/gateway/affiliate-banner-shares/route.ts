import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/affiliate-banner-shares
// ----------------------------------------------------------------------------
// Aggregated read of affiliate_banner_shares for the landing Admin
// dashboard. Returns raw rows (capped at 1000 for safety) plus summary
// buckets so the panel can render charts without re-pivoting client-side.
//
// Query params:
//   ?agent_code=XXX  — filter to one agent (optional)
//   ?days=30         — window size in days (default 30, max 180)
//
// Response shape:
//   {
//     rows: [{ agent_code, banner_id, platform, created_at, ... }],
//     summary: {
//       total_shares: number,
//       by_platform:  Record<platform, number>,
//       by_banner:    Record<banner_id, number>,
//       by_agent:     Record<agent_code, number>,
//       by_day:       [{ day: 'YYYY-MM-DD', count: number }],
//       last_shared_at: string | null,
//     }
//   }
// ============================================================================

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  agent_code: string
  banner_id: string
  platform: string | null
  referrer_url: string | null
  user_agent: string | null
  country_code: string | null
  created_at: string
}

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const agentCode = (url.searchParams.get('agent_code') || '').trim() || null
  const daysRaw = parseInt(url.searchParams.get('days') || '30', 10)
  const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 30, 1), 180)

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let q = admin
    .from('affiliate_banner_shares')
    .select('id, agent_code, banner_id, platform, referrer_url, user_agent, country_code, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (agentCode) q = q.eq('agent_code', agentCode)

  const { data, error } = await q
  if (error) return fail(error.message, 500)

  const rows = (data ?? []) as Row[]

  // Build summary buckets — cheap O(N) pass, N capped at 1000.
  const byPlatform: Record<string, number> = {}
  const byBanner:   Record<string, number> = {}
  const byAgent:    Record<string, number> = {}
  const byDayMap:   Record<string, number> = {}
  let lastSharedAt: string | null = null

  for (const r of rows) {
    const p = r.platform || 'unknown'
    byPlatform[p] = (byPlatform[p] || 0) + 1
    byBanner[r.banner_id] = (byBanner[r.banner_id] || 0) + 1
    byAgent[r.agent_code] = (byAgent[r.agent_code] || 0) + 1
    const day = r.created_at.slice(0, 10)
    byDayMap[day] = (byDayMap[day] || 0) + 1
    if (!lastSharedAt || r.created_at > lastSharedAt) lastSharedAt = r.created_at
  }

  const byDay = Object.entries(byDayMap)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, count]) => ({ day, count }))

  return ok({
    rows,
    summary: {
      total_shares: rows.length,
      by_platform: byPlatform,
      by_banner: byBanner,
      by_agent: byAgent,
      by_day: byDay,
      last_shared_at: lastSharedAt,
    },
  })
})

export const OPTIONS = withGateway(async () => ok({}))
