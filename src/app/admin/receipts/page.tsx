import { getAdminSupabase } from '@/lib/supabase/admin'
import ReceiptsReview from './ReceiptsReview'

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

export default async function AdminReceiptsPage({
  searchParams,
}: { searchParams: Promise<{ filter?: string }> }) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const sp = await searchParams
  const filter = (sp?.filter as 'pending' | 'approved' | 'rejected' | 'all') ?? 'pending'
  const statusFilter = filter === 'pending' ? 'pending_review' : filter

  let query = admin
    .from('payment_receipts')
    .select('id, user_id, product, amount_idr, receipt_url, payer_note, payer_phone, status, admin_reviewed_at, rejection_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (filter !== 'all') query = query.eq('status', statusFilter)

  const { data: rows } = await query
  const list = (rows as Row[] | null) ?? []

  // Sign URLs server-side so the admin can view the private screenshots.
  const signed = await Promise.all(list.map(async (r) => {
    if (!r.receipt_url) return { ...r, signed_url: null as string | null }
    const { data } = await admin.storage.from('payment-receipts').createSignedUrl(r.receipt_url, 60 * 30)
    return { ...r, signed_url: data?.signedUrl ?? null }
  }))

  // Pull joined user info for display (best-effort).
  const userIds = [...new Set(signed.map((r) => r.user_id))]
  const userMap = new Map<string, { email: string | null; name: string | null; phone: string | null }>()
  if (userIds.length > 0) {
    for (const uid of userIds) {
      const { data: u } = await admin.auth.admin.getUserById(uid)
      const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>
      userMap.set(uid, {
        email: u?.user?.email ?? null,
        name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
        phone: u?.user?.phone ? '+' + u.user.phone : null,
      })
    }
  }

  const enriched = signed.map((r) => ({ ...r, user: userMap.get(r.user_id) ?? { email: null, name: null, phone: null } }))

  return <ReceiptsReview initial={enriched} currentFilter={filter} />
}
