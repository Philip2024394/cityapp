// ============================================================================
// POST /api/connect-intent — log a customer's WhatsApp-button tap and
// notify the driver via Supabase Realtime broadcast + web push.
// ----------------------------------------------------------------------------
// Called by the fireConnectIntent() helper on /cari, /r/[slug], /car/[slug]
// BEFORE the customer's browser redirects to wa.me. We intentionally
// store NO conversation content, NO pickup/dropoff, NO fare. This is a
// heads-up — see 0146_connection_intent.sql for the regulatory rationale.
//
// Pipeline:
//   1. Validate driver_id + source
//   2. Hash the client IP with a day-salt for analytics dedup (no raw IP)
//   3. Insert connection_intent row
//   4. Broadcast on channel `driver:<id>` event 'inbound_intent' so the
//      driver's open PWA pops the modal + plays audio
//   5. Send VAPID web push to every registered device for that driver so
//      the driver's backgrounded/closed PWA also wakes
// ============================================================================

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { sendDriverWebPush } from '@/lib/push/sendWebPush'
import { rateLimit } from '@/lib/security/rateLimit'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

const VALID_SOURCES = new Set([
  'cari',
  'rider_profile', 'car_profile',
  'beautician_profile', 'handyman_profile', 'laundry_profile',
  'massage_profile', 'home_clean_profile', 'tour_profile',
  'facial_profile', 'skincare_profile', 'rentals_profile',
  'property_profile', 'places_profile', 'bus_profile',
  'other',
])

const VALID_VERTICALS = new Set([
  'rider', 'car',
  'beautician', 'handyman', 'laundry', 'massage', 'home-clean',
  'tour-guide', 'facial', 'skincare', 'rentals', 'property', 'places',
])

// Verticals whose primary id IS the auth.users.id (i.e. drivers table
// uses user_id as PK). The route accepts driver_id as auth.users.id
// directly for these.
const DIRECT_USER_ID_VERTICALS = new Set(['rider', 'car'])

// For every other vertical, the customer-side page exposes the LISTING
// PK as `p.id`. The route resolves listing_id → user_id by querying the
// appropriate per-vertical table.
const VERTICAL_LISTING_TABLE: Record<string, string> = {
  beautician:   'beautician_providers',
  handyman:     'handyman_providers',
  laundry:      'laundry_providers',
  massage:      'massage_providers',
  'home-clean': 'home_clean_providers',
  'tour-guide': 'tour_guide_listings',
  facial:       'facial_providers',
  skincare:     'skincare_providers',
  rentals:      'bike_rentals',
  property:     'property_listings',
}

function hashIpForDay(ip: string): string {
  const dayUtc = new Date().toISOString().slice(0, 10)
  return crypto.createHash('sha256').update(`${ip}|${dayUtc}`).digest('hex').slice(0, 32)
}

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || ''
}

export async function POST(req: Request) {
  let body: { driver_id?: unknown; source?: unknown; vertical?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const driverId = typeof body.driver_id === 'string' ? body.driver_id.trim() : ''
  const source   = typeof body.source === 'string' ? body.source : 'other'
  const vertical = typeof body.vertical === 'string' ? body.vertical : ''
  if (!driverId)                      return NextResponse.json({ error: 'missing_driver_id' }, { status: 400 })
  if (!VALID_SOURCES.has(source))     return NextResponse.json({ error: 'bad_source' }, { status: 400 })
  if (!VALID_VERTICALS.has(vertical)) return NextResponse.json({ error: 'bad_vertical' }, { status: 400 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  // Resolve providerUserId.
  //
  // car/rider: driverId is already the auth.users.id (drivers.user_id is PK).
  //
  // Service verticals: driverId is usually the listing PK. We look up
  // user_id from the per-vertical table. If no row found (or the
  // vertical reuses the drivers table — RentalProfileShell does, with
  // `id = user_id` already), we fall back to treating driverId as the
  // user_id directly. UUID collision between tables is effectively zero.
  let providerUserId = driverId
  if (!DIRECT_USER_ID_VERTICALS.has(vertical)) {
    const table = VERTICAL_LISTING_TABLE[vertical]
    if (table) {
      const { data: row } = await admin
        .from(table)
        .select('user_id')
        .eq('id', driverId)
        .maybeSingle()
      const resolved = row?.user_id as string | null | undefined
      if (resolved) providerUserId = resolved
      // else: fall through with driverId as-is (covers RentalProfileShell
      // and any mock listing whose user_id is null).
    }
  }

  const ip        = getClientIp(req)
  const ipHash    = ip ? hashIpForDay(ip) : null
  const userAgent = req.headers.get('user-agent')?.slice(0, 256) ?? null

  // Rate limit per (ip-hash, driver): one tap per 60 seconds. Without this,
  // a hostile client could spam a driver with audio + vibration modals
  // until their browser tab locks up. We still return 204 (not 429) so
  // legitimate rapid double-taps from a confused customer don't surface
  // as scary errors; the customer's wa.me redirect goes through either
  // way, the driver just isn't re-alerted.
  const rateKey = `intent:${ipHash ?? 'anon'}:${providerUserId}`
  const rl = rateLimit(rateKey, 1, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ ok: true, deduplicated: true }, { status: 200 })
  }

  await admin
    .from('connection_intent')
    .insert({
      driver_id:   providerUserId,
      source,
      vertical,
      ip_hash:     ipHash,
      user_agent:  userAgent,
    })

  // Realtime broadcast — provider PWA listens on this exact channel.
  // Channel name stays `driver:<id>` for historical reasons (CityDrivers
  // shipped first); the BookingAlertProvider component used by every
  // vertical subscribes to the same name.
  try {
    const channel = admin.channel(`driver:${providerUserId}`)
    await channel.send({
      type:    'broadcast',
      event:   'inbound_intent',
      payload: { source, vertical, at: new Date().toISOString() },
    })
    await admin.removeChannel(channel)
  } catch {
    // realtime is best-effort; the row is the source of truth.
  }

  // Web push to backgrounded/closed devices — fire-and-forget.
  sendDriverWebPush(admin, providerUserId, {
    title: 'CityDrivers — incoming WhatsApp',
    body:  'A customer just tapped your WhatsApp button.',
    tag:   'inbound_intent',
    url:   '/dashboard',
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
