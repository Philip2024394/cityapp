import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl } from '@/lib/validation/images'

// POST /api/beautician/me/buy-banner
// Creates a pending banner_purchases row + provisionally sets the
// beautician's cover_image_url to the purchased banner. Admin reviews
// the payment screenshot from Supabase Studio and either confirms or
// rejects (rejection reverts the cover).

export const runtime = 'nodejs'

type Body = {
  banner_url?:        string
  payment_proof_url?: string
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const bannerUrl = (body.banner_url || '').trim()
  if (!bannerUrl || !isAllowedImageUrl(bannerUrl)) {
    return NextResponse.json({ error: 'invalid_banner_url' }, { status: 400 })
  }
  const proofUrl = (body.payment_proof_url || '').trim()
  if (!proofUrl || !isAllowedImageUrl(proofUrl)) {
    return NextResponse.json({ error: 'invalid_payment_proof' }, { status: 400 })
  }

  // Resolve beautician_id for this user.
  const { data: beautician } = await admin
    .from('beautician_providers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!beautician) {
    return NextResponse.json({ error: 'not_a_beautician' }, { status: 403 })
  }

  // Create the pending purchase row.
  const { data, error } = await admin
    .from('banner_purchases')
    .insert({
      user_id:           user.id,
      beautician_id:     (beautician as { id: string }).id,
      banner_url:        bannerUrl,
      price_idr:         100000,         // current premium banner price; change here if pricing changes
      payment_proof_url: proofUrl,
      status:            'pending',
    })
    .select('id, status, created_at')
    .single()

  if (error) {
    console.error('[buy-banner] insert failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Provisionally activate the banner — the cover goes live while admin
  // reviews. If admin rejects later, a separate flow reverts the cover.
  await admin
    .from('beautician_providers')
    .update({ cover_image_url: bannerUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true, purchase: data })
}
