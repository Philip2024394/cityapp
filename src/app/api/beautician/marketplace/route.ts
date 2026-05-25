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
  // mig 0077 — category filter source
  'marketplace_categories',
  // mig 0072 — operating_hours drives the auto-busy-when-closed badge
  'operating_hours',
  // mig 0075/0076 — review aggregate columns drive rating badge + star meter
  'rating',
  'rating_count',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city   = searchParams.get('city')?.trim()
  const gender = searchParams.get('gender')
  // mig 0077 — `category` is the marketplace_categories filter (16-item
  // allowlist). `service` (makeup | nail | hair) kept for legacy links.
  const category = searchParams.get('category')
  const service  = searchParams.get('service')

  let q = admin
    .from('beautician_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    // Reals before mocks (is_mock asc), then newest first. Availability
    // rank is applied in JS below — Postgres text order would sort
    // alphabetically (busy < offline < online), surfacing busy first.
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city)   q = q.ilike('city', city)
  if (gender === 'woman' || gender === 'man') q = q.eq('gender', gender)
  if (service === 'makeup') q = q.not('price_makeup_idr', 'is', null)
  if (service === 'nail')   q = q.not('price_nail_idr',   'is', null)
  if (service === 'hair')   q = q.not('price_hair_idr',   'is', null)

  const CATEGORY_ALLOWLIST = new Set([
    'makeup','nails','hair','skin','lashes','brows',
    'waxing','facial','massage','henna','bridal','spa',
    'whitening','microblading','smoothing','permanent_makeup',
  ])
  if (category && CATEGORY_ALLOWLIST.has(category)) {
    q = q.contains('marketplace_categories', [category])
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })

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
