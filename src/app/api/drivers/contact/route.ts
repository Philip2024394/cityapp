import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/drivers/contact
// Public form submission from the jeep public profile (and any future
// driver vertical that opts into the inline Contact Us form). Body:
//   { slug, sender_name, sender_country, sender_phone, message }
//
// Pipeline mirrors /api/beautician/contact (mig 0137):
//   1. Look up the driver by slug. Reject if contact_email isn't set
//      (the dashboard /info Card is how a driver opts in).
//   2. Rate-limit by source IP — 5 submissions per IP per sliding hour
//      against contact_messages.
//   3. Insert a contact_messages row (provider_type='driver',
//      provider_id=driver.user_id, sender_country populated).
//   4. Fire-and-forget Resend email to driver.contact_email with
//      reply-to = sender (no sender_email collected — Resend reply-to
//      falls back to a no-reply, so the email body carries the
//      WhatsApp number for the driver to follow up out-of-band).
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// driver self-publishes their contact_email; we just forward enquiries.

export const runtime = 'nodejs'

const NAME_MAX    = 80
const COUNTRY_MAX = 64
const PHONE_MAX   = 32
const MSG_MAX     = 2000
const RATE_LIMIT_PER_HOUR = 5

type Body = {
  slug?:           string
  sender_name?:    string
  sender_country?: string
  sender_phone?:   string
  message?:        string
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

  const slug           = (body.slug ?? '').trim().toLowerCase()
  const sender_name    = (body.sender_name ?? '').trim()
  const sender_country = (body.sender_country ?? '').trim()
  const sender_phone   = (body.sender_phone ?? '').trim()
  const message        = (body.message ?? '').trim()

  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  if (sender_name.length < 1 || sender_name.length > NAME_MAX) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }
  if (sender_country.length < 1 || sender_country.length > COUNTRY_MAX) {
    return NextResponse.json({ error: 'invalid_country' }, { status: 400 })
  }
  if (sender_phone.length < 5 || sender_phone.length > PHONE_MAX) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }
  if (message.length < 1 || message.length > MSG_MAX) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 })
  }

  // Resolve driver — try real `drivers` first, then `mock_drivers` so
  // the demo profiles also send. provider_id stored is the driver's
  // user_id (real) or mock_drivers.id (mock); either way it's a uuid.
  let driver: { id: string; display_name: string; contact_email: string | null } | null = null

  const real = await admin
    .from('drivers')
    .select('user_id, business_name, contact_email')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (real.data) {
    driver = {
      id:            String(real.data.user_id),
      display_name:  String(real.data.business_name ?? slug),
      contact_email: (real.data.contact_email as string | null) ?? null,
    }
  }
  if (!driver) {
    const mock = await admin
      .from('mock_drivers')
      .select('id, business_name, contact_email')
      .eq('slug', slug)
      .is('mock_hidden_at', null)
      .maybeSingle()
    if (mock.data) {
      driver = {
        id:            String(mock.data.id),
        display_name:  String(mock.data.business_name ?? slug),
        contact_email: (mock.data.contact_email as string | null) ?? null,
      }
    }
  }

  if (!driver) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!driver.contact_email) {
    return NextResponse.json({ error: 'contact_form_disabled' }, { status: 403 })
  }

  // Rate-limit by IP (sliding 1h window).
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

  // Insert — sender_email synthesised so we don't break the NOT NULL +
  // regex CHECK on the column. We don't collect the customer's email
  // (founder spec — only WhatsApp). Synthetic value is the form's
  // placeholder so the row is well-formed but inert as a reply-to.
  const syntheticEmail = `no-reply+${Date.now()}@citydrivers.id`

  const insertPayload = {
    provider_type:  'driver' as const,
    provider_id:    driver.id,
    sender_name,
    sender_email:   syntheticEmail,
    sender_country: sender_country || null,
    sender_phone:   sender_phone || null,
    message,
    source_ip:      sourceIp,
    user_agent:     userAgent,
  }
  const { error: insertErr } = await admin
    .from('contact_messages')
    .insert(insertPayload as unknown as Record<string, unknown>)
  if (insertErr) {
    console.error('[drivers/contact] insert failed', { code: insertErr.code, message: insertErr.message })
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  // Fire-and-forget Resend notification.
  void sendResendEmail({
    to:             driver.contact_email,
    senderName:     sender_name,
    senderCountry:  sender_country,
    senderPhone:    sender_phone,
    message,
    driverName:     driver.display_name,
  }).catch((e) => {
    console.error('[drivers/contact] resend failed', e instanceof Error ? e.message : e)
  })

  return NextResponse.json({ ok: true })
}

async function sendResendEmail({
  to, senderName, senderCountry, senderPhone, message, driverName,
}: {
  to:            string
  senderName:    string
  senderCountry: string
  senderPhone:   string
  message:       string
  driverName:    string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM ?? 'CityDrivers <noreply@citydrivers.id>'
  if (!apiKey) {
    console.warn('[drivers/contact] RESEND_API_KEY missing — message saved but no email sent')
    return
  }

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escapedMsg = escapeHtml(message).replace(/\n/g, '<br/>')
  const subject    = `New enquiry from ${senderName} (${senderCountry}) via CityDrivers`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0a0a0a;max-width:560px">
      <p style="font-size:16px;margin:0 0 16px;font-weight:700">
        New enquiry for ${escapeHtml(driverName)}
      </p>
      <p style="font-size:14px;margin:0 0 6px"><strong>Name:</strong> ${escapeHtml(senderName)}</p>
      <p style="font-size:14px;margin:0 0 6px"><strong>Country:</strong> ${escapeHtml(senderCountry)}</p>
      <p style="font-size:14px;margin:0 0 6px"><strong>WhatsApp:</strong> ${escapeHtml(senderPhone)}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <div style="font-size:14px;white-space:pre-wrap">${escapedMsg}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">
        Reply directly to the customer on WhatsApp at ${escapeHtml(senderPhone)}.
        CityDrivers does not store the customer's email — replies to this
        notification go to a CityDrivers inbox, not to ${escapeHtml(senderName)}.
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
      subject,
      html,
    }),
  })
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    throw new Error(`resend ${r.status}: ${txt.slice(0, 300)}`)
  }
}
