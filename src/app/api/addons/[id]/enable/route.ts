// ============================================================================
// POST /api/addons/[id]/enable
// ----------------------------------------------------------------------------
// Activates an add-on for the currently signed-in user.
//
// Status flow on insert:
// - Free-forever add-on → status='free', trial_until=null, paid_until=null
// - Paid add-on WITH trialDays → status='trial', trial_until=now()+trialDays
// - Paid add-on WITHOUT trialDays → 402 Payment Required (must check out first)
//
// If the row already exists, this endpoint is a no-op (idempotent) and
// returns the existing row.
//
// Auth: must be signed in. Anonymous → 401.
// ============================================================================

import { NextResponse } from 'next/server'
import { findAddon } from '@/lib/addons/catalog'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const addon = findAddon(id)
  if (!addon) {
    return NextResponse.json({ error: 'unknown_addon' }, { status: 404 })
  }
  if (!addon.available) {
    return NextResponse.json({ error: 'addon_not_yet_available' }, { status: 409 })
  }

  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'no_session' }, { status: 503 })

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  // Existing row → no-op
  const { data: existing } = await supabase
    .from('provider_addons')
    .select('addon_id, status, trial_until, paid_until, enabled_at')
    .eq('owner_user_id', user.id)
    .eq('addon_id', addon.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, alreadyEnabled: true, row: existing })
  }

  // Determine initial state per billing kind
  let status: 'free' | 'trial' | 'paid' = 'free'
  let trialUntil: string | null = null

  if (addon.billing.kind === 'free-forever') {
    status = 'free'
  } else if (addon.billing.kind === 'paid') {
    if (addon.billing.trialDays && addon.billing.trialDays > 0) {
      status = 'trial'
      const ms = addon.billing.trialDays * 24 * 60 * 60 * 1000
      trialUntil = new Date(Date.now() + ms).toISOString()
    } else {
      return NextResponse.json({ error: 'checkout_required', addonId: addon.id }, { status: 402 })
    }
  }

  const { error } = await supabase
    .from('provider_addons')
    .insert({
      owner_user_id: user.id,
      addon_id:      addon.id,
      status,
      trial_until:   trialUntil,
      paid_until:    null,
      config:        {},
    })

  if (error) {
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status, trialUntil })
}
