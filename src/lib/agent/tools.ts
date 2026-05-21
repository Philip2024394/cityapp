import { getAdminSupabase } from '@/lib/supabase/admin'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'
import type { Tool } from './claude'

// ============================================================================
// Agent tool registry
// ----------------------------------------------------------------------------
// Two kinds:
//   READ tools     — fire immediately, return data
//   ACTION tools   — open an agent_actions row with status='pending',
//                    wait for Phil to approve in the UI, THEN execute
//
// For v1 we ship 7 read tools + 3 action tools. Each has:
//   - a Tool descriptor sent to Claude
//   - a runner() that returns the tool_result string Claude sees
//
// Adding a new tool: define schema + add runner + export from TOOLS.
// ============================================================================

// ── Tool descriptors (sent to Claude) ──────────────────────────────

export const TOOL_DESCRIPTORS: Tool[] = [
  {
    name: 'query_members',
    description: 'List recent cityrider auth users (drivers, rental companies, tour guides, customers, admins). Returns a slim summary with name, whatsapp, account_type, status, last_sign_in_at.',
    input_schema: {
      type: 'object',
      properties: {
        type:  { type: 'string', enum: ['all', 'driver', 'rental_company', 'customer', 'admin'] },
        since_days: { type: 'integer', description: 'Only users created in the last N days. Default 30.' },
        limit: { type: 'integer', description: 'Max rows. Default 50.' },
      },
    },
  },
  {
    name: 'query_receipts',
    description: 'List recent QR payment receipts with status, amount, payer email, fraud_flags. Useful for "how many pending?" / "any flagged today?".',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'all'] },
        limit:  { type: 'integer' },
      },
    },
  },
  {
    name: 'query_revenue',
    description: 'Aggregate revenue (paid payment_intents) over the last N days, grouped by product (subscription, rental_company_*, tour_guide_*). Returns total_idr, count, and per-product breakdown.',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', description: 'Default 30.' } },
    },
  },
  {
    name: 'query_alerts',
    description: 'List recent app_health_alerts across all apps. Filter by severity and status. Useful for "what is broken today?" or "show me critical alerts".',
    input_schema: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['critical', 'error', 'warning', 'info', 'any'] },
        only_open: { type: 'boolean', description: 'If true, only return unresolved. Default true.' },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'query_affiliates',
    description: 'Top affiliate agents ranked by approved referral count + Rp earned. Useful for "who is my best affiliate?".',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'Default 10.' } },
    },
  },
  {
    name: 'query_wa_clicks',
    description: 'WhatsApp click totals in the last N days broken down by app and by context. Useful for "where are users tapping?".',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', description: 'Default 30.' } },
    },
  },
  {
    name: 'count_overdue_pdp',
    description: 'Count overdue PDP data-deletion requests (past the 30-day SLA). Useful before sending compliance reports.',
    input_schema: { type: 'object', properties: {} },
  },

  // ── ACTION tools — open an agent_actions row, wait for approval ──
  {
    name: 'propose_email_draft',
    description: 'Draft a transactional email for Phil to review. Does NOT send. After approval the email is sent via Resend.',
    input_schema: {
      type: 'object',
      properties: {
        to:       { type: 'string', description: 'Recipient email' },
        subject:  { type: 'string' },
        body_html: { type: 'string', description: 'Full HTML body. Use renderEmail helper format on the server.' },
        reasoning: { type: 'string', description: 'Why this email — shown to Phil in the approval card.' },
      },
      required: ['to', 'subject', 'body_html'],
    },
  },
  {
    name: 'propose_receipt_decision',
    description: 'Propose approving or rejecting a specific QR payment receipt. Action does NOT execute until Phil taps Approve in the UI.',
    input_schema: {
      type: 'object',
      properties: {
        receipt_id: { type: 'string' },
        decision:   { type: 'string', enum: ['approved', 'rejected'] },
        rejection_reason: { type: 'string', description: 'Required if decision = rejected' },
        reasoning: { type: 'string' },
      },
      required: ['receipt_id', 'decision'],
    },
  },
  {
    name: 'propose_social_post',
    description: 'Draft a social media post (Instagram or Facebook). Does NOT post. After approval Phil copies the text manually or auto-posts via Meta Graph (later session).',
    input_schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['instagram', 'facebook'] },
        caption:  { type: 'string' },
        suggested_image_prompt: { type: 'string', description: 'For DALL-E / Midjourney etc' },
        reasoning: { type: 'string' },
      },
      required: ['platform', 'caption'],
    },
  },
  {
    name: 'query_email_audience',
    description: 'Preview the recipient count + first 10 emails for a given audience filter. ALWAYS call this BEFORE propose_email_campaign so you can tell Phil the audience size up front. Read-only.',
    input_schema: {
      type: 'object',
      properties: {
        audience_type: {
          type: 'string',
          enum: ['all', 'driver', 'rental_company', 'tour_guide', 'customer'],
          description: 'Which account type to target. "all" = every auth user.',
        },
        subscription_status: { type: 'string', enum: ['active', 'expired', 'any'] },
        expiring_within_days: { type: 'integer', description: 'For active subs only — narrow to those expiring in N days.' },
        signed_up_within_days: { type: 'integer', description: 'Only users created in the last N days.' },
      },
      required: ['audience_type'],
    },
  },
  {
    name: 'propose_email_campaign',
    description: 'Draft a BULK email campaign to many recipients. Does NOT send. Opens agent_actions for Phil to approve; on approval, system iterates Resend sends + logs each. ALWAYS call query_email_audience FIRST so you can confirm the recipient count. The system auto-appends a Bahasa unsubscribe footer pointing to streetlocallive@gmail.com.',
    input_schema: {
      type: 'object',
      properties: {
        audience_type:        { type: 'string', enum: ['all', 'driver', 'rental_company', 'tour_guide', 'customer'] },
        subscription_status:  { type: 'string', enum: ['active', 'expired', 'any'] },
        expiring_within_days: { type: 'integer' },
        signed_up_within_days:{ type: 'integer' },
        subject:              { type: 'string', description: 'Email subject line — Bahasa by default.' },
        body_html:            { type: 'string', description: 'Email body. HTML or plain text. Use {name} as a personalisation token; system replaces per-recipient.' },
        reasoning:            { type: 'string', description: 'Why this campaign — shown to Phil in the approval card.' },
      },
      required: ['audience_type', 'subject', 'body_html'],
    },
  },
]

