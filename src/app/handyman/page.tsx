'use client'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Star, Wrench, Search, Menu, X } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import {
  SPECIALTY_LABELS, SPECIALTY_SHORT, ALL_SPECIALTIES,
  type HandymanProviderPublic, type HandymanSpecialty,
} from '@/lib/handyman/types'

const HANDYMAN_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export default function HandymanMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const search = useSearchParams()
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')
  const [providers, setProviders] = useState<HandymanProviderPublic[]>([])
  const [specialty, setSpecialty] = useState<'all' | HandymanSpecialty>('all')
  const [searchText, setSearchText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (specialty !== 'all') qs.set('specialty', specialty)
    const r = await fetch(`/api/handyman/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: HandymanProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [specialty])
  useEffect(() => { load() }, [load])

  // Close burger menu on outside-click / Escape
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Client-side text search over the server-filtered set.
  const visible = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return providers
    return providers.filter((p) => {
      const hay = [
        p.display_name,
        p.bio,
        p.city ?? '',
        p.service_area_notes ?? '',
        ...p.specialties.map((s) => SPECIALTY_LABELS[s] + ' ' + SPECIALTY_SHORT[s]),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [providers, searchText])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Tukang in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-ink/70 mt-1">
            <Wrench className="w-3.5 h-3.5" />
            Listrik · Plumbing · AC · Tukang · 20+ trades
          </div>
        </div>

        {/* Search bar + burger button */}
        <div className="flex items-center gap-2 mb-3" ref={menuRef}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari tukang — nama, area, jenis layanan…"
              className="w-full rounded-full bg-black/85 border border-white/15 pl-10 pr-3 py-2.5 text-[13px] text-ink placeholder:text-ink/45 focus:outline-none focus:border-brand"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-bg bg-brand hover:bg-brand2 active:scale-95 transition border border-black/40 shadow-[0_4px_12px_rgba(250,204,21,0.30)]"
              aria-label="Filter by specialty"
              title="Filter by specialty"
            >
              <Menu className="w-5 h-5" strokeWidth={2.75} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-50 w-[280px] max-h-[70vh] overflow-y-auto rounded-2xl p-2"
                style={{
                  background: '#0A0A0A',
                  border: '1px solid rgba(250,204,21,0.25)',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
                }}
              >
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-ink/55">Filter trade</span>
                  <button onClick={() => setMenuOpen(false)} className="text-ink/50 hover:text-ink"><X className="w-4 h-4" /></button>
                </div>
                <button
                  onClick={() => { setSpecialty('all'); setMenuOpen(false) }}
                  className={`flex items-center w-full px-2 py-2 rounded-lg text-[13px] font-bold transition ${
                    specialty === 'all' ? 'bg-brand text-bg' : 'text-ink hover:bg-brand/15 hover:text-brand'
                  }`}
                >
                  All trades
                </button>
                {ALL_SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpecialty(s); setMenuOpen(false) }}
                    className={`flex items-center w-full px-2 py-2 rounded-lg text-[13px] font-bold transition ${
                      specialty === s ? 'bg-brand text-bg' : 'text-ink hover:bg-brand/15 hover:text-brand'
                    }`}
                  >
                    {SPECIALTY_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {specialty !== 'all' && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/15 border border-brand/40 text-[12px] font-extrabold text-brand">
            <Wrench className="w-3.5 h-3.5" />
            {SPECIALTY_LABELS[specialty]}
            <button onClick={() => setSpecialty('all')} className="hover:text-ink"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/65 text-[13px]">
            {searchText ? `No tukang match "${searchText}".` : 'No tukang listed in this trade yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visible.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a tukang?</div>
          <Link href="/handyman/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p, demo = false }: { provider: HandymanProviderPublic; demo?: boolean }) {
  const waHref = buildWaHref(p)
  const tiers = [
    p.hourly_rate_idr != null ? { label: 'Hour',     v: p.hourly_rate_idr } : null,
    p.day_rate_idr    != null ? { label: 'Day · 8h', v: p.day_rate_idr }    : null,
  ].filter((t): t is { label: string; v: number } => t !== null)

  const body = (
    <div
      className="card card-interactive p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url('${HANDYMAN_CARD_BG}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {/* Rate badge — top-right, hourly preferred (falls back to day · 8h).
          Scannable price-first treatment for the tukang category. */}
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
            {p.has_own_tools ? ' · own tools' : ''}
          </div>
        </div>
      </div>

      {/* Specialty chips — up to 3 (matches dashboard cap) */}
      <div className="flex flex-wrap gap-1 mb-3">
        {p.specialties.slice(0, 3).map((s) => (
          <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider"
            style={{ background: 'rgba(10,10,10,0.85)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.30)' }}>
            {SPECIALTY_SHORT[s]}
          </span>
        ))}
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
  return <Link href={`/handyman/${p.slug}`} className="block">{body}</Link>
}

function buildWaHref(p: HandymanProviderPublic): string {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const trades = p.specialties.slice(0, 3).map((s) => SPECIALTY_LABELS[s]).join(', ')
  const text = `Halo ${p.display_name}, saya menemukan profil Anda di City Riders. Saya butuh tukang ${trades.toLowerCase() || ''}. Bisa datang hari ini?`
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
