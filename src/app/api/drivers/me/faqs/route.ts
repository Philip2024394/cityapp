import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /api/drivers/me/faqs
// ----------------------------------------------------------------------------
// Driver-self-published FAQ storage for the bus "Contact Us" panel (mig 0170).
// Backs /dashboard/bus/faq. Persists to the `drivers.faqs` jsonb column.
//
// Body shape (POST):
//   { faqs: { q: string; a: string }[] }
//
//   • Empty / whitespace-only rows are dropped server-side.
//   • q is capped at 200 chars, a at 1000 chars (matching the editor inputs).
//   • The endpoint is REPLACE-semantics — the editor always sends the full
//     list, so "Reset" just POSTs `faqs: []`.
//
// GET — returns the current driver's faqs array (post-sanitiser).
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// platform never edits FAQ entries — every Q/A is driver-self-published.
// ============================================================================

type FAQItem = { q: string; a: string }

const Q_MAX = 200
const A_MAX = 1000

// -----------------------------------------------------------------------------
// Sanitiser — drops malformed entries, trims, caps lengths. Anything that
// fails validation is silently skipped so a noisy client can't 400 the user.
// -----------------------------------------------------------------------------
function sanitizeFaqs(raw: unknown): FAQItem[] {
  if (!Array.isArray(raw)) return []
  const out: FAQItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as { q?: unknown; a?: unknown }
    const q = typeof row.q === 'string' ? row.q.trim().slice(0, Q_MAX) : ''
    const a = typeof row.a === 'string' ? row.a.trim().slice(0, A_MAX) : ''
    if (!q || !a) continue
    out.push({ q, a })
  }
  return out
}

// -----------------------------------------------------------------------------
// GET — hydrate the dashboard editor with the current FAQ list.
// -----------------------------------------------------------------------------
export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const { data, error } = await admin
    .from('drivers')
    .select('faqs')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const raw = (data as { faqs?: unknown } | null)?.faqs
  return NextResponse.json({ faqs: sanitizeFaqs(raw) })
}

// -----------------------------------------------------------------------------
// POST — replace the driver's faqs jsonb with the sanitised array.
// -----------------------------------------------------------------------------
export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { faqs?: unknown }
  try { body = await req.json() as { faqs?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body || typeof body !== 'object' || !('faqs' in body)) {
    return NextResponse.json({ error: 'Missing faqs' }, { status: 400 })
  }

  const sanitized = sanitizeFaqs(body.faqs)

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Cast through unknown because the generated Database types likely don't
  // yet include the post-0170 `faqs` column. The runtime payload is a plain
  // jsonb write.
  const update = { faqs: sanitized } as unknown as Record<string, unknown>
  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, faqs: sanitized })
}
