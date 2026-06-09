import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { renderFlyer, type FlyerInput } from '@/lib/beautician/flyer'

// Public preview of the WhatsApp Status flyer. No auth — useful for QA
// screenshots, marketing collateral, and quickly diffing the template
// against any seeded provider (e.g. demo-bp-ayu). The auth-gated download
// lives at /api/beautician/me/flyer.
//
//   curl -sI "http://localhost:3002/api/beautician/demo-bp-ayu/flyer-preview"
//   → HTTP 200 + content-type: image/png
export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
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
    .eq('slug', slug)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return renderFlyer(data as unknown as FlyerInput)
}
