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
  // Platform routes
  'api', 'app', 'admin', 'dashboard', 'signup', 'login', 'logout', 'register',
  'start', 'explore', 'search', 'pricing', 'how-it-works', 'custom-domains',
  'about', 'contact', 'terms', 'privacy', 'legal', 'account', 'profile',
  'forgot', 'reset', 'onboarding', 'help', 'support', 'docs', 'blog', 'news',
  // Vertical routes (one per Kita2u vertical so a profile slug can't shadow)
  'beautician', 'handyman', 'laundry', 'massage', 'home-clean', 'facial',
  'food', 'tour', 'tattoo', 'barber', 'photo', 'video', 'catering', 'cake',
  'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor',
  'car-wash', 'parcel',
  // Brand / sensitive
  'kita2u', 'kita', 'citydrivers', 'cityriders', 'staff', 'team', 'official',
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
