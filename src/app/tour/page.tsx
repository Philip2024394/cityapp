import Link from 'next/link'
import { Plus, Compass, Fuel, Bike, Globe } from 'lucide-react'
import UniversalProviderCard, { type UniversalProviderCardBottomItem } from '@/components/marketplace/UniversalProviderCard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { TOUR_SERVICES } from '@/data/tourServices'
import { getLanguageByCode } from '@/data/tourLanguages'

function tourWaHref(p: { name: string; whatsapp_e164: string }): string {
  const digits = p.whatsapp_e164.replace(/[^0-9]/g, '')
  const text = `Halo ${p.name}, saya menemukan profil Anda di IndoCity. Apakah Anda available untuk tour guide?`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export const dynamic = 'force-dynamic'

// Per-card background image — themed scene layered behind the content
// of each tour-guide card. Same image as the massage marketplace per
// the latest design ask.
const TOUR_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export const metadata = {
  title: 'Tour Guides · IndoCity',
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
  availability: 'online' | 'busy' | 'offline'
  bike_brand: string | null
  is_mock?: boolean
  // Universal card fields (mig 0072 + 0087).
  cover_image_url?: string | null
  theme_color?: string | null
  gallery_image_urls?: string[] | null
  operating_hours?: Record<string, string> | null
}

export default async function TourGuideFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="p-6 text-muted">Server not configured.</p>

  // City heading above the card grid. Pulled from ?city= URL param so
  // partner-QR / landing links can override; defaults to Yogyakarta
  // (primary market). Display-only for now — does not yet filter the
  // tour-guide query.
  const { city: cityParam } = await searchParams
  const cityLabel = (cityParam?.trim() || 'Yogyakarta')
    // Title-case so "yogyakarta" → "Yogyakarta", "bali-ubud" → "Bali Ubud".
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  // Real guides
  const { data: realRows } = await admin
    .from('tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, review_count, image_urls, fuel_included, availability, bike_brand, cover_image_url, theme_color, gallery_image_urls, operating_hours')
    .eq('status', 'approved')
    .order('rating', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Mock guides (migration 0052). Auto-hidden one-per-real-signup by
  // the DB trigger; reals always render before mocks.
  const { data: mockRows } = await admin
    .from('mock_tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, image_urls, fuel_included, availability, bike_brand')
    .is('mock_hidden_at', null)
    .order('rating', { ascending: false, nullsFirst: false })

  const reals: Row[] = (realRows as Row[] | null) ?? []
  const mocks: Row[] = ((mockRows as Omit<Row,'review_count'|'is_mock'>[] | null) ?? []).map((r) => ({
    ...r, review_count: 0, is_mock: true,
  }))
  // Reals first, then mocks; within each bucket: online > busy > offline.
  // JS sort is stable so the rating/created_at orders from the queries
  // above are preserved within each availability tier.
  const availabilityRank: Record<string, number> = { online: 0, busy: 1, offline: 2 }
  const list: Row[] = [...reals, ...mocks].sort((a, b) => {
    const am = a.is_mock ? 1 : 0
    const bm = b.is_mock ? 1 : 0
    if (am !== bm) return am - bm
    return (availabilityRank[a.availability] ?? 9) - (availabilityRank[b.availability] ?? 9)
  })

  return (
    <main className="relative min-h-screen bg-white text-black">
      <header className="px-4 pt-safe pt-[35px] pb-2 max-w-4xl mx-auto">
        <Link href="/" aria-label="Home" className="inline-block">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdas-removebg-preview.png?updatedAt=1779782176718"
            alt="IndoCity"
            className="h-8 sm:h-10 w-auto"
          />
        </Link>
      </header>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
              {cityLabel} <span className="gradient-text">Guides</span>
            </h1>
            <p className="mt-1 text-[13px] text-muted leading-snug">
              Local tour guides — WhatsApp langsung tanpa komisi platform.
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
            <div className="text-[14px] font-extrabold text-black">Belum ada tour guide terdaftar</div>
            <p className="text-[12px] text-muted">Jadi yang pertama — tap "List" di kanan atas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              // Cover priority: explicit cover_image_url > first photo
              // from image_urls > the gallery (mig 0072). Without one
              // the universal card paints a theme-tinted gradient.
              const cover = r.cover_image_url
                ?? (r.image_urls && r.image_urls.length > 0 ? r.image_urls[0] : null)
                ?? (r.gallery_image_urls && r.gallery_image_urls.length > 0 ? r.gallery_image_urls[0] : null)

              // Mini portfolio thumb row pulls from image_urls first
              // (tour-guide's original storage), falls back to the
              // universal gallery field.
              const thumbs = (r.image_urls && r.image_urls.length > 0
                ? r.image_urls
                : r.gallery_image_urls ?? []).slice(0, 3)

              // Primary service drives the specialty pill (e.g.
              // "Cultural", "Hiking"). Falls back to bike brand when
              // services is empty.
              const primaryService = (r.services && r.services.length > 0) ? r.services[0] : null
              const specialty = primaryService
                ? primaryService.charAt(0).toUpperCase() + primaryService.slice(1)
                : (r.bike_brand ? `${r.bike_brand} Bike` : null)

              // Subline: top language + day rate so the credibility
              // signal sits one line under the city.
              const sublineBits: string[] = []
              const topLang = (r.languages ?? [])
                .map((code) => getLanguageByCode(code))
                .find((l): l is NonNullable<typeof l> => l !== null)
              if (topLang) sublineBits.push(`${topLang.flag} ${topLang.label}`)
              if (r.day_rate_idr != null)
                sublineBits.push(`Rp ${r.day_rate_idr.toLocaleString('id-ID')}/day`)

              const bottomItems: UniversalProviderCardBottomItem[] = []
              if (r.bike_brand)
                bottomItems.push({ key: 'bike', icon: 'bike', label: r.bike_brand })
              bottomItems.push({
                key: 'fuel',
                icon: 'fuel',
                label: r.fuel_included ? 'Fuel inc.' : 'Fuel excl.',
              })
              // Languages count helps customers scan multilingual guides
              // quickly without needing the full list.
              const langCount = (r.languages ?? []).length
              if (langCount > 1)
                bottomItems.push({ key: 'lang', icon: 'globe', label: `${langCount} langs` })

              return (
                <UniversalProviderCard
                  key={r.id}
                  href={`/tour/${r.slug}`}
                  displayName={r.name}
                  city={r.city ? r.city.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null}
                  subline={sublineBits.length ? sublineBits.join(' · ') : null}
                  bio={r.notes ?? null}
                  coverImageUrl={cover}
                  profileImageUrl={r.image_urls?.[0] ?? null}
                  availabilityDot={r.availability}
                  rating={(r.is_mock || r.review_count > 0) ? (r.rating ?? null) : null}
                  specialtyLabel={specialty}
                  portfolioThumbs={thumbs}
                  bottomItems={bottomItems}
                  ctaLabel="Profile"
                  variant="light"
                />
              )
            })}
          </div>
        )}

        {/* Why also feed: TOUR_SERVICES referenced statically so build doesn't tree-shake the import. */}
        <div className="hidden">{TOUR_SERVICES.length}</div>
      </div>
    </main>
  )
}
