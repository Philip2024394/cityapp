'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import {
  Star, BadgeCheck, Award, MapPin, Bike, Car as CarIcon,
  Share2, Link2, X, ChevronLeft, MessageCircle,
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
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// =============================================================================
// PlaceProfileShell — 1:1 visual + functional mirror of
// /beautician/[slug] adapted for self-listed venues.
// -----------------------------------------------------------------------------
// Sections rendered, in order (same as beautician):
//   1. Hero cover + sparkle headline + back/share chrome
//   2. Reviews toggle pill (only when rating + reviewCount > 0)
//   3. Floating info card — icon, name (with verified tick), category/city,
//      rating summary, "Top Listed" award badge
//   4. About card with optional Visit Us launcher
//   5. Offers carousel (category-aware heading: Menu / Tickets & highlights /
//      Rooms & packages / Featured offers / Services / Highlights)
//   6. RunningMarquee (derived from tags)
//   7. Sticky bottom CTA — Bike + Car "Take me there" buttons + optional
//      "Contact venue" link when contactEnabled && whatsappE164
//   8. Compliance disclaimer ("Self-listed venue · …")
//   9. Right-edge vertical Back button (same as beautician)
//  10. Bottom accent bar (yellow, fixed)
//
// Deliberate deviations from beautician:
//   - No standalone "Services Provided" chips section (offers cover this)
//   - No standalone "Services + pricing" block (offers carousel covers this)
//   - Reviews panel is hidden when no rating data exists (places have no
//     write endpoint yet)
//   - Sticky CTA replaces ContactBookingPopup with transport-first
//     Bike/Car buttons; WhatsApp contact is the secondary link, gated on
//     contactEnabled + whatsappE164
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'
// Default place hero — used when the venue hasn't uploaded any photos yet.
// Falls back to the category gradient on the cover via empty-state branch.
const DEFAULT_PLACE_HERO =
  'https://ik.imagekit.io/nepgaxllc/place-default-hero.png'

export type PlaceOffer = {
  id:          string
  name:        string
  description: string | null
  price_idr:   number | null
  image_url:   string | null
  sort_order:  number
}

export type PlaceProfileShellProps = {
  place: {
    id:            string
    slug:          string
    name:          string
    category:      PlaceCategory
    categoryLabel: string
    description:   string | null
    imageUrls:     string[]
    city:          string
    address:       string | null
    tags:          string[]
    lat:           number
    lng:           number
    whatsappE164:  string | null
    hoursJson:     Record<string, unknown> | null
    rating:        number | null
    reviewCount:   number | null
    verified?:     boolean
    offers:        PlaceOffer[]
  }
  /**
   * Owner-controlled flag. When false, the secondary "Contact venue"
   * WhatsApp button is hidden even if the venue has a whatsapp_e164.
   * Transport CTAs always render.
   */
  contactEnabled?: boolean
}

// Map a PlaceCategory to the offers-section heading. Mirrors the
// beautician page's "Portfolio" / "Services Provided" headings.
function offersHeading(category: PlaceCategory): string {
  switch (category) {
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'club':
      return 'Menu'
    case 'attraction':
    case 'temple':
    case 'beach':
      return 'Tickets & highlights'
    case 'hotel':
      return 'Rooms & packages'
    case 'mall':
      return 'Featured offers'
    default:
      return 'Highlights'
  }
}

// Compose the marquee text from tags. Falls back to a generic prompt so
// the ribbon never reads empty.
function buildMarqueeText(name: string, tags: string[]): string {
  const clean = tags.map((t) => t.trim()).filter(Boolean)
  if (clean.length > 0) return clean.join(' · ')
  return `Discover ${name} on IndoCity — self-listed venue, agree price directly when you visit.`
}

// Cast hours_json (unknown record) to the string-per-day shape VisitUsPanel
// expects. Places store hours as { mon: "08:00-22:00", ... } in dashboard
// editor, but the column type is jsonb so we runtime-filter.
function coerceHoursForPanel(raw: Record<string, unknown> | null): Record<string, string> | null {
  if (!raw) return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return Object.keys(out).length > 0 ? out : null
}

