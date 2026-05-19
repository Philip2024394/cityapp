import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { verifyAffiliateToken, bearerFromHeader } from '@/lib/affiliate/session'
import { corsHeadersFor } from '@/lib/affiliate/cors'

// ============================================================================
// GET /api/affiliate/referrals
// ----------------------------------------------------------------------------
// Bearer-gated list of the calling agent's own referrals. Replaces the
// direct `from('affiliate_referrals').eq('agent_id', …)` read the
// landing/Affiliate.jsx dashboard used to do with the anon key.
// ============================================================================

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersFor(req.headers.get('origin')),
  })
}

export async function GET(req: Request) {
  const cors = corsHeadersFor(req.headers.get('origin'))
  const tok = bearerFromHeader(req.headers.get('authorization'))
  const session = verifyAffiliateToken(tok)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500, headers: cors })

  const { data, error } = await admin
    .from('affiliate_referrals')
    .select('id, customer_name, customer_phone, app_type, app_tier, commission_amount, status, paid_at, created_at')
    .eq('agent_id', session.agentId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: cors })

  return NextResponse.json({ referrals: data ?? [] }, { headers: cors })
}
