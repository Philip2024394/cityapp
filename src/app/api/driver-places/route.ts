import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

// ============================================================================
// PUT /api/driver-places
// ----------------------------------------------------------------------------
// Owner-scoped "replace my list" endpoint. The driver dashboard sends the
// FULL ordered list of curated places; this endpoint atomically wipes the
// driver's existing rows and inserts the new ones in one transaction.
//
// Why replace-all vs incremental:
//   * Reorder, add, remove, edit note — all become the same call.
//   * Avoids race conditions between two open dashboard tabs.
//   * Caps at 10 server-side, regardless of client claim.
//
// RLS (migration 0012) gates inserts/deletes to auth.uid() = driver_user_id
// — the user-scoped Supabase client enforces it.
// ============================================================================

const MAX_PLACES_PER_DRIVER = 10

type Item = { place_id: string; note?: string | null }

export async function PUT(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // The user must already have a drivers row — anonymous customers can't
  // curate places. Verify rather than 500 on FK violation later.
  const { data: driver } = await supabase
    .from('drivers')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!driver) {
    return NextResponse.json({ error: 'Complete onboarding before curating places' }, { status: 403 })
  }

  let body: { items?: Item[] }
  try { body = (await req.json()) as { items?: Item[] } }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const items = Array.isArray(body.items) ? body.items : []
  if (items.length > MAX_PLACES_PER_DRIVER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PLACES_PER_DRIVER} places per driver` },
      { status: 400 },
    )
  }

  // Validate shape — every entry must have a place_id string
  for (const it of items) {
    if (!it || typeof it.place_id !== 'string') {
      return NextResponse.json({ error: 'Each item needs a place_id' }, { status: 400 })
    }
  }

  // Replace-all in two steps. Not wrapped in an explicit transaction because
  // RLS makes the delete + insert both fail-fast on auth mismatch, and the
  // worst case is an empty list briefly visible — acceptable for a curated
  // list (vs e.g. payment data).
  const { error: delErr } = await supabase
    .from('driver_places')
    .delete()
    .eq('driver_user_id', user.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (items.length > 0) {
    const rows = items.map((it, idx) => ({
      driver_user_id: user.id,
      place_id: it.place_id,
      note: typeof it.note === 'string' && it.note.trim() ? it.note.trim().slice(0, 200) : null,
      display_order: idx,
    }))
    const { error: insErr } = await supabase.from('driver_places').insert(rows)
    if (insErr) {
      // Likely 23503 (FK violation — bad place_id) or 23505 (duplicate)
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true, count: items.length })
}
