import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'id','slug','display_name',
  'years_experience','bio',
  'price_wash_per_kg_idr','price_wash_dry_per_kg_idr','price_wash_iron_per_kg_idr',
  'min_kg','turnaround_hours',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
  // mig 0072 universal profile fields
  'cover_image_url','gallery_image_urls','languages',
  'instagram_url','tiktok_url','facebook_url',
  'operating_hours','certifications',
  'last_active_at','created_at',
  'subscription_status',
  // ratings surfaced on the public profile page
  'rating','rating_count',
  // mig 0087 per-profile theme accent color
  'theme_color',
  // mig 0106 feature parity with beautician (visit us + hero/promo copy)
  'has_physical_location','latitude','longitude',
  'hero_text','promo_text',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('laundry_providers')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[laundry/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: data })
}
