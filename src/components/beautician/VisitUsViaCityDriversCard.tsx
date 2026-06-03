'use client'
import { Bike, Car as CarIcon, ArrowRight } from 'lucide-react'

// ============================================================================
// VisitUsViaCityDriversCard
// ----------------------------------------------------------------------------
// Renders on /beautician/[slug] when beautician_providers.visit_us_enabled is
// true. Customer picks Bike or Car → /cari/rider opens with the SALON
// address pre-filled as dropoff. The customer's GPS is read on click to
// pre-fill pickup so /cari lands ready-to-book. If GPS is denied / not
// supported, falls back to /cari without pickup (customer types it there).
//
// Inverse of the places.delivery_enabled flow (which fills PICKUP at the
// venue). For service verticals the customer comes TO the merchant, so
// dropoff is the salon and pickup is the customer.
//
// Two CTAs side-by-side: Bike (service=person) and Car (service=car). The
// customer chooses based on weather / luggage / mood — same decision they
// make on /cari anyway, just surfaced one tap earlier.
//
// PM 12/2019 directory posture intact (see memory
// `project_kita2u_to_citydrivers_handoff.md`):
//   - Customer picks the specific driver on /cari (no platform appointment)
//   - Driver's published Rp/km × distance shown per-driver, not a platform fare
//   - WhatsApp handoff from /cari's driver list (no DB booking record)
//   - Customer pays driver direct on arrival (no fund custody)
// ============================================================================

const BRAND_INK = '#0A0A0A'

export default function VisitUsViaCityDriversCard({
  salonName, salonLat, salonLng, themeColor,
}: {
  salonName: string
  salonLat:  number
  salonLng:  number
  /** Salon's theme accent — provides the brand colour for the card frame
   *  + the Bike pill. Bike uses theme, Car uses black so the two CTAs are
   *  visually distinct. */
  themeColor: string
}) {
  function go(service: 'person' | 'car') {
    const base = `/cari/rider?service=${service}&dLat=${salonLat}&dLng=${salonLng}&dName=${encodeURIComponent(salonName)}`
    const fallback = () => { window.location.href = base }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fallback()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pLat = pos.coords.latitude.toFixed(6)
        const pLng = pos.coords.longitude.toFixed(6)
        window.location.href = `${base}&pLat=${pLat}&pLng=${pLng}&pName=${encodeURIComponent('My location')}`
      },
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5 space-y-3"
      style={{
        background:  'linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%)',
        borderColor: themeColor,
        boxShadow:   '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div>
        <h3 className="text-[15px] font-black leading-tight" style={{ color: BRAND_INK }}>
          Visit us — get a ride
        </h3>
        <p className="text-[12.5px] leading-snug mt-1" style={{ color: '#52525B' }}>
          Tap a vehicle below — we&rsquo;ll send you to <strong style={{ color: BRAND_INK }}>{salonName}</strong>{' '}
          via CityDrivers. Pick the driver you want, agree the fare with them on WhatsApp.
          You pay the driver direct on arrival.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => go('person')}
          className="rounded-xl flex flex-col items-center justify-center gap-1 px-3 py-3 font-extrabold active:scale-[0.98] transition"
          style={{
            background:  themeColor,
            color:       BRAND_INK,
            minHeight:   72,
            boxShadow:   '0 6px 18px rgba(0,0,0,0.10)',
          }}
        >
          <Bike className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-[13px]">Bike</span>
          <span className="text-[10.5px] font-bold opacity-70">cheaper · 1 pax</span>
        </button>
        <button
          type="button"
          onClick={() => go('car')}
          className="rounded-xl flex flex-col items-center justify-center gap-1 px-3 py-3 font-extrabold active:scale-[0.98] transition"
          style={{
            background:  BRAND_INK,
            color:       '#FFFFFF',
            minHeight:   72,
            boxShadow:   '0 6px 18px rgba(0,0,0,0.20)',
          }}
        >
          <CarIcon className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-[13px]">Car</span>
          <span className="text-[10.5px] font-bold opacity-70">AC · up to 4 pax</span>
        </button>
      </div>

      <p className="text-[11px] text-center italic" style={{ color: '#71717A' }}>
        Powered by CityDrivers · Each driver publishes their own per-km rate · Final fare agreed on WhatsApp
        <ArrowRight className="inline w-3 h-3 ml-1 -mt-0.5" />
      </p>
    </section>
  )
}
