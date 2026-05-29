import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/places/me — return the signed-in user's place row (if any).
// Mirrors /api/beautician/me. The dashboard editor uses this to populate
// the WYSIWYG live preview + inline controls.
export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('places')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  return NextResponse.json({ provider: data ?? null })
}
