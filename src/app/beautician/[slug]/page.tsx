'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppNav from '@/components/layout/AppNav'
import ProfileHero        from '@/components/profile/ProfileHero'
import ProfileGallery     from '@/components/profile/ProfileGallery'
import PricingBlock, { type PricingTier } from '@/components/profile/PricingBlock'
import StickyContactBar   from '@/components/profile/StickyContactBar'
import SocialShareSheet   from '@/components/profile/SocialShareSheet'
import TrustBadges        from '@/components/profile/TrustBadges'
import AboutSection       from '@/components/profile/AboutSection'
import OperatingHoursCard from '@/components/profile/OperatingHoursCard'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import { SERVICE_LABELS, type BeauticianProviderPublic } from '@/lib/beautician/types'

// /beautician/[slug] — universal profile flagship build. Visual-first
// category (portfolio matters more than text); the kit's ProfileGallery
// is the centerpiece. 3-pack pricing (makeup/nail/hair) renders only
// the packages the beautician actually offers.

export default function BeauticianProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<BeauticianProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

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
      <ProfileHero
        coverUrl={p.cover_image_url}
        avatarUrl={p.profile_image_url}
        name={p.display_name}
        categoryLabel="Beautician"
        rating={p.rating ?? null}
        reviewCount={p.rating_count ?? null}
        idVerified={true}
        availability={p.availability}
      />

      <div className="px-4 pb-32 max-w-2xl mx-auto space-y-5 pt-4">
        <Link href="/beautician" className="text-[12px] text-ink/60 hover:text-ink inline-block">
          ← Back to marketplace
        </Link>

        <TrustBadges
          idVerified
          memberSince={p.created_at}
          lastActiveAt={p.last_active_at}
        />

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.35)' }}>
            {p.gender === 'woman' ? 'Wanita' : 'Pria'}
          </span>
          <span className="inline-flex items-center text-[11px] font-bold text-ink/70 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
            {p.years_experience} yrs experience
          </span>
        </div>

        {/* Gallery FIRST on beautician — portfolio is the buying signal. */}
        <ProfileGallery photos={p.gallery_image_urls ?? []} title="Portfolio" />

        <AboutSection
          bio={p.bio}
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
        prefillText={`Lihat profil ${p.display_name} di City Riders:`}
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
