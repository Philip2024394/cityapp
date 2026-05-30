'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Menu, Bed, Bath, Maximize2, Car, Share2, Link2, MessageCircle, X, ChevronLeft, BadgeCheck, MapPin, Bike, ExternalLink, Calendar, Home as HomeIcon, type LucideIcon } from 'lucide-react'
import RunningMarquee from '@/components/profile/RunningMarquee'
import PortfolioCarousel, {
  PortfolioDetailPopup,
  type PortfolioPhoto,
} from '@/components/profile/PortfolioCarousel'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import VisitUsPanel, {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import ContactBookingPopup from '@/components/profile/ContactBookingPopup'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { bannerSrc } from '@/lib/banners/transform'
import { Sparkles } from 'lucide-react'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'

// /property/[slug] — mirrors /beautician/[slug] visually 1:1.
// Data source swap only: `property_listings` instead of `beautician_providers`.
// Keep all CSS classes, hero animations, sticky bars, share popup,
// reviews panel and contact popup intact so the two pages render as
// near-identical shells.

const DEFAULT_THEME = '#0EA5E9'

const DEFAULT_PROPERTY_HERO =
  'https://images.unsplash.com/photo-1711609110590-5ad5c4599e56'

// Listing-type discriminator labels (rendered as the small "kind" chip
// in the Services Provided row above the property-type chip).
const LISTING_TYPE_LABELS: Record<PropertyListingType, string> = {
  for_sale:         'For Sale',
  for_rent:         'For Rent',
  new_construction: 'Builder',
}

// Property-type chip labels — Bahasa per founder direction.
const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house:     'Rumah',
  apartment: 'Apartemen',
  villa:     'Villa',
  land:      'Tanah',
  shophouse: 'Ruko',
  warehouse: 'Gudang',
  office:    'Kantor',
  shop:      'Kios',
}

type PropertyListingType = 'for_sale' | 'for_rent' | 'new_construction'
type PropertyType =
  | 'house' | 'apartment' | 'villa' | 'land'
  | 'shophouse' | 'warehouse' | 'office' | 'shop'

// Same rich-photo shape the beautician uses (mig 0074). Carried 1:1 onto
// property_listings.service_photos (mig 0126).
type PropertyServicePhoto = {
  url:                string
  name?:              string | null
  description?:       string | null
  price_idr?:         number | null
  object_position?:   string | null
  before_image_url?:  string | null
  after_image_url?:   string | null
}

type PropertyPublic = {
  id?:                 string
  slug:                string
  display_name:        string
  business_name?:      string | null
  bio?:                string | null

  listing_type:        PropertyListingType
  property_type:       PropertyType

  city?:               string | null
  address?:            string | null
  kelurahan?:          string | null
  kecamatan?:          string | null
  latitude?:           number | null
  longitude?:          number | null

  // Sale pricing
  price_idr?:          number | null
  // Rent pricing
  daily_rent_idr?:     number | null
  weekly_rent_idr?:    number | null
  monthly_rent_idr?:   number | null
  deposit_idr?:        number | null
  // Builder pricing
  starting_price_idr?: number | null
  nup_idr?:            number | null
  units_total?:        number | null
  units_available?:    number | null
  developer_name?:     string | null
  completion_date?:    string | null

  // Property facts (icon row)
  bedrooms?:           number | null
  bathrooms?:          number | null
  land_size_sqm?:      number | null
  building_size_sqm?:  number | null
  parking_cars?:       number | null

  // Other facts (carried but not all rendered)
  certificate_type?:   string | null
  year_built?:         number | null
  furnished?:          string | null
  kpr_eligible?:       boolean | null
  flood_zone?:         string | null
  expat_friendly?:     boolean | null

  // Universal profile fields
  cover_image_url?:    string | null
  profile_image_url?:  string | null
  gallery_image_urls?: string[] | null
  image_urls?:         string[] | null
  hero_text?:          {
    line1?:         string
    line2?:         string
    tagline?:       string
    color?:         string
    line1_color?:   string
    tagline_color?: string
    effect?:        string
  } | null
  promo_text?:         string | null
  theme_color?:        string | null
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  busy_dates?:         string[] | null
  has_physical_location?: boolean | null
  whatsapp_e164?:      string | null
  rating?:             number | null
  rating_count?:       number | null
  service_photos?:     Record<string, PropertyServicePhoto[]> | null
}

// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI.
type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

