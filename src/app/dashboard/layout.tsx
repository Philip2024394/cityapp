// /dashboard layout — neutral pass-through. The global PageBackground
// (solid white) is already applied at the root layout, so dashboard
// pages render on white by default.
//
// All dashboard routes are auth-gated (sub-layouts call `cookies()` via
// `getCurrentUser`). Marking the whole subtree dynamic here so we never
// accidentally cache a signed-in user's dashboard at the CDN.
//
// We mount <TrialCountdownBanner /> here so EVERY dashboard sub-page
// (rider/car/beautician/handyman/laundry/massage/home-clean/tour-guide/
// places/rentals/property/partner/...) gets the trial countdown for free
// without per-vertical wiring. The banner self-gates: it renders `null`
// for paid / expired / signed-out users. CityRiders pages live under
// /cityriders (not /dashboard), so they don't render this layout — no
// host check needed.
import TrialCountdownBanner from '@/components/account/TrialCountdownBanner'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TrialCountdownBanner />
      {children}
    </>
  )
}
