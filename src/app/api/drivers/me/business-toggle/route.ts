import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// ============================================================================
// POST /api/drivers/me/business-toggle
// ----------------------------------------------------------------------------
// Driver toggles their B2B contract availability + config. Body:
//   { enabled: boolean
//   , maxParcelsPerDay?: number | null
//   , services?: string[]
//   , notes?: string | null }
//
// On enable: if config fields are missing, pre-fills sane defaults
// (30 parcels/day, ['parcels','documents'] services) so the driver
// appears on /business immediately without a configuration form.
// They can edit any time via the same endpoint.
//
// On disable: keeps the config so re-enabling restores prior settings.
// ============================================================================

const ALLOWED_SERVICES = ['parcels', 'restaurant', 'documents', 'groceries', 'batched'] as const

type Body = {
  enabled?: boolean
  maxParcelsPerDay?: number | null
  services?: string[]
  notes?: string | null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Read current row so we can fill defaults on first enable without
  // clobbering existing config.
  const { data: prior } = await admin
    .from('drivers')
    .select('business_contract_enabled, business_max_parcels_per_day, business_services, business_notes')
    .eq('user_id', user.id)
    .maybeSingle()

  const update: TableUpdate<'drivers'> = { business_contract_enabled: body.enabled }

  // Services — filter to whitelist; preserves prior if not in body.
  if (Array.isArray(body.services)) {
    update.business_services = body.services.filter((s) => (ALLOWED_SERVICES as readonly string[]).includes(s))
  } else if (body.enabled && (!prior?.business_services || prior.business_services.length === 0)) {
    update.business_services = ['parcels', 'documents']
  }

  // Capacity — explicit set, or default 30/day on first enable.
  if (body.maxParcelsPerDay !== undefined) {
    update.business_max_parcels_per_day = body.maxParcelsPerDay
  } else if (body.enabled && prior?.business_max_parcels_per_day == null) {
    update.business_max_parcels_per_day = 30
  }

  // Notes — explicit set only.
  if (body.notes !== undefined) {
    update.business_notes = body.notes
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    enabled: body.enabled,
    services: update.business_services ?? prior?.business_services ?? [],
    maxParcelsPerDay: update.business_max_parcels_per_day ?? prior?.business_max_parcels_per_day ?? null,
  })
}
