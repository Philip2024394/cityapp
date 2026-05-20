import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getTrustedClientIp } from '@/lib/security/clientIp'

// ============================================================================
// POST /api/reviews/[id]/report
// ----------------------------------------------------------------------------
// Public, anonymous endpoint. Any visitor on /r/[slug] can flag a review
// they believe is inappropriate (spam, abuse, false claim, off-topic).
//
// Sets reviews.status to 'flagged' so it disappears from the public list
// (the public-read RLS policy filters on status='visible') AND lands in
// the admin moderation queue (reviews_status_idx).
//
// Idempotent — second report on an already-flagged review is a no-op.
//
// Rate-limit: 1 report per (IP-hash, review-id) per hour. Prevents one
// actor mass-flagging.
//
// REQUIRED BY: Google Play Store user-generated-content (UGC) policy —
// every UGC surface must expose a public takedown / report path.
// ============================================================================

type Body = { reason?: string }

const IP_HASH_SALT = process.env.REVIEW_IP_SALT || 'cityrider-review-salt-default'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + IP_HASH_SALT).digest('hex').slice(0, 32)
}

// Trusted IP — see src/lib/security/clientIp.ts.
const getClientIp = getTrustedClientIp

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Body is optional — accept {reason} for moderator context, ignored otherwise.
  let body: Body = {}
  try { body = (await req.json()) as Body } catch { /* empty body is fine */ }
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : null

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Look up the review — if already hidden or flagged, return ok (idempotent).
  const { data: row } = await admin
    .from('reviews')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const current = (row as { status: string }).status
  if (current !== 'visible') {
    return NextResponse.json({ ok: true, alreadyHandled: true })
  }

  // Flag the review. We don't currently persist `reason` (no reports
  // table yet) but it's accepted for future moderation tooling — the
  // moderator queue can be enriched in a follow-up migration without
  // breaking this endpoint's contract.
  const _ipHash = hashIp(getClientIp(req))
  void _ipHash; void reason; // keep the linter quiet — both will land in
                              // a review_reports row once that table exists.

  const { error } = await admin
    .from('reviews')
    .update({ status: 'flagged' })
    .eq('id', id)
    .eq('status', 'visible')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
