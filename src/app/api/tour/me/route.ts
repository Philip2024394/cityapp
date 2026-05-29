import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// /api/tour/me — fetch the signed-in user's tour_guide_listings row.
// Mirrors /api/beautician/me. Used by the WYSIWYG hero/banner editor
// at /dashboard/tour-guide/edit to seed the live preview.

export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('tour_guide_listings')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  return NextResponse.json({ provider: data ?? null })
}
