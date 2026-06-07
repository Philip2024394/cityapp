import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/auth/signup
// ----------------------------------------------------------------------------
// Creates a Supabase auth user using a synthetic email, indexes the real
// WhatsApp phone in public.phone_index, and establishes a session cookie.
//
// Body: { phone: string (digits, 7-15), password: string (>=6), metadata? }
//
// Same phone may sign up multiple times with DIFFERENT passwords — each
// (phone, password) pair becomes an independent business account. Same
// (phone, password) collisions are rejected here so login stays unambiguous.
// ============================================================================

export const dynamic = 'force-dynamic'

const SYNTHETIC_EMAIL_DOMAIN = 'kita2u.local'

function makeSyntheticEmail(phone: string): string {
  const random = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return `${phone}-${random}@${SYNTHETIC_EMAIL_DOMAIN}`
}

// Ephemeral anon client for the (phone, password) collision probe. We DON'T
// use the cookie-bound server client because a successful probe would clobber
// the visitor's existing session.
function ephemeralAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type SignupBody = {
  phone?: string
  password?: string
  metadata?: Record<string, unknown>
}

export async function POST(req: Request) {
  let body: SignupBody
  try {
    body = (await req.json()) as SignupBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const phone = (body.phone || '').replace(/\D/g, '')
  const password = body.password || ''
  if (!/^\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  // 1. Look up existing accounts on this phone.
  const { data: candidates, error: lookupErr } = await admin
    .from('phone_index')
    .select('auth_user_id, synthetic_email')
    .eq('phone', phone)
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 })
  }

  // 2. Reject same (phone, password) collisions.
  if (candidates && candidates.length > 0) {
    const probe = ephemeralAnonClient()
    if (!probe) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
    }
    for (const c of candidates as Array<{ synthetic_email: string }>) {
      const { data } = await probe.auth.signInWithPassword({
        email: c.synthetic_email,
        password,
      })
      if (data?.session) {
        await probe.auth.signOut()
        return NextResponse.json(
          {
            error:
              'An account with this WhatsApp number and password already exists. Sign in instead, or pick a different password to add a separate business.',
          },
          { status: 409 },
        )
      }
    }
  }

  // 3. Create the auth user with a synthetic email.
  const syntheticEmail = makeSyntheticEmail(phone)
  const metadata = { ...(body.metadata ?? {}), wa_phone: phone }
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message || 'Could not create account' },
      { status: 500 },
    )
  }

  // 4. Index for later phone-based login.
  const { error: idxErr } = await admin.from('phone_index').insert({
    auth_user_id: created.user.id,
    phone,
    synthetic_email: syntheticEmail,
  })
  if (idxErr) {
    // Roll back the auth user so we never leave an orphan.
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: idxErr.message }, { status: 500 })
  }

  // 5. Establish session via the cookie-bound server client.
  const supabase = await getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  })
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
