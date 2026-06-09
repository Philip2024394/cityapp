'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Menu, Home, Hotel, Store, Share2, Link2, MessageCircle, X, ChevronLeft, BadgeCheck, MapPin, Bike, type LucideIcon } from 'lucide-react'
import RunningMarquee from '@/components/profile/RunningMarquee'
import PortfolioCarousel, {
  PortfolioDetailPopup,
  type PortfolioPhoto,
} from '@/components/profile/PortfolioCarousel'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import ContactFormPanel from '@/components/profile/ContactFormPanel'
import VisitUsPanel, {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import ContactBookingPopup from '@/components/profile/ContactBookingPopup'
import QrisCheckoutBlock from '@/components/profile/QrisCheckoutBlock'
import DraftPasswordGate from '@/components/profile/DraftPasswordGate'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { bannerSrc } from '@/lib/banners/transform'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { Sparkles } from 'lucide-react'
// Star + Award already imported above for the hero info-card.
import type { LaundryProviderPublic } from '@/lib/laundry/types'
import { countryByCode } from '@/lib/data/countries'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import ProfileQaPanel from '@/components/addons/ProfileQaPanel'

// Synthetic services catalogue for laundry. The DB stores price columns
// (price_wash_per_kg_idr / price_wash_dry_per_kg_idr /
// price_wash_iron_per_kg_idr) — a service is "offered" when its column
// is non-null & > 0. This mirrors the beautician services_offered shape
// so the rest of the page (chips, filter, carousel labels) reads the
// same way.
type LaundryServiceOffered = 'wash' | 'wash_dry' | 'wash_iron'

const LAUNDRY_SERVICES_OFFERED: ReadonlyArray<{ id: LaundryServiceOffered; label: string }> = [
  { id: 'wash',      label: 'Cuci' },
  { id: 'wash_dry',  label: 'Cuci + Jemur' },
  { id: 'wash_iron', label: 'Cuci + Jemur + Setrika' },
]

const SERVICE_OFFERED_LABELS: Record<LaundryServiceOffered, string> = {
  wash:      'Cuci',
  wash_dry:  'Cuci + Jemur',
  wash_iron: 'Cuci + Jemur + Setrika',
}

// Default theme accent — used when the laundry hasn't picked their own
// theme_color. Blue (#3B82F6) carries the water / fresh tone that fits
// the category. The chosen hex flows through every accent surface on
// this page via the `theme` constant below.
const DEFAULT_THEME = '#3B82F6'

// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI.
type ReviewRow = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}


// /laundry/[slug] — universal profile flagship build, laundry edition.
// Visual-first category (the photo carousel sells fresh-folded results);
// the kit's ProfileGallery is the centerpiece. 3-pack pricing (wash /
// wash+dry / wash+iron) renders only the packages the laundry actually
// offers, per-kg.

// Vertical default for the hero. Used when the laundry hasn't set their
// own cover_image_url yet — keeps the page on-brand instead of bare.
const DEFAULT_LAUNDRY_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

