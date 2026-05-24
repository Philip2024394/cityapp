'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Star } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import AvailabilityDot from '@/components/massage/AvailabilityDot'
import { MASSAGE_TYPE_SHORT, type MassageProviderPublic } from '@/lib/massage/types'

// Per-card background image — themed massage scene, layered behind a
// dark scrim inside each ProviderCard. Distinct from the global
// PageBackground (which is the motorbike scene shared across the app).
const MASSAGE_CARD_BG =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

// Mock therapists now live in the massage_providers table with
// is_mock = true (see migration 0049). They're returned by the
// marketplace API alongside real profiles and auto-hidden one-by-one
// as real therapists sign up. Card UI renders mocks identically but
// the Book Now button is replaced with a "Sample listing" pill.

export default function MassageMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <MarketplaceInner />
    </Suspense>
  )
}

function MarketplaceInner() {
  const search = useSearchParams()
  const initialGender = (search?.get('gender') === 'man' ? 'man'
                       : search?.get('gender') === 'woman' ? 'woman'
                       : 'all') as 'all' | 'woman' | 'man'
  // City heading. Pulled from ?city= URL param so partner-QR / landing
  // links can override; defaults to Yogyakarta (primary market). Pure
  // display for now — does not yet filter the marketplace API.
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')

  const [providers, setProviders] = useState<MassageProviderPublic[]>([])
  const [gender, setGender] = useState<'all' | 'woman' | 'man'>(initialGender)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (gender !== 'all') qs.set('gender', gender)
    const r = await fetch(`/api/massage/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: MassageProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [gender])

  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        {/* City heading — sits above the card grid so the visitor knows
            which city they're browsing. ?city= URL param overrides.
            Sub-line clarifies the service: home visits + hotel calls. */}
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Massage therapists in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="text-[12px] text-ink/70 mt-1 max-w-md mx-auto leading-snug">
            Independent therapists online now — home visits and hotel-room calls across {cityLabel}.
          </div>
        </div>

        {/* Gender filter */}
        <div className="flex gap-2 mb-4">
          {([
            { v: 'all',   label: 'All' },
            { v: 'woman', label: 'Wanita' },
            { v: 'man',   label: 'Pria' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setGender(opt.v)}
              className={`px-4 py-2 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition ${
                gender === opt.v
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
            No therapists listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a therapist?</div>
          <Link href="/massage/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p, demo = false }: { provider: MassageProviderPublic; demo?: boolean }) {
  const waHref = buildWaHref(p)

  // Card background — full-bleed massage image, no scrim, no dim.
  // backgroundColor: transparent overrides .card's rgba(0,0,0,0.55) so
  // no shade sits behind/around the image. .card-interactive still
  // supplies the rounded corners, border, and hover transform.
  const body = (
    <div
      className="card card-interactive p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url('${MASSAGE_CARD_BG}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {p.rating != null && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 text-[12px] z-10 rounded-full px-2 py-0.5"
          style={{
            background: 'rgba(10,10,10,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <Star className="w-3.5 h-3.5 fill-brand text-brand" strokeWidth={0} />
          <span className="font-extrabold" style={{ color: '#FFFFFF' }}>{p.rating.toFixed(1)}</span>
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar + overlay availability dot at bottom-right.
            Wrapper is relative so the dot can absolutely position over
            the image corner; bigger size (14px) and white ring keep it
            readable against the photo. */}
        <div className="relative shrink-0">
          {p.profile_image_url
            ? <img
                src={p.profile_image_url}
                alt={p.display_name}
                className="w-14 h-14 rounded-2xl object-cover bg-white/5"
                style={{
                  border: '2px solid #FACC15',
                  boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                }}
              />
            : <div
                className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[20px] font-black"
                style={{
                  color: '#0A0A0A',
                  border: '2px solid #FACC15',
                  boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                }}
              >{p.display_name[0]}</div>}
          <span
            aria-label={p.availability === 'online' ? 'Online · available' : 'Busy / offline'}
            className={`absolute -bottom-1 -right-1 rounded-full ${p.availability === 'online' ? 'animate-pulse-online' : ''}`}
            style={{
              width: 14,
              height: 14,
              background: p.availability === 'online' ? '#22C55E' : '#F97316',
              border: '2px solid #FFFFFF',
              boxShadow: p.availability === 'online' ? undefined : '0 1px 4px rgba(0,0,0,0.35)',
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold truncate" style={{ color: '#0A0A0A' }}>{p.display_name}</div>
          {/* One specialty per therapist — replaces the old gender/years
              meta. Gender + years still appear lower in the detail page. */}
          <div className="text-[12px] font-bold truncate mt-0.5" style={{ color: '#0A0A0A' }}>
            {MASSAGE_TYPE_SHORT[p.massage_type] ?? p.massage_type}
          </div>
        </div>
      </div>
      <p className="text-[12px] line-clamp-3 mb-3 whitespace-pre-wrap" style={{ color: '#4B5563' }}>{p.bio}</p>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <Tier min={60}  v={p.price_60min_idr} />
        <Tier min={90}  v={p.price_90min_idr} />
        <Tier min={120} v={p.price_120min_idr} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] min-w-0 truncate" style={{ color: '#4B5563' }}>
          {p.service_area_notes ?? 'Tap to view profile'}
        </div>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={demo}
          onClick={(e) => {
            e.stopPropagation()
            if (demo) e.preventDefault()
          }}
          className={`rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-extrabold border shrink-0 transition ${
            demo ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110 hover:scale-[1.03]'
          }`}
          style={{
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.25)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
          }}
          aria-label={`WhatsApp ${p.display_name}`}
        >
          <MessageCircle className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
          {demo ? 'Sample' : 'Contact'}
        </a>
      </div>
    </div>
  )

  if (demo) return body
  return <Link href={`/massage/${p.slug}`} className="block">{body}</Link>
}

function buildWaHref(p: MassageProviderPublic): string {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const text = `Halo ${p.display_name}, saya menemukan profil Anda di City Riders. Apakah Anda available untuk sesi pijat?`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function Tier({ min, v }: { min: number; v: number }) {
  return (
    <div
      className="rounded-lg border border-white/20 px-2 py-1.5 text-center"
      style={{ background: '#0A0A0A' }}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9CA3AF' }}>{min}m</div>
      <div className="text-[12px] font-black" style={{ color: '#FACC15' }}>{v.toLocaleString('id-ID')}</div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // No local background — inherits the global PageBackground from the
  // root layout, so /massage matches /cari and the rest of the app.
  return (
    <main className="relative min-h-screen text-ink">
      <AppNav />
      {children}
    </main>
  )
}
