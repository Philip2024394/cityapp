import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/receipts?status=<pending_review|approved|rejected|all>
// ----------------------------------------------------------------------------
// Lists payment_receipts with signed URLs for the screenshot + enriched
// payer info (email, name, phone via auth.users + drivers). Mirrors the
// /admin/receipts page reads.
// ============================================================================

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  user_id: string
  product: string
  amount_idr: number
  receipt_url: string
  payer_note: string | null
  payer_phone: string | null
  status: 'pending_review' | 'approved' | 'rejected'
  admin_reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
}

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'pending_review'

  let q = admin
    .from('payment_receipts')
    .select('id, user_id, product, amount_idr, receipt_url, payer_note, payer_phone, status, admin_reviewed_at, rejection_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (status !== 'all') q = q.eq('status', status)

  const { data: rows, error } = await q
  if (error) return fail(error.message, 500)
  const list = (rows as Row[] | null) ?? []

  // Sign URLs for the private receipt screenshots so the admin UI can
  // render them inline. 30-min expiry is plenty for an admin review.
  const signed = await Promise.all(list.map(async (r) => {
    if (!r.receipt_url) return { ...r, signed_url: null as string | null }
    const { data } = await admin.storage.from('payment-receipts')
      .createSignedUrl(r.receipt_url, 60 * 30)
    return { ...r, signed_url: data?.signedUrl ?? null }
  }))

  // Enrich each row with the payer's email / name / phone for display.
  const ids = [...new Set(signed.map((r) => r.user_id))]
  const userMap = new Map<string, { email: string | null; name: string | null; phone: string | null }>()
  for (const uid of ids) {
    const { data: u } = await admin.auth.admin.getUserById(uid)
    const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>
    userMap.set(uid, {
      email: u?.user?.email ?? null,
      name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
      phone: u?.user?.phone ? '+' + u.user.phone : null,
    })
  }

  const enriched = signed.map((r) => ({
    ...r,
    user: userMap.get(r.user_id) ?? { email: null, name: null, phone: null },
  }))

  return ok({ receipts: enriched })
})

export const OPTIONS = withGateway(async () => ok({}))
