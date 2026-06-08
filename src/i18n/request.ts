// Server-side locale resolver — runs once per request before any RSC
// renders. Reads the NEXT_LOCALE cookie; falls back to the default when
// missing or invalid. The resolved locale + the matching message catalog
// flow into every component via getTranslations() / useTranslations().
//
// Host-scoped pruning — when the request hostname is a Kita2u marketplace
// host (kita2u.com / www.kita2u.com), every CityDrivers / driver-directory
// translation namespace is stripped from the messages bundle before it is
// handed to next-intl. Without this filter, next-intl serializes the full
// catalog into each server-rendered page (~30 KB of inert driver strings
// inside <script>self.__next_f.push([...])</script>), which is wasted bytes
// for kita2u.com visitors who can never reach a driver route (the
// middleware host-scope gate already 404s those paths).
//
// The list below is the SINGLE source of truth for "driver-only" namespaces.
// Each entry was verified by grepping `src/` for useTranslations / getTranslations
// callers and confirming every caller lives inside a denylisted route
// (/cityriders, /citydrivers, /cari, /drivers, /r, /places, /list-place,
// /car, /truck, /bus, /jeep, /ride, /partners, /alert, /business,
// /dashboard/{rider,car,truck,bus,jeep,partner,places}).

import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'

// Translation namespaces consumed ONLY by CityDrivers / driver-directory
// surfaces. Safe to strip on Kita2u hosts because every caller is a route
// already denied by middleware on kita2u.com.
//
// Verified callers (2026-06-08):
//   landing         → /cityriders/page.tsx
//   driversBike     → /drivers/page.tsx
//   driversCar      → /drivers/car/page.tsx
//   driversTruck    → /drivers/truck/page.tsx
//   driversBus      → /drivers/bus/page.tsx
//   driversJeep     → /drivers/jeep/page.tsx
//   partner         → /cityriders/partner/page.tsx
//   cari            → /cari/page.tsx
//   vehicleProfile  → components/profile/VehicleProfileShell (rendered only
//                     by /r|/car|/truck|/bus|/jeep [slug] + their dashboards)
//   driverProfile   → components/profile/DriverProfileShell (same surfaces)
//   bikeProfileMeta → /r/[slug] metadata
//   carProfileMeta  → /car/[slug] metadata
//   truckProfileMeta→ /truck/[slug] metadata
//   busProfileMeta  → /bus/[slug] metadata
//   jeepProfileMeta → /jeep/[slug] metadata
//   parcel          → /cityriders/parcel
//
// KEPT (NOT in this list, even though name might look driver-ish):
//   localeSwitcher  → shared <LocaleSwitcher/> (kita2u nav too)
//   verticals       → Kita2u marketplace vertical metadata (food, beautician…)
const CITYDRIVERS_ONLY_NAMESPACES = [
  'landing',
  'driversBike',
  'driversCar',
  'driversTruck',
  'driversBus',
  'driversJeep',
  'partner',
  'cari',
  'vehicleProfile',
  'driverProfile',
  'bikeProfileMeta',
  'carProfileMeta',
  'truckProfileMeta',
  'busProfileMeta',
  'jeepProfileMeta',
  'parcel',
] as const

const KITA2U_HOSTS = new Set(['kita2u.com', 'www.kita2u.com'])

// Mirror of the middleware dev-host override so `pnpm dev` + DEV_HOST_OVERRIDE
// pruning behaves the same way as production. Middleware doesn't propagate
// its override into the downstream request headers, so we re-read the env
// var here (only when actually on localhost).
function resolveHost(rawHost: string): string {
  const host = rawHost.toLowerCase().split(':')[0]
  const isDev = process.env.NODE_ENV !== 'production'
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  if (isDev && isLocal && process.env.DEV_HOST_OVERRIDE) {
    return process.env.DEV_HOST_OVERRIDE.toLowerCase()
  }
  return host
}

export default getRequestConfig(async () => {
  const jar = await cookies()
  const raw = jar.get(LOCALE_COOKIE)?.value
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE

  // Dynamic import means each language's catalog is its own chunk — only
  // the active locale's bytes ship to the request.
  const fullMessages = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>

  const h = await headers()
  const host = resolveHost(h.get('host') || '')
  const isKita2u = KITA2U_HOSTS.has(host)

  if (!isKita2u) {
    return { locale, messages: fullMessages }
  }

  // Shallow clone + delete the driver-only top-level namespaces. Sub-keys
  // are left intact for any host that isn't kita2u.
  const messages: Record<string, unknown> = { ...fullMessages }
  for (const ns of CITYDRIVERS_ONLY_NAMESPACES) {
    delete messages[ns]
  }
  return { locale, messages }
})
