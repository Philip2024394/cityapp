import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/tattoo/contact
// Public form submission from /tattoo/[slug]. Body shape:
//   { slug, sender_name, sender_email, message }
//
// Pipeline:
//   1. Resolve the provider by slug; reject if their contact form
//      isn't enabled (contact_form_enabled = true && contact_email set).
//   2. Rate-limit by source IP — 5 submissions per hour, sliding window
//      against the contact_messages table.
//   3. Insert the message row.
//   4. Fire-and-forget Resend email to contact_email with reply-to set
//      to the sender so the provider can reply in-thread from their
//      own mail client.
//
// Failures past the insert (Resend down, etc.) don't fail the request —
// the message is already saved; the provider sees it via /messages.

export const runtime = 'nodejs'

const NAME_MAX = 80
const EMAIL_MAX = 254
const MSG_MAX = 4000
const RATE_LIMIT_PER_HOUR = 5
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Body = {
  slug?:         string
  sender_name?:  string
  sender_email?: string
  message?:      string
}

function getIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return null
}

export async function POST(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const slug         = (body.slug ?? '').trim().toLowerCase()
  const sender_name  = (body.sender_name ?? '').trim()
  const sender_email = (body.sender_email ?? '').trim()
  const message      = (body.message ?? '').trim()

  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  if (sender_name.length < 1 || sender_name.length > NAME_MAX) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }
  if (sender_email.length > EMAIL_MAX || !EMAIL_RE.test(sender_email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (message.length < 1 || message.length > MSG_MAX) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 })
  }

  // Resolve provider + opt-in check
  const { data: provider, error: lookupErr } = await admin
    .from('tattoo_providers')
    .select('id, display_name, contact_form_enabled, contact_email, theme_color')
    .eq('slug', slug)
    // status='active' gate removed — KTP verification gone (see
    // project_indocity_no_ktp_required memory). Profile is direct-link.
    .maybeSingle()
  if (lookupErr) {
    console.error('[tattoo/contact] lookup failed', { code: lookupErr.code, message: lookupErr.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!provider) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!provider.contact_form_enabled || !provider.contact_email) {
    return NextResponse.json({ error: 'contact_form_disabled' }, { status: 403 })
  }

  // Rate-limit by IP (sliding 1h window)
  const sourceIp = getIp(req)
  if (sourceIp) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('source_ip', sourceIp)
      .gte('created_at', oneHourAgo)
    if (typeof count === 'number' && count >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 400) ?? null

  // Insert the message
  const { error: insertErr } = await admin
    .from('contact_messages')
    .insert({
      provider_type: 'tattoo',
      provider_id:   provider.id,
      sender_name,
      sender_email,
      message,
      source_ip:     sourceIp,
      user_agent:    userAgent,
    })
  if (insertErr) {
    console.error('[tattoo/contact] insert failed', { code: insertErr.code, message: insertErr.message })
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  // Fire-and-forget Resend notification (non-blocking on the response)
  void sendResendEmail({
    to:             provider.contact_email,
    senderName:     sender_name,
    senderEmail:    sender_email,
    message,
    providerName:   provider.display_name,
  }).catch((e) => {
    console.error('[tattoo/contact] resend failed', e instanceof Error ? e.message : e)
  })

  return NextResponse.json({ ok: true })
}

async function sendResendEmail({
  to, senderName, senderEmail, message, providerName,
}: {
  to:           string
  senderName:   string
  senderEmail:  string
  message:      string
  providerName: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM ?? 'Kita2u <noreply@streetlocal.live>'
  if (!apiKey) {
    console.warn('[tattoo/contact] RESEND_API_KEY missing — message saved but no email sent')
    return
  }

  const escaped = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  const subject = `New message from ${senderName} via your Kita2u page`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0a0a0a;max-width:560px">
      <p style="font-size:16px;margin:0 0 16px;font-weight:700">
        New message for ${providerName}
      </p>
      <p style="font-size:14px;margin:0 0 8px">
        <strong>From:</strong> ${senderName} &lt;${senderEmail}&gt;
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <div style="font-size:14px;white-space:pre-wrap">${escaped}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">
        Reply directly to this email to respond — it will go straight to ${senderName}.
      </p>
    </div>
  `

  const r = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to:        [to],
      reply_to:  senderEmail,
      subject,
      html,
    }),
  })
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    throw new Error(`resend ${r.status}: ${txt.slice(0, 300)}`)
  }
}
