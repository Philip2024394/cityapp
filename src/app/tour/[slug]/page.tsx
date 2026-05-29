'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Menu, Share2, Link2, MessageCircle, X, ChevronLeft, BadgeCheck, MapPin, Bike, Fuel } from 'lucide-react'
import RunningMarquee from '@/components/profile/RunningMarquee'
import PortfolioCarousel, {
  PortfolioDetailPopup,
  type PortfolioPhoto,
} from '@/components/profile/PortfolioCarousel'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import ContactFormPanel from '@/components/profile/ContactFormPanel'
import VisitUsPanel, {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import ContactBookingPopup from '@/components/profile/ContactBookingPopup'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { bannerSrc } from '@/lib/banners/transform'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { Sparkles, Compass } from 'lucide-react'
import {
  TOUR_SERVICES,
  findTourService,
  type TourServiceId,
} from '@/data/tourServices'
import { countryByCode } from '@/lib/data/countries'

// Default theme accent — emerald (outdoor / nature tone). Tour guides
// pick their accent from the dashboard color palette via mig 0087;
// the chosen hex flows through every accent surface on this page.
const DEFAULT_THEME = '#16A34A'

// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI.
type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}


// /tour/[slug] — universal profile flagship build. Mirrors the canonical
// /beautician/[slug] visual + layout one-for-one; data source swaps to
// tour_guide_listings. Per-service photo galleries (beautician's mig 0074
// service_photos) don't exist on the tour table, so the portfolio carousel
// flattens image_urls + gallery_image_urls.

// Vertical default for the hero. Used when the guide hasn't set their own
// cover_image_url yet — keeps the page on-brand.
const DEFAULT_TOUR_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2011_47_55%20PM.png'

// Public-shape tour guide listing. Mirrors the columns the marketplace +
// detail page already fetch with admin (service-role) credentials. RLS on
// tour_guide_listings publishes status='approved' rows to the anon client.
type TourListing = {
  id:                    string
  slug:                  string
  name:                  string
  whatsapp_e164:         string
  city:                  string | null
  address:               string | null
  services:              TourServiceId[] | null
  languages:             string[] | null
  day_rate_idr:          number | null
  notes:                 string | null
  rating:                number | null
  review_count:          number
  // mig 0072 universal profile fields
  cover_image_url:       string | null
  gallery_image_urls:    string[] | null
  instagram_url:         string | null
  tiktok_url:            string | null
  facebook_url:          string | null
  operating_hours:       Record<string, string> | null
  // mig 0087 — per-guide accent colour
  theme_color:           string | null
  // mig 0079 — physical Visit Us location (opt-in, mirrored 0107)
  has_physical_location?: boolean | null
  lat:                   number | null
  lng:                   number | null
  // mig 0107 — feature parity with the beautician contract
  busy_dates?:           string[] | null
  promo_text?:           string | null
  // mig 0053 / 0055 — what's included
  fuel_included?:        boolean | null
  bike_brand?:           string | null
  // marketplace portfolio photos column. Treated as gallery here.
  image_urls:            string[] | null
  is_mock:               boolean
}

