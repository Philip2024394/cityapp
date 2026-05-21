import { NextResponse } from 'next/server'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /api/admin/qr-codes
// ----------------------------------------------------------------------------
// GET    — list all QR codes (every amount + every active state)
// POST   — upload a new QR code (multipart) + auto-deactivate any previous
//          active QR for the same amount
// PATCH  — flip active/inactive without uploading a new image
// ============================================================================

export const dynamic = 'force-dynamic'

const ALLOWED_AMOUNTS = new Set([38_000, 350_000])
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

export async function GET() {
  const profile = await assertAdminFromCookies()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data, error } = await admin
    .from('admin_qr_codes')
    .select('*')
    .order('amount_idr', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ qr_codes: data ?? [] })
}

export async function POST(req: Request) {
  const profile = await assertAdminFromCookies()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const amount = parseInt(String(form.get('amount_idr') ?? '0'), 10)
  if (!ALLOWED_AMOUNTS.has(amount)) {
    return NextResponse.json({ error: 'amount_idr must be 38000 or 350000' }, { status: 400 })
  }

  const label = String(form.get('label') ?? '').trim() || (amount === 350_000 ? 'QRIS Tahunan' : 'QRIS Bulanan')
  const bankName = String(form.get('bank_name') ?? '').trim() || null
  const accountName = String(form.get('account_name') ?? '').trim() || null
  const accountNumber = String(form.get('account_number') ?? '').trim() || null
  const notes = String(form.get('notes') ?? '').trim() || null

  const file = form.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing QR image file' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Image must be JPG / PNG / WebP' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase()
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'png'
  const objectPath = `qris/${amount}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from('qr-codes')
    .upload(objectPath, bytes, { contentType: file.type, upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: pub } = admin.storage.from('qr-codes').getPublicUrl(objectPath)
  const imageUrl = pub.publicUrl

  // Deactivate the existing active QR for this amount so the unique
  // partial index isn't violated.
  await admin
    .from('admin_qr_codes')
    .update({ active: false })
    .eq('amount_idr', amount)
    .eq('active', true)

  const { data: row, error: insertErr } = await admin
    .from('admin_qr_codes')
    .insert({
      label, amount_idr: amount, image_url: imageUrl,
      bank_name: bankName, account_name: accountName, account_number: accountNumber,
      notes, active: true,
    })
    .select()
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  await writeAudit({
    actorId: profile.id, action: 'qr_code_upload',
    entityType: 'admin_qr_codes', entityId: row?.id ?? undefined,
    after: { amount_idr: amount, label },
  })

  return NextResponse.json({ ok: true, qr_code: row })
}

export async function PATCH(req: Request) {
  const profile = await assertAdminFromCookies()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const body = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean }
  if (!body.id || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'id + active required' }, { status: 400 })
  }

  // If activating, deactivate any existing active QR for the same amount first.
  if (body.active) {
    const { data: target } = await admin
      .from('admin_qr_codes')
      .select('amount_idr')
      .eq('id', body.id)
      .maybeSingle()
    if (target?.amount_idr) {
      await admin
        .from('admin_qr_codes')
        .update({ active: false })
        .eq('amount_idr', target.amount_idr)
        .eq('active', true)
        .neq('id', body.id)
    }
  }

  const { data, error } = await admin
    .from('admin_qr_codes')
    .update({ active: body.active })
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    actorId: profile.id, action: `qr_code_${body.active ? 'activate' : 'deactivate'}`,
    entityType: 'admin_qr_codes', entityId: body.id,
  })

  return NextResponse.json({ ok: true, qr_code: data })
}
