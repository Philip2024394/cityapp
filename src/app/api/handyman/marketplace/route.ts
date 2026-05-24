import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name','years_experience','bio',
  'specialties','hourly_rate_idr','day_rate_idr','has_own_tools',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city      = searchParams.get('city')?.trim()
  const specialty = searchParams.get('specialty')

  let q = admin
    .from('handyman_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock', { ascending: true })
    .order('availability', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city)      q = q.ilike('city', city)
  if (specialty) q = q.contains('specialties', [specialty])

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  return NextResponse.json({ providers: data ?? [] })
}
