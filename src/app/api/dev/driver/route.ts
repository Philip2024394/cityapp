// ============================================================================
// /api/dev/driver — DEV-ONLY driver lookup honoring the impersonate cookie
// ----------------------------------------------------------------------------
// Reads `cr-dev-uid` from cookies (set by /api/dev/impersonate) and
// returns the matching `drivers` row using the admin client. Localhost-
// gated. Used by the dashboard home pages to render impersonated state
// without going through Supabase Auth.
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
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }
  const host = req.headers.get('host')
  if (!isLocalHost(host)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const cookieStore = await cookies()
  const uid = cookieStore.get('cr-dev-uid')?.value
  if (!uid) return NextResponse.json({ driver: null, reason: 'no_dev_cookie' })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  // SELECT * — caller-side cherry-picks the columns it wants. Easier
  // than maintaining a parallel column list per dashboard.
  const { data, error } = await admin
    .from('drivers')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'driver_lookup_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ driver: data })
}
