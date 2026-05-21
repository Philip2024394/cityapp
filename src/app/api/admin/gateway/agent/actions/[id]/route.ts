import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { sendEmail, renderEmail } from '@/lib/email/resend'

// ============================================================================
// PATCH /api/admin/gateway/agent/actions/[id]
// ----------------------------------------------------------------------------
// Approve or reject a pending agent_actions row. On approve we execute the
// action (send email, decide receipt, etc) and stamp completed/failed.
// On reject we just stamp the row — agent reads the rejection in its next
// turn via the messages history.
// ============================================================================

export const dynamic = 'force-dynamic'

type Body = { decision?: 'approved' | 'rejected'; note?: string }

export const PATCH = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)

  const url = new URL(req.url)
  const id = url.pathname.split('/').filter(Boolean).pop() || ''
  if (!id) return fail('Missing action id', 400)

  let body: Body
  try { body = (await req.json()) as Body } catch { return fail('Invalid JSON', 400) }
  if (body.decision !== 'approved' && body.decision !== 'rejected') return fail('decision must be approved or rejected', 400)

  const { data: action } = await sl
    .from('agent_actions')
    .select('id, action_type, args, status')
    .eq('id', id)
    .maybeSingle()
  if (!action) return fail('Action not found', 404)
  if (action.status !== 'pending') return fail(`Action already ${action.status}`, 409)

  if (body.decision === 'rejected') {
    await sl.from('agent_actions').update({
      status: 'rejected',
      decided_at: new Date().toISOString(),
    }).eq('id', id)
    return ok({ decision: 'rejected', id })
  }

  // ── Execute ───────────────────────────────────────────────────────
  let result: Record<string, unknown> | null = null
  let executeErr: string | null = null
  try {
    if (action.action_type === 'email_draft') {
      // Live email send
      const args = action.args as { to: string; subject: string; body_html: string }
      const sent = await sendEmail({
        to: args.to,
        subject: args.subject,
        html: renderEmail({ heading: args.subject, bodyHtml: args.body_html }),
      })
      if (!sent.ok) executeErr = sent.error
      else result = { sent: true, message_id: sent.id }
    } else if (action.action_type === 'receipt_decision') {
      // Approve/reject a payment receipt on cityrider supabase
      const admin = getAdminSupabase()
      if (!admin) throw new Error('cityrider supabase not configured')
      const args = action.args as { receipt_id: string; decision: 'approved' | 'rejected'; rejection_reason?: string }
      if (args.decision === 'rejected') {
        const { error } = await admin.rpc('revert_receipt_activation', { p_receipt_id: args.receipt_id })
        if (error) throw error
      }
      const { error: updErr } = await admin.from('payment_receipts').update({
        status: args.decision,
        admin_reviewed_at: new Date().toISOString(),
        rejection_reason: args.decision === 'rejected' ? (args.rejection_reason || 'Rejected via agent') : null,
      }).eq('id', args.receipt_id)
      if (updErr) throw updErr
      result = { decision: args.decision, receipt_id: args.receipt_id }
    } else if (action.action_type === 'social_post') {
      // For v1 we record only — actual Meta Graph posting comes later.
      result = { recorded: true, note: 'Live social posting not wired yet — paste manually to IG/FB.' }
    } else {
      executeErr = `Unknown action_type: ${action.action_type}`
    }
  } catch (e) {
    executeErr = e instanceof Error ? e.message : 'Execute failed'
  }

  const now = new Date().toISOString()
  if (executeErr) {
    await sl.from('agent_actions').update({
      status: 'failed',
      decided_at: now,
      executed_at: now,
      error: executeErr,
    }).eq('id', id)
    return fail(executeErr, 500)
  }
  await sl.from('agent_actions').update({
    status: 'completed',
    decided_at: now,
    executed_at: now,
    result,
  }).eq('id', id)
  return ok({ decision: 'approved', completed: true, result, id })
})

export const OPTIONS = withGateway(async () => ok({}))
