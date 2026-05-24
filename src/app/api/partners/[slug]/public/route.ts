import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// Public read-only lookup for an active partner. Used by the /p/[slug]
// QR-landing page to display "You were referred by X" before forwarding
// into the rider flow.

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ partner: null }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('partners')
    .select('name, partner_type, city, commission_rate')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('[partners/slug/public] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ partner: null }, { status: 404 })
  return NextResponse.json({ partner: data })
}
