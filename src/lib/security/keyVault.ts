// Server-side symmetric encryption for vendor-owned payment keys (Stripe
// secret, Midtrans server). Plain-text keys never live at rest. Master key
// is taken from PAYMENT_KEY_VAULT_SECRET in the runtime env; rotating it
// would require re-encrypting every stored ciphertext, so treat it like a
// permanent fixture.
//
// Ciphertext format: base64(iv) "." base64(ciphertext) "." base64(authTag).
// AES-256-GCM with a 12-byte IV and 16-byte tag — the standard NIST shape.

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getMasterKey(): Buffer {
  const raw = process.env.PAYMENT_KEY_VAULT_SECRET
  if (!raw || raw.length < 16) {
    throw new Error('PAYMENT_KEY_VAULT_SECRET missing or too short (need 16+ chars)')
  }
  // SHA-256 stretches any-length env input to the 32-byte key AES-256 needs.
  return crypto.createHash('sha256').update(raw, 'utf8').digest()
}

export function encryptKey(plaintext: string): string {
  if (!plaintext) throw new Error('cannot_encrypt_empty')
  const key = getMasterKey()
  const iv  = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ct  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64'),
    ct.toString('base64'),
    tag.toString('base64'),
  ].join('.')
}

export function decryptKey(payload: string): string {
  if (!payload || typeof payload !== 'string') throw new Error('invalid_ciphertext')
  const parts = payload.split('.')
  if (parts.length !== 3) throw new Error('invalid_ciphertext_format')
  const [ivB64, ctB64, tagB64] = parts
  const key = getMasterKey()
  const iv  = Buffer.from(ivB64,  'base64')
  const ct  = Buffer.from(ctB64,  'base64')
  const tag = Buffer.from(tagB64, 'base64')
  if (iv.length !== 12)  throw new Error('invalid_iv_length')
  if (tag.length !== 16) throw new Error('invalid_tag_length')
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}

// Convenience for dashboard UIs — show only the last 4 chars of a stored
// secret so the vendor can confirm "yes that's mine" without our server
// ever returning the full plaintext to the browser.
export function previewLast4(ciphertext: string | null | undefined): string {
  if (!ciphertext) return ''
  try {
    const pt = decryptKey(ciphertext)
    if (pt.length <= 4) return '••••'
    return '••••' + pt.slice(-4)
  } catch {
    return '••••'
  }
}
