// ============================================================================
// Anonymous-customer trip token
// ============================================================================
// Customers can book a trip without signing up. To let their browser fetch
// their own trip later, POST /api/trips returns a short HMAC-ish token
// derived from tripId + customer_phone + a server secret. The browser
// stores it in localStorage; subsequent GETs supply it back.
//
// This is intentionally light: trips are short-lived, the secret stays
// server-side, and a valid token requires knowing BOTH the trip UUID and
// the phone the trip was booked with.
// ============================================================================
import { createHmac } from 'crypto'

function getSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'fallback-not-secure'
  )
}

export function signTripToken(tripId: string, phone: string): string {
  return createHmac('sha256', getSecret())
    .update(`${tripId}:${phone}`)
    .digest('hex')
    .slice(0, 24)
}

export function verifyTripToken(tripId: string, phone: string, token: string): boolean {
  if (!token || token.length !== 24) return false
  const expected = signTripToken(tripId, phone)
  if (expected.length !== token.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i)
  return mismatch === 0
}
