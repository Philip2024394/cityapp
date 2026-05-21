import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/affiliate-referrals
// ----------------------------------------------------------------------------
// Lists every affiliate referral (with agent name joined) so the unified
// admin can show "who referred whom + commission" without a second call.
// Optional ?status filter (pending / approved / paid / cancelled).
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const status = url.searchParams.get('status')

  let q = admin
    .from('affiliate_referrals')
    .select(`
      id, agent_id, customer_name, customer_phone,
      app_type, app_tier, registration_id,
      commission_amount, status, paid_at, created_at,
      agent:affiliate_agents ( id, name, agent_code, country, whatsapp )
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return fail(error.message, 500)

  return ok({ referrals: data ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
