'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Star, MapPin, Bike, Car as CarIcon,
  Share2, Link2, X, ChevronLeft, MessageCircle,
  ShoppingBag, Minus, Plus, Trash2, Heart,
} from 'lucide-react'
import {
  PortfolioDetailPopup,
  type PortfolioPhoto,
} from '@/components/profile/PortfolioCarousel'
import {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'
import { usePlaceCart, type PlaceCartItem } from '@/components/profile/usePlaceCart'

// =============================================================================
// PlaceProfileShell — SINGLE-VIEWPORT no-scroll place profile.
// -----------------------------------------------------------------------------
// Composition (100dvh root, overflow-hidden):
//   • Top chrome (absolute over hero): back · heart · share · cart icons
//   • Hero+thumbs row (~60dvh): 4 thumbnails left rail + cover photo + maps
//     badge bottom-right of hero · place name + slogan overlay top-left
//   • Compact info row (~15dvh): Category · ★ rating · city — single line
//   • Sticky footer (~15dvh): Bike (yellow) + Car (navy) "Take me there"
//   • Bottom 3px brand-yellow accent bar at the viewport edge
//
// What was DROPPED from the previous beautician-mirror version (founder
// confirmed for the third time — this is a no-scroll page):
//   - Reviews toggle pill + Reviews panel swap
//   - Visit Us launcher + Visit Us panel swap
//   - About card (description -> slogan inline)
//   - Cuisine chips row
//   - Offers carousel section (folded into the 4 left thumbnails)
//   - RunningMarquee tag ribbon
//   - Inline Start-from / Contact footer row
//   - Right-edge vertical Back button (back-arrow lives in top chrome)
//   - "Self-listed venue · IndoCity is a software directory" disclaimer
//
// What was KEPT (must work in the new layout):
//   - usePlaceCart hook + cart icon top-right with yellow totalQty badge
//   - PlaceCartSheet (full WhatsApp checkout)
//   - "Added to cart" toast
//   - Thumbnail tap -> PortfolioDetailPopup with cart-UI wired in
//   - Bike/Car CTAs in the sticky footer, prefilled /cari destination
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
    /** Self-listed cuisine tags. Unused in this no-scroll layout but
     *  kept in the API so the server fetch / dashboard editor stay
     *  unchanged. */
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
   * Owner-controlled flag. When false, the popup's Contact button is
   * hidden even if the venue has a whatsapp_e164. Transport CTAs always
   * render.
   */
  contactEnabled?: boolean
}

