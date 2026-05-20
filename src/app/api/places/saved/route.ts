import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/security/rateLimit'

// ============================================================================
// GET  /api/places/saved   — list this user's saved drop-off places
// POST /api/places/saved   — create a new one (max 20 per user)
// ----------------------------------------------------------------------------
// Authenticated only — anonymous customers see a signup prompt instead of
// hitting these endpoints.
//
// HARD CAP: 20 entries per user — enforced here (not via DB trigger).
// Returns 409 with a clear message when the cap is hit so the client can
// surface "delete an old one first" copy.
// ============================================================================

const MAX_PLACES_PER_USER = 20

const ALLOWED_EMOJIS = new Set([
  '📍', '🏠', '🏢', '❤️', '🏝️', '🍔', '🎓', '🛒', '⛽', '🏥', '✈️', '🚉',
])

type Row = {
  id: string
  name: string
  emoji: string
  lat: number
  lng: number
  label: string | null
  display_order: number
  created_at: string
}

export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // User-scoped client respects RLS — no need for admin. Return rows
  // ordered by display_order then created_at so the user's manual
  // ordering wins, with newest first as the tie-breaker.
  const { data, error } = await userClient
    .from('customer_saved_places')
    .select('id, name, emoji, lat, lng, label, display_order, created_at')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ places: (data ?? []) as Row[] })
}

type CreateBody = {
  name?: string
  emoji?: string
  lat?: number
  lng?: number
  label?: string | null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Per-user throttle. Saving a place is a deliberate one-off action;
  // 10/min is way more than legitimate use, blocks runaway loops.
  const limit = rateLimit(`saved-place:${user.id}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many saves — try again in a minute' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } },
    )
  }

  let body: CreateBody
  try { body = (await req.json()) as CreateBody } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 30) : ''
  const emoji = typeof body.emoji === 'string' && ALLOWED_EMOJIS.has(body.emoji) ? body.emoji : '📍'
  const lat = typeof body.lat === 'number' ? body.lat : NaN
  const lng = typeof body.lng === 'number' ? body.lng : NaN
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : null

  if (name.length < 1) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!Number.isFinite(lat) || lat < -11 || lat > 6) {
    return NextResponse.json({ error: 'lat out of Indonesia bounds' }, { status: 400 })
  }
  if (!Number.isFinite(lng) || lng < 95 || lng > 142) {
    return NextResponse.json({ error: 'lng out of Indonesia bounds' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Count check — use admin client to bypass RLS for the COUNT query
  // (RLS would still permit it, but admin is faster — no policy eval).
  const { count } = await admin
    .from('customer_saved_places')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_PLACES_PER_USER) {
    return NextResponse.json(
      { error: `You've hit the ${MAX_PLACES_PER_USER}-place limit. Delete one first.` },
      { status: 409 },
    )
  }

  const { data, error } = await userClient
    .from('customer_saved_places')
    .insert({ user_id: user.id, name, emoji, lat, lng, label })
    .select('id, name, emoji, lat, lng, label, display_order, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ place: data as Row })
}
