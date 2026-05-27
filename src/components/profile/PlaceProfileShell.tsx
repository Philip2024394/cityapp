'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  ChevronLeft, MapPin, Star, Share2, Link2, X, Bike, Car, Heart,
  MessageCircle,
} from 'lucide-react'
import {
  SocialInstagramIcon, SocialTikTokIcon, SocialFacebookIcon,
} from './VisitUsPanel'
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// =============================================================================
// PlaceProfileShell — Single-viewport (NO SCROLL) client shell for
// /places/[slug]. Airbnb-style floating chrome over a dominant hero photo,
// vertical thumbnail column on the left, Bike/Car sticky footer at the bottom.
// Replaces the previous long-scroll layout. 100dvh, overflow-hidden — explicit
// no-scroll promise so iOS Safari URL bar can't break the composition.
// -----------------------------------------------------------------------------
// Dropped from the old shell (founder-approved, single-viewport priority):
//   - Tag marquee (RunningMarquee)
//   - About card (description now line-clamped under the name)
//   - Get-me-there panel (replaced by sticky Bike/Car footer)
//   - Offers carousel (folded into 4 left thumbnails)
//   - Visit Us block — hours + address card removed
//   - Reviews card — rating + count still appears inline under the name
//   - WhatsApp sticky CTA (contact_enabled flag stays on the row but no
//     UI honours it on this redesign)
//   - View all photos pill / secondary photo strip
//   - IndoCity wordmark header
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'

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
   * Owner-controlled flag carried over from the previous shell. The new
   * single-viewport layout intentionally does NOT render a WhatsApp CTA, so
   * this prop is accepted (for API compatibility with the dashboard toggle)
   * but currently unused on the public page. A future redesign that brings a
   * contact CTA back should reinstate the honour-this-flag wiring.
   */
  contactEnabled?: boolean
}

// Thumbnail tile descriptor — uniform shape whether the source is an offer
// row or a fallback gallery photo. Lets the click handler render the same
// modal without branching.
type ThumbTile = {
  key:         string
  imageUrl:    string | null
  title:       string
  description: string | null
  priceIdr:    number | null
}

