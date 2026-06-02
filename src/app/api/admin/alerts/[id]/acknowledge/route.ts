import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// POST /api/admin/alerts/[id]/acknowledge
// ----------------------------------------------------------------------------
// Marks an ops_alerts row as acknowledged by the current admin. Idempotent:
// re-acknowledging an already-acknowledged alert keeps the original
// acknowledged_at/by — we never overwrite the first-responder credit.
// ============================================================================

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: before } = await admin
    .from('ops_alerts')
    .select('id, acknowledged_at, acknowledged_by, severity, title')
    .eq('id', id)
    .maybeSingle()
  if (!before) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

  // Idempotent — already acked, return current state.
  const beforeRow = before as { id: string; acknowledged_at: string | null; acknowledged_by: string | null; severity: string; title: string }
  if (beforeRow.acknowledged_at) {
    return NextResponse.json({
      ok: true,
      already: true,
      acknowledged_at: beforeRow.acknowledged_at,
      acknowledged_by: beforeRow.acknowledged_by,
    })
  }

  const ackAt = new Date().toISOString()
  const { error: updErr } = await admin
    .from('ops_alerts')
    .update({ acknowledged_at: ackAt, acknowledged_by: me.id })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await writeAudit({
    actorId: me.id,
    action: 'ops_alert.acknowledge',
    entityType: 'ops_alert',
    entityId: id,
    before: { acknowledged_at: null },
    after: { acknowledged_at: ackAt, severity: beforeRow.severity, title: beforeRow.title },
  })

  return NextResponse.json({ ok: true, acknowledged_at: ackAt, acknowledged_by: me.id })
}
