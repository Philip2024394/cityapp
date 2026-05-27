'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  ChevronLeft, MapPin, MessageCircle, Star,
  Share2, Link2, X, Clock,
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

// Category-aware heading for the "what's here" block. Restaurants get
// "Menu highlights", attractions get "What to expect", hotels get
// "What's included", etc. Falls back to "Highlights" for anything else.
function highlightsHeading(category: PlaceCategory): string {
  switch (category) {
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'club':
      return 'Menu highlights'
    case 'attraction':
    case 'temple':
    case 'beach':
      return 'What to expect'
    case 'mall':
      return "What you'll find"
    case 'hotel':
      return "What's included"
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
  }
}

export default function PlaceProfileShell({ place }: PlaceProfileShellProps) {
  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const photos    = place.imageUrls
  const hasPhotos = photos.length > 0
  const heading   = highlightsHeading(place.category)
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
  // venue typed in (with or without leading +).
  const waNumber = (place.whatsappE164 ?? '').replace(/\D+/g, '')
  const waText   = `Halo, saya tertarik dengan ${place.name} dari IndoCity`
  const waLink   = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}` : null

  const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`

  const ratingVal   = place.rating ?? 0
  const reviewCount = place.reviewCount ?? 0
  const hasReviews  = ratingVal > 0 && reviewCount > 0

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/places/${place.slug}`

  return (
    <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A] pb-28">
      {/* HEADER — IndoCity wordmark + back-arrow to /places. Mirrors the
          /places listing wordmark so the customer doesn't lose context. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/places"
              aria-label="Back to Places"
              className="inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-[0.96] transition"
              style={{ width: 36, height: 36 }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center hover:opacity-85 transition"
              aria-label="IndoCity home"
            >
              <span
                className="font-black tracking-tight text-[22px] sm:text-[26px] leading-none"
                style={{ color: BRAND_NAVY, letterSpacing: '-0.02em' }}
              >
                Ind
              </span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] mx-[1px] translate-y-[3px]"
              >
                <path
                  d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                  fill={BRAND_YELLOW}
                />
                <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
              </svg>
              <span
                className="font-black tracking-tight text-[22px] sm:text-[26px] leading-none"
                style={{ color: BRAND_NAVY, letterSpacing: '-0.02em' }}
              >
                City
              </span>
            </Link>
          </div>

          {/* Share — opens a small bottom sheet with copy/WhatsApp/Facebook. */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share place"
            className="inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-[0.96] transition"
            style={{ width: 36, height: 36 }}
          >
            <Share2 className="w-4 h-4 text-gray-800" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-5">
        {/* HERO — image carousel via ProfileGallery. Cover (first image)
            takes the headline 16:10 slot; remaining photos drop into the
            horizontal scroll strip below. Placeholder when no images. */}
        {hasPhotos ? (
          <section className="space-y-3">
            <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={photos[0]}
                alt={place.name}
                className="w-full aspect-[16/10] object-cover"
              />
            </div>
            {photos.length > 1 && (
              <ProfileGallery
                photos={photos.slice(1)}
                title=""
                variant="carousel"
                titleClassName="hidden"
              />
            )}
          </section>
        ) : (
          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '16 / 10',
              background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
            }}
          >
            <MapPin className="w-16 h-16 text-white/85" strokeWidth={1.5} />
          </div>
        )}

        {/* TITLE BLOCK — category chip, business name, rating + address.
            Sits directly under the hero, no card wrapper so it reads as the
            page's H1 surface. */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-extrabold"
              style={{ background: '#FEF3C7', color: '#92400E' }}
            >
              {CategoryIcon && (
                <CategoryIcon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
              )}
              {place.categoryLabel}
            </span>
            {hasReviews && (
              <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-black">
                <Star
                  className="w-3.5 h-3.5"
                  strokeWidth={0}
                  fill={BRAND_YELLOW}
                  style={{ color: BRAND_YELLOW }}
                />
                {ratingVal.toFixed(1)}
                <span className="text-[12px] font-medium text-gray-500">
                  · {reviewCount} review{reviewCount === 1 ? '' : 's'}
                </span>
              </span>
            )}
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-black leading-tight" style={{ color: BRAND_NAVY }}>
            {place.name}
          </h1>
          {(place.address || place.city) && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1.5 text-[13px] text-gray-600 leading-snug active:opacity-70 transition"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: BRAND_YELLOW }} strokeWidth={2.5} />
              <span className="underline-offset-2 hover:underline">
                {place.address ?? place.city}
              </span>
            </a>
          )}
        </section>

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

        {/* CATEGORY-AWARE HIGHLIGHTS — uses tags as bullets when available,
            otherwise falls back to a friendly placeholder. Heading swaps per
            category (Menu highlights / What to expect / etc.). */}
        <section className="space-y-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
            {heading}
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            {place.tags.length > 0 ? (
              <ul className="space-y-1.5">
                {place.tags.map((tag) => (
                  <li key={tag} className="flex items-start gap-2 text-[13px] text-gray-700 leading-snug">
                    <span
                      aria-hidden
                      className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: BRAND_YELLOW }}
                    />
                    <span className="capitalize">{tag.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-gray-500 italic leading-snug">
                {place.description?.trim()
                  ? 'Tap the WhatsApp button below to ask the venue directly.'
                  : 'No details listed yet — tap Contact to ask the venue directly.'}
              </p>
            )}
          </div>
        </section>

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
