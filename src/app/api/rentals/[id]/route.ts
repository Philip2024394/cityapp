import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

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

type EditableField = (typeof EDITABLE_FIELDS)[number]

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const patch: Partial<Record<EditableField, unknown>> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  if (typeof patch.lat === 'number' && typeof patch.lng === 'number') {
    ;(patch as Record<string, unknown>).location = `SRID=4326;POINT(${patch.lng} ${patch.lat})`
  }

  const { data, error } = await supabase
    .from('bike_rentals')
    .update(patch)
    .eq('id', id)
    .select('id, status, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })

  return NextResponse.json({ ok: true, ...data })
}
