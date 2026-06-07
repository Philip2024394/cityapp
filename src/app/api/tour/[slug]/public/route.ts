// Mirror of /api/beautician/[slug]/public/route.ts adapted for
// tour_guide_listings with mock_tour_guide_listings fallback. Reads the
// real table first (status='approved' per mig 0037 policy
// tgl_public_read_approved), and falls back to mock_tour_guide_listings
// rows where mock_hidden_at IS NULL (mig 0052 policy mock_tour_guide_public_read).
// The response shape — { provider: row } — matches beautician so the
// /tour/[slug] page can be ported off the browser supabase client without
// touching its render code.
import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Columns selected from public.tour_guide_listings. Every entry is verified
// against the migration that introduced it (see comment for source). The
// table stores coordinates as lat/lng (mig 0037) NOT latitude/longitude;
// those columns are intentionally NOT selected.
const REAL_COLS = [
  // mig 0037 — base identity / location / listing payload
  'id','slug','name','whatsapp_e164','email','owner_user_id',
  'city','address','lat','lng',
  'services','languages','day_rate_idr','notes','image_urls',
  'rating','review_count','available_now',
  // mig 0053 — fuel disclosure
  'fuel_included',
  // mig 0054 — availability badge (online / busy / offline)
  'availability',
  // mig 0055 — owner's bike brand
  'bike_brand',
  // mig 0072 — universal profile fields
  'cover_image_url','gallery_image_urls',
  'instagram_url','tiktok_url','facebook_url',
  // mig 0130 — extra socials + custom domain
  'x_url','snapchat_url','website_url',
  // mig 0132 — chat handles
  'telegram_handle','wechat_id','line_id','kakaotalk_id',
  // mig 0137 — contact form opt-in
  'contact_form_enabled','contact_email',
  'operating_hours','certifications',
  'last_active_at',
  // mig 0087 — per-guide accent colour
  'theme_color',
  // mig 0107 — feature parity with beautician contract
  'has_physical_location','busy_dates','promo_text',
  // mig 0131 — country + custom services
  'country_code','custom_services_offered',
].join(', ')

// Mock companion table (mig 0052) — narrower column set. Same keys exist on
// the real table so the consumer can render both transparently. is_mock is
// synthesized client-side from which branch returned the row.
const MOCK_COLS = [
  'id','slug','name','whatsapp_e164',
  'city','address',
  'services','languages','day_rate_idr','notes','image_urls',
  'rating','available_now',
  // mig 0053 / 0054 / 0055 also added to mocks
  'fuel_included','availability','bike_brand',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  // 1. Real listings — status='approved' matches the public-read RLS policy
  //    from mig 0037 (tgl_public_read_approved) so service-role + anon stay
  //    in sync on which rows are exposed.
  const { data: real, error: realErr } = await admin
    .from('tour_guide_listings')
    .select(REAL_COLS)
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  if (realErr) {
    console.error('[tour/slug/public] real fetch failed', { code: realErr.code, message: realErr.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (real) {
    return NextResponse.json({ provider: { ...(real as unknown as Record<string, unknown>), is_mock: false } })
  }

  // 2. Mock fallback — mig 0052 publishes unhidden mock rows to anon. We
  //    keep the same response envelope so the page never branches on which
  //    table the row came from.
  const { data: mock, error: mockErr } = await admin
    .from('mock_tour_guide_listings')
    .select(MOCK_COLS)
    .eq('slug', slug)
    .is('mock_hidden_at', null)
    .maybeSingle()
  if (mockErr) {
    console.error('[tour/slug/public] mock fetch failed', { code: mockErr.code, message: mockErr.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!mock) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: { ...(mock as unknown as Record<string, unknown>), is_mock: true } })
}
