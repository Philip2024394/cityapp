import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import type { DriverAccountStatus } from '@/types/database'

// ============================================================================
// PATCH /api/admin/drivers/[id]
// ----------------------------------------------------------------------------
// Admin actions on a driver row.
//   - suspend       → policy violation; status='suspended'
//   - deactivate    → admin-hidden, non-disciplinary; status='deactivated'
//   - activate      → restore visibility; status='active'
//   - clear_snooze  → release a driver's self-snooze (drivers.snoozed_until=null)
//                     Admin CANNOT set a snooze — only the driver can, via
//                     /api/drivers/me/snooze. See feedback_cityriders_no_dispatch_ever.
// Future: edit hand-tuned overrides (price floor, manual rating reset, etc.).
//
// Both suspend and deactivate hide the driver from public discovery
// (queries filter on status='active'). The split exists so the audit
// trail distinguishes "policy action" from "admin convenience pause".
// ============================================================================

type PatchPayload = {
  action: 'suspend' | 'deactivate' | 'activate' | 'clear_snooze'
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

  // Branch on action: clear_snooze updates a different column from the
  // status-toggle actions, so handle it separately.
  if (body.action === 'clear_snooze') {
    const { data: before } = await admin
      .from('drivers')
      .select('user_id, snoozed_until')
      .eq('user_id', id)
      .maybeSingle()
    if (!before) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

    const { error: updateErr } = await admin
      .from('drivers')
      .update({ snoozed_until: null })
      .eq('user_id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    await writeAudit({
      actorId: me.id,
      action: 'driver.clear_snooze',
      entityType: 'driver',
      entityId: id,
      before: { snoozed_until: before.snoozed_until },
      after: { snoozed_until: null, reason: body.reason ?? null },
    })

    return NextResponse.json({ ok: true, snoozed_until: null })
  }

  const newStatus: DriverAccountStatus | null =
    body.action === 'suspend' ? 'suspended'
    : body.action === 'deactivate' ? 'deactivated'
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
