'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Star, Sparkles } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import type { HomeCleanProviderPublic } from '@/lib/home-clean/types'

const HOME_CLEAN_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png?updatedAt=1779599833442'

export default function HomeCleanMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const search = useSearchParams()
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')
  const [providers, setProviders] = useState<HomeCleanProviderPublic[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/home-clean/marketplace', { cache: 'no-store' })
    const j = await r.json() as { providers: HomeCleanProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-4 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Home Clean in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-ink/70 mt-1">
            <Sparkles className="w-3.5 h-3.5" />
            Bersih-bersih rumah · per jam atau harian
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/65 text-[13px]">
            No cleaners listed yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a cleaner?</div>
          <Link href="/home-clean/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p, demo = false }: { provider: HomeCleanProviderPublic; demo?: boolean }) {
  const waHref = buildWaHref(p)
  const tiers = [
    p.hourly_rate_idr != null ? { label: 'Hour',     v: p.hourly_rate_idr } : null,
    p.day_rate_idr    != null ? { label: 'Day · 8h', v: p.day_rate_idr }    : null,
  ].filter((t): t is { label: string; v: number } => t !== null)

  const body = (
    <div
      className="card card-interactive p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url('${HOME_CLEAN_CARD_BG}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {/* Rate badge — top-right, hourly preferred (falls back to day · 8h). */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[12px] z-10"
        style={{
          background: 'rgba(10,10,10,0.9)',
          border: '1px solid rgba(250,204,21,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}>
        {p.hourly_rate_idr != null ? (
          <>
            <span className="font-extrabold text-brand">Rp {p.hourly_rate_idr.toLocaleString('id-ID')}</span>
            <span className="text-[10px] font-bold text-ink/55 ml-0.5">/h</span>
          </>
        ) : p.day_rate_idr != null ? (
          <>
            <span className="font-extrabold text-brand">Rp {p.day_rate_idr.toLocaleString('id-ID')}</span>
            <span className="text-[10px] font-bold text-ink/55 ml-0.5">/day</span>
          </>
        ) : null}
      </div>

      {p.rating != null && (
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] z-10"
          style={{ background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <Star className="w-3.5 h-3.5 fill-brand text-brand" strokeWidth={0} />
          <span className="font-extrabold text-white">{p.rating.toFixed(1)}</span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          {p.profile_image_url
            ? <img src={p.profile_image_url} alt={p.display_name} className="w-14 h-14 rounded-2xl object-cover bg-white/5"
                style={{ border: '2px solid #FACC15', boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)' }} />
            : <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[20px] font-black"
                style={{ color: '#0A0A0A', border: '2px solid #FACC15', boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)' }}>{p.display_name[0]}</div>}
          <span
            aria-label={p.availability === 'online' ? 'Online · available' : 'Busy / offline'}
            className={`absolute -bottom-1 -right-1 rounded-full ${p.availability === 'online' ? 'animate-pulse-online' : ''}`}
            style={{
              width: 14, height: 14,
              background: p.availability === 'online' ? '#22C55E' : '#F97316',
              border: '2px solid #FFFFFF',
              boxShadow: p.availability === 'online' ? undefined : '0 1px 4px rgba(0,0,0,0.35)',
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold truncate" style={{ color: '#0A0A0A' }}>{p.display_name}</div>
          <div className="text-[12px] truncate mt-0.5" style={{ color: '#374151' }}>
            {p.years_experience} yrs{p.city ? ` · ${p.city}` : ''}
          </div>
        </div>
      </div>

      <p className="text-[12px] line-clamp-2 mb-3 whitespace-pre-wrap" style={{ color: '#4B5563' }}>{p.bio}</p>

      <div className={`grid gap-1.5 mb-3 ${tiers.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {tiers.map((t) => <Tier key={t.label} label={t.label} v={t.v} />)}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] min-w-0 truncate" style={{ color: '#4B5563' }}>
          {p.service_area_notes ?? 'Tap to view profile'}
        </div>
        {demo ? (
          <span aria-disabled className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
            style={{ background: '#0A0A0A', color: '#FFFFFF', border: 'none' }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
            Contact
          </span>
        ) : (
          <a href={waHref} target="_blank" rel="noopener noreferrer"
            className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider transition inline-flex items-center justify-center gap-1.5 hover:brightness-110"
            style={{ background: '#0A0A0A', color: '#FFFFFF', border: 'none' }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
            Contact
          </a>
        )}
      </div>
    </div>
  )

  if (demo) return body
  return <Link href={`/home-clean/${p.slug}`} className="block">{body}</Link>
}

function buildWaHref(p: HomeCleanProviderPublic): string {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const text = `Halo ${p.display_name}, saya menemukan profil Anda di City Riders. Saya butuh jasa bersih rumah. Bisa datang?`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function Tier({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border border-white/20 px-2 py-1.5 text-center" style={{ background: '#0A0A0A' }}>
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9CA3AF' }}>{label}</div>
      <div className="text-[12px] font-black" style={{ color: '#FACC15' }}>{v.toLocaleString('id-ID')}</div>
    </div>
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
