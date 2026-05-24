import { NextResponse } from 'next/server'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/admin/wa-queue — admin actions on the WhatsApp queue.
// Body: { id: number, action: 'mark_sent' | 'delete' }
//
// The queue is populated by /api/admin/reminders/payments (cron) when
// it composes an email reminder AND the user has a WA number. Admin
// clicks through /admin/wa-queue → wa.me deep-link → manually sends
// → returns here and marks sent. Delete is for stale / no-longer-relevant
// queue entries (e.g. user paid after the row was queued).

export const runtime = 'nodejs'

type Body = {
  id?: number
  action?: 'mark_sent' | 'delete'
}

export async function POST(req: Request) {
  const admin = await assertAdminFromCookies()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.id || typeof body.id !== 'number') {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }
  if (body.action !== 'mark_sent' && body.action !== 'delete') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const { data: before } = await supabase
    .from('payment_reminders_log')
    .select('*')
    .eq('id', body.id)
    .eq('channel', 'whatsapp')
    .maybeSingle()
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (body.action === 'mark_sent') {
    const { error } = await supabase
      .from('payment_reminders_log')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
    await writeAudit({
      actorId: admin.id,
      action: 'admin.wa_queue.mark_sent',
      entityType: 'payment_reminders_log',
      entityId: String(body.id),
      before: before as Record<string, unknown>,
      after: { sent_at: 'now()' },
    })
    return NextResponse.json({ ok: true })
  }

  // delete
  const { error } = await supabase
    .from('payment_reminders_log')
    .delete()
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 })
  await writeAudit({
    actorId: admin.id,
    action: 'admin.wa_queue.delete',
    entityType: 'payment_reminders_log',
    entityId: String(body.id),
    before: before as Record<string, unknown>,
    after: null,
  })
  return NextResponse.json({ ok: true })
}
