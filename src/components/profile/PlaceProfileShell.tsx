'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Star, BadgeCheck, Award, MapPin, Bike, Car as CarIcon,
  Share2, Link2, X, ChevronLeft, MessageCircle, ArrowRight,
  ShoppingBag, Minus, Plus, Trash2,
} from 'lucide-react'
import { haversineKm } from '@/lib/geo/haversine'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
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
import { usePlaceCart, type PlaceCartItem } from '@/components/profile/usePlaceCart'

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
    /** Self-listed cuisine tags ("Indonesian", "Japanese", "Halal",
     *  "Cocktails", etc.). Rendered as small chips under the About
     *  card. Empty array → cuisine row is hidden (non-food places). */
    cuisineTypes:  string[]
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
  /**
   * Owner-controlled flag (places.free_delivery). When true, the cart
   * sheet shows a green "Free delivery by venue" pill in place of the
   * bike-rider estimate row. IndoCity never books or pays for delivery
   * — this is purely a hint to the customer that the venue arranges it.
   */
  freeDelivery?: boolean
}

// =============================================================================
// Bike-delivery estimate — display-only constants.
//
// `DEFAULT_BIKE_PER_KM` is a market-norm hint (2,500 IDR/km) used as the
// per-km multiplier when /api/drivers/lowest-fare doesn't return a usable
// per-km rate. The API currently returns min_fee (a flat floor), not a
// per-km rate, so we use this constant as a transparent default. Founder
// can revisit when the API exposes a real per-km aggregation.
//
// `DEFAULT_MIN_FEE_IDR` is the fallback floor when the API call fails
// entirely — customers should still see a sensible estimate even if the
// network blip means we couldn't fetch the actual drivers' min_fee.
// =============================================================================
const DEFAULT_BIKE_PER_KM = 2500
const DEFAULT_MIN_FEE_IDR = 10_000
const DELIVERY_HIDE_KEY = 'indocity:cart:delivery-estimate-hidden'

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
  return `Discover ${name} on Kita2u — self-listed venue, agree price directly when you visit.`
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
  place, contactEnabled = true, freeDelivery = false,
}: PlaceProfileShellProps) {
  // Beautician uses a per-profile theme_color; places share the brand
  // yellow until per-venue theming ships, so the accent stays consistent.
  const theme = BRAND_YELLOW

  // Driver round-trip — when the customer arrived here from a driver
  // profile's "Places" pill, `return_driver` carries `r:slug` (bike) or
  // `c:slug` (car-like). We use this to (a) swap the footer "Contact
  // venue" CTA for a yellow "Take me here →" button and (b) build the
  // href that returns to the driver profile with this place pre-filled
  // as the drop-off. Pickup params (pName/pLat/pLng) round-trip back so
  // the customer's typed pickup survives the full loop.
  const searchParams = useSearchParams()
  const returnDriverToken = searchParams?.get('return_driver') ?? null
  const incomingPName = searchParams?.get('pName') ?? null
  const incomingPLat  = searchParams?.get('pLat')  ?? null
  const incomingPLng  = searchParams?.get('pLng')  ?? null

  // Parse the `return_driver` token. Format is `r:<slug>` for bike
  // drivers and `c:<slug>` for car-like drivers. Anything else (missing
  // prefix, unknown prefix, blank slug, accidental extra colons) is
  // treated as INVALID and the "Take me here" CTA is suppressed —
  // falling back to the regular Contact CTA so the customer is never
  // stranded with a broken navigation button. We never try to "guess"
  // the prefix from /r vs /car referers because that bypasses URL state
  // and would silently re-route customers who hand-edited the link.
  const returnDriverTarget = useMemo(() => {
    if (!returnDriverToken) return null
    const colonIdx = returnDriverToken.indexOf(':')
    if (colonIdx <= 0) return null
    const prefix = returnDriverToken.slice(0, colonIdx)
    const slug   = returnDriverToken.slice(colonIdx + 1).trim()
    if (!slug) return null
    if (prefix === 'r') return { path: `/r/${slug}` }
    if (prefix === 'c') return { path: `/car/${slug}` }
    return null
  }, [returnDriverToken])

  // Compose the return URL — drops this place's name + coords (when
  // present) onto the driver-profile route so the booking widget
  // hydrates pickup + dropoff on mount. We URL-encode via
  // URLSearchParams (handles spaces, ampersands, accented chars in
  // venue names). lat/lng are omitted from the query when the place
  // row has null/non-finite coords; the driver shell is typed-only so
  // the dName alone is enough to drive the booking widget, but cars
  // shipping a map picker later can read the coords too.
  const takeMeHereHref = useMemo(() => {
    if (!returnDriverTarget) return null
    const sp = new URLSearchParams()
    sp.set('dName', place.name)
    if (Number.isFinite(place.lat)) sp.set('dLat', String(place.lat))
    if (Number.isFinite(place.lng)) sp.set('dLng', String(place.lng))
    if (incomingPName) sp.set('pName', incomingPName)
    if (incomingPLat)  sp.set('pLat',  incomingPLat)
    if (incomingPLng)  sp.set('pLng',  incomingPLng)
    return `${returnDriverTarget.path}?${sp.toString()}`
  }, [returnDriverTarget, place.name, place.lat, place.lng, incomingPName, incomingPLat, incomingPLng])

  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  // Reviews + Visit Us panels swap the content area, same as beautician.
  const [showReviews, setShowReviews] = useState(false)
  const [showVisitUs, setShowVisitUs] = useState(false)
  // Portfolio layout — same flip toggle used on every beautician page.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  // Selected offer card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  // Cart is FOOD-ONLY. Government offices, temples, hospitals etc. don't
  // have menu items to order — gate every cart surface on this flag.
  // Food categories mirror the /food page's filter set.
  const IS_FOOD_PLACE =
    place.category === 'restaurant' ||
    place.category === 'cafe' ||
    place.category === 'bar' ||
    place.category === 'club'

  // Cart state — per-place localStorage cart for the WhatsApp handoff.
  const cart = usePlaceCart(place.id)
  const [cartOpen, setCartOpen] = useState(false)

  // Auto-clear cart on unmount (founder direction: leaving the profile
  // page resets the cart so a customer who navigates away never sees
  // stale items on their next visit). The "Clear cart" button is gone;
  // cleanup happens via unmount + a tab-hide listener so closing the
  // tab also clears. `clear` is a stable useCallback in usePlaceCart so
  // capturing it once at mount is safe.
  const clearRef = useRef(cart.clear)
  clearRef.current = cart.clear
  useEffect(() => {
    function onPageHide() { clearRef.current() }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      clearRef.current()
    }
  }, [])

  // Lightweight toast — fires on "Add to cart" success and auto-dismisses.
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 1800)
    return () => clearTimeout(t)
  }, [toastMsg])

  const photos    = place.imageUrls
  const heroSrc   = photos[0] || DEFAULT_PLACE_HERO
  const offers    = place.offers ?? []
  const hasOffers = offers.length > 0
  const CategoryIcon = CATEGORIES[place.category]?.Icon ?? null
  const categoryGradient = CATEGORIES[place.category]?.gradient ?? 'linear-gradient(135deg, #92400E, #B45309)'

  const ratingVal   = place.rating ?? 0
  const reviewCount = place.reviewCount ?? 0
  const hasReviews  = ratingVal > 0 && reviewCount > 0

  // Cheapest priced offer — surfaces as "Start from Rp X" on the info
  // card so customers instantly see the entry price (drinks-from / menu-
  // from / ticket-from / product-from per category). null = no priced
  // offers → pill is hidden. Lower-bound only — the venue self-publishes
  // each offer's individual price, IndoCity never computes a total.
  const minOfferPriceIdr: number | null = (() => {
    const prices = offers
      .map(o => o.price_idr)
      .filter((p): p is number => typeof p === 'number' && p > 0)
    return prices.length === 0 ? null : Math.min(...prices)
  })()
  const startFromLabel: string | null = (() => {
    if (minOfferPriceIdr == null) return null
    if (minOfferPriceIdr >= 1_000_000) {
      const jt = minOfferPriceIdr / 1_000_000
      return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
    }
    if (minOfferPriceIdr >= 1000) {
      const k = minOfferPriceIdr / 1000
      return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
    }
    return `Rp ${minOfferPriceIdr.toLocaleString('id-ID')}`
  })()

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
        `Halo, saya tertarik dengan ${place.name} dari Kita2u`,
      )}`
    : null
  const showContact = contactEnabled && Boolean(waHref)

  const panelHours = coerceHoursForPanel(place.hoursJson)

  return (
    <Shell>
      {/* HERO — 16/9 cover with optional sparkle overlay + share button. */}
      <div className="relative pb-2">
        {/* Top-right floating row — share + cart icons. Always rendered
            (regardless of cart count) so the cart entry point is
            visible the moment a customer adds anything. White-glass
            cart pill matches the hero share chip visually. */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share place"
            className="w-10 h-10 rounded-full flex items-center justify-center text-black shadow-md active:scale-[0.96] transition"
            style={{ background: theme }}
          >
            <Share2 className="w-4 h-4" strokeWidth={2.5} />
          </button>
          {IS_FOOD_PLACE && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={cart.totalQty > 0
                ? `Open cart (${cart.totalQty} item${cart.totalQty === 1 ? '' : 's'})`
                : 'Open cart'}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-black shadow-md active:scale-[0.96] transition"
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                minWidth: 44, minHeight: 44,
              }}
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
              {cart.totalQty > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black leading-none shadow"
                  style={{ background: BRAND_YELLOW, color: BRAND_NAVY, border: '1.5px solid #FFFFFF' }}
                >
                  {cart.totalQty > 99 ? '99+' : cart.totalQty}
                </span>
              )}
            </button>
          )}
        </div>

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
            className="absolute inset-x-0 top-0 h-28 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 70%, transparent 100%)',
            }}
            aria-hidden
          />

          {/* Place name (top-left overlay) + slogan (first sentence of the
              description). White text + drop shadow so it stays readable
              over photo + the fade above. Truncated long descriptions to
              ~80 chars so the slogan line wraps cleanly. */}
          <div className="absolute top-3 left-3 right-20 pointer-events-none">
            <h1
              className="text-white font-black tracking-tight leading-[1.1] text-[20px] sm:text-[24px]"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.55)' }}
            >
              {place.name}
            </h1>
            {place.description && (
              <p
                className="text-white/95 font-semibold leading-snug mt-1 text-[12px] sm:text-[13px] line-clamp-2"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.55)' }}
              >
                {(() => {
                  // Slogan = first sentence of the description (clipped at
                  // ~80 chars so it never crowds the hero). Falls back to
                  // the full string when there's no sentence boundary.
                  const d = place.description.trim()
                  const firstSentence = d.split(/(?<=[.!?])\s/)[0] ?? d
                  return firstSentence.length > 80
                    ? firstSentence.slice(0, 80).trimEnd() + '…'
                    : firstSentence
                })()}
              </p>
            )}
          </div>
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

              {/* Cuisine chips — self-listed cuisine tags. Hidden when the
                  array is empty (non-food places). Small grey pills, brand
                  yellow border + dark text, wrap to multiple lines when
                  many cuisines are listed. */}
              {place.cuisineTypes.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                    Cuisine
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {place.cuisineTypes.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold text-black"
                        style={{
                          background: '#FEF3C7',
                          border: '1px solid #FDE68A',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                    themeColor={BRAND_YELLOW}
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

            {/* PRICE + CONTACT FOOTER ROW — mirrors the beautician profile
                exact pattern (page.tsx lines 595-614): large Rp price on the
                left with the "Start from" caption underneath, themed Contact
                button (square w/ rounded corners) on the right. Sits inside
                the content scroll, not a sticky overlay.

                When the customer arrived from a driver profile (return_driver
                token present + valid prefix), the Contact CTA is REPLACED
                with a yellow "Take me here →" button that returns to the
                driver profile with this place's name + coords pre-filled as
                the drop-off. Invalid tokens fall through to the regular
                Contact CTA so the customer is never stranded. */}
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="leading-none pb-3">
                <div className="text-[24px] sm:text-[28px] font-black text-black">
                  {startFromLabel ?? '—'}
                </div>
                <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
                  Start from
                </div>
              </div>
              {takeMeHereHref ? (
                <Link
                  href={takeMeHereHref}
                  aria-label="Take me here — set this place as drop-off"
                  className="inline-flex items-center gap-1.5 justify-center px-5 py-3 rounded-xl font-extrabold text-[13px] shadow-md active:scale-[0.97] transition shrink-0"
                  style={{
                    background: BRAND_YELLOW,
                    color: '#0A0A0A',
                    minHeight: 44,
                  }}
                >
                  Take me here
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </Link>
              ) : (showContact && waHref) ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 justify-center px-5 py-3 rounded-xl text-white font-extrabold text-[13px] shadow-md active:scale-[0.97] transition shrink-0"
                  style={{ background: theme }}
                >
                  <MessageCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
                  Contact
                </a>
              ) : null}
            </div>

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
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat ${place.name} di Kita2u: ${profileUrl}`)}`}
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
        aria-label="Back to Kita2u places"
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
      {/* Sticky "Contact venue" yellow pill removed per founder direction —
          the inline Contact button in the beautician-style footer row
          (next to the Start-from price) is now the single contact path. */}

      {/* Bottom accent bar — fixed to visible viewport edge, same as beautician. */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* Offer "View Details" popup — full image + description + price.
          Reuses the beautician PortfolioDetailPopup; contact CTA is
          enabled only when contactEnabled && whatsappE164 so the popup
          mirrors the privacy posture of the sticky CTA.

          For priced offers we additionally pass onAddToCart so the
          popup renders the quantity stepper + "Add to cart" CTA below
          the price block. Resolving back from PortfolioPhoto → offer
          uses name match (offers carry no id in PortfolioPhoto). */}
      {detailPhoto && (() => {
        const matchedOffer = offers.find((o) => o.name === detailPhoto.name) ?? null
        const canAddToCart = IS_FOOD_PLACE && Boolean(
          matchedOffer && typeof matchedOffer.price_idr === 'number' && matchedOffer.price_idr > 0,
        )
        const existingLine = matchedOffer
          ? cart.items.find((it) => it.offer_id === matchedOffer.id) ?? null
          : null
        return (
          <PortfolioDetailPopup
            photo={detailPhoto}
            // Brand-yellow top edge — matches the profile theme so the
            // popup reads as part of the same surface (founder ask:
            // "add theme edge color to the pop up container").
            themeColor={BRAND_YELLOW}
            // Contact button suppressed on places per founder ask —
            // the cart "Add to cart" action is the only CTA inside the
            // menu-item popup. Beautician + handyman call sites still
            // pass canContact={true} and see the Contact button.
            canContact={false}
            onClose={() => setDetailPhoto(null)}
            onContact={() => {
              if (waHref) window.open(waHref, '_blank')
              setDetailPhoto(null)
            }}
            onAddToCart={canAddToCart && matchedOffer
              ? (qty) => {
                  cart.add(
                    {
                      offer_id:  matchedOffer.id,
                      name:      matchedOffer.name,
                      price_idr: matchedOffer.price_idr as number,
                      image_url: matchedOffer.image_url,
                    },
                    qty,
                  )
                  setDetailPhoto(null)
                  setToastMsg(`Added ${qty} × ${matchedOffer.name} to cart`)
                }
              : undefined}
            cartQty={existingLine?.qty}
          />
        )
      })()}

      {/* CART SHEET — bottom-sheet style modal listing every line in
          the cart. Total is a simple sum of offer.price_idr × qty —
          Kita2u never adds delivery, service, or platform fees. The
          primary CTA builds an Indonesian WhatsApp message and hands
          off to the venue's WhatsApp; we never see the conversation.
          Gated on IS_FOOD_PLACE — non-food places never open this. */}
      {IS_FOOD_PLACE && cartOpen && (
        <PlaceCartSheet
          placeName={place.name}
          whatsappE164={place.whatsappE164}
          contactEnabled={contactEnabled}
          freeDelivery={freeDelivery}
          venueLat={place.lat}
          venueLng={place.lng}
          items={cart.items}
          totalIdr={cart.totalIdr}
          totalQty={cart.totalQty}
          theme={theme}
          onSetQty={cart.setQty}
          onRemove={cart.remove}
          onClear={() => { cart.clear() }}
          onClose={() => setCartOpen(false)}
          onSend={() => {
            // Build the order body. Each line: "• Name ×qty (Rp price) — Rp lineTotal"
            // The trailing "Alamat saya" / "Catatan" lines are blank so
            // the customer fills them in inside WhatsApp itself — no
            // address auto-detection per spec.
            const linesArr = cart.items.map((it) => {
              const unit  = formatRpExact(it.price_idr)
              const line  = formatRpExact(it.price_idr * it.qty)
              return `• ${it.name}  ×${it.qty}  (${unit}) — ${line}`
            })
            const body = [
              `Halo! Saya pesan dari Kita2u · ${place.name}`,
              '',
              ...linesArr,
              '',
              `Total: ${formatRpExact(cart.totalIdr)}`,
              'Alamat saya: ____________',
              'Catatan: ____________',
            ].join('\n')
            const digits = (place.whatsappE164 || '').replace(/[^\d]/g, '')
            if (!digits) return
            const url = `https://wa.me/${digits}?text=${encodeURIComponent(body)}`
            window.open(url, '_blank', 'noopener,noreferrer')
            // Keep the cart populated so the customer can re-send if
            // WhatsApp eats the prefill on some Android builds. They
            // can hit Clear cart manually when they're done.
            setCartOpen(false)
          }}
        />
      )}

      {/* Toast — confirms "Added to cart". Auto-dismisses after ~1.8s
          via the useEffect on toastMsg. Stays out of the way of the
          fixed bottom accent bar by sitting just above it. */}
      {toastMsg && (
        <div
          className="fixed left-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-[13px] font-extrabold pointer-events-none"
          style={{
            bottom: 28,
            transform: 'translateX(-50%)',
            background: BRAND_NAVY,
            color: '#FFFFFF',
            maxWidth: '90vw',
          }}
          role="status"
        >
          {toastMsg}
        </div>
      )}
    </Shell>
  )
}

