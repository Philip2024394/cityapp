// ============================================================================
// src/lib/handle/premium.ts — premium-handle set + length-rule predicate
// ----------------------------------------------------------------------------
// Linktree-style monetization lever: 1-3 char handles + a curated set of
// short, popular, or vanity names are gated behind the Pro plan. The
// landing /api/handle/check route surfaces these as
//   { available: false, reason: 'premium', requiresPlan: 'pro' }
// and the HandleEntryHero swaps its CTA for an "Upgrade to Pro →" link
// pointing at /pricing.
//
// Sits separate from RESERVED_HANDLES because the two concepts are
// distinct — reserved means "the platform itself uses this slug, nobody
// can claim it" (admin, dashboard, kita2u). Premium means "anyone CAN
// claim it but only on the Pro plan." Mixing them would muddle the
// /api/handle/check `reason` and cost us legibility.
// ============================================================================

/** Premium handles — short or high-value vanity names that we gate behind
 *  the Pro plan. Linktree-style monetization lever. Founder direction
 *  2026-06-09 (advisor recommendation): keep this list NARROW at launch
 *  (~50 obviously-premium English + Indonesian terms) so we don't spook
 *  Free users trying their actual business name. Expand once we see
 *  monetization data justifies it.
 *
 *  Rule of thumb for the list:
 *   - English single words that read as a "category" (yoga, fitness, food)
 *   - Indonesian first names common in business contexts (sari, ayu, dewi)
 *   - Indonesian city / region names (bali, jakarta, jogja, bandung)
 *   - 3-char handles are premium by the LENGTH rule (see isPremiumHandle).
 *
 *  Comparison is case-insensitive — compare against lowercased input.
 */
export const PREMIUM_HANDLES: ReadonlySet<string> = new Set([
  // High-value English category words
  'yoga', 'fitness', 'food', 'cafe', 'spa', 'salon', 'beauty', 'makeup',
  'hair', 'nails', 'lash', 'tattoo', 'barber', 'photo', 'video', 'cake',
  'pet', 'tour', 'tukang', 'cleaner', 'fit', 'gym',
  // Indonesian first names — common business owners
  'sari', 'ayu', 'dewi', 'putri', 'indra', 'rina', 'mira', 'dian',
  'budi', 'agus', 'rama', 'galih', 'rosa', 'bagas', 'tata',
  // Cities + regions
  'bali', 'jakarta', 'jogja', 'yogya', 'bandung', 'surabaya', 'medan',
  'semarang', 'malang', 'denpasar', 'ubud', 'makassar', 'lombok',
  // Brand-style short names
  'pro', 'co', 'shop', 'home', 'love', 'plus', 'biz', 'hub',
])

/** Returns true when the handle is "premium" — must be Pro-plan to claim.
 *  Two rules:
 *    1. ≤ 3 chars (after a lowercase + trim). Any 1-3 char handle is
 *       premium regardless of content, since they're vanity-short.
 *    2. Appears in PREMIUM_HANDLES (case-insensitive).
 *  Caller must have already passed the HANDLE_RE shape check — this
 *  helper only judges premium-ness, not validity. */
export function isPremiumHandle(handle: string): boolean {
  const h = (handle || '').trim().toLowerCase()
  if (h.length <= 3) return true
  return PREMIUM_HANDLES.has(h)
}
