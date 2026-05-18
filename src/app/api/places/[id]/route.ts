import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

// ============================================================================
// PATCH /api/places/[id]
// ----------------------------------------------------------------------------
// Owner-scoped edit endpoint. Distinct from /api/admin/places/[id], which is
// for moderation actions (approve/reject/mark_paid/etc.) and runs as
// service-role.
//
// This endpoint:
//   * Authenticates the request via the user's cookie session
//   * Uses the user-scoped Supabase client so RLS enforces
//     `owner_user_id = auth.uid()` on the UPDATE
//   * Whitelists editable fields — moderation columns (status, paid_until,
//     listing_tier, verified, rejection_note) are NEVER accepted here
//   * Returns the updated row so the dashboard can refresh state
//
// Migration 0011 added RLS policies + a WITH CHECK clause that enforces the
// moderation-column freeze at the DB level as a defense-in-depth measure.
// ============================================================================

const EDITABLE_FIELDS = [
  'name',
  'description',
  'image_urls',
  'address',
  'lat',
  'lng',
  'whatsapp_e164',
  'tags',
  'opening_hours',
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

  // Whitelist — silently drop any keys not in EDITABLE_FIELDS so a client
  // cannot smuggle status/paid_until/etc. into the patch.
  const patch: Partial<Record<EditableField, unknown>> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  // If lat/lng changed, recompute the PostGIS location point so spatial
  // queries stay consistent.
  if (typeof patch.lat === 'number' && typeof patch.lng === 'number') {
    ;(patch as Record<string, unknown>).location = `SRID=4326;POINT(${patch.lng} ${patch.lat})`
  }

  // The user-scoped client runs the UPDATE through RLS, so the row is only
  // touched if owner_user_id = auth.uid(). Returning .select() so we can
  // confirm 1 row affected (otherwise the patch was silently dropped by RLS).
  const { data, error } = await supabase
    .from('places')
    .update(patch)
    .eq('id', id)
    .select('id, status, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })

  return NextResponse.json({ ok: true, ...data })
}
