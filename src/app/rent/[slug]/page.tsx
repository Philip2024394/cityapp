import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, MessageCircle, Bike, Banknote } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { getServerSupabase } from '@/lib/supabase/server'

// Public detail page for an approved bike rental listing. Server-rendered
// for SEO. status='approved' filter prevents pending/rejected leakage.

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  slug: string
  brand: string
  model: string
  year: number | null
  cc: number | null
  transmission: string
  color: string | null
  description: string | null
  image_urls: string[] | null
  daily_price_idr: number | null
  weekly_price_idr: number | null
  monthly_price_idr: number | null
  security_deposit_idr: number | null
  driver_rate_per_day_idr: number | null
  helmet_count: number | null
  raincoat_count: number | null
  has_phone_holder: boolean
  has_phone_charger: boolean
  has_delivery_box: boolean
  delivers_to_hotel: boolean
  delivers_to_villa: boolean
  pickup_dropoff: boolean
  rental_mode: 'self_ride' | 'with_driver' | 'both'
  city: string
  address: string | null
  lat: number
  lng: number
  owner_name: string
  owner_company: string | null
  owner_whatsapp_e164: string
  rating: number | null
  review_count: number | null
}

function idr(n: number | null): string {
  if (n == null) return '—'
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default async function RentalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await getServerSupabase()
  if (!supabase) notFound()

  const { data } = await supabase
    .from('bike_rentals')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()

  if (!data) notFound()
  const r = data as Row

  const photos = r.image_urls ?? []
  const cover = photos[0] ?? null
  const title = `${r.brand} ${r.model}`
  const subtitle = [r.year, r.cc ? `${r.cc}cc` : null, r.transmission].filter(Boolean).join(' · ')

  const waNumber = (r.owner_whatsapp_e164 ?? '').replace(/[^0-9]/g, '')
  const waText = encodeURIComponent(
    `Halo ${r.owner_name}, saya lihat ${title} di City Rider. Bisa cek ketersediaan?`,
  )
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <Link href="/rent" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4">
            <ChevronLeft className="w-4 h-4" />
            Rentals
          </Link>

          {cover && (
            <div className="rounded-2xl overflow-hidden bg-black/60 border border-white/10 mb-4">
              <img src={cover} alt={title} className="w-full aspect-[16/10] object-cover" />
            </div>
          )}

          <header className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
                {r.rental_mode === 'self_ride' ? 'Self-ride' : r.rental_mode === 'with_driver' ? 'With driver' : 'Self / driver'}
              </span>
              {r.rating != null && (
                <span className="text-[12px] text-muted">· ★ {r.rating.toFixed(1)} ({r.review_count ?? 0})</span>
              )}
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-[13px] text-muted mt-1">{subtitle}{r.color ? ` · ${r.color}` : ''}</p>
            {r.address && (
              <p className="text-[13px] text-muted mt-2 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{r.address}</span>
              </p>
            )}
          </header>

          {/* Pricing tiles */}
          <section className="grid grid-cols-3 gap-2 mb-4">
            <PriceTile label="Daily" value={idr(r.daily_price_idr)} />
            <PriceTile label="Weekly" value={r.weekly_price_idr ? idr(r.weekly_price_idr) : '—'} />
            <PriceTile label="Monthly" value={r.monthly_price_idr ? idr(r.monthly_price_idr) : '—'} />
          </section>

          {(r.security_deposit_idr || r.driver_rate_per_day_idr) && (
            <section className="card p-4 mb-4 space-y-1">
              {r.security_deposit_idr && (
                <p className="text-[13px] text-ink/90">
                  <Banknote className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-muted" />
                  Deposit: <strong>{idr(r.security_deposit_idr)}</strong>
                </p>
              )}
              {r.driver_rate_per_day_idr && (
                <p className="text-[13px] text-ink/90">
                  <Bike className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-muted" />
                  Driver rate: <strong>{idr(r.driver_rate_per_day_idr)}/day</strong>
                </p>
              )}
            </section>
          )}

          {r.description && (
            <section className="card p-4 mb-4">
              <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2">About this bike</h2>
              <p className="text-[14px] leading-relaxed text-ink/90 whitespace-pre-wrap">{r.description}</p>
            </section>
          )}

          {photos.length > 1 && (
            <section className="mb-4">
              <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2 px-1">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(1).map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Included */}
          <section className="card p-4 mb-4">
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-3">Included</h2>
            <ul className="space-y-1.5 text-[13px] text-ink/90">
              <li>× {r.helmet_count ?? 0} helmets</li>
              <li>× {r.raincoat_count ?? 0} raincoats</li>
              {r.has_phone_holder && <li>Phone holder</li>}
              {r.has_phone_charger && <li>Phone charger</li>}
              {r.has_delivery_box && <li>Delivery box</li>}
              {r.pickup_dropoff && <li>Pickup / dropoff service</li>}
              {r.delivers_to_hotel && <li>Delivers to hotel</li>}
              {r.delivers_to_villa && <li>Delivers to villa</li>}
            </ul>
          </section>

          {/* SIM warning — required disclosure for the directory posture */}
          <section
            className="card p-4 mb-4"
            style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.30)' }}
          >
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#F97316' }}>
              Before you ride
            </h2>
            <p className="text-[13px] text-ink/90 leading-snug">
              You must hold a valid Indonesian SIM C or International Driving Permit
              (motorbike category) to ride legally. Police checks are common in Bali
              and Yogyakarta — fines and bike confiscation are real risks for
              unlicensed riders.
            </p>
          </section>

          <section className="card p-4 mb-4">
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2">Contact</h2>
            <p className="text-[13px] text-ink/90 mb-2">
              {r.owner_company ? <strong>{r.owner_company}</strong> : <strong>{r.owner_name}</strong>}
              {r.owner_company && <> · {r.owner_name}</>}
            </p>
            <div className="space-y-2">
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99]"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp {r.owner_name}
                </a>
              ) : (
                <p className="text-[13px] text-muted">No phone provided yet.</p>
              )}
              {r.owner_whatsapp_e164 && (
                <a
                  href={`tel:${r.owner_whatsapp_e164}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-ink font-extrabold text-[13px] uppercase tracking-wider active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[13px] font-bold text-brand"
              >
                Open pickup in Google Maps →
              </a>
            </div>
          </section>

          <PlatformDisclaimer variant="compact" />
        </div>
      </main>
    </>
  )
}

function PriceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim">{label}</div>
      <div className="text-[13px] font-extrabold text-ink mt-1">{value}</div>
    </div>
  )
}
