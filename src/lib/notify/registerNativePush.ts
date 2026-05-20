'use client'
import { isNative, getNativePlatform } from '@/lib/capacitor/isNative'

// ============================================================================
// Native push token registration — Capacitor wrapper only.
// ----------------------------------------------------------------------------
// Wraps @capacitor/push-notifications behind a dynamic import so this
// file is safe to import from non-native pages (browser PWA). The plugin
// must be installed via:
//   npm install @capacitor/push-notifications
//   npx cap sync android
//
// FLOW:
//   1. ensureNativePushRegistered() asks for OS permission
//   2. On grant, plugin emits 'registration' with the FCM device token
//   3. We POST the token to /api/drivers/me/push-token
//   4. Returns true on success, false if anything failed (not throwing —
//      caller treats false as "could not enable, show retry button")
//
// Re-registration: safe to call on every app foreground. Server upserts
// by token, just refreshing last_seen_at.
// ============================================================================

export type RegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'not_native' | 'permission_denied' | 'no_token' | 'register_failed' }

export async function ensureNativePushRegistered(): Promise<RegisterResult> {
  if (!isNative()) return { ok: false, reason: 'not_native' }

  let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications
  try {
    ;({ PushNotifications } = await import('@capacitor/push-notifications'))
  } catch {
    return { ok: false, reason: 'no_token' }
  }

  // Permission gate — show OS dialog if not yet decided.
  const perm = await PushNotifications.checkPermissions()
  let permState = perm.receive
  if (permState !== 'granted') {
    const req = await PushNotifications.requestPermissions()
    permState = req.receive
  }
  if (permState !== 'granted') return { ok: false, reason: 'permission_denied' }

  // Race: registration event fires asynchronously after register() is
  // called. We attach the listener BEFORE calling register() and resolve
  // once we get the token (or time out after 10s).
  return new Promise<RegisterResult>((resolve) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({ ok: false, reason: 'no_token' })
    }, 10_000)

    PushNotifications.addListener('registration', async (t) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      try {
        const platform = getNativePlatform()
        const res = await fetch('/api/drivers/me/push-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: t.value,
            platform: platform === 'ios' ? 'ios' : 'android',
          }),
        })
        if (!res.ok) {
          resolve({ ok: false, reason: 'register_failed' })
          return
        }
        resolve({ ok: true, token: t.value })
      } catch {
        resolve({ ok: false, reason: 'register_failed' })
      }
    })

    PushNotifications.addListener('registrationError', () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ ok: false, reason: 'no_token' })
    })

    PushNotifications.register().catch(() => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ ok: false, reason: 'register_failed' })
    })
  })
}
