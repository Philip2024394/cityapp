// Single source of truth for support contact info. Pulls from env so a
// missing config fails loud in dev (red console warning) rather than
// shipping the placeholder number to production.
const FALLBACK_WA = '6285183600015' // streetlocallive admin line (per repo memory)

export function getSupportWhatsApp(): string {
  const env = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164
  if (!env) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('[support] NEXT_PUBLIC_SUPPORT_WHATSAPP_E164 not set — using fallback')
    }
    return FALLBACK_WA
  }
  return env
}
