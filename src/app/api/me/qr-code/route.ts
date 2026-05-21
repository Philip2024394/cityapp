import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/me/qr-code?amount=38000
// ----------------------------------------------------------------------------
// Returns the active admin QR code for the requested amount, used by the
// QrPaymentFlow client component. Public read (no auth required) so the
// upgrade page can preview the QR before login.
// ============================================================================

export const dynamic = 'force-dynamic'

const ALLOWED_AMOUNTS = new Set([38_000, 350_000])

export async function GET(req: Request) {
  const url = new URL(req.url)
  const amount = parseInt(url.searchParams.get('amount') ?? '0', 10)
  if (!ALLOWED_AMOUNTS.has(amount)) {
    return NextResponse.json({ error: 'amount must be 38000 or 350000' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data } = await admin
    .from('admin_qr_codes')
    .select('id, label, amount_idr, image_url, bank_name, account_name, account_number')
    .eq('amount_idr', amount)
    .eq('active', true)
    .maybeSingle()

  if (!data) {
    return NextResponse.json(
      { error: `Belum ada QR aktif untuk amount Rp ${amount.toLocaleString('id-ID')}.` },
      { status: 404 },
    )
  }

  return NextResponse.json({ qr_code: data }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