export default function PropertyProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<PropertyPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  // Services Provided shows two chips for property (listing type + property
  // type) — no "show more" expansion needed, but the state is preserved for
  // structural parity with beautician.
  const [showMoreServices, setShowMoreServices] = useState(false)
  void showMoreServices
  // Single-element "services_offered" array for property: [property_type].
  const [activeService, setActiveService] = useState<PropertyType | null>(null)
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  const [showReviews, setShowReviews] = useState(false)
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [reviews, setReviews]         = useState<ReviewRow[] | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  const [contactOpen,        setContactOpen]        = useState(false)
  const [contactServiceName, setContactServiceName] = useState<string>('')

  useEffect(() => {
    capturePartnerFromUrl()
    setPartnerTag(getStoredPartnerSlug())
  }, [])

  useEffect(() => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) { setNotFound(true); return }
    fetch(`/api/property/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: PropertyPublic } | null) => {
        if (j?.provider) setP(j.provider); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  // Resolved accent — p.theme_color wins, else global default.
  const theme = p?.theme_color || DEFAULT_THEME

  useEffect(() => {
    if (!showReviews || !p?.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=property&provider_id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, p?.id, reviewsRefreshCount])

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Property not found</h1>
          <Link href="/property" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/property/${p.slug}`
  const displayTitle = p.business_name?.trim() || p.display_name

  // WhatsApp prefill text — matches beautician shape, copy adapted to property.
  const waText = [
    `Halo ${displayTitle}, saya menemukan profil Anda di Kita2u.`,
    `Saya tertarik dengan property ini.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah masih tersedia?`,
  ].filter(Boolean).join('\n')
  void waText

  // Services Provided chips — single property_type slot.
  const servicesOffered: PropertyType[] = [p.property_type]

  return (
    <Shell>
      {/* Hero — cover with overlay text, plus a floating info-card that
          sits on the bottom edge of the cover (15px rounded corners). */}
      <div className="relative pb-2">
        {/* Top-right share button. */}
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share profile"
          className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-[0.96] transition"
          style={{ background: theme }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          <img
            src={bannerSrc(p.cover_image_url) || DEFAULT_PROPERTY_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — text now comes from p.hero_text when set;
              otherwise falls back to default copy keyed off property_type. */}
          {(() => {
            const ht = p.hero_text || {}
            const line1   = ht.line1   || 'Premium'
            const line2   = ht.line2   || (PROPERTY_TYPE_LABELS[p.property_type] ?? 'Property')
            const tagline = ht.tagline || `${LISTING_TYPE_LABELS[p.listing_type]} · ${p.city ?? 'Indonesia'}`
            const line2Color   = ht.color         || theme
            const line1Color   = ht.line1_color   || '#000000'
            const taglineColor = ht.tagline_color || '#000000'
            const rawEffect = ht.effect || 'none'
            const effect = ['none','shimmer','dance','underline'].includes(rawEffect) ? rawEffect : 'none'
            return (
              <div className={`absolute left-4 z-10 select-none leading-none cr-hero-${effect}`} style={{ top: 31 }}>
                <style>{`
                  @keyframes cr-hero-dance {
                    0%,100% { transform: translate(0,0) rotate(0) }
                    20%     { transform: translate(-3px, 2px) rotate(-3deg) }
                    40%     { transform: translate(3px, -2px) rotate(2deg) }
                    60%     { transform: translate(-2px, -2px) rotate(-2deg) }
                    80%     { transform: translate(2px, 3px) rotate(3deg) }
                  }
                  @keyframes cr-hero-shimmer {
                    0%   { background-position: 200% center }
                    100% { background-position: -100% center }
                  }
                  @keyframes cr-hero-underline {
                    0%   { width: 0 }
                    35%  { width: 100% }
                    75%  { width: 100% }
                    100% { width: 0 }
                  }
                  .cr-hero-dance .cr-hero-word { animation: cr-hero-dance 1.4s ease-in-out infinite; transform-origin: center; display: inline-block; }
                  .cr-hero-shimmer .cr-hero-word {
                    background-image: linear-gradient(95deg, ${line2Color} 0%, ${line2Color} 35%, #FFFFFF 50%, ${line2Color} 65%, ${line2Color} 100%);
                    background-size: 220% 100%;
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent !important;
                    animation: cr-hero-shimmer 3s linear infinite;
                  }
                  .cr-hero-underline .cr-hero-word { position: relative; }
                  .cr-hero-underline .cr-hero-word::after {
                    content: '';
                    position: absolute;
                    left: 0; bottom: -4px;
                    height: 3px;
                    background: ${line2Color};
                    border-radius: 2px;
                    animation: cr-hero-underline 3.2s cubic-bezier(0.4,0,0.2,1) infinite;
                  }
                `}</style>
                <div className="flex items-center gap-0.5 text-[28px] sm:text-[34px] font-normal drop-shadow-[0_2px_6px_rgba(255,255,255,0.55)]" style={{ color: line1Color }}>
                  <span>{line1}</span>
                  <Sparkles
                    className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 -mt-3"
                    strokeWidth={0}
                    fill={theme}
                    style={{ color: theme, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                  />
                </div>
                <div
                  className="text-[28px] sm:text-[34px] font-black mt-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] overflow-hidden"
                >
                  <span className="cr-hero-word inline-block" style={{ color: line2Color }}>
                    {line2}
                  </span>
                </div>
                <div className="text-[13px] sm:text-[14px] font-semibold mt-1.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: taglineColor, maxWidth: 'min(360px, calc(100vw - 32px))' }}>
                  {tagline}
                </div>

                {/* Property facts row — replaces the beautician
                    Home/Hotel/Villa/Spa icon row with property-specific
                    facts (Bedrooms / Bathrooms / Building m² / Parking).
                    Each fact only renders when the field is set so the
                    row never shows zero-value placeholders. */}
                {(() => {
                  type FactItem = { key: string; icon: LucideIcon; label: string }
                  const items: FactItem[] = []
                  if (p.bedrooms  != null) items.push({ key: 'bed',  icon: Bed,       label: `${p.bedrooms} BR` })
                  if (p.bathrooms != null) items.push({ key: 'bath', icon: Bath,      label: `${p.bathrooms} BA` })
                  if (p.building_size_sqm != null) items.push({ key: 'size', icon: Maximize2, label: `${p.building_size_sqm} m²` })
                  if (p.parking_cars != null) items.push({ key: 'park', icon: Car, label: `${p.parking_cars} Park` })
                  if (items.length === 0) return null
                  // Cap at 4 so the row stays single-line on small screens.
                  const visible = items.slice(0, 4)
                  return (
                    <div className="flex items-start gap-2 max-w-[280px]" style={{ marginTop: 15 }}>
                      {visible.map((it, idx) => (
                        <React.Fragment key={it.key}>
                          {idx > 0 && <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />}
                          <HeroIcon icon={it.icon} slogan={it.label} theme={theme} />
                        </React.Fragment>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )
          })()}
        </div>

        {/* Reviews toggle — pink pill above the floating card, right side.
            Click swaps the area below for the reviews list. */}
        <div className="px-4 relative z-20 flex justify-end" style={{ marginTop: -56 }}>
          <button
            type="button"
            onClick={() => setShowReviews((v) => !v)}
            aria-pressed={showReviews}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
            style={{ background: theme }}
          >
            <Star className="w-3.5 h-3.5" strokeWidth={0} fill="#FFFFFF" />
            {showReviews ? 'Hide reviews' : 'Reviews'}
          </button>
        </div>

        {/* Floating info card — overlaps the bottom edge of the cover. */}
        <div className="px-4 relative z-20" style={{ marginTop: 12 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            {/* Profile image */}
            {p.profile_image_url ? (
              <img
                src={p.profile_image_url}
                alt={displayTitle}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black shrink-0 border-2 border-white shadow"
                style={{ background: '#0EA5E9' }}
              >
                {displayTitle.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name + city + rating */}
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight flex items-center gap-1">
                <span className="truncate">{displayTitle}</span>
                <BadgeCheck
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.5}
                  fill={theme}
                  style={{ color: '#FFFFFF' }}
                  aria-label="Verified"
                />
              </h1>
              <p className="text-[12px] text-gray-500 truncate mt-0.5">
                {p.city?.trim() || 'Indonesia'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: '#FACC15' }}
                  fill="#FACC15"
                  strokeWidth={0}
                />
                <span className="text-[12px] font-extrabold text-black">
                  {p.rating != null && p.rating > 0 ? p.rating.toFixed(1) : '—'}
                </span>
                <span className="text-[11px] text-gray-500">
                  ({p.rating_count ?? 0} review{(p.rating_count ?? 0) === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* Top Rated Seller badge */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: theme }} />
              <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: theme }}>
                Top Rated Seller
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto space-y-3 pt-3">
        {showVisitUs ? (
          <VisitUsPanel
            displayName={displayTitle}
            address={[p.address, p.kelurahan, p.kecamatan].filter(Boolean).join(', ') || p.city || null}
            city={p.city ?? null}
            lat={typeof p.latitude  === 'number' ? p.latitude  : null}
            lng={typeof p.longitude === 'number' ? p.longitude : null}
            hours={p.operating_hours ?? null}
            instagramUrl={p.instagram_url ?? null}
            tiktokUrl={p.tiktok_url ?? null}
            facebookUrl={p.facebook_url ?? null}
            xUrl={(p as unknown as { x_url?: string | null }).x_url ?? null}
            snapchatUrl={(p as unknown as { snapchat_url?: string | null }).snapchat_url ?? null}
            websiteUrl={(p as unknown as { website_url?: string | null }).website_url ?? null}
            whatsappE164={p.whatsapp_e164 ?? null}
            telegramHandle={(p as unknown as { telegram_handle?: string | null }).telegram_handle ?? null}
            wechatId={(p as unknown as { wechat_id?: string | null }).wechat_id ?? null}
            lineId={(p as unknown as { line_id?: string | null }).line_id ?? null}
            kakaotalkId={(p as unknown as { kakaotalk_id?: string | null }).kakaotalk_id ?? null}
            busyDates={(p.busy_dates ?? []) as string[]}
            themeColor={theme}
            onClose={() => setShowVisitUs(false)}
            bottomCta={
              (typeof p.latitude === 'number' && typeof p.longitude === 'number')
                ? {
                    label: 'Book Bike Service',
                    icon: Bike,
                    note: `We'll use your location for pickup and ${displayTitle}'s for drop-off — fare shows on the next screen.`,
                    onClick: () => {
                      const lat = p.latitude as number
                      const lng = p.longitude as number
                      const base = `/cari/rider?dLat=${lat}&dLng=${lng}&dName=${encodeURIComponent(displayTitle)}`
                      const fallback = () => { window.location.href = base }
                      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
                        fallback(); return
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const pLat = pos.coords.latitude.toFixed(6)
                          const pLng = pos.coords.longitude.toFixed(6)
                          window.location.href = `${base}&pLat=${pLat}&pLng=${pLng}&pName=${encodeURIComponent('My location')}`
                        },
                        fallback,
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
                      )
                    },
                  }
                : null
            }
          />
        ) : showReviews ? (
          <ReviewsPanel
            providerId={p.id ?? ''}
            reviews={reviews ?? []}
            loading={reviewsLoading}
            formOpen={reviewFormOpen}
            setFormOpen={setReviewFormOpen}
            onSubmitted={() => setReviewsRefreshCount((n) => n + 1)}
            theme={theme}
          />
        ) : (
          <>
        {/* About {name} — 4-line clamped bio. */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              About {displayTitle}
            </h2>
            {(typeof p.latitude === 'number' && typeof p.longitude === 'number') && (
              <button
                type="button"
                onClick={() => setShowVisitUs(true)}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                style={{ color: theme }}
              >
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                Visit Us
              </button>
            )}
          </div>
          <div className="flex items-start gap-3">
            {p.bio?.trim() ? (
              <p
                className="text-[13px] text-gray-600 leading-snug flex-1 min-w-0"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.bio.replace(/\s*\n\s*/g, ' ')}
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No description yet.</p>
            )}
          </div>
        </section>

        {/* Services Provided — listing-type discriminator chip + the
            property-type chip. Property only has one "service" slot (the
            property_type) so the row stays compact. */}
        <section className="space-y-2" style={{ marginTop: 15 }}>
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
            Services Provided
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Listing-type discriminator — For Sale / For Rent / Builder.
                Non-interactive; purely a category label so the property
                vertical's "kind" is obvious at a glance. */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide"
              style={{ background: theme, color: '#FFFFFF' }}
            >
              <HomeIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              {LISTING_TYPE_LABELS[p.listing_type]}
            </span>
            {/* "All" reset chip — clears any active service filter. */}
            <button
              type="button"
              onClick={() => { setActiveService(null); setShowMoreServices(false) }}
              aria-pressed={activeService === null}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide transition active:scale-[0.97]"
              style={
                activeService === null
                  ? { background: theme, color: '#FFFFFF' }
                  : { background: '#F3F4F6', color: '#374151' }
              }
            >
              All
            </button>
            {servicesOffered.map((sid) => (
              <ServiceFilterBadge
                key={sid} sid={sid}
                active={activeService === sid}
                onClick={() => setActiveService(activeService === sid ? null : sid)}
                theme={theme}
              />
            ))}
          </div>
        </section>

        {/* Portfolio carousel — rich cards (image + name + 2-line desc
            + start price + View Details). Cards swipe left-to-right. */}
        {(() => {
          const photos = buildPortfolioPhotos(p, activeService)
          if (photos.length === 0) return null
          return (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {activeService
                    ? `${PROPERTY_TYPE_LABELS[activeService]} — Portfolio`
                    : 'Portfolio'}
                </h2>
                <PortfolioViewToggle
                  view={portfolioView}
                  onChange={setPortfolioView}
                  themeColor={theme}
                />
              </div>
              <p className="text-[11px] text-gray-500 italic -mt-1">
                Please contact for additional rooms or units not listed
              </p>
              <PortfolioCarousel
                photos={photos as PortfolioPhoto[]}
                onViewDetails={(ph) => setDetailPhoto(ph)}
                themeColor={theme}
                view={portfolioView}
              />
            </section>
          )
        })()}

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={p.promo_text || 'Message us this week — schedule a viewing and ask about KPR pre-approval, NUP slots or move-in dates.'}
        />

        {/* Pricing block — schema-driven by listing_type. Replaces the
            beautician 3-pack (makeup/nail/hair). */}
        <PropertyPricingBlock p={p} theme={theme} />

        {/* CTA row under the pricing block — large price on the left,
            themed Contact button on the right. */}
        <div className="flex items-end justify-between gap-3 pb-4">
          <div className="leading-none pb-3">
            <div className="text-[24px] sm:text-[28px] font-black text-black">
              {formatHeadlinePrice(p)}
            </div>
            <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
              {p.listing_type === 'for_rent' ? 'Per month' : p.listing_type === 'new_construction' ? 'Starting from' : 'Sale price'}
            </div>
          </div>
          {p.whatsapp_e164 && (
            <button
              type="button"
              onClick={() => { setContactServiceName(''); setContactOpen(true) }}
              className="inline-flex items-center gap-1.5 justify-center px-5 py-3 rounded-xl text-white font-extrabold text-[13px] shadow-md active:scale-[0.97] transition shrink-0"
              style={{ background: theme }}
            >
              <MessageCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
              Contact
            </button>
          )}
        </div>
          </>
        )}

      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl relative"
            style={{ borderTop: `4px solid ${theme}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[16px] font-black text-black">Share Property</h3>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              Bagikan listing {displayTitle} ke teman atau klien.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* clipboard denied */ }
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1800)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition border border-gray-200 active:scale-[0.99]"
              >
                <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-extrabold text-black">
                    {shareCopied ? 'Copied!' : 'Copy link'}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{profileUrl}</div>
                </div>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat listing ${displayTitle} di Kita2u: ${profileUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#25D366' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">WhatsApp</div>
                  <div className="text-[11px] text-white/85">Send link to a contact</div>
                </div>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#1877F2' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialFacebookIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Facebook</div>
                  <div className="text-[11px] text-white/85">Share to your timeline</div>
                </div>
              </a>

              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* ignore */ }
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1800)
                  window.open('https://www.instagram.com/', '_blank')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialInstagramIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Instagram</div>
                  <div className="text-[11px] text-white/85">Link copied — paste to DM / Story</div>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* ignore */ }
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1800)
                  window.open('https://www.tiktok.com/', '_blank')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition bg-black"
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialTikTokIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">TikTok</div>
                  <div className="text-[11px] text-white/85">Link copied — paste to bio / DM</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-edge "back" bar — flush against the window edge. */}
      <a
        href="/property"
        aria-label="Back to Kita2u property listings"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right: 0,
          top: '35%',
          transform: 'translateY(-50%)',
          width: 34,
          height: 110,
          background: '#FACC15',
          color: '#0A0A0A',
          borderTopLeftRadius: 14,
          borderBottomLeftRadius: 14,
          boxShadow: '-4px 4px 14px rgba(0,0,0,0.22)',
        }}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        <span
          className="font-extrabold uppercase"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 11,
            letterSpacing: '0.18em',
          }}
        >
          Back
        </span>
      </a>

      {/* Footer Leave Review button — only renders when the Reviews
          panel is active AND the inline form isn't already open. */}
      {showReviews && !reviewFormOpen && (
        <button
          type="button"
          onClick={() => setReviewFormOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 z-30 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-white text-[13px] font-extrabold shadow-lg active:scale-[0.97] transition"
          style={{ bottom: 18, background: theme, boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}
        >
          <Star className="w-4 h-4" strokeWidth={0} fill="#FFFFFF" />
          Leave Review
        </button>
      )}

      {/* Bottom accent bar — fixed to visible viewport edge. */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* AREBI / PPAT compliance footer line — Indonesia property
          regulation. Sits just above the accent bar so it's visible on
          every property profile, in line with PM 12/2019 + AREBI/PPAT
          disclosure requirements. */}
      <p
        className="fixed left-0 right-0 z-10 text-center text-[10px] text-ink/55 px-3"
        style={{ bottom: 10 }}
        aria-hidden
      >
        AREBI / PPAT compliance: listing self-published. Sales require notarised AJB via licensed PPAT — verify SHM / HGB at BPN.
      </p>

      {/* Portfolio "View Details" popup. */}
      {detailPhoto && (
        <PortfolioDetailPopup
          photo={detailPhoto}
          themeColor={theme}
          canContact={Boolean(p.whatsapp_e164)}
          onClose={() => setDetailPhoto(null)}
          onContact={() => {
            setContactServiceName(detailPhoto.name ?? '')
            setDetailPhoto(null)
            setContactOpen(true)
          }}
        />
      )}
      {/* Contact / booking popup — opened by both the bottom Contact
          CTA and any per-service Contact button. Sends a "viewing" or
          "enquiry" request server-side then opens WhatsApp with the
          property-flavoured prefill. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={p.slug}
          providerName={displayTitle}
          whatsapp={p.whatsapp_e164}
          providerId={p.id}
          intentVertical="property"
          intentSource="property_profile"
          themeColor={theme}
          serviceOptions={servicesOffered.map((sid) => ({
            value: PROPERTY_TYPE_LABELS[sid] ?? sid,
            label: PROPERTY_TYPE_LABELS[sid] ?? sid,
          }))}
          presetService={contactServiceName}
          busyDates={(p.busy_dates ?? []) as string[]}
          bookEndpoint={`/api/property/${p.slug}/book`}
          copy={{
            title: `Enquire about ${displayTitle}`,
            intro: "Pick a date + time and we'll open WhatsApp with your enquiry.",
            whatsappMessage: ({ date, time, notes }) => [
              `Halo ${displayTitle}, saya menemukan profil Anda di Kita2u.`,
              `Saya tertarik dengan property ini.`,
              `Saya ingin viewing pada ${date} jam ${time}.`,
              notes.trim() ? `Catatan: ${notes.trim()}` : '',
              `\n— Sent via indocity.id`,
            ].filter(Boolean).join('\n'),
          }}
          onClose={() => setContactOpen(false)}
        />
      )}
      <PoweredByKita2u defaultVertical="property" />
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Local helpers
// ─────────────────────────────────────────────────────────────────────

function ServiceFilterBadge({
  sid, active, onClick, theme,
}: { sid: PropertyType; active: boolean; onClick: () => void; theme: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 text-[12px] font-extrabold px-3 py-1.5 rounded-full transition active:scale-[0.97]"
      style={
        active
          ? { background: theme, color: '#FFFFFF' }
          : { background: 'rgba(229, 231, 235, 0.95)', color: '#0A0A0A' }
      }
    >
      <Sparkles
        className="w-3.5 h-3.5"
        strokeWidth={2.5}
        style={{ color: active ? '#FFFFFF' : theme }}
      />
      {PROPERTY_TYPE_LABELS[sid] ?? sid}
    </button>
  )
}

// Headline price — drives the big number under the carousel.
//   for_sale         → price_idr
//   for_rent         → monthly rent (falls back to weekly / daily)
//   new_construction → starting_price_idr (then nup)
function formatHeadlinePrice(p: PropertyPublic): string {
  if (p.listing_type === 'for_sale') {
    return formatPriceIdr(p.price_idr) ?? 'On request'
  }
  if (p.listing_type === 'for_rent') {
    const v = p.monthly_rent_idr ?? p.weekly_rent_idr ?? p.daily_rent_idr ?? null
    return formatPriceIdr(v) ?? 'On request'
  }
  // new_construction
  const v = p.starting_price_idr ?? p.nup_idr ?? null
  return formatPriceIdr(v) ?? 'On request'
}

// Same shape as beautician's normalisePhoto.
function normalisePhoto(raw: unknown): PortfolioPhoto | null {
  if (typeof raw === 'string') return { url: raw }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Partial<PortfolioPhoto>
    if (typeof o.url === 'string' && o.url) return { ...o, url: o.url } as PortfolioPhoto
  }
  return null
}

// Combine per-service photos into the carousel feed. For property the
// "service" axis is the property_type. Falls back to gallery_image_urls
// (then image_urls) when service_photos is empty.
function buildPortfolioPhotos(
  p: PropertyPublic,
  active: PropertyType | null,
): PortfolioPhoto[] {
  const sp = p.service_photos ?? {}
  const key = active ?? p.property_type
  const arr = (sp as Record<string, unknown>)[key]
  if (Array.isArray(arr)) {
    const out = arr.map(normalisePhoto).filter((x): x is PortfolioPhoto => x !== null)
    if (out.length > 0) return out
  }
  const gallery = (p.gallery_image_urls ?? p.image_urls ?? []).filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0,
  )
  return gallery.map((url) => ({ url }))
}

function formatPriceIdr(amount: number | null | undefined): string | null {
  if (typeof amount !== 'number' || amount <= 0) return null
  if (amount >= 1_000_000_000) {
    const m = amount / 1_000_000_000
    return `Rp ${Number.isInteger(m) ? m : m.toFixed(2)}M`
  }
  if (amount >= 1_000_000) {
    const jt = amount / 1_000_000
    return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
  }
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// ─────────────────────────────────────────────────────────────────────
// Pricing block — replaces the beautician makeup/nail/hair 3-pack with
// a listing_type-aware schedule. Visual treatment mirrors the
// beautician CTA row's containing card.
// ─────────────────────────────────────────────────────────────────────
function PropertyPricingBlock({ p, theme }: { p: PropertyPublic; theme: string }) {
  type Row = { label: string; value: string }
  const rows: Row[] = []

  if (p.listing_type === 'for_sale') {
    if (p.price_idr != null) {
      rows.push({ label: 'Sale Price', value: formatPriceIdr(p.price_idr) ?? '—' })
    }
  } else if (p.listing_type === 'for_rent') {
    if (p.daily_rent_idr   != null) rows.push({ label: 'Daily',   value: formatPriceIdr(p.daily_rent_idr)   ?? '—' })
    if (p.weekly_rent_idr  != null) rows.push({ label: 'Weekly',  value: formatPriceIdr(p.weekly_rent_idr)  ?? '—' })
    if (p.monthly_rent_idr != null) rows.push({ label: 'Monthly', value: formatPriceIdr(p.monthly_rent_idr) ?? '—' })
    if (p.deposit_idr      != null) rows.push({ label: 'Deposit', value: formatPriceIdr(p.deposit_idr)      ?? '—' })
  } else {
    // new_construction
    if (p.starting_price_idr != null) rows.push({ label: 'Starting Price', value: formatPriceIdr(p.starting_price_idr) ?? '—' })
    if (p.nup_idr            != null) rows.push({ label: 'NUP (booking)',  value: formatPriceIdr(p.nup_idr)            ?? '—' })
    if (p.units_available    != null) rows.push({ label: 'Units Available', value: String(p.units_available) })
    if (p.completion_date) {
      const dt = new Date(p.completion_date)
      const lbl = Number.isFinite(dt.getTime())
        ? dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : p.completion_date
      rows.push({ label: 'Completion', value: lbl })
    }
  }

  if (rows.length === 0) return null

  return (
    <section className="space-y-2" style={{ marginTop: 6 }}>
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
        Pricing
      </h2>
      <div className="rounded-2xl bg-white border border-gray-200 p-3 shadow-[0_2px_14px_rgba(0,0,0,0.04)]">
        <ul className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-[13px]">
              <span className="text-gray-600">{r.label}</span>
              <span className="font-extrabold text-black" style={{ color: i === 0 ? theme : undefined }}>{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Reviews panel — copied verbatim from /beautician/[slug]/page.tsx and
// pointed at provider_type='property'.
// ─────────────────────────────────────────────────────────────────────
function ReviewsPanel({
  providerId, reviews, loading, formOpen, setFormOpen, onSubmitted, theme,
}: {
  providerId:  string
  reviews:     ReviewRow[]
  loading:     boolean
  formOpen:    boolean
  setFormOpen: (open: boolean) => void
  theme:       string
  onSubmitted: () => void
}) {
  const [stars, setStars]         = useState(0)
  const [name, setName]           = useState('')
  const [whatsapp, setWhatsapp]   = useState('')
  const [comment, setComment]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  const visible = reviews ?? []
  const avg = visible.length === 0
    ? 0
    : visible.reduce((s, r) => s + r.rating, 0) / visible.length

  async function submit() {
    setErr(null)
    if (stars < 1 || stars > 5) { setErr('Pilih rating 1-5 bintang.'); return }
    if (!name.trim())            { setErr('Isi nama.');                  return }
    if (comment.trim().length > 250) { setErr('Review max 250 huruf.');  return }
    setSubmitting(true)
    try {
      const sessionId = readOrMakeReviewSessionId()
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type:     'property',
          provider_id:       providerId,
          reviewer_name:     name.trim(),
          reviewer_whatsapp: whatsapp.trim() || undefined,
          rating:            stars,
          comment:           comment.trim() || undefined,
          session_id:        sessionId,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j?.error || 'Failed to submit'); return }
      setStars(0); setName(''); setWhatsapp(''); setComment(''); setFormOpen(false)
      onSubmitted()
    } finally { setSubmitting(false) }
  }

  return (
    <section className="space-y-2" style={{ marginTop: 32 }}>
      {!formOpen && (
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
            Reviews
          </h2>
          <div className="text-[12px] font-bold text-gray-500">
            <span className="text-black font-black text-[14px]">{avg > 0 ? avg.toFixed(1) : '—'}</span>
            {' · '}{visible.length} {visible.length === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="space-y-2.5 px-1 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold text-black">Leave a review</div>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setErr(null) }}
              aria-label="Close form"
              className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm active:scale-[0.95] transition"
              style={{ background: theme }}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i < stars
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i + 1)}
                  aria-label={`Rate ${i + 1} star${i ? 's' : ''}`}
                  className="p-1 active:scale-[0.9] transition"
                >
                  <Star
                    className="w-7 h-7 transition-colors"
                    strokeWidth={1.5}
                    fill={filled ? '#FACC15' : '#D1D5DB'}
                    style={{ color: filled ? '#FACC15' : '#9CA3AF' }}
                  />
                </button>
              )
            })}
          </div>

          <input
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-pink-500"
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp (opsional, +62…)"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-pink-500"
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={250}
              rows={3}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis pengalaman Anda (max 250 huruf)"
              className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-pink-500"
            />
            <div className="text-[10px] text-gray-500 text-right">{comment.length}/250</div>
          </div>

          {err && (
            <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-[12px] px-2 py-1.5">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full text-white text-[13px] font-extrabold disabled:opacity-60 active:scale-[0.98] transition"
            style={{ background: theme }}
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      )}

      {!formOpen && (
      <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 340px)' }}>
        {loading && visible.length === 0 && (
          <div className="text-[12px] text-gray-500 italic">Loading reviews…</div>
        )}
        {!loading && visible.length === 0 && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
            <div className="text-[12px] text-gray-500">Belum ada review. Jadilah yang pertama.</div>
          </div>
        )}
        {visible.map((r) => (
          <div key={r.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-black shrink-0"
                  style={{ background: theme }}
                >
                  {r.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-black truncate">{r.reviewer_name}</div>
                  <div className="text-[10px] text-gray-500">{formatReviewWhen(r.created_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="w-3 h-3"
                    strokeWidth={0}
                    fill={j < r.rating ? theme : '#E5E7EB'}
                    style={{ color: j < r.rating ? theme : '#E5E7EB' }}
                  />
                ))}
              </div>
            </div>
            {r.comment && (
              <p className="text-[12px] text-gray-700 leading-snug">{r.comment}</p>
            )}
          </div>
        ))}
      </div>
      )}
    </section>
  )
}

function readOrMakeReviewSessionId(): string {
  try {
    let v = localStorage.getItem('cr-review-sid')
    if (!v) {
      v = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('cr-review-sid', v)
    }
    return v
  } catch { return `sid-${Date.now()}` }
}

function formatReviewWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function HeroIcon({
  src, icon: Icon, slogan, theme,
}: { src?: string; icon?: LucideIcon; slogan: string; theme: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      <span
        className="inline-flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm shadow-sm"
        style={{ width: 44, height: 44 }}
      >
        {src
          ? <img src={src} alt="" className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] object-contain" />
          : Icon
            ? <Icon className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px]" strokeWidth={2.25} style={{ color: theme }} />
            : null}
      </span>
      <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-black leading-tight whitespace-pre-line drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
        {slogan}
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}

// Imported but unused — kept here so the surrounding visual parity with
// the beautician page (which references these icons via the share popup
// + Visit Us + bottom CTA copy) keeps tree-shake-friendly imports
// explicit.
void Calendar
void ExternalLink
