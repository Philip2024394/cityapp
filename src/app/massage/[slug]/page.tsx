'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppNav from '@/components/layout/AppNav'
import AvailabilityDot from '@/components/massage/AvailabilityDot'
import { capturePartnerFromUrl, getStoredPartnerSlug } from '@/lib/partners/attribution'
import type { MassageProviderPublic } from '@/lib/massage/types'

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

export default function MassageProviderPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '').toLowerCase()
  const [p, setP] = useState<MassageProviderPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [partnerTag, setPartnerTag] = useState<string | null>(null)

  useEffect(() => {
    // Capture ?partner= attribution (same pattern as /p/[slug]) so a
    // hotel-QR scan that lands here still credits the partner.
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

  return (
    <Shell>
      <div className="px-4 pt-8 pb-24 max-w-2xl mx-auto">
        <Link href="/massage" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back to marketplace</Link>

        <section className="rounded-2xl bg-black/85 border border-white/10 p-6 shadow-card">
          <div className="flex items-center gap-4 mb-5">
            {p.profile_image_url
              ? <img src={p.profile_image_url} alt={p.display_name} className="w-20 h-20 rounded-full object-cover bg-white/5" />
              : <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-ink/40 text-[28px] font-black">{p.display_name[0]}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-[24px] font-black leading-tight">{p.display_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <AvailabilityDot availability={p.availability} withLabel />
              </div>
              <div className="text-[12px] text-ink/65 mt-1">
                {p.gender === 'woman' ? 'Wanita' : 'Pria'} · {p.years_experience} years experience
              </div>
            </div>
          </div>

          <p className="text-[14px] text-ink/85 whitespace-pre-wrap leading-relaxed mb-5">{p.bio}</p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <Tier min={60}  v={p.price_60min_idr} />
            <Tier min={90}  v={p.price_90min_idr} />
            <Tier min={120} v={p.price_120min_idr} />
          </div>

          {p.city && <Row k="City" v={p.city} />}
          {p.service_area_notes && <Row k="Service area" v={p.service_area_notes} />}

          <div className="mt-5 space-y-2">
            <a
              href={waUrl(p, partnerTag)}
              target="_blank" rel="noopener noreferrer"
              className="block w-full text-center rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105"
            >
              Contact on WhatsApp →
            </a>
            <p className="text-[11px] text-ink/50 text-center">
              Pay the therapist directly · platform takes 0%
              {partnerTag && <span className="block mt-1 text-brand/80">Referred by partner: {partnerTag}</span>}
            </p>
          </div>
        </section>
      </div>
    </Shell>
  )
}

function waUrl(p: MassageProviderPublic, partnerTag: string | null) {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const lines = [
    `Halo ${p.display_name}, saya menemukan profil Anda di City Riders.`,
    `Saya tertarik untuk booking sesi pijat.`,
    partnerTag ? `Saya tamu dari ${partnerTag}.` : '',
    `Apakah Anda available?`,
  ].filter(Boolean)
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`
}

function Tier({ min, v }: { min: number; v: number }) {
  return (
    <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-center">
      <div className="text-[11px] text-ink/60 uppercase tracking-wider font-bold">{min} min</div>
      <div className="text-[15px] font-black text-brand">Rp {v.toLocaleString('id-ID')}</div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-t border-white/8 text-[13px]">
      <span className="text-ink/60">{k}</span>
      <span className="text-ink font-bold">{v}</span>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${BG_URL})` }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/80" />
      <AppNav />
      {children}
    </main>
  )
}
