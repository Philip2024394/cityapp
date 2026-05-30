import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// =============================================================================
// GET /api/kita/handle-check?h=<handle>
//
// Used by the KitaSignupPopup to live-check a desired handle. Validates the
// handle server-side (never trust the client regex), checks against the
// reserved list, then probes every table that owns a public slug. We probe
// all vertical tables (drivers + each *_providers + bike_rentals +
// property_listings + places) because in Phase 1 a creator may land their
// handle in any of them depending on which vertical they pick at signup.
//
// Response shape (always 200 unless the param is missing):
//   { available: true }
//   { available: false, suggestion: "alice-2" }
//   { available: false, error: "invalid" | "reserved" }
// =============================================================================

// Anchors enforce no leading/trailing hyphen. 3–24 chars inclusive: the
// inner group is 1–22 chars + 2 anchored chars = 3–24 total.
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])?$/

const RESERVED = new Set([
  'admin', 'support', 'api', 'dashboard', 'signup', 'login', 'cari',
  'cityriders', 'places', 'kita2u', 'beautician', 'handyman', 'laundry',
  'massage', 'home-clean', 'facial', 'skincare', 'tour', 'tour-guide',
  'car', 'truck', 'r', 'bus', 'food', 'drivers', 'business', 'explore',
  'dev', 'www', 'mail', 'help', 'contact', 'about', 'terms', 'privacy',
])

// Tables that share the public-slug namespace. If a handle collides in any
// of them, we treat it as taken so two creators can't claim the same URL.
const SLUG_TABLES = [
  'drivers',
  'beautician_providers',
  'handyman_providers',
  'laundry_providers',
  'massage_providers',
  'home_clean_providers',
  'facial_providers',
  'skincare_providers',
  'tour_guide_providers',
  'bike_rentals',
  'property_listings',
  'places',
] as const

async function isTaken(admin: ReturnType<typeof getAdminSupabase>, slug: string): Promise<boolean> {
  if (!admin) return false
  for (const table of SLUG_TABLES) {
    const { data, error } = await admin
      .from(table)
      .select('slug')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    // Tables that don't exist in this env throw — swallow silently so the
    // route stays resilient across schema drift between envs.
    if (error && error.code !== 'PGRST116') continue
    if (data) return true
  }
  return false
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = (url.searchParams.get('h') ?? '').trim().toLowerCase()
  if (!raw) return NextResponse.json({ available: false, error: 'missing' }, { status: 400 })

  if (!HANDLE_RE.test(raw)) {
    return NextResponse.json({ available: false, error: 'invalid' })
  }
  if (RESERVED.has(raw)) {
    return NextResponse.json({ available: false, error: 'reserved' })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    // Service role missing in this env — fail open with available=false
    // rather than leak a server config error to the client. The signup
    // page revalidates server-side anyway.
    return NextResponse.json({ available: false, error: 'unavailable' })
  }

  const taken = await isTaken(admin, raw)
  if (!taken) return NextResponse.json({ available: true })

  // Suggest the first numeric variant that isn't already taken. Cap at
  // +5 tries so we don't fan out into a chain of DB hits per request.
  for (let i = 2; i <= 6; i++) {
    const candidate = `${raw}-${i}`
    if (candidate.length > 24) break
    // eslint-disable-next-line no-await-in-loop
    const alt = await isTaken(admin, candidate)
    if (!alt) return NextResponse.json({ available: false, suggestion: candidate })
  }
  return NextResponse.json({ available: false })
}
