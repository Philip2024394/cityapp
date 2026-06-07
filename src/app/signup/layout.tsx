import type { Metadata } from 'next'
import { headers } from 'next/headers'

// /signup layout — host-aware branding.
//
// Layouts in Next 15 don't receive `searchParams`, so we brand purely
// by host. CityDrivers branding is scoped to citydrivers.id; every
// other host (kita2u.com, localhost dev, vercel previews) brands as
// Kita2u. Kita2u verticals route here via /signup?vertical=<id> but
// the host is always kita2u, so this is sufficient.

const CITYRIDERS_HOSTS = new Set(['citydrivers.id', 'www.citydrivers.id'])

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase().split(':')[0]
  const isKita2u = !CITYRIDERS_HOSTS.has(host)

  return isKita2u
    ? {
        title:           { absolute: 'Daftar / Masuk · Kita2u' },
        applicationName: 'Kita2u',
        description:     'Buat akun Kita2u — daftar profil bisnis kamu dalam beberapa menit.',
      }
    : {
        title:           { absolute: 'Sign up — CityDrivers' },
        applicationName: 'CityDrivers',
        description:     'Create your CityDrivers driver account. Bike, car, truck, minibus, or jeep — one signup per vehicle vertical.',
      }
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
