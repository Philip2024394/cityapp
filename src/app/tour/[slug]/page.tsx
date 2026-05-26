import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Star } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { findTourService } from '@/data/tourServices'
import { getLanguageByCode } from '@/data/tourLanguages'
import TourContactButton from '@/components/tour/TourContactButton'
import ProfileGallery from '@/components/profile/ProfileGallery'
import ProfileSlugIslands from '@/components/profile/ProfileSlugIslands'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cityriders.id'

export const dynamic = 'force-dynamic'

// Imagekit hero overlay — the transparent PNG the user supplied. Sits
// behind the Contact button area on the right side of the profile card.
const HERO_OVERLAY =
  'https://ik.imagekit.io/nepgaxllc/Untitledsss-removebg-preview.png?updatedAt=1779200329344'

type Row = {
  id: string
  slug: string
  name: string
  whatsapp_e164: string
  city: string
  address: string | null
  services: string[]
  languages: string[]
  day_rate_idr: number | null
  notes: string | null
  rating: number | null
  review_count: number
  // mig 0072 universal profile fields
  cover_image_url: string | null
  gallery_image_urls: string[] | null
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  operating_hours: Record<string, string> | null
}

function waLink(e164: string, name: string): string {
  const phone = e164.replace(/[^\d]/g, '')
  const text = encodeURIComponent(
    `Halo ${name}, saya tertarik untuk hire kamu sebagai tour guide via City Riders. Apakah masih available?`,
  )
  return `https://wa.me/${phone}?text=${text}`
}

export default async function TourGuideDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = getAdminSupabase()
  if (!admin) return <p className="p-6 text-muted">Server not configured.</p>

  const { data: realRow } = await admin
    .from('tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, address, services, languages, day_rate_idr, notes, rating, review_count, cover_image_url, gallery_image_urls, instagram_url, tiktok_url, facebook_url, operating_hours')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()

  // Fall back to mock_tour_guide_listings — those rows appear on the
  // marketplace alongside real guides, so the detail page must serve
  // their slugs too. Mock table has no address / review_count / mig 0072
  // universal fields; we coerce to the same Row shape with nulls.
  let row = realRow
  if (!row) {
    const { data: mockRow } = await admin
      .from('mock_tour_guide_listings')
      .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating')
      .eq('slug', slug)
      .is('mock_hidden_at', null)
      .maybeSingle()
    if (mockRow) {
      row = {
        ...mockRow,
        address:            null,
        review_count:       0,
        cover_image_url:    null,
        gallery_image_urls: null,
        instagram_url:      null,
        tiktok_url:         null,
        facebook_url:       null,
        operating_hours:    null,
      }
    }
  }

  if (!row) notFound()
  const r = row as Row

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24 space-y-4">
        <Link href="/tour" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ArrowLeft className="w-4 h-4" /> All tour guides
        </Link>

        {/* HERO CARD — name + city + rating on top */}
        <header className="card p-4 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
                {r.name}
              </h1>
              <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted">
                <MapPin className="w-3.5 h-3.5" /> <span className="capitalize">{r.city.replace(/-/g, ' ')}</span>
                {r.address && <span className="truncate">· {r.address}</span>}
              </div>
            </div>
            {r.rating != null && r.review_count > 0 && (
              <div className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black text-brand text-[12px] font-extrabold">
                <Star className="w-3 h-3 fill-current" strokeWidth={0} />
                {r.rating.toFixed(1)}
                <span className="text-muted text-[10px] font-bold">({r.review_count})</span>
              </div>
            )}
          </div>
          {r.day_rate_idr != null && (
            <div className="text-[14px] font-extrabold text-ink">
              Rp {r.day_rate_idr.toLocaleString('id-ID')} <span className="text-muted font-bold text-[12px]">/ hari (8 jam)</span>
            </div>
          )}
        </header>

        {/* SERVICES + CONTACT CARD — hero image overlays the Contact button on
            the LEFT, Services header + list on the RIGHT. */}
        <section className="card p-4 overflow-hidden relative">
          <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
            {/* LEFT — image overlay on top, Contact button below */}
            <div className="relative flex flex-col items-center gap-2">
              <img
                src={HERO_OVERLAY}
                alt={`${r.name} avatar`}
                className="w-[120px] h-[120px] object-contain"
                loading="eager"
              />
              <TourContactButton
                href={waLink(r.whatsapp_e164, r.name)}
                phone={r.whatsapp_e164}
                listingId={r.id}
                name={r.name}
              />
            </div>

            {/* RIGHT — Services header + list */}
            <div className="min-w-0 space-y-2">
              <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-brand">
                Services
              </h2>
              <ul className="space-y-1.5">
                {(r.services ?? []).map((sid) => {
                  const s = findTourService(sid)
                  if (!s) return null
                  return (
                    <li
                      key={sid}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-extrabold text-ink"
                      style={{
                        background: 'rgba(250,204,21,0.10)',
                        border: '1px solid rgba(250,204,21,0.30)',
                      }}
                    >
                      <span aria-hidden className="text-[16px]">{s.emoji}</span>
                      <span>{s.label}</span>
                    </li>
                  )
                })}
                {(r.services ?? []).length === 0 && (
                  <li className="text-[12px] text-muted italic">No services listed yet.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* LANGUAGES */}
        {(r.languages ?? []).length > 0 && (
          <section className="card p-4 space-y-2">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-muted">Languages</div>
            <div className="flex flex-wrap gap-1.5">
              {(r.languages ?? []).map((code) => {
                const l = getLanguageByCode(code)
                if (!l) return null
                return (
                  <span key={code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-extrabold text-ink" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <span aria-hidden>{l.flag}</span> {l.label}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* NOTES */}
        {r.notes && (
          <section className="card p-4 space-y-2">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-muted">About</div>
            <p className="text-[13px] text-ink leading-snug whitespace-pre-wrap">{r.notes}</p>
          </section>
        )}

        {/* GALLERY — mig 0072 universal field, capped at 12 by DB CHECK */}
        <ProfileGallery photos={r.gallery_image_urls ?? []} title="Foto" />

        {/* Client island — view tracker, social chips, operating hours,
            share-sheet trigger. Renders nothing for fields not set. */}
        <ProfileSlugIslands
          providerType="tour_guide"
          providerId={r.id}
          shareUrl={`${SITE_URL}/tour/${r.slug}`}
          shareName={r.name}
          shareText={`Lihat tour guide ${r.name} di City Riders:`}
          socials={{ instagram: r.instagram_url, tiktok: r.tiktok_url, facebook: r.facebook_url }}
          hours={r.operating_hours}
        />
      </main>
    </>
  )
}