// ── Runners ────────────────────────────────────────────────────────

export async function runTool(name: string, input: Record<string, unknown>): Promise<{ result: string; is_error?: boolean; action_pending?: { type: string; args: Record<string, unknown>; reasoning?: string } }> {
  try {
    switch (name) {
      case 'query_members':          return { result: await runQueryMembers(input) }
      case 'query_receipts':         return { result: await runQueryReceipts(input) }
      case 'query_revenue':          return { result: await runQueryRevenue(input) }
      case 'query_alerts':           return { result: await runQueryAlerts(input) }
      case 'query_email_audience':   return { result: await runQueryEmailAudience(input) }
      case 'query_affiliates':       return { result: await runQueryAffiliates(input) }
      case 'query_wa_clicks':        return { result: await runQueryWaClicks(input) }
      case 'count_overdue_pdp':      return { result: await runCountOverduePdp() }
      case 'propose_email_draft':
      case 'propose_receipt_decision':
      case 'propose_social_post':
      case 'propose_email_campaign':
        return {
          result: `Action proposed. Awaiting Phil's approval — visible in the agent panel.`,
          action_pending: {
            type: name.replace('propose_', ''),
            args: input,
            reasoning: typeof input.reasoning === 'string' ? input.reasoning : undefined,
          },
        }
      default:
        return { result: `Unknown tool: ${name}`, is_error: true }
    }
  } catch (e) {
    return { result: e instanceof Error ? e.message : 'Tool failed', is_error: true }
  }
}

// ── Concrete runner implementations ────────────────────────────────

async function runQueryMembers(input: Record<string, unknown>): Promise<string> {
  const admin = getAdminSupabase()
  if (!admin) return 'Server not configured'
  const days = Math.min(Number(input.since_days) || 30, 365)
  const limit = Math.min(Number(input.limit) || 50, 200)
  const type = String(input.type || 'all')
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const all = (users?.users ?? []) as Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null; user_metadata?: Record<string, unknown> }>
  const filtered = all.filter((u) => u.created_at >= since)

  // Optional join on user_accounts to derive account_type
  const ids = filtered.map((u) => u.id)
  const { data: accounts } = await admin.from('user_accounts').select('user_id, account_type').in('user_id', ids)
  const acctMap = new Map<string, string>()
  for (const a of (accounts ?? []) as Array<{ user_id: string; account_type: string }>) acctMap.set(a.user_id, a.account_type)

  const out = filtered
    .map((u) => ({
      email: u.email,
      account_type: acctMap.get(u.id) || 'unknown',
      created_at: u.created_at.slice(0, 10),
      last_sign_in_at: u.last_sign_in_at?.slice(0, 10) || 'never',
    }))
    .filter((u) => type === 'all' || u.account_type === type)
    .slice(0, limit)
  return JSON.stringify({ count: out.length, since_days: days, members: out })
}

