// ============================================================================
// Trusted client IP extraction.
// ----------------------------------------------------------------------------
// The raw `x-forwarded-for` header is client-controllable on most setups
// because anyone can send it on the request. On Vercel, the platform sets
// `x-vercel-forwarded-for` AFTER stripping any client-supplied version of
// the same header — so it's the only trustworthy source of the real
// upstream IP.
//
// Falls back through these layers in order:
//   1. x-vercel-forwarded-for       (Vercel-managed, trustworthy)
//   2. cf-connecting-ip             (Cloudflare in front, if ever used)
//   3. x-real-ip                    (some reverse proxies; least trusted)
//   4. literal 'unknown'            (no header — assume bot / curl)
//
// NEVER reads `x-forwarded-for` raw — that's the spoofable surface.
// ============================================================================

export function getTrustedClientIp(req: Request): string {
  const h = req.headers
  return (
    h.get('x-vercel-forwarded-for') ||
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    'unknown'
  )
}