export default function PlaceProfileShell({ place, contactEnabled: _contactEnabled = true }: PlaceProfileShellProps) {
  // `contactEnabled` deliberately ignored on this design — see prop docstring.
  void _contactEnabled
  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [openTile,    setOpenTile]    = useState<ThumbTile | null>(null)

  const photos    = place.imageUrls
  const hasPhotos = photos.length > 0
  const offers    = place.offers ?? []
  const hasOffers = offers.length > 0
  const CategoryIcon = CATEGORIES[place.category]?.Icon ?? null

  // THUMBNAIL SOURCE — offers take priority (4 of them), otherwise fall back
  // to photos[1..5] paired with the place description for body copy. We cap
  // at four either way so the left rail stays a fixed 4-row stack.
  const thumbs: ThumbTile[] = hasOffers
    ? offers.slice(0, 4).map((o) => ({
        key:         o.id,
        imageUrl:    o.image_url,
        title:       o.name,
        description: o.description,
        priceIdr:    o.price_idr,
      }))
    : photos.slice(1, 5).map((url, idx) => ({
        key:         `photo-${idx}`,
        imageUrl:    url,
        title:       'Photo',
        description: place.description,
        priceIdr:    null,
      }))

  // Maps deep-link — bottom-right hero badge. Uses `search/` (not `dir/`) so
  // a tap lands on the place pin directly rather than a routing screen.
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`

  // "Take me there" — pre-fills /cari with this place as destination. Same
  // shape as the previous shell so existing /cari handlers don't break.
  function takeMeThereHref(vehicleType: 'bike' | 'car'): string {
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
    <main
      className="relative w-full bg-white text-[#0A0A0A] overflow-hidden flex flex-col"
      style={{ height: '100dvh' }}
    >
      {/* HERO + THUMB RAIL — ~60dvh. The thumbs sit OUTSIDE the photo on its
          left edge (per founder direction — NOT overlaid). */}
      <section
        className="relative w-full flex"
        style={{ height: '60dvh', flex: '0 0 auto' }}
      >
        {/* Left thumbnail column — vertical stack of up to 4 tiles. Renders
            a thin spacer when there's nothing to show so the hero still
            aligns to a consistent inset and doesn't snap left. */}
        <div
          className="shrink-0 h-full flex flex-col gap-1.5 p-1.5 bg-white"
          style={{ width: 76 }}
        >
          {thumbs.length > 0 ? (
            thumbs.map((tile) => (
              <button
                key={tile.key}
                type="button"
                onClick={() => setOpenTile(tile)}
                className="relative flex-1 w-full rounded-xl overflow-hidden bg-gray-100 active:scale-[0.97] transition"
                style={{
                  minHeight: 44,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                }}
                aria-label={`Open details for ${tile.title}`}
              >
                {tile.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.imageUrl}
                    alt={tile.title}
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
                      <CategoryIcon className="w-5 h-5 text-white/85" strokeWidth={2} />
                    ) : (
                      <MapPin className="w-5 h-5 text-white/85" strokeWidth={2} />
                    )}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="flex-1" aria-hidden />
          )}
        </div>

        {/* Hero photo — fills the remaining width. Tile inherits the same
            ~60dvh height as the row. */}
        <div className="relative flex-1 h-full overflow-hidden bg-gray-900">
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

          {/* Top fade — readability layer for the floating chrome. Kept
              short so most of the photo stays untinted. */}
          <div
            className="absolute inset-x-0 top-0 h-24 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)',
            }}
            aria-hidden
          />

          {/* MAPS BADGE — floats INSIDE the hero, bottom-right. Dark pill,
              ~13px label, taps out to Google Maps in a new tab. */}
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${place.name} on Google Maps`}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-extrabold active:scale-[0.97] transition"
            style={{
              minHeight: 44,
              background: 'rgba(10,10,10,0.78)',
              color: '#FFFFFF',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.30)',
            }}
          >
            <MapPin className="w-4 h-4" strokeWidth={2.5} style={{ color: BRAND_YELLOW }} />
            Maps
          </a>
        </div>

        {/* FLOATING TOP CHROME — back / heart / share. Absolute over the
            hero so the photo runs edge-to-edge underneath. */}
        <div className="absolute top-0 left-0 right-0 pt-safe">
          <div className="px-3 pt-3 flex items-center justify-between">
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
      </section>

      {/* INFO BLOCK — compact, fixed height. Name + inline meta row +
          2-line description clamp. No scroll, no overflow. */}
      <section
        className="px-4 pt-3 pb-2 flex flex-col gap-1.5"
        style={{ flex: '1 1 auto', minHeight: 0 }}
      >
        <h1
          className="font-black tracking-tight leading-[1.1] text-[22px] sm:text-[26px]"
          style={{ color: BRAND_NAVY, letterSpacing: '-0.01em' }}
        >
          {place.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[13px] text-gray-600">
          <span className="font-extrabold text-gray-700">{place.categoryLabel}</span>
          {hasReviews && (
            <>
              <span className="text-gray-400">·</span>
              <span className="inline-flex items-center gap-0.5 font-extrabold text-gray-800">
                <Star
                  className="w-3.5 h-3.5"
                  strokeWidth={0}
                  fill={BRAND_YELLOW}
                  style={{ color: BRAND_YELLOW }}
                />
                {ratingVal.toFixed(1)}
                <span className="font-medium text-gray-500">
                  {' '}({reviewCount})
                </span>
              </span>
            </>
          )}
          {place.city && (
            <>
              <span className="text-gray-400">·</span>
              <span className="capitalize">{place.city}</span>
            </>
          )}
        </div>
        {place.description?.trim() && (
          <p className="text-[13px] text-gray-600 leading-snug line-clamp-2">
            {place.description}
          </p>
        )}
      </section>

      {/* STICKY FOOTER — Bike / Car CTAs side by side. ~15dvh. */}
      <section
        className="px-3 pt-2 pb-3 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white"
        style={{ flex: '0 0 auto' }}
      >
        <Link
          href={takeMeThereHref('bike')}
          aria-label={`Book bike ride to ${place.name}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] active:scale-[0.98] transition"
          style={{
            background: BRAND_YELLOW,
            color: BRAND_NAVY,
            minHeight: 52,
            boxShadow: '0 6px 16px rgba(250,204,21,0.30)',
          }}
        >
          <Bike className="w-5 h-5" strokeWidth={2.5} />
          Bike — Take me there
        </Link>
        <Link
          href={takeMeThereHref('car')}
          aria-label={`Book car ride to ${place.name}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] active:scale-[0.98] transition"
          style={{
            background: BRAND_NAVY,
            color: '#FFFFFF',
            minHeight: 52,
            boxShadow: '0 6px 16px rgba(15,23,42,0.25)',
          }}
        >
          <Car className="w-5 h-5" strokeWidth={2.5} />
          Car — Take me there
        </Link>
      </section>

      {/* THUMB DETAIL MODAL — full image + title + price + description. Tap
          the backdrop or the X to dismiss. */}
      {openTile && (
        <ThumbDetailModal
          tile={openTile}
          categoryLabel={place.categoryLabel}
          onClose={() => setOpenTile(null)}
        />
      )}

      {/* SHARE SHEET — reused from the previous shell. Modal overlay, doesn't
          break the no-scroll promise of the underlying page. */}
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
// ThumbDetailModal — full image, title, description, price popup. Adapted
// from the previous OfferDetailModal so the thumb rail can show photo-only
// tiles as well as offer rows. Tap the backdrop or close button to dismiss.
// =============================================================================
function ThumbDetailModal({
  tile,
  categoryLabel,
  onClose,
}: {
  tile:          ThumbTile
  categoryLabel: string
  onClose:       () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tile.title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
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

        {tile.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tile.imageUrl}
            alt={tile.title}
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
            {tile.title}
          </h2>
          {tile.priceIdr != null && (
            <div
              className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-extrabold"
              style={{ background: '#FEF3C7', color: '#92400E' }}
            >
              Rp {tile.priceIdr.toLocaleString('id-ID')}
            </div>
          )}
          {tile.description?.trim() && (
            <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
              {tile.description}
            </p>
          )}
          <p className="text-[11px] text-gray-500 leading-snug pt-2 border-t border-gray-100">
            Self-published by venue · confirm directly when you visit.
          </p>
        </div>
      </div>
    </div>
  )
}
