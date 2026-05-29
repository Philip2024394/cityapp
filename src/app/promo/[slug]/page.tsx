import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { resolveBadge, type BadgeType } from '@/lib/badges'
import { countryByCode } from '@/lib/data/countries'
import PromoViewTracker from './PromoViewTracker'

// /promo/[slug] — public-facing AI promo landing page (mig 0138).
// Server-rendered so social-network unfurlers (WhatsApp, Facebook,
// Telegram) generate a rich OG card with the photo + headline.
//
// Path was originally /p/[slug] — moved to /promo/[slug] because
// /p/[slug] is already used by the partner-attribution capture page.

export const dynamic = 'force-dynamic'

type PromoRow = {
  id:           string
  slug:         string
  provider_type: string
  provider_id:  string
  headline:     string
  ai_caption:   string
  photo_url:    string
  badge_type:   string | null
  badge_value:  number | null
  badge_color:  'red' | 'yellow' | 'black' | null
  price_idr:    number | null
  view_count:   number
  archived_at:  string | null
  expires_at:   string | null
}

type RelatedPromo = {
  slug:       string
  headline:   string
  photo_url:  string
  view_count: number
}

async function lookupPromo(slug: string): Promise<{
  promo:           PromoRow
  providerSlug:    string
  providerName:    string
  profileImageUrl: string | null
  city:            string | null
  serviceArea:     string | null
  themeColor:      string
  currencySym:     string
  related:         RelatedPromo[]
} | null> {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data: promo } = await admin
    .from('promo_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (!promo) return null
  if (promo.archived_at) return null
  if (promo.expires_at && new Date(promo.expires_at) <= new Date()) return null

  if (promo.provider_type !== 'beautician') return null
  const { data: bp } = await admin
    .from('beautician_providers')
    .select('slug, display_name, profile_image_url, city, service_area_notes, theme_color, country_code')
    .eq('id', promo.provider_id)
    .maybeSingle()
  // Status check intentionally omitted — KTP-gated 'active' status was
  // removed (see project_indocity_no_ktp_required memory). The promo
  // page is provider-owned content, so existing = renderable.
  if (!bp) return null

  // Top 3 OTHER active promos from this provider — "More from {name}"
  // carousel below the hero. Sorted by view_count desc so the
  // best-performing ones surface; falls back to created_at for ties.
  const { data: relatedRaw } = await admin
    .from('promo_pages')
    .select('slug, headline, photo_url, view_count')
    .eq('provider_type', 'beautician')
    .eq('provider_id',   promo.provider_id)
    .is('archived_at',   null)
    .neq('slug',         slug)
    .order('view_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3)
  const related: RelatedPromo[] = (relatedRaw ?? [])
    .filter((r) => !r.expires_at || new Date(r.expires_at) > new Date())
    .map((r) => ({
      slug:       r.slug as string,
      headline:   r.headline as string,
      photo_url:  r.photo_url as string,
      view_count: r.view_count as number,
    }))

  const themeColor  = bp.theme_color || '#EC4899'
  const currencySym = countryByCode(bp.country_code).currency_symbol
  return {
    promo:           promo as PromoRow,
    providerSlug:    bp.slug,
    providerName:    bp.display_name,
    profileImageUrl: bp.profile_image_url ?? null,
    city:            bp.city ?? null,
    serviceArea:     bp.service_area_notes ?? null,
    themeColor,
    currencySym,
    related,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await lookupPromo(slug)
  if (!data) return { title: 'Promo not found' }
  const { promo, providerName } = data
  return {
    title:       `${promo.headline} — ${providerName}`,
    description: promo.ai_caption.slice(0, 160),
    openGraph: {
      title:       `${promo.headline} — ${providerName}`,
      description: promo.ai_caption.slice(0, 160),
      images:      [{ url: promo.photo_url }],
      type:        'article',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${promo.headline} — ${providerName}`,
      description: promo.ai_caption.slice(0, 160),
      images:      [promo.photo_url],
    },
  }
}

function priceLabel(amount: number | null, symbol: string): string | null {
  if (amount === null || amount <= 0) return null
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    return `${symbol} ${Number.isInteger(m) ? m : m.toFixed(1)}M`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `${symbol} ${Number.isInteger(k) ? k : k.toFixed(0)}k`
  }
  return `${symbol} ${amount.toLocaleString('en-US')}`
}

export default async function PromoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await lookupPromo(slug)
  if (!data) notFound()
  const { promo, providerSlug, providerName, profileImageUrl, city, serviceArea, themeColor, currencySym, related } = data

  const badge = resolveBadge(
    promo.badge_type
      ? { type: promo.badge_type as BadgeType, value: promo.badge_value ?? undefined, color: promo.badge_color ?? undefined }
      : null,
  )
  const price = priceLabel(promo.price_idr, currencySym)
  const initial = providerName.trim()[0]?.toUpperCase() ?? '?'
  // Show the more specific service area when set, fall back to city.
  const locationLabel = (serviceArea && serviceArea.trim()) || city

  return (
    // h-[100dvh] + flex column so the layout fits the viewport on
    // mobile without scrolling. Each section uses `shrink-0` so they
    // hold their height; the AI caption is the only flexible block —
    // it grows to fill the space, then clamps with an ellipsis.
    <main className="relative h-[100dvh] sm:min-h-[100dvh] sm:h-auto bg-white text-black flex flex-col sm:overflow-visible">
      <PromoViewTracker slug={slug} />

      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 pt-3 pb-3 sm:pt-5 sm:pb-12 min-h-0">
        {/* Provider profile header — avatar + name + city/service-area.
            Tappable to send curious visitors straight to the full
            profile if the AI promo body didn't sell them. */}
        <Link
          href={`/beautician/${providerSlug}?promo=${slug}`}
          className="shrink-0 flex items-center gap-3 pb-2.5 mb-2.5 sm:pb-4 sm:mb-4 border-b border-gray-100 group"
        >
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={providerName}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover shrink-0"
              style={{ boxShadow: `0 0 0 2px white, 0 0 0 4px ${themeColor}` }}
            />
          ) : (
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-black text-[16px] sm:text-[18px] shrink-0"
              style={{
                background: themeColor,
                boxShadow: `0 0 0 2px white, 0 0 0 4px ${themeColor}`,
              }}
            >
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[14px] sm:text-[15px] font-black text-black leading-tight truncate group-hover:underline">
              {providerName}
            </div>
            {locationLabel ? (
              <div className="inline-flex items-center gap-1 text-[12px] font-bold text-black/60 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.5} style={{ color: themeColor }} />
                <span className="truncate">{locationLabel}</span>
              </div>
            ) : (
              <div className="text-[12px] text-black/50">View full profile</div>
            )}
          </div>
          <span
            className="shrink-0 inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1 text-white shadow-sm"
            style={{ background: themeColor }}
          >
            View Profile
            <ArrowRight className="w-3 h-3" strokeWidth={3} />
          </span>
        </Link>

        {/* Hero image with corner-anchored badge. Square on mobile so
            it doesn't dominate the viewport; 4:5 portrait on desktop
            where vertical space is generous. */}
        <div className="shrink-0 relative rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 aspect-square sm:aspect-[4/5]">
          <img
            src={promo.photo_url}
            alt={promo.headline}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {badge && (
            <>
              <style>{`
                @keyframes cr-promo-glow {
                  0%, 100% { box-shadow: 0 0 0 0 ${badge.def.glow}, 0 1px 4px rgba(0,0,0,0.25); }
                  50%      { box-shadow: 0 0 18px 5px ${badge.def.glow}, 0 1px 4px rgba(0,0,0,0.25); }
                }
              `}</style>
              <div
                className={`absolute top-3 left-0 inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-[12px] font-black uppercase tracking-wider rounded-r-lg ${badge.def.bg} ${badge.def.text}`}
                style={{ animation: 'cr-promo-glow 2.4s ease-in-out infinite' }}
              >
                {badge.display}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 mt-2.5 sm:mt-5 flex items-start justify-between gap-3">
          <h1 className="text-[18px] sm:text-[26px] font-black text-black leading-tight flex-1 min-w-0 line-clamp-2 sm:line-clamp-none">
            {promo.headline}
          </h1>
          {price && (
            <span
              className="shrink-0 inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-white text-[13px] sm:text-[14px] font-extrabold shadow-sm whitespace-nowrap"
              style={{ background: themeColor }}
            >
              {price}
            </span>
          )}
        </div>

        {/* AI caption — flex-1 so it absorbs available vertical space,
            then line-clamps so the layout never overflows the viewport
            on mobile. Full text shown on sm:+ where scroll is fine. */}
        <p className="mt-2 sm:mt-4 text-[13px] sm:text-[15px] text-black/85 leading-snug sm:leading-relaxed whitespace-pre-wrap flex-1 min-h-0 overflow-hidden line-clamp-[6] sm:line-clamp-none">
          {promo.ai_caption}
        </p>

        <div className="shrink-0 mt-3 sm:mt-6">
          <Link
            href={`/beautician/${providerSlug}?promo=${slug}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 sm:py-4 text-white text-[14px] sm:text-[15px] font-extrabold uppercase tracking-wider shadow-md active:scale-[0.98] transition min-h-[48px]"
            style={{ background: themeColor }}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
            Book {providerName.split(' ')[0]}
          </Link>
        </div>

      </div>

      {/* "More from {Name}" — sits below the no-scroll hero. Mobile
          users see a section break + scroll cue; horizontal carousel
          on mobile, 3-col grid on sm:+. Empty when the provider has
          no other active promos. */}
      {related.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-200 mt-4 sm:mt-0">
          <div className="max-w-xl mx-auto px-4 py-5 sm:py-8">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="text-[14px] sm:text-[16px] font-black text-black">
                More from {providerName.split(' ')[0]}
              </h2>
              <Link
                href={`/beautician/${providerSlug}`}
                className="text-[12px] font-extrabold uppercase tracking-wider hover:underline"
                style={{ color: themeColor }}
              >
                See profile →
              </Link>
            </div>
            <div className="-mx-4 px-4 overflow-x-auto sm:overflow-visible">
              <div className="flex sm:grid sm:grid-cols-3 gap-3 min-w-max sm:min-w-0">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/promo/${r.slug}`}
                    className="block w-[180px] sm:w-auto shrink-0 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition"
                  >
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={r.photo_url}
                        alt={r.headline}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <div className="text-[12px] font-black text-black leading-tight line-clamp-2 min-h-[28px]">
                        {r.headline}
                      </div>
                      <div className="text-[11px] text-black/55 tabular-nums">
                        {r.view_count.toLocaleString()} {r.view_count === 1 ? 'view' : 'views'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
