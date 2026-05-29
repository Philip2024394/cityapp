import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { FOUNDER_COHORT_CAP } from '@/lib/pricing/constants'
import { founderSlotsRemaining } from '@/lib/pricing/founderCohort'

// GET /api/founder-cohort
// ----------------------------------------------------------------------------
// Public, no auth. Returns the live "X of 1000 founder slots remaining"
// number so marketing surfaces (driver landing, signup page, footer of
// /cari) can render a real-time urgency counter.
//
// Cached at the edge for 60s — even with 100k QPS this is one Supabase
// COUNT per minute. Cheap.

export const runtime = 'nodejs'

export async function GET() {
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json(
      { remaining: null, cap: FOUNDER_COHORT_CAP, error: 'service_role_not_configured' },
      { status: 503 },
    )
  }

  const remaining = await founderSlotsRemaining(admin)
  return NextResponse.json(
    { remaining, cap: FOUNDER_COHORT_CAP },
    {
      headers: {
        // Edge-cache the count for 60s. The number doesn't need to be
        // perfectly live — drivers don't sign up in bursts of 100/min.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
