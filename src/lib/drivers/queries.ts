// ============================================================================
// Independent-rider data fetchers — BROWSER-SAFE
// ============================================================================
// Wraps Supabase queries and exposes them in the legacy `Rider` shape used
// by the UI so existing pages don't need to be restructured.
//
// When Supabase isn't configured, falls back to MOCK_RIDERS so the dev
// server still works in demo mode.
//
// IMPORTANT: this module must stay browser-safe. Server-only helpers live
// in queries.server.ts.
// ============================================================================

import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { MOCK_RIDERS } from '@/data/mockRiders'
import type { DriverRow, AvailabilityState, SubscriptionStatus } from '@/types/database'
import type { Rider, ServiceType } from '@/types/rider'

// Minimal subscription shape used to derive what customers see on the
// public driver pages. Trial / period dates are factored in here so a
// row stuck on status='trial' with an expired trial_ends_at still maps
// to past_due (drivers stop appearing as bookable).
type SubInfo = {
  status: SubscriptionStatus | null
  trial_ends_at: string | null
  current_period_end: string | null
} | null

function effectiveSubStatus(sub: SubInfo): SubscriptionStatus {
  if (!sub || !sub.status) return 'past_due'
  const now = Date.now()
  if (sub.status === 'trial') {
    const t = sub.trial_ends_at ? Date.parse(sub.trial_ends_at) : NaN
    return Number.isFinite(t) && t < now ? 'past_due' : 'trial'
  }
  if (sub.status === 'active') {
    const e = sub.current_period_end ? Date.parse(sub.current_period_end) : NaN
    return Number.isFinite(e) && e < now ? 'past_due' : 'active'
  }
  return sub.status
}

// Row shape with embedded subscription via PostgREST. Supabase's join
// helper can return either a single row or an array depending on the
// detected cardinality; handle both.
type DriverRowWithSub = DriverRow & {
  subscriptions?: SubInfo | SubInfo[] | null
}

function pickSub(row: DriverRowWithSub): SubInfo {
  const s = row.subscriptions
  if (!s) return null
  if (Array.isArray(s)) return s[0] ?? null
  return s
}

// Map a Supabase drivers.row → legacy Rider shape used across the app.
export function driverRowToRider(row: DriverRow, sub: SubInfo = null): Rider {
  const services = (row.services || []) as ServiceType[]
  return {
    id: row.user_id,
    slug: row.slug,
    name: row.business_name,
    photoUrl: row.brand_logo_url || `https://i.pravatar.cc/300?u=${row.slug}`,
    whatsappE164: row.whatsapp_e164,
    bio: row.bio || '',
    area: row.area || '',
    city: row.city || '',
    services,
    bike: {
      make: row.bike_make || '',
      model: row.bike_model || '',
      year: row.bike_year || 0,
      color: row.bike_color || '',
      type: (row.bike_type || 'matic') as 'matic' | 'sport' | 'manual',
      cc: row.bike_cc ?? undefined,
      plate: row.bike_plate ?? undefined,
      hasBox: row.has_box,
    },
    pricePerKm: row.price_per_km,
    minFee: row.min_fee,
    pitstopFee: row.pitstop_fee,
    isOnline: row.availability === 'online',
    availability: row.availability,
    lastSeenAt: row.last_active_at || row.updated_at,
    lat: row.current_lat ?? row.service_zone_center_lat ?? 0,
    lng: row.current_lng ?? row.service_zone_center_lng ?? 0,
    subscriptionStatus: effectiveSubStatus(sub),
    rating: row.rating ?? undefined,
    trips: row.trips_count,
  } as Rider & { availability: AvailabilityState }
}

// ============================================================================
// List of active independent riders (discovery page)
// ============================================================================
export async function fetchActiveDriversBrowser(): Promise<Rider[]> {
  if (!isSupabaseConfigured()) return MOCK_RIDERS
  const supabase = getBrowserSupabase()
  if (!supabase) return MOCK_RIDERS
  const { data, error } = await supabase
    .from('drivers')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('status', 'active')
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(50)
  if (error || !data || data.length === 0) {
    if (error) console.warn('[drivers] fetchActiveDrivers failed:', error.message)
    return MOCK_RIDERS
  }
  // Filter out past_due / canceled subs before returning — the
  // marketplace must not show riders whose billing has lapsed, even
  // if drivers.status is still 'active'. Suspension is rare; the
  // billing wall is the load-bearing gate.
  return (data as DriverRowWithSub[])
    .map((row) => driverRowToRider(row, pickSub(row)))
    .filter((r) => r.subscriptionStatus !== 'past_due' && r.subscriptionStatus !== 'canceled')
}

// ============================================================================
// Single rider by slug (public profile page)
// ============================================================================
export async function fetchDriverBySlugBrowser(slug: string): Promise<Rider | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  const supabase = getBrowserSupabase()
  if (!supabase) return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  const { data, error } = await supabase
    .from('drivers')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.warn('[drivers] fetchDriverBySlug failed:', error.message)
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  if (!data) return null
  const row = data as DriverRowWithSub
  return driverRowToRider(row, pickSub(row))
}

// ============================================================================
// Current authenticated independent rider (dashboard, profile editor)
// ============================================================================
export async function fetchMyDriverBrowser(): Promise<Rider | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('drivers')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null
  const row = data as DriverRowWithSub
  return driverRowToRider(row, pickSub(row))
}

// Raw DriverRow for the authenticated rider — used where the UI needs
// fields outside the legacy Rider shape (payment methods, QR URL, etc.).
export async function fetchMyDriverRowBrowser(): Promise<DriverRow | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle()
  if (error || !data) return null
  return data as DriverRow
}
