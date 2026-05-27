'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  ChevronLeft, MapPin, MessageCircle, Star,
  Share2, Link2, X, Clock, Bike, Car, Heart, Grid3X3,
} from 'lucide-react'
import ProfileGallery from './ProfileGallery'
import RunningMarquee from './RunningMarquee'
import VisitUsMap from './VisitUsMap'
import {
  SocialInstagramIcon, SocialTikTokIcon, SocialFacebookIcon,
} from './VisitUsPanel'
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// =============================================================================
// PlaceProfileShell — Visual-rich client shell for /places/[slug]
// -----------------------------------------------------------------------------
// Adapts the beautician profile flagship layout for self-listed venues
// (restaurants, cafés, hotels, attractions, beaches, etc.). The parent server
// component handles the Supabase fetch + metadata/JSON-LD; this shell renders
// the customer-facing surface: hero gallery, business chip + rating, tag
// marquee, About card, category-aware "what's here" block, Visit Us panel
// (address + hours table + map), reviews summary, sticky WhatsApp/Maps CTA,
// compliance disclaimer. White background, brand yellow CTA, brand navy text.
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'

// Day order + display labels for the hours table. Sun is intentionally last
// so the week reads Mon → Sun like the rest of Indonesia is used to.
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const
const DAY_LABELS: Record<typeof DAY_KEYS[number], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

// Category-aware heading for the offers block. Restaurants get "Menu",
// attractions get "Tickets", hotels get "Rooms", etc. Falls back to
// "Highlights" for anything else.
function highlightsHeading(category: PlaceCategory): string {
  switch (category) {
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'club':
      return 'Menu'
    case 'attraction':
    case 'temple':
    case 'beach':
      return 'Tickets'
    case 'mall':
      return 'Featured'
    case 'hotel':
      return 'Rooms'
    case 'hospital':
    case 'doctor':
    case 'dentist':
    case 'pharmacy':
      return 'Services'
    case 'airport':
    case 'train_station':
    case 'bus_station':
      return 'Travel info'
    case 'government':
    case 'bike_repair':
      return 'What they offer'
    default:
      return 'Highlights'
  }
}

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
   * When false the sticky WhatsApp CTA is hidden and the page falls back to
   * the "Open in Maps" sticky CTA. The "Get me there" transport CTA is
   * ALWAYS rendered regardless — transport is independent of venue contact.
   * Defaults to true.
   */
  contactEnabled?: boolean
}

