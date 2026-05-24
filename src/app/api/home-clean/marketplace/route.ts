import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name','years_experience','bio',
  'hourly_rate_idr','day_rate_idr',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')?.trim()

  let q = admin
    .from('home_clean_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock',    { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city) q = q.ilike('city', city)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })

  // Availability rank: online > busy > offline. Postgres text order would
  // alphabetise (busy < offline < online), pushing busy to the top — wrong.
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
