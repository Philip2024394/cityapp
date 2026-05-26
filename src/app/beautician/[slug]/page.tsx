'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Menu, Home, Hotel, Building2, Share2, Link2, MessageCircle, X, ChevronLeft, ChevronRight, BadgeCheck, MapPin, Bike, ExternalLink, Calendar, type LucideIcon } from 'lucide-react'
import VisitUsMap from '@/components/profile/VisitUsMap'
import RunningMarquee from '@/components/profile/RunningMarquee'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { Sparkles } from 'lucide-react'
// Star + Award already imported above for the hero info-card.
import {
  BEAUTICIAN_SERVICES_OFFERED,
  SERVICE_OFFERED_LABELS,
  type BeauticianProviderPublic,
  type BeauticianServiceOffered,
  type BeauticianServicePhoto,
} from '@/lib/beautician/types'

// Default theme accent — used when the beautician hasn't picked their
// own theme_color (mig 0078). Beauticians choose their accent from the
// dashboard color palette; the chosen hex flows through every accent
// surface on this page via the `theme` constant below.
const DEFAULT_THEME = '#EC4899'

// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI.
type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}


// /beautician/[slug] — universal profile flagship build. Visual-first
// category (portfolio matters more than text); the kit's ProfileGallery
// is the centerpiece. 3-pack pricing (makeup/nail/hair) renders only
// the packages the beautician actually offers.

// Vertical default for the hero. Used when the beautician hasn't set
// their own cover_image_url yet — keeps the page on-brand instead of
// showing the generic yellow gradient on every new signup.
const DEFAULT_BEAUTICIAN_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

