'use client'
import { useState } from 'react'
import OperatingHoursCard from '@/components/profile/OperatingHoursCard'
import SocialShareSheet  from '@/components/profile/SocialShareSheet'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'

// Drop-in client island for server-rendered profile pages
// (currently /tour/[slug] and /rent/[slug]) that need the universal
// extras without losing their bespoke layout: fires the view tracker,
// renders the social chips + operating hours block, and exposes a
// Share button that opens the existing SocialShareSheet.
//
// Kept presentation-light so each page can place it where it fits.

type ProviderType =
  | 'driver' | 'bike_rental' | 'tour_guide'
  | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home_clean'

export default function ProfileSlugIslands(props: {
  providerType: ProviderType
  providerId:   string
  shareUrl:     string
  shareName:    string
  shareText?:   string
  socials?: { instagram?: string | null; tiktok?: string | null; facebook?: string | null }
  hours?:   Record<string, string> | null
}) {
  const [shareOpen, setShareOpen] = useState(false)
  useProfileViewTracker({ providerType: props.providerType, providerId: props.providerId })

  const s = props.socials || {}
  const showSocials = !!(s.instagram || s.tiktok || s.facebook)

  return (
    <>
      {showSocials && (
        <section className="card p-4 space-y-2">
          <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-muted">Follow</h2>
          <div className="flex flex-wrap gap-2">
            {s.instagram && <Chip href={s.instagram} label="Instagram" />}
            {s.tiktok    && <Chip href={s.tiktok}    label="TikTok"   />}
            {s.facebook  && <Chip href={s.facebook}  label="Facebook" />}
          </div>
        </section>
      )}

      <OperatingHoursCard hours={props.hours ?? null} />

      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-ink font-extrabold text-[13px] uppercase tracking-wider active:scale-[0.99]"
      >
        Share profile
      </button>

      <SocialShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={props.shareUrl}
        prefillText={props.shareText ?? `Lihat profil ${props.shareName} di Kita2u:`}
        providerName={props.shareName}
      />
    </>
  )
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-[12px] font-extrabold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-ink hover:bg-white/10 transition"
    >
      {label} →
    </a>
  )
}
