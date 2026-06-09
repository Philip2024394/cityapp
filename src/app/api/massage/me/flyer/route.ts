import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { renderFlyer, type FlyerInput } from '@/lib/massage/flyer'

export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('massage_providers')
    .select([
      'display_name', 'theme_color',
      'profile_image_url', 'city', 'whatsapp_e164', 'slug',
      'service_photos', 'price_60min_idr', 'price_90min_idr', 'price_120min_idr',
    ].join(','))
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  return renderFlyer(data as unknown as FlyerInput)
}
