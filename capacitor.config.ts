import type { CapacitorConfig } from '@capacitor/cli'

// ============================================================================
// City Rider — Capacitor configuration (Android driver app).
// ----------------------------------------------------------------------------
// Strategy: the Android APK is a thin native shell around our Next.js
// app hosted on Vercel. `server.url` makes the WebView load the live
// site rather than a bundled offline snapshot — Vercel deploys = instant
// app updates, no Play Store re-submission required for app code
// changes. Only the native shell itself (permissions, plugins, icons)
// triggers a new APK release.
//
// Why no offline shell: the cityriders driver dashboard is a live
// marketplace view + GPS ping loop. Both require network. A bundled
// offline build would just show stale data when the network is bad.
// The native plugin queues failed GPS pings locally and retries on
// reconnect — so the location stream itself is resilient.
//
// PRODUCTION URL — UPDATE BEFORE FIRST BUILD:
// Replace the URL below with the actual production deployment domain.
// During the build:
//   1. Set CAPACITOR_SERVER_URL in your shell (one-off) OR
//   2. Hard-code it here before running `npx cap sync android`.
// ============================================================================

const PROD_URL = process.env.CAPACITOR_SERVER_URL ?? 'https://cityrider.streetlocal.live'

const config: CapacitorConfig = {
  appId: 'live.streetlocal.cityrider',
  appName: 'City Rider',
  // webDir is required by the CLI but unused at runtime because server.url
  // is set. Point at public/ so the CLI doesn't error on a missing dir.
  webDir: 'public',
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    // Use the default Android scheme — load via https://. WebView will
    // navigate to PROD_URL on launch.
    allowMixedContent: false,
    // Backgrounding the app should not pause WebView JS execution — we
    // rely on the native background-location plugin (which runs outside
    // the WebView) for GPS pings while the app is backgrounded.
    backgroundColor: '#0A0A0A',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    BackgroundGeolocation: {
      // Plugin-level defaults — overridden per-call from
      // src/lib/capacitor/locationBridge.ts where we know whether the
      // user is on/off shift.
    },
  },
}

export default config
