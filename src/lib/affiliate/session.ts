// Server-only helper to issue + verify lightweight bearer tokens for
// affiliate agents. Affiliate agents do NOT have Supabase auth accounts;
// they "log in" with whatsapp + agent_code which we verify against the
// affiliate_agents table, then mint a signed token so subsequent calls
// to /api/affiliate/* are cheap (no DB lookup per request).
//
// Format: base64url(payloadJson) + '.' + base64url(hmacSHA256(secret, payload))
// Payload: { agentId: uuid, exp: unix-ms }
// TTL: 30 days. Agents stay logged in across sessions, like an OAuth refresh
// token, but token is opaque on the client.
import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 30 * 24 * 60 * 60 * 1000

export type AffiliateSession = { agentId: string; exp: number }

function secret(): string {
  const s = process.env.AFFILIATE_SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('AFFILIATE_SESSION_SECRET must be set (32+ chars)')
  }
  return s
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64')
}

export function signAffiliateToken(agentId: string): string {
  const payload: AffiliateSession = { agentId, exp: Date.now() + TTL_MS }
  const payloadStr = JSON.stringify(payload)
  const payloadB64 = b64url(Buffer.from(payloadStr, 'utf8'))
  const sig = createHmac('sha256', secret()).update(payloadB64).digest()
  return `${payloadB64}.${b64url(sig)}`
}

export function verifyAffiliateToken(token: string | null | undefined): AffiliateSession | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts
  let expected: Buffer
  try {
    expected = createHmac('sha256', secret()).update(payloadB64).digest()
  } catch {
    return null
  }
  const provided = b64urlDecode(sigB64)
  if (provided.length !== expected.length) return null
  if (!timingSafeEqual(provided, expected)) return null
  try {
    const decoded = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as AffiliateSession
    if (!decoded.agentId || typeof decoded.exp !== 'number') return null
    if (decoded.exp < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

/** Extract the bearer token from an Authorization header. */
export function bearerFromHeader(authorization: string | null): string | null {
  if (!authorization) return null
  const m = authorization.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}
