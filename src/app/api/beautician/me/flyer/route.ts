import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { renderFlyer, type FlyerInput } from '@/lib/beautician/flyer'

// nodejs (not edge) because getAdminSupabase uses the service-role key —
// see admin.ts. ImageResponse runs fine in nodejs runtime too.
export const runtime = 'nodejs'

// 1080×1920 PNG of the signed-in beautician's profile, pre-formatted for
// WhatsApp Status / TikTok / Instagram Stories. Hard-locked to the
// caller's own beautician_providers row — no slug param, no impersonation.
// Auth-gated: 401 if not signed in, 404 if no provider row exists.
export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('beautician_providers')
    .select([
      'display_name', 'theme_color', 'button_text_color',
      'profile_image_url', 'city', 'whatsapp_e164', 'slug',
      'service_photos', 'services_offered',
      'price_makeup_idr', 'price_nail_idr', 'price_hair_idr',
    ].join(','))
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  return renderFlyer(data as unknown as FlyerInput)
}
