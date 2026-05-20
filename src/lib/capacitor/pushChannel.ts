'use client'
import { isNative, getNativePlatform } from './isNative'

// ============================================================================
// Push notification setup — native only.
// ----------------------------------------------------------------------------
// Called once from CapacitorBoot after the WebView is ready. Two pieces:
//
//   1. createNotificationChannels()
//      Android-only. Registers a HIGH-importance "bookings" channel with
//      our custom 10-second sound (booking_ding.mp3 in res/raw/). HIGH
//      importance is what enables:
//        • heads-up display over other apps
//        • lock-screen popup
//        • bypass of Do Not Disturb (driver can opt-in)
//        • custom looping sound playback
//
//   2. attachPushTapHandler(router)
//      Listens for pushNotificationActionPerformed — fires when the
//      driver TAPS our notification. We navigate to /alert?pingId=...
//      so the driver sees the "Got it — open WhatsApp" screen.
//
// Channel registration is idempotent — calling create on an existing
// channel is a no-op on Android.
// ============================================================================

export async function createNotificationChannels(): Promise<void> {
  if (!isNative()) return
  if (getNativePlatform() !== 'android') return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.createChannel({
      id: 'bookings',
      name: 'Booking alerts',
      description: 'Loud alert when a customer taps Contact on your listing — never miss a booking',
      importance: 5,                  // 5 = IMPORTANCE_HIGH (heads-up + sound + bypass DND)
      sound: 'booking_ding',          // matches android/app/src/main/res/raw/booking_ding.mp3
      vibration: true,
      lights: true,
      visibility: 1,                  // VISIBILITY_PUBLIC — show full content on lock screen
    })
  } catch {
    /* plugin not installed or platform unsupported — silently skip */
  }
}

type Navigate = (path: string) => void

export async function attachPushTapHandler(navigate: Navigate): Promise<void> {
  if (!isNative()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = (action.notification.data ?? {}) as Record<string, string>
      if (data.kind === 'contact_ping' && data.pingId) {
        navigate(`/alert?pingId=${encodeURIComponent(data.pingId)}&source=${encodeURIComponent(data.source ?? 'other')}`)
      }
    })
  } catch {
    /* swallow — non-native or plugin missing */
  }
}
