import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'id','slug','display_name',
  'gender','years_experience','bio',
  'price_makeup_idr','price_nail_idr','price_hair_idr',
  'city','service_area_notes',
  'whatsapp_e164',
  'profile_image_url',
  'availability',
  'is_mock',
  // mig 0072 universal profile fields
  'cover_image_url','gallery_image_urls','languages',
  'instagram_url','tiktok_url','facebook_url',
  'operating_hours','certifications',
  'last_active_at','created_at',
  'subscription_status',
  // mig 0073 services offered catalog
  'services_offered',
  // mig 0074 per-service photo gallery
  'service_photos',
  // mig 0077 primary marketplace categories
  'marketplace_categories',
  // mig 0078 per-profile theme accent color
  'theme_color',
  // mig 0079 Visit Us physical location (opt-in)
  'has_physical_location','latitude','longitude',
  // mig 0081 hero text customisation
  'hero_text',
  // mig 0082 running marquee promo text
  'promo_text',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('beautician_providers')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[beautician/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: data })
}