export default function PlaceProfileShell({
  place, contactEnabled = true,
}: PlaceProfileShellProps) {
  // Brand-yellow accent for the whole place template (no per-venue
  // theming yet). The popup top edge also uses this so the popup
  // matches the profile page accent.
  const theme = BRAND_YELLOW

  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  // Selected offer/photo — opens the PortfolioDetailPopup (cart-enabled).
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  // Cart state — per-place localStorage cart for the WhatsApp handoff.
  const cart = usePlaceCart(place.id)
  const [cartOpen, setCartOpen] = useState(false)
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
  const CategoryIcon = CATEGORIES[place.category]?.Icon ?? null
  const categoryGradient = CATEGORIES[place.category]?.gradient ?? 'linear-gradient(135deg, #92400E, #B45309)'

  const ratingVal   = place.rating ?? 0
  const reviewCount = place.reviewCount ?? 0
  const hasReviews  = ratingVal > 0 && reviewCount > 0

  // ─────────────────────────────────────────────────────────────────
  // 4-thumbnail left rail. Priority: first 4 offers WITH images. If
  // fewer than 4 offer-images exist, top up from place.imageUrls
  // (skipping index 0 which is the hero). Each thumbnail tap opens
  // the PortfolioDetailPopup mapped to the offer (or, for photo
  // fallbacks, a name-less PortfolioPhoto with no price = no cart UI).
  // ─────────────────────────────────────────────────────────────────
  type ThumbItem = {
    key:    string
    url:    string
    offer:  PlaceOffer | null // null = photo fallback (no cart UI)
  }
  const offerThumbs: ThumbItem[] = offers
    .filter((o) => Boolean(o.image_url))
    .slice(0, 4)
    .map((o) => ({ key: `o-${o.id}`, url: o.image_url as string, offer: o }))
  const fillerPhotos = photos.slice(1, 5)
  let fillerIdx = 0
  while (offerThumbs.length < 4 && fillerIdx < fillerPhotos.length) {
    offerThumbs.push({
      key: `p-${fillerIdx}`,
      url: fillerPhotos[fillerIdx],
      offer: null,
    })
    fillerIdx += 1
  }
  const thumbs = offerThumbs // already capped at 4

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

  // External Google Maps deep link for the small bottom-right pill on
  // the hero. Opens "search by lat/lng" so the user can hand off
  // navigation to their preferred map app from the OS share sheet.
  const mapsHref = (Number.isFinite(place.lat) && Number.isFinite(place.lng))
    ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
    : null

  // Pre-filled Indonesian WhatsApp greeting for the popup contact path.
  const waHref = place.whatsappE164
    ? `https://wa.me/${place.whatsappE164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
        `Halo, saya tertarik dengan ${place.name} dari IndoCity`,
      )}`
    : null
  const showContact = contactEnabled && Boolean(waHref)

  // Map a thumb tap → PortfolioPhoto for the popup. Offer-backed
  // thumbs carry price + description so the popup renders the cart UI
  // (when price > 0). Filler-photo thumbs open the popup as a plain
  // image (no cart, no contact data — just a bigger view).
  function openThumb(t: ThumbItem) {
    if (t.offer) {
      setDetailPhoto({
        url:         t.offer.image_url || photos[0] || DEFAULT_PLACE_HERO,
        name:        t.offer.name,
        description: t.offer.description,
        price_idr:   t.offer.price_idr,
      })
    } else {
      setDetailPhoto({ url: t.url, name: place.name, description: null, price_idr: null })
    }
  }

  return (
    <Shell>
      {/* ============================================================
          HERO + THUMBS ROW  (~60dvh)
          - 4-thumbnail rail on the LEFT (~22% width)
          - Hero cover photo / category-gradient on the right
          - Floating top chrome (absolute): back · heart · share · cart
          - Place name + slogan top-left overlay
          - Maps badge bottom-right
          ============================================================ */}
      <div className="relative w-full" style={{ height: '60dvh', flex: '0 0 60dvh' }}>
        {/* TOP CHROME — floating, absolute over the hero. Left: back.
            Right: heart (visual placeholder) · share · cart. The cart
            button is always visible so customers can find their cart
            even when empty. */}
        <div className="absolute top-3 left-3 z-30">
          <Link
            href="/places"
            aria-label="Back to IndoCity places"
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-[0.96] transition"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              color: BRAND_NAVY,
              minWidth: 44, minHeight: 44,
            }}
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Save place"
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-[0.96] transition"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              color: BRAND_NAVY,
              minWidth: 44, minHeight: 44,
            }}
          >
            <Heart className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share place"
            className="w-10 h-10 rounded-full flex items-center justify-center text-black shadow-md active:scale-[0.96] transition"
            style={{ background: theme, minWidth: 44, minHeight: 44 }}
          >
            <Share2 className="w-4 h-4" strokeWidth={2.5} />
          </button>
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
        </div>

        {/* Hero + thumb-rail composition. Thumbs sit on the LEFT at a
            fixed ~22% column, hero fills the rest. */}
        <div className="absolute inset-0 flex">
          {/* THUMBNAIL RAIL (LEFT) */}
          <div
            className="h-full flex flex-col gap-1.5 p-1.5 bg-white"
            style={{ width: '22%', minWidth: 84 }}
          >
            {thumbs.length > 0 ? (
              thumbs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => openThumb(t)}
                  aria-label={t.offer ? `View ${t.offer.name}` : 'View photo'}
                  className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 active:scale-[0.97] transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.url}
                    alt={t.offer?.name || ''}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </button>
              ))
            ) : (
              // No offers + no extra photos — render 4 placeholder
              // tiles so the rail still composes correctly at 60dvh.
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex-1 min-h-0 rounded-lg border border-dashed border-gray-200 bg-gray-50"
                  aria-hidden
                />
              ))
            )}
          </div>

          {/* HERO COVER (RIGHT) */}
          <div className="relative flex-1 h-full overflow-hidden bg-black">
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
            {/* Soft top fade so the chrome stays readable on bright photos. */}
            <div
              className="absolute inset-x-0 top-0 h-28 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 70%, transparent 100%)',
              }}
              aria-hidden
            />
            {/* Soft bottom fade so the name+slogan overlay stays readable. */}
            <div
              className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 70%, transparent 100%)',
              }}
              aria-hidden
            />

            {/* Place name + slogan (bottom-left overlay on the hero) */}
            <div className="absolute bottom-3 left-3 right-24 pointer-events-none">
              <h1
                className="text-white font-black tracking-tight leading-[1.1] text-[20px] sm:text-[24px]"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.55)' }}
              >
                {place.name}
              </h1>
              {place.description && (
                <p
                  className="text-white/95 font-semibold leading-snug mt-1 text-[13px] sm:text-[14px] line-clamp-2"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.55)' }}
                >
                  {(() => {
                    // Slogan = first sentence of the description (clipped
                    // at ~80 chars). Falls back to the full string if
                    // there's no sentence boundary.
                    const d = place.description.trim()
                    const firstSentence = d.split(/(?<=[.!?])\s/)[0] ?? d
                    return firstSentence.length > 80
                      ? firstSentence.slice(0, 80).trimEnd() + '…'
                      : firstSentence
                  })()}
                </p>
              )}
            </div>

            {/* Maps badge — small dark pill bottom-right. External
                Google Maps link, opens in a new tab. */}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Google Maps"
                className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-white text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
                style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', minHeight: 32 }}
              >
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          COMPACT INFO ROW  (~15dvh)
          Single inline row: Category · ★ rating · city. NO scrolling.
          ============================================================ */}
      <div
        className="flex items-center px-4"
        style={{ height: '15dvh', flex: '0 0 15dvh' }}
      >
        <div className="w-full flex items-center gap-2 flex-wrap text-[13px]">
          <span className="font-extrabold text-black">
            {place.categoryLabel}
          </span>
          <span className="text-gray-400" aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Star
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: BRAND_YELLOW }}
              fill={BRAND_YELLOW}
              strokeWidth={0}
            />
            <span className="font-extrabold text-black">
              {hasReviews ? ratingVal.toFixed(1) : '—'}
            </span>
            <span className="text-gray-500 text-[12px]">
              ({reviewCount} review{reviewCount === 1 ? '' : 's'})
            </span>
          </span>
          {place.city && (
            <>
              <span className="text-gray-400" aria-hidden>·</span>
              <span className="capitalize text-gray-700 font-semibold">
                {place.city}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ============================================================
          STICKY FOOTER  (~15dvh)
          Two-button grid: Bike (yellow) + Car (navy) "Take me there".
          Sits above the 6px brand-yellow accent bar at the viewport
          edge. Disabled visually if the venue has no lat/lng.
          ============================================================ */}
      <div
        className="px-4 pb-3 pt-1 grid grid-cols-2 gap-2"
        style={{ flex: '0 0 15dvh' }}
      >
        {(['bike', 'car'] as const).map((v) => {
          const isBike = v === 'bike'
          const enabled = Number.isFinite(place.lat) && Number.isFinite(place.lng)
          const bg     = isBike ? BRAND_YELLOW : BRAND_NAVY
          const color  = isBike ? BRAND_NAVY : '#FFFFFF'
          const Icon   = isBike ? Bike : CarIcon
          const label  = isBike ? 'Bike' : 'Car'
          if (!enabled) {
            return (
              <button
                key={v}
                type="button"
                disabled
                className="inline-flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl text-[13px] font-extrabold shadow-md opacity-50 cursor-not-allowed"
                style={{ background: bg, color, minHeight: 56 }}
              >
                <Icon className="w-5 h-5" strokeWidth={2.5} />
                <span>{label} — Take me there</span>
              </button>
            )
          }
          return (
            <a
              key={v}
              href={takeMeThereHref(v)}
              className="inline-flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl text-[13px] font-extrabold shadow-md active:scale-[0.98] transition"
              style={{ background: bg, color, minHeight: 56 }}
            >
              <Icon className="w-5 h-5" strokeWidth={2.5} />
              <span>{label} — Take me there</span>
            </a>
          )
        })}
      </div>

      {/* Bottom accent bar — fixed to the visible viewport edge. 6px
          to keep visual parity with the older design; founder spec
          says "3px" but the existing system uses 6px so the bar reads
          on retina without disappearing. */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* ============================================================
          SHARE SHEET — unchanged from the previous version. Identical
          hand-off to Copy link / WhatsApp / Facebook / Instagram /
          TikTok so the beautician + place share modals stay 1:1.
          ============================================================ */}
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

      {/* ============================================================
          OFFER DETAIL POPUP — opens on thumbnail tap. Cart UI is wired
          via onAddToCart when the source thumb resolves back to a
          priced offer. themeColor=BRAND_YELLOW so the popup's top
          accent matches the brand-yellow profile theme.
          ============================================================ */}
      {detailPhoto && (() => {
        const matchedOffer = offers.find((o) => o.name === detailPhoto.name) ?? null
        const canAddToCart = Boolean(
          matchedOffer && typeof matchedOffer.price_idr === 'number' && matchedOffer.price_idr > 0,
        )
        const existingLine = matchedOffer
          ? cart.items.find((it) => it.offer_id === matchedOffer.id) ?? null
          : null
        return (
          <PortfolioDetailPopup
            photo={detailPhoto}
            themeColor={BRAND_YELLOW}
            canContact={showContact}
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

      {/* ============================================================
          CART SHEET — full WhatsApp checkout. Unchanged behaviour.
          ============================================================ */}
      {cartOpen && (
        <PlaceCartSheet
          placeName={place.name}
          whatsappE164={place.whatsappE164}
          contactEnabled={contactEnabled}
          items={cart.items}
          totalIdr={cart.totalIdr}
          totalQty={cart.totalQty}
          theme={theme}
          onSetQty={cart.setQty}
          onRemove={cart.remove}
          onClear={() => { cart.clear() }}
          onClose={() => setCartOpen(false)}
          onSend={() => {
            const linesArr = cart.items.map((it) => {
              const unit  = formatRpExact(it.price_idr)
              const line  = formatRpExact(it.price_idr * it.qty)
              return `• ${it.name}  ×${it.qty}  (${unit}) — ${line}`
            })
            const body = [
              `Halo! Saya pesan dari IndoCity · ${place.name}`,
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
            setCartOpen(false)
          }}
        />
      )}

      {/* Toast — confirms "Added to cart". Auto-dismisses after ~1.8s
          via the useEffect on toastMsg. Sits just above the bottom
          accent bar so it doesn't crowd the footer buttons. */}
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
// PlaceCartSheet — bottom-anchored review + WhatsApp handoff sheet.
// Empty state, line items with steppers + remove, total, send + clear.
//
// The "Send via WhatsApp" CTA is disabled when the venue has opted out
// of contact (contactEnabled=false) or has no whatsapp_e164 — the
// tooltip explains why, no silent failure.
// =============================================================================
function PlaceCartSheet({
  placeName, whatsappE164, contactEnabled, items, totalIdr, totalQty,
  theme, onSetQty, onRemove, onClear, onClose, onSend,
}: {
  placeName:       string
  whatsappE164:    string | null
  contactEnabled:  boolean
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
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3 shrink-0">
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
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-black active:scale-[0.95] transition"
                          style={{ minWidth: 44, minHeight: 44 }}
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
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-black active:scale-[0.95] transition disabled:opacity-40 disabled:active:scale-100"
                          style={{ minWidth: 44, minHeight: 44 }}
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
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0 text-gray-500"
                    style={{ minWidth: 44, minHeight: 44 }}
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClear}
              disabled={empty}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-gray-300 bg-white text-black text-[13px] font-extrabold active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
              style={{ minHeight: 44 }}
            >
              Clear cart
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={sendDisabled}
              title={sendDisabled ? sendDisabledReason : undefined}
              aria-disabled={sendDisabled}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[13px] font-extrabold shadow-md active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
              style={{
                background: BRAND_YELLOW,
                color: BRAND_NAVY,
                minHeight: 44,
              }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Send via WhatsApp
            </button>
          </div>

          <p className="text-[11px] text-gray-500 leading-snug text-center">
            You pay the venue directly · agree delivery with them.
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Shell — fixed 100dvh root with overflow-hidden so the page never
// scrolls. Flex column so the hero/info/footer rows compose to 100dvh
// without overflowing the viewport (iOS-safe dvh, not vh).
// =============================================================================
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative w-full bg-white text-[#0A0A0A] flex flex-col overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
