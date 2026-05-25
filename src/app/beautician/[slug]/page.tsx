'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, Award, Menu, Home, Hotel, Building2, Share2, Link2, MessageCircle, X, type LucideIcon } from 'lucide-react'
import ProfileGallery     from '@/components/profile/ProfileGallery'
import PricingBlock, { type PricingTier } from '@/components/profile/PricingBlock'
import TrustBadges        from '@/components/profile/TrustBadges'
import AboutSection       from '@/components/profile/AboutSection'
import OperatingHoursCard from '@/components/profile/OperatingHoursCard'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { Sparkles } from 'lucide-react'
// Star + Award already imported above for the hero info-card.
import {
  SERVICE_LABELS,
  BEAUTICIAN_SERVICES_OFFERED,
  SERVICE_OFFERED_LABELS,
  type BeauticianProviderPublic,
  type BeauticianServiceOffered,
} from '@/lib/beautician/types'

// Pink used for the Services Provided badge icons. Matches the
// hero "Beautician" overlay so the visual language is consistent.
const SERVICE_BADGE_PINK = '#EC4899'


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

  // Compose pricing tiers from whichever packages the beautician set —
  // skip null/zero so the grid only shows real options. Highlight the
  // first set tier so the page reads "starting from".
  const tiers: PricingTier[] = []
  if (p.price_makeup_idr) tiers.push({ label: SERVICE_LABELS.makeup, amount: p.price_makeup_idr })
  if (p.price_nail_idr)   tiers.push({ label: SERVICE_LABELS.nail,   amount: p.price_nail_idr   })
  if (p.price_hair_idr)   tiers.push({ label: SERVICE_LABELS.hair,   amount: p.price_hair_idr   })
  if (tiers.length > 0) tiers[0]!.featured = true

  return (
    <Shell>
      {/* Hero — cover with overlay text, plus a floating info-card that
          sits on the bottom edge of the cover (15px rounded corners). */}
      <div className="relative pb-10">
        {/* Top-right share button. */}
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share profile"
          className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-[0.96] transition"
          style={{ background: SERVICE_BADGE_PINK }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: '16 / 9', maxHeight: 320 }}
        >
          <img
            src={p.cover_image_url || DEFAULT_BEAUTICIAN_HERO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Professional / Beautician overlay text — top-left */}
          <div className="absolute left-4 z-10 select-none leading-none" style={{ top: 31 }}>
            <div className="text-[28px] sm:text-[34px] font-normal text-black drop-shadow-[0_2px_6px_rgba(255,255,255,0.55)]">
              Professional
            </div>
            <div
              className="text-[28px] sm:text-[34px] font-black mt-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
              style={{ color: '#EC4899' }}
            >
              Beautician
            </div>
            <div className="text-[12px] sm:text-[13px] font-medium text-black mt-1.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] max-w-[220px] leading-snug">
              Enhancing your natural beauty effortless
            </div>

            {/* Service locations the beautician travels to. */}
            <div className="mt-2 flex items-start gap-1 max-w-[150px]">
              <HeroIcon icon={Home}       slogan="Home"  />
              <div className="w-px h-6 bg-black/30 mt-0.5" aria-hidden />
              <HeroIcon icon={Hotel}      slogan="Hotel" />
              <div className="w-px h-6 bg-black/30 mt-0.5" aria-hidden />
              <HeroIcon icon={Building2}  slogan="Villa" />
            </div>
          </div>
        </div>

        {/* Floating info card — overlaps the bottom edge of the cover.
            All 4 corners 15px. Left: avatar. Middle: name / city / rating.
            Right: "Top Rated Seller" badge. */}
        <div className="px-4 relative z-20" style={{ marginTop: -24 }}>
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
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight">
                {p.display_name}
              </h1>
              <p className="text-[12px] text-gray-500 truncate mt-0.5">
                {p.city?.trim() || 'Indonesia'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: '#EC4899' }}
                  fill="#EC4899"
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

            {/* Top Rated Seller badge */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: '#EC4899' }} />
              <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: '#EC4899' }}>
                Top Rated Seller
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-32 max-w-2xl mx-auto space-y-5 pt-4">
        {/* About {name} — 4-line clamped bio. Black heading + gray body
            for readability on the white page background. */}
        <section className="space-y-1.5" style={{ marginTop: -50 }}>
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
            About {p.display_name}
          </h2>
          <div className="flex items-start gap-3">
            {p.bio?.trim() ? (
              <p
                className="text-[13px] text-gray-600 leading-snug whitespace-pre-wrap flex-1 min-w-0"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.bio}
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">No bio yet.</p>
            )}
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png"
              alt=""
              className="w-12 h-12 object-contain shrink-0"
            />
          </div>
        </section>

        {/* Services Provided — 3 visible chips + pink burger toggle on
            the same line. Each chip is a filter: tap to scope the
            portfolio carousel to that service's photos. */}
        {(p.services_offered ?? []).length > 0 && (() => {
          const all     = (p.services_offered ?? []) as BeauticianServiceOffered[]
          const visible = all.slice(0, 3)
          const hidden  = all.slice(3)
          const hasMore = hidden.length > 0
          return (
            <section className="space-y-2">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                Services Provided
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {visible.map((sid) => (
                  <ServiceFilterBadge
                    key={sid} sid={sid}
                    active={activeService === sid}
                    onClick={() => setActiveService(activeService === sid ? null : sid)}
                  />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setShowMoreServices((v) => !v)}
                    aria-label={showMoreServices ? 'Hide other services' : 'Show other services'}
                    aria-expanded={showMoreServices}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white shrink-0 active:scale-[0.96] transition"
                    style={{ background: SERVICE_BADGE_PINK }}
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
                    />
                  ))}
                </div>
              )}
              {activeService && (
                <button
                  type="button"
                  onClick={() => setActiveService(null)}
                  className="text-[11px] font-bold text-gray-500 hover:text-black underline"
                >
                  Showing only {SERVICE_OFFERED_LABELS[activeService]} — show all
                </button>
              )}
            </section>
          )
        })()}

        {/* Portfolio carousel — pulls from service_photos. Shows the
            active service's photos when filtered, otherwise combines
            every service's photos in catalog order. Falls back to the
            legacy gallery_image_urls for older providers. */}
        <ProfileGallery
          photos={buildPortfolioPhotos(p, activeService)}
          title={activeService
            ? `${SERVICE_OFFERED_LABELS[activeService]} — Portfolio`
            : 'Portfolio'}
          variant="carousel"
          titleClassName="text-[13px] font-extrabold uppercase tracking-wider text-black"
        />

        {/* CTA row under the carousel — large price on the left, pink
            contact button on the right. */}
        <div className="flex items-end justify-between gap-3">
          <div className="leading-none">
            <div className="text-[24px] sm:text-[28px] font-black text-black">
              {formatStartFromPrice(p)}
            </div>
            <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
              Start from
            </div>
          </div>
          {p.whatsapp_e164 && (
            <a
              href={`https://wa.me/${p.whatsapp_e164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 justify-center px-5 py-2.5 rounded-full text-white font-extrabold text-[13px] shadow-md active:scale-[0.97] transition shrink-0"
              style={{ background: SERVICE_BADGE_PINK }}
            >
              <MessageCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
              Contact
            </a>
          )}
        </div>

        <TrustBadges
          memberSince={p.created_at}
          lastActiveAt={p.last_active_at}
        />

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center text-[11px] font-bold text-gray-600 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
            {p.years_experience} yrs experience
          </span>
        </div>

        {/* Bio is rendered above in the dedicated "About {name}" block —
            keep AboutSection only for city/languages/certs. */}
        <AboutSection
          bio={null}
          city={p.city}
          serviceArea={p.service_area_notes}
          languages={p.languages}
          certifications={p.certifications}
        />

        <PricingBlock
          title="Packages"
          tiers={tiers}
          footnote="Travel fee may apply for out-of-area bookings. Discuss with the beautician on WhatsApp."
        />

        <OperatingHoursCard hours={p.operating_hours ?? null} />

        {(p.instagram_url || p.tiktok_url || p.facebook_url) && (
          <section className="space-y-2">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-ink/70">Follow</h2>
            <div className="flex flex-wrap gap-2">
              {p.instagram_url && <SocialChip href={p.instagram_url} label="Instagram" />}
              {p.tiktok_url    && <SocialChip href={p.tiktok_url}    label="TikTok" />}
              {p.facebook_url  && <SocialChip href={p.facebook_url}  label="Facebook" />}
            </div>
          </section>
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
            style={{ borderTop: `4px solid ${SERVICE_BADGE_PINK}` }}
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-50 hover:bg-pink-100 transition border border-pink-200 active:scale-[0.99]"
              >
                <Link2 className="w-5 h-5 shrink-0" style={{ color: SERVICE_BADGE_PINK }} strokeWidth={2.5} />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-extrabold text-black">
                    {shareCopied ? 'Copied!' : 'Copy link'}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{profileUrl}</div>
                </div>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${p.display_name} di City Riders: ${profileUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: SERVICE_BADGE_PINK }}
              >
                <MessageCircle className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Share via WhatsApp</div>
                  <div className="text-[11px] text-white/85">Kirim link ke kontak</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

function ServiceFilterBadge({
  sid, active, onClick,
}: { sid: BeauticianServiceOffered; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 text-[12px] font-extrabold px-3 py-1.5 rounded-full transition active:scale-[0.97]"
      style={
        active
          ? { background: SERVICE_BADGE_PINK, color: '#FFFFFF' }
          : { background: 'rgba(229, 231, 235, 0.95)', color: '#0A0A0A' }
      }
    >
      <Sparkles
        className="w-3.5 h-3.5"
        strokeWidth={2.5}
        style={{ color: active ? '#FFFFFF' : SERVICE_BADGE_PINK }}
      />
      {SERVICE_OFFERED_LABELS[sid] ?? sid}
    </button>
  )
}

// Cheapest of makeup/nail/hair prices, formatted as "Rp 300k" / "Rp 1.2jt".
// Falls back to "Rp 300k" when no prices are set so the CTA row is never empty.
function formatStartFromPrice(p: BeauticianProviderPublic): string {
  const prices = [p.price_makeup_idr, p.price_nail_idr, p.price_hair_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (prices.length === 0) return 'Rp 300k'
  const min = Math.min(...prices)
  if (min >= 1_000_000) {
    const jt = min / 1_000_000
    return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
  }
  if (min >= 1_000) {
    const k = min / 1_000
    return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
  }
  return `Rp ${min.toLocaleString('id-ID')}`
}

// Combines per-service photos into the carousel feed. When a service
// filter is active, returns just that service's photos; otherwise
// flattens every service's photos in the catalog's natural order so
// the carousel stays deterministic across reloads. Falls back to the
// legacy gallery_image_urls when service_photos is empty (older rows).
function buildPortfolioPhotos(
  p: BeauticianProviderPublic,
  active: BeauticianServiceOffered | null,
): string[] {
  const sp = p.service_photos ?? {}
  if (active) return sp[active] ?? []
  const ordered: string[] = []
  for (const cat of BEAUTICIAN_SERVICES_OFFERED) {
    const urls = sp[cat.id]
    if (Array.isArray(urls)) ordered.push(...urls)
  }
  if (ordered.length > 0) return ordered
  return p.gallery_image_urls ?? []
}

function HeroIcon({
  src, icon: Icon, slogan,
}: { src?: string; icon?: LucideIcon; slogan: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      {src
        ? <img src={src} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
        : Icon
          ? <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} style={{ color: SERVICE_BADGE_PINK }} />
          : null}
      <div className="mt-0.5 text-[7px] sm:text-[8px] font-medium text-black leading-tight whitespace-pre-line drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
        {slogan}
      </div>
    </div>
  )
}

function SocialChip({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center text-[12px] font-extrabold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-ink hover:bg-white/10 transition">
      {label} →
    </a>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // Lock body scroll while this page is mounted — the public profile
  // is designed as a one-screen snapshot, not a scrollable feed.
  // Restored on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  // Solid white paints over the global PageBackground (which sits at
  // -z-10) so the courier scene doesn't show through here.
  return (
    <main className="relative h-screen overflow-hidden bg-white text-ink">
      {children}
    </main>
  )
}
