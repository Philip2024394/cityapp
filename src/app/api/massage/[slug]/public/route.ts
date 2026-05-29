import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/massage/[slug]/public — single-provider lookup for the public
// detail page. Returns only marketplace-safe columns; never KTP.

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'id','slug','display_name',
  'gender','years_experience','bio',
  'massage_type',
  'price_60min_idr','price_90min_idr','price_120min_idr',
  'city','service_area_notes',
  'whatsapp_e164',
  'profile_image_url',
  'availability',
  'is_mock',
  // mig 0072 universal profile fields
  'cover_image_url','gallery_image_urls','languages',
  'instagram_url','tiktok_url','facebook_url',
  // mig 0130 — extra socials + custom domain
  'x_url','snapchat_url','website_url',
  // mig 0132 — chat handles
  'telegram_handle','wechat_id','line_id','kakaotalk_id',
  // mig 0137 — contact form opt-in
  'contact_form_enabled','contact_email',
  'operating_hours','certifications',
  'last_active_at','created_at',
  'subscription_status',
  // ratings (mocked on demo cards until reviews ship)
  'rating','rating_count',
  // mig 0087 per-provider theme accent color
  'theme_color',
  // mig 0088 service locations + optional physical studio coordinates
  'service_locations',
  'has_physical_location','latitude','longitude',
  // mig 0104 — beautician-parity feature columns
  'hero_text','promo_text','busy_dates','service_photos','marketplace_categories',
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
    .from('massage_providers')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    // status='active' gate removed — KTP verification gone (see
    // project_indocity_no_ktp_required memory). Profile is direct-link.
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ provider: data })
}
