import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { MAX_TOUR_SERVICES, TOUR_SERVICE_IDS } from '@/data/tourServices'

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

  // Validate services: cap to MAX, intersect with the canonical taxonomy.
  if (Array.isArray(patch.services)) {
    const allowed = new Set(TOUR_SERVICE_IDS)
    const clean = (patch.services as unknown[])
      .filter((s): s is string => typeof s === 'string' && allowed.has(s as never))
      .slice(0, MAX_TOUR_SERVICES)
    patch.services = clean
  }

  if (typeof patch.lat === 'number' && typeof patch.lng === 'number') {
    ;(patch as Record<string, unknown>).location = `SRID=4326;POINT(${patch.lng} ${patch.lat})`
  }

  const { data, error } = await supabase
    .from('tour_guide_listings')
    .update(patch)
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
