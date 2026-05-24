import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/partners/me/payout
// Updates payout_* fields on every partner row owned by the calling user.
// One user can own >1 partner (rare in v1, e.g. a hotel group); we keep
// the payout details in sync across all of them so the driver always sees
// a consistent destination.
//
// INVARIANT: the platform never receives the money. This endpoint just
// persists *where to send it*. Driver pays the partner directly; this
// powers the read-only "View bank details" surface on the driver side.

export const runtime = 'nodejs'

const ALLOWED_METHODS = [
  'bank_transfer','qris','gopay','ovo','dana','shopeepay','cash',
] as const
type Method = typeof ALLOWED_METHODS[number]

type Body = {
  payout_method?: string
  payout_account_number?: string
  payout_account_name?: string
  payout_bank_code?: string
  payout_qris_image_url?: string
  payout_notes?: string
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  }
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  }

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const method = body.payout_method as Method | undefined
  if (!method || !ALLOWED_METHODS.includes(method)) {
    return NextResponse.json({ error: 'invalid_method' }, { status: 400 })
  }

  // Per-method validation. Cash needs nothing. QRIS needs an image URL.
  // Bank transfer needs account + name + bank code. E-wallets need
  // account number + name.
  const accountNumber = (body.payout_account_number || '').trim()
  const accountName   = (body.payout_account_name   || '').trim()
  const bankCode      = (body.payout_bank_code      || '').trim()
  const qrisUrl       = (body.payout_qris_image_url || '').trim()
  const notes         = (body.payout_notes          || '').trim()

  if (method === 'bank_transfer') {
    if (!bankCode)      return NextResponse.json({ error: 'bank_code_required' },      { status: 400 })
    if (!accountNumber) return NextResponse.json({ error: 'account_number_required' }, { status: 400 })
    if (!accountName)   return NextResponse.json({ error: 'account_name_required' },   { status: 400 })
  } else if (method === 'qris') {
    if (!qrisUrl) return NextResponse.json({ error: 'qris_image_required' }, { status: 400 })
  } else if (method !== 'cash') {
    // e-wallets — gopay / ovo / dana / shopeepay
    if (!accountNumber) return NextResponse.json({ error: 'account_number_required' }, { status: 400 })
    if (!accountName)   return NextResponse.json({ error: 'account_name_required' },   { status: 400 })
  }

  // Use the admin client to update — RLS does not yet have an owner-write
  // policy on payout_* columns and we don't want to broaden it. We already
  // verified user identity above; the WHERE clause scopes to their own rows.
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })
  }

  const { error, data } = await admin.from('partners').update({
    payout_method:         method,
    payout_account_number: accountNumber || null,
    payout_account_name:   accountName   || null,
    payout_bank_code:      bankCode      || null,
    payout_qris_image_url: qrisUrl       || null,
    payout_notes:          notes         || null,
    updated_at:            new Date().toISOString(),
  })
    .eq('owner_user_id', user.id)
    .select('id, slug')

  if (error) {
    console.error('[partners/me/payout] update failed', error)
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'no_partner_rows' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, updated: data.length })
}
