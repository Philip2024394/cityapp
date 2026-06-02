import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies } from '@/lib/admin/guard'

// ============================================================================
// GET /api/admin/alerts
// ----------------------------------------------------------------------------
// Admin-only read of the local ops_alerts table.
//
// Query params:
//   acknowledged — 'true' | 'false' (omit for all)
//   since        — ISO timestamp; only rows created at/after this moment
//   limit        — default 100, max 500
//
// Response: { alerts: OpsAlert[]; total_unacked: number }
// ============================================================================

export const dynamic = 'force-dynamic'

export type OpsAlertRow = {
  id: string
  created_at: string
  source: string
  severity: 'info' | 'warn' | 'error' | 'critical'
  title: string
  detail: Record<string, unknown> | null
  acknowledged_at: string | null
  acknowledged_by: string | null
}

export async function GET(req: Request) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const url = new URL(req.url)
  const acknowledgedParam = url.searchParams.get('acknowledged')
  const since = url.searchParams.get('since')
  const limitParam = url.searchParams.get('limit')

  let limit = 100
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10)
    if (Number.isFinite(parsed)) limit = Math.max(1, Math.min(500, parsed))
  }

  let q = admin
    .from('ops_alerts')
    .select('id, created_at, source, severity, title, detail, acknowledged_at, acknowledged_by')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (acknowledgedParam === 'true') q = q.not('acknowledged_at', 'is', null)
  else if (acknowledgedParam === 'false') q = q.is('acknowledged_at', null)
  if (since) q = q.gte('created_at', since)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Independent unacked count — always reports the global total so the UI
  // badge stays accurate even when a narrower filter is applied above.
  const { count: totalUnacked } = await admin
    .from('ops_alerts')
    .select('*', { count: 'exact', head: true })
    .is('acknowledged_at', null)

  return NextResponse.json({
    alerts: (data as OpsAlertRow[] | null) ?? [],
    total_unacked: totalUnacked ?? 0,
  })
}
