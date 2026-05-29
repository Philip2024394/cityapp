import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'id','slug','display_name','years_experience','bio',
  'specialties','hourly_rate_idr','day_rate_idr','has_own_tools',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
  'rating','rating_count',
  // mig 0072 universal profile fields
  'cover_image_url','gallery_image_urls','languages',
  'instagram_url','tiktok_url','facebook_url',
  // mig 0130 — extra socials + custom domain
  'x_url','snapchat_url','website_url',
  // mig 0132 — chat handles
  'telegram_handle','wechat_id','line_id','kakaotalk_id',
  'operating_hours','certifications',
  'last_active_at','created_at',
  'subscription_status',
  // mig 0087 — per-provider accent
  'theme_color',
  // mig 0089 — profile parity fields
  'promo_text','service_photos','busy_dates',
  'has_physical_location','latitude','longitude',
  // mig 0091 — customisable hero overlay text
  'hero_text',
  // mig 0131 — country + custom services
  'country_code','custom_services_offered',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })
  const { data, error } = await admin
    .from('handyman_providers')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[handyman/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: data })
}
