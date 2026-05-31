// Thin branded strip pinned to the top of every CityDrivers vehicle
// dashboard (bike rider / car driver / truck driver / bus driver). Signals
// that this surface lives under the CityDrivers sub-brand of CityDrivers —
// distinct visual identity from the service-provider verticals
// (beautician / handyman / laundry / etc.) which use the CityDrivers wordmark.
//
// Render order in each /dashboard/{vehicle}/layout.tsx: this strip first,
// then the page children. Non-sticky so it scrolls with the page.

import Link from 'next/link'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

export default function CityDriversBrandStrip({ subtitle }: { subtitle?: string }) {
  return (
    <div
      className="w-full"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E4E7' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <Link href="/cityriders" className="flex items-center gap-2 active:scale-95 transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGO_URL}
            alt="CityDrivers"
            className="h-7 w-auto object-contain"
            loading="eager"
          />
          <span className="text-[14px] font-black tracking-tight" style={{ color: '#0A0A0A' }}>
            CityDrivers
          </span>
        </Link>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.15em]" style={{ color: '#52525B' }}>
          {subtitle ?? 'Driver dashboard'}
        </span>
      </div>
    </div>
  )
}
