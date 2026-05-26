import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ============================================================================
// IndoCity — auth middleware
// ============================================================================
// Protects rider/admin/onboarding routes. Public surfaces (landing, /cari,
// /cari/rider, /r/[slug]) stay open so customers can browse without an account.
// When Supabase env is not configured, middleware allows everything through
// so the dev server still boots in legacy demo mode.
// ============================================================================

// Authenticated routes — require a logged-in user
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/onboarding', '/profile']

// Auth pages — redirect logged-in users away
const AUTH_PAGES = ['/login', '/signup', '/forgot']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname)
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const res = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Demo mode: env not configured yet — let everything through so the
  // current mock-data app keeps booting. Replace this branch once env is set.
  if (!supabaseUrl || !supabaseAnon) {
    return res
  }

  type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        )
      },
    },
  })

  // IMPORTANT: must call getUser() to refresh the session cookie on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect logged-in users away from auth pages
  if (user && isAuthPage(url.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Block logged-out users from protected routes
  if (!user && isProtected(url.pathname)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', url.pathname + url.search)
    return NextResponse.redirect(loginUrl)
  }

  // Role-aware checks for /admin happen at the page/layout level (one DB hit).
  // We deliberately do not query the DB in middleware to keep it fast on weak
  // Indonesian mobile networks.

  return res
}

export const config = {
  // Match page navigations only. Excludes:
  //   - /api/*           (each route does its own auth; middleware would
  //                       add an extra Supabase round-trip per call)
  //   - _next/static     (immutable build assets)
  //   - _next/image      (image optimizer)
  //   - sw.js / manifest (PWA bootstrap, never auth-gated)
  //   - common static    (favicon, robots, sitemap, og/*, icons/*)
  //   - image extensions (avoids touching /og-default.png etc.)
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|og-default\\.png|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
