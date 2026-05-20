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

const DRIVER_ROUTE_PREFIXES = ['/dashboard', '/profile', '/pricing', '/services', '/onboarding']

function isDriverRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return DRIVER_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function AppNav() {
  const path = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const showDrawer = isDriverRoute(path)

  // Mark the body so driver-only CSS (solid black containers, 14px text
  // floor, 18px headers) can scope without affecting customer pages.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (showDrawer) document.body.dataset.surface = 'driver'
    else delete document.body.dataset.surface
    return () => { delete document.body.dataset.surface }
  }, [showDrawer])

  return (
    <>
      <header className="sticky top-0 z-40 glass-strong pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714"
              alt=""
              className="h-7 w-auto shrink-0"
              loading="eager"
            />
            <div className="text-[15px] font-extrabold tracking-tight truncate">
              City <span className="gradient-text">Rider</span>
            </div>
          </Link>
          {showDrawer ? (
            <AppDrawerTrigger onClick={() => setDrawerOpen(true)} />
          ) : (
            <Link
              href="/"
              aria-label="Home"
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-white/5 active:scale-95 transition"
            >
              <Home className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </header>
      {showDrawer && <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </>
  )
}
