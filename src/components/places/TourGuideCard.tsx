'use client'
import Link from 'next/link'
import { MessageCircle, Star, MapPinned } from 'lucide-react'
import { TOUR_LANGUAGES, type TourLanguage } from '@/data/tourLanguages'
import type { Rider } from '@/types/rider'

// ============================================================================
// TourGuideCard — visual clone of BusinessDriverCard on /business with
// two specialisations for the tour-guide context:
//   • Bottom-left headline = "Rp 350,000 / day (8h)"
//   • Sub-line = language flag chips
//   • Contact CTA opens WhatsApp with a tour-specific Bahasa template
// ============================================================================

function rateLabel(idr?: number | null): string {
  if (!idr) return 'Rate on request'
  return `Rp ${idr.toLocaleString('en-US')}`
}

function pickLanguages(codes: string[] | undefined): TourLanguage[] {
  if (!codes || codes.length === 0) return []
  return codes
    .map((c) => TOUR_LANGUAGES.find((l) => l.code === c))
    .filter((l): l is TourLanguage => !!l)
}

export default function TourGuideCard({ driver }: { driver: Rider }) {
  const languages = pickLanguages(driver.tourGuideLanguages)
  const waText = encodeURIComponent(
    `Halo ${driver.name}! Saya tertarik tour 1 hari penuh (8 jam) bersama Anda lewat City Rider — bisa diskusi rute dan tempat-tempat yang bisa kita kunjungi?`,
  )
  const waLink = driver.whatsappE164
    ? `https://wa.me/${driver.whatsappE164.replace(/[^\d]/g, '')}?text=${waText}`
    : null

  return (
    <article className="card card-driver relative overflow-hidden animate-[fadeUp_0.4s_ease-out_both]">
      <img
        src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2018,%202026,%2001_32_57%20AM.png"
        alt=""
        className="block w-full h-auto"
        loading="lazy"
      />

      {/* Driver name ribbon — flush top-left edge */}
      <div className="absolute top-0 left-0 z-10 max-w-[60%]">
        <span className="ribbon-cheapest flex items-center min-w-0">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdaaaaaaa-removebg-preview.png"
            alt=""
            className="h-5 w-auto shrink-0"
          />
          <span className="truncate min-w-0">{driver.name}</span>
        </span>
      </div>

      {/* Tour-guide tag in the top-right corner — replaces the bike model */}
      <div className="absolute top-3 right-[28px] z-10 text-right max-w-[42%]">
        <div className="text-[14px] font-extrabold text-black leading-tight truncate uppercase tracking-wide">
          Tour guide
        </div>
        <div className="text-[12px] font-medium text-black/80 leading-tight mt-0.5 flex items-center justify-end gap-1">
          <MapPinned className="w-3 h-3" />
          {driver.city || 'Indonesia'}
        </div>
      </div>

      {/* Avatar + rating chip with frosted scrim — same as B2B / customer card */}
      <Link
        href={`/r/${driver.slug}`}
        aria-label={`View ${driver.name}'s profile`}
        className="absolute left-4 top-10 flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand/60 rounded-2xl z-10"
      >
        <span className="relative shrink-0">
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="w-[58px] h-[58px] rounded-2xl object-cover ring-2 ring-white/80"
          />
          <span className="dot-online absolute bottom-1 right-1 ring-2 ring-white" aria-label="Online" />
        </span>
        {driver.rating != null && (
          <span
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-bold leading-none"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 shrink-0" aria-hidden />
            <span className="text-black">{driver.rating.toFixed(1)}</span>
            {driver.trips != null && (
              <span className="text-[12px] text-gray-700 ml-0.5 font-semibold">
                ({driver.trips.toLocaleString('en-US')} trips)
              </span>
            )}
          </span>
        )}
      </Link>

      {/* Bottom info panel — day rate as the bold bottom-left headline,
          languages as flag chips on the sub-line. Contact CTA matches the
          /business card (black gradient + yellow icon chip). */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="relative px-3.5 pt-2.5 pb-3 pointer-events-auto">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col leading-none drop-shadow min-w-0">
              <span className="text-[17px] font-extrabold text-gray-700 whitespace-nowrap">
                {rateLabel(driver.tourGuideDayRateIdr)}
              </span>
              <span className="mt-1.5 text-[12px] font-bold text-gray-700 flex items-center gap-1.5 flex-wrap">
                <span className="opacity-80">/ day (8h)</span>
                {languages.length > 0 && <span aria-hidden className="opacity-50">·</span>}
                {languages.map((l) => (
                  <span key={l.code} title={l.label} aria-label={l.label}>
                    {l.flag}
                  </span>
                ))}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <img
                src="https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png"
                alt=""
                aria-hidden
                loading="lazy"
                className="h-9 w-auto"
                style={{
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
                  transform: 'translateY(-3px)',
                }}
              />
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Contact ${driver.name} for a day tour`}
                  className="h-[39px] min-w-[118px] pl-2.5 pr-1 rounded-full flex items-center justify-between gap-1 border border-black active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-brand/60"
                  style={{
                    background: 'linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 100%)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
                  }}
                >
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                    Contact
                  </span>
                  <span
                    aria-hidden
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                      boxShadow: '0 0 8px rgba(250,204,21,0.55)',
                    }}
                  >
                    <MessageCircle className="w-3 h-3 text-black" strokeWidth={3} />
                  </span>
                </a>
              ) : (
                <button
                  disabled
                  className="h-[39px] min-w-[118px] px-3 rounded-full text-[12px] font-bold text-muted opacity-50 border border-black/30"
                  style={{ background: 'rgba(255,255,255,0.50)' }}
                >
                  No WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
