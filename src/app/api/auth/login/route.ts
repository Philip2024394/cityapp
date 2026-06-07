import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/auth/login
// ----------------------------------------------------------------------------
// Body: { phone: string (digits, 7-15), password: string (>=6) }
//
// Looks up all phone_index rows for this phone, then iterates
// signInWithPassword({ email: synthetic_email, password }) against the
// cookie-bound server client. First match wins → session cookie set on the
// response. All fail → 401. The error message is intentionally generic
// ("Wrong number or password") so we don't leak which phones are registered.
// ============================================================================

export const dynamic = 'force-dynamic'

type LoginBody = { phone?: string; password?: string }

const GENERIC_ERR = 'Wrong number or password.'

export async function POST(req: Request) {
  let body: LoginBody
  try {
    body = (await req.json()) as LoginBody
  } catch {
    return NextResponse.json({ error: GENERIC_ERR }, { status: 401 })
  }

  const phone = (body.phone || '').replace(/\D/g, '')
  const password = body.password || ''
  if (!/^\d{7,15}$/.test(phone) || password.length < 6) {
    return NextResponse.json({ error: GENERIC_ERR }, { status: 401 })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  const { data: candidates } = await admin
    .from('phone_index')
    .select('synthetic_email')
    .eq('phone', phone)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: GENERIC_ERR }, { status: 401 })
  }

  const supabase = await getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  for (const c of candidates as Array<{ synthetic_email: string }>) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: c.synthetic_email,
      password,
    })
    if (!error && data?.session) {
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ error: GENERIC_ERR }, { status: 401 })
}