export default function PlaceProfileShell({
  place, contactEnabled = true,
}: PlaceProfileShellProps) {
  // Beautician uses a per-profile theme_color; places share the brand
  // yellow until per-venue theming ships, so the accent stays consistent.
  const theme = BRAND_YELLOW

  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  // Reviews + Visit Us panels swap the content area, same as beautician.
  const [showReviews, setShowReviews] = useState(false)
  const [showVisitUs, setShowVisitUs] = useState(false)
  // Portfolio layout — same flip toggle used on every beautician page.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  // Selected offer card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)

  const photos    = place.imageUrls
  const heroSrc   = photos[0] || DEFAULT_PLACE_HERO
  const offers    = place.offers ?? []
  const hasOffers = offers.length > 0
  const CategoryIcon = CATEGORIES[place.category]?.Icon ?? null
  const categoryGradient = CATEGORIES[place.category]?.gradient ?? 'linear-gradient(135deg, #92400E, #B45309)'

  const ratingVal   = place.rating ?? 0
  const reviewCount = place.reviewCount ?? 0
  const hasReviews  = ratingVal > 0 && reviewCount > 0

  // Map offers → PortfolioPhoto shape so the shared carousel + detail
  // popup renders identically to the beautician variant.
  const portfolioPhotos: PortfolioPhoto[] = offers.map((o) => ({
    url:         o.image_url || photos[0] || DEFAULT_PLACE_HERO,
    name:        o.name,
    description: o.description,
    price_idr:   o.price_idr,
  }))

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/places/${place.slug}`

  // "Take me there" — pre-fills /cari with this place as destination.
  function takeMeThereHref(vehicleType: 'bike' | 'car'): string {
    const sp = new URLSearchParams({
      dLat:        String(place.lat),
      dLng:        String(place.lng),
      dName:       place.name,
      vehicleType,
    })
    return `/cari?${sp.toString()}`
  }

  // Pre-filled Indonesian WhatsApp greeting for the optional secondary CTA.
  const waHref = place.whatsappE164
    ? `https://wa.me/${place.whatsappE164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
        `Halo, saya tertarik dengan ${place.name} dari IndoCity`,
      )}`
    : null
  const showContact = contactEnabled && Boolean(waHref)

  const panelHours = coerceHoursForPanel(place.hoursJson)

  return (
    <Shell>
      {/* HERO — 16/9 cover with optional sparkle overlay + share button. */}
      <div className="relative pb-2">
        {/* Top-right share button — same yellow chip as beautician's themed pill. */}
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share place"
          className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center text-black shadow-md active:scale-[0.96] transition"
          style={{ background: theme }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          {photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroSrc}
              alt={place.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: categoryGradient }}
              aria-hidden
            >
              {CategoryIcon ? (
                <CategoryIcon className="w-24 h-24 text-white/85" strokeWidth={1.5} />
              ) : (
                <MapPin className="w-20 h-20 text-white/85" strokeWidth={1.5} />
              )}
            </div>
          )}
          {/* Soft top fade so the share chip stays readable on bright photos. */}
          <div
            className="absolute inset-x-0 top-0 h-20 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)',
            }}
            aria-hidden
          />
        </div>

        {/* Reviews toggle — only renders when we actually have review data,
            since places have no review-write endpoint yet. */}
        {hasReviews && (
          <div className="px-4 relative z-20 flex justify-end" style={{ marginTop: -56 }}>
            <button
              type="button"
              onClick={() => { setShowReviews((v) => !v); setShowVisitUs(false) }}
              aria-pressed={showReviews}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-black text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
              style={{ background: theme }}
            >
              <Star className="w-3.5 h-3.5" strokeWidth={0} fill="#000000" />
              {showReviews ? 'Hide reviews' : 'Reviews'}
            </button>
          </div>
        )}

        {/* Floating info card — overlaps the bottom edge of the cover. */}
        <div className="px-4 relative z-20" style={{ marginTop: hasReviews ? 12 : -56 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            {/* Square category icon tile in place of the beautician avatar. */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white shrink-0 border-2 border-white shadow overflow-hidden"
              style={{ background: categoryGradient }}
              aria-hidden
            >
              {CategoryIcon ? (
                <CategoryIcon className="w-7 h-7" strokeWidth={2} />
              ) : (
                <MapPin className="w-7 h-7" strokeWidth={2} />
              )}
            </div>

            {/* Name + category/city + rating */}
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight flex items-center gap-1">
                <span className="truncate">{place.name}</span>
                {place.verified && (
                  <BadgeCheck
                    className="w-4 h-4 shrink-0"
                    strokeWidth={2.5}
                    fill={theme}
                    style={{ color: '#FFFFFF' }}
                    aria-label="Verified"
                  />
                )}
              </h1>
              <p className="text-[12px] text-gray-500 truncate mt-0.5">
                <span className="font-extrabold text-gray-700">{place.categoryLabel}</span>
                {place.city ? <> · <span className="capitalize">{place.city}</span></> : null}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: BRAND_YELLOW }}
                  fill={BRAND_YELLOW}
                  strokeWidth={0}
                />
                <span className="text-[12px] font-extrabold text-black">
                  {hasReviews ? ratingVal.toFixed(1) : '—'}
                </span>
                <span className="text-[11px] text-gray-500">
                  ({reviewCount} review{reviewCount === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* "Top Listed" award badge — neutral gray pill with themed icon
                + text, mirroring the beautician "Top Rated Seller" chip. */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: BRAND_NAVY }} />
              <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: BRAND_NAVY }}>
                Top Listed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-40 max-w-2xl mx-auto space-y-3 pt-3">
        {showVisitUs ? (
          <VisitUsPanel
            displayName={place.name}
            address={place.address}
            city={place.city ?? null}
            lat={Number.isFinite(place.lat) ? place.lat : null}
            lng={Number.isFinite(place.lng) ? place.lng : null}
            hours={panelHours}
            busyDates={[]}
            themeColor={theme}
            onClose={() => setShowVisitUs(false)}
            noLocationCopy="Lokasi belum di-pin oleh venue."
            bottomCtas={
              (Number.isFinite(place.lat) && Number.isFinite(place.lng))
                ? [
                    {
                      label: 'Bike',
                      icon: Bike,
                      variant: 'yellow',
                      onClick: () => { window.location.href = takeMeThereHref('bike') },
                      note: `We'll use your location for pickup and ${place.name}'s for drop-off — fare shows on the next screen.`,
                    },
                    {
                      label: 'Car',
                      icon: CarIcon,
                      variant: 'navy',
                      onClick: () => { window.location.href = takeMeThereHref('car') },
                    },
                  ]
                : undefined
            }
          />
        ) : showReviews ? (
          <PlaceReviewsPanel
            rating={ratingVal}
            count={reviewCount}
            theme={theme}
            onClose={() => setShowReviews(false)}
          />
        ) : (
          <>
            {/* About — bio-style 5-line clamp + optional Visit Us launcher. */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  About {place.name}
                </h2>
                {(Number.isFinite(place.lat) && Number.isFinite(place.lng)) && (
                  <button
                    type="button"
                    onClick={() => setShowVisitUs(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                    style={{ color: BRAND_NAVY }}
                  >
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Visit Us
                  </button>
                )}
              </div>
              <div className="flex items-start gap-3">
                {place.description?.trim() ? (
                  <p
                    className="text-[13px] text-gray-600 leading-snug flex-1 min-w-0"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {place.description.replace(/\s*\n\s*/g, ' ')}
                  </p>
                ) : (
                  <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">
                    No description yet.
                  </p>
                )}
              </div>
            </section>

            {/* Offers carousel — category-aware heading. Hidden entirely
                when the venue hasn't published any offers. */}
            {hasOffers && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                    {offersHeading(place.category)}
                  </h2>
                  <PortfolioViewToggle
                    view={portfolioView}
                    onChange={setPortfolioView}
                    themeColor={BRAND_NAVY}
                  />
                </div>
                <p className="text-[11px] text-gray-500 italic -mt-1">
                  Offers self-published by venue · agree price directly when you visit
                </p>
                <PortfolioCarousel
                  photos={portfolioPhotos}
                  onViewDetails={(ph) => setDetailPhoto(ph)}
                  themeColor={BRAND_NAVY}
                  view={portfolioView}
                />
              </section>
            )}

            {/* Running marquee — tags as the scrolling ribbon copy. */}
            <RunningMarquee
              text={buildMarqueeText(place.name, place.tags)}
              background="#FEF3C7"
              color="#78350F"
            />

            {/* Compliance footer — keeps the directory disclaimer visible
                above the sticky CTAs without contributing to chrome. */}
            <p className="text-[11px] text-gray-400 leading-snug pt-2">
              Self-listed venue · IndoCity is a software directory ·{' '}
              <Link href="/legal" className="underline-offset-2 hover:underline">
                Legal info
              </Link>
            </p>
          </>
        )}
      </div>

      {/* SHARE SHEET — identical to the beautician share modal so customers
          have the same hand-off to WhatsApp / Facebook / IG / TikTok. */}
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
              <h3 className="text-[16px] font-black text-black">Share place</h3>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              Bagikan {place.name} ke teman atau di sosial media.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* ignore */ }
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
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat ${place.name} di IndoCity: ${profileUrl}`)}`}
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

      {/* Right-edge vertical Back button — same as beautician. */}
      <Link
        href="/places"
        aria-label="Back to IndoCity places"
        className="fixed z-40 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right: 0,
          top: '35%',
          transform: 'translateY(-50%)',
          width: 34,
          height: 110,
          background: BRAND_YELLOW,
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

      {/* STICKY BOTTOM CTA — optional WhatsApp contact only. The Bike +
          Car transport buttons have moved INSIDE the Visit Us panel
          (founder direction: transport CTAs sit under the map, where
          the destination is the user's actual context). When
          contact_enabled=false OR no whatsapp_e164, this row is empty
          and the bottom accent bar sits flush with the viewport. */}
      {showContact && waHref && (
        <div
          className="fixed left-0 right-0 z-30"
          style={{ bottom: 6 /* leave room for the accent bar */ }}
        >
          <div className="mx-auto max-w-2xl px-3 pb-3">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-[13px] font-extrabold text-black shadow-md active:scale-[0.98] transition"
              style={{ minHeight: 48 }}
            >
              <MessageCircle className="w-4 h-4 text-green-600" strokeWidth={2.5} />
              Contact venue on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Bottom accent bar — fixed to visible viewport edge, same as beautician. */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* Offer "View Details" popup — full image + description + price.
          Reuses the beautician PortfolioDetailPopup; contact CTA is
          enabled only when contactEnabled && whatsappE164 so the popup
          mirrors the privacy posture of the sticky CTA. */}
      {detailPhoto && (
        <PortfolioDetailPopup
          photo={detailPhoto}
          themeColor={BRAND_NAVY}
          canContact={showContact}
          onClose={() => setDetailPhoto(null)}
          onContact={() => {
            if (waHref) window.open(waHref, '_blank')
            setDetailPhoto(null)
          }}
        />
      )}
    </Shell>
  )
}

// =============================================================================
// PlaceReviewsPanel — read-only summary. Places have no review-write
// endpoint yet, so we mirror beautician's ReviewsPanel structure but only
// render the aggregate (no submission form, no list iteration). When this
// component is shown the parent has already verified rating + count > 0.
// =============================================================================
function PlaceReviewsPanel({
  rating, count, theme, onClose,
}: {
  rating: number
  count:  number
  theme:  string
  onClose: () => void
}) {
  return (
    <section className="space-y-3" style={{ marginTop: 4 }}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
          Reviews
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reviews"
          className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
          style={{ color: theme }}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          Close
        </button>
      </div>
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: '#FFFFFF', border: `1.5px solid ${theme}55` }}
        >
          <Star className="w-7 h-7" strokeWidth={0} fill={BRAND_YELLOW} style={{ color: BRAND_YELLOW }} />
        </div>
        <div className="min-w-0">
          <div className="text-[24px] font-black text-black leading-none">
            {rating.toFixed(1)}
            <span className="text-[14px] font-bold text-gray-500"> / 5</span>
          </div>
          <div className="text-[12px] text-gray-600 mt-1">
            Based on {count} review{count === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">
        Reviews shown here are aggregated from IndoCity visits. Submitting
        a review for a venue isn&apos;t open yet — agree price + experience
        directly with the venue when you visit.
      </p>
    </section>
  )
}

// =============================================================================
// Shell — solid white page so the global PageBackground doesn't bleed
// through, plus the dev-toolbar hide rule. Mirrors beautician's Shell.
// =============================================================================
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A]">
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