// =============================================================================
// Helpers — exact-rupiah formatter used by the WhatsApp message body and
// the cart sheet total. We DON'T re-use the abbreviated `Start from` label
// here because the customer needs to see the precise amount they're
// agreeing to pay (Rp 102,000 not "Rp 102k").
// =============================================================================
function formatRpExact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return 'Rp 0'
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
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
        Reviews shown here are aggregated from Kita2u visits. Submitting
        a review for a venue isn&apos;t open yet — agree price + experience
        directly with the venue when you visit.
      </p>
    </section>
  )
}

// =============================================================================
// PlaceCartSheet — bottom-anchored review + WhatsApp handoff sheet.
// Empty state, line items with steppers + remove, total, send + clear.
//
// The "Send via WhatsApp" CTA is disabled when the venue has opted out
// of contact (contactEnabled=false) or has no whatsapp_e164 — the
// tooltip explains why, no silent failure.
// =============================================================================
function PlaceCartSheet({
  placeName, whatsappE164, contactEnabled, freeDelivery,
  venueLat, venueLng, items, totalIdr, totalQty,
  theme, onSetQty, onRemove, onClear, onClose, onSend,
}: {
  placeName:       string
  whatsappE164:    string | null
  contactEnabled:  boolean
  freeDelivery:    boolean
  venueLat:        number
  venueLng:        number
  items:           PlaceCartItem[]
  totalIdr:        number
  totalQty:        number
  theme:           string
  onSetQty:        (offer_id: string, qty: number) => void
  onRemove:        (offer_id: string) => void
  onClear:         () => void
  onClose:         () => void
  onSend:          () => void
}) {
  const empty = items.length === 0
  const sendDisabled = empty || !contactEnabled || !whatsappE164
  const sendDisabledReason = !contactEnabled || !whatsappE164
    ? "This venue doesn't accept WhatsApp orders."
    : empty
      ? 'Add an item to send an order.'
      : ''

  // ----------------------------------------------------------------------
  // Delivery estimate row state — only relevant when venue does NOT
  // offer free delivery. We intentionally DON'T auto-request GPS — the
  // customer taps a "Tap to estimate" CTA inside the row, which fires
  // geo.request() and then triggers the lowest-fare fetch. Hidden via
  // a localStorage flag so the customer can opt out per device.
  // ----------------------------------------------------------------------
  const geo = useGeolocation(false)
  const [estimateHidden, setEstimateHidden] = useState(false)
  const [perKmIdr, setPerKmIdr] = useState<number>(DEFAULT_BIKE_PER_KM)
  const [minFeeIdr, setMinFeeIdr] = useState<number>(DEFAULT_MIN_FEE_IDR)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [estimateFetched, setEstimateFetched] = useState(false)

  // Read the hide flag on mount. Defensive — localStorage can throw
  // in private/incognito modes; we just default to "show".
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const v = window.localStorage.getItem(DELIVERY_HIDE_KEY)
      if (v === '1') setEstimateHidden(true)
    } catch { /* ignore */ }
  }, [])

  function persistHidden(next: boolean) {
    setEstimateHidden(next)
    if (typeof window === 'undefined') return
    try {
      if (next) window.localStorage.setItem(DELIVERY_HIDE_KEY, '1')
      else      window.localStorage.removeItem(DELIVERY_HIDE_KEY)
    } catch { /* ignore */ }
  }

  // Distance (km) — derived from geo.coords + venue location. Falls
  // back to null until the customer has granted GPS.
  const distanceKm: number | null = (geo.coords && Number.isFinite(venueLat) && Number.isFinite(venueLng))
    ? haversineKm(
        { lat: geo.coords.lat, lng: geo.coords.lng },
        { lat: venueLat, lng: venueLng },
      )
    : null

  // Estimate (rounded to nearest 1,000 IDR, floored at min_fee).
  const estimateIdr: number | null = (() => {
    if (distanceKm == null) return null
    const raw = perKmIdr * distanceKm
    const rounded = Math.round(raw / 1000) * 1000
    return Math.max(rounded, minFeeIdr)
  })()

  // Trigger fetching the lowest-fare data once we have GPS. Cancels
  // if the customer closes the sheet mid-fetch.
  async function fetchLowestFare(coords: GeoPoint) {
    setEstimateLoading(true)
    setEstimateError(null)
    try {
      const url = `/api/drivers/lowest-fare?vehicleType=bike&lat=${coords.lat}&lng=${coords.lng}&radiusKm=30`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { lowestFareIdr: number | null; driverCount: number }
      if (typeof json.lowestFareIdr === 'number' && json.lowestFareIdr > 0) {
        // The API returns min_fee (a flat floor), not a per-km rate.
        // We keep the hardcoded DEFAULT_BIKE_PER_KM multiplier and
        // surface the API value as the min-fee floor only. Founder
        // direction: market-norm per-km, transparent floor.
        setMinFeeIdr(json.lowestFareIdr)
      }
      setEstimateFetched(true)
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : 'Could not fetch estimate')
    } finally {
      setEstimateLoading(false)
    }
  }

  async function handleTapToEstimate() {
    const point = await geo.request()
    if (point) await fetchLowestFare(point)
  }

  // Render flag — only render the delivery row inside the cart body
  // when (a) the customer has at least one item AND (b) we're not
  // showing the free-delivery pill instead.
  const showEstimateRow  = !empty && !freeDelivery && !estimateHidden
  const showFreeDelivery = !empty && freeDelivery

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your order"
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl relative flex flex-col max-h-[90dvh]"
        style={{ borderTop: `4px solid ${theme}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — brand-yellow ShoppingBag icon on the LEFT mirroring
            the cart icon in the hero top-right, name + count in the
            middle, X close on the right. */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full"
              style={{ background: theme }}
              aria-hidden
            >
              <ShoppingBag className="w-4 h-4 text-black" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-black text-black truncate">
                Your order · <span className="font-extrabold">{placeName}</span>
              </h3>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {totalQty > 0
                  ? `${totalQty} item${totalQty === 1 ? '' : 's'}`
                  : 'No items yet'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X className="w-4 h-4 text-gray-600" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body — scrollable line items or empty state. */}
        <div className="px-5 py-2 overflow-y-auto flex-1">
          {empty ? (
            <div
              className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-300 bg-gray-50"
            >
              <ShoppingBag className="w-7 h-7 mx-auto text-gray-400 mb-2" strokeWidth={2} />
              <div className="text-[13px] font-extrabold text-gray-700">
                Your cart is empty.
              </div>
              <div className="text-[12px] text-gray-500 mt-1">
                Tap a menu item to add.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.offer_id} className="py-3 flex items-start gap-3">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-gray-400" strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-extrabold text-black leading-tight line-clamp-2">
                      {it.name}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5">
                      {formatRpExact(it.price_idr)} each
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSetQty(it.offer_id, it.qty - 1)}
                          aria-label={`Decrease quantity of ${it.name}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-black active:scale-[0.95] transition"
                          style={{ minWidth: 44, minHeight: 44, background: theme }}
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <span
                          className="text-[14px] font-black text-black tabular-nums"
                          style={{ minWidth: 22, textAlign: 'center' }}
                          aria-live="polite"
                        >
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSetQty(it.offer_id, Math.min(99, it.qty + 1))}
                          aria-label={`Increase quantity of ${it.name}`}
                          disabled={it.qty >= 99}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-black active:scale-[0.95] transition disabled:opacity-40 disabled:active:scale-100"
                          style={{ minWidth: 44, minHeight: 44, background: theme }}
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="text-[13px] font-black text-black tabular-nums">
                        {formatRpExact(it.price_idr * it.qty)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(it.offer_id)}
                    aria-label={`Remove ${it.name}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white active:scale-[0.95] transition"
                    style={{ minWidth: 44, minHeight: 44, background: '#B91C1C' }}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — total + actions + compliance line. */}
        <div className="px-5 pt-3 pb-5 border-t border-gray-200 shrink-0 space-y-3">
          {/* DELIVERY ROW — three states:
              (A) Venue offers free delivery → green pill.
              (B) Venue doesn't, customer hasn't hidden → gray estimate row.
              (C) Customer hidden → row gone, "Show delivery estimate" link
                  rendered just below the action buttons instead.
              The estimate is INFORMATIONAL ONLY — it is never added to
              Total, never appended to the WhatsApp message body. The
              customer pays the rider directly and agrees fare in chat. */}
          {showFreeDelivery && (
            <div
              className="rounded-xl border bg-green-50 border-green-200 text-green-700 px-3 py-2 flex items-center gap-2"
              role="note"
            >
              <Bike className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="text-[13px] font-extrabold leading-snug">
                Free delivery by venue
              </span>
            </div>
          )}

          {showEstimateRow && (
            <div className="rounded-xl border bg-gray-50 border-gray-200 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <Bike
                  className="w-4 h-4 shrink-0 text-gray-700 mt-0.5"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-extrabold text-black leading-snug">
                    Bike delivery — estimate
                  </div>
                  {/* Always-on display. When GPS is granted we show the
                      precise haversine km + estimate; otherwise we fall
                      back to a typical 3km city-trip assumption so the
                      customer always sees a hint. No tap required. */}
                  <div className="mt-0.5">
                    {(() => {
                      const TYPICAL_KM = 3
                      const km =
                        geo.status === 'granted' && distanceKm != null
                          ? distanceKm
                          : TYPICAL_KM
                      const idr =
                        geo.status === 'granted' && estimateIdr != null
                          ? estimateIdr
                          : Math.max(
                              DEFAULT_MIN_FEE_IDR,
                              Math.round((km * DEFAULT_BIKE_PER_KM) / 1000) * 1000,
                            )
                      const labelTail =
                        geo.status === 'granted' && distanceKm != null
                          ? `~${km.toFixed(1)} km from you`
                          : 'typical short trip'
                      return (
                        <div className="text-[13px] text-black tabular-nums leading-snug">
                          <span className="font-black">~{formatRpExact(idr)}</span>
                          <span className="text-gray-500"> · </span>
                          <span className="text-gray-700">{labelTail}</span>
                        </div>
                      )
                    })()}
                    <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                      Pay rider directly · agree fare in chat
                    </p>
                  </div>
                </div>

                {/* Hide button — small text link on the right. Persists
                    via localStorage so the customer's choice survives
                    cart re-opens. */}
                <button
                  type="button"
                  onClick={() => persistHidden(true)}
                  className="shrink-0 text-[12px] text-gray-500 underline-offset-2 hover:underline font-bold"
                  style={{ minHeight: 44, minWidth: 44 }}
                  aria-label="Hide delivery estimate"
                >
                  Hide
                </button>
              </div>
            </div>
          )}

          {!empty && (
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[13px] font-extrabold uppercase tracking-wider text-gray-500">
                Total
              </div>
              <div className="text-[20px] font-black text-black tabular-nums">
                {formatRpExact(totalIdr)}
              </div>
            </div>
          )}

          {/* "Clear cart" button removed per founder direction. The cart
              auto-clears when the customer navigates away from the
              place profile page (effect cleanup in PlaceProfileShell),
              so manual clearing is no longer needed. Per-item trash
              still works for editing on the way to checkout. */}
          <button
            type="button"
            onClick={onSend}
            disabled={sendDisabled}
            title={sendDisabled ? sendDisabledReason : undefined}
            aria-disabled={sendDisabled}
            className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-3 rounded-xl text-[13px] font-extrabold shadow-md active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
            style={{
              background: BRAND_YELLOW,
              color: BRAND_NAVY,
              minHeight: 48,
            }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
            Send via WhatsApp
          </button>

          {/* Re-enable link — only renders when the customer previously
              hid the estimate AND the venue doesn't offer free delivery.
              Brings the estimate row back without forcing the customer
              to clear localStorage manually. */}
          {!empty && !freeDelivery && estimateHidden && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => persistHidden(false)}
                className="text-[12px] text-gray-500 underline-offset-2 hover:underline font-bold"
                style={{ minHeight: 44 }}
              >
                Show delivery estimate
              </button>
            </div>
          )}

          <p className="text-[11px] text-gray-500 leading-snug text-center">
            You pay the venue directly · agree delivery with them.
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Shell — solid white page so the global PageBackground doesn't bleed
// through, plus the dev-toolbar hide rule. Mirrors beautician's Shell.
// =============================================================================
function Shell({ children }: { children: import('react').ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A]">
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
