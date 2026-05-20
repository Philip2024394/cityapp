import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/payment-intents/expire?secret=<CRON_SECRET>
// ----------------------------------------------------------------------------
// Sweeps payment_intents rows that have been status='pending' for > 24h
// and flips them to status='expired'. Triggered by Vercel cron (entry in
// vercel.json). Audit (2026-05) flagged that Snap popups dismissed
// before payment leave orphan pending rows that never expire — driver
// retries create new rows, count grows unbounded.
//
// SECURITY:
//   Gated by CRON_SECRET query param so only Vercel cron + admins can
//   invoke. Same pattern as /api/admin/subscriptions/expire.
//
// LIMITS:
//   Updates up to 1000 rows per invocation (well under PG row-update
//   throughput). Cron runs daily so steady-state expiry is cheap.
// ============================================================================

const PENDING_GRACE_HOURS = 24

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const cutoff = new Date(Date.now() - PENDING_GRACE_HOURS * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('payment_intents')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    expired: data?.length ?? 0,
    cutoff,
  })
}
