'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Star, Award, Menu, Share2, Link2, MessageCircle, X,
  ChevronLeft, BadgeCheck, MapPin, Bike, Compass, Mountain,
  Waves, Sparkles,
} from 'lucide-react'
import VisitUsPanel, {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import PortfolioCarousel, {
  PortfolioDetailPopup,
  type PortfolioPhoto,
} from '@/components/profile/PortfolioCarousel'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import RunningMarquee from '@/components/profile/RunningMarquee'
import ContactBookingPopup from '@/components/profile/ContactBookingPopup'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import {
  TOUR_SERVICES,
  findTourService,
  type TourServiceId,
} from '@/data/tourServices'
import { getLanguageByCode, resolveDisplayLanguages } from '@/data/tourLanguages'

// ─────────────────────────────────────────────────────────────────────────────
// /tour/[slug] — Tour-guide profile, rebuilt to mirror the canonical
// /beautician/[slug] visual + layout. Same hero with overlay text, floating
// info-card, service filter row, portfolio carousel, Visit Us panel, reviews
// panel, share sheet, sticky contact CTA + accent bar. Tour-specific data
// substitutions documented inline at each call site.
// ─────────────────────────────────────────────────────────────────────────────

// Default accent — emerald (outdoor / nature tone) per spec, used when the
// tour-guide hasn't picked a custom theme_color (mig 0087 added theme_color
// to tour_guide_listings).
const DEFAULT_THEME = '#16A34A'

// Hero fallback when the listing doesn't have a cover_image_url yet — keeps
// the page on-brand instead of an empty black band.
const DEFAULT_TOUR_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2011_47_55%20PM.png'

// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI.
type ReviewRow = {
  id:            string
  reviewer_name: string
  rating:        number
  comment:       string | null
  created_at:    string
}

// Public-shape tour guide listing. Mirrors the columns the marketplace +
// detail page already fetch with admin (service-role) credentials. RLS on
// tour_guide_listings publishes status='approved' rows to the anon client.
type TourListing = {
  id:                   string
  slug:                 string
  name:                 string
  whatsapp_e164:        string
  city:                 string | null
  address:              string | null
  services:             string[] | null
  languages:            string[] | null
  day_rate_idr:         number | null
  notes:                string | null
  rating:               number | null
  review_count:         number
  // mig 0072 universal profile fields
  cover_image_url:      string | null
  gallery_image_urls:   string[] | null
  instagram_url:        string | null
  tiktok_url:           string | null
  facebook_url:         string | null
  operating_hours:      Record<string, string> | null
  // mig 0087 — accent color (added to tour_guide_listings)
  theme_color:          string | null
  // mig 0072 — physical Visit Us location (opt-in)
  // mig 0107 — has_physical_location / busy_dates / promo_text added to
  // tour_guide_listings to reach parity with the beautician contract. The
  // fields are optional on the type because pre-0107 fetch sites and the
  // mock_tour_guide_listings fallback don't return them.
  has_physical_location?: boolean | null
  lat:                   number | null
  lng:                   number | null
  busy_dates?:           string[] | null
  promo_text?:           string | null
  // marketplace portfolio photos column (image_urls). Treated as a
  // gallery here for the portfolio carousel.
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
  // null = show photos from ALL services (combined). When a service id is
  // set, the portfolio carousel filters to just that service's images.
  const [activeService, setActiveService] = useState<TourServiceId | null>(null)
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  const [showReviews, setShowReviews] = useState(false)
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactServiceName, setContactServiceName] = useState<string>('')

  useEffect(() => {
    capturePartnerFromUrl()
    setPartnerTag(getStoredPartnerSlug())
  }, [])

  // Server-side fetch via /api/tour/[slug]/public — the endpoint reads
  // tour_guide_listings first (status='approved') then falls back to
  // mock_tour_guide_listings (mock_hidden_at IS NULL). Returns
  // { provider: row, is_mock } so the page no longer needs to branch on
  // which table the row came from. 404 → notFound; other errors also
  // route to notFound to match the previous behaviour.
  useEffect(() => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) { setNotFound(true); return }
    let cancelled = false
    fetch(`/api/tour/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: TourListing } | null) => {
        if (cancelled) return
        if (j?.provider) setP(j.provider)
        else setNotFound(true)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
    return () => { cancelled = true }
  }, [slug])

  useProfileViewTracker({ providerType: 'tour_guide', providerId: p?.id })

  // Resolved accent — p.theme_color (mig 0087) wins; emerald default.
  const theme = p?.theme_color || DEFAULT_THEME

  // Reviews — same polymorphic endpoint as beautician, with provider_type=tour_guide.
  // /api/reviews supports tour_guide writes per mig 0075.
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
          <Link href="/tour" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
            Back to marketplace
          </Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/tour/${p.slug}`

  // WhatsApp prefill text for the under-carousel contact button — adapted
  // from the beautician version to tour-guide context.
  const waText = [
    `Halo ${p.name}, saya menemukan profil Anda di IndoCity.`,
    `Saya tertarik untuk hire kamu sebagai tour guide.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean).join('\n')

  // Languages resolved with Bahasa Indonesia guaranteed first (data layer
  // behaviour). Used in the hero language-flag row.
  const langs = resolveDisplayLanguages(p.languages ?? [])
  // Drop Bahasa Indonesia from the hero row — every guide speaks it, so the
  // pill row should highlight ONLY the foreign languages the guide adds value
  // through. Falls back to silent (no row) when only Indonesian is set.
  const heroLangs = langs.filter((l) => l.code !== 'id')

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
          style={{ background: theme, minHeight: 44, minWidth: 44 }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.cover_image_url || DEFAULT_TOUR_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — fixed copy tuned to tour-guide voice. Beautician's
              hero_text custom field doesn't exist on tour rows yet; flag as
              a follow-up if customisable hero copy is wanted here. */}
          <div className="absolute left-4 z-10 select-none leading-none" style={{ top: 31 }}>
            <div
              className="flex items-center gap-0.5 text-[28px] sm:text-[34px] font-normal drop-shadow-[0_2px_6px_rgba(255,255,255,0.55)]"
              style={{ color: '#000000' }}
            >
              <span>Local</span>
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
              <span className="inline-block" style={{ color: theme }}>
                Tour Guide
              </span>
            </div>
            <div
              className="text-[13px] sm:text-[14px] font-semibold mt-1.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: '#000000', maxWidth: 'min(360px, calc(100vw - 32px))' }}
            >
              See your city through a local's eyes
            </div>

            {/* Language flags the guide speaks — replaces beautician's
                service-locations icon row. Bahasa Indonesia is implied
                (every guide speaks it) so we only surface foreign
                languages here. Max 4 to keep the band scannable. */}
            {heroLangs.length > 0 && (
              <div className="flex items-start gap-2 max-w-[280px]" style={{ marginTop: 15 }}>
                {heroLangs.slice(0, 4).map((l, idx) => (
                  <React.Fragment key={l.code}>
                    {idx > 0 && <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />}
                    <HeroLanguageBadge flag={l.flag} label={l.label} theme={theme} />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews toggle — accent pill above the floating card, right side.
            Click swaps the area below for the reviews list. */}
        <div className="px-4 relative z-20 flex justify-end" style={{ marginTop: -56 }}>
          <button
            type="button"
            onClick={() => setShowReviews((v) => !v)}
            aria-pressed={showReviews}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[12px] font-extrabold shadow-md active:scale-[0.97] transition"
            style={{ background: theme, minHeight: 32 }}
          >
            <Star className="w-3.5 h-3.5" strokeWidth={0} fill="#FFFFFF" />
            {showReviews ? 'Hide reviews' : 'Reviews'}
          </button>
        </div>

        {/* Floating info card — overlaps the bottom edge of the cover.
            All 4 corners 15px. Left: avatar (initial). Middle: name / city /
            rating. Right: "Top Rated Guide" badge. Tour rows don't store a
            profile_image_url so the avatar is the branded initial. */}
        <div className="px-4 relative z-20" style={{ marginTop: 12 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            {/* Avatar — initial circle, themed (no profile_image_url field on tour rows). */}
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
                <span className="text-[12px] text-gray-500">
                  ({p.review_count ?? 0} review{(p.review_count ?? 0) === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* Top Rated Guide badge — neutral gray pill, themed icon + text. */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: theme }} />
              <span className="text-[12px] font-extrabold whitespace-nowrap" style={{ color: theme }}>
                Top Rated Guide
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto space-y-3 pt-3">
        {showVisitUs ? (
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
            {/* About — 5-line clamped bio from p.notes (tour-guide column). */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  About {p.name}
                </h2>
                {(p.has_physical_location ||
                  (typeof p.lat === 'number' && typeof p.lng === 'number')) && (
                  <button
                    type="button"
                    onClick={() => setShowVisitUs(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                    style={{ color: theme, minHeight: 32 }}
                  >
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Visit Us
                  </button>
                )}
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

            {/* Tour Themes — filter chips. Beautician's "Services Provided"
                analogue. Tour rows store services[] (TourServiceId[]); we
                render up to 3 visible chips with a Menu toggle for overflow. */}
            {(() => {
              const offered = ((p.services ?? []).filter(Boolean) as string[])
                .map((id) => findTourService(id))
                .filter((s): s is NonNullable<typeof s> => s !== null)
              if (offered.length === 0) return null
              const visible = offered.slice(0, 3)
              const hidden  = offered.slice(3)
              const hasMore = hidden.length > 0
              return (
                <section className="space-y-2" style={{ marginTop: 15 }}>
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                    Tour Themes
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* "All" reset chip — clears any active theme filter. */}
                    <button
                      type="button"
                      onClick={() => { setActiveService(null); setShowMoreServices(false) }}
                      aria-pressed={activeService === null}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide transition active:scale-[0.97]"
                      style={
                        activeService === null
                          ? { background: theme, color: '#FFFFFF', minHeight: 32 }
                          : { background: '#F3F4F6', color: '#374151', minHeight: 32 }
                      }
                    >
                      All
                    </button>
                    {visible.map((s) => (
                      <TourThemeBadge
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
                        aria-label={showMoreServices ? 'Hide other themes' : 'Show other themes'}
                        aria-expanded={showMoreServices}
                        className="inline-flex items-center justify-center rounded-full text-white shrink-0 active:scale-[0.96] transition"
                        style={{ background: theme, width: 44, height: 44 }}
                      >
                        <Menu className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                  {hasMore && showMoreServices && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hidden.map((s) => (
                        <TourThemeBadge
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

            {/* Portfolio carousel — image cards drawn from image_urls + the
                universal gallery_image_urls + cover. Tour rows don't carry
                per-service photo objects (beautician's service_photos), so
                the activeService filter visually highlights the chip but the
                same image set is shown. Flag as a follow-up if per-theme
                portfolio is desired. */}
            {(() => {
              const photos = buildPortfolioPhotos(p)
              if (photos.length === 0) return null
              const headingSuffix = activeService
                ? ` — ${findTourService(activeService)?.label ?? ''}`
                : ''
              return (
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                      Portfolio{headingSuffix}
                    </h2>
                    <PortfolioViewToggle
                      view={portfolioView}
                      onChange={setPortfolioView}
                      themeColor={theme}
                    />
                  </div>
                  <p className="text-[12px] text-gray-500 italic -mt-1">
                    Pick a theme above or message {p.name} for a custom itinerary.
                  </p>
                  <PortfolioCarousel
                    photos={photos}
                    onViewDetails={(ph) => setDetailPhoto(ph)}
                    themeColor={theme}
                    view={portfolioView}
                  />
                </section>
              )
            })()}

            {/* Running marquee — promo ribbon under the carousel. Tour rows
                added p.promo_text via mig 0072; falls back to a generic
                tour-flavoured line so it never reads empty. */}
            <RunningMarquee
              text={p.promo_text
                || `Message ${p.name} this week — full-day, half-day, and custom-itinerary tours across ${p.city?.replace(/-/g, ' ') ?? 'Indonesia'}.`}
            />

            {/* CTA row under the carousel — large "Start from" price on the
                left, themed Contact button on the right. */}
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="leading-none pb-3">
                <div className="text-[24px] sm:text-[28px] font-black text-black">
                  {formatStartFromPrice(p)}
                </div>
                <div className="text-[12px] sm:text-[13px] font-medium text-gray-500 mt-1">
                  Start from / day
                </div>
              </div>
              {p.whatsapp_e164 && (
                <button
                  type="button"
                  onClick={() => { setContactServiceName(''); setContactOpen(true) }}
                  className="inline-flex items-center gap-1.5 justify-center px-5 py-3 rounded-xl text-white font-extrabold text-[13px] shadow-md active:scale-[0.97] transition shrink-0"
                  style={{ background: theme, minHeight: 44 }}
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
                className="rounded-full hover:bg-gray-100 flex items-center justify-center"
                style={{ width: 44, height: 44 }}
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              Bagikan profil {p.name} ke teman atau wisatawan lain.
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
                style={{ minHeight: 44 }}
              >
                <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-extrabold text-black">
                    {shareCopied ? 'Copied!' : 'Copy link'}
                  </div>
                  <div className="text-[12px] text-gray-500 truncate">{profileUrl}</div>
                </div>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat tour guide ${p.name} di IndoCity: ${profileUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#25D366', minHeight: 44 }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">WhatsApp</div>
                  <div className="text-[12px] text-white/85">Send link to a contact</div>
                </div>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#1877F2', minHeight: 44 }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialFacebookIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Facebook</div>
                  <div className="text-[12px] text-white/85">Share to your timeline</div>
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
                style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)', minHeight: 44 }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialInstagramIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Instagram</div>
                  <div className="text-[12px] text-white/85">Link copied — paste to DM / Story</div>
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
                style={{ minHeight: 44 }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialTikTokIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">TikTok</div>
                  <div className="text-[12px] text-white/85">Link copied — paste to bio / DM</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-edge "back" bar — anchored beside the bio band; diverts to /tour. */}
      <a
        href="/tour"
        aria-label="Back to IndoCity tour guides"
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
            fontSize: 12,
            letterSpacing: '0.18em',
          }}
        >
          Back
        </span>
      </a>

      {/* Footer Leave Review button — only when Reviews panel is active AND
          the inline form isn't already open. */}
      {showReviews && !reviewFormOpen && (
        <button
          type="button"
          onClick={() => setReviewFormOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 z-30 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-white text-[13px] font-extrabold shadow-lg active:scale-[0.97] transition"
          style={{ bottom: 18, background: theme, boxShadow: '0 6px 18px rgba(0,0,0,0.35)', minHeight: 44 }}
        >
          <Star className="w-4 h-4" strokeWidth={0} fill="#FFFFFF" />
          Leave Review
        </button>
      )}

      {/* Bottom accent bar — fixed to viewport edge. */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* Portfolio "View Details" popup — image + description + Contact. */}
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

      {/* Contact popup — beautician hits /api/beautician/[slug]/book to
          persist a booking_request before bouncing to WhatsApp. Tour has no
          equivalent endpoint yet, so we open WhatsApp directly with a
          partner-attribution-aware prefill text. Flag as a follow-up:
          add /api/tour/[slug]/book + busy_dates editor so the popup can
          mirror beautician's full flow. */}
      {contactOpen && p.whatsapp_e164 && (
        <SimpleContactPopup
          providerName={p.name}
          whatsapp={p.whatsapp_e164}
          themeColor={theme}
          presetService={contactServiceName}
          serviceOptions={(p.services ?? [])
            .map((sid) => findTourService(sid))
            .filter((s): s is NonNullable<typeof s> => s !== null)
            .map((s) => ({ value: s.label, label: `${s.emoji} ${s.label}` }))}
          partnerTag={partnerTag}
          waText={waText}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tour-theme filter chip — beautician's ServiceFilterBadge equivalent.
// Uses the tour-service emoji instead of the generic Sparkles icon so the
// row reads as "themes" not abstract services.
// ─────────────────────────────────────────────────────────────────────────────
function TourThemeBadge({
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
          ? { background: theme, color: '#FFFFFF', minHeight: 32 }
          : { background: 'rgba(229, 231, 235, 0.95)', color: '#0A0A0A', minHeight: 32 }
      }
    >
      <span aria-hidden className="text-[14px] leading-none">{service.emoji}</span>
      {service.label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero language badge — replaces beautician's HeroIcon for the language row.
// Big flag emoji + label, white squircle tile that stays readable on any
// cover image.
// ─────────────────────────────────────────────────────────────────────────────
function HeroLanguageBadge({
  flag, label, theme,
}: { flag: string; label: string; theme: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      <span
        className="inline-flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm shadow-sm"
        style={{ width: 44, height: 44, border: `1px solid ${theme}22` }}
      >
        <span aria-hidden className="text-[26px] sm:text-[28px] leading-none">{flag}</span>
      </span>
      <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-black leading-tight whitespace-pre-line drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
        {label}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Price formatting — tour rows store day_rate_idr (IDR per 8h day). Returns
// "Rp 500k" / "Rp 1.2jt" style strings; falls back to "Rp 500k" when no
// price is set so the CTA never reads empty.
// ─────────────────────────────────────────────────────────────────────────────
function formatStartFromPrice(p: TourListing): string {
  const v = typeof p.day_rate_idr === 'number' && p.day_rate_idr > 0 ? p.day_rate_idr : null
  if (v === null) return 'Rp 500k'
  return formatPriceIdr(v) ?? 'Rp 500k'
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

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio photo aggregation — tour rows don't have per-service photo
// objects (beautician's mig 0074 service_photos shape). We fold image_urls
// (marketplace cover variants), gallery_image_urls (universal mig 0072 field),
// and finally the cover_image_url as a last resort, dedup'd by URL.
// Each entry carries the primary service label as a soft name so the
// View Details popup has something to render.
// ─────────────────────────────────────────────────────────────────────────────
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

  for (const u of p.image_urls ?? [])        push(u)
  for (const u of p.gallery_image_urls ?? []) push(u)
  push(p.cover_image_url ?? null)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews panel — copy of beautician's, with provider_type='tour_guide'
// so reviews land on the correct polymorphic row (mig 0075).
// ─────────────────────────────────────────────────────────────────────────────
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
              className="rounded-full flex items-center justify-center text-white shadow-sm active:scale-[0.95] transition"
              style={{ background: theme, width: 32, height: 32 }}
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
                  style={{ minWidth: 44, minHeight: 44 }}
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
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none"
            style={{ minHeight: 44 }}
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp (opsional, +62…)"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none"
            style={{ minHeight: 44 }}
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={250}
              rows={3}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis pengalaman Anda (max 250 huruf)"
              className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none"
            />
            <div className="text-[12px] text-gray-500 text-right">{comment.length}/250</div>
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
            style={{ background: theme, minHeight: 44 }}
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
                    <div className="text-[12px] text-gray-500">{formatReviewWhen(r.created_at)}</div>
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

// ─────────────────────────────────────────────────────────────────────────────
// SimpleContactPopup — tour-guide-only because /api/tour/[slug]/book doesn't
// exist yet. Opens the same bottom-sheet UX as ContactBookingPopup but skips
// the persisted booking_request step; on submit it just bounces to WhatsApp
// with a fully composed message (date + time + theme + notes + partner tag).
// Once the booking endpoint lands, swap this back to <ContactBookingPopup>.
// ─────────────────────────────────────────────────────────────────────────────
function SimpleContactPopup({
  providerName, whatsapp, themeColor, presetService = '', serviceOptions,
  partnerTag, waText, onClose,
}: {
  providerName:   string
  whatsapp:       string
  themeColor:     string
  presetService?: string
  serviceOptions: Array<{ value: string; label: string }>
  partnerTag:     string | null
  waText:         string
  onClose:        () => void
}) {
  const [name,    setName]    = useState('')
  const [wa,      setWa]      = useState('')
  const [date,    setDate]    = useState('')
  const [time,    setTime]    = useState('')
  const [service, setService] = useState(presetService)
  const [notes,   setNotes]   = useState('')
  const [err,     setErr]     = useState<string | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])

  function submit() {
    setErr(null)
    if (name.trim().length < 2) { setErr('Please add your name.'); return }
    const waDigits = wa.replace(/[^\d]/g, '')
    if (waDigits.length < 8 || waDigits.length > 15) {
      setErr('Please add a valid WhatsApp number.')
      return
    }
    if (!date) { setErr('Pick a date.'); return }
    if (!time) { setErr('Pick a time.'); return }
    const lines = [
      `Halo ${providerName}, saya menemukan profil Anda di IndoCity.`,
      service.trim() ? `Saya tertarik untuk tour: ${service.trim()}.` : 'Saya tertarik untuk hire kamu sebagai tour guide.',
      `Tanggal: ${date} jam ${time}.`,
      notes.trim() ? `Catatan: ${notes.trim()}` : '',
      partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
      `\n— Dikirim via indocity.id`,
    ].filter(Boolean).join('\n')
    window.open(
      `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(lines)}`,
      '_blank',
    )
    onClose()
  }

  // Quick "just open WhatsApp" path — uses the partner-aware waText built
  // in the parent so single-tap contact still works without picking a date.
  function quickWhatsApp() {
    window.open(
      `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(waText)}`,
      '_blank',
    )
    onClose()
  }

  const timeSuggestions = ['07:00', '09:00', '10:30', '13:00', '15:00', '17:00']

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ borderTop: `4px solid ${themeColor}` }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center z-10"
          style={{ width: 44, height: 44 }}
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="px-5 pt-6 pb-6 space-y-3.5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div
              className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: `${themeColor}18`,
                border: `1.5px solid ${themeColor}40`,
              }}
            >
              <MessageCircle className="w-6 h-6" strokeWidth={2.25} style={{ color: themeColor }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-[12px] font-extrabold uppercase tracking-[0.15em]"
                style={{ color: themeColor }}
              >
                Contact
              </div>
              <h2 className="text-[18px] font-black text-black leading-tight mt-0.5 truncate">
                Book {providerName}
              </h2>
            </div>
          </div>

          <p className="text-[13px] text-gray-600 leading-snug">
            Pick a date + time and we&apos;ll open WhatsApp with your request.
          </p>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none"
            style={{ minHeight: 44 }}
          />
          <input
            type="tel"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="Your WhatsApp (+62…)"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none"
            style={{ minHeight: 44 }}
          />
          {serviceOptions.length > 0 && (
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none"
              style={{ minHeight: 44 }}
            >
              <option value="">Pick a tour theme (optional)</option>
              {serviceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none"
            style={{ minHeight: 44 }}
          />
          <div className="grid grid-cols-3 gap-1.5">
            {timeSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                aria-pressed={time === t}
                className="rounded-lg text-[13px] font-extrabold transition active:scale-[0.97]"
                style={
                  time === t
                    ? { background: themeColor, color: '#FFFFFF', minHeight: 44 }
                    : { background: '#F3F4F6', color: '#0A0A0A', minHeight: 44 }
                }
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            rows={2}
            maxLength={400}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — group size, pickup, dietary…"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none"
          />

          {err && (
            <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-[12px] px-2 py-1.5">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-white text-[13px] font-extrabold active:scale-[0.98] transition"
            style={{ background: themeColor, minHeight: 44 }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
            Send &amp; open WhatsApp
          </button>

          {/* Lightweight escape hatch — sends the partner-aware waText to
              WhatsApp without requiring a fully filled form. */}
          <button
            type="button"
            onClick={quickWhatsApp}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-extrabold border active:scale-[0.98] transition"
            style={{ borderColor: themeColor, color: themeColor, minHeight: 44 }}
          >
            Skip — just open WhatsApp
          </button>

          <p className="text-[12px] text-gray-500 text-center leading-snug">
            We&apos;ll send the date + theme + notes straight to {providerName}&apos;s WhatsApp.
          </p>
        </div>
      </div>
    </div>
  )
}

// Reference imports kept so unused-on-some-builds tree-shake doesn't blow up
// the bundle of carefully selected lucide icons (Sparkles, Mountain, Waves
// are reserved for future theme-icon wiring).
void Sparkles; void Mountain; void Waves
// ContactBookingPopup imported for parity with the canonical beautician
// shell; not currently mounted because tour rows lack a booking endpoint.
void ContactBookingPopup
// TOUR_SERVICES kept imported so future per-theme portfolio expansion is
// a one-line change.
void TOUR_SERVICES
// Languages — getLanguageByCode kept for future single-language overrides.
void getLanguageByCode

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

function Shell({ children }: { children: React.ReactNode }) {
  // Solid white shell — matches beautician so the global PageBackground
  // (courier scene at -z-10) doesn't show through. min-h-[100dvh] lets
  // panels (Reviews / Visit Us) extend past the initial viewport.
  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
