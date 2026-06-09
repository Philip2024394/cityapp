import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getMyAccount } from '@/lib/auth/account'
import { pageCapForPlan } from '@/lib/auth/pageCap'
import { slugify } from '@/lib/beautician/slug'

// /api/beautician/me/pages
// ----------------------------------------------------------------------------
// Studio tier multi-location / agency sub-account list.
// GET  → all beautician_providers owned by the signed-in user.
// POST → create an additional page (Studio plan only, capped by
//        pageCapForPlan()). Body: { display_name: string }.
// ============================================================================

export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('beautician_providers')
    .select('id, slug, display_name, profile_image_url, theme_color, status, is_draft')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  return NextResponse.json({ pages: data ?? [] })
}

function randomSuffix(len = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function POST(req: Request) {
  const me = await getMyAccount()
  if (!me) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  const { userId, account } = me

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { display_name?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const rawName = typeof body.display_name === 'string' ? body.display_name.trim() : ''
  if (rawName.length < 2) {
    return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
  }
  if (rawName.length > 80) {
    return NextResponse.json({ error: 'name_too_long' }, { status: 400 })
  }

  const cap = pageCapForPlan(account.plan)

  // Count current pages owned by this user.
  const { count: currentCount, error: countErr } = await admin
    .from('beautician_providers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countErr) {
    return NextResponse.json({ error: 'count_failed' }, { status: 500 })
  }
  const owned = currentCount ?? 0
  if (owned >= cap) {
    return NextResponse.json({ error: 'page_cap_reached', cap }, { status: 409 })
  }

  // Generate a slug — base + random suffix so multi-location names like
  // "Ayu" → "ayu-x4k7q2" don't collide with the original "ayu" slug.
  const base = slugify(rawName)
  let slug = `${base}-${randomSuffix()}`
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await admin
      .from('beautician_providers').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${base}-${randomSuffix()}`
    if (i === 4) return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
  }

  // Stub row — minimal fields the NOT NULL columns require. The owner
  // fills the rest from /dashboard/beautician on the new page. Same
  // legacy-column placeholders the signup route uses (gender, years).
  // status='pending' is the only legal new-row value (mig 0058 check
  // constraint). is_draft stays false because mig 0226 requires a
  // non-empty draft_password whenever is_draft is true — owners flip
  // the draft lock later from the dashboard with a password.
  const { error: insertErr } = await admin
    .from('beautician_providers')
    .insert({
      user_id: userId,
      slug,
      display_name: rawName,
      gender: 'woman',
      years_experience: 0,
      bio: '',
      whatsapp_e164: '',
      availability: 'offline',
      status: 'pending',
      is_draft: false,
    })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
    }
    return NextResponse.json({ error: 'insert_failed', detail: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug })
}