export default function TourGuideProfilePage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<TourListing | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showMoreServices, setShowMoreServices] = useState(false)
  // null = show photos from ALL services (combined). When a service id
  // is set, the portfolio carousel filters to just that service.
  const [activeService, setActiveService] = useState<TourServiceId | null>(null)
  // Selected carousel card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  // Portfolio layout — flip between auto-drifting carousel + 2-col grid.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  // Reviews view — replaces everything below the floating info-card.
  const [showReviews, setShowReviews] = useState(false)
  // Visit Us view — also replaces content area when active (only
  // available when the guide has opted into a physical meeting point).
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [reviews, setReviews]         = useState<ReviewRow[] | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)
  // Lifted from ReviewsPanel so the footer Leave Review button can open
  // the form too, not just the in-panel trigger.
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  // Contact popup — opened by both the bottom Contact CTA and the
  // per-service "View Details" Contact button. `contactServiceName`
  // pre-fills the service field when triggered from a service card.
  const [contactOpen,        setContactOpen]        = useState(false)
  const [contactServiceName, setContactServiceName] = useState<string>('')

  useEffect(() => {
    capturePartnerFromUrl()
    setPartnerTag(getStoredPartnerSlug())
  }, [])

  useEffect(() => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) { setNotFound(true); return }
    fetch(`/api/tour/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: TourListing } | null) => {
        if (j?.provider) setP(j.provider); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  useProfileViewTracker({ providerType: 'tour_guide', providerId: p?.id })

  // Resolved accent color for every accent surface on this page.
  // p.theme_color (mig 0087) wins; fall back to emerald default.
  const theme = p?.theme_color || DEFAULT_THEME

  // Fetch reviews only when the panel is first opened, then again
  // after a new submission (bump reviewsRefreshCount).
  useEffect(() => {
    if (!showReviews || !p?.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=tour_guide&provider_id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, p?.id, reviewsRefreshCount])

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Tour guide not found</h1>
          <Link href="/tour" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/tour/${p.slug}`

  // WhatsApp prefill text for the under-carousel contact button.
  const waText = [
    `Halo ${p.name}, saya menemukan profil Anda di Kita2u.`,
    `Saya tertarik dengan tour Anda.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean).join('\n')
  void waText // mirrors beautician — kept for symmetry with future share-sheet links

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
            src={bannerSrc(p.cover_image_url) || DEFAULT_TOUR_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — tour rows don't carry a hero_text jsonb yet
              (beautician's mig 0081). Defaults: "Local / Tour Guide" with
              tagline "See your city through a local's eyes". */}
          {(() => {
            const line1   = 'Local'
            const line2   = 'Tour Guide'
            const tagline = "See your city through a local's eyes"
            const line2Color   = theme
            const line1Color   = '#000000'
            const taglineColor = '#000000'
            const effect = 'none' as const
            return (
              <div className={`absolute left-4 z-10 select-none leading-none cr-hero-${effect}`} style={{ top: 31 }}>
                <div className="flex items-center gap-0.5 text-[28px] sm:text-[34px] font-normal drop-shadow-[0_2px_6px_rgba(255,255,255,0.55)]" style={{ color: line1Color }}>
                  <span>{line1}</span>
                  <Compass
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

                {/* What's included row — tour guides travel TO places (not
                    FROM home/hotel/villa like beauticians), so the
                    service-locations icon row is replaced with a
                    fuel-included badge + bike brand label as the
                    equivalent "what's included" surface. Hidden when
                    neither field is set. */}
                {(() => {
                  const showFuel = typeof p.fuel_included === 'boolean'
                  const showBike = Boolean(p.bike_brand && p.bike_brand.trim())
                  if (!showFuel && !showBike) return null
                  const items: Array<{ key: string; label: string }> = []
                  if (showFuel) items.push({ key: 'fuel', label: p.fuel_included ? 'Fuel Included' : 'Fuel Excluded' })
                  if (showBike) items.push({ key: 'bike', label: (p.bike_brand || '').trim() })
                  return (
                    <div className="flex items-start gap-2 max-w-[280px]" style={{ marginTop: 15 }}>
                      {items.map((it, idx) => (
                        <React.Fragment key={it.key}>
                          {idx > 0 && <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />}
                          <HeroIcon
                            icon={it.key === 'fuel' ? Fuel : Bike}
                            slogan={it.label}
                            theme={theme}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )
          })()}
        </div>

        {/* Reviews toggle — pill above the floating card, right side.
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

        {/* Floating info card — overlaps the bottom edge of the cover.
            All 4 corners 15px. Left: avatar. Middle: name / city / rating.
            Right: "Top Rated Guide" badge. */}
        <div className="px-4 relative z-20" style={{ marginTop: 12 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            {/* Avatar — initial circle, themed (tour rows don't carry a
                profile_image_url field). */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black shrink-0 border-2 border-white shadow"
              style={{ background: theme }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>

            {/* Name + city + rating */}
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight flex items-center gap-1">
                <span className="truncate">{p.name}</span>
                <BadgeCheck
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.5}
                  fill={theme}
                  style={{ color: '#FFFFFF' }}
                  aria-label="Verified"
                />
              </h1>
              <p className="text-[12px] text-gray-500 truncate mt-0.5">
                {p.city?.trim().replace(/-/g, ' ') || 'Indonesia'}
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
                  ({p.review_count ?? 0} review{(p.review_count ?? 0) === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* Top Rated Guide badge — neutral gray pill so the chip
                stays unchanged across profiles; only the Award icon +
                text tint the active profile theme color. */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: theme }} />
              <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: theme }}>
                Top Rated Guide
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto space-y-3 pt-3">
        {showVisitUs ? (
          <>
            {p.has_physical_location && (
              <VisitUsPanel
                displayName={p.name}
                address={p.address ?? p.city ?? null}
                city={p.city ?? null}
                lat={typeof p.lat === 'number' ? p.lat : null}
                lng={typeof p.lng === 'number' ? p.lng : null}
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
                  (typeof p.lat === 'number' && typeof p.lng === 'number')
                    ? {
                        label: 'Book Bike Ride',
                        icon: Bike,
                        note: `We'll use your location for pickup and ${p.name}'s for drop-off — fare shows on the next screen.`,
                        onClick: () => {
                          const lat = p.lat as number
                          const lng = p.lng as number
                          const base = `/cari/rider?dLat=${lat}&dLng=${lng}&dName=${encodeURIComponent(p.name)}`
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
            )}
            {/* Contact form (mig 0137) — sibling card. */}
            {Boolean((p as unknown as { contact_form_enabled?: boolean }).contact_form_enabled
                  && (p as unknown as { contact_email?: string | null }).contact_email) && (
              <ContactFormPanel
                displayName={p.name}
                themeColor={theme}
                endpoint="/api/tour/contact"
                providerSlug={p.slug}
              />
            )}
            {!p.has_physical_location
              && !((p as unknown as { contact_form_enabled?: boolean }).contact_form_enabled
                && (p as unknown as { contact_email?: string | null }).contact_email)
              && (
                <button
                  type="button"
                  onClick={() => setShowVisitUs(false)}
                  className="text-[12px] font-bold text-gray-500 underline"
                >
                  Back
                </button>
            )}
          </>
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
        {/* About {name} — 5-line clamped bio. Black heading + gray body
            for readability on the white page background. Tour rows
            store the bio under `notes` (vs beautician's `bio`). */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              About {p.name}
            </h2>
            {(() => {
              // mig 0137 — Visit Us / Contact Us button picks its label
              // based on what the provider has set up.
              const hasVisitUs = Boolean(p.has_physical_location)
              const hasContactForm = Boolean(
                (p as unknown as { contact_form_enabled?: boolean }).contact_form_enabled
                && (p as unknown as { contact_email?: string | null }).contact_email,
              )
              if (!hasVisitUs && !hasContactForm) return null
              const label = hasVisitUs ? 'Visit Us' : 'Contact Us'
              return (
                <button
                  type="button"
                  onClick={() => setShowVisitUs(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                  style={{ color: theme }}
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {label}
                </button>
              )
            })()}
          </div>
          <div className="flex items-start gap-3">
            {p.notes?.trim() ? (
              <p
                className="text-[13px] text-gray-600 leading-snug flex-1 min-w-0"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.notes.replace(/\s*\n\s*/g, ' ')}
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No bio yet.</p>
            )}
          </div>
        </section>

        {/* Services Provided — filter chips. Tour rows store services[]
            (TourServiceId[]); we render up to 3 visible with a Menu
            toggle for overflow. Same filter-pill UX as beautician,
            with the canonical "All" reset chip on the left. */}
        {(() => {
          const offered = ((p.services ?? []).filter(Boolean) as string[])
            .map((id) => findTourService(id))
            .filter((s): s is NonNullable<typeof s> => s !== null)
          if (offered.length === 0) return null
          const all     = offered
          const visible = all.slice(0, 3)
          const hidden  = all.slice(3)
          const hasMore = hidden.length > 0
          return (
            <section className="space-y-2" style={{ marginTop: 15 }}>
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                Services Provided
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* "All" reset chip — clears any active service filter
                    so the portfolio carousel shows photos from every
                    category again. Highlighted with the theme when no
                    filter is active. */}
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
                {visible.map((s) => (
                  <ServiceFilterBadge
                    key={s.id} service={s}
                    active={activeService === s.id}
                    onClick={() => setActiveService(activeService === s.id ? null : s.id)}
                    theme={theme}
                  />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setShowMoreServices((v) => !v)}
                    aria-label={showMoreServices ? 'Hide other services' : 'Show other services'}
                    aria-expanded={showMoreServices}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white shrink-0 active:scale-[0.96] transition"
                    style={{ background: theme }}
                  >
                    <Menu className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {hasMore && showMoreServices && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hidden.map((s) => (
                    <ServiceFilterBadge
                      key={s.id} service={s}
                      active={activeService === s.id}
                      onClick={() => setActiveService(activeService === s.id ? null : s.id)}
                      theme={theme}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })()}

        {/* Portfolio carousel — image cards drawn from image_urls and
            gallery_image_urls. Tour rows don't carry per-service photo
            objects (beautician's service_photos), so the activeService
            filter highlights the chip but the same image set is shown. */}
        {(() => {
          const photos = buildPortfolioPhotos(p)
          if (photos.length === 0) return null
          const activeLabel = activeService
            ? (findTourService(activeService)?.label ?? '')
            : ''
          return (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {activeService
                    ? `${activeLabel} — Portfolio`
                    : 'Portfolio'}
                </h2>
                <PortfolioViewToggle
                  view={portfolioView}
                  onChange={setPortfolioView}
                  themeColor={theme}
                />
              </div>
              <p className="text-[11px] text-gray-500 italic -mt-1">
                Please contact for additional tours not listed
              </p>
              <PortfolioCarousel
                photos={photos as PortfolioPhoto[]}
                onViewDetails={(ph) => setDetailPhoto(ph)}
                themeColor={theme}
                currencySymbol={countryByCode((p as unknown as { country_code?: string | null }).country_code ?? 'ID').currency_symbol}
                view={portfolioView}
              />
            </section>
          )
        })()}

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={p.promo_text || `Message me this week — full-day, half-day, and custom-itinerary tours across ${p.city?.replace(/-/g, ' ') ?? 'Indonesia'}.`}
        />

        {/* CTA row under the carousel — large price on the left,
            themed Contact button (square w/ rounded corners) on the
            right. pb-4 leaves breathing room before the accent bar. */}
        <div className="flex items-end justify-between gap-3 pb-4">
          <div className="leading-none pb-3">
            <div className="text-[24px] sm:text-[28px] font-black text-black">
              {formatStartFromPrice(p)}
            </div>
            <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
              Day rate
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
              <h3 className="text-[16px] font-black text-black">Share Profile</h3>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              Bagikan profil {p.name} ke teman atau klien.
            </p>
            <div className="space-y-2">
              {/* Copy link — single-tap; status flips to "Copied!" for 1.8s. */}
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

              {/* WhatsApp — accepts URL share natively via wa.me. */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${p.name} di Kita2u: ${profileUrl}`)}`}
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

              {/* Facebook — accepts URL share via sharer.php. */}
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

              {/* Instagram — IG doesn't accept arbitrary URL share. We
                  copy the link to the clipboard and open IG so the user
                  can paste into a DM / Story / bio. */}
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

              {/* TikTok — same pattern: copy link, open app. */}
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

      {/* Right-edge "back" bar — tall vertical strip flush against the
          window edge (no protrusion into the page content). Yellow,
          rounded only on the inside (left) corners. Arrow icon top,
          vertical "BACK" text below. Diverts back to /tour. */}
      <a
        href="/tour"
        aria-label="Back to Kita2u tour guides"
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

      {/* Portfolio "View Details" popup — full image + description + Contact. */}
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
          CTA and any per-service Contact button. Submits a booking
          request server-side first (so it shows up on the tour guide's
          dashboard, mig 0107 tour_bookings) and then opens WhatsApp
          with a matching pre-filled message. Skips busy_dates the
          guide has marked. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={p.slug}
          providerName={p.name}
          whatsapp={p.whatsapp_e164}
          themeColor={theme}
          serviceOptions={(p.services ?? [])
            .map((sid) => findTourService(sid))
            .filter((s): s is NonNullable<typeof s> => s !== null)
            .map((s) => ({ value: s.label, label: `${s.emoji} ${s.label}` }))}
          presetService={contactServiceName}
          busyDates={(p.busy_dates ?? []) as string[]}
          bookEndpoint={`/api/tour/${p.slug}/book`}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Shell>
  )
}

// Kept imported so future custom hero-effect parity (beautician's mig
// 0081 hero_text shimmer/dance/underline) is a drop-in change.
void Sparkles
// TOUR_SERVICES kept imported so future per-service portfolio expansion
// is a one-line change.
void TOUR_SERVICES

function ServiceFilterBadge({
  service, active, onClick, theme,
}: {
  service: { id: TourServiceId; label: string; emoji: string }
  active: boolean
  onClick: () => void
  theme: string
}) {
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
      <span aria-hidden className="text-[14px] leading-none">{service.emoji}</span>
      {service.label}
    </button>
  )
}

// Day-rate price for the CTA. Returns "Rp 500k" / "Rp 1.2jt" style
// strings; falls back to a sensible placeholder so the CTA never reads
// empty. Tour rows store only day_rate_idr — no 3h/6h/8h sub-tiers on
// tour_guide_listings (those columns live on bike_rentals only).
function formatStartFromPrice(p: TourListing): string {
  const v = typeof p.day_rate_idr === 'number' && p.day_rate_idr > 0 ? p.day_rate_idr : null
  if (v === null) return 'Rp 500k'
  return formatPriceIdr(v) ?? 'Rp 500k'
}

// Portfolio photo aggregation — tour rows don't have per-service photo
// objects (beautician's mig 0074 service_photos shape). We fold image_urls
// (marketplace cover variants), gallery_image_urls (universal mig 0072
// field), and finally the cover_image_url as a last resort, dedup'd by
// URL. Each entry carries the primary service label so the View Details
// popup has something to render in its header.
function buildPortfolioPhotos(p: TourListing): PortfolioPhoto[] {
  const seen = new Set<string>()
  const out: PortfolioPhoto[] = []
  const services = (p.services ?? [])
    .map((sid) => findTourService(sid))
    .filter((s): s is NonNullable<typeof s> => s !== null)
  const primary = services[0]
  const primaryName = primary ? `${primary.emoji} ${primary.label}` : 'Tour'

  const push = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return
    if (seen.has(url)) return
    seen.add(url)
    out.push({
      url,
      name: primaryName,
      description: p.notes?.trim() ? p.notes.replace(/\s*\n\s*/g, ' ').slice(0, 240) : undefined,
      price_idr: p.day_rate_idr ?? null,
    })
  }

  for (const u of p.image_urls ?? [])         push(u)
  for (const u of p.gallery_image_urls ?? []) push(u)
  push(p.cover_image_url ?? null)
  return out
}

function formatPriceIdr(amount: number | null | undefined): string | null {
  if (typeof amount !== 'number' || amount <= 0) return null
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
          provider_type:     'tour_guide',
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
      // Reset + close + refetch via parent.
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

      {/* Inline review form — triggered by the footer "Leave Review"
          button. Renders directly on the page background (no card
          wrapper) so it doesn't feel like a nested popup. */}
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

          {/* 5-star picker — unselected stars are gray; selected stars
              turn solid yellow so the chosen rating is unambiguous. */}
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
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500"
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp (opsional, +62…)"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500"
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={250}
              rows={3}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis pengalaman Anda (max 250 huruf)"
              className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-emerald-500"
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

      {/* List — hidden while the inline review form is open so the
          user can focus on writing without the existing reviews + the
          empty-state placeholder taking up screen space below. */}
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

// Stable per-browser session id for review dedup. Reused across leave-
// review submissions; the API rejects same-session-same-provider dupes.
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
  icon: Icon, slogan, theme,
}: {
  icon: typeof Bike
  slogan: string
  theme: string
}) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      {/* Icon sits inside a soft white-tinted squircle so the theme-
          coloured icon stays readable on any cover-image backdrop. */}
      <span
        className="inline-flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm shadow-sm"
        style={{ width: 44, height: 44 }}
      >
        <Icon className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px]" strokeWidth={2.25} style={{ color: theme }} />
      </span>
      <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-black leading-tight whitespace-pre-line drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
        {slogan}
      </div>
    </div>
  )
}


function Shell({ children }: { children: React.ReactNode }) {
  // Solid white paints over the global PageBackground (which sits at
  // -z-10) so the courier scene doesn't show through here. min-h-[100dvh]
  // lets the page scroll naturally so panels like Visit Us / Reviews
  // can extend past the initial viewport.
  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      {/* Hide the floating dev-toolbar wrench on this page only. */}
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
