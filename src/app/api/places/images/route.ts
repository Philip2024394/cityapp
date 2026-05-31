import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/places/images?slugs=borobudur-temple,prambanan-temple,...
// Returns: { images: { "<slug>": "<image_url>" | null, ... } }
//
// Used by ToursTabContent on the public driver profile to auto-fill a
// thumbnail per tour card when the driver hasn't uploaded their own
// photo. Curated `places.image_url` set in /admin/places.

export const runtime = 'nodejs'

const MAX_SLUGS = 50

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = (url.searchParams.get('slugs') ?? '').trim()
  if (!raw) return NextResponse.json({ images: {} })

  const slugs = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9_-]+$/.test(s))
    .slice(0, MAX_SLUGS)

  if (slugs.length === 0) return NextResponse.json({ images: {} })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ images: {} })

  const { data } = await admin
    .from('places')
    .select('slug, image_url')
    .in('slug', slugs)
    .eq('status', 'approved')

  const map: Record<string, string | null> = {}
  for (const slug of slugs) map[slug] = null
  for (const row of (data ?? []) as { slug: string; image_url: string | null }[]) {
    if (row.image_url) map[row.slug] = row.image_url
  }

  return NextResponse.json({ images: map }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
