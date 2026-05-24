import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name','years_experience','bio',
  'hourly_rate_idr','day_rate_idr',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
].join(', ')

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })
  const { data, error } = await admin
    .from('home_clean_providers')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[home-clean/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ provider: data })
}
