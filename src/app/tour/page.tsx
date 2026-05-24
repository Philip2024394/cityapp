import Link from 'next/link'
import { Plus, Compass, Star, MessageCircle, Fuel } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { TOUR_SERVICES } from '@/data/tourServices'
import { getLanguageByCode } from '@/data/tourLanguages'

function tourWaHref(p: { name: string; whatsapp_e164: string }): string {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const text = `Halo ${p.name}, saya menemukan profil Anda di City Riders. Apakah Anda available untuk tour guide?`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export const dynamic = 'force-dynamic'

// Per-card background image — themed scene layered behind the content
// of each tour-guide card. Same image as the massage marketplace per
// the latest design ask.
const TOUR_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export const metadata = {
  title: 'Tour Guides · City Rider',
  description:
    'Local tour guides across Indonesia — temples, beaches, mountains, jungles. WhatsApp the guide directly to book.',
}

type Row = {
  id: string
  slug: string
  name: string
  whatsapp_e164: string
  city: string
  services: string[]
  languages: string[]
  day_rate_idr: number | null
  notes: string | null
  rating: number | null
  review_count: number
  image_urls: string[] | null
  fuel_included: boolean | null
  is_mock?: boolean
}

export default async function TourGuideFeedPage() {
  const admin = getAdminSupabase()
  if (!admin) return <p className="p-6 text-muted">Server not configured.</p>

  // Real guides
  const { data: realRows } = await admin
    .from('tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, review_count, image_urls, fuel_included')
    .eq('status', 'approved')
    .order('rating', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Mock guides (migration 0052). Auto-hidden one-per-real-signup by
  // the DB trigger; reals always render before mocks.
  const { data: mockRows } = await admin
    .from('mock_tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, image_urls, fuel_included')
    .is('mock_hidden_at', null)
    .order('rating', { ascending: false, nullsFirst: false })

  const reals: Row[] = (realRows as Row[] | null) ?? []
  const mocks: Row[] = ((mockRows as Omit<Row,'review_count'|'is_mock'>[] | null) ?? []).map((r) => ({
    ...r, review_count: 0, is_mock: true,
  }))
  const list: Row[] = [...reals, ...mocks]

  return (
    <>
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
              Tour <span className="gradient-text">Guides</span>
            </h1>
            <p className="mt-1 text-[13px] text-muted leading-snug">
              Guide lokal di seluruh Indonesia. WhatsApp langsung tanpa komisi platform.
            </p>
          </div>
          <Link
            href="/tour/list/auth"
            className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-bg bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-95 transition"
            aria-label="List as tour guide"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            <span>List</span>
          </Link>
        </header>

        {list.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)', border: '1px solid rgba(0,0,0,0.85)' }}>
              <Compass className="w-6 h-6 text-bg" strokeWidth={2.5} />
            </div>
            <div className="text-[14px] font-extrabold text-ink">Belum ada tour guide terdaftar</div>
            <p className="text-[12px] text-muted">Jadi yang pertama — tap "List" di kanan atas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              // Server component — can't pass onClick to Link, so mocks
              // render as a plain non-interactive <div> and reals as a
              // navigable <Link>. Cleaner than a polymorphic wrapper.
              const photo = (r.image_urls && r.image_urls.length > 0) ? r.image_urls[0] : null
              // Card background = full-bleed image, no scrim, no opacity
              // dim. backgroundColor 'transparent' overrides .card's
              // rgba(0,0,0,0.55) so the photo shows at full clarity.
              const cardStyle = {
                backgroundImage: `url('${TOUR_CARD_BG}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: 'transparent',
              } as const
              return (
                <div
                  key={r.id}
                  aria-disabled={r.is_mock}
                  className="card p-4 relative overflow-hidden"
                  style={cardStyle}
                >
                  {/* Star badge — top-right. */}
                  {r.rating != null && (r.is_mock || r.review_count > 0) && (
                    <div
                      className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px]"
                      style={{
                        background: 'rgba(10,10,10,0.85)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                      }}
                    >
                      <Star className="w-3.5 h-3.5 fill-brand text-brand" strokeWidth={0} />
                      <span className="font-extrabold text-white">{r.rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    {/* Profile image — yellow ring matches brand. */}
                    {photo
                      ? <img
                          src={photo}
                          alt={r.name}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-white/5"
                          style={{
                            border: '2px solid #FACC15',
                            boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        />
                      : <div
                          className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[20px] font-black shrink-0"
                          style={{
                            color: '#0A0A0A',
                            border: '2px solid #FACC15',
                            boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        >{r.name[0]}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-extrabold leading-tight truncate" style={{ color: '#0A0A0A' }}>{r.name}</div>
                      <div className="text-[12px] capitalize" style={{ color: '#374151' }}>{r.city.replace(/-/g, ' ')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    {/* Up to 2 languages stacked, all left-aligned.
                        Fuel state moved to the action row (left of Contact). */}
                    <div className="flex flex-col gap-1 min-w-0">
                      {(r.languages ?? [])
                        .map((code) => getLanguageByCode(code))
                        .filter((l): l is NonNullable<typeof l> => l !== null)
                        .slice(0, 2)
                        .map((l) => (
                          <div key={l.code} className="flex items-center gap-1.5 leading-none" style={{ color: '#374151' }}>
                            <span aria-hidden className="text-[14px]">{l.flag}</span>
                            <span className="font-bold truncate">{l.label}</span>
                          </div>
                        ))}
                    </div>
                    {r.day_rate_idr != null && (
                      <div className="inline-flex items-center gap-2">
                        <img
                          src="https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png?updatedAt=1779107454479"
                          alt=""
                          aria-hidden
                          className="h-8 w-auto -my-2"
                          loading="lazy"
                        />
                        <div className="font-extrabold leading-none" style={{ color: '#0A0A0A' }}>
                          Rp {r.day_rate_idr.toLocaleString('id-ID')} <span className="font-bold" style={{ color: '#4B5563' }}>/ hari</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action row — Fuel state on the left, Contact on the
                      right. View link removed per spec. Mocks get the
                      Contact rendered as inert <span>. */}
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <div
                      className="flex items-center gap-1 leading-none font-extrabold text-[12px]"
                      style={{ color: r.fuel_included ? '#15803D' : '#6B7280' }}
                    >
                      <Fuel className="w-4 h-4" strokeWidth={2.25} />
                      <span className="truncate">{r.fuel_included ? 'Fuel Included' : 'Fuel Excluded'}</span>
                    </div>
                    {r.is_mock ? (
                      <span
                        aria-disabled
                        className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                        style={{
                          background: '#0A0A0A',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.25)',
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
                        Contact
                      </span>
                    ) : (
                      <a
                        href={tourWaHref(r)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider transition inline-flex items-center justify-center gap-1.5 hover:brightness-110"
                        style={{
                          background: '#0A0A0A',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.25)',
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
                        Contact
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Why also feed: TOUR_SERVICES referenced statically so build doesn't tree-shake the import. */}
        <div className="hidden">{TOUR_SERVICES.length}</div>
      </main>
    </>
  )
}
