import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getTrustedClientIp } from '@/lib/security/clientIp'
import type { TableInsert } from '@/lib/supabase/typed-helpers'

// ============================================================================
// POST /api/reviews
// ----------------------------------------------------------------------------
// Anonymous customer review submission. No auth required — anyone who
// has actually used the driver can leave a review on the public driver
// page. This is feedback aggregation only; the platform never represents
// that the reviewer actually completed a ride. Same legal model as
// Yelp / Google Reviews.
//
// Anti-spam (in order of stringency):
//   1. Session-cookie dedup at the DB level (unique index — migration 0013)
//   2. Per-driver-per-session rate limit (1 review per driver per session)
//   3. IP-hash rate limit (5 submissions per hour per IP across all drivers)
//   4. Minimum 1-char name, 1-5 rating, comment ≤600 chars
//
// Uses the service-role client so we can write ip_hash without exposing
// the raw IP to the browser — UU PDP compliance.
// ============================================================================

type Payload = {
  // EITHER driver_user_id (legacy driver reviews)
  driver_user_id?: string
  // OR provider_type + provider_id (polymorphic — mig 0072 / 0075)
  provider_type?: 'driver' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home_clean' | 'tour_guide' | 'bike_rental'
  provider_id?:   string
  reviewer_name: string
  reviewer_country?: string
  reviewer_whatsapp?: string
  rating: number
  comment?: string
  session_id: string  // any client-generated anonymous identifier
}

const POLY_TYPES = new Set(['driver','massage','beautician','laundry','handyman','home_clean','tour_guide','bike_rental'])
const POLY_TABLES: Record<string, string> = {
  // 'driver' covers both bike + car drivers from the unified `drivers`
  // table (vehicle_type column discriminates). DriverProfileShell sends
  // provider_type='driver' for /r/[slug] and /car/[slug] reviews.
  driver:     'drivers',
  massage:    'massage_providers',
  beautician: 'beautician_providers',
  laundry:    'laundry_providers',
  handyman:   'handyman_providers',
  home_clean: 'home_clean_providers',
  tour_guide: 'tour_guide_listings',
  bike_rental:'bike_rentals',
}

const IP_HASH_SALT = process.env.REVIEW_IP_SALT || 'cityrider-review-salt-default'
const MAX_PER_IP_PER_HOUR = 5

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + IP_HASH_SALT).digest('hex').slice(0, 32)
}

// Trusted client IP — uses x-vercel-forwarded-for, which Vercel sets
// AFTER stripping any spoofed client x-forwarded-for. Falls back through
// cf-connecting-ip then x-real-ip. See src/lib/security/clientIp.ts.
const getClientIp = getTrustedClientIp

export async function POST(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  let body: Payload
  try { body = (await req.json()) as Payload }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Identity: exactly one of (driver_user_id) OR (provider_type + provider_id).
  const hasLegacy = typeof body.driver_user_id === 'string' && body.driver_user_id.length > 0
  const hasPoly   = typeof body.provider_type === 'string' && typeof body.provider_id === 'string'
  if (hasLegacy === hasPoly) {
    return NextResponse.json({ error: 'identity_required' }, { status: 400 })
  }
  if (!body.reviewer_name || body.reviewer_name.trim().length < 1) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  if (!body.session_id || typeof body.session_id !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }
  const rating = Math.round(body.rating)
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating 1-5 required' }, { status: 400 })
  }
  let reviewerWhatsapp: string | null = null
  if (typeof body.reviewer_whatsapp === 'string' && body.reviewer_whatsapp.trim()) {
    const wa = body.reviewer_whatsapp.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) {
      return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
    }
    reviewerWhatsapp = wa
  }

  // Provider must exist + be active. Reject reviews for suspended providers.
  if (hasLegacy) {
    const { data: driver } = await admin
      .from('drivers')
      .select('user_id, status')
      .eq('user_id', body.driver_user_id!)
      .maybeSingle()
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    if (driver.status !== 'active') {
      return NextResponse.json({ error: 'Driver not currently active' }, { status: 403 })
    }
  } else {
    if (!POLY_TYPES.has(body.provider_type as string)) {
      return NextResponse.json({ error: 'invalid_provider_type' }, { status: 400 })
    }
    if (!/^[0-9a-f-]{36}$/i.test(body.provider_id as string)) {
      return NextResponse.json({ error: 'invalid_provider_id' }, { status: 400 })
    }
    const table = POLY_TABLES[body.provider_type as string]
    // `drivers` table uses `user_id` as the PK (no `id` column). Other
    // providers use `id`. Pick the right lookup column per vertical.
    const idCol = body.provider_type === 'driver' ? 'user_id' : 'id'
    const { data: prov } = await admin
      .from(table)
      .select(`${idCol}, status`)
      .eq(idCol, body.provider_id!)
      .maybeSingle()
    if (!prov) return NextResponse.json({ error: 'provider_not_found' }, { status: 404 })
    if ((prov as { status: string }).status !== 'active'
        && (prov as { status: string }).status !== 'approved') {
      return NextResponse.json({ error: 'provider_not_active' }, { status: 403 })
    }
  }

  // IP-hash rate limit: max 5 reviews per hour from one IP
  const ip = getClientIp(req)
  const ipHash = hashIp(ip)
  const { count: recentByIp } = await admin
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', new Date(Date.now() - 60 * 60_000).toISOString())
  if ((recentByIp ?? 0) >= MAX_PER_IP_PER_HOUR) {
    return NextResponse.json(
      { error: 'Too many reviews from this network in the last hour. Try again later.' },
      { status: 429 },
    )
  }

  // Insert. Unique index from migration 0013 catches duplicate session
  // submissions for the same driver (returns 23505).
  const insertRow: TableInsert<'reviews'> = {
    reviewer_name: body.reviewer_name.trim().slice(0, 60),
    reviewer_country: body.reviewer_country?.trim().slice(0, 2) || null,
    reviewer_whatsapp: reviewerWhatsapp,
    rating,
    comment: body.comment?.trim().slice(0, 250) || null,
    session_id: body.session_id,
    ip_hash: ipHash,
    status: 'visible',
    source: 'public',
  }
  if (hasLegacy) {
    insertRow.driver_user_id = body.driver_user_id
  } else {
    insertRow.provider_type = body.provider_type
    insertRow.provider_id   = body.provider_id
  }
  const { data, error } = await admin
    .from('reviews')
    .insert(insertRow)
    .select('id, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already reviewed this driver.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id, created_at: data.created_at }, { status: 201 })
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/reviews?provider_type=beautician&provider_id=<uuid>
// Public list of visible reviews for a given provider. Never returns
// session_id / ip_hash / reviewer_whatsapp — those are admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const url  = new URL(req.url)
  const type = url.searchParams.get('provider_type')
  const id   = url.searchParams.get('provider_id')
  if (!type || !POLY_TYPES.has(type)) {
    return NextResponse.json({ error: 'invalid_provider_type' }, { status: 400 })
  }
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_provider_id' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('reviews')
    .select('id, reviewer_name, rating, comment, created_at')
    .eq('provider_type', type)
    .eq('provider_id',   id)
    .eq('status',        'visible')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  return NextResponse.json({ reviews: data ?? [] })
}
