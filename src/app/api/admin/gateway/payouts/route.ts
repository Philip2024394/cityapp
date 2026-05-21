import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/payouts?status=<all|pending|processing|paid|cancelled|failed>
// ----------------------------------------------------------------------------
// Affiliate payouts queue with agent details joined for one-shot rendering.
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'all'

  let q = admin
    .from('affiliate_payouts')
    .select(`
      id, agent_id, amount_idr, referral_count, status, provider,
      provider_txn_id, bank_name, bank_account, bank_holder,
      paid_at, notes, created_at, updated_at,
      agent:affiliate_agents ( id, name, agent_code, country, whatsapp )
    `)
    .order('created_at', { ascending: false })
    .limit(500)
  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return fail(error.message, 500)
  return ok({ payouts: data ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