async function runQueryReceipts(input: Record<string, unknown>): Promise<string> {
  const admin = getAdminSupabase()
  if (!admin) return 'Server not configured'
  const status = String(input.status || 'pending_review')
  const limit = Math.min(Number(input.limit) || 50, 200)
  let q = admin.from('payment_receipts').select('id, user_id, product, amount_idr, status, created_at, payer_note').order('created_at', { ascending: false }).limit(limit)
  if (status !== 'all') q = q.eq('status', status)
  const { data } = await q
  return JSON.stringify({ count: (data ?? []).length, status, receipts: data ?? [] })
}

async function runQueryRevenue(input: Record<string, unknown>): Promise<string> {
  const admin = getAdminSupabase()
  if (!admin) return 'Server not configured'
  const days = Math.min(Number(input.days) || 30, 365)
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await admin.from('payment_intents').select('product, amount_idr').eq('status', 'paid').gte('paid_at', since)
  const byProduct: Record<string, { count: number; idr: number }> = {}
  let total = 0
  for (const r of (data ?? []) as Array<{ product: string; amount_idr: number }>) {
    total += r.amount_idr || 0
    byProduct[r.product] = byProduct[r.product] || { count: 0, idr: 0 }
    byProduct[r.product].count++
    byProduct[r.product].idr += r.amount_idr || 0
  }
  return JSON.stringify({ days, total_idr: total, payment_count: (data ?? []).length, by_product: byProduct })
}

async function runQueryAlerts(input: Record<string, unknown>): Promise<string> {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return 'Streetlocal Supabase not configured on this Vercel project'
  const severity = String(input.severity || 'any')
  const onlyOpen = input.only_open !== false
  const limit = Math.min(Number(input.limit) || 50, 200)
  let q = sl.from('app_health_alerts').select('id, severity, app_id, source, title, occurred_at, ack_at, resolved_at, occurrence_count').order('occurred_at', { ascending: false }).limit(limit)
  if (severity !== 'any') q = q.eq('severity', severity)
  if (onlyOpen) q = q.is('resolved_at', null)
  const { data } = await q
  return JSON.stringify({ count: (data ?? []).length, alerts: data ?? [] })
}

async function runQueryAffiliates(input: Record<string, unknown>): Promise<string> {
  const admin = getAdminSupabase()
  if (!admin) return 'Server not configured'
  const limit = Math.min(Number(input.limit) || 10, 50)
  const { data: agents } = await admin.from('affiliate_agents').select('id, name, agent_code, country, status')
  const { data: refs } = await admin.from('affiliate_referrals').select('agent_id, status, commission_amount')
  const tally: Record<string, { name: string; code: string; approved: number; paid: number; idr_earned: number }> = {}
  for (const a of (agents ?? []) as Array<{ id: string; name: string; agent_code: string }>) {
    tally[a.id] = { name: a.name, code: a.agent_code, approved: 0, paid: 0, idr_earned: 0 }
  }
  for (const r of (refs ?? []) as Array<{ agent_id: string; status: string; commission_amount: number }>) {
    const t = tally[r.agent_id]; if (!t) continue
    if (r.status === 'approved' || r.status === 'paid') t.approved++
    if (r.status === 'paid') t.paid++
    if (r.status === 'paid' || r.status === 'approved') t.idr_earned += r.commission_amount || 0
  }
  const top = Object.values(tally).sort((a, b) => b.approved - a.approved).slice(0, limit)
  return JSON.stringify({ top })
}

async function runQueryWaClicks(input: Record<string, unknown>): Promise<string> {
  const admin = getAdminSupabase()
  if (!admin) return 'Server not configured'
  const days = Math.min(Number(input.days) || 30, 90)
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await admin.from('wa_click_events').select('app_id, context').gte('occurred_at', since).limit(10000)
  const byApp: Record<string, number> = {}
  const byContext: Record<string, number> = {}
  for (const w of (data ?? []) as Array<{ app_id: string; context: string }>) {
    byApp[w.app_id] = (byApp[w.app_id] || 0) + 1
    byContext[w.context] = (byContext[w.context] || 0) + 1
  }
  return JSON.stringify({ days, total: (data ?? []).length, by_app: byApp, by_context: byContext })
}

async function runCountOverduePdp(): Promise<string> {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return 'Streetlocal Supabase not configured'
  const now = new Date().toISOString()
  const { count } = await sl.from('data_deletion_requests').select('id', { count: 'exact', head: true }).in('status', ['received', 'in_progress']).lt('sla_due_at', now)
  return JSON.stringify({ overdue_count: count ?? 0, as_of: now })
}

// ============================================================================
// resolveEmailAudience — shared filter→email-list resolver used by both
// the preview tool (query_email_audience) AND the campaign executor
// (in /api/admin/gateway/agent/actions/[id]).
//
// Filter shape:
//   audience_type: 'all' | 'driver' | 'rental_company' | 'tour_guide' | 'customer'
//   subscription_status?: 'active' | 'expired' | 'any'
//   expiring_within_days?: number   (driver/rental_co/tour_guide only)
//   signed_up_within_days?: number  (any type)
// ============================================================================
export type AudienceFilter = {
  audience_type?: string
  subscription_status?: string
  expiring_within_days?: number
  signed_up_within_days?: number
}
export type Recipient = { email: string; user_id: string; name: string | null }

