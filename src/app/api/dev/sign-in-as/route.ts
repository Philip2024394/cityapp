import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/dev/sign-in-as?email=...
// ----------------------------------------------------------------------------
// DEV-ONLY backdoor. Creates a session for the given email entirely
// server-side and 302-redirects to /dashboard with the session cookies
// already attached to the response. One round-trip, no PKCE dance, no
// SMS.
//
// How it works:
//   1. Admin client calls auth.admin.generateLink({type:'magiclink'}) —
//      returns a hashed_token along with the action_link.
//   2. SSR client (anon key) calls auth.verifyOtp({token_hash, type})
//      with cookies adapter pointed at the OUTGOING response, so the
//      issued session lands on this origin's cookies.
//   3. Return the redirect response — browser lands on /dashboard with
//      a valid session.
//
// Gated on:
//   • NODE_ENV !== 'production'
//   • request host === 'localhost' || '127.0.0.1'
// ============================================================================

const DEFAULT_EMAIL = 'phillipofarrell+cityrider@gmail.com'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only route' }, { status: 403 })
  }
  const url = new URL(request.url)
  const host = url.hostname
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return NextResponse.json({ error: 'dev-only route — localhost only' }, { status: 403 })
  }

  const email = url.searchParams.get('email') ?? DEFAULT_EMAIL
  const finalDest = url.searchParams.get('redirect') ?? '/dashboard'
  const safeDest = finalDest.startsWith('/') && !finalDest.startsWith('//') ? finalDest : '/dashboard'
  const redirectUrl = new URL(safeDest, url.origin)

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
  }

  // Step 1: ask admin for a magic-link → we want the hashed_token field
  // so we can verify it ourselves on the same request, no browser
  // round-trip needed.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${url.origin}${safeDest}` },
  })
  const hashedToken = linkData?.properties?.hashed_token
  if (linkErr || !hashedToken) {
    return NextResponse.json(
      {
        error: linkErr?.message ?? 'generateLink returned no hashed_token',
        hint: 'Has the dev driver been created? Run: node scripts/dev-create-driver.mjs 6281392000050',
      },
      { status: 500 },
    )
  }

  // Step 2: build the redirect response FIRST so the SSR client's
  // cookie adapter attaches the freshly-issued session cookies to it.
  const response = NextResponse.redirect(redirectUrl)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Step 3: verify the hashed_token — this creates a real session and
  // calls our cookie adapter to persist the auth cookies on the
  // outgoing response.
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'magiclink',
  })
  if (verifyErr) {
    return NextResponse.json(
      { error: verifyErr.message, hint: 'verifyOtp failed — check Supabase logs' },
      { status: 500 },
    )
  }

  return response
}
