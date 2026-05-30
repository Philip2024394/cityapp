// =============================================================================
// /dashboard — vehicle/vertical router (NOT a destination page)
// -----------------------------------------------------------------------------
// The signed-in user lands here from any "Dashboard" link; we detect
// which vertical they belong to (driver vs service provider) and forward
// to the corresponding redesigned dashboard.
//
// Routing precedence:
//   0. DEV BYPASS — when the localhost dev impersonation cookie
//      `cr-dev-uid` is set (see /api/dev/impersonate), look up the
//      driver row by that user_id and forward, skipping Supabase auth.
//   1. Driver row (drivers table) → vehicle_type dictates target:
//        bike   → /dashboard/rider
//        truck  → /dashboard/truck
//        bus    → /dashboard/bus
//        car / minibus / anything else → /dashboard/car
//   2. Service vertical (beautician / handyman / laundry / massage /
//      home-clean / tour-guide / facial / skincare / rentals / property)
//      → /dashboard/<vertical>
//   3. No vertical found → /signup
// =============================================================================

import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SERVICE_TABLE_ROUTING: ReadonlyArray<{ table: string; target: string }> = [
  { table: 'beautician_providers', target: '/dashboard/beautician' },
  { table: 'handyman_providers',   target: '/dashboard/handyman'   },
  { table: 'laundry_providers',    target: '/dashboard/laundry'    },
  { table: 'massage_providers',    target: '/dashboard/massage'    },
  { table: 'home_clean_providers', target: '/dashboard/home-clean' },
  { table: 'tour_guide_listings',  target: '/dashboard/tour-guide' },
  { table: 'facial_providers',     target: '/dashboard/facial'     },
  { table: 'skincare_providers',   target: '/dashboard/skincare'   },
  { table: 'bike_rentals',         target: '/dashboard/rentals'    },
  { table: 'property_listings',    target: '/dashboard/property'   },
]

function targetForVehicleType(vt: string | null | undefined): string {
  if (vt === 'bike')  return '/dashboard/rider'
  if (vt === 'truck') return '/dashboard/truck'
  if (vt === 'bus')   return '/dashboard/bus'
  return '/dashboard/car' // car / minibus / anything else
}

async function isLocalhostHost(): Promise<boolean> {
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase().split(':')[0]
  return host === 'localhost' || host === '127.0.0.1'
}

export default async function DashboardRouter() {
  const admin = getAdminSupabase()

  // 0. DEV BYPASS — localhost-only cookie set by /api/dev/impersonate.
  if (await isLocalhostHost()) {
    const cookieStore = await cookies()
    const devUid = cookieStore.get('cr-dev-uid')?.value
    if (devUid && admin) {
      const { data: devDriver } = await admin
        .from('drivers')
        .select('vehicle_type')
        .eq('user_id', devUid)
        .maybeSingle()
      if (devDriver?.vehicle_type) {
        redirect(targetForVehicleType(devDriver.vehicle_type as string))
      }
      // dev cookie present but no driver row — stay in dev mode rather
      // than bouncing to /signup and re-entering the middleware loop.
      // Forward to /dashboard/rider so the page-level dev fetch can
      // render a sensible empty state.
      redirect('/dashboard/rider')
    }
  }

  const user = await getCurrentUser()
  if (!user) redirect('/signup')
  if (!admin) redirect('/signup')

  // 1. Driver row — bike / car / truck / bus dispatch
  const { data: driver } = await admin
    .from('drivers')
    .select('vehicle_type')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (driver?.vehicle_type) redirect(targetForVehicleType(driver.vehicle_type as string))

  // 2. Service vertical lookup — query each table for a row owned by this user
  for (const { table, target } of SERVICE_TABLE_ROUTING) {
    const { data } = await admin
      .from(table)
      .select('id')
      .eq('user_id', user!.id)
      .limit(1)
    if (data && data.length > 0) redirect(target)
  }

  // 3. No vertical at all — push to signup picker
  redirect('/signup')
}