export async function resolveEmailAudience(filter: AudienceFilter): Promise<Recipient[]> {
  const admin = getAdminSupabase()
  if (!admin) return []

  // 1. Pull all auth.users (capped at 1000 — for v1 this covers our scale)
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = (usersData?.users ?? []) as Array<{ id: string; email: string | null; created_at: string; user_metadata?: Record<string, unknown> }>

  // 2. Join with account / driver / subscription state
  const [{ data: accounts }, { data: subs }, { data: drivers }] = await Promise.all([
    admin.from('user_accounts').select('user_id, account_type, subscription_status, subscription_expires_at, tour_guide_status, tour_guide_expires_at'),
    admin.from('subscriptions').select('driver_id, status, current_period_end'),
    admin.from('drivers').select('user_id, business_name'),
  ])
  const acctMap = new Map<string, { account_type: string; subscription_status: string; subscription_expires_at: string | null; tour_guide_status: string; tour_guide_expires_at: string | null }>()
  for (const a of (accounts ?? []) as Array<{ user_id: string; account_type: string; subscription_status: string; subscription_expires_at: string | null; tour_guide_status: string; tour_guide_expires_at: string | null }>) {
    acctMap.set(a.user_id, a)
  }
  const subMap = new Map<string, { status: string; current_period_end: string | null }>()
  for (const s of (subs ?? []) as Array<{ driver_id: string; status: string; current_period_end: string | null }>) {
    subMap.set(s.driver_id, s)
  }
  const driverMap = new Map<string, { business_name: string | null }>()
  for (const d of (drivers ?? []) as Array<{ user_id: string; business_name: string | null }>) {
    driverMap.set(d.user_id, d)
  }

  const audience = (filter.audience_type || 'all').toLowerCase()
  const subStatus = (filter.subscription_status || 'any').toLowerCase()
  const expiringDays = typeof filter.expiring_within_days === 'number' ? filter.expiring_within_days : null
  const signupDays = typeof filter.signed_up_within_days === 'number' ? filter.signed_up_within_days : null
  const now = Date.now()
  const signupSince = signupDays != null ? now - signupDays * 86400000 : null

  const recipients: Recipient[] = []
  for (const u of users) {
    if (!u.email) continue
    if (signupSince != null && new Date(u.created_at).getTime() < signupSince) continue

    const acct = acctMap.get(u.id)
    const sub  = subMap.get(u.id)
    const drv  = driverMap.get(u.id)

    // Derive type
    let userType: string = 'customer'
    if (drv) userType = 'driver'
    else if (acct?.account_type === 'rental_company') userType = 'rental_company'
    else if (acct?.tour_guide_status && acct.tour_guide_status !== 'inactive') userType = 'tour_guide'

    if (audience !== 'all' && audience !== userType) continue

    // Subscription status / expiry filter
    if (subStatus !== 'any') {
      let status: string | null = null
      let expiresAt: string | null = null
      if (userType === 'driver') {
        status = sub?.status ?? null
        expiresAt = sub?.current_period_end ?? null
      } else if (userType === 'rental_company') {
        status = acct?.subscription_status ?? null
        expiresAt = acct?.subscription_expires_at ?? null
      } else if (userType === 'tour_guide') {
        status = acct?.tour_guide_status ?? null
        expiresAt = acct?.tour_guide_expires_at ?? null
      }
      if (subStatus === 'active' && status !== 'active') continue
      if (subStatus === 'expired' && (status === 'active' || status === 'trial')) continue
      if (expiringDays != null && expiresAt) {
        const ms = new Date(expiresAt).getTime() - now
        if (ms < 0 || ms > expiringDays * 86400000) continue
      }
    }

    const meta = (u.user_metadata ?? {}) as Record<string, unknown>
    const name = drv?.business_name
      || (typeof meta.full_name === 'string' ? meta.full_name : null)
      || (typeof meta.name === 'string' ? meta.name : null)
    recipients.push({ email: u.email, user_id: u.id, name })
  }

  return recipients
}

async function runQueryEmailAudience(input: Record<string, unknown>): Promise<string> {
  const recipients = await resolveEmailAudience(input as AudienceFilter)
  const sample = recipients.slice(0, 10).map((r) => ({ email: r.email, name: r.name }))
  return JSON.stringify({
    audience_count: recipients.length,
    sample_first_10: sample,
    filter_applied: input,
    note: recipients.length > 0
      ? `Found ${recipients.length} recipients. Tell Phil this count BEFORE proposing the campaign.`
      : 'Zero recipients match this filter. Adjust criteria.',
  })
}
