#!/usr/bin/env node
// ============================================================================
// generate-vapid-keys — one-off VAPID keypair generator using Web Crypto
// ----------------------------------------------------------------------------
// VAPID needs a P-256 ECDSA keypair. We export:
//   • public  → 65-byte uncompressed point (0x04 || X(32) || Y(32)), base64url
//   • private → raw 32-byte d, base64url
//
// Matches the format expected by src/lib/push/sendWebPush.ts and the
// `applicationServerKey` PushManager API on the client.
// ============================================================================

import { writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs'

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return Buffer.from(bin, 'binary').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const pair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
)

// Public — uncompressed point. Web Crypto exports as JWK; we rebuild
// 0x04||X||Y from JWK.x + JWK.y for the wire format the PushManager API
// expects.
const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
function jwkB64uToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}
const X = jwkB64uToBytes(pubJwk.x)
const Y = jwkB64uToBytes(pubJwk.y)
const uncompressed = Buffer.concat([Buffer.from([0x04]), X, Y])
const publicB64u = b64url(uncompressed)

// Private — raw d (32 bytes).
const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
const d = jwkB64uToBytes(privJwk.d)
const privateB64u = b64url(d)

console.log('')
console.log('VAPID_PUBLIC_KEY  =', publicB64u)
console.log('VAPID_PRIVATE_KEY =', privateB64u)
console.log('VAPID_SUBJECT     = mailto:streetlocallive@gmail.com')
console.log('')

// Append to .env.local if not already present. Back up first.
const envPath = '.env.local'
if (!existsSync(envPath)) {
  console.log(`.env.local not found — skipping write. Copy the values above into your env.`)
  process.exit(0)
}

const orig = readFileSync(envPath, 'utf8')
if (orig.includes('VAPID_PUBLIC_KEY')) {
  console.log(`.env.local already contains VAPID_PUBLIC_KEY — refusing to overwrite. Edit by hand if you want to rotate.`)
  process.exit(0)
}

copyFileSync(envPath, envPath + '.bak-' + Date.now())
const block = [
  '',
  '# VAPID Web Push (added by scripts/generate-vapid-keys.mjs)',
  `VAPID_PUBLIC_KEY=${publicB64u}`,
  `VAPID_PRIVATE_KEY=${privateB64u}`,
  `VAPID_SUBJECT=mailto:streetlocallive@gmail.com`,
  '',
].join('\n')
writeFileSync(envPath, orig + block, 'utf8')
console.log(`Appended VAPID_* to ${envPath} (backup written alongside).`)