export default function BeauticianProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<BeauticianProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showMoreServices, setShowMoreServices] = useState(false)
  // null = show photos from ALL services (combined). When a service id
  // is set, the portfolio carousel filters to just that service.
  const [activeService, setActiveService] = useState<BeauticianServiceOffered | null>(null)
  // Selected carousel card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<BeauticianServicePhoto | null>(null)
  // Reviews view — replaces everything below the floating info-card.
  const [showReviews, setShowReviews] = useState(false)
  // Visit Us view — also replaces content area when active (only
  // available when the beautician has opted into a physical location).
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
    fetch(`/api/beautician/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: BeauticianProviderPublic } | null) => {
        if (j?.provider) setP(j.provider); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  useProfileViewTracker({ providerType: 'beautician', providerId: p?.id })

  // Resolved accent color for every accent surface on this page.
  // p.theme_color (mig 0078) wins; fall back to global default pink.
  const theme = p?.theme_color || DEFAULT_THEME

  // Fetch reviews only when the panel is first opened, then again
  // after a new submission (bump reviewsRefreshCount).
  useEffect(() => {
    if (!showReviews || !p?.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=beautician&provider_id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, p?.id, reviewsRefreshCount])

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Beautician not found</h1>
          <Link href="/beautician" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://cityriders.id'
  const profileUrl = `${siteOrigin}/beautician/${p.slug}`

  // WhatsApp prefill text for the under-carousel contact button.
  const waText = [
    `Halo ${p.display_name}, saya menemukan profil Anda di City Riders.`,
    `Saya tertarik untuk booking session beauty service.`,
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
            src={p.cover_image_url || DEFAULT_BEAUTICIAN_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — text now comes from p.hero_text (mig 0081)
              when set; otherwise falls back to the default copy. */}
          {(() => {
            const ht = p.hero_text || {}
            const line1   = ht.line1   || 'Professional'
            const line2   = ht.line2   || 'Beautician'
            const tagline = ht.tagline || 'Enhancing your natural beauty effortless'
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

                {/* Service locations the beautician travels to —
                    driven by p.service_locations (mig 0086). Each
                    location is rendered only when explicitly set; a
                    missing or null array hides the whole row so
                    legacy profiles without the field don't reveal
                    locations they may not actually serve. */}
                {(() => {
                  const locs = new Set(p.service_locations ?? [])
                  if (locs.size === 0) return null
                  const items: Array<{ key: string; icon: typeof Home; label: string }> = []
                  if (locs.has('home'))  items.push({ key: 'home',  icon: Home,      label: 'Home' })
                  if (locs.has('hotel')) items.push({ key: 'hotel', icon: Hotel,     label: 'Hotel' })
                  if (locs.has('villa')) items.push({ key: 'villa', icon: Building2, label: 'Villa' })
                  return (
                    <div className="flex items-start gap-2 max-w-[260px]" style={{ marginTop: 15 }}>
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
                text tint the active profile theme color so Mira/Ayu/
                Rina/Dewi each show their own accent. */}
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
            displayName={p.display_name}
            address={p.service_area_notes ?? p.city ?? null}
            city={p.city ?? null}
            lat={typeof p.latitude  === 'number' ? p.latitude  : null}
            lng={typeof p.longitude === 'number' ? p.longitude : null}
            hours={p.operating_hours ?? null}
            instagramUrl={p.instagram_url ?? null}
            tiktokUrl={p.tiktok_url ?? null}
            facebookUrl={p.facebook_url ?? null}
            busyDates={(p.busy_dates ?? []) as string[]}
            theme={theme}
            onClose={() => setShowVisitUs(false)}
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
          const offered = (p.services_offered ?? []) as BeauticianServiceOffered[]
          if (offered.length === 0) return null
          const sp = p.service_photos ?? {}
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
          const photos = buildPortfolioPhotos(p, activeService)
          if (photos.length === 0) return null
          return (
            <section className="space-y-2">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                {activeService
                  ? `${SERVICE_OFFERED_LABELS[activeService]} — Portfolio`
                  : 'Portfolio'}
              </h2>
              <p className="text-[11px] text-gray-500 italic -mt-1">
                Please contact for additional services not listed
              </p>
              {/* Auto-drifting portfolio that the user can swipe/drag.
                  rAF loop in PortfolioCarousel nudges scrollLeft by a
                  fraction every frame. Pointerdown / touchstart / wheel
                  pauses the drift for 2.5s so users can manually scroll
                  without fighting the animation. Cards are duplicated
                  so the seam at the loop boundary is invisible. */}
              <PortfolioCarousel
                photos={photos}
                onViewDetails={setDetailPhoto}
                theme={theme}
              />
            </section>
          )
        })()}

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={p.promo_text || 'Message me this week — exclusive promo on professional beauty service delivered straight to your home, hotel or villa, in the comfort of your stay.'}
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
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${p.display_name} di City Riders: ${profileUrl}`)}`}
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
          vertical "BACK" text below. Diverts back to /beautician. */}
      <a
        href="/beautician"
        aria-label="Back to City Riders beauticians"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right: 0,
          top: '62%',
          transform: 'translateY(calc(-50% - 25px))',
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
          theme={theme}
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
          request server-side first (so it shows up on the beautician's
          calendar) and then opens WhatsApp with a matching pre-filled
          message. Skips busy_dates the beautician has marked. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          beauticianSlug={p.slug}
          beauticianName={p.display_name}
          whatsapp={p.whatsapp_e164}
          theme={theme}
          servicesOffered={(p.services_offered ?? []) as BeauticianServiceOffered[]}
          presetService={contactServiceName}
          busyDates={(p.busy_dates ?? []) as string[]}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Shell>
  )
}

// "View Details" popup — shows the main image at top with optional
// Before / After thumbs underneath. Tapping a thumb swaps that image
// into the main slot, and a "Main" pill appears so the customer can
// jump back. Mounts fresh per photo (key={detailPhoto.url} could be
// passed but the parent only renders one at a time, so local state
// resets naturally when the parent unmounts the popup).
function PortfolioDetailPopup({
  photo, theme, canContact, onClose, onContact,
}: {
  photo:      BeauticianServicePhoto
  theme:      string
  canContact: boolean
  onClose:    () => void
  onContact:  () => void
}) {
  type View = 'main' | 'before' | 'after'
  const [view, setView] = useState<View>('main')
  const hasBefore = Boolean(photo.before_image_url)
  const hasAfter  = Boolean(photo.after_image_url)
  const showThumbs = hasBefore || hasAfter

  const mainSrc = view === 'before' ? photo.before_image_url
                : view === 'after'  ? photo.after_image_url
                : photo.url
  const mainPosition = view === 'main' ? (photo.object_position || 'center') : 'center'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        style={{ borderTop: `4px solid ${theme}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
        >
          <X className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
        </button>

        {/* Main image with a small floating label showing which view
            (Main / Before / After) is currently displayed. */}
        <div className="relative">
          <img
            src={mainSrc}
            alt={photo.name || ''}
            className="w-full aspect-square object-cover transition-opacity"
            style={{ objectPosition: mainPosition }}
          />
          {view !== 'main' && (
            <div
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow"
              style={{ background: theme }}
            >
              {view === 'before' ? 'Before' : 'After'}
            </div>
          )}
        </div>

        {/* Before / After thumb row — only when either is uploaded. */}
        {showThumbs && (
          <div className="px-4 pt-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              Compare
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ThumbButton
                label="Main"
                src={photo.url}
                active={view === 'main'}
                onClick={() => setView('main')}
                theme={theme}
                objectPosition={photo.object_position}
              />
              {hasBefore && (
                <ThumbButton
                  label="Before"
                  src={photo.before_image_url ?? ''}
                  active={view === 'before'}
                  onClick={() => setView('before')}
                  theme={theme}
                />
              )}
              {hasAfter && (
                <ThumbButton
                  label="After"
                  src={photo.after_image_url ?? ''}
                  active={view === 'after'}
                  onClick={() => setView('after')}
                  theme={theme}
                />
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {photo.name && (
            <h3 className="text-[18px] font-black text-black leading-tight">
              {photo.name}
            </h3>
          )}
          {photo.description && (
            <p className="text-[13px] text-gray-600 leading-snug whitespace-pre-wrap">
              {photo.description}
            </p>
          )}
          {formatPriceIdr(photo.price_idr) && (
            <div className="leading-none">
              <div className="text-[22px] font-black text-black">
                {formatPriceIdr(photo.price_idr)}
              </div>
              <div className="text-[11px] font-medium text-gray-500 mt-1">Start from</div>
            </div>
          )}
          {canContact && (
            <button
              type="button"
              onClick={onContact}
              className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full text-white font-extrabold text-[13px] shadow-md active:scale-[0.98] transition"
              style={{ background: theme }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Contact
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ThumbButton({
  label, src, active, onClick, theme, objectPosition,
}: {
  label:           string
  src:             string
  active:          boolean
  onClick:         () => void
  theme:           string
  objectPosition?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-lg overflow-hidden border-2 transition active:scale-95 ${
        active ? '' : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{
        aspectRatio: '1 / 1',
        borderColor: active ? theme : undefined,
      }}
    >
      <img
        src={src}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: objectPosition || 'center' }}
      />
      <div
        className="absolute bottom-0 inset-x-0 text-center text-[10px] font-black uppercase tracking-wider py-0.5"
        style={{
          background: active ? theme : 'rgba(0,0,0,0.55)',
          color: '#FFFFFF',
        }}
      >
        {label}
      </div>
    </button>
  )
}

// Customer-facing booking popup — date + time + service form that
// records a booking_request server-side then bounces the customer to
// WhatsApp with a pre-filled message containing the same details. The
// WA chat stays Standard (not Business) since we never custody money.
function ContactBookingPopup({
  beauticianSlug, beauticianName, whatsapp, theme,
  servicesOffered, presetService, busyDates, onClose,
}: {
  beauticianSlug:   string
  beauticianName:   string
  whatsapp:         string
  theme:            string
  servicesOffered:  BeauticianServiceOffered[]
  presetService:    string
  busyDates:        string[]
  onClose:          () => void
}) {
  const [name,    setName]    = useState('')
  const [wa,      setWa]      = useState('')
  const [date,    setDate]    = useState('')
  const [time,    setTime]    = useState('')
  const [service, setService] = useState(presetService)
  const [notes,   setNotes]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  const today    = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])
  const busySet  = useMemo(() => new Set(busyDates), [busyDates])
  const dateBusy = date.length === 10 && busySet.has(date)

  const timeSuggestions = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30']

  async function submit() {
    setErr(null)
    if (name.trim().length < 2) { setErr('Please add your name.'); return }
    const waDigits = wa.replace(/[^\d]/g, '')
    if (waDigits.length < 8 || waDigits.length > 15) {
      setErr('Please add a valid WhatsApp number.')
      return
    }
    if (!date)  { setErr('Pick a date.'); return }
    if (dateBusy) { setErr('That date is unavailable — please pick another.'); return }
    if (!time)  { setErr('Pick a time.'); return }

    setBusy(true)
    try {
      const r = await fetch(`/api/beautician/${beauticianSlug}/book`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customer_name:     name.trim(),
          customer_whatsapp: wa.startsWith('+') ? wa.trim() : `+${waDigits}`,
          service_name:      service.trim() || undefined,
          requested_date:    date,
          requested_time:    time,
          notes:             notes.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) {
        setErr(j.error === 'rate_limited'
          ? 'Too many requests from this device. Try again tomorrow.'
          : j.error === 'date_unavailable'
            ? 'That date is unavailable — please pick another.'
            : 'Could not submit. Please try again.')
        return
      }

      const waMsg = [
        `Hi ${beauticianName}, I'd like to book ${service.trim() || 'a service'} `,
        `on ${date} at ${time}.`,
        notes.trim() ? `\nNotes: ${notes.trim()}` : '',
        `\n\n— Sent via cityriders.id`,
      ].join('')
      window.open(
        `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(waMsg)}`,
        '_blank',
      )
      onClose()
    } catch {
      setErr('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

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
        style={{ borderTop: `4px solid ${theme}` }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center z-10"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="px-5 pt-6 pb-6 space-y-3.5">
          <div>
            <h2 className="text-[20px] font-black text-black leading-tight">Book {beauticianName}</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-snug">
              Pick a date + time and we&apos;ll open WhatsApp with your request.
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Your name</span>
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 min-h-[44px]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Your WhatsApp</span>
            <input
              type="tel"
              inputMode="numeric"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              placeholder="+62 812 3456 7890"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 min-h-[44px]"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Date</span>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border px-3 py-3 text-[14px] text-black focus:outline-none focus:border-gray-400 min-h-[44px] ${
                  dateBusy ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Time</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                list="cr-time-suggestions"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black focus:outline-none focus:border-gray-400 min-h-[44px]"
              />
              <datalist id="cr-time-suggestions">
                {timeSuggestions.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
          </div>
          {dateBusy && (
            <p className="text-[12px] text-red-600 -mt-1">
              {beauticianName} marked this day busy. Please pick another date.
            </p>
          )}

          {servicesOffered.length > 0 && (
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Service</span>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black bg-white focus:outline-none focus:border-gray-400 min-h-[44px]"
              >
                <option value="">Choose service…</option>
                {servicesOffered.map((sid) => (
                  <option key={sid} value={SERVICE_OFFERED_LABELS[sid] ?? sid}>
                    {SERVICE_OFFERED_LABELS[sid] ?? sid}
                  </option>
                ))}
                {presetService && !servicesOffered.some((sid) => (SERVICE_OFFERED_LABELS[sid] ?? sid) === presetService) && (
                  <option value={presetService}>{presetService}</option>
                )}
              </select>
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Notes (optional)</span>
            <textarea
              maxLength={300}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything she should know (e.g. bridal makeup for 5 people, hotel in Seminyak…)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 resize-none"
            />
          </label>

          {err && (
            <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 text-[13px] px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || dateBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-extrabold text-[14px] shadow-md disabled:opacity-60 active:scale-[0.98] transition"
            style={{ background: theme }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
            {busy ? 'Sending…' : 'Send & open WhatsApp'}
          </button>
          <p className="text-[10px] text-gray-400 text-center leading-snug">
            We&apos;ll log your request so {beauticianName} sees the time + service in her calendar.
          </p>
        </div>
      </div>
    </div>
  )
}

// Carousel card — image up top, name + 2-line description + start
// Portfolio carousel — auto-drifts left at a slow pace and pauses on
// user interaction so swipe/drag/wheel still works. Cards are
// duplicated so the loop seam (when scrollLeft passes half-width and
// wraps back to 0) is invisible.
function PortfolioCarousel({
  photos, onViewDetails, theme,
}: {
  photos: BeauticianServicePhoto[]
  onViewDetails: (p: BeauticianServicePhoto) => void
  theme: string
}) {
  const scrollerRef   = useRef<HTMLDivElement | null>(null)
  const lastInteract  = useRef<number>(0)
  // Detect user-initiated scroll (drag of native scrollbar) by
  // comparing the scrollLeft right before vs after our own programmatic
  // tick. If the value moved by more than the drift step, a human did
  // it — pause the drift for a moment.
  const lastAutoLeft  = useRef<number>(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    // scrollLeft is rounded to integer pixels in most browsers, so we
    // track the precise position in `pos` and only write the new
    // scrollLeft when a full pixel has accumulated. Each write is also
    // bracketed with scroll-behavior:auto inline so any inherited
    // `scroll-behavior: smooth` won't add easing between frames (the
    // easing makes the drift look like it's "jumping").
    const SPEED_PX_PER_SEC = 22   // smooth slow drift
    const PAUSE_MS         = 2500 // ignore drift this long after input

    let rafId = 0
    let lastT = performance.now()
    let pos   = el.scrollLeft

    function tick(now: number) {
      if (!el) { rafId = requestAnimationFrame(tick); return }
      const dt = (now - lastT) / 1000
      lastT = now

      const wallNow  = Date.now()
      const drifting = wallNow - lastInteract.current > PAUSE_MS
      const dragJump = Math.abs(el.scrollLeft - lastAutoLeft.current) > 3
      if (dragJump) {
        lastInteract.current = wallNow
        pos = el.scrollLeft
      } else if (drifting) {
        pos += SPEED_PX_PER_SEC * dt
        const halfWidth = el.scrollWidth / 2
        if (halfWidth > 0 && pos >= halfWidth) pos -= halfWidth
        const target = Math.round(pos)
        if (target !== el.scrollLeft) el.scrollLeft = target
      }
      lastAutoLeft.current = el.scrollLeft
      rafId = requestAnimationFrame(tick)
    }
    // Defeat any inherited smooth-scroll behavior — easing between our
    // per-frame writes turns the drift into a stuttery slide.
    el.style.scrollBehavior = 'auto'
    rafId = requestAnimationFrame(tick)

    function mark() { lastInteract.current = Date.now() }
    el.addEventListener('pointerdown', mark)
    el.addEventListener('touchstart',  mark, { passive: true })
    el.addEventListener('wheel',       mark, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('pointerdown', mark)
      el.removeEventListener('touchstart',  mark)
      el.removeEventListener('wheel',       mark)
    }
  }, [photos.length])

  return (
    <div
      ref={scrollerRef}
      className="-mx-4 px-4 overflow-x-auto overflow-y-hidden cr-portfolio-scroll"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      <style>{`.cr-portfolio-scroll::-webkit-scrollbar{display:none}`}</style>
      <div className="flex gap-2.5 w-max">
        {photos.map((photo, i) => (
          <PortfolioCard
            key={photo.url + i}
            photo={photo}
            onViewDetails={() => onViewDetails(photo)}
            theme={theme}
          />
        ))}
        {photos.map((photo, i) => (
          <PortfolioCard
            key={`d-${photo.url}-${i}`}
            photo={photo}
            onViewDetails={() => onViewDetails(photo)}
            theme={theme}
          />
        ))}
      </div>
    </div>
  )
}

// price + "View Details" button below. ~180px wide so 2-line clamp
// reads naturally on phones.
function PortfolioCard({
  photo, onViewDetails, theme,
}: {
  photo: BeauticianServicePhoto
  onViewDetails: () => void
  theme: string
}) {
  const price = formatPriceIdr(photo.price_idr)
  return (
    <div
      className="w-[170px] shrink-0 snap-start rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col"
    >
      <img
        src={photo.url}
        alt={photo.name || ''}
        loading="lazy"
        className="w-full h-[130px] object-cover bg-gray-100"
        style={{ objectPosition: photo.object_position || 'center' }}
      />
      <div className="p-2 flex flex-col gap-1">
        <div className="text-[12px] font-black text-black leading-tight truncate">
          {photo.name || '—'}
        </div>
        <p
          className="text-[10px] text-gray-500 leading-snug"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.4em',
            textOverflow: 'ellipsis',
          }}
        >
          {photo.description || ''}
        </p>
        <div className="flex items-center justify-between gap-2">
          {price && (
            <div className="text-[11px] font-extrabold text-black truncate">{price}</div>
          )}
          <button
            type="button"
            onClick={onViewDetails}
            className="ml-auto inline-flex items-center justify-center px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold active:scale-[0.97] transition shrink-0"
            style={{ background: theme }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceFilterBadge({
  sid, active, onClick, theme,
}: { sid: BeauticianServiceOffered; active: boolean; onClick: () => void; theme: string }) {
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
      {SERVICE_OFFERED_LABELS[sid] ?? sid}
    </button>
  )
}

// Cheapest price across all per-photo entries (mig 0074 rich shape).
// Falls back to the legacy makeup/nail/hair columns when no photo
// prices are set so the CTA never reads empty.
function formatStartFromPrice(p: BeauticianProviderPublic): string {
  const photoPrices: number[] = []
  const sp = p.service_photos ?? {}
  for (const arr of Object.values(sp)) {
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (item && typeof item === 'object' && typeof (item as { price_idr?: unknown }).price_idr === 'number') {
        const n = (item as { price_idr: number }).price_idr
        if (n > 0) photoPrices.push(n)
      }
    }
  }
  const fallback = [p.price_makeup_idr, p.price_nail_idr, p.price_hair_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const all = photoPrices.length > 0 ? photoPrices : fallback
  if (all.length === 0) return 'Rp 300k'
  return formatPriceIdr(Math.min(...all)) ?? 'Rp 300k'
}

// Normalises one service_photos entry — accepts either a plain URL
// string (legacy) or the rich object shape, returns the rich shape.
function normalisePhoto(raw: unknown): BeauticianServicePhoto | null {
  if (typeof raw === 'string') return { url: raw }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Partial<BeauticianServicePhoto>
    if (typeof o.url === 'string' && o.url) return { ...o, url: o.url } as BeauticianServicePhoto
  }
  return null
}

// Combines per-service photos into the carousel feed. When a service
// filter is active, returns just that service's photos; otherwise
// flattens every service's photos in catalog order so the carousel
// stays deterministic. Falls back to the legacy gallery_image_urls
// (treated as headless URLs) when service_photos is empty.
function buildPortfolioPhotos(
  p: BeauticianProviderPublic,
  active: BeauticianServiceOffered | null,
): BeauticianServicePhoto[] {
  const sp = p.service_photos ?? {}
  // Only show photos for categories the beautician actually offers.
  // Old rows can carry leftover keys (e.g. shared seed packs put
  // makeup/hair photos on a nails-only profile); those should not
  // surface in the public carousel.
  const offered = new Set<BeauticianServiceOffered>(p.services_offered ?? [])
  if (active) {
    if (offered.size > 0 && !offered.has(active)) return []
    const arr = sp[active] ?? []
    return arr.map(normalisePhoto).filter((x): x is BeauticianServicePhoto => x !== null)
  }
  const ordered: BeauticianServicePhoto[] = []
  for (const cat of BEAUTICIAN_SERVICES_OFFERED) {
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

// Visit Us panel — shown when the beautician has has_physical_location
// set and the user taps the "Visit Us" link on the About header.
// Address card + today's hours + glowing-marker map + Book Bike CTA
// that pre-fills the City Riders ride-booking dropoff with the salon
// coordinates.
function VisitUsPanel({
  displayName, address, city, lat, lng, hours,
  instagramUrl, tiktokUrl, facebookUrl,
  busyDates,
  theme, onClose,
}: {
  displayName:   string
  address:       string | null
  city:          string | null
  lat:           number | null
  lng:           number | null
  hours:         Record<string, string> | null
  instagramUrl:  string | null
  tiktokUrl:     string | null
  facebookUrl:   string | null
  busyDates:     string[]
  theme:         string
  onClose:       () => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const socials: Array<{ href: string; label: string; svg: React.ReactNode }> = []
  if (instagramUrl?.trim()) socials.push({
    href:  instagramUrl.trim(),
    label: 'Instagram',
    svg:   <SocialInstagramIcon />,
  })
  if (tiktokUrl?.trim()) socials.push({
    href:  tiktokUrl.trim(),
    label: 'TikTok',
    svg:   <SocialTikTokIcon />,
  })
  if (facebookUrl?.trim()) socials.push({
    href:  facebookUrl.trim(),
    label: 'Facebook',
    svg:   <SocialFacebookIcon />,
  })
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  const todaysHours = (() => {
    if (!hours) return null
    const day = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
    return hours[day] ?? null
  })()

  // Book Bike Service — opens the rider-search booking page (/cari/rider)
  // pre-filled with the beautician's lat/lng as dropoff. We also try
  // to capture the customer's current GPS as pickup so /cari/rider
  // arrives with both ends populated and shows the fare estimate
  // immediately. Geolocation is best-effort: if the browser denies
  // or it's unsupported, we navigate with dropoff only and the rider
  // page asks the customer to pick a pickup location.
  const bookBikeBase = hasCoords
    ? `/cari/rider?dLat=${lat}&dLng=${lng}&dName=${encodeURIComponent(displayName)}`
    : null

  function bookBikeService() {
    if (!bookBikeBase) return
    const fallback = () => { window.location.href = bookBikeBase! }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fallback()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pLat = pos.coords.latitude.toFixed(6)
        const pLng = pos.coords.longitude.toFixed(6)
        window.location.href = `${bookBikeBase}&pLat=${pLat}&pLng=${pLng}&pName=${encodeURIComponent('My location')}`
      },
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
          Visit Us
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.96] transition"
          style={{ color: theme }}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          Close
        </button>
      </div>

      {/* Address card. Social-media icons render as a separate row
          at the bottom-right, well clear of the address text, with
          solid black buttons (theme-colored icons would have clashed
          with the address pin). Each social opens in a new tab. */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: theme }} strokeWidth={2.5} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-extrabold text-black">{displayName}</div>
            {address && <div className="text-[12px] text-gray-700 leading-snug">{address}</div>}
            {city && address !== city && (
              <div className="text-[11px] text-gray-500">{city}</div>
            )}
          </div>
        </div>
        {socials.length > 0 && (
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-200">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${displayName} on ${s.label}`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-black hover:bg-gray-800 shadow-sm active:scale-[0.94] transition"
              >
                {s.svg}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Today's hours row with a Check Booking button on the right
          that opens a read-only month calendar so the customer can
          eyeball availability before committing to the contact form. */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center gap-2">
        {todaysHours ? (
          <>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Today</span>
            <span className="text-[13px] font-extrabold text-black">{todaysHours}</span>
          </>
        ) : (
          <span className="text-[12px] font-bold text-gray-500">Hours not set</span>
        )}
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm active:scale-[0.97]"
          style={{ background: theme }}
        >
          <Calendar className="w-3 h-3" strokeWidth={2.5} />
          Check Booking
        </button>
      </div>

      {calendarOpen && (
        <AvailabilityCalendarPopup
          displayName={displayName}
          busyDates={busyDates}
          theme={theme}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {/* Map preview */}
      {hasCoords ? (
        <VisitUsMap lat={lat!} lng={lng!} theme={theme} />
      ) : (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center text-[12px] text-gray-500">
          Lokasi belum di-pin oleh beautician.
        </div>
      )}

      {/* Book Bike Service CTA — captures customer's pickup GPS on
          tap, then opens /r with both pickup + dropoff pre-filled so
          the fare estimate appears immediately. */}
      {bookBikeBase && (
        <button
          type="button"
          onClick={bookBikeService}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-extrabold text-[13px] shadow-md active:scale-[0.98] transition"
          style={{ background: theme }}
        >
          <Bike className="w-4 h-4" strokeWidth={2.5} />
          Book Bike Service
        </button>
      )}
      <p className="text-[10px] text-gray-400 leading-snug text-center">
        We&apos;ll use your location for pickup and {displayName}&apos;s for drop-off — fare shows on the next screen.
      </p>
    </section>
  )
}

// Brand-mark SVGs for social icons. Inlined rather than importing more
// from lucide-react so we keep the bundle small and the marks visually
// match the platforms (lucide's "Instagram" is generic). Each draws on
// `currentColor` so a parent text-white container fills them in white.
// Read-only month calendar popup — shows busy_dates as red blocks so
// the customer can scan availability without opening the full booking
// form. No actions: tap is purely visual. Customer goes back to the
// Contact CTA to actually book a slot.
function AvailabilityCalendarPopup({
  displayName, busyDates, theme, onClose,
}: {
  displayName: string
  busyDates:   string[]
  theme:       string
  onClose:     () => void
}) {
  const todayIso = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])
  const [viewMonth, setViewMonth] = useState(() => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  })

  const cells = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const start  = new Date(viewMonth + 'T00:00:00')
    const first  = start.getDay()
    const total  = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    const out: Array<{ iso: string; day: number; inMonth: boolean }> = []
    const prevTotal = new Date(start.getFullYear(), start.getMonth(), 0).getDate()
    for (let i = first - 1; i >= 0; i--) {
      const day = prevTotal - i
      const d = new Date(start.getFullYear(), start.getMonth() - 1, day)
      out.push({ iso: iso(d), day, inMonth: false })
    }
    for (let day = 1; day <= total; day++) {
      const d = new Date(start.getFullYear(), start.getMonth(), day)
      out.push({ iso: iso(d), day, inMonth: true })
    }
    while (out.length < 42) {
      const last = out[out.length - 1]
      const ld = new Date(last.iso + 'T00:00:00')
      ld.setDate(ld.getDate() + 1)
      out.push({ iso: iso(ld), day: ld.getDate(), inMonth: ld.getMonth() === start.getMonth() })
    }
    return out
  }, [viewMonth])

  const busySet = useMemo(() => new Set(busyDates), [busyDates])

  function shiftMonth(delta: number) {
    const d = new Date(viewMonth + 'T00:00:00')
    d.setMonth(d.getMonth() + delta)
    const pad = (n: number) => n.toString().padStart(2, '0')
    setViewMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`)
  }

  const monthLabel = new Date(viewMonth + 'T00:00:00')
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ borderTop: `4px solid ${theme}` }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center z-10"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <div className="px-5 pt-6 pb-5">
          <h2 className="text-[18px] font-black text-black leading-tight">
            {displayName}&apos;s availability
          </h2>
          <p className="text-[12px] text-gray-500 mt-1">
            Red dates are unavailable. Use the Contact button to book any other day.
          </p>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div className="text-[15px] font-black text-black">{monthLabel}</div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mt-3 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-[10px] font-bold text-gray-400 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c) => {
              const inMonth = c.inMonth
              const isToday = c.iso === todayIso
              const isBusy  = busySet.has(c.iso)
              const isPast  = c.iso < todayIso
              let bg = 'bg-transparent'
              let text = inMonth ? (isPast ? 'text-gray-300' : 'text-gray-800') : 'text-gray-200'
              let ring = ''
              if (isBusy && inMonth) {
                bg   = ''
                text = 'text-white'
              } else if (isToday) {
                ring = 'ring-2'
              }
              return (
                <div
                  key={c.iso}
                  className={`relative aspect-square rounded-lg ${bg} ${text} ${ring} text-[12px] font-bold flex items-center justify-center`}
                  style={
                    isBusy && inMonth
                      ? { background: '#EF4444' }
                      : isToday
                        ? { '--tw-ring-color': theme } as React.CSSProperties
                        : undefined
                  }
                >
                  {c.day}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" /> Unavailable
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded ring-2" style={{ '--tw-ring-color': theme } as React.CSSProperties} /> Today
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialInstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}
function SocialTikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.5 7.5a6 6 0 0 1-4.5-2v8.5a5 5 0 1 1-5-5c.34 0 .68.04 1 .11v2.6a2.5 2.5 0 1 0 1.75 2.39V3h2.5a4 4 0 0 0 4 4v.5z" />
    </svg>
  )
}
function SocialFacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.1H13.5V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6c-.3-.05-1.3-.13-2.45-.13-2.4 0-4.05 1.46-4.05 4.16v2.27H7.5V14h2.7v8h3.3z" />
    </svg>
  )
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
          provider_type:     'beautician',
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
          (especially dark themes like Rina's #B91C1C). */}
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
  // -z-10) so the courier scene doesn't show through here. min-h-screen
  // lets the page scroll naturally so panels like Visit Us / Reviews
  // can extend past the initial viewport.
  return (
    <main className="relative min-h-screen bg-white text-ink">
      {/* Hide the floating dev-toolbar wrench on this page only — the
          page is meant to read as a polished customer-facing profile
          and the spanner clutters the corner. Scoped to mount lifetime. */}
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