export default function LaundryProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<LaundryProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  // mig 0228 — draft lock state. `locked` signals the API said this
  // profile needs a password. `draftPassword` is what the visitor
  // typed; held in state so re-fetches stay unlocked.
  const [locked, setLocked] = useState(false)
  const [draftPassword, setDraftPassword] = useState<string>('')
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showMoreServices, setShowMoreServices] = useState(false)
  // null = show photos from ALL services (combined). When a service id
  // is set, the portfolio carousel filters to just that service.
  const [activeService, setActiveService] = useState<LaundryServiceOffered | null>(null)
  // Selected carousel card — opens the View Details popup when set.
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  // Portfolio layout — flip between auto-drifting carousel + 2-col grid.
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  // Reviews view — replaces everything below the floating info-card.
  const [showReviews, setShowReviews] = useState(false)
  // Visit Us view — also replaces content area when active (only
  // available when the laundry has opted into a physical location).
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
    const url = `/api/laundry/${encodeURIComponent(slug)}/public${
      draftPassword ? `?p=${encodeURIComponent(draftPassword)}` : ''
    }`
    fetch(url, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: LaundryProviderPublic; locked?: boolean } | null) => {
        if (!j?.provider) { setNotFound(true); return }
        if (j.locked) { setLocked(true); setP(j.provider) }
        else          { setLocked(false); setP(j.provider) }
      })
      .catch(() => setNotFound(true))
  }, [slug, draftPassword])

  useProfileViewTracker({ providerType: 'laundry', providerId: p?.id })

  // Resolved accent color for every accent surface on this page.
  // p.theme_color wins; fall back to global default blue.
  const theme = p?.theme_color || DEFAULT_THEME

  // Fetch reviews only when the panel is first opened, then again
  // after a new submission (bump reviewsRefreshCount).
  useEffect(() => {
    if (!showReviews || !p?.id) return
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=laundry&provider_id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: ReviewRow[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, p?.id, reviewsRefreshCount])

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Laundry not found</h1>
          <Link href="/laundry" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  // mig 0228 — draft lock prompt. The API returned only branding
  // fields (theme_color, button_text_color, slug, is_draft, display_name=null).
  if (locked) {
    const gateTheme = p.theme_color || DEFAULT_THEME
    const gateInk   = (p as unknown as { button_text_color?: string | null }).button_text_color || '#FFFFFF'
    return (
      <Shell>
        <DraftPasswordGate
          slug={slug}
          themeColor={gateTheme}
          buttonTextColor={gateInk}
          fetchUrl={(pw) => `/api/laundry/${encodeURIComponent(slug)}/public?p=${encodeURIComponent(pw)}`}
          onUnlocked={(pw, prov) => {
            setDraftPassword(pw)
            setLocked(false)
            setP(prov as LaundryProviderPublic)
          }}
        />
      </Shell>
    )
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://citydrivers.id'
  const profileUrl = `${siteOrigin}/laundry/${p.slug}`

  // Synthetic services_offered derived from priced columns. A column
  // being non-null & > 0 means the laundry offers that package.
  const servicesOffered: LaundryServiceOffered[] = []
  if (typeof p.price_wash_per_kg_idr      === 'number' && p.price_wash_per_kg_idr      > 0) servicesOffered.push('wash')
  if (typeof p.price_wash_dry_per_kg_idr  === 'number' && p.price_wash_dry_per_kg_idr  > 0) servicesOffered.push('wash_dry')
  if (typeof p.price_wash_iron_per_kg_idr === 'number' && p.price_wash_iron_per_kg_idr > 0) servicesOffered.push('wash_iron')

  // WhatsApp prefill text for the under-carousel contact button.
  const waText = [
    `Halo ${p.display_name}, saya menemukan profil Anda di Kita2u.`,
    `Saya tertarik untuk pesan laundry.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean).join('\n')
  void waText // reserved for direct-WA fallback; popup handles WA below

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
            src={bannerSrc(p.cover_image_url) || DEFAULT_LAUNDRY_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hero overlay — text now comes from p.hero_text (mig 0106)
              when set; otherwise falls back to the default copy. */}
          {(() => {
            const ht = (p.hero_text as Record<string, string> | null) || {}
            const line1   = ht.line1   || 'Professional'
            const line2   = ht.line2   || 'Laundry'
            const tagline = ht.tagline || 'Fresh, fast, folded to your door'
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

                {/* Service locations the laundry delivers to. For laundry
                    we only surface Home + Hotel (pickup/delivery to);
                    villa/spa don't apply. */}
                {(() => {
                  const items: Array<{ key: string; icon: typeof Home; label: string }> = [
                    { key: 'home',  icon: Home,  label: 'Home' },
                    { key: 'hotel', icon: Hotel, label: 'Hotel' },
                  ]
                  const hasSpa = Boolean(p.has_physical_location)
                  if (hasSpa) {
                    items.push({ key: 'spa', icon: Store, label: 'Drop-off' })
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

        {/* Reviews toggle — themed pill above the floating card, right side.
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
                <span className="text-[11px] text-gray-500">
                  ({p.rating_count ?? 0} review{(p.rating_count ?? 0) === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* Top Rated Seller badge — neutral gray pill so the chip
                stays unchanged across profiles; only the Award icon +
                text tint the active profile theme color so each laundry
                shows their own accent. */}
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
          <>
            {p.has_physical_location && (
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
                xUrl={(p as unknown as { x_url?: string | null }).x_url ?? null}
                snapchatUrl={(p as unknown as { snapchat_url?: string | null }).snapchat_url ?? null}
                websiteUrl={(p as unknown as { website_url?: string | null }).website_url ?? null}
                whatsappE164={p.whatsapp_e164 ?? null}
                telegramHandle={(p as unknown as { telegram_handle?: string | null }).telegram_handle ?? null}
                wechatId={(p as unknown as { wechat_id?: string | null }).wechat_id ?? null}
                lineId={(p as unknown as { line_id?: string | null }).line_id ?? null}
                kakaotalkId={(p as unknown as { kakaotalk_id?: string | null }).kakaotalk_id ?? null}
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
            )}
            {/* Contact form (mig 0137) — sibling card. */}
            {Boolean((p as unknown as { contact_form_enabled?: boolean }).contact_form_enabled
                  && (p as unknown as { contact_email?: string | null }).contact_email) && (
              <ContactFormPanel
                displayName={p.display_name}
                themeColor={theme}
                endpoint="/api/laundry/contact"
                providerSlug={p.slug}
              />
            )}
            {!p.has_physical_location
              && !((p as unknown as { contact_form_enabled?: boolean }).contact_form_enabled
                && (p as unknown as { contact_email?: string | null }).contact_email)
              && (
                <button
                  type="button"
                  onClick={() => setShowVisitUs(false)}
                  className="text-[12px] font-bold text-gray-500 underline"
                >
                  Back
                </button>
            )}
          </>
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
            {(() => {
              // mig 0137 — Visit Us / Contact Us button picks its label
              // based on what the provider has set up.
              const hasVisitUs = Boolean(p.has_physical_location)
              const hasContactForm = Boolean(
                (p as unknown as { contact_form_enabled?: boolean }).contact_form_enabled
                && (p as unknown as { contact_email?: string | null }).contact_email,
              )
              if (!hasVisitUs && !hasContactForm) return null
              const label = hasVisitUs ? 'Visit Us' : 'Contact Us'
              return (
                <button
                  type="button"
                  onClick={() => setShowVisitUs(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                  style={{ color: theme }}
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {label}
                </button>
              )
            })()}
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

        {/* Services Provided — only renders the priced packages. Mirrors
            the beautician chip row, with the synthetic services array
            derived from price_*_per_kg_idr columns above. */}
        {(() => {
          const offered = servicesOffered
          if (offered.length === 0) return null
          const all     = offered
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

        {/* Portfolio carousel — laundry doesn't have a per-service
            service_photos column. Fall back to gallery_image_urls
            captioned with the active service tier so the carousel
            framing stays consistent with the beautician page. */}
        {(() => {
          const photos = buildPortfolioPhotos(p, activeService)
          if (photos.length === 0) return null
          return (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {activeService
                    ? `${SERVICE_OFFERED_LABELS[activeService]} — Portfolio`
                    : 'Photo gallery'}
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
                currencySymbol={countryByCode((p as unknown as { country_code?: string | null }).country_code ?? 'ID').currency_symbol}
              />
            </section>
          )
        })()}

        {/* Pricing block — per-kg pricing for each offered package + a
            meta strip with min_kg and turnaround_hours under it. */}
        {servicesOffered.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              Pricing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {servicesOffered.includes('wash') && (
                <PricingTile
                  label={SERVICE_OFFERED_LABELS.wash}
                  amount={p.price_wash_per_kg_idr}
                  theme={theme}
                />
              )}
              {servicesOffered.includes('wash_dry') && (
                <PricingTile
                  label={SERVICE_OFFERED_LABELS.wash_dry}
                  amount={p.price_wash_dry_per_kg_idr}
                  theme={theme}
                />
              )}
              {servicesOffered.includes('wash_iron') && (
                <PricingTile
                  label={SERVICE_OFFERED_LABELS.wash_iron}
                  amount={p.price_wash_iron_per_kg_idr}
                  theme={theme}
                />
              )}
            </div>
            {(p.min_kg || p.turnaround_hours) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {p.turnaround_hours != null && p.turnaround_hours > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                    Selesai {p.turnaround_hours}h
                  </span>
                )}
                {p.min_kg != null && p.min_kg > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                    Min {p.min_kg} kg per order
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {/* Running marquee — weekly promo ribbon under the carousel. */}
        <RunningMarquee
          text={p.promo_text || 'Message me this week — fresh laundry pickup and drop-off across the city, folded and ready in hours.'}
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
              Start from / kg
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

        {/* mig 0228 — QRIS checkout block. Renders only when the vendor
            has uploaded a static QRIS image via the dashboard. */}
        <QrisCheckoutBlock
          qrUrl={(p as unknown as { qr_payment_url?: string | null }).qr_payment_url}
          displayName={p.display_name}
        />
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
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${p.display_name} di Kita2u: ${profileUrl}`)}`}
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
          vertical "BACK" text below. Diverts back to /laundry. */}
      <Link
        href="/laundry"
        aria-label="Back to Kita2u laundry"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right: 0,
          /* Anchored beside the About/bio block on first paint so the
             button never covers the interactive surfaces lower on the
             page (Services chips, Portfolio carousel, Contact CTA).
             top 35% + translateY(-50%) puts the 110px button visually
             at ~30-40% of the viewport — i.e. the bio band. */
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

      {/* Portfolio "View Details" popup — full image + description +
          start price + Contact. */}
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
          CTA and any per-service Contact button. Submits a booking
          request server-side first (so it shows up on the laundry's
          dashboard) and then opens WhatsApp with a matching pre-filled
          message. */}
      {contactOpen && p.whatsapp_e164 && (
        <ContactBookingPopup
          providerSlug={p.slug}
          providerName={p.display_name}
          whatsapp={p.whatsapp_e164}
          providerId={p.id}
          intentVertical="laundry"
          intentSource="laundry_profile"
          themeColor={theme}
          serviceOptions={servicesOffered.map((sid) => ({
            value: SERVICE_OFFERED_LABELS[sid] ?? sid,
            label: SERVICE_OFFERED_LABELS[sid] ?? sid,
          }))}
          presetService={contactServiceName}
          busyDates={[]}
          bookEndpoint={`/api/laundry/${p.slug}/book`}
          copy={{
            whatsappMessage: ({ service, date, time, notes }) => [
              `Halo ${p.display_name}, saya ingin pesan laundry.`,
              service.trim() ? `Paket: ${service.trim()}.` : '',
              `Tanggal: ${date}, jam ${time}.`,
              partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
              notes.trim() ? `Catatan: ${notes.trim()}` : '',
              `\n— Dikirim via citydrivers.id`,
            ].filter(Boolean).join('\n'),
          }}
          onClose={() => setContactOpen(false)}
        />
      )}
      {/* Q&A add-on panel — renders only when owner has the 'qa' addon enabled
          AND has at least one Q&A item. Otherwise null. */}
      <div className="max-w-2xl mx-auto px-4">
        <ProfileQaPanel ownerUserId={p.owner_user_id ?? null} />
      </div>
      <PoweredByKita2u defaultVertical="laundry" />
    </Shell>
  )
}

// PortfolioDetailPopup + ThumbButton now live in
// @/components/profile/PortfolioCarousel.tsx and are imported at the
// top of this file.

// ContactBookingPopup now lives in @/components/profile/ContactBookingPopup.tsx
// Inline copy removed in Phase 2-A4.

// Carousel card — image up top, name + 2-line description + start
// Portfolio carousel — auto-drifts left at a slow pace and pauses on
// user interaction so swipe/drag/wheel still works. Cards are
// duplicated so the loop seam (when scrollLeft passes half-width and
// wraps back to 0) is invisible.
// PortfolioCarousel + PortfolioCard now live in
// @/components/profile/PortfolioCarousel.tsx — imported at the top of
// this file. Inline copies removed in Phase 2-A2.

function ServiceFilterBadge({
  sid, active, onClick, theme,
}: { sid: LaundryServiceOffered; active: boolean; onClick: () => void; theme: string }) {
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

// Pricing tile — one per priced package. Black title, big themed
// amount, "/ kg" suffix in muted gray.
function PricingTile({
  label, amount, theme,
}: { label: string; amount: number | null | undefined; theme: string }) {
  const formatted = formatPriceIdr(amount)
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[20px] font-black" style={{ color: theme }}>
          {formatted ?? '—'}
        </span>
        <span className="text-[11px] font-bold text-gray-500">/ kg</span>
      </div>
    </div>
  )
}

// Cheapest per-kg price across the priced packages. Falls back to a soft
// default so the CTA never reads empty.
function formatStartFromPrice(p: LaundryProviderPublic): string {
  const all = [p.price_wash_per_kg_idr, p.price_wash_dry_per_kg_idr, p.price_wash_iron_per_kg_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (all.length === 0) return 'Rp 10k'
  return formatPriceIdr(Math.min(...all)) ?? 'Rp 10k'
}

// Builds the portfolio carousel feed. Laundry doesn't have a per-service
// service_photos column, so we flatten gallery_image_urls into the rich
// PortfolioPhoto shape. When a service filter is active, the same gallery
// is shown — labelled with the active tier so the framing stays coherent.
function buildPortfolioPhotos(
  p: LaundryProviderPublic,
  active: LaundryServiceOffered | null,
): PortfolioPhoto[] {
  const gallery = (p.gallery_image_urls ?? []).filter((u): u is string => typeof u === 'string' && u.length > 0)
  if (gallery.length === 0) return []
  const tierLabel = active ? SERVICE_OFFERED_LABELS[active] : 'Laundry'
  const tierPrice =
    active === 'wash'      ? p.price_wash_per_kg_idr      :
    active === 'wash_dry'  ? p.price_wash_dry_per_kg_idr  :
    active === 'wash_iron' ? p.price_wash_iron_per_kg_idr :
    (p.price_wash_per_kg_idr ?? p.price_wash_dry_per_kg_idr ?? p.price_wash_iron_per_kg_idr ?? null)
  return gallery.map((url) => ({
    url,
    name:        tierLabel,
    description: active
      ? `${SERVICE_OFFERED_LABELS[active]} — per-kg pricing, ${p.turnaround_hours ? `siap ${p.turnaround_hours}h` : 'pickup tersedia'}.`
      : `Fresh laundry handled by ${p.display_name}.`,
    price_idr:   tierPrice ?? null,
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

// VisitUsPanel + AvailabilityCalendarPopup + Social*Icons now live in
// @/components/profile/VisitUsPanel.tsx — imported at the top of this file.
// Inline copies removed in Phase 2-A3.

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
          provider_type:     'laundry',
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
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500"
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp (opsional, +62…)"
            className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500"
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={250}
              rows={3}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis pengalaman Anda (max 250 huruf)"
              className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-blue-500"
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
          coloured icon stays readable on any cover-image backdrop. */}
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
      {/* Hide the floating dev-toolbar wrench on this page only — the
          page is meant to read as a polished customer-facing profile
          and the spanner clutters the corner. Scoped to mount lifetime. */}
      <style>{`[aria-label="Open dev toolbar"]{display:none!important}`}</style>
      {children}
    </main>
  )
}
