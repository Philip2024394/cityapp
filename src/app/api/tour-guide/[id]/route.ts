import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { MAX_TOUR_SERVICES, TOUR_SERVICE_IDS } from '@/data/tourServices'
import { validateUniversalProfile, type UniversalProfileBody } from '@/lib/validation/universalProfile'

// ============================================================================
// /api/tour-guide/[id]
// ----------------------------------------------------------------------------
// Owner-scoped PATCH (edit) + DELETE (remove) for a tour_guide_listings row.
// RLS (migration 0037 + 0040) restricts mutations to rows where
// owner_user_id = auth.uid(). Wrong ids return 404 without leaking.
//
// Status / verified / rating columns are deliberately NOT in the editable
// list — only admin moves rows through the moderation pipeline.
// ============================================================================

const EDITABLE_FIELDS = [
  'name',
  'whatsapp_e164',
  'email',
  'city',
  'address',
  'lat',
  'lng',
  'services',
  'languages',
  'day_rate_idr',
  'notes',
  'image_urls',
  'available_now',
] as const

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const update: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key]
  }

  // Validate services: cap to MAX, intersect with the canonical taxonomy.
  if (Array.isArray(update.services)) {
    const allowed = new Set(TOUR_SERVICE_IDS)
    const clean = (update.services as unknown[])
      .filter((s): s is string => typeof s === 'string' && allowed.has(s as never))
      .slice(0, MAX_TOUR_SERVICES)
    update.services = clean
  }

  if (typeof update.lat === 'number' && typeof update.lng === 'number') {
    update.location = `SRID=4326;POINT(${update.lng} ${update.lat})`
  }

  // mig 0072 universal profile extras — validate any that came in and
  // merge into the update payload. Languages are intentionally NOT in the
  // universal set for tour guides because the vertical owns its own
  // TourLanguageCode list (handled above via EDITABLE_FIELDS.languages).
  const universal = validateUniversalProfile(body as UniversalProfileBody)
  if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
  // Drop the validator's `languages` so it doesn't overwrite the vertical
  // languages already added via EDITABLE_FIELDS above.
  const { languages: _univLanguages, ...universalFields } = universal.fields as Record<string, unknown>
  void _univLanguages
  Object.assign(update, universalFields)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tour_guide_listings')
    .update(update)
    .eq('id', id)
    .select('id, status, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })

  return NextResponse.json({ ok: true, ...data })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await ctx.params

  const { data, error } = await supabase
    .from('tour_guide_listings')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })

  return NextResponse.json({ ok: true, deleted_id: data.id })
}
