import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isValidSlug, slugReason } from '@/lib/slug'

// GET /api/onboarding/slug-check?slug=wayan-bike
// Returns { available: boolean, reason?: string } for the wizard's live check.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = (url.searchParams.get('slug') || '').toLowerCase()

  if (!isValidSlug(slug)) {
    return NextResponse.json({
      available: false,
      reason: slugReason(slug) ?? 'Invalid',
    })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ available: false, reason: 'Server not configured' }, { status: 500 })
  }

  const { data } = await admin.from('drivers').select('user_id').eq('slug', slug).maybeSingle()
  if (data) {
    return NextResponse.json({ available: false, reason: 'That short link is already taken' })
  }
  return NextResponse.json({ available: true })
}
