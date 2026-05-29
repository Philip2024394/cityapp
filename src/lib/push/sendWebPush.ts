// ============================================================================
// sendWebPush — VAPID Web Push delivery for backgrounded/closed driver PWAs
// ----------------------------------------------------------------------------
// Sends a VAPID-signed Web Push notification with EMPTY payload to every
// device subscribed for a driver. The service worker (/public/sw.js)
// renders a fixed-string notification on receipt — we deliberately skip
// AES-128-GCM payload encryption (per RFC 8291) because that would
// require ~150 lines of crypto and the alert text doesn't change per
// event anyway. When the driver taps the notification, the PWA opens
// /dashboard and the Realtime subscription delivers the full popup with
// source + timestamp context.
//
// Env vars required (set in Cloudflare Pages env + .env.local):
//   VAPID_PUBLIC_KEY    base64url P-256 public key (also used by the
//                       client to subscribe — see usePushSubscribe.ts)
//   VAPID_PRIVATE_KEY   base64url P-256 private key, NEVER ship to client
//   VAPID_SUBJECT       mailto:streetlocallive@gmail.com (any contact URL)
//
// If any var is missing, the helper no-ops silently — the Realtime
// broadcast still fires, so foregrounded PWAs still get the popup.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

type WebPushNotification = {
  title: string
  body:  string
  tag?:  string
  url?:  string
}

const TEXT_ENCODER = new TextEncoder()

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Convert a base64url-encoded P-256 private key (raw 32-byte d) into a
// CryptoKey usable for ECDSA signing. Browser/Node Web Crypto both
// require JWK or PKCS8, so we wrap the raw d into a JWK with the
// matching public coordinates.
async function importVapidSigningKey(privateB64u: string, publicB64u: string): Promise<CryptoKey> {
  const dBytes = b64urlDecode(privateB64u)
  if (dBytes.length !== 32) throw new Error('VAPID_PRIVATE_KEY must be 32 bytes (P-256 d)')

  const pubBytes = b64urlDecode(publicB64u)
  // Uncompressed public: 0x04 || X(32) || Y(32) = 65 bytes
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be 65-byte uncompressed P-256 point (0x04||X||Y)')
  }
  const x = pubBytes.slice(1, 33)
  const y = pubBytes.slice(33, 65)

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d:   b64urlEncode(dBytes),
    x:   b64urlEncode(x),
    y:   b64urlEncode(y),
    ext: true,
  }
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

async function signVapidJwt(audience: string, subject: string, publicB64u: string, privateB64u: string, ttlSec = 12 * 3600): Promise<string> {
  const header  = { typ: 'JWT', alg: 'ES256' }
  const exp     = Math.floor(Date.now() / 1000) + ttlSec
  const payload = { aud: audience, exp, sub: subject }

  const head64    = b64urlEncode(TEXT_ENCODER.encode(JSON.stringify(header)))
  const payload64 = b64urlEncode(TEXT_ENCODER.encode(JSON.stringify(payload)))
  const signingInput = `${head64}.${payload64}`

  const key = await importVapidSigningKey(privateB64u, publicB64u)
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    TEXT_ENCODER.encode(signingInput),
  )
  // Web Crypto already returns raw r||s for ECDSA — this is exactly what JWS ES256 expects.
  return `${signingInput}.${b64urlEncode(sig)}`
}

function audienceFromEndpoint(endpoint: string): string {
  const u = new URL(endpoint)
  return `${u.protocol}//${u.host}`
}

type PushSubscriptionRow = {
  id:       number
  endpoint: string
  p256dh:   string
  auth_key: string
}

/**
 * Sends an empty-body VAPID Web Push to every push_subscriptions row for
 * `driverId`. The service worker renders a fixed-string notification on
 * receipt — `notification` is only used as the in-app fallback if the SW
 * doesn't intercept (rare).
 *
 * Returns the number of sends attempted. Failed endpoints (404/410) are
 * removed from the table so we don't keep retrying dead subscriptions.
 */
export async function sendDriverWebPush(
  admin:        SupabaseClient,
  driverId:     string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _notification: WebPushNotification,
): Promise<number> {
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const sub  = process.env.VAPID_SUBJECT || 'mailto:streetlocallive@gmail.com'
  if (!pub || !priv) return 0

  const { data } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('driver_id', driverId)
  const rows = (data as PushSubscriptionRow[] | null) || []
  if (rows.length === 0) return 0

  let attempts = 0
  const deadIds: number[] = []

  await Promise.all(rows.map(async (row) => {
    try {
      const aud = audienceFromEndpoint(row.endpoint)
      const jwt = await signVapidJwt(aud, sub, pub, priv)
      const res = await fetch(row.endpoint, {
        method: 'POST',
        headers: {
          'Authorization':     `vapid t=${jwt}, k=${pub}`,
          'TTL':               '60',
          'Urgency':           'high',
          'Topic':             'cityriders-intent',
          'Content-Length':    '0',
        },
      })
      attempts++
      if (res.status === 404 || res.status === 410) {
        deadIds.push(row.id)
      }
    } catch {
      // Network errors — leave subscription in place; transient.
    }
  }))

  if (deadIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', deadIds)
  }
  return attempts
}
