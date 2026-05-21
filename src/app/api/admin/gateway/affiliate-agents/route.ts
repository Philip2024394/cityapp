import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /api/admin/gateway/affiliate-agents
// ----------------------------------------------------------------------------
// Cross-app admin read of the affiliate_agents table. The data lives on
// the cityrider Supabase project; the landing/Admin.jsx dashboard fetches
// it through this gateway because it runs on a different Supabase project
// and can't query the table directly.
//
// GET  → list (optionally filtered by ?status, ?country, ?verification)
// ============================================================================

export const dynamic = 'force-dynamic'

type AgentRow = {
  id: string
  name: string
  country: string
  whatsapp: string
  agent_code: string
  status: string
  total_clicks: number
  payment_proof: string | null
  paid_at: string | null
  bank_name: string | null
  bank_account: string | null
  bank_holder: string | null
  ktp_url: string | null
  verification_status: string | null
  created_at: string
}

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const country = url.searchParams.get('country')
  const verification = url.searchParams.get('verification')

  let q = admin
    .from('affiliate_agents')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  if (country) q = q.eq('country', country)
  if (verification) q = q.eq('verification_status', verification)

  const { data, error } = await q
  if (error) return fail(error.message, 500)

  // Pull a quick referral-count map so the dashboard can show
  // "X referrals" per agent without an N+1.
  const ids = (data ?? []).map((a) => (a as AgentRow).id)
  const counts: Record<string, { total: number; approved: number; paid: number }> = {}
  if (ids.length > 0) {
    const { data: refs } = await admin
      .from('affiliate_referrals')
      .select('agent_id, status')
      .in('agent_id', ids)
    for (const r of (refs ?? []) as Array<{ agent_id: string; status: string }>) {
      const c = counts[r.agent_id] ?? (counts[r.agent_id] = { total: 0, approved: 0, paid: 0 })
      c.total++
      if (r.status === 'approved') c.approved++
      if (r.status === 'paid') c.paid++
    }
  }

  return ok({
    agents: (data ?? []).map((a) => ({
      ...(a as AgentRow),
      referral_counts: counts[(a as AgentRow).id] ?? { total: 0, approved: 0, paid: 0 },
    })),
  })
})

export const OPTIONS = withGateway(async () => ok({}))
