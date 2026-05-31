// /dashboard/partner layout — mounts CityDriversBrandStrip so every partner
// dashboard sub-page (home / bookings / payout / future qr, share, info)
// signals the CityDrivers sub-brand. Mirrors the bike / car / truck / bus
// driver dashboard layout pattern.

import CityDriversBrandStrip from '@/components/dashboard/CityDriversBrandStrip'

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CityDriversBrandStrip subtitle="Partner dashboard" />
      {children}
    </>
  )
}
