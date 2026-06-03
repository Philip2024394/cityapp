import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ============================================================================
// CityDrivers — auth middleware
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

// citydrivers.id host scope. Requests to the citydrivers.id apex or www get
// the cityriders main app + drivers + ride/truck/car/bus marketing only.
// All other public surfaces (beautician, laundry, handyman, etc — the
// kita2u.com selling-apps catalog) are rewritten to the cityriders hub on
// this host so the domains stay editorially separate.
// 2026-05-31 — citydrivers.id is the canonical brand domain. citydrivers.id
// stays attached to the Worker purely to 301-redirect old QR codes / shared
// links to the canonical host. The driver-directory host-scope logic only
// fires for citydrivers.id (the redirect happens before the scope gate so
// citydrivers.id never reaches it).
const RETIRED_HOSTS = new Set(['cityriders.id', 'www.cityriders.id'])
const CANONICAL_HOST = 'citydrivers.id'
const CITYRIDERS_HOSTS = new Set([
  'citydrivers.id',
  'www.citydrivers.id',
])
// Kita2u marketplace hosts — when the founder buys kita2u.com and points
// it at this Vercel project, these are the only production hostnames
// that should serve the multi-vertical (beautician/handyman/laundry/
// etc.) marketplace. Any other production host that isn't citydrivers.id,
// kita2u.com, localhost, or *.vercel.app returns 404 from the gate
// below — protects against random DNS pointed at this deploy.
const KITA2U_HOSTS = new Set([
  'kita2u.com',
  'www.kita2u.com',
])
const CITYRIDERS_PAGE_PREFIXES = [
  '/cityriders',
  '/cari',
  '/drivers',
  '/r',  // ← bike per-driver profile (/r/[slug]). Without this entry the host-scope rewrite below sent EVERY bike profile URL to /cityriders, which is exactly the "bike profile button bounces to landing page" bug the founder hit repeatedly on 2026-06-02.
  '/places',  // ← city-pass / places directory (/places + /places/[slug]). Same class of whitelist miss as /r above — taps on the city-pass button were silently rewritten to /cityriders.
  '/car',
  '/truck',
  '/bus',
  '/jeep',
  '/ride',
  '/dashboard/rider',
  '/dashboard/car',
  '/dashboard/truck',
  '/dashboard/bus',
  '/dashboard/jeep',
  '/dashboard/partner',
  // /signup covers BOTH the bare path (bike uses /signup?role=driver — no
  // dedicated bike page) and every per-vehicle sub-route (/signup/car,
  // /signup/truck, /signup/bus, /signup/jeep) via the prefix match in
  // isCityridersPath. The four explicit sub-entries this replaced were
  // missing the bare /signup, so the bike "Sign up" CTA on /drivers
  // was silently rewritten to /cityriders — same class of bug as the
  // /r whitelist miss fixed on 2026-06-02. One bare prefix covers
  // every current AND future signup sub-route.
  '/signup',
  '/partners',
  '/p',
  '/login',
  '/forgot',
  '/privacy',
  '/terms',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname)
}

function isCityridersPath(pathname: string): boolean {
  if (pathname === '/') return false
  return CITYRIDERS_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  // Dev-only host override — set DEV_HOST_OVERRIDE in .env.local to test
  // either app locally without /etc/hosts hacks. Values:
  //   DEV_HOST_OVERRIDE=citydrivers.id   → middleware acts as if you're
  //                                        on citydrivers.id (cityriders
  //                                        host-scope rewrite kicks in)
  //   DEV_HOST_OVERRIDE=kita2u.com       → full Kita2u marketplace path
  // Production builds ignore this entirely (NODE_ENV check + localhost
  // gate), so it can never leak into a live request.
  const rawHost = (req.headers.get('host') || '').toLowerCase().split(':')[0]
  const isDev   = process.env.NODE_ENV !== 'production'
  const isLocal = rawHost === 'localhost' || rawHost === '127.0.0.1'
  const reqHost = (isDev && isLocal && process.env.DEV_HOST_OVERRIDE)
    ? process.env.DEV_HOST_OVERRIDE.toLowerCase()
    : rawHost

  // Retired-domain redirect: any request to citydrivers.id (apex or www) is
  // 301-redirected to the equivalent path on citydrivers.id. Preserves any
  // shared link, printed QR, or indexed page during the rename transition.
  if (RETIRED_HOSTS.has(reqHost)) {
    const dest = url.clone()
    dest.protocol = 'https:'
    dest.host = CANONICAL_HOST
    dest.port = ''
    return NextResponse.redirect(dest, 301)
  }

  // Production-host allow-list gate. Three live hostnames serve content:
  //
  //   citydrivers.id  → cityriders driver-directory (host-scoped paths
  //                     below; everything else rewrites to /cityriders).
  //   kita2u.com      → full multi-vertical marketplace + Kita2u landing
  //                     on `/`. No host-scope rewrite — every route is
  //                     reachable.
  //   localhost / *.vercel.app → dev + preview deploys. Same behaviour
  //                     as kita2u.com (full marketplace) so previews
  //                     stay testable end-to-end.
  //
  // Anything else (random preview URLs from forked clones, attempted
  // subdomain takeovers, stale DNS from a project move) returns a 404
  // page. Founder direction 2026-06-03 after kita2u.com purchase.
  const isLocalDev =
    reqHost === 'localhost' || reqHost === '127.0.0.1' || reqHost.endsWith('.vercel.app')
  const isProductionAllowed =
    CITYRIDERS_HOSTS.has(reqHost) || KITA2U_HOSTS.has(reqHost) || isLocalDev
  if (!isProductionAllowed) {
    return new NextResponse('Not Found', {
      status:  404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // Host-scope gate: on citydrivers.id, only the cityriders-app surfaces are
  // exposed. Apex `/` lands on the /cityriders hub; anything outside the
  // allow-list is rewritten to /cityriders so users never see beautician /
  // laundry / handyman / etc. content on this domain.
  if (CITYRIDERS_HOSTS.has(reqHost)) {
    if (url.pathname === '/') {
      const dest = url.clone()
      dest.pathname = '/cityriders'
      return NextResponse.rewrite(dest)
    }
    if (!isCityridersPath(url.pathname)) {
      const dest = url.clone()
      dest.pathname = '/cityriders'
      dest.search = ''
      return NextResponse.rewrite(dest)
    }
  }

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

  // DEV BYPASS — on localhost only, a `cr-dev-uid` cookie set by
  // /api/dev/impersonate acts as a synthetic session. Pages honor this
  // cookie via /api/dev/driver; the middleware must therefore treat it
  // as "signed in" to avoid an immediate redirect to /login.
  const host = req.headers.get('host') || ''
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const isProd = process.env.NODE_ENV === 'production'
  const devUid = !isProd && isLocalhost ? req.cookies.get('cr-dev-uid')?.value : null
  const effectivelySignedIn = !!user || !!devUid

  // Redirect logged-in users away from auth pages
  if (effectivelySignedIn && isAuthPage(url.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Block logged-out users from protected routes
  if (!effectivelySignedIn && isProtected(url.pathname)) {
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
