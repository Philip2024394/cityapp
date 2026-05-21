import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/me/receipts/upload  (multipart/form-data)
// ----------------------------------------------------------------------------
// User submits a payment screenshot to activate a subscription. We:
//   1. Auth-check (RLS would also catch it; explicit 401 for clearer UX).
//   2. Validate the product + amount against the active admin_qr_codes
//      row so a user can't game the system by sending a Rp 38K receipt
//      for the Rp 350K yearly product.
//   3. Upload the screenshot to payment-receipts/receipts/<uid>/<file>.
//   4. Insert payment_receipts → the activate_on_receipt_insert trigger
//      creates the payment_intent + flips it to paid → the existing
//      extend_*_on_payment triggers grant entitlement within seconds.
//
// The endpoint is the ONLY path that talks to storage + receipts —
// the QrPaymentFlow client component never touches Supabase directly
// for the upload because the file size + content-type checks need a
// server-side gate.
// ============================================================================

export const dynamic = 'force-dynamic'

const ALLOWED_PRODUCTS = new Set([
  'subscription',
  'subscription_yearly',
  'rental_company_monthly',
  'rental_company_yearly',
  'tour_guide_monthly',
  'tour_guide_yearly',
])

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const product = String(form.get('product') ?? '')
  const note    = (form.get('note') ?? '').toString().slice(0, 500) || null
  const file    = form.get('receipt')

  if (!ALLOWED_PRODUCTS.has(product)) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing receipt file' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Receipt must be JPG / PNG / WebP' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Receipt too large (max 5MB)' }, { status: 400 })
  }
  if (file.size < 1024) {
    return NextResponse.json({ error: 'Receipt looks empty' }, { status: 400 })
  }

  // Resolve the expected amount + QR record from the ACTIVE admin code.
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const expectedAmount = product.endsWith('_yearly') ? 350_000 : 38_000

  const { data: qr } = await admin
    .from('admin_qr_codes')
    .select('id, amount_idr, label')
    .eq('amount_idr', expectedAmount)
    .eq('active', true)
    .maybeSingle()
  if (!qr) {
    return NextResponse.json(
      { error: 'No active QR code for this amount yet. Contact admin.' },
      { status: 503 },
    )
  }

  // Upload the screenshot under receipts/<uid>/<timestamp>-<rand>.<ext>
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
  const objectPath = `receipts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadErr } = await admin.storage
    .from('payment-receipts')
    .upload(objectPath, bytes, { contentType: file.type, upsert: false })
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Supabase makes the bucket private — we issue a signed URL for the
  // admin review UI later. For the DB row we store the object path so
  // we can mint signed URLs at read time.
  const receiptUrl = objectPath

  // Best-effort: pull the user's phone for the admin's quick WA reach.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const payerPhone = (typeof meta.whatsapp === 'string' && meta.whatsapp)
    || (user.phone ? '+' + user.phone : null)

  // Insert the receipt — trigger activate_on_receipt_insert fires next.
  const { data: receiptRow, error: insertErr } = await admin
    .from('payment_receipts')
    .insert({
      user_id:     user.id,
      product,
      amount_idr:  qr.amount_idr,
      qr_code_id:  qr.id,
      receipt_url: receiptUrl,
      payer_note:  note,
      payer_phone: payerPhone,
      status:      'pending_review',
    })
    .select('id, payment_intent_id, status')
    .single()

  if (insertErr) {
    // Best-effort cleanup of the uploaded file so we don't orphan it.
    await admin.storage.from('payment-receipts').remove([objectPath]).catch(() => {})
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    receipt_id: receiptRow?.id ?? null,
    activated: true,
    message: 'Pembayaran diterima. Akun kamu aktif dalam beberapa detik. Admin akan verifikasi receipt dalam 24 jam.',
  })
}
