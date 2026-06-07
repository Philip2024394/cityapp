'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Award, Hotel, Building2, Share2, Link2, MessageCircle, X, ChevronLeft, BadgeCheck, MapPin, Bike, Sparkles, type LucideIcon } from 'lucide-react'
import RunningMarquee from '@/components/profile/RunningMarquee'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import VisitUsPanel, {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import ContactBookingPopup from '@/components/profile/ContactBookingPopup'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'

// -----------------------------------------------------------------------------
// /rent/[slug] — client renderer. Mirrors /beautician/[slug] 1:1 in JSX
// structure. Only the data source swaps from `beautician_providers` to
// `bike_rentals`. The async server component (page.tsx) does the DB query
// and hands the row to this client component so SEO crawlers still see
// the populated HTML.
// -----------------------------------------------------------------------------

const DEFAULT_THEME = '#FACC15'

// Vertical default for the hero. Matches the beautician fallback so
// rental rows without a cover_image_url still get a polished hero.
const DEFAULT_RENT_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

// Bahasa labels for bike_type so the "Services Provided" chip reads in
// Indonesian (matches the rest of the rent vertical's voice).
const BIKE_TYPE_LABELS: Record<string, string> = {
  matic:     'Matic',
  sport:     'Sport',
  adventure: 'Adventure',
  bebek:     'Bebek',
  vespa:     'Vespa',
  classic:   'Klasik',
  big_bike:  'Big Bike',
  electric:  'Listrik',
}

export type BikeRentalPublic = {
  id:                   string
  slug:                 string
  owner_name:           string
  owner_company:        string | null
  owner_whatsapp_e164:  string
  brand:                string
  model:                string
  year:                 number | null
  cc:                   number | null
  transmission:         string | null
  bike_type:            string | null
  color:                string | null
  description:          string | null
  image_urls:           string[] | null
  cover_image_url:      string | null
  daily_price_idr:      number | null
  weekly_price_idr:     number | null
  monthly_price_idr:    number | null
  security_deposit_idr: number | null
  driver_rate_per_day_idr: number | null
  tour_3h_idr:          number | null
  tour_6h_idr:          number | null
  tour_8h_idr:          number | null
  fuel_included:        boolean | null
  helmet_count:         number | null
  raincoat_count:       number | null
  has_phone_holder:     boolean | null
  has_phone_charger:    boolean | null
  has_delivery_box:     boolean | null
  delivers_to_hotel:    boolean | null
  delivers_to_villa:    boolean | null
  pickup_dropoff:       boolean | null
  rental_mode:          'self_ride' | 'with_driver' | 'both' | null
  city:                 string | null
  address:              string | null
  lat:                  number | null
  lng:                  number | null
  rating:               number | null
  review_count:         number | null
  instagram_url:        string | null
  tiktok_url:           string | null
  facebook_url:         string | null
  operating_hours:      Record<string, string> | null
}

type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

export default function RentProfileClient({ row: r }: { row: BikeRentalPublic }) {
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  // Single-element services_offered derived from bike_type. activeService
  // mirrors the beautician toggle (null = "All" reset, string = filter).
  const [activeService, setActiveService] = useState<string | null>(null)
  // Portfolio layout toggle preserved from beautician. We only render
  // a gallery (image_urls) for rent — but keep the toggle so the
  // visual structure stays identical to the beautician page.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('grid')
  // Reviews view — replaces everything below the floating info-card.
  const [showReviews, setShowReviews] = useState(false)
  // Visit Us view — also replaces content area when active.
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [reviews, setReviews]         = useState<ReviewRow[] | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  // Contact popup — opened by the bottom Contact CTA.
  const [contactOpen, setContactOpen] = useState(false)

  useEffect(() => {
    capturePartnerFromUrl()
    setPartnerTag(getStoredPartnerSlug())
  }, [])

  useProfileViewTracker({ providerType: 'bike_rental', providerId: r.id })

  // Resolved accent color. Rentals don't carry a theme_color column yet
  // (mig 0078 was beautician-only); fall back to the global default.
  const theme = DEFAULT_THEME

  useEffect(() => {
    if (!showReviews || !r.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=bike_rental&provider_id=${encodeURIComponent(r.id)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, r.id, reviewsRefreshCount])

  const displayName  = r.owner_name
  const businessName = r.owner_company || r.owner_name
  const bio          = r.description
  const galleryUrls  = (r.image_urls ?? []).filter((u) => typeof u === 'string' && u.trim().length > 0)
  const coverUrl     = r.cover_image_url || galleryUrls[0] || DEFAULT_RENT_HERO
  const profileImageUrl = galleryUrls[0] || r.cover_image_url || null
  const hasPhysicalLocation = Boolean(r.address && r.address.trim())
  const lat = typeof r.lat === 'number' ? r.lat : null
  const lng = typeof r.lng === 'number' ? r.lng : null
  // services_offered: a single-element array derived from bike_type.
  const servicesOffered: string[] = r.bike_type ? [r.bike_type] : []

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://citydrivers.id'
  const profileUrl = `${siteOrigin}/rent/${r.slug}`

  // WhatsApp prefill text used by the share-sheet wa.me link and as the
  // default greeting for the ContactBookingPopup. Vertical copy:
  // "saya tertarik untuk sewa motor."
  const waText = [
    `Halo ${displayName}, saya menemukan profil Anda di Kita2u.`,
    `Saya tertarik untuk sewa motor.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean).join('\n')

  return (
    <Shell>
      {/* Hero — cover with overlay text, plus a floating info-card that
          sits on the bottom edge of the cover (15px rounded corners). */}
      <div className="relative pb-2">
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
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — rentals don't carry hero_text yet, so we use
              static fallback copy matching the beautician structure. */}
          {(() => {
            const line1   = 'Bike'
            const line2   = 'Rental'
            const tagline = 'Sewa motor harian, mingguan, bulanan'
            const line2Color   = theme
            const line1Color   = '#000000'
            const taglineColor = '#000000'
            return (
              <div className="absolute left-4 z-10 select-none leading-none cr-hero-none" style={{ top: 31 }}>
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

                {/* Delivery flags — hotel / villa / pickup. Each true →
                    one icon. Mirrors the beautician "service_locations"
                    row layout (mig 0086) but driven by bike_rentals
                    delivery booleans. */}
                {(() => {
                  const items: Array<{ key: string; icon: LucideIcon; label: string }> = []
                  if (r.delivers_to_hotel) items.push({ key: 'hotel',  icon: Hotel,      label: 'Hotel' })
                  if (r.delivers_to_villa) items.push({ key: 'villa',  icon: Building2,  label: 'Villa' })
                  if (r.pickup_dropoff)    items.push({ key: 'pickup', icon: MapPin,     label: 'Pickup' })
                  if (items.length === 0) return null
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

        {/* Reviews toggle — pink pill above the floating card, right side. */}
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

        {/* Floating info card — overlaps the bottom edge of the cover. */}
        <div className="px-4 relative z-20" style={{ marginTop: 12 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black shrink-0 border-2 border-white shadow"
                style={{ background: '#EC4899' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight flex items-center gap-1">
                <span className="truncate">{businessName}</span>
                <BadgeCheck
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.5}
                  fill={theme}
                  style={{ color: '#FFFFFF' }}
                  aria-label="Verified"
                />
              </h1>
              <p className="text-[12px] text-gray-500 truncate mt-0.5">
                {r.city?.trim() || 'Indonesia'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: '#FACC15' }}
                  fill="#FACC15"
                  strokeWidth={0}
                />
                <span className="text-[12px] font-extrabold text-black">
                  {r.rating != null && r.rating > 0 ? r.rating.toFixed(1) : '—'}
                </span>
                <span className="text-[11px] text-gray-500">
                  ({r.review_count ?? 0} review{(r.review_count ?? 0) === 1 ? '' : 's'})
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
            displayName={displayName}
            address={r.address ?? r.city ?? null}
            city={r.city ?? null}
            lat={lat}
            lng={lng}
            hours={r.operating_hours ?? null}
            instagramUrl={r.instagram_url ?? null}
            tiktokUrl={r.tiktok_url ?? null}
            facebookUrl={r.facebook_url ?? null}
            busyDates={[]}
            themeColor={theme}
            onClose={() => setShowVisitUs(false)}
            bottomCta={
              (lat != null && lng != null)
                ? {
                    label: 'Book Bike Service',
                    icon: Bike,
                    note: `We'll use your location for pickup and ${displayName}'s for drop-off — fare shows on the next screen.`,
                    onClick: () => {
                      const base = `/cari/rider?dLat=${lat}&dLng=${lng}&dName=${encodeURIComponent(displayName)}`
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
            providerId={r.id}
            reviews={reviews ?? []}
            loading={reviewsLoading}
            formOpen={reviewFormOpen}
            setFormOpen={setReviewFormOpen}
            onSubmitted={() => setReviewsRefreshCount((n) => n + 1)}
            theme={theme}
          />
        ) : (
          <>
        {/* About — clamped bio. */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              About {displayName}
            </h2>
            {hasPhysicalLocation && (
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
            {bio?.trim() ? (
              <p
                className="text-[13px] text-gray-600 leading-snug flex-1 min-w-0"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {bio.replace(/\s*\n\s*/g, ' ')}
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No bio yet.</p>
            )}
          </div>
        </section>

        {/* Services Provided — single chip for the bike_type. The "All"
            reset chip is preserved so the row visually matches the
            beautician layout. */}
        {servicesOffered.length > 0 && (
          <section className="space-y-2" style={{ marginTop: 15 }}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              Services Provided
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveService(null)}
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
              {servicesOffered.map((sid) => (
                <ServiceFilterBadge
                  key={sid} sid={sid}
                  active={activeService === sid}
                  onClick={() => setActiveService(activeService === sid ? null : sid)}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        )}

        {/* Portfolio — bike_rentals has no service_photos jsonb, so we
            fall back to image_urls rendered as a 2-col gallery grid.
            Toggle stays so the structure stays identical. */}
        {galleryUrls.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                Portfolio
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
            {portfolioView === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {galleryUrls.map((url, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {galleryUrls.map((url, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0"
                    style={{ width: 220, aspectRatio: '4 / 3' }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Pricing block — replaces the beautician 3-pack with rent
            pricing: daily / weekly / monthly / deposit, plus tour
            blocks (3h / 6h / 8h) when rental_mode includes a driver.
            Whichever columns are non-null render. */}
        <PricingBlock row={r} theme={theme} />

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={'Hubungi pemilik untuk ketersediaan, paket harian/mingguan/bulanan, dan delivery ke hotel atau villa Anda.'}
        />

        {/* CTA row — large price on the left, themed Contact button on
            the right. */}
        <div className="flex items-end justify-between gap-3 pb-4">
          <div className="leading-none pb-3">
            <div className="text-[24px] sm:text-[28px] font-black text-black">
              {formatStartFromPrice(r)}
            </div>
            <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
              Start from
            </div>
          </div>
          {r.owner_whatsapp_e164 && (
            <button
              type="button"
              onClick={() => setContactOpen(true)}
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
              Bagikan profil {displayName} ke teman atau klien.
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
                href={`https://wa.me/?text=${encodeURIComponent(`${waText}\n\n${profileUrl}`)}`}
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

      {/* Right-edge "back" bar — diverts to /rent marketplace. */}
      <Link
        href="/rent"
        aria-label="Back to Kita2u bike rentals"
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
      </Link>

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

      {contactOpen && r.owner_whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={r.slug}
          providerName={displayName}
          whatsapp={r.owner_whatsapp_e164}
          providerId={r.id}
          intentVertical="rentals"
          intentSource="rentals_profile"
          themeColor={theme}
          serviceOptions={servicesOffered.map((sid) => ({
            value: BIKE_TYPE_LABELS[sid] ?? sid,
            label: BIKE_TYPE_LABELS[sid] ?? sid,
          }))}
          presetService=""
          busyDates={[]}
          bookEndpoint={`/api/rent/${r.slug}/book`}
          copy={{
            whatsappMessage: ({ service, date, time, notes }) => [
              `Halo ${displayName}, saya tertarik untuk sewa motor`,
              service.trim() ? ` (${service.trim()})` : '',
              ` pada ${date} jam ${time}.`,
              notes.trim() ? `\nCatatan: ${notes.trim()}` : '',
              `\n\n— Dikirim via citydrivers.id`,
            ].join(''),
          }}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Shell>
  )
}

function ServiceFilterBadge({
  sid, active, onClick, theme,
}: { sid: string; active: boolean; onClick: () => void; theme: string }) {
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
      {BIKE_TYPE_LABELS[sid] ?? sid}
    </button>
  )
}

// Pricing block — replaces the beautician's makeup/nail/hair 3-pack.
// Renders whichever columns are non-null. Whenever rental_mode includes
// 'with_driver', the tour (3h / 6h / 8h) rows render too.
function PricingBlock({ row: r, theme }: { row: BikeRentalPublic; theme: string }) {
  const rows: Array<{ key: string; label: string; value: string; sub?: string }> = []
  const idr = (n: number | null | undefined): string => `Rp ${(n ?? 0).toLocaleString('id-ID')}`

  if (typeof r.daily_price_idr === 'number' && r.daily_price_idr > 0) {
    rows.push({ key: 'daily',   label: 'Daily',   value: idr(r.daily_price_idr),   sub: 'per day' })
  }
  if (typeof r.weekly_price_idr === 'number' && r.weekly_price_idr > 0) {
    rows.push({ key: 'weekly',  label: 'Weekly',  value: idr(r.weekly_price_idr),  sub: 'per week' })
  }
  if (typeof r.monthly_price_idr === 'number' && r.monthly_price_idr > 0) {
    rows.push({ key: 'monthly', label: 'Monthly', value: idr(r.monthly_price_idr), sub: 'per month' })
  }
  if (typeof r.security_deposit_idr === 'number' && r.security_deposit_idr > 0) {
    rows.push({ key: 'deposit', label: 'Security deposit', value: idr(r.security_deposit_idr), sub: 'refundable' })
  }

  const includesDriver = r.rental_mode === 'with_driver' || r.rental_mode === 'both'
  if (includesDriver) {
    if (typeof r.tour_3h_idr === 'number' && r.tour_3h_idr > 0) {
      rows.push({ key: 'tour_3h', label: 'Tour · 3 hours', value: idr(r.tour_3h_idr), sub: 'with driver' })
    }
    if (typeof r.tour_6h_idr === 'number' && r.tour_6h_idr > 0) {
      rows.push({ key: 'tour_6h', label: 'Tour · 6 hours', value: idr(r.tour_6h_idr), sub: 'with driver' })
    }
    if (typeof r.tour_8h_idr === 'number' && r.tour_8h_idr > 0) {
      rows.push({ key: 'tour_8h', label: 'Tour · 8 hours', value: idr(r.tour_8h_idr), sub: 'with driver' })
    }
  }

  if (rows.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
        Pricing
      </h2>
      <div
        className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        {rows.map((rw, i) => (
          <React.Fragment key={rw.key}>
            {i > 0 && <div className="h-px bg-gray-100" />}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-gray-700">
                  {rw.label}
                </div>
                {rw.sub && (
                  <div className="text-[11px] text-gray-400 mt-0.5">{rw.sub}</div>
                )}
              </div>
              <div className="text-[15px] font-black shrink-0" style={{ color: theme }}>
                {rw.value}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  )
}

function formatStartFromPrice(r: BikeRentalPublic): string {
  const candidates: number[] = []
  if (typeof r.daily_price_idr === 'number' && r.daily_price_idr > 0) candidates.push(r.daily_price_idr)
  if (typeof r.tour_3h_idr === 'number' && r.tour_3h_idr > 0)         candidates.push(r.tour_3h_idr)
  if (candidates.length === 0) return 'Rp —'
  const n = Math.min(...candidates)
  if (n >= 1_000_000) {
    const jt = n / 1_000_000
    return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
  }
  return `Rp ${n.toLocaleString('id-ID')}`
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
    : visible.reduce((s, rv) => s + rv.rating, 0) / visible.length

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
          provider_type:     'bike_rental',
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
        {visible.map((rv) => (
          <div key={rv.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-black shrink-0"
                  style={{ background: theme }}
                >
                  {rv.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-black truncate">{rv.reviewer_name}</div>
                  <div className="text-[10px] text-gray-500">{formatReviewWhen(rv.created_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="w-3 h-3"
                    strokeWidth={0}
                    fill={j < rv.rating ? theme : '#E5E7EB'}
                    style={{ color: j < rv.rating ? theme : '#E5E7EB' }}
                  />
                ))}
              </div>
            </div>
            {rv.comment && (
              <p className="text-[12px] text-gray-700 leading-snug">{rv.comment}</p>
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
  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}

