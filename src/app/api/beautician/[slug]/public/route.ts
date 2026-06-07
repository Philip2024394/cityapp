import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'id','slug','display_name',
  // owner_user_id is the auth.users.id of whoever owns this profile.
  // Exposed publicly (read-only) so the addon panels (e.g. /add-ons Q&A
  // public render) can scope their query to "this provider's items".
  'owner_user_id',
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
  // mig 0130 — extra socials + custom domain
  'x_url','snapchat_url','website_url',
  // mig 0131 — country (drives currency + WA prefix) + custom services
  'country_code','custom_services_offered',
  // mig 0132 — chat handles
  'telegram_handle','wechat_id','line_id','kakaotalk_id',
  // mig 0137 — contact form opt-in
  'contact_form_enabled','contact_email',
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
  // mig 0085 self-marked busy dates for the customer date picker
  'busy_dates',
  // mig 0086 service locations (home / hotel / villa subset)
  'service_locations',
  // mig 0190 Visit Us → CityDrivers ride card opt-in
  'visit_us_enabled',
  // mig 0140 primary CTA button animation
  'cta_button_effect',
  // mig 0141 animated avatar frame style
  'avatar_frame_style',
  // mig 0142 — payment provider (drives cart/checkout CTA on public profile)
  'payment_provider',
  // mig 0142 — vendor-authored FAQ + legal copy. FAQ accordion renders
  // above the contact form when faq_enabled is true. Terms / Privacy
  // surface as footer links + an in-page modal viewer.
  'faq_items','faq_enabled','legal_terms','legal_privacy',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  // status='active' gate intentionally omitted — KTP verification was
  // removed (see project_indocity_no_ktp_required memory). The app
  // belongs to the user; their profile is renderable as soon as they
  // create it, no admin approval step.
  const { data, error } = await admin
    .from('beautician_providers')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[beautician/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: data })
}
