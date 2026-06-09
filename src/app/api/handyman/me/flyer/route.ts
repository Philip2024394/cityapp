import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { renderFlyer, type FlyerInput } from '@/lib/handyman/flyer'

// 1080×1920 PNG of the signed-in handyman's profile, pre-formatted for
// WhatsApp Status / TikTok / Instagram Stories. Auth-gated to the
// caller's own row — no slug param, no impersonation.
export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('handyman_providers')
    .select([
      'display_name', 'theme_color',
      'profile_image_url', 'city', 'whatsapp_e164', 'slug',
      'service_photos', 'hourly_rate_idr', 'day_rate_idr',
    ].join(','))
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  return renderFlyer(data as unknown as FlyerInput)
}
