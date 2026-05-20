import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ============================================================================
// GET /auth/callback?code=...&next=...
// ----------------------------------------------------------------------------
// Supabase PKCE-flow callback. Magic links + OAuth providers redirect the
// browser here with a one-time `code`. We swap the code for a session via
// `exchangeCodeForSession`, which writes the auth cookies into the
// response. The browser then follows the final redirect with cookies in
// hand — landing on a route that can read the session.
//
// Without this route, magic-link clicks set cookies on supabase.co's
// domain only, which our app at localhost/cityrider.* can never read,
// so the user lands at /dashboard signed-out.
// ============================================================================

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'
  // Normalise `next` — refuse external redirects so an attacker can't
  // bounce signed-in users to a phishing domain via a crafted link.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  const redirectUrl = new URL(safeNext, url.origin)

  if (!code) {
    // No code in the URL → nothing to exchange. Send the user to /login
    // with a hint so they can retry. Don't 500 — magic-link expiry is
    // a normal user-facing case.
    const fallback = new URL('/login?error=missing-code', url.origin)
    return NextResponse.redirect(fallback)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // Build the redirect response FIRST so the Supabase SSR client can
  // attach the freshly-issued session cookies to it. The cookies adapter
  // mutates `response.cookies` during exchangeCodeForSession.
  const response = NextResponse.redirect(redirectUrl)

  type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const fallback = new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    return NextResponse.redirect(fallback)
  }

  return response
}
