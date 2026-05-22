import 'server-only'

// Cloudflare Turnstile server-side verification.
// Endpoint: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
//
// Behaviour:
//   - TURNSTILE_SECRET_KEY unset → returns ok:true (degraded). Callers stay
//     open so local dev / first-deploy don't get bricked. One-time warn at
//     boot makes the silent skip noticeable.
//   - Token missing → ok:false (so callers can reject cleanly).
//   - Network / parse failure → ok:false with reason=network-error.
//     Callers decide whether to fail open or closed.
//
// Test keys (Cloudflare-published) for local dev:
//   site key   (always passes): 1x00000000000000000000AA
//   secret key (always passes): 1x0000000000000000000000000000000AA

export type TurnstileVerifyResult =
  | { ok: true; action?: string; cdata?: string; reason?: string }
  | { ok: false; reason: string }

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

let warnedNoSecret = false

export async function verifyTurnstile(
  token: string | null | undefined,
  opts?: { remoteIp?: string },
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (!warnedNoSecret) {
      warnedNoSecret = true
      console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — captcha verification disabled (degraded)')
    }
    return { ok: true, reason: 'no-secret-configured' }
  }
  if (!token) return { ok: false, reason: 'missing-token' }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (opts?.remoteIp) form.set('remoteip', opts.remoteIp)

  let res: Response
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    return { ok: false, reason: 'network-error' }
  }
  if (!res.ok) return { ok: false, reason: 'network-error' }

  let json: { success?: boolean; 'error-codes'?: string[]; action?: string; cdata?: string }
  try {
    json = await res.json()
  } catch {
    return { ok: false, reason: 'network-error' }
  }
  if (json.success) return { ok: true, action: json.action, cdata: json.cdata }
  return { ok: false, reason: (json['error-codes'] || ['unknown']).join(',') }
}
