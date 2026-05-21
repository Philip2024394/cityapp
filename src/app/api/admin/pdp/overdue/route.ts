import { NextResponse } from 'next/server'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'
import { sendEmail, renderEmail } from '@/lib/email/resend'

// ============================================================================
// GET /api/admin/pdp/overdue?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Daily cron. Reads streetlocal Supabase's data_deletion_requests table
// for rows that are PAST the 30-day SLA but still status='received' or
// 'in_progress'. Sends an email digest to the StreetLocal admin inbox
// listing each overdue request so they can act before regulators care.
//
// Returns 503 if the cross-Supabase env vars aren't set on this Vercel
// project (STREETLOCAL_SUPABASE_URL + STREETLOCAL_SUPABASE_SERVICE_KEY).
// ============================================================================

export const dynamic = 'force-dynamic'

type DdrRow = {
  id: string
  user_email: string
  user_phone: string | null
  user_app: string | null
  reason: string | null
  status: string
  requested_at: string
  sla_due_at: string
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const slClient = getStreetlocalAdminSupabase()
  if (!slClient) {
    return NextResponse.json({
      error: 'STREETLOCAL_SUPABASE_URL + STREETLOCAL_SUPABASE_SERVICE_KEY not configured on cityrider',
    }, { status: 503 })
  }

  const now = new Date().toISOString()
  const { data, error } = await slClient
    .from('data_deletion_requests')
    .select('id, user_email, user_phone, user_app, reason, status, requested_at, sla_due_at')
    .in('status', ['received', 'in_progress'])
    .lt('sla_due_at', now)
    .order('sla_due_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const overdue = (data ?? []) as DdrRow[]

  if (overdue.length === 0) {
    return NextResponse.json({ ok: true, overdue_count: 0, sent: false })
  }

  // Compose the digest. Plain table — admin clicks through to /admin/pdp
  // for actions; this email is a nudge, not the UI.
  const rows = overdue.map((r) => {
    const days = Math.floor((Date.now() - new Date(r.sla_due_at).getTime()) / 86400000)
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${escapeHtml(r.user_email)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${escapeHtml(r.user_app || '—')}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${escapeHtml(r.status)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#dc2626;font-weight:800">${days}d overdue</td>
    </tr>`
  }).join('')

  const send = await sendEmail({
    to: process.env.PDP_REMINDER_TO || 'streetlocallive@gmail.com',
    subject: `[StreetLocal] ${overdue.length} PDP deletion request${overdue.length > 1 ? 's' : ''} OVERDUE`,
    html: renderEmail({
      heading: `${overdue.length} data-deletion request${overdue.length > 1 ? 's' : ''} past 30-day SLA`,
      preheader: 'UU 27/2022 compliance — process today to avoid regulator escalation.',
      bodyHtml: `<p>The following data-deletion requests have passed the 30-day PDP SLA:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:10px">
          <thead><tr style="background:#f9fafb">
            <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Email</th>
            <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">App</th>
            <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Status</th>
            <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">SLA</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`,
      ctaUrl: 'https://streetlocal.live/admin?page=pdp',
      ctaLabel: 'Open PDP queue',
    }),
  })

  return NextResponse.json({
    ok: send.ok,
    overdue_count: overdue.length,
    sent: send.ok,
    error: send.ok ? undefined : send.error,
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;' : '&#39;'
  ))
}
