'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import AppDrawer, { AppDrawerTrigger } from './AppDrawer'

// App header — brand on the left, dynamic right action:
//   • Driver-area pages (/dashboard/*, /profile, /pricing, /services,
//     /onboarding) → burger that opens the driver-only side drawer
//   • Everywhere else (customer marketplace, places, rentals, legal,
//     landing) → Home icon back to the marketplace
//
// The driver drawer never renders on customer-facing surfaces.

const DRIVER_ROUTE_PREFIXES     = ['/dashboard', '/profile', '/services', '/onboarding']
const PARTNER_ROUTE_PREFIXES    = ['/dashboard/partner', '/partners']
const MASSAGE_ROUTE_PREFIXES    = ['/dashboard/massage', '/massage']
const BEAUTICIAN_ROUTE_PREFIXES = ['/dashboard/beautician', '/beautician']
const LAUNDRY_ROUTE_PREFIXES    = ['/dashboard/laundry',    '/laundry']
const HANDYMAN_ROUTE_PREFIXES   = ['/dashboard/handyman',   '/handyman']
const HOME_CLEAN_ROUTE_PREFIXES = ['/dashboard/home-clean', '/home-clean']
// Tour Guide & Rentals: keep the public marketplaces (/tour and /rent)
// drawer-free for customers; only the dashboard + listing-creation flows
// open the provider drawer.
const TOUR_GUIDE_ROUTE_PREFIXES = ['/dashboard/tour-guide', '/tour/list']
const RENTAL_ROUTE_PREFIXES     = ['/dashboard/rentals',    '/rent/list']

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

function isMassageRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return MASSAGE_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isBeauticianRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return BEAUTICIAN_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isLaundryRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return LAUNDRY_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isHandymanRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return HANDYMAN_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isHomeCleanRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return HOME_CLEAN_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isPartnerRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return PARTNER_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isTourGuideRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return TOUR_GUIDE_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}
function isRentalRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return RENTAL_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}

function isDriverRoute(pathname: string | null): boolean {
  if (!pathname) return false
  if (isPartnerRoute(pathname))    return false
  if (isMassageRoute(pathname))    return false
  if (isBeauticianRoute(pathname)) return false
  if (isLaundryRoute(pathname))    return false
  if (isHandymanRoute(pathname))   return false
  if (isHomeCleanRoute(pathname))  return false
  if (isTourGuideRoute(pathname))  return false
  if (isRentalRoute(pathname))     return false
  return DRIVER_ROUTE_PREFIXES.some((p) => matches(pathname, p))
}

type Variant = 'driver' | 'partner' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home-clean' | 'tour-guide' | 'rentals'

export default function AppNav() {
  const path = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const partnerRoute    = isPartnerRoute(path)
  const massageRoute    = isMassageRoute(path)
  const beauticianRoute = isBeauticianRoute(path)
  const laundryRoute    = isLaundryRoute(path)
  const handymanRoute   = isHandymanRoute(path)
  const homeCleanRoute  = isHomeCleanRoute(path)
  const tourGuideRoute  = isTourGuideRoute(path)
  const rentalRoute     = isRentalRoute(path)
  const driverRoute     = isDriverRoute(path)
  const showDrawer = partnerRoute || massageRoute || beauticianRoute || laundryRoute || handymanRoute || homeCleanRoute || tourGuideRoute || rentalRoute || driverRoute
  const variant: Variant =
    partnerRoute    ? 'partner' :
    massageRoute    ? 'massage' :
    beauticianRoute ? 'beautician' :
    laundryRoute    ? 'laundry' :
    handymanRoute   ? 'handyman' :
    homeCleanRoute  ? 'home-clean' :
    tourGuideRoute  ? 'tour-guide' :
    rentalRoute     ? 'rentals' :
    'driver'

  // Mark the body so driver-only CSS (solid black containers, 14px text
  // floor, 18px headers) can scope without affecting customer pages. The
  // partner / massage / tour-guide / rentals surfaces have their own
  // styling so we don't apply the 'driver' flag to them.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if      (driverRoute)      document.body.dataset.surface = 'driver'
    else if (partnerRoute)     document.body.dataset.surface = 'partner'
    else if (massageRoute)     document.body.dataset.surface = 'massage'
    else if (beauticianRoute)  document.body.dataset.surface = 'beautician'
    else if (laundryRoute)     document.body.dataset.surface = 'laundry'
    else if (handymanRoute)    document.body.dataset.surface = 'handyman'
    else if (homeCleanRoute)   document.body.dataset.surface = 'home-clean'
    else if (tourGuideRoute)   document.body.dataset.surface = 'tour-guide'
    else if (rentalRoute)      document.body.dataset.surface = 'rentals'
    else delete document.body.dataset.surface
    return () => { delete document.body.dataset.surface }
  }, [driverRoute, partnerRoute, massageRoute, beauticianRoute, laundryRoute, handymanRoute, homeCleanRoute, tourGuideRoute, rentalRoute])

  return (
    <>
      <header
        className="sticky top-0 z-40 pt-safe"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Brand block (logo + "IndoCity" text) removed per founder
              request. The header bar stays so the right action (drawer
              / Home icon) keeps its sticky position; the empty div
              preserves the flex justify-between so the right action
              remains pinned to the right edge. */}
          <div aria-hidden />
          {showDrawer ? (
            <AppDrawerTrigger onClick={() => setDrawerOpen(true)} variant={variant} />
          ) : (
            <Link
              href="/"
              aria-label="Home"
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition"
            >
              <Home className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </header>
      {showDrawer && (
        <AppDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          variant={variant}
        />
      )}
    </>
  )
}
