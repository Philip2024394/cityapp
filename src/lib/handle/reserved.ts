// ============================================================================
// src/lib/handle/reserved.ts — reserved-handle set + handle shape regex
// ----------------------------------------------------------------------------
// Used by /api/handle/check (the live availability ping the landing hero
// fires as the visitor types) AND any future signup-form slug validation.
// Keeping the set + regex co-located guarantees the check API and any future
// client-side hint render identical decisions.
//
// Update rule: if a new top-level route ships (e.g. /studio) or a new
// vertical lands (e.g. /event-planner), add its slug here BEFORE the route
// is deployed. Otherwise a customer can grab the handle first and shadow
// the platform route, which our Next.js routing would resolve to the
// static page (because static beats dynamic) — but search / share links
// would lead nowhere useful.
// ============================================================================

/** Reserved handles that collide with platform routes or are otherwise
 *  off-limits (admin, support, brand). The check API rejects these
 *  before hitting the DB. Lowercase only; comparison is case-insensitive. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Platform routes — Next.js static routes always beat dynamic slugs,
  // so claiming these would shadow nothing technically, but the user
  // would never be able to share a working URL.
  'api', 'app', 'admin', 'dashboard', 'signup', 'login', 'logout', 'register',
  'start', 'explore', 'search', 'pricing', 'how-it-works', 'custom-domains',
  'about', 'contact', 'terms', 'privacy', 'legal', 'account', 'profile',
  'forgot', 'reset', 'onboarding', 'help', 'support', 'docs', 'blog', 'news',
  // Brand / sensitive
  'kita2u', 'kita', 'citydrivers', 'cityriders', 'staff', 'team', 'official',
  // Note: vertical-route slugs (beautician, handyman, yoga, fitness, tattoo,
  // cake, barber, photo, video, food, pet, tour) moved to PREMIUM_HANDLES on
  // 2026-06-09 per founder direction. A yoga teacher should be able to BUY
  // kita2u.com/yoga as a Pro subscriber — the value of that handle is enormous
  // and the existing /yoga marketplace page is a hardcoded route that always
  // wins resolution. The slug doesn't shadow the route.
])

/** Lowercase handle that matches `[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?`.
 *  1-32 chars, lowercase letters/digits/dashes, no leading/trailing dash.
 *
 *  Length range widened from 4-32 → 1-32 on 2026-06-09 so that the
 *  premium-handle gate (see src/lib/handle/premium.ts) can serve the
 *  Pro-plan upgrade message for 1-3 char vanity handles instead of
 *  bouncing them at the shape gate as "invalid." The premium decision
 *  lives in /api/handle/check, not here.
 *
 *  Note: consecutive-dashes prevention is left to a separate
 *  `.includes('--')` check at the call site; the bracket class naturally
 *  allows `--` runs, so we don't try to express that purely with regex. */
export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/
