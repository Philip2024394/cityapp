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
    .select('id, action_type, args, status, session_id')
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
    } else if (action.action_type === 'email_campaign') {
      result = await executeEmailCampaign(sl, action.id, action.session_id, action.args)
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

// ============================================================================
// executeEmailCampaign — iterate audience, send each via Resend, log every
// outcome. Returns aggregate result for the agent_actions row + opens an
// email_campaigns row for permanent audit.
//
// Personalisation: {name} in body_html gets replaced per recipient. Body
// is auto-wrapped with the renderEmail HTML chrome + a Bahasa unsubscribe
// footer pointing at streetlocallive@gmail.com.
// ============================================================================
import { resolveEmailAudience, type AudienceFilter } from '@/lib/agent/tools'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeEmailCampaign(sl: any, actionId: string, sessionId: string | null, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filter: AudienceFilter = {
    audience_type: args.audience_type as string,
    subscription_status: args.subscription_status as string | undefined,
    expiring_within_days: args.expiring_within_days as number | undefined,
    signed_up_within_days: args.signed_up_within_days as number | undefined,
  }
  const subject = String(args.subject || '')
  const bodyRaw = String(args.body_html || '')
  if (!subject || !bodyRaw) throw new Error('subject + body_html required')

  // Resolve the audience FRESH at send time (not at propose time).
  const recipients = await resolveEmailAudience(filter)
  if (recipients.length === 0) throw new Error('Zero recipients match the filter')

  // Open the campaign row
  const { data: campaign } = await sl.from('email_campaigns').insert({
    agent_action_id: actionId,
    subject,
    body_html: bodyRaw,
    audience_filter: filter,
    audience_count: recipients.length,
    status: 'sending',
    started_at: new Date().toISOString(),
  }).select('id').single()
  const campaignId = campaign?.id

  let sent = 0
  let failed = 0

  for (const r of recipients) {
    const personalised = bodyRaw.replace(/\{name\}/g, r.name || 'Halo')
    const html = renderEmail({
      heading: subject,
      bodyHtml: `${personalised}
<hr style="margin:24px 0 12px;border:0;border-top:1px solid #e5e7eb">
<p style="font-size:11px;color:#9ca3af;line-height:1.5">
  Tidak ingin terima email seperti ini? Balas STOP atau email
  <a href="mailto:streetlocallive@gmail.com" style="color:#FACC15">streetlocallive@gmail.com</a>
  dan kami hapus kamu dari daftar dalam 24 jam.
</p>`,
    })
    const result = await sendEmail({ to: r.email, subject, html })
    await sl.from('email_send_log').insert({
      campaign_id: campaignId,
      recipient_email: r.email,
      recipient_user_id: r.user_id,
      recipient_name: r.name,
      provider: 'resend',
      provider_message_id: result.ok ? result.id : null,
      status: result.ok ? 'sent' : 'failed',
      error: result.ok ? null : result.error,
    })
    if (result.ok) sent++
    else failed++
  }

  const finalStatus = failed === 0 ? 'completed' : (sent === 0 ? 'failed' : 'partial')
  await sl.from('email_campaigns').update({
    status: finalStatus,
    sent_count: sent,
    failed_count: failed,
    completed_at: new Date().toISOString(),
  }).eq('id', campaignId)

  return {
    campaign_id: campaignId,
    audience_count: recipients.length,
    sent_count: sent,
    failed_count: failed,
    status: finalStatus,
    session_id: sessionId,
  }
}
