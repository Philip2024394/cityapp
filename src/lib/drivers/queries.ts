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
import type { DriverRow, AvailabilityState } from '@/types/database'
import type { Rider, ServiceType } from '@/types/rider'

// Map a Supabase drivers.row → legacy Rider shape used across the app.
export function driverRowToRider(row: DriverRow): Rider {
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
    subscriptionStatus: 'active',
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
    .select('*')
    .eq('status', 'active')
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(50)
  if (error || !data || data.length === 0) {
    if (error) console.warn('[drivers] fetchActiveDrivers failed:', error.message)
    return MOCK_RIDERS
  }
  return (data as DriverRow[]).map(driverRowToRider)
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
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.warn('[drivers] fetchDriverBySlug failed:', error.message)
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  if (!data) return null
  return driverRowToRider(data as DriverRow)
}

// ============================================================================
// Current authenticated independent rider (dashboard, profile editor)
// ============================================================================
export async function fetchMyDriverBrowser(): Promise<Rider | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle()
  if (error || !data) return null
  return driverRowToRider(data as DriverRow)
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
