import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name',
  'gender','years_experience','bio',
  'price_makeup_idr','price_nail_idr','price_hair_idr',
  'city','service_area_notes',
  'whatsapp_e164',
  'profile_image_url',
  'availability',
  'is_mock',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city   = searchParams.get('city')?.trim()
  const gender = searchParams.get('gender')
  const service = searchParams.get('service') // makeup | nail | hair

  let q = admin
    .from('beautician_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    // Reals before mocks (is_mock asc), then online > busy > offline, then newest first
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock', { ascending: true })
    .order('availability', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city)   q = q.ilike('city', city)
  if (gender === 'woman' || gender === 'man') q = q.eq('gender', gender)
  if (service === 'makeup') q = q.not('price_makeup_idr', 'is', null)
  if (service === 'nail')   q = q.not('price_nail_idr',   'is', null)
  if (service === 'hair')   q = q.not('price_hair_idr',   'is', null)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  return NextResponse.json({ providers: data ?? [] })
}
