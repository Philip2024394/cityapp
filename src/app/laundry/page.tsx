'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Star, Truck } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import type { LaundryProviderPublic } from '@/lib/laundry/types'

const LAUNDRY_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export default function LaundryMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const search = useSearchParams()
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')
  const [providers, setProviders] = useState<LaundryProviderPublic[]>([])
  const [pkg, setPkg] = useState<'all' | 'wash' | 'wash_dry' | 'wash_iron'>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (pkg !== 'all') qs.set('package', pkg)
    const r = await fetch(`/api/laundry/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: LaundryProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [pkg])
  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Laundry shops in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-ink/70 mt-1 leading-snug">
            <Truck className="w-3.5 h-3.5" />
            Pickup &amp; dropoff included · per-kg pricing
          </div>
        </div>

        {/* Package filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {([
            { v: 'all',       label: 'All packages' },
            { v: 'wash',      label: 'Wash' },
            { v: 'wash_dry',  label: 'Wash + Dry' },
            { v: 'wash_iron', label: 'Wash + Iron' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setPkg(opt.v)}
              className={`px-4 py-2 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition shrink-0 ${
                pkg === opt.v
                  ? 'bg-brand text-bg border-brand'
                  : 'bg-black/60 text-ink/80 border-white/15 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/65 text-[13px]">
            No laundry shops listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a laundry shop?</div>
          <Link href="/laundry/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your shop · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p, demo = false }: { provider: LaundryProviderPublic; demo?: boolean }) {
  const waHref = buildWaHref(p)
  const pkgs = [
    p.price_wash_per_kg_idr      != null ? { label: 'Wash',         v: p.price_wash_per_kg_idr }      : null,
    p.price_wash_dry_per_kg_idr  != null ? { label: 'Wash + Dry',   v: p.price_wash_dry_per_kg_idr }  : null,
    p.price_wash_iron_per_kg_idr != null ? { label: 'Wash + Iron',  v: p.price_wash_iron_per_kg_idr } : null,
  ].filter((s): s is { label: string; v: number } => s !== null)

  const body = (
    <div
      className="card card-interactive p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url('${LAUNDRY_CARD_BG}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {p.rating != null && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] z-10"
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
            {p.min_kg ? ` · min ${p.min_kg}kg` : ''}
            {p.turnaround_hours ? ` · ${p.turnaround_hours}h` : ''}
          </div>
        </div>
      </div>

      <p className="text-[12px] line-clamp-2 mb-3 whitespace-pre-wrap" style={{ color: '#4B5563' }}>{p.bio}</p>

      <div className={`grid gap-1.5 mb-3 ${pkgs.length === 1 ? 'grid-cols-1' : pkgs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {pkgs.map((s) => <Tier key={s.label} label={s.label} v={s.v} />)}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 text-[11px] font-extrabold" style={{ color: '#15803D' }}>
          <Truck className="w-3.5 h-3.5" /> Pickup &amp; dropoff included
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
  return <Link href={`/laundry/${p.slug}`} className="block">{body}</Link>
}

function buildWaHref(p: LaundryProviderPublic): string {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const text = `Halo ${p.display_name}, saya menemukan profil Anda di City Riders. Saya butuh laundry — bisa pickup hari ini?`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function Tier({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border border-white/20 px-2 py-1.5 text-center" style={{ background: '#0A0A0A' }}>
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9CA3AF' }}>{label}</div>
      <div className="text-[12px] font-black" style={{ color: '#FACC15' }}>
        {v.toLocaleString('id-ID')}<span className="text-[9px] font-bold" style={{ color: '#9CA3AF' }}>/kg</span>
      </div>
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
