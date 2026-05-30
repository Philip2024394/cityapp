// =============================================================================
// /dashboard — vehicle/vertical router (NOT a destination page)
// -----------------------------------------------------------------------------
// The signed-in user lands here from any "Dashboard" link; we detect
// which vertical they belong to (driver vs service provider) and forward
// to the corresponding redesigned dashboard.
//
// This replaces a 1,020-line legacy monolith that mixed concerns from
// every vertical onto one screen — the new pattern is one focused
// dashboard per vertical with 13 subpages inside.
//
// Routing precedence:
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

export default async function DashboardRouter() {
  const user = await getCurrentUser()
  if (!user) redirect('/signup')

  const admin = getAdminSupabase()
  if (!admin) redirect('/signup')

  // 1. Driver row — bike / car / truck / bus dispatch
  const { data: driver } = await admin
    .from('drivers')
    .select('vehicle_type')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (driver?.vehicle_type) {
    const target =
      driver.vehicle_type === 'bike'  ? '/dashboard/rider' :
      driver.vehicle_type === 'truck' ? '/dashboard/truck' :
      driver.vehicle_type === 'bus'   ? '/dashboard/bus'   :
      /* car / minibus / other */       '/dashboard/car'
    redirect(target)
  }

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
