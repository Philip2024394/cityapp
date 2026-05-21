import Link from 'next/link'
import { Plus, Compass } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { TOUR_SERVICES, findTourService } from '@/data/tourServices'

export const dynamic = 'force-dynamic'

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
}

export default async function TourGuideFeedPage() {
  const admin = getAdminSupabase()
  if (!admin) return <p className="p-6 text-muted">Server not configured.</p>

  const { data: rows } = await admin
    .from('tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, review_count')
    .eq('status', 'approved')
    .order('rating', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const list = (rows as Row[] | null) ?? []

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
            {list.map((r) => (
              <Link
                key={r.id}
                href={`/tour/${r.slug}`}
                className="block card p-4 active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-extrabold text-ink leading-tight truncate">{r.name}</div>
                    <div className="text-[11px] text-muted capitalize">{r.city.replace(/-/g, ' ')}</div>
                  </div>
                  {r.rating != null && r.review_count > 0 && (
                    <div className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black text-brand text-[11px] font-extrabold">
                      ★ {r.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(r.services ?? []).slice(0, 3).map((sid) => {
                    const s = findTourService(sid)
                    if (!s) return null
                    return (
                      <span key={sid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.30)' }}>
                        <span aria-hidden>{s.emoji}</span>{s.label}
                      </span>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="text-muted">{(r.languages ?? []).length} bahasa</div>
                  {r.day_rate_idr != null && (
                    <div className="text-ink font-extrabold">
                      Rp {r.day_rate_idr.toLocaleString('id-ID')} <span className="text-muted font-bold">/ hari</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Why also feed: TOUR_SERVICES referenced statically so build doesn't tree-shake the import. */}
        <div className="hidden">{TOUR_SERVICES.length}</div>
      </main>
    </>
  )
}
