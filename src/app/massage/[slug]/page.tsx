'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Menu, Home, Hotel, Building2, Store, Share2, Link2, MessageCircle, X, ChevronLeft, ChevronRight, BadgeCheck, MapPin, Bike, ExternalLink, Calendar, type LucideIcon } from 'lucide-react'
import VisitUsMap from '@/components/profile/VisitUsMap'
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
import VisitUsViaCityDriversCard from '@/components/providers/VisitUsViaCityDriversCard'
import ContactBookingPopup from '@/components/profile/ContactBookingPopup'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { bannerSrc } from '@/lib/banners/transform'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { Sparkles } from 'lucide-react'
// Star + Award already imported above for the hero info-card.
import {
  MASSAGE_TYPE_GROUPS,
  MASSAGE_TYPE_LABELS,
  type MassageProviderPublic,
  type MassageType,
} from '@/lib/massage/types'
import { countryByCode } from '@/lib/data/countries'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import ProfileQaPanel from '@/components/addons/ProfileQaPanel'

// Default theme accent — used when the therapist hasn't picked their
// own theme_color (mig 0087). Therapists choose their accent from the
// dashboard color palette; the chosen hex flows through every accent
// surface on this page via the `theme` constant below.
const DEFAULT_THEME = '#0EA5E9'

// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI.
type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

// Photo entry for the per-service carousel. Mirrors the beautician
// BeauticianServicePhoto shape — same JSONB column shape on both
// verticals (mig 0104 brought massage to parity).
type MassageServicePhoto = {
  url:               string
  name?:             string
  description?:      string
  price_idr?:        number | null
  object_position?:  string
  before_image_url?: string
  after_image_url?:  string
}

// Flat catalog of massage types — derived from MASSAGE_TYPE_GROUPS so we
// can iterate categories in deterministic order when flattening the
// portfolio feed (analogue of BEAUTICIAN_SERVICES_OFFERED).
const MASSAGE_SERVICES_OFFERED: ReadonlyArray<{ id: MassageType; label: string }> =
  MASSAGE_TYPE_GROUPS.flatMap((g) => g.items).map((it) => ({ id: it.value, label: it.label }))

// /massage/[slug] — universal profile flagship build. Visual-first
// category (portfolio matters more than text); the kit's ProfileGallery
// is the centerpiece. 3-tier pricing (60min/90min/120min) renders only
// the durations the therapist actually offers.

// Vertical default for the hero. Used when the therapist hasn't set
// their own cover_image_url yet — keeps the page on-brand instead of
// showing the generic yellow gradient on every new signup.
const DEFAULT_BEAUTICIAN_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

