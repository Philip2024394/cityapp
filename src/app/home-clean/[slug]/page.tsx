'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Star, Award, Menu, Home, Building, Building2, Share2, Link2, MessageCircle, X, ChevronLeft,
  BadgeCheck, MapPin, Bike, Sparkles, type LucideIcon,
} from 'lucide-react'
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
import type { HomeCleanProviderPublic } from '@/lib/home-clean/types'

// /home-clean/[slug] — full visual + layout parity with /beautician/[slug]
// and /handyman/[slug]. Same hero, floating info-card, services filter,
// portfolio carousel, reviews + visit panel, sticky Contact CTA. Data is
// adapted to home-clean's per-jam / per-hari pricing and house / apartment
// / office service-type pills (keyword-sniffed from bio when no structured
// field exists yet on this vertical).

// Cyan accent — cleanliness / freshness. Each home-clean cleaner can
// override via their own `theme_color` once that column is added to the
// public route.
const DEFAULT_THEME = '#06B6D4'

type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

// Service-type chips for home-clean. Until a structured field exists in
// the DB, we sniff the bio for these keywords so the chip row appears
// only when there's actual signal. Each chip stays purely cosmetic
// (filters the portfolio carousel by partial name match).
type CleanServiceType = 'house' | 'apartment' | 'office'
const CLEAN_SERVICE_TYPES: ReadonlyArray<{
  id:       CleanServiceType
  label:    string
  icon:     LucideIcon
  keywords: ReadonlyArray<string>
}> = [
  { id: 'house',     label: 'House',     icon: Home,       keywords: ['house', 'rumah', 'home'] },
  { id: 'apartment', label: 'Apartment', icon: Building,   keywords: ['apartment', 'apartemen', 'apt', 'kost', 'condo'] },
  { id: 'office',    label: 'Office',    icon: Building2,  keywords: ['office', 'kantor', 'commercial', 'kerja'] },
]

