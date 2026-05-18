import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import type { DriverAccountStatus } from '@/types/database'

// ============================================================================
// PATCH /api/admin/drivers/[id]
// ----------------------------------------------------------------------------
// Admin actions on a driver row. Today: suspend / activate. Future: edit
// hand-tuned overrides (price floor, manual rating reset, etc.).
// ============================================================================

type PatchPayload = {
  action: 'suspend' | 'activate'
  reason?: string
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { id } = await ctx.params
  let body: PatchPayload
  try { body = (await req.json()) as PatchPayload }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const newStatus: DriverAccountStatus | null =
    body.action === 'suspend' ? 'suspended'
    : body.action === 'activate' ? 'active'
    : null
  if (!newStatus) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { data: before } = await admin.from('drivers').select('user_id, status').eq('user_id', id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  const { error: updateErr } = await admin.from('drivers').update({ status: newStatus }).eq('user_id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await writeAudit({
    actorId: me.id,
    action: `driver.${body.action}`,
    entityType: 'driver',
    entityId: id,
    before: { status: before.status },
    after: { status: newStatus, reason: body.reason ?? null },
  })

  return NextResponse.json({ ok: true, status: newStatus })
}
