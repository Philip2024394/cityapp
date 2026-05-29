import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { CATEGORY_CONFIGS, type CategoryId, type CategoryConfig } from '@/lib/dashboard/categories'

// ============================================================================
// /api/dashboard/[category] — generic load + patch for the shared
// ProviderDashboard. The category param picks the right table + column
// mapping from CATEGORY_CONFIGS so the editor UI stays category-agnostic.
//
// GET    → returns { row: object | null } for the signed-in user's listing
// PATCH  → accepts { patch: object } and applies it after column allowlist
//          check (only canonical columns from the config are writable here)
// ----------------------------------------------------------------------------
// Existing per-category endpoints (eg. /api/beautician/me) are NOT
// retired by this route; they keep working. New mounts using the shared
// component point here instead.
// ============================================================================

const WRITABLE_TOP_LEVEL = new Set<string>([
  // Identity / display
  'display_name', 'business_name', 'bio', 'name', 'owner_name', 'owner_company',
  // Media
  'cover_image_url', 'profile_image_url',
  'image_urls', 'gallery_image_urls',
  // WYSIWYG / hero
  'hero_text', 'promo_text', 'theme_color',
  // Social
  'instagram_url', 'tiktok_url', 'facebook_url',
  // Service catalogue
  'services_offered', 'services', 'specialties', 'massage_type',
  'category', 'bike_type', 'property_type', 'listing_type',
  // Pricing — beautician
  'price_makeup_idr', 'price_nail_idr', 'price_hair_idr',
  // Pricing — massage
  'price_60min_idr', 'price_90min_idr', 'price_120min_idr',
  // Pricing — laundry
  'price_wash_per_kg_idr', 'price_wash_dry_per_kg_idr', 'price_wash_iron_per_kg_idr',
  'min_kg', 'turnaround_hours',
  // Pricing — handyman / home-clean
  'hourly_rate_idr', 'day_rate_idr',
  // Pricing — tour
  'tour_3h_idr', 'tour_6h_idr', 'tour_8h_idr',
  // Pricing — rent
  'daily_price_idr', 'weekly_price_idr', 'monthly_price_idr', 'security_deposit_idr',
  // Pricing — property
  'price_idr', 'daily_rent_idr', 'weekly_rent_idr', 'monthly_rent_idr', 'deposit_idr',
  // Service photos
  'service_photos',
  // Locality / hours
  'operating_hours', 'hours_json', 'address', 'city',
  'lat', 'lng', 'latitude', 'longitude',
  // Universal extras
  'languages', 'certifications', 'service_locations',
  'has_physical_location', 'busy_dates',
  // Category-specific toggles
  'fuel_included', 'bike_brand', 'free_delivery', 'cuisine_types', 'tags',
  'has_own_tools', 'has_own_supplies', 'eco_friendly', 'team_size',
  'dietary_tags', 'price_tier',
  // Property-specific
  'bedrooms', 'bathrooms', 'land_size_sqm', 'building_size_sqm', 'floors',
  'certificate_type', 'facing_direction', 'year_built', 'furnished',
  'parking_cars', 'parking_bikes', 'has_pool', 'has_garden',
  'electricity_va', 'water_source',
  'kpr_eligible', 'accepted_banks', 'flood_zone', 'transit_score',
  'drone_url', 'virtual_tour_url', 'video_url',
  'expat_friendly', 'leasehold_years_remaining',
  'price_negotiable', 'price_on_request', 'min_lease_months',
  'kelurahan', 'kecamatan',
  // Property Builder (new_construction)
  'starting_price_idr', 'completion_date', 'units_total', 'units_available',
  'developer_name', 'nup_idr',
])

function getConfig(category: string): CategoryConfig | null {
  if (!(category in CATEGORY_CONFIGS)) return null
  return CATEGORY_CONFIGS[category as CategoryId]
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>

async function authedUserId(): Promise<{ supabase: SupabaseClient, userId: string } | { error: string, status: number }> {
  const supabase = await getServerSupabase()
  if (!supabase) return { error: 'No supabase client', status: 500 }
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return { error: 'Unauthorized', status: 401 }
  return { supabase, userId: data.user.id }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params
  const cfg = getConfig(category)
  if (!cfg) return NextResponse.json({ error: 'Unknown category' }, { status: 400 })

  const auth = await authedUserId()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth

  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ row: data ?? null })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params
  const cfg = getConfig(category)
  if (!cfg) return NextResponse.json({ error: 'Unknown category' }, { status: 400 })

  const auth = await authedUserId()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth

  let body: { patch?: Record<string, unknown> } | null = null
  try { body = await req.json() } catch { /* ignore */ }
  const patch = body?.patch ?? {}
  if (typeof patch !== 'object' || patch === null) {
    return NextResponse.json({ error: 'Bad patch' }, { status: 400 })
  }

  // Column allowlist — only columns we explicitly expose to the dashboard
  // editor surface are writable here. Stops a malicious client from
  // updating subscription_status, paid_until, verified_at, etc.
  const sanitised: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (WRITABLE_TOP_LEVEL.has(k)) sanitised[k] = v
  }
  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: 'No writable fields in patch' }, { status: 400 })
  }
  sanitised.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from(cfg.table)
    .update(sanitised)
    .eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
