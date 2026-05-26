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
  'is_mock',
  // Universal card fields (mig 0072 + 0076 + 0087 + 0088).
  'cover_image_url','theme_color','gallery_image_urls',
  'operating_hours','rating','rating_count',
  'service_locations','has_physical_location','latitude','longitude',
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
    // Mocks are listed alongside reals to populate the marketplace at
    // launch; once a mock is hidden (real signup displaces it) we drop
    // it from the response. Reals ALWAYS render before mocks via the
    // is_mock ASC order. Availability rank applied in JS below — text
    // order would alphabetise busy < offline < online.
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock',    { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city)   q = q.ilike('city', city)
  if (gender === 'woman' || gender === 'man') q = q.eq('gender', gender)

  const { data, error } = await q
  if (error) {
    console.error('[massage/marketplace] select failed', error)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  const rank: Record<string, number> = { online: 0, busy: 1, offline: 2 }
  type SortRow = { is_mock: boolean | null; availability: string }
  const providers = ((data ?? []) as unknown as SortRow[]).slice().sort((a, b) => {
    const am = a.is_mock ? 1 : 0
    const bm = b.is_mock ? 1 : 0
    if (am !== bm) return am - bm
    return (rank[a.availability] ?? 9) - (rank[b.availability] ?? 9)
  })
  return NextResponse.json({ providers })
}
