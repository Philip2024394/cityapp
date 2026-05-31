import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// /api/drivers/me/partner-program
// ──────────────────────────────────────────────────────────────────────────────
// GET  → current partner_program_status for the signed-in driver
// PATCH → flip the toggle ('eligible' ↔ 'opted_out')
//
// Suspended drivers cannot opt themselves back in — they have to settle
// outstanding bookings with their partners first; the partner-side settle
// flow re-activates them via /api/partners/me/settle.

export const runtime = 'nodejs'

type Status = 'eligible' | 'opted_out' | 'suspended'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data } = await admin
    .from('drivers')
    .select('partner_program_status, partner_suspended_at, partner_suspended_reason')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    status:    (data?.partner_program_status as Status) ?? 'opted_out',
    suspendedAt:     data?.partner_suspended_at     ?? null,
    suspendedReason: data?.partner_suspended_reason ?? null,
  })
}

export async function PATCH(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { optIn?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (typeof body.optIn !== 'boolean') {
    return NextResponse.json({ error: 'invalid_optIn' }, { status: 400 })
  }

  const { data: current } = await admin
    .from('drivers')
    .select('partner_program_status')
    .eq('user_id', user.id)
    .maybeSingle()

  // Suspended drivers cannot self-reactivate.
  if (current?.partner_program_status === 'suspended') {
    return NextResponse.json({
      error: 'suspended',
      message: 'Settle outstanding partner bookings first. Ask the partner to mark them paid.',
    }, { status: 409 })
  }

  const next: Status = body.optIn ? 'eligible' : 'opted_out'
  const update: TableUpdate<'drivers'> = { partner_program_status: next }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: next })
}
