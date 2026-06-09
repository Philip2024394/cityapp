import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { renderFlyer, type FlyerInput } from '@/lib/florist/flyer'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('florist_providers')
    .select([
      'display_name', 'theme_color',
      'profile_image_url', 'city', 'whatsapp_e164', 'slug',
      'service_photos', 'hourly_rate_idr', 'day_rate_idr',
    ].join(','))
    .eq('slug', slug)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return renderFlyer(data as unknown as FlyerInput)
}
