'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppNav from '@/components/layout/AppNav'
import ProfileHero        from '@/components/profile/ProfileHero'
import ProfileGallery     from '@/components/profile/ProfileGallery'
import { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import PricingBlock       from '@/components/profile/PricingBlock'
import StickyContactBar   from '@/components/profile/StickyContactBar'
import SocialShareSheet   from '@/components/profile/SocialShareSheet'
import TrustBadges        from '@/components/profile/TrustBadges'
import AboutSection       from '@/components/profile/AboutSection'
import OperatingHoursCard from '@/components/profile/OperatingHoursCard'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { MASSAGE_TYPE_LABELS, type MassageProviderPublic } from '@/lib/massage/types'

// ============================================================================
// /massage/[slug] — universal profile page composing the shared kit.
// Server-side metadata + JSON-LD + lapsed redirect live in layout.tsx.
// Page itself stays client to handle: partner attribution, view tracker,
// share sheet open state, sticky CTA.
// ============================================================================

export default function MassageProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<MassageProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [galleryView, setGalleryView] = useState<PortfolioView>('grid')

  // Capture ?partner= attribution + read stored slug (hotel-QR → /massage/x).
  useEffect(() => {
    capturePartnerFromUrl()
    setPartnerTag(getStoredPartnerSlug())
  }, [])

  useEffect(() => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) { setNotFound(true); return }
    fetch(`/api/massage/${encodeURIComponent(slug)}/public`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { provider?: MassageProviderPublic } | null) => {
        if (j?.provider) setP(j.provider); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  // Track view once provider id is known (deduped per browser-session).
  useProfileViewTracker({ providerType: 'massage', providerId: p?.id })

  if (notFound) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Therapist not found</h1>
          <Link href="/massage" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Back to marketplace</Link>
        </div>
      </Shell>
    )
  }
  if (!p) {
    return <Shell><div className="px-4 pt-12 text-ink/50 text-[13px]">Loading…</div></Shell>
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://indocity.id'
  const profileUrl = `${siteOrigin}/massage/${p.slug}`

  const waText = [
    `Halo ${p.display_name}, saya menemukan profil Anda di IndoCity.`,
    `Saya tertarik untuk booking sesi pijat.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean).join('\n')

  const massageTypeLabel = p.massage_type ? MASSAGE_TYPE_LABELS[p.massage_type] : null

  return (
    <Shell>
      <ProfileHero
        coverUrl={p.cover_image_url}
        avatarUrl={p.profile_image_url}
        name={p.display_name}
        categoryLabel={p.gender === 'woman' ? 'Massage · Wanita' : 'Massage · Pria'}
        rating={p.rating ?? null}
        reviewCount={p.rating_count ?? null}
        idVerified={true}
        availability={p.availability}
      />

      <div className="px-4 pb-32 max-w-2xl mx-auto space-y-5 pt-4">
        <Link href="/massage" className="text-[12px] text-ink/60 hover:text-ink inline-block">
          ← Back to marketplace
        </Link>

        <TrustBadges
          idVerified
          memberSince={p.created_at}
          lastActiveAt={p.last_active_at}
        />

        {massageTypeLabel && (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.35)' }}>
              {massageTypeLabel}
            </span>
            <span className="inline-flex items-center text-[11px] font-bold text-ink/70 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              {p.years_experience} yrs experience
            </span>
          </div>
        )}

        <AboutSection
          bio={p.bio}
          city={p.city}
          serviceArea={p.service_area_notes}
          languages={p.languages}
          certifications={p.certifications}
        />

        <PricingBlock
          tiers={[
            { label: '60 min',  amount: p.price_60min_idr },
            { label: '90 min',  amount: p.price_90min_idr, featured: true },
            { label: '120 min', amount: p.price_120min_idr },
          ]}
          footnote="Bayar langsung ke therapist · platform takes 0%."
        />

        <ProfileGallery
          photos={p.gallery_image_urls ?? []}
          view={galleryView}
          onViewChange={setGalleryView}
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

        {partnerTag && (
          <div className="rounded-xl bg-brand/10 border border-brand/30 px-3 py-2 text-[12px] text-brand">
            Referred by partner: <span className="font-extrabold">{partnerTag}</span>
          </div>
        )}
      </div>

      <StickyContactBar
        whatsappE164={p.whatsapp_e164}
        prefillText={waText}
        onShare={() => setShareOpen(true)}
      />

      <SocialShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={profileUrl}
        prefillText={`Lihat profil ${p.display_name} di IndoCity:`}
        providerName={p.display_name}
      />
    </Shell>
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
  return (
    <main className="relative min-h-screen text-ink">
      <AppNav />
      {children}
    </main>
  )
}