export default function MassageProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<MassageProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showMoreServices, setShowMoreServices] = useState(false)
  // null = show photos from ALL services (combined). When a service id
  // is set, the portfolio carousel filters to just that service.
  const [activeService, setActiveService] = useState<MassageType | null>(null)
  // Selected carousel card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<MassageServicePhoto | null>(null)
  // Portfolio layout — flip between auto-drifting carousel + 2-col grid.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  // Reviews view — replaces everything below the floating info-card.
  const [showReviews, setShowReviews] = useState(false)
  // Visit Us view — also replaces content area when active (only
  // available when the therapist has opted into a physical location).
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
    fetch(`/api/massage/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: MassageProviderPublic } | null) => {
        if (j?.provider) setP(j.provider); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  useProfileViewTracker({ providerType: 'massage', providerId: p?.id })

  // Resolved accent color for every accent surface on this page.
  // p.theme_color (mig 0087) wins; fall back to global default sky blue.
  const theme = p?.theme_color || DEFAULT_THEME

  // Fetch reviews only when the panel is first opened, then again
  // after a new submission (bump reviewsRefreshCount).
  useEffect(() => {
    if (!showReviews || !p?.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=massage&provider_id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, p?.id, reviewsRefreshCount])

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Therapist not found</h1>
          <Link href="/massage" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://citydrivers.id'
  const profileUrl = `${siteOrigin}/massage/${p.slug}`

  // Resolved offered-services list. marketplace_categories drives the
  // chip row; when blank we fall back to wrapping the therapist's
  // primary massage_type so the row never reads empty.
  const offeredServices: MassageType[] = (() => {
    const mc = (p.marketplace_categories ?? []) as string[]
    const allow = new Set<string>(MASSAGE_SERVICES_OFFERED.map((s) => s.id))
    const filtered = mc.filter((v): v is MassageType => typeof v === 'string' && allow.has(v))
    if (filtered.length > 0) return filtered
    if (p.massage_type && allow.has(p.massage_type)) return [p.massage_type]
    return []
  })()

  // WhatsApp prefill text for the under-carousel contact button.
  const waText = [
    `Halo ${p.display_name}, saya menemukan profil Anda di CityDrivers.`,
    `Saya tertarik untuk booking session pijat.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean).join('\n')

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
            src={bannerSrc(p.cover_image_url) || DEFAULT_BEAUTICIAN_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — text now comes from p.hero_text (mig 0104)
              when set; otherwise falls back to the default copy. */}
          {(() => {
            const ht = (p.hero_text ?? {}) as Record<string, string | undefined>
            const line1   = ht.line1   || 'Professional'
            const line2   = ht.line2   || 'Massage Therapist'
            const tagline = ht.tagline || 'Bringing relaxation to your space'
            const line2Color   = ht.color         || theme
            const line1Color   = ht.line1_color   || '#000000'
            const taglineColor = ht.tagline_color || '#000000'
            // Map legacy 'dance' / 'flyin' values to 'none' so old saved
            // data doesn't break the new effect set.
            const rawEffect = ht.effect || 'none'
            const effect = ['none','shimmer','dance','underline'].includes(rawEffect) ? rawEffect : 'none'
            return (
              <div className={`absolute left-4 z-10 select-none leading-none cr-hero-${effect}`} style={{ top: 31 }}>
                {/* Refined, premium effects — scoped to the line2
                    (cr-hero-word) span only. */}
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

                {/* Service locations the therapist travels to —
                    driven by p.service_locations (mig 0088). Each
                    location is rendered only when explicitly set; a
                    missing or null array hides the whole row so
                    legacy profiles without the field don't reveal
                    locations they may not actually serve. */}
                {(() => {
                  const locs = new Set(p.service_locations ?? [])
                  const hasSpa = Boolean(p.has_physical_location)
                  if (locs.size === 0 && !hasSpa) return null
                  const items: Array<{ key: string; icon: typeof Home; label: string }> = []
                  if (locs.has('home'))  items.push({ key: 'home',  icon: Home,      label: 'Home' })
                  if (locs.has('hotel')) items.push({ key: 'hotel', icon: Hotel,     label: 'Hotel' })
                  if (locs.has('villa')) items.push({ key: 'villa', icon: Building2, label: 'Villa' })
                  // Spa icon — appended when has_physical_location is on.
                  // When spa is the ONLY mode, the label expands to
                  // "Massage Spa" so it's obvious this is in-studio only.
                  if (hasSpa) {
                    const label = locs.size === 0 ? 'Massage Spa' : 'Spa'
                    items.push({ key: 'spa', icon: Store, label })
                  }
                  return (
                    <div className="flex items-start gap-2 max-w-[280px]" style={{ marginTop: 15 }}>
                      {items.map((it, idx) => (
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

        {/* Reviews toggle — themed pill above the floating card, right side.
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
            Right: "Top Rated Seller" badge. */}
        <div className="px-4 relative z-20" style={{ marginTop: 12 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            {/* Profile image */}
            {p.profile_image_url ? (
              <img
                src={p.profile_image_url}
                alt={p.display_name}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black shrink-0 border-2 border-white shadow"
                style={{ background: '#EC4899' }}
              >
                {p.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name + city + rating */}
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight flex items-center gap-1">
                <span className="truncate">{p.display_name}</span>
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

            {/* Top Rated Seller badge — neutral gray pill so the chip
                stays unchanged across profiles; only the Award icon +
                text tint the active profile theme color so each profile
                shows its own accent. */}
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
        {/* Visit Us via CityDrivers — owner-toggled (mig 0191). Gated on
            visit_us_enabled AND a pinned location. See memory file
            project_kita2u_to_citydrivers_handoff.md for the 3-rule pattern. */}
        {((p as unknown as { visit_us_enabled?: boolean }).visit_us_enabled === true
          && typeof p.latitude === 'number'
          && typeof p.longitude === 'number') && (
          <VisitUsViaCityDriversCard
            salonName={p.display_name}
            salonLat={p.latitude}
            salonLng={p.longitude}
            themeColor={theme}
          />
        )}
        {showVisitUs ? (
          <>
            {p.has_physical_location && (
              <VisitUsPanel
                displayName={p.display_name}
                address={p.service_area_notes ?? p.city ?? null}
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
                        note: `We'll use your location for pickup and ${p.display_name}'s for drop-off — fare shows on the next screen.`,
                        onClick: () => {
                          const lat = p.latitude as number
                          const lng = p.longitude as number
                          const base = `/cari/rider?dLat=${lat}&dLng=${lng}&dName=${encodeURIComponent(p.display_name)}`
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
                displayName={p.display_name}
                themeColor={theme}
                endpoint="/api/massage/contact"
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
        {/* About {name} — 4-line clamped bio. Black heading + gray body
            for readability on the white page background. */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              About {p.display_name}
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
                {/* Collapse stray \n in the stored bio to a single
                    space so short sentences don't each sit on their
                    own line — text now flows naturally and the line
                    clamp counts true rendered lines. */}
                {p.bio.replace(/\s*\n\s*/g, ' ')}
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No bio yet.</p>
            )}
          </div>
        </section>

        {/* Services Provided — only renders services that actually have
            at least one "live" carousel entry (image + description).
            Empty placeholder services don't deserve a public badge. */}
        {(() => {
          const offered = offeredServices
          if (offered.length === 0) return null
          const sp = (p.service_photos ?? {}) as Record<string, unknown[]>
          const live = offered.filter((sid) => {
            const arr = sp[sid]
            if (!Array.isArray(arr)) return false
            return arr.some((item) =>
              item && typeof item === 'object'
              && typeof (item as { url?: unknown }).url === 'string'
              && (item as { url: string }).url.trim().length > 0
              && typeof (item as { description?: unknown }).description === 'string'
              && (item as { description: string }).description.trim().length > 0
            )
          })
          if (live.length === 0) return null
          const all     = live
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
                {visible.map((sid) => (
                  <ServiceFilterBadge
                    key={sid} sid={sid}
                    active={activeService === sid}
                    onClick={() => setActiveService(activeService === sid ? null : sid)}
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
                  {hidden.map((sid) => (
                    <ServiceFilterBadge
                      key={sid} sid={sid}
                      active={activeService === sid}
                      onClick={() => setActiveService(activeService === sid ? null : sid)}
                      theme={theme}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })()}

        {/* Portfolio carousel — rich cards (image + name + 2-line desc
            + start price + View Details). Cards swipe left-to-right. */}
        {(() => {
          const photos = buildPortfolioPhotos(p, activeService, offeredServices)
          if (photos.length === 0) return null
          return (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {activeService
                    ? `${MASSAGE_TYPE_LABELS[activeService]} — Portfolio`
                    : 'Portfolio'}
                </h2>
                <PortfolioViewToggle
                  view={portfolioView}
                  onChange={setPortfolioView}
                  themeColor={theme}
                />
              </div>
              <p className="text-[11px] text-gray-500 italic -mt-1">
                Please contact for additional services not listed
              </p>
              <PortfolioCarousel
                photos={photos as PortfolioPhoto[]}
                onViewDetails={(ph) => setDetailPhoto(ph as MassageServicePhoto)}
                themeColor={theme}
                view={portfolioView}
                currencySymbol={countryByCode((p as unknown as { country_code?: string | null }).country_code ?? 'ID').currency_symbol}
              />
            </section>
          )
        })()}

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={p.promo_text || 'Message me this week — exclusive promo on professional massage session delivered straight to your home, hotel or villa, in the comfort of your stay.'}
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
              Start from
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
              Bagikan profil {p.display_name} ke teman atau klien.
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
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${p.display_name} di CityDrivers: ${profileUrl}`)}`}
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
          vertical "BACK" text below. Diverts back to /massage. */}
      <Link
        href="/massage"
        aria-label="Back to CityDrivers therapists"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right: 0,
          /* Anchored beside the About/bio block on first paint so the
             button never covers the interactive surfaces lower on the
             page (Services chips, Portfolio carousel, Contact CTA).
             top 35% + translateY(-50%) puts the 110px button visually
             at ~30-40% of the viewport — i.e. the bio band. */
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
      </Link>

      {/* Footer Leave Review button — only renders when the Reviews
          panel is active AND the inline form isn't already open.
          Hidden while the user is filling the form so it doesn't
          obscure the Submit button. */}
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

      {/* Portfolio "View Details" popup — full image + before/after
          thumbs (if uploaded) + description + start price + Contact. */}
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
          request server-side first (so it shows up on the therapist's
          calendar) and then opens WhatsApp with a matching pre-filled
          message. Skips busy_dates the therapist has marked. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={p.slug}
          providerName={p.display_name}
          whatsapp={p.whatsapp_e164}
          providerId={p.id}
          intentVertical="massage"
          intentSource="massage_profile"
          themeColor={theme}
          serviceOptions={offeredServices.map((sid) => ({
            value: MASSAGE_TYPE_LABELS[sid] ?? sid,
            label: MASSAGE_TYPE_LABELS[sid] ?? sid,
          }))}
          presetService={contactServiceName}
          busyDates={(p.busy_dates ?? []) as string[]}
          bookEndpoint={`/api/massage/${p.slug}/book`}
          onClose={() => setContactOpen(false)}
        />
      )}
      {/* Q&A add-on panel — renders only when owner has the 'qa' addon enabled
          AND has at least one Q&A item. Otherwise null. */}
      <div className="max-w-2xl mx-auto px-4">
        <ProfileQaPanel ownerUserId={p.owner_user_id ?? null} />
      </div>
      <PoweredByKita2u defaultVertical="massage" />
    </Shell>
  )
}

// PortfolioDetailPopup + ThumbButton now live in
// @/components/profile/PortfolioCarousel.tsx and are imported at the
// top of this file.

// ContactBookingPopup now lives in @/components/profile/ContactBookingPopup.tsx
// Inline copy removed in Phase 2-A4.

// Carousel card — image up top, name + 2-line description + start
// Portfolio carousel — auto-drifts left at a slow pace and pauses on
// user interaction so swipe/drag/wheel still works. Cards are
// duplicated so the loop seam (when scrollLeft passes half-width and
// wraps back to 0) is invisible.
// PortfolioCarousel + PortfolioCard now live in
// @/components/profile/PortfolioCarousel.tsx — imported at the top of
// this file. Inline copies removed in Phase 2-A2.

function ServiceFilterBadge({
  sid, active, onClick, theme,
}: { sid: MassageType; active: boolean; onClick: () => void; theme: string }) {
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
      {MASSAGE_TYPE_LABELS[sid] ?? sid}
    </button>
  )
}

// Cheapest price across all per-photo entries (mig 0104 rich shape).
// Falls back to the 60/90/120-min columns when no photo prices are set
// so the CTA never reads empty.
function formatStartFromPrice(p: MassageProviderPublic): string {
  const photoPrices: number[] = []
  const sp = (p.service_photos ?? {}) as Record<string, unknown[]>
  for (const arr of Object.values(sp)) {
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (item && typeof item === 'object' && typeof (item as { price_idr?: unknown }).price_idr === 'number') {
        const n = (item as { price_idr: number }).price_idr
        if (n > 0) photoPrices.push(n)
      }
    }
  }
  const fallback = [p.price_60min_idr, p.price_90min_idr, p.price_120min_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const all = photoPrices.length > 0 ? photoPrices : fallback
  if (all.length === 0) return 'Rp 200k'
  return formatPriceIdr(Math.min(...all)) ?? 'Rp 200k'
}

// Normalises one service_photos entry — accepts either a plain URL
// string (legacy) or the rich object shape, returns the rich shape.
function normalisePhoto(raw: unknown): MassageServicePhoto | null {
  if (typeof raw === 'string') return { url: raw }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Partial<MassageServicePhoto>
    if (typeof o.url === 'string' && o.url) return { ...o, url: o.url } as MassageServicePhoto
  }
  return null
}

// Combines per-service photos into the carousel feed. When a service
// filter is active, returns just that service's photos; otherwise
// flattens every service's photos in catalog order so the carousel
// stays deterministic. Falls back to the legacy gallery_image_urls
// (treated as headless URLs) when service_photos is empty.
function buildPortfolioPhotos(
  p: MassageProviderPublic,
  active: MassageType | null,
  offeredServices: MassageType[],
): MassageServicePhoto[] {
  const sp = (p.service_photos ?? {}) as Record<string, unknown[]>
  // Only show photos for categories the therapist actually offers.
  // Old rows can carry leftover keys; those should not surface in the
  // public carousel.
  const offered = new Set<MassageType>(offeredServices)
  if (active) {
    if (offered.size > 0 && !offered.has(active)) return []
    const arr = sp[active] ?? []
    return arr.map(normalisePhoto).filter((x): x is MassageServicePhoto => x !== null)
  }
  const ordered: MassageServicePhoto[] = []
  for (const cat of MASSAGE_SERVICES_OFFERED) {
    if (offered.size > 0 && !offered.has(cat.id)) continue
    const arr = sp[cat.id]
    if (!Array.isArray(arr)) continue
    for (const raw of arr) {
      const n = normalisePhoto(raw)
      if (n) ordered.push(n)
    }
  }
  if (ordered.length > 0) return ordered
  return (p.gallery_image_urls ?? []).map((url) => ({ url }))
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

// VisitUsPanel + AvailabilityCalendarPopup + Social*Icons now live in
// @/components/profile/VisitUsPanel.tsx — imported at the top of this file.
// Inline copies removed in Phase 2-A3.

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
          provider_type:     'massage',
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
  src, icon: Icon, slogan, theme,
}: { src?: string; icon?: LucideIcon; slogan: string; theme: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      {/* Icon sits inside a soft white-tinted squircle so the theme-
          coloured icon stays readable on any cover-image backdrop
          (especially dark themes). */}
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
  // Solid white paints over the global PageBackground (which sits at
  // -z-10) so the courier scene doesn't show through here. min-h-[100dvh]
  // lets the page scroll naturally so panels like Visit Us / Reviews
  // can extend past the initial viewport.
  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      {/* Hide the floating dev-toolbar wrench on this page only — the
          page is meant to read as a polished customer-facing profile
          and the spanner clutters the corner. Scoped to mount lifetime. */}
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
