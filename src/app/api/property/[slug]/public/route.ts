import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Mirrors /api/beautician/[slug]/public — public-safe columns of a
// property listing, filtered to active+visible rows. Response shape
// `{ provider }` keeps parity with the beautician endpoint so the
// shared profile page code can stay close to symmetrical.

const PUBLIC_COLS = [
  'id','slug','display_name','business_name','bio',
  'listing_type','property_type',
  'city','address','kelurahan','kecamatan',
  'latitude','longitude',
  // Sale pricing
  'price_idr','price_negotiable','price_on_request',
  // Rent pricing
  'daily_rent_idr','weekly_rent_idr','monthly_rent_idr','deposit_idr','min_lease_months',
  // Builder pricing
  'starting_price_idr','nup_idr','units_total','units_available',
  'developer_name','completion_date',
  // Property facts
  'bedrooms','bathrooms','land_size_sqm','building_size_sqm','floors',
  'certificate_type','facing_direction','year_built','furnished',
  'parking_cars','parking_bikes','has_pool','has_garden',
  'electricity_va','water_source',
  // Differentiators
  'kpr_eligible','accepted_banks','flood_zone','expat_friendly',
  'leasehold_years_remaining',
  'drone_url','virtual_tour_url','video_url',
  // Universal profile fields
  'cover_image_url','profile_image_url','gallery_image_urls','image_urls',
  'hero_text','promo_text','theme_color','service_photos',
  'instagram_url','tiktok_url','facebook_url',
  // mig 0135 — property-only backfill of the mig 0130 social/web URLs
  'x_url','snapchat_url','website_url',
  'operating_hours',
  'whatsapp_e164',
  // mig 0135 — property-only backfill of the mig 0132 chat handles
  'telegram_handle','wechat_id','line_id','kakaotalk_id',
  'rating','rating_count',
  // Compliance
  'agent_license_no','verified',
  'subscription_status',
  'created_at','last_active_at',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('property_listings')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[property/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: data })
}
