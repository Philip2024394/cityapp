import { headers } from 'next/headers'
import SignupClient from './SignupClient'

// ============================================================================
// /signup — server entry. Reads the host header and resolves the default
// brand (kita2u vs citydrivers) for SSR. Without this the client could only
// learn the host from window.location AFTER hydration — bare /signup on
// kita2u.com would briefly render the CityDrivers role-picker before
// switching, which the founder flagged on 2026-06-07.
// ============================================================================

export const dynamic = 'force-dynamic'

const CITYDRIVERS_HOSTS = new Set(['citydrivers.id', 'www.citydrivers.id'])

export default async function SignupPage() {
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase().split(':')[0]
  const defaultBrand: 'kita2u' | 'citydrivers' =
    CITYDRIVERS_HOSTS.has(host) ? 'citydrivers' : 'kita2u'
  return <SignupClient defaultBrand={defaultBrand} />
}
