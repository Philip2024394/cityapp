'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Home, Hotel, Building2, Store, Share2, Link2, MessageCircle, X, ChevronLeft, BadgeCheck, MapPin, Bike, Sparkles, type LucideIcon } from 'lucide-react'
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
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import {
  MASSAGE_TYPE_LABELS,
  type MassageProviderPublic,
} from '@/lib/massage/types'

// ============================================================================
// /massage/[slug] — universal profile flagship build mirroring the
// beautician page layout (hero + info-card + portfolio + visit-us +
// reviews + sticky contact). Single-canvas profile for the 10-vertical
// IndoCity service grid.
// ============================================================================

// Default theme accent — sky blue evokes wellness / relaxation. Used
// when the therapist hasn't picked a custom theme_color (mig 0087).
const DEFAULT_THEME = '#0EA5E9'

// Vertical fallback hero — keeps new signups on-brand instead of a
// blank gradient when cover_image_url is empty.
const DEFAULT_MASSAGE_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

// Review row returned by GET /api/reviews. created_at ISO → formatted
// in the UI ("Xd ago" / absolute fallback).
type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

// Duration-tier pill ids (analogue of beautician services_offered).
type DurationTier = '60min' | '90min' | '120min'
const DURATION_TIER_LABELS: Record<DurationTier, string> = {
  '60min':  '60 min',
  '90min':  '90 min',
  '120min': '120 min',
}

