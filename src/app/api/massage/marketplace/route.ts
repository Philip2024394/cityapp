import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/massage/marketplace?city=…&gender=…
// Public listing of active providers. Strips KTP + internal fields.

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name',
  'gender','years_experience','bio',
  'massage_type',
  'price_60min_idr','price_90min_idr','price_120min_idr',
  'city','service_area_notes',
  'whatsapp_e164',
  'profile_image_url',
  'availability',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city   = searchParams.get('city')?.trim()
  const gender = searchParams.get('gender')

  let q = admin
    .from('massage_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    // Sort online > busy > offline, then newest joiners first.
    .order('availability', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city)   q = q.ilike('city', city)
  if (gender === 'woman' || gender === 'man') q = q.eq('gender', gender)

  const { data, error } = await q
  if (error) {
    console.error('[massage/marketplace] select failed', error)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  return NextResponse.json({ providers: data ?? [] })
}
