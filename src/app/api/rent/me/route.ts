import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Owner-side bike rental profile fetch. Unlike beautician_providers
// (single row per user), bike_rentals can have many rows per owner. The
// WYSIWYG profile editor at /dashboard/rentals/edit operates on the
// owner's most-recently-updated listing — the same single-row pattern
// the rest of the dashboard expects.
export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('bike_rentals')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[rent/me] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  return NextResponse.json({ provider: data ?? null })
}
