// ============================================================================
// Resend email helper
// ----------------------------------------------------------------------------
// Minimal HTTP wrapper around the Resend transactional-email API. Used by
// the payment-reminders cron and any future server-side emails (welcome,
// receipt, etc.). Keeps the surface area tiny so callers don't have to
// reason about Resend's full SDK.
//
// Env:
//   RESEND_API_KEY   — required for real sends; missing = console fallback
//   RESEND_FROM      — default sender, e.g. "CityDrivers <reminders@streetlocal.live>"
//   RESEND_REPLY_TO  — default reply-to inbox (defaults to streetlocallive@gmail.com)
//
// Note: Resend cannot send FROM a @gmail.com address (DKIM/SPF must align
// with a domain you own — streetlocal.live in our case). So all outbound
// mail uses streetlocal.live as the sender and the gmail inbox is the
// reply-to address so customer replies land in the team inbox.
//
// When the key is missing (local dev), sendEmail logs the payload and
// returns ok=true so callers don't crash. In production the cron will
// short-circuit if the key isn't configured.
// ============================================================================

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

const DEFAULT_FROM     = process.env.RESEND_FROM     || 'Kita2u <reminders@streetlocal.live>'
const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'streetlocallive@gmail.com'

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    // Local-dev fallback: log + pretend success so we don't block work
    // when the env isn't wired up.
    console.warn('[resend] RESEND_API_KEY missing — would send:', {
      to: input.to, subject: input.subject,
    })
    return { ok: true, id: null }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:     input.from || DEFAULT_FROM,
        to:       Array.isArray(input.to) ? input.to : [input.to],
        subject:  input.subject,
        html:     input.html,
        reply_to: input.replyTo || DEFAULT_REPLY_TO,
      }),
    })
    const json = await res.json().catch(() => ({})) as { id?: string; message?: string }
    if (!res.ok) {
      return { ok: false, error: json.message || `Resend ${res.status}` }
    }
    return { ok: true, id: json.id || null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Resend send failed' }
  }
}

// Small HTML wrapper so reminder emails share visual identity without
// each call having to inline the same chrome.
export function renderEmail(opts: {
  preheader?: string
  heading: string
  bodyHtml: string
  ctaUrl?: string
  ctaLabel?: string
}): string {
  const { preheader, heading, bodyHtml, ctaUrl, ctaLabel } = opts
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0c">
${preheader ? `<div style="display:none;font-size:1px;line-height:1px;color:#f5f5f6;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f6;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
      <tr><td style="background:linear-gradient(135deg,#FACC15,#EAB308);padding:18px 24px">
        <div style="font-size:14px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#0a0a0c">Kita2u</div>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;font-weight:800;color:#0a0a0c">${escapeHtml(heading)}</h1>
        <div style="font-size:14px;line-height:1.55;color:#374151">${bodyHtml}</div>
        ${ctaUrl && ctaLabel ? `<div style="margin:24px 0 8px"><a href="${escapeAttr(ctaUrl)}" style="display:inline-block;background:#0a0a0c;color:#FACC15;text-decoration:none;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;padding:12px 20px;border-radius:10px">${escapeHtml(ctaLabel)}</a></div>` : ''}
        <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5">Ada pertanyaan? Balas email ini atau hubungi tim Kita2u di streetlocallive@gmail.com.</p>
      </td></tr>
    </table>
    <div style="margin-top:14px;font-size:11px;color:#9ca3af">Kita2u · StreetLocal</div>
  </td></tr>
</table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;' : '&#39;'
  ))
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/`/g, '&#96;')
}

// ============================================================================
// Ops alert outbound email
// ----------------------------------------------------------------------------
// Pages an admin when a critical/error ops alert fires. Recipient list comes
// from OPS_ALERT_EMAIL_TO (comma-separated); falls back to RESEND_REPLY_TO
// (streetlocallive@gmail.com by default) so the page always has somewhere
// to land even before the env is fully wired.
//
// Filters: severity 'critical' | 'error' only. 'warn' and 'info' stay
// in-dashboard. This keeps the inbox usable.
// ============================================================================

export type OpsAlertEmailInput = {
  severity: 'info' | 'warn' | 'error' | 'critical'
  source: string
  title: string
  detail?: string | null
  suggestedFix?: string | null
}

export async function sendOpsAlertEmail(input: OpsAlertEmailInput): Promise<SendEmailResult | { ok: true; skipped: true }> {
  if (input.severity !== 'critical' && input.severity !== 'error') {
    return { ok: true, skipped: true }
  }
  const raw = process.env.OPS_ALERT_EMAIL_TO || process.env.RESEND_REPLY_TO || 'streetlocallive@gmail.com'
  const to = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (to.length === 0) return { ok: true, skipped: true }

  const sevTag = input.severity === 'critical' ? '[CRITICAL]' : '[ERROR]'
  const subject = `${sevTag} ${input.source} — ${input.title}`.slice(0, 200)

  const bodyHtml = `
    <p style="margin:0 0 12px"><strong>Source:</strong> ${escapeHtml(input.source)}</p>
    <p style="margin:0 0 12px"><strong>Severity:</strong> ${escapeHtml(input.severity)}</p>
    ${input.detail ? `<pre style="margin:0 0 12px;padding:12px;background:#0a0a0c;color:#FACC15;border-radius:8px;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word">${escapeHtml(input.detail)}</pre>` : ''}
    ${input.suggestedFix ? `<p style="margin:0 0 8px"><strong>Suggested fix:</strong></p><p style="margin:0 0 12px;font-size:13px;color:#374151">${escapeHtml(input.suggestedFix)}</p>` : ''}
    <p style="margin:0;font-size:12px;color:#6b7280">Open /admin/alerts to acknowledge.</p>
  `.trim()

  return sendEmail({
    to,
    subject,
    html: renderEmail({
      preheader: `${input.source}: ${input.title}`,
      heading: `${sevTag} ${input.title}`,
      bodyHtml,
    }),
  })
}
