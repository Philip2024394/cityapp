import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getTrustedClientIp } from '@/lib/security/clientIp'

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
  driver_user_id: string
  reviewer_name: string
  reviewer_country?: string
  rating: number
  comment?: string
  session_id: string  // any client-generated anonymous identifier
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

  // Basic shape validation
  if (!body.driver_user_id || typeof body.driver_user_id !== 'string') {
    return NextResponse.json({ error: 'driver_user_id required' }, { status: 400 })
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

  // Driver must exist + be active. Reject reviews for suspended drivers.
  const { data: driver } = await admin
    .from('drivers')
    .select('user_id, status')
    .eq('user_id', body.driver_user_id)
    .maybeSingle()
  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
  if (driver.status !== 'active') {
    return NextResponse.json({ error: 'Driver not currently active' }, { status: 403 })
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
  const { data, error } = await admin
    .from('reviews')
    .insert({
      driver_user_id: body.driver_user_id,
      reviewer_name: body.reviewer_name.trim().slice(0, 60),
      reviewer_country: body.reviewer_country?.trim().slice(0, 2) || null,
      rating,
      comment: body.comment?.trim().slice(0, 600) || null,
      session_id: body.session_id,
      ip_hash: ipHash,
      status: 'visible',
      source: 'public',
    })
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
