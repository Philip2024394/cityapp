// ============================================================================
// GET /api/handle/check?h=<handle>
// ----------------------------------------------------------------------------
// Live availability ping fired by the landing hero (HandleEntryHero) on every
// keystroke (debounced 300ms client-side). Returns one of:
//
//   { available: true }                                            200
//   { available: false, reason: 'invalid' }                        200 — bad shape
//   { available: false, reason: 'reserved' }                       200 — in the static set
//   { available: false, reason: 'taken' }                          200 — exists in any
//                                                                  <vertical>_providers
//   { available: false, reason: 'premium', requiresPlan: 'pro' }   200 — short / vanity,
//                                                                  Pro-plan upsell
//
// Evaluation order is invalid → reserved → taken → premium. "Taken" beats
// "premium" deliberately: a premium-eligible slug that is already claimed
// must read as TAKEN, since that's the more actionable explanation for the
// visitor (the slug is gone, not gated).
//
// Performance budget: < 200ms. All provider-table lookups fire in parallel
// via Promise.all, each one a `SELECT id` LIMIT 1 on the indexed `slug`
// column — Supabase Postgres returns these in single-digit ms.
//
// No caching. The user's typing is the trigger; a 304 / stale-while-
// revalidate response would lie about availability the moment another
// signup grabs the slug. Same reason `revalidate = 0`.
//
// 2026-06-09 — Initial ship as part of the typed-handle entry hero.
// 2026-06-09 — Premium-handle Pro-plan upsell added (see premium.ts).
// ============================================================================
import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { HANDLE_RE, RESERVED_HANDLES } from '@/lib/handle/reserved'
import { isPremiumHandle } from '@/lib/handle/premium'

export const runtime = 'nodejs'
export const revalidate = 0

// Provider tables to probe. `food` and `tour` are intentionally absent —
// neither vertical has a `_providers` table in src/types/supabase.ts yet,
// so adding them here would surface a Postgres "relation does not exist"
// error per request. Re-add the moment those tables ship.
const PROVIDER_TABLES = [
  'beautician_providers',
  'handyman_providers',
  'laundry_providers',
  'massage_providers',
  'home_clean_providers',
  'facial_providers',
  'tattoo_providers',
  'barber_providers',
  'photo_providers',
  'video_providers',
  'catering_providers',
  'cake_providers',
  'florist_providers',
  'fitness_providers',
  'yoga_providers',
  'tutoring_providers',
  'pet_providers',
  'mover_providers',
  'tailor_providers',
  'carwash_providers',
  'parcel_providers',
] as const

type Reason = 'invalid' | 'reserved' | 'taken' | 'premium'
type CheckResponse =
  | { available: true }
  | { available: false; reason: Exclude<Reason, 'premium'> }
  | { available: false; reason: 'premium'; requiresPlan: 'pro' }

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = (url.searchParams.get('h') || '').trim().toLowerCase()

  // 1. Shape gate. Empty, too short, too long, bad chars, leading/trailing
  // dash → invalid. Also reject consecutive dashes (Linktree-equivalent
  // rule; the HANDLE_RE bracket class permits them so we filter here).
  if (!raw || !HANDLE_RE.test(raw) || raw.includes('--')) {
    return NextResponse.json<CheckResponse>(
      { available: false, reason: 'invalid' },
      { status: 200 },
    )
  }

  // 2. Reserved set — platform routes + brand. Cheaper than the DB hop
  // and guaranteed authoritative.
  if (RESERVED_HANDLES.has(raw)) {
    return NextResponse.json<CheckResponse>(
      { available: false, reason: 'reserved' },
      { status: 200 },
    )
  }

  // 3. Cross-table availability. Service-role client (RLS-bypassing) so
  // unverified / soft-hidden providers still count as "taken" — a
  // collision on slug must be authoritative regardless of moderation
  // state.
  const admin = getAdminSupabase()
  if (!admin) {
    // Service role missing → fail open BUT still surface the premium
    // gate, since premium is a static rule independent of DB state. The
    // signup form's unique constraint catches collisions on the
    // available path.
    if (isPremiumHandle(raw)) {
      return NextResponse.json<CheckResponse>(
        { available: false, reason: 'premium', requiresPlan: 'pro' },
        { status: 200 },
      )
    }
    return NextResponse.json<CheckResponse>(
      { available: true },
      { status: 200 },
    )
  }

  const probes = PROVIDER_TABLES.map((table) =>
    admin
      .from(table)
      .select('id')
      .eq('slug', raw)
      .limit(1)
      .maybeSingle(),
  )

  const results = await Promise.all(probes)
  const taken = results.some((r) => r.data !== null)

  // 3a. Taken beats premium — a premium-eligible slug that's already
  // claimed should read as "taken" (more actionable for the user).
  if (taken) {
    return NextResponse.json<CheckResponse>(
      { available: false, reason: 'taken' },
      { status: 200 },
    )
  }

  // 4. Premium upsell — short or curated vanity handle, gate behind Pro.
  if (isPremiumHandle(raw)) {
    return NextResponse.json<CheckResponse>(
      { available: false, reason: 'premium', requiresPlan: 'pro' },
      { status: 200 },
    )
  }

  // 5. Available.
  return NextResponse.json<CheckResponse>(
    { available: true },
    { status: 200 },
  )
}
