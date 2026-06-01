import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// /api/drivers/me/partner-program
// ──────────────────────────────────────────────────────────────────────────────
// GET   → current partner_program_status for the signed-in driver
// PATCH → flip the toggle ('eligible' ↔ 'opted_out')
//
// Founder spec 2026-06-01 (stricter flow):
//   • Transitioning opted_out → eligible REQUIRES `acceptedTerms: true` in the
//     PATCH body. The driver dashboard now shows a T&Cs modal first and only
//     calls this endpoint after the checkbox is ticked.
//   • On accept we stamp `drivers.partner_terms_accepted_at = now()` so we
//     have an auditable record of consent.
//   • Drivers who previously opted-in were backfilled in migration 0173 and
//     don't need to re-accept.
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

  let body: { optIn?: boolean; acceptedTerms?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (typeof body.optIn !== 'boolean') {
    return NextResponse.json({ error: 'invalid_optIn' }, { status: 400 })
  }

  const { data: current } = await admin
    .from('drivers')
    .select('partner_program_status, partner_terms_accepted_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // Suspended drivers cannot self-reactivate.
  if (current?.partner_program_status === 'suspended') {
    return NextResponse.json({
      error: 'suspended',
      message: 'Settle outstanding partner bookings first. Ask the partner to mark them paid.',
    }, { status: 409 })
  }

  // T&Cs gate: opted_out → eligible requires explicit acceptance, unless the
  // driver already accepted previously (backfilled by 0173 for legacy
  // opted-in drivers, or stamped on first successful opt-in).
  const isTransitionToOptIn =
    body.optIn === true && current?.partner_program_status !== 'eligible'

  if (isTransitionToOptIn && !current?.partner_terms_accepted_at && body.acceptedTerms !== true) {
    return NextResponse.json({
      error: 'terms_not_accepted',
      message: 'You must read and agree to the Partner Program terms before opting in.',
    }, { status: 400 })
  }

  const next: Status = body.optIn ? 'eligible' : 'opted_out'
  const update: TableUpdate<'drivers'> = { partner_program_status: next }

  // Stamp T&Cs acceptance on first-ever opt-in.
  if (isTransitionToOptIn && body.acceptedTerms === true && !current?.partner_terms_accepted_at) {
    ;(update as Record<string, unknown>).partner_terms_accepted_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: next })
}
