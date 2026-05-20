'use client'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from './isNative'

// ============================================================================
// One-time native shell initialization.
// ----------------------------------------------------------------------------
// Called once from `CapacitorBoot` (mounted in the root layout). Sets
// status-bar style + hides the splash screen as soon as the WebView is
// ready. No-op on web.
// ============================================================================

let initialized = false

export async function initCapacitorShell(): Promise<void> {
  if (!isNative() || initialized) return
  initialized = true

  try {
    // Match the app's dark theme — light icons over dark bg.
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0A0A0A' })
  } catch {
    /* status-bar plugin not available on this platform — ignore */
  }

  try {
    await SplashScreen.hide()
  } catch {
    /* splash already hidden or plugin unavailable — ignore */
  }
}