export default function MassageProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<MassageProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  // null = show all gallery photos. When a tier id is set we filter
  // the carousel feed to entries tagged with that tier (the gallery
  // is a flat URL list today, so the filter is informational only
  // until the API exposes per-tier groupings — see follow-up note).
  const [activeTier, setActiveTier] = useState<DurationTier | null>(null)
  // Selected carousel card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  // Portfolio layout — flip between auto-drifting carousel + 2-col grid.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  // Reviews view — replaces content area when active.
  const [showReviews, setShowReviews] = useState(false)
  // Visit Us view — replaces content area when active (only available
  // when the therapist has opted into a physical location).
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [reviews, setReviews]         = useState<ReviewRow[] | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)
  // Lifted from ReviewsPanel so the footer Leave Review button can
  // open the form too.
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  // Contact popup — opened by both the bottom Contact CTA and the
  // per-card "View Details" Contact button.
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

  // Resolved accent color. p.theme_color (mig 0087) wins; fall back to
  // sky blue.
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

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/massage/${p.slug}`

  // Active tier set — the carousel filter is informational only today
  // (gallery is flat URL list), but we still surface the tiers the
  // therapist offers so the pill row reads as a real category filter.
  const availableTiers: DurationTier[] = [
    p.price_60min_idr  > 0 ? '60min'  as const : null,
    p.price_90min_idr  > 0 ? '90min'  as const : null,
    p.price_120min_idr > 0 ? '120min' as const : null,
  ].filter((x): x is DurationTier => x !== null)

  const massageTypeLabel = p.massage_type ? MASSAGE_TYPE_LABELS[p.massage_type] : null

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
            src={p.cover_image_url || DEFAULT_MASSAGE_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — Professional [Sparkle] / Massage Therapist /
              tagline. Massage type label drives the tagline so it's
              specific (e.g. "Pijat Bali (Balinese)"). */}
          {(() => {
            const line1   = 'Professional'
            const line2   = 'Massage Therapist'
            const tagline = massageTypeLabel
              ? `${massageTypeLabel} • Relax in your space`
              : 'Bringing relaxation to your space'
            const line1Color   = '#000000'
            const line2Color   = theme
            const taglineColor = '#000000'
            return (
              <div className="absolute left-4 z-10 select-none leading-none" style={{ top: 31 }}>
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
                  <span className="inline-block" style={{ color: line2Color }}>
                    {line2}
                  </span>
                </div>
                <div className="text-[13px] sm:text-[14px] font-semibold mt-1.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: taglineColor, maxWidth: 'min(360px, calc(100vw - 32px))' }}>
                  {tagline}
                </div>

                {/* Service locations the therapist travels to —
                    driven by p.service_locations (mig 0088). The row
                    only renders when explicitly set; missing arrays
                    hide it so legacy profiles don't advertise
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

        {/* Reviews toggle — themed pill above the floating card, right
            side. Click swaps the area below for the reviews list. */}
        <div className="px-4 relative z-20 flex justify-end" style={{ marginTop: -56 }}>
          <button
            type="button"
            onClick={() => setShowReviews((v) => !v)}
            aria-pressed={showReviews}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[12px] font-extrabold shadow-md active:scale-[0.97] transition"
            style={{ background: theme }}
          >
            <Star className="w-3.5 h-3.5" strokeWidth={0} fill="#FFFFFF" />
            {showReviews ? 'Hide reviews' : 'Reviews'}
          </button>
        </div>

        {/* Floating info card — overlaps the bottom edge of the cover.
            All 4 corners 15px. Left: avatar. Middle: name / city /
            rating. Right: "Top Rated Seller" badge. */}
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
                style={{ background: theme }}
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
                <span className="text-[12px] text-gray-500">
                  ({p.rating_count ?? 0} review{(p.rating_count ?? 0) === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* Top Rated Seller badge — neutral gray pill so the chip
                stays unchanged across profiles; only the Award icon +
                text tint the active profile theme color. */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: theme }} />
              <span className="text-[12px] font-extrabold whitespace-nowrap" style={{ color: theme }}>
                Top Rated Seller
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto space-y-3 pt-3">
        {showVisitUs ? (
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
            busyDates={[]}
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
            {p.has_physical_location && (
              <button
                type="button"
                onClick={() => setShowVisitUs(true)}
                className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
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
                {/* Collapse stray \n in the stored bio to a single
                    space so short sentences don't each sit on their
                    own line. */}
                {p.bio.replace(/\s*\n\s*/g, ' ')}
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No bio yet.</p>
            )}
          </div>
          {/* Massage type + experience secondary line — kept here so the
              About section reads as a complete intro before the pills. */}
          {(massageTypeLabel || (typeof p.years_experience === 'number' && p.years_experience > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {massageTypeLabel && (
                <span
                  className="inline-flex items-center text-[12px] font-extrabold px-2.5 py-1 rounded-full"
                  style={{ background: `${theme}1A`, color: theme }}
                >
                  {massageTypeLabel}
                </span>
              )}
              {typeof p.years_experience === 'number' && p.years_experience > 0 && (
                <span className="inline-flex items-center text-[12px] font-bold text-gray-600 px-2.5 py-1 rounded-full bg-gray-100">
                  {p.years_experience} yrs experience
                </span>
              )}
            </div>
          )}
        </section>

        {/* Session Lengths — analogue of beautician "Services Provided".
            One pill per duration tier the therapist actually prices.
            Active pill filters the portfolio carousel label (the
            gallery itself is a flat URL list today; the label change
            reinforces context). */}
        {availableTiers.length > 0 && (
          <section className="space-y-2" style={{ marginTop: 15 }}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              Session Lengths
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* "All" reset chip */}
              <button
                type="button"
                onClick={() => setActiveTier(null)}
                aria-pressed={activeTier === null}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide transition active:scale-[0.97]"
                style={
                  activeTier === null
                    ? { background: theme, color: '#FFFFFF' }
                    : { background: '#F3F4F6', color: '#374151' }
                }
              >
                All
              </button>
              {availableTiers.map((tid) => (
                <DurationFilterBadge
                  key={tid}
                  tier={tid}
                  active={activeTier === tid}
                  price={
                    tid === '60min'  ? p.price_60min_idr  :
                    tid === '90min'  ? p.price_90min_idr  :
                                       p.price_120min_idr
                  }
                  onClick={() => setActiveTier(activeTier === tid ? null : tid)}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        )}

        {/* Portfolio carousel — rich cards (image + name + start price
            + View Details). Massage has no per-service photo gallery
            in the API today, so we synthesize cards from
            gallery_image_urls. */}
        {(() => {
          const photos = buildPortfolioPhotos(p, activeTier)
          if (photos.length === 0) return null
          return (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {activeTier
                    ? `${DURATION_TIER_LABELS[activeTier]} — Portfolio`
                    : 'Portfolio'}
                </h2>
                <PortfolioViewToggle
                  view={portfolioView}
                  onChange={setPortfolioView}
                  themeColor={theme}
                />
              </div>
              <p className="text-[12px] text-gray-500 italic -mt-1">
                Please contact for additional services not listed
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

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={`Message me this week — professional ${massageTypeLabel ? massageTypeLabel.toLowerCase() : 'massage'} delivered to your home, hotel or villa, in the comfort of your stay.`}
        />

        {/* CTA row under the carousel — large price on the left,
            themed Contact button on the right. */}
        <div className="flex items-end justify-between gap-3 pb-4">
          <div className="leading-none pb-3">
            <div className="text-[24px] sm:text-[28px] font-black text-black">
              {formatStartFromPrice(p)}
            </div>
            <div className="text-[12px] sm:text-[12px] font-medium text-gray-500 mt-1">
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
                  <div className="text-[12px] text-gray-500 truncate">{profileUrl}</div>
                </div>
              </button>

              {/* WhatsApp — accepts URL share natively via wa.me. */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${p.display_name} di IndoCity: ${profileUrl}`)}`}
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
                  <div className="text-[12px] text-white/85">Send link to a contact</div>
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
                  <div className="text-[12px] text-white/85">Share to your timeline</div>
                </div>
              </a>

              {/* Instagram — copy + open IG, since IG doesn't accept
                  arbitrary URL share. */}
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
                  <div className="text-[12px] text-white/85">Link copied — paste to DM / Story</div>
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
                  <div className="text-[12px] text-white/85">Link copied — paste to bio / DM</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-edge "back" bar — tall vertical strip flush against the
          window edge. Yellow, rounded only on the inside (left)
          corners. Arrow icon top, vertical "BACK" text below. Routes
          back to /massage. */}
      <a
        href="/massage"
        aria-label="Back to IndoCity therapists"
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
          CTA and any per-card Contact button. Submits a booking
          request server-side first (so it shows up on the therapist's
          calendar) and then opens WhatsApp with a matching pre-filled
          message. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={p.slug}
          providerName={p.display_name}
          whatsapp={p.whatsapp_e164}
          themeColor={theme}
          serviceOptions={availableTiers.map((tid) => ({
            value: DURATION_TIER_LABELS[tid],
            label: DURATION_TIER_LABELS[tid],
          }))}
          presetService={contactServiceName}
          busyDates={[]}
          bookEndpoint={`/api/massage/${p.slug}/book`}
          copy={{
            title: `Book ${p.display_name}`,
            intro: "Pick a date + time and we'll open WhatsApp with your request.",
          }}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function DurationFilterBadge({
  tier, active, onClick, theme, price,
}: { tier: DurationTier; active: boolean; onClick: () => void; theme: string; price: number }) {
  const priceLabel = formatPriceIdr(price)
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
      {DURATION_TIER_LABELS[tier]}
      {priceLabel && (
        <span
          className="font-bold opacity-80"
          style={{ color: active ? '#FFFFFF' : '#374151' }}
        >
          · {priceLabel}
        </span>
      )}
    </button>
  )
}

// Cheapest of the three tiered prices. Falls back to "Rp 200k" so the
// CTA never reads empty for a brand-new profile.
function formatStartFromPrice(p: MassageProviderPublic): string {
  const all = [p.price_60min_idr, p.price_90min_idr, p.price_120min_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (all.length === 0) return 'Rp 200k'
  return formatPriceIdr(Math.min(...all)) ?? 'Rp 200k'
}

// Builds the portfolio carousel feed from gallery_image_urls. Each
// URL becomes a card seeded with the therapist's massage type label
// and cheapest-tier price so cards have meaningful headings + price
// chips out of the box.
//
// activeTier currently just rewrites the implied price/name (no
// per-tier groupings exist in the API yet — see follow-up note).
function buildPortfolioPhotos(
  p: MassageProviderPublic,
  active: DurationTier | null,
): PortfolioPhoto[] {
  const urls = p.gallery_image_urls ?? []
  if (urls.length === 0) return []
  const tierLabel = active ? DURATION_TIER_LABELS[active] : null
  const tierPrice = active
    ? (active === '60min'  ? p.price_60min_idr
      : active === '90min'  ? p.price_90min_idr
      :                       p.price_120min_idr)
    : null
  const fallbackPrice = [p.price_60min_idr, p.price_90min_idr, p.price_120min_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const seedPrice = typeof tierPrice === 'number' && tierPrice > 0
    ? tierPrice
    : (fallbackPrice.length > 0 ? Math.min(...fallbackPrice) : null)
  const massageLabel = p.massage_type ? MASSAGE_TYPE_LABELS[p.massage_type] : null
  const cardName = tierLabel
    ? `${massageLabel ?? 'Massage'} · ${tierLabel}`
    : (massageLabel ?? 'Massage Session')
  return urls.map((url) => ({
    url,
    name:        cardName,
    description: p.bio?.trim() ? p.bio.replace(/\s*\n\s*/g, ' ').slice(0, 160) : null,
    price_idr:   seedPrice,
  }))
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

// ─────────────────────────────────────────────────────────────────────────
// Reviews panel — inline list + leave-review form. Identical UX to the
// beautician build; provider_type wired to 'massage'.
// ─────────────────────────────────────────────────────────────────────────
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
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-sm active:scale-[0.95] transition"
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
            <div className="text-[12px] text-gray-500">
              {providerId
                ? 'Belum ada review. Jadilah yang pertama.'
                : 'Reviews not available yet for this profile.'}
            </div>
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
      {/* Hide the floating dev-toolbar wrench on this page only. */}
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
