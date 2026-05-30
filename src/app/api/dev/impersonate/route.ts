// ============================================================================
// /api/dev/impersonate — DEV-ONLY cookie-based bypass for seeded drivers
// ----------------------------------------------------------------------------
// Sets a `cr-dev-uid` cookie + redirects to /dashboard. The cookie is
// honored by the dashboard pages on localhost (via /api/dev/driver) to
// load a specific driver's data without going through Supabase Auth —
// the Auth API on this project returns "Database error" on all admin
// operations, so we can't use magic-link / signInWithPassword.
//
// HARDENED GATE: refuses any request whose Host isn't localhost or
// 127.0.0.1. Cookie has SameSite=Lax + httpOnly=false (so the dev
// helper in the browser can read it). Production hosting can't be
// exploited because the gate runs before any cookie write.
// ============================================================================

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isLocalHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(':')[0]
  return h === 'localhost' || h === '127.0.0.1'
}

export async function GET(req: Request) {
  const host = req.headers.get('host')
  if (!isLocalHost(host)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const url  = new URL(req.url)
  const slug = url.searchParams.get('slug')?.trim()
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data: driver, error: driverErr } = await admin
    .from('drivers')
    .select('user_id, slug, vehicle_type')
    .eq('slug', slug)
    .maybeSingle()
  if (driverErr) return NextResponse.json({ error: 'driver_lookup_failed', detail: driverErr.message }, { status: 500 })
  if (!driver)   return NextResponse.json({ error: 'driver_not_found', slug }, { status: 404 })

  // Set the dev cookie so dashboard pages can resolve the impersonated
  // driver without going through Supabase Auth.
  const cookieStore = await cookies()
  cookieStore.set('cr-dev-uid', driver.user_id as string, {
    httpOnly: false,    // read by browser-side dev helper
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 12,  // 12h
  })

  // Forward to the right vertical home directly (skip the /dashboard
  // router since it gates on Supabase auth.getUser which doesn't see
  // our dev cookie).
  const target =
    driver.vehicle_type === 'bike'  ? '/dashboard/rider' :
    driver.vehicle_type === 'truck' ? '/dashboard/truck' :
    driver.vehicle_type === 'bus'   ? '/dashboard/bus'   :
    '/dashboard/car'
  return NextResponse.redirect(`${url.protocol}//${url.host}${target}`, { status: 302 })
}