export default function HomeCleanProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<HomeCleanProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showMoreServices, setShowMoreServices] = useState(false)
  const [activeService, setActiveService] = useState<CleanServiceType | null>(null)
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

  useEffect(() => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) { setNotFound(true); return }
    fetch(`/api/home-clean/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: HomeCleanProviderPublic } | null) => {
        if (j?.provider) setP(j.provider); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  useProfileViewTracker({ providerType: 'home_clean', providerId: p?.id })

  const theme = p?.theme_color || DEFAULT_THEME

  useEffect(() => {
    if (!showReviews || !p?.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=home_clean&provider_id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, p?.id, reviewsRefreshCount])

  // Service-type chips offered by THIS cleaner — sniffed from bio so the
  // row only renders when there's signal. Memoised so the same chip set
  // sticks across re-renders.
  const offeredTypes = useMemo<CleanServiceType[]>(() => {
    const bio = (p?.bio ?? '').toLowerCase()
    if (!bio.trim()) return []
    return CLEAN_SERVICE_TYPES
      .filter((t) => t.keywords.some((k) => bio.includes(k)))
      .map((t) => t.id)
  }, [p?.bio])

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Cleaner not found</h1>
          <Link href="/home-clean" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/home-clean/${p.slug}`

  // Pull optional extended fields the public route may add later
  // (theme_color, busy_dates, has_physical_location, lat/lng, hero_text,
  // promo_text, service_photos). All accessed via a typed extension so
  // missing-field profiles still render the layout cleanly.
  const ext = p as HomeCleanProviderPublicExt
  const heroText      = ext.hero_text       ?? null
  const promoText     = ext.promo_text      ?? null
  const busyDates     = ext.busy_dates      ?? []
  const hasLocation   = Boolean(ext.has_physical_location)
  const latitude      = typeof ext.latitude  === 'number' ? ext.latitude  : null
  const longitude     = typeof ext.longitude === 'number' ? ext.longitude : null
  const servicePhotos = Array.isArray(ext.service_photos) ? ext.service_photos : []

  return (
    <Shell>
      {/* Hero — cover with overlay text + floating info card. */}
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
          {p.cover_image_url ? (
            <img
              src={p.cover_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${theme} 0%, #0891B2 100%)` }}
              aria-hidden
            />
          )}

          {/* Hero overlay — defaults to "Professional Cleaner" with a
              cleanliness-themed tagline. hero_text shape mirrors the
              other verticals so once the column lands the same JSON
              drives all three. */}
          {(() => {
            const ht = heroText || {}
            const line1   = ht.line1   || 'Professional'
            const line2   = ht.line2   || 'Cleaner'
            const tagline = ht.tagline || 'A spotless home, every visit'
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
                <div className="text-[28px] sm:text-[34px] font-black mt-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] overflow-hidden">
                  <span className="cr-hero-word inline-block" style={{ color: line2Color }}>
                    {line2}
                  </span>
                </div>
                <div className="text-[13px] sm:text-[14px] font-semibold mt-1.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: taglineColor, maxWidth: 'min(360px, calc(100vw - 32px))' }}>
                  {tagline}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Reviews toggle pill */}
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

        {/* Floating info card — avatar + name + city + rating + badge. */}
        <div className="px-4 relative z-20" style={{ marginTop: 12 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
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
            lat={latitude}
            lng={longitude}
            hours={p.operating_hours ?? null}
            instagramUrl={p.instagram_url ?? null}
            tiktokUrl={p.tiktok_url ?? null}
            facebookUrl={p.facebook_url ?? null}
            busyDates={busyDates}
            themeColor={theme}
            onClose={() => setShowVisitUs(false)}
            noLocationCopy="Lokasi belum di-pin oleh cleaner."
            bottomCta={
              (typeof latitude === 'number' && typeof longitude === 'number')
                ? {
                    label: 'Book Bike Service',
                    icon: Bike,
                    note: `We'll use your location for pickup and ${p.display_name}'s for drop-off — fare shows on the next screen.`,
                    onClick: () => {
                      const lat = latitude
                      const lng = longitude
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
            {/* About {name} — 5-line clamped bio + optional Visit Us link. */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  About {p.display_name}
                </h2>
                {hasLocation && (
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
                  <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No bio yet.</p>
                )}
              </div>
            </section>

            {/* Services Provided — house / apartment / office chips,
                sniffed from the bio until a structured field exists. */}
            {offeredTypes.length > 0 && (
              <section className="space-y-2" style={{ marginTop: 15 }}>
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  Services Provided
                </h2>
                <div className="flex flex-wrap items-center gap-1.5">
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
                  {offeredTypes.slice(0, 3).map((sid) => (
                    <ServiceFilterBadge
                      key={sid} sid={sid}
                      active={activeService === sid}
                      onClick={() => setActiveService(activeService === sid ? null : sid)}
                      theme={theme}
                    />
                  ))}
                  {offeredTypes.length > 3 && (
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
                {offeredTypes.length > 3 && showMoreServices && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {offeredTypes.slice(3).map((sid) => (
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
            )}

            {/* Portfolio carousel — service_photos when present, otherwise
                the legacy gallery_image_urls flattened into bare-URL cards. */}
            {(() => {
              const photos = buildPortfolioPhotos(p, servicePhotos, activeService)
              if (photos.length === 0) return null
              const activeLabel = activeService
                ? CLEAN_SERVICE_TYPES.find((t) => t.id === activeService)?.label
                : null
              return (
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                      {activeLabel ? `${activeLabel} — Portfolio` : 'Portfolio'}
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
              text={promoText || 'Message me this week — professional cleaning for your home, apartment or office. Hourly or full-day rates available.'}
            />

            {/* CTA row — Start From price on the left, Contact button on the right. */}
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="leading-none pb-3">
                <div className="text-[24px] sm:text-[28px] font-black text-black">
                  {formatStartFromPrice(p)}
                </div>
                <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
                  Start from {p.hourly_rate_idr ? '/ jam' : p.day_rate_idr ? '/ hari' : ''}
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

            {partnerTag && (
              <div
                className="rounded-xl px-3 py-2 text-[12px]"
                style={{
                  background: `${theme}14`,
                  border: `1px solid ${theme}55`,
                  color: theme,
                }}
              >
                Referred by partner: <span className="font-extrabold">{partnerTag}</span>
              </div>
            )}
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

      {/* Right-edge "back" bar */}
      <a
        href="/home-clean"
        aria-label="Back to IndoCity cleaners"
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

      {/* Footer Leave Review — only when reviews panel open AND inline form closed. */}
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

      {/* Bottom accent bar */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* Portfolio "View Details" popup */}
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

      {/* Contact / booking popup. The booking endpoint is reserved for
          when /api/home-clean/[slug]/book lands — until then the POST will
          surface a graceful error inside the popup; WhatsApp deep-link
          still fires either way so the customer can reach the cleaner. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={p.slug}
          providerName={p.display_name}
          whatsapp={p.whatsapp_e164}
          themeColor={theme}
          serviceOptions={offeredTypes.map((sid) => {
            const t = CLEAN_SERVICE_TYPES.find((x) => x.id === sid)
            const label = t?.label ?? sid
            return { value: label, label }
          })}
          presetService={contactServiceName}
          busyDates={busyDates}
          bookEndpoint={`/api/home-clean/${p.slug}/book`}
          copy={{
            whatsappMessage: ({ service, date, time, notes }) => [
              `Halo ${p.display_name}, saya ingin booking ${service.trim() || 'cleaning service'} `,
              `pada ${date} jam ${time}.`,
              notes.trim() ? `\nCatatan: ${notes.trim()}` : '',
              `\n\n— Sent via indocity.id`,
            ].join(''),
          }}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Typed extension — public-route may eventually add these fields.
// Keeping the extension shape local so the rewrite ships without an
// imports / types-file change (per the edit-only constraint).
// ─────────────────────────────────────────────────────────────────────
type HomeCleanPortfolioPhoto = {
  url:               string
  name?:             string
  description?:      string
  price_idr?:        number | null
  object_position?:  string
  before_image_url?: string
  after_image_url?:  string
}
type HomeCleanProviderPublicExt = HomeCleanProviderPublic & {
  hero_text?: {
    line1?:         string
    line2?:         string
    tagline?:       string
    color?:         string
    line1_color?:   string
    tagline_color?: string
    effect?:        'none' | 'shimmer' | 'dance' | 'underline'
  } | null
  promo_text?:           string | null
  busy_dates?:           string[] | null
  has_physical_location?: boolean | null
  latitude?:             number | null
  longitude?:            number | null
  service_photos?:       HomeCleanPortfolioPhoto[] | null
}

// ─────────────────────────────────────────────────────────────────────
// Service-type filter chip
// ─────────────────────────────────────────────────────────────────────

function ServiceFilterBadge({
  sid, active, onClick, theme,
}: { sid: CleanServiceType; active: boolean; onClick: () => void; theme: string }) {
  const meta = CLEAN_SERVICE_TYPES.find((t) => t.id === sid)
  const Icon = meta?.icon ?? Sparkles
  const label = meta?.label ?? sid
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
      <Icon
        className="w-3.5 h-3.5"
        strokeWidth={2.5}
        style={{ color: active ? '#FFFFFF' : theme }}
      />
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Pricing + portfolio helpers
// ─────────────────────────────────────────────────────────────────────

function formatStartFromPrice(p: HomeCleanProviderPublic): string {
  const candidates: number[] = []
  if (typeof p.hourly_rate_idr === 'number' && p.hourly_rate_idr > 0) candidates.push(p.hourly_rate_idr)
  if (typeof p.day_rate_idr    === 'number' && p.day_rate_idr    > 0) candidates.push(p.day_rate_idr)
  if (candidates.length === 0) return 'Rp 50k'
  return formatPriceIdr(Math.min(...candidates)) ?? 'Rp 50k'
}

function buildPortfolioPhotos(
  p: HomeCleanProviderPublic,
  servicePhotos: HomeCleanPortfolioPhoto[],
  active: CleanServiceType | null,
): PortfolioPhoto[] {
  const photos: PortfolioPhoto[] = servicePhotos
    .map((o): PortfolioPhoto | null => {
      if (!o || typeof o !== 'object') return null
      if (typeof o.url !== 'string' || !o.url.trim()) return null
      return o as PortfolioPhoto
    })
    .filter((x): x is PortfolioPhoto => x !== null)

  if (!active) {
    if (photos.length > 0) return photos
    return (p.gallery_image_urls ?? []).map((url) => ({ url }))
  }

  // Partial-name match — when a cleaner names a photo "Apartment cleaning
  // - Sudirman Park" we keep it on the Apartment filter. Empty match set
  // falls back to all photos so the carousel never collapses to zero
  // when the filter and photo data diverge.
  const meta = CLEAN_SERVICE_TYPES.find((t) => t.id === active)
  const keywords = meta?.keywords ?? [active.toString()]
  const matched = photos.filter((ph) => {
    const n = (ph.name ?? '').toLowerCase()
    return keywords.some((k) => n.includes(k))
  })
  return matched.length > 0 ? matched : photos
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

// ─────────────────────────────────────────────────────────────────────
// Reviews panel (inline list + leave-review form)
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
          provider_type:     'home_clean',
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
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-cyan-500"
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp (opsional, +62…)"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-cyan-500"
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={250}
              rows={3}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis pengalaman Anda (max 250 huruf)"
              className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-cyan-500"
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
