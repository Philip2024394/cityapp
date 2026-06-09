import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_COLS = [
  'slug','display_name',
  'years_experience','bio',
  'price_wash_per_kg_idr','price_wash_dry_per_kg_idr','price_wash_iron_per_kg_idr',
  'min_kg','turnaround_hours',
  'city','service_area_notes',
  'whatsapp_e164','profile_image_url','availability','is_mock',
  // Universal card fields.
  'cover_image_url','theme_color','gallery_image_urls',
  'operating_hours','rating','rating_count',
].join(', ')

export async function GET(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')?.trim()
  const pkg  = searchParams.get('package')  // wash | wash_dry | wash_iron

  let q = admin
    .from('laundry_providers')
    .select(PUBLIC_COLS)
    .eq('status', 'active')
    // mig 0228 — exclude draft-locked profiles from the marketplace so
    // visitors don't stumble into a password prompt.
    .or('is_draft.eq.false,is_draft.is.null')
    .or('is_mock.eq.false,mock_hidden_at.is.null')
    .order('is_mock', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (city) q = q.ilike('city', city)
  if (pkg === 'wash')      q = q.not('price_wash_per_kg_idr', 'is', null)
  if (pkg === 'wash_dry')  q = q.not('price_wash_dry_per_kg_idr', 'is', null)
  if (pkg === 'wash_iron') q = q.not('price_wash_iron_per_kg_idr', 'is', null)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })

  // Availability rank: online > busy > offline. Postgres text order is
  // alphabetical (busy < offline < online) which puts busy at the top —
  // wrong. JS sort is stable so created_at desc and is_mock first are
  // preserved within each availability bucket.
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
