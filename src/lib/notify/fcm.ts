import 'server-only'
import crypto from 'node:crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// FCM HTTP v1 — server-side push delivery to driver devices.
// ----------------------------------------------------------------------------
// Sends high-priority pushes to every registered token for a driver. The
// Android app's "bookings" notification channel handles the loud 10-second
// custom sound + heads-up display + vibration pattern. iOS uses APNS
// critical alert headers. Web push falls back to requireInteraction.
//
// SETUP (one-time, see PUSH_SETUP.md):
//   1. Create a Firebase project, enable Cloud Messaging
//   2. Generate a service-account JSON in Project Settings → Service Accounts
//   3. Paste the WHOLE JSON into env var FCM_SERVICE_ACCOUNT_JSON
//
// We mint our own OAuth2 access token from the service account (RS256 JWT
// → token exchange) and cache it for 50 minutes. No google-auth-library
// dep — keeps the cold-start small on Vercel.
// ============================================================================

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null
    return parsed as ServiceAccount
  } catch {
    return null
  }
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function mintAccessToken(): Promise<string | null> {
  // Reuse cached token until 60s before expiry to avoid mid-flight expiry.
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token

  const sa = getServiceAccount()
  if (!sa) return null

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const data = `${header}.${claims}`
  const signature = base64url(crypto.sign('RSA-SHA256', Buffer.from(data), sa.private_key))
  const jwt = `${data}.${signature}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!resp.ok) return null
  const json = (await resp.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token || !json.expires_in) return null

  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return cachedToken.token
}

export type DriverPushPayload = {
  title: string
  body: string
  // Custom key/value pairs the Android/iOS client can read to route the
  // notification tap (e.g. { kind: 'contact_ping', pingId: 'uuid' }).
  data?: Record<string, string>
}

type TokenRow = { id: string; platform: 'android' | 'ios' | 'web'; token: string }

function buildMessage(
  platform: TokenRow['platform'],
  token: string,
  payload: DriverPushPayload,
) {
  const base = {
    token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  }
  if (platform === 'android') {
    return {
      ...base,
      android: {
        priority: 'HIGH' as const,
        ttl: '120s',
        notification: {
          // Matches the channel registered in Capacitor (see initShell.ts /
          // android Notification channel registration). HIGH-importance
          // channel is what enables the heads-up + custom sound.
          channel_id: 'bookings',
          sound: 'booking_ding',
          default_vibrate_timings: false,
          vibrate_timings: ['0s', '0.5s', '0.5s', '0.5s', '0.5s', '0.5s', '0.5s'],
        },
      },
    }
  }
  if (platform === 'ios') {
    return {
      ...base,
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            sound: { critical: 1, name: 'booking_ding.caf', volume: 1.0 },
            'interruption-level': 'time-sensitive',
          },
        },
      },
    }
  }
  // Web push fallback — used when the PWA is installed but not the native
  // app. Browsers can't play custom 10s sounds; the requireInteraction
  // flag at least keeps the notification on-screen until dismissed.
  return {
    ...base,
    webpush: {
      headers: { Urgency: 'high', TTL: '120' },
      notification: {
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      },
    },
  }
}

/**
 * Sends a high-priority push to all of the driver's registered tokens.
 * Skips silently when:
 *   • FCM env not configured (dev mode, or pre-Play-Store)
 *   • Driver has not opted in (booking_alerts_enabled = false)
 *   • Driver has zero fresh tokens
 *
 * Prunes dead tokens (FCM 404 / 410 = device uninstalled) automatically.
 *
 * Returns counts so callers can record outcome / log telemetry, but does
 * not throw — the customer's Contact flow must never break because push
 * delivery had a hiccup.
 */
export async function sendDriverPush(
  driverUserId: string,
  payload: DriverPushPayload,
): Promise<{ sent: number; failed: number; skippedReason?: string }> {
  const admin = getAdminSupabase()
  if (!admin) return { sent: 0, failed: 0, skippedReason: 'admin_not_configured' }

  const sa = getServiceAccount()
  if (!sa) return { sent: 0, failed: 0, skippedReason: 'fcm_not_configured' }

  // Consent gate — driver must have explicitly opted in.
  const { data: driver } = await admin
    .from('drivers')
    .select('booking_alerts_enabled')
    .eq('user_id', driverUserId)
    .maybeSingle()
  const enabled = (driver as { booking_alerts_enabled?: boolean } | null)?.booking_alerts_enabled
  if (!enabled) return { sent: 0, failed: 0, skippedReason: 'driver_not_opted_in' }

  // Fresh tokens only — anything not seen in 90 days is presumed dead.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: tokens } = await admin
    .from('driver_push_tokens')
    .select('id, platform, token')
    .eq('driver_user_id', driverUserId)
    .gte('last_seen_at', ninetyDaysAgo)

  const rows = (tokens ?? []) as unknown as TokenRow[]
  if (rows.length === 0) return { sent: 0, failed: 0, skippedReason: 'no_tokens' }

  const accessToken = await mintAccessToken()
  if (!accessToken) return { sent: 0, failed: 0, skippedReason: 'oauth_failed' }

  let sent = 0
  let failed = 0
  const deadIds: string[] = []

  await Promise.all(
    rows.map(async (row) => {
      const message = buildMessage(row.platform, row.token, payload)
      try {
        const resp = await fetch(
          `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
          },
        )
        if (resp.ok) {
          sent++
        } else {
          failed++
          // UNREGISTERED / NOT_FOUND — token no longer maps to a device.
          if (resp.status === 404 || resp.status === 410) deadIds.push(row.id)
        }
      } catch {
        failed++
      }
    }),
  )

  if (deadIds.length > 0) {
    await admin.from('driver_push_tokens').delete().in('id', deadIds)
  }
  return { sent, failed }
}
