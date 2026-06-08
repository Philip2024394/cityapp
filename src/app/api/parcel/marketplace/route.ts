import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name','years_experience','bio',
  'specialties','hourly_rate_idr','day_rate_idr','has_own_tools',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
  // Universal card needs: cover for hero strip, theme for accents,
  // gallery for the 3-thumb portfolio preview, operating_hours so
  // the card can compute the effective availability dot, rating for
  // the top-right chip.
  'cover_image_url','theme_color','gallery_image_urls',
  'operating_hours','rating','rating_count',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city      = searchParams.get('city')?.trim()
  const specialty = searchParams.get('specialty')

  let q = admin
    .from('parcel_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city)      q = q.ilike('city', city)
  if (specialty) q = q.contains('specialties', [specialty])

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })

  // Availability rank: online > busy > offline. Postgres `order by` on
  // text would sort alphabetically (`busy < offline < online`), putting
  // busy at the TOP — wrong UX. Sort.js is stable so created_at desc
  // and is_mock order are preserved within each availability bucket.
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