export default function PlaceProfileShell({ place, contactEnabled = true }: PlaceProfileShellProps) {
  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [openOffer,   setOpenOffer]   = useState<PlaceOffer | null>(null)
  // Reference to the secondary photo strip so "View all photos" can scroll
  // smoothly to it (we deliberately reuse the existing strip instead of
  // building a fullscreen lightbox — that scope-creeps the hero upgrade).
  const photoStripRef = useRef<HTMLDivElement | null>(null)

  const photos    = place.imageUrls
  const hasPhotos = photos.length > 0
  const heading   = highlightsHeading(place.category)
  // Offers carousel — sorted by sort_order asc (server-side ordering kept).
  const offers    = place.offers ?? []
  const hasOffers = offers.length > 0
  // Lucide icon looked up at render time (in the client) so we don't have
  // to ship a function reference through the server-client boundary.
  const CategoryIcon = CATEGORIES[place.category]?.Icon ?? null

  // Normalise hours_json into a stringly-typed Mon-Sun map. We tolerate any
  // shape — strings keep their literal value, anything else becomes null so
  // the row renders as "Closed/—" instead of crashing the page.
  const hours: Record<string, string | null> = (() => {
    const h = place.hoursJson || {}
    const out: Record<string, string | null> = {}
    for (const day of DAY_KEYS) {
      const v = (h as Record<string, unknown>)[day]
      out[day] = typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
    }
    return out
  })()
  const hasHours = DAY_KEYS.some((d) => hours[d])

  // Today's hours — drives the "Today" highlight in the address card.
  const todaysHours = (() => {
    const day = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
    return hours[day] ?? null
  })()

  // WhatsApp CTA target. Strip non-digits so wa.me accepts whatever the
  // venue typed in (with or without leading +). Suppressed entirely when
  // the owner disables `contact_enabled` — falls back to "Open in Maps".
  const waNumber = (place.whatsappE164 ?? '').replace(/\D+/g, '')
  const waText   = `Halo, saya tertarik dengan ${place.name} dari IndoCity`
  const waLink   = (contactEnabled && waNumber)
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`
    : null

  const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`

  // "Get me there" — pre-fills /cari with the place as destination so the
  // customer's only remaining step is granting GPS for pickup. We pass dName
  // url-encoded so spaces / commas survive intact.
  function getMeThereHref(vehicleType: 'bike' | 'car'): string {
    const sp = new URLSearchParams({
      dLat:        String(place.lat),
      dLng:        String(place.lng),
      dName:       place.name,
      vehicleType,
    })
    return `/cari?${sp.toString()}`
  }

  const ratingVal   = place.rating ?? 0
  const reviewCount = place.reviewCount ?? 0
  const hasReviews  = ratingVal > 0 && reviewCount > 0

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/places/${place.slug}`

  return (
    <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A] pb-28">
      {/* PREMIUM HERO — full-bleed cover image with overlaid floating
          controls (back, share, favourite) and the venue's name/rating
          rendered on top of a bottom-up dark gradient. This is the
          customer's first ~half-screen — Airbnb / Google Maps pattern.
          Breaks out of the page's max-w-2xl container so the image runs
          edge-to-edge on every viewport. */}
      <section
        className="relative w-full overflow-hidden bg-gray-900 pt-safe"
        style={{
          // 60vh mobile, 55vh ≥ sm, capped at 540px. Inline style keeps
          // the responsive max-height without a custom Tailwind config.
          height: 'min(60vh, 540px)',
        }}
      >
        {/* Cover image fills the hero. Falls back to a yellow gradient
            with a category icon when the venue has no photos. */}
        {hasPhotos ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0]}
            alt={place.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
            }}
            aria-hidden
          >
            {CategoryIcon ? (
              <CategoryIcon className="w-24 h-24 text-white/80" strokeWidth={1.5} />
            ) : (
              <MapPin className="w-20 h-20 text-white/85" strokeWidth={1.5} />
            )}
          </div>
        )}

        {/* Bottom-up dark gradient — readability layer for the white text
            and chips overlaid below. Top stays clear so the floating
            buttons sit on the original image. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.45) 30%, transparent 65%)',
          }}
          aria-hidden
        />

        {/* Floating top-left — back to /places. White glass button with
            44px tap target. Preserves the original navigation behaviour. */}
        <div className="absolute top-0 left-0 right-0 pt-safe">
          <div className="max-w-3xl mx-auto px-4 pt-3 flex items-center justify-between">
            <Link
              href="/places"
              aria-label="Back to Places"
              className="inline-flex items-center justify-center rounded-full active:scale-[0.96] transition"
              style={{
                width: 44,
                height: 44,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
            </Link>

            {/* Floating top-right — heart (visual placeholder, no logic)
                + share. Same glass treatment. */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Save to favourites"
                className="inline-flex items-center justify-center rounded-full active:scale-[0.96] transition"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
              >
                <Heart className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                aria-label="Share place"
                className="inline-flex items-center justify-center rounded-full active:scale-[0.96] transition"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
              >
                <Share2 className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Overlaid hero content — bottom-left. Category chip + name +
            rating row, all white on the dark gradient. */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-3xl mx-auto px-4 pb-5 sm:pb-6">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-extrabold backdrop-blur-sm"
                style={{ background: 'rgba(250,204,21,0.92)', color: '#1F2937' }}
              >
                {CategoryIcon && (
                  <CategoryIcon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                )}
                {place.categoryLabel}
              </span>
            </div>
            <h1
              className="text-white font-black tracking-tight leading-[1.05] text-[36px] sm:text-[44px]"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.45)', letterSpacing: '-0.015em' }}
            >
              {place.name}
            </h1>
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[14px] text-white/95"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}
            >
              {hasReviews && (
                <span className="inline-flex items-center gap-1 font-extrabold">
                  <Star
                    className="w-4 h-4"
                    strokeWidth={0}
                    fill={BRAND_YELLOW}
                    style={{ color: BRAND_YELLOW }}
                  />
                  {ratingVal.toFixed(1)}
                  <span className="text-white/85 font-medium">
                    · {reviewCount} review{reviewCount === 1 ? '' : 's'}
                  </span>
                </span>
              )}
              {hasReviews && place.city && <span className="text-white/60">·</span>}
              {place.city && (
                <span className="inline-flex items-center gap-1 capitalize">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {place.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Floating bottom-right — "View all photos" pill. Scrolls to the
            secondary photo strip below the hero. Hidden when there's only
            a single image (nothing more to show). */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => {
              photoStripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="absolute right-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-extrabold active:scale-[0.97] transition"
            style={{
              bottom: 16,
              background: 'rgba(255,255,255,0.95)',
              color: '#0A0A0A',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
            aria-label="View all photos"
          >
            <Grid3X3 className="w-3.5 h-3.5" strokeWidth={2.5} />
            View all photos
          </button>
        )}
      </section>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        {/* SECONDARY PHOTO STRIP — remaining gallery shots below the hero
            so customers who want more visuals can swipe through them. Only
            renders when the venue has 2+ photos. The hero already owns
            photos[0]; we hand the rest to ProfileGallery in carousel mode. */}
        {photos.length > 1 && (
          <section ref={photoStripRef} className="space-y-2 scroll-mt-4">
            <ProfileGallery
              photos={photos.slice(1)}
              title=""
              variant="carousel"
              titleClassName="hidden"
            />
          </section>
        )}

        {/* Tap-to-Maps address row — preserves the original behaviour from
            the title block (the hero shows city only; full street address
            still needs a Maps deep-link). Skipped when no address. */}
        {place.address && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 text-[13px] text-gray-600 leading-snug active:opacity-70 transition"
          >
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: BRAND_YELLOW }} strokeWidth={2.5} />
            <span className="underline-offset-2 hover:underline">
              {place.address}
            </span>
          </a>
        )}

        {/* TAG MARQUEE — running ribbon of tags below the headline. Only
            renders when tags are present so empty venues don't get a stray
            empty bar. Yellow tint to match the brand surface. */}
        {place.tags.length > 0 && (
          <RunningMarquee
            text={place.tags.map((t) => `#${t}`).join('  ·  ')}
            background="#FEF9C3"
            color="#854D0E"
            durationSec={32}
          />
        )}

        {/* ABOUT card — clean rounded block with the description. Skipped
            when no description so the page doesn't feel padded with empty
            cards. */}
        {place.description?.trim() && (
          <section className="space-y-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              About
            </h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                {place.description}
              </p>
            </div>
          </section>
        )}

        {/* GET ME THERE — transport pre-fill CTA. Always renders (transport
            is independent of venue contact). Tapping a vehicle hands the
            customer off to /cari with the destination pinned; pickup is
            filled from their GPS once they grant permission there. */}
        <section className="space-y-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
            Get me there
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={getMeThereHref('bike')}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-4 transition active:scale-[0.98]"
                style={{
                  background: BRAND_YELLOW,
                  color: BRAND_NAVY,
                  minHeight: 88,
                  boxShadow: '0 6px 16px rgba(250,204,21,0.30)',
                }}
                aria-label={`Book bike ride to ${place.name}`}
              >
                <Bike className="w-7 h-7" strokeWidth={2.5} />
                <span className="text-[14px] font-extrabold">Bike</span>
              </Link>
              <Link
                href={getMeThereHref('car')}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-4 transition active:scale-[0.98]"
                style={{
                  background: BRAND_NAVY,
                  color: '#FFFFFF',
                  minHeight: 88,
                  boxShadow: '0 6px 16px rgba(15,23,42,0.25)',
                }}
                aria-label={`Book car ride to ${place.name}`}
              >
                <Car className="w-7 h-7" strokeWidth={2.5} />
                <span className="text-[14px] font-extrabold">Car</span>
              </Link>
            </div>
            <p className="text-[12px] text-gray-500 leading-snug mt-3 text-center">
              Open IndoCity booking with your trip pre-filled.
            </p>
          </div>
        </section>

        {/* OFFERS CAROUSEL — horizontal scrollable cards of menu items, ticket
            types, or visual highlights. Heading swaps per category (Menu /
            Tickets / Rooms / etc.). Section is hidden entirely when the
            venue has no offers — About + gallery carry the page instead. */}
        {hasOffers && (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                {heading}
              </h2>
              <span className="text-[11px] text-gray-500">
                {offers.length} item{offers.length === 1 ? '' : 's'}
              </span>
            </div>
            <div
              className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => setOpenOffer(offer)}
                  className="snap-start shrink-0 relative w-[170px] h-[240px] sm:w-[180px] sm:h-[260px] rounded-2xl overflow-hidden bg-gray-100 text-left active:scale-[0.98] transition will-change-transform"
                  style={{
                    boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
                  }}
                  aria-label={`Open details for ${offer.name}`}
                >
                  {/* Image — fills the whole card. The bottom gradient
                      + caption sit on top via absolute positioning so we
                      get the GoFood / Airbnb-shop portrait look. */}
                  {offer.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={offer.image_url}
                      alt={offer.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
                      }}
                      aria-hidden
                    >
                      {CategoryIcon ? (
                        <CategoryIcon className="w-12 h-12 text-white/85" strokeWidth={1.5} />
                      ) : (
                        <span className="text-white/90 text-[11px] font-extrabold uppercase tracking-wider">
                          {place.categoryLabel}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom dark gradient — only the lower portion so the
                      product photo stays the hero. */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.55) 55%, transparent 100%)',
                    }}
                    aria-hidden
                  />

                  {/* Name + price — anchored to the bottom of the card.
                      Description deliberately omitted — it lives in the
                      OfferDetailModal popup. */}
                  <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5">
                    <div className="text-[13px] font-black text-white leading-snug line-clamp-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                      {offer.name}
                    </div>
                    {offer.price_idr != null && (
                      <div
                        className="text-[14px] font-extrabold"
                        style={{ color: BRAND_YELLOW, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                      >
                        Rp {offer.price_idr.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Offers self-published by venue · agree price directly when you visit.
            </p>
          </section>
        )}

        {/* VISIT US — address card + hours table + map. We render an inline
            version (not the modal-toggle pattern beauticians use) because
            place profiles surface address first; visitors expect the map
            and hours immediately rather than behind a toggle. */}
        <section className="space-y-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
            Visit us
          </h2>

          {/* Address + today's hours strip */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: BRAND_YELLOW }} strokeWidth={2.5} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold text-black">{place.name}</div>
                {place.address && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-gray-700 leading-snug underline-offset-2 hover:underline active:opacity-70 transition block"
                  >
                    {place.address}
                  </a>
                )}
                <div className="text-[11px] text-gray-500 capitalize">{place.city}</div>
              </div>
            </div>

            {todaysHours && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND_YELLOW }} strokeWidth={2.5} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Today</span>
                <span className="text-[13px] font-extrabold text-black">{todaysHours}</span>
              </div>
            )}
          </div>

          {/* Full week hours table — only renders when at least one day has
              data. Keeps the page tight when hours haven't been claimed. */}
          {hasHours && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div className="grid grid-cols-[40px_1fr] gap-y-1.5 gap-x-3 text-[13px]">
                {DAY_KEYS.map((day) => {
                  const today = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()] === day
                  return (
                    <div key={day} className="contents">
                      <div
                        className="font-extrabold uppercase tracking-wider"
                        style={{ color: today ? BRAND_NAVY : '#6B7280' }}
                      >
                        {DAY_LABELS[day]}
                      </div>
                      <div
                        className="text-right"
                        style={{ color: today ? BRAND_NAVY : '#374151', fontWeight: today ? 800 : 500 }}
                      >
                        {hours[day] ?? 'Closed'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Map preview — reuses the stylised VisitUsMap so we get the
              same on-brand neighbourhood SVG without a tile pipeline. */}
          <VisitUsMap lat={place.lat} lng={place.lng} theme={BRAND_YELLOW} />

          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[12px] font-bold underline-offset-2 hover:underline"
            style={{ color: BRAND_NAVY }}
          >
            Open in Google Maps →
          </a>
        </section>

        {/* REVIEWS — only renders when the place row actually has rating
            data. We intentionally skip the section entirely (no empty card)
            when reviews are absent. No mock data; honest posture. */}
        {hasReviews && (
          <section className="space-y-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              Reviews
            </h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${BRAND_YELLOW}25`, border: `1.5px solid ${BRAND_YELLOW}50` }}
              >
                <Star
                  className="w-7 h-7"
                  strokeWidth={0}
                  fill={BRAND_YELLOW}
                  style={{ color: BRAND_YELLOW }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[22px] font-black leading-none" style={{ color: BRAND_NAVY }}>
                  {ratingVal.toFixed(1)}
                  <span className="text-[14px] font-bold text-gray-500"> / 5</span>
                </div>
                <div className="text-[12px] text-gray-500 mt-1">
                  Based on {reviewCount} review{reviewCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* COMPLIANCE — "self-listed by venue" footer. Honest about what
            IndoCity is (a directory), no claims we can't back up. */}
        <section className="pt-2 pb-2 text-center space-y-1">
          <p className="text-[11px] text-gray-500 leading-snug max-w-md mx-auto">
            Self-listed by venue. IndoCity is a software directory — we do not
            verify menus, prices, or stock. Please confirm details directly with
            {' '}{place.name}.
          </p>
          <Link href="/legal" className="text-[11px] text-gray-400 underline-offset-2 hover:underline">
            Legal info
          </Link>
        </section>
      </div>

      {/* STICKY BOTTOM CTA — WhatsApp when available, otherwise Maps. Same
          yellow surface used on the rental shell so the brand language is
          consistent across verticals. */}
      <div
        className="fixed left-0 right-0 z-30 px-4 py-3"
        style={{
          bottom: 0,
          background: 'rgba(255,255,255,0.95)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
              style={{
                background: BRAND_YELLOW,
                color: BRAND_NAVY,
                minHeight: 48,
                boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
              }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Visit / Order on WhatsApp
            </a>
          ) : (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
              style={{
                background: BRAND_YELLOW,
                color: BRAND_NAVY,
                minHeight: 48,
                boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
              }}
            >
              <MapPin className="w-4 h-4" strokeWidth={2.5} />
              Open in Google Maps
            </a>
          )}
          <p className="text-[11px] text-gray-500 text-center mt-1.5 leading-snug">
            {waLink
              ? `Chat directly with ${place.name} — IndoCity does not process orders.`
              : 'Plan your route — venue details confirmed at the door.'}
          </p>
        </div>
      </div>

      {/* OFFER DETAIL MODAL — full image, name, description, price. Tap
          backdrop to dismiss. Renders nothing unless an offer is selected. */}
      {openOffer && (
        <OfferDetailModal
          offer={openOffer}
          categoryLabel={place.categoryLabel}
          onClose={() => setOpenOffer(null)}
        />
      )}

      {/* SHARE SHEET — copy link + WhatsApp + Facebook + Instagram/TikTok
          link-copy. Same pattern as the beautician page so users get a
          consistent share affordance across the app. */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl relative"
            style={{ borderTop: `4px solid ${BRAND_YELLOW}` }}
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

    </main>
  )
}

// =============================================================================
// OfferDetailModal — full image, name, description, price popup. Tap the
// backdrop or the close button to dismiss. Inlined here (rather than its own
// file) because it's tightly coupled to the offers carousel above and doesn't
// have any reuse target yet.
// =============================================================================
function OfferDetailModal({
  offer,
  categoryLabel,
  onClose,
}: {
  offer:         PlaceOffer
  categoryLabel: string
  onClose:       () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={offer.name}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {offer.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.image_url}
            alt={offer.name}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div
            className="w-full aspect-square flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
            }}
            aria-hidden
          >
            <span className="text-white/90 text-[14px] font-extrabold uppercase tracking-wider">
              {categoryLabel}
            </span>
          </div>
        )}

        <div className="p-5 space-y-3">
          <h2 className="text-[20px] font-black leading-snug" style={{ color: BRAND_NAVY }}>
            {offer.name}
          </h2>
          {offer.price_idr != null && (
            <div
              className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-extrabold"
              style={{ background: '#FEF3C7', color: '#92400E' }}
            >
              Rp {offer.price_idr.toLocaleString('id-ID')}
            </div>
          )}
          {offer.description?.trim() && (
            <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
              {offer.description}
            </p>
          )}
          <p className="text-[11px] text-gray-500 leading-snug pt-2 border-t border-gray-100">
            Offer self-published by venue · agree price directly when you visit.
          </p>
        </div>
      </div>
    </div>
  )
}
