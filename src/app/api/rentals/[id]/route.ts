import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'

// ============================================================================
// PATCH /api/rentals/[id]
// ----------------------------------------------------------------------------
// Owner-scoped edit endpoint for bike_rentals rows. Mirrors /api/places/[id]:
// authed user, RLS enforces owner_user_id = auth.uid(), whitelist of safe
// fields, moderation columns frozen.
// ============================================================================

const EDITABLE_FIELDS = [
  'brand',
  'model',
  'year',
  'cc',
  'transmission',
  'color',
  'description',
  'image_urls',
  'daily_price_idr',
  'weekly_price_idr',
  'monthly_price_idr',
  'security_deposit_idr',
  'driver_rate_per_day_idr',
  'helmet_count',
  'raincoat_count',
  'has_phone_holder',
  'has_phone_charger',
  'has_delivery_box',
  'ready_to_work',
  'delivers_to_hotel',
  'delivers_to_villa',
  'pickup_dropoff',
  'rental_mode',
  'address',
  'lat',
  'lng',
  'owner_name',
  'owner_company',
  'owner_whatsapp_e164',
  'owner_languages',
  'owner_response_time_min',
  'available_now',
  'tags',
  'submitted_name',
  'submitted_email',
  'submitted_whatsapp',
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

  // mig 0072 universal profile extras — validated centrally so every
  // vertical applies the same URL / hours / certifications rules.
  // bike_rentals NEVER accepts `gallery_image_urls` here: the existing
  // `image_urls` column already owns the photo grid for this vertical.
  const universal = validateUniversalProfile(body)
  if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
  const { gallery_image_urls: _ignore, ...universalFields } = universal.fields as Record<string, unknown>
  void _ignore
  Object.assign(update, universalFields)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  if (typeof update.lat === 'number' && typeof update.lng === 'number') {
    update.location = `SRID=4326;POINT(${update.lng} ${update.lat})`
  }

  const { data, error } = await supabase
    .from('bike_rentals')
    .update(update)
    .eq('id', id)
    .select('id, status, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })

  return NextResponse.json({ ok: true, ...data })
}

// ============================================================================
// DELETE /api/rentals/[id]
// ----------------------------------------------------------------------------
// Owner removes their own listing. RLS (migration 0040) restricts to rows
// where owner_user_id = auth.uid() — passing the wrong id returns "not
// found or not yours" with no row leak.
// ============================================================================
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await ctx.params

  const { data, error } = await supabase
    .from('bike_rentals')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })

  return NextResponse.json({ ok: true, deleted_id: data.id })
}
