'use client'
import Link from 'next/link'
import { Bike, ArrowRight } from 'lucide-react'

// ============================================================================
// DeliveryViaCityDriversCard
// ----------------------------------------------------------------------------
// Renders on /places/[slug] when `delivery_enabled` is true on the row.
// Customer taps the CTA → /cari opens with this venue's address pre-filled
// as pickup. Customer types their own dropoff in /cari, picks a specific
// driver from the existing list (each row shows that driver's published
// Rp/km × distance), and opens WhatsApp with the driver — order context
// + addresses pre-typed in the message.
//
// PM 12/2019 directory posture stays intact:
//   - Customer picks the driver explicitly (no platform appointment).
//   - Each driver's estimate is THEIR published rate × distance, not a
//     platform-set fare.
//   - "Pick up my order" is a WhatsApp handoff (no booking record in our
//     DB).
//   - Cart from the place page becomes a pre-typed WA message (no DB
//     order row, no payment processed).
//
// See memory `project_kita2u_to_citydrivers_handoff.md` for the canonical
// 3-rule pattern this implements.
// ============================================================================

const BRAND_YELLOW = '#FACC15'
const BRAND_INK    = '#0A0A0A'

export default function DeliveryViaCityDriversCard({
  venueName, venueAddress, venueLat, venueLng,
}: {
  venueName:    string
  venueAddress: string | null
  venueLat:     number | null
  venueLng:     number | null
}) {
  // Build the deep link to /cari with pickup pre-filled. /cari already
  // accepts pLat, pLng, pName, service params (see src/app/cari/page.tsx
  // line ~181: "Optional ?pLat=&pLng=&dLat=&dLng= handoff").
  const params = new URLSearchParams()
  params.set('service', 'food')                  // bike-side service category
  if (venueLat != null && Number.isFinite(venueLat)) params.set('pLat', String(venueLat))
  if (venueLng != null && Number.isFinite(venueLng)) params.set('pLng', String(venueLng))
  if (venueName) params.set('pName', venueName)
  const href = `/cari?${params.toString()}`

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5 space-y-3"
      style={{
        background:  'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
        borderColor: BRAND_YELLOW,
        boxShadow:   '0 4px 16px rgba(250,204,21,0.18)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: BRAND_YELLOW, color: BRAND_INK }}
        >
          <Bike className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-black leading-tight" style={{ color: BRAND_INK }}>
            Need delivery?
          </h3>
          <p className="text-[12.5px] leading-snug mt-1" style={{ color: '#52525B' }}>
            <strong style={{ color: BRAND_INK }}>{venueName}</strong> accepts CityDrivers pickups.
            Tap below, type your dropoff, pick the driver you want — agree the fare with them on WhatsApp.
            You pay {venueName} direct on pickup.
          </p>
        </div>
      </div>

      {venueAddress && (
        <div className="rounded-xl bg-white/70 border border-yellow-200 px-3 py-2 text-[11.5px] leading-snug" style={{ color: '#52525B' }}>
          <strong style={{ color: BRAND_INK }}>Pickup address:</strong>{' '}
          {venueAddress}
        </div>
      )}

      <Link
        href={href}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-[14px] font-extrabold active:scale-[0.98] transition"
        style={{
          background:  BRAND_YELLOW,
          color:       BRAND_INK,
          minHeight:   48,
          boxShadow:   '0 6px 18px rgba(250,204,21,0.45)',
        }}
      >
        See drivers near {venueName}
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </Link>

      <p className="text-[11px] text-center italic" style={{ color: '#71717A' }}>
        Powered by CityDrivers · Each driver publishes their own per-km rate · Final fare agreed with the driver on WhatsApp
      </p>
    </section>
  )
}
