'use client'
import { Capacitor } from '@capacitor/core'

// ============================================================================
// One-liner gate for native-only code paths.
// ----------------------------------------------------------------------------
// Returns true when running inside the Capacitor WebView on an installed
// app (Android APK / iOS IPA). Returns false in normal browsers (PWA
// install or regular tab). Used to decide whether the foreground-only
// `useDriverLocationPing` hook should run, or whether the native
// background-geolocation plugin should take over.
//
// Guards against SSR — Capacitor.isNativePlatform throws if called
// during server render in some plugin versions.
// ============================================================================

export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  try {
    const p = Capacitor.getPlatform()
    if (p === 'ios' || p === 'android') return p
    return 'web'
  } catch {
    return 'web'
  }
}
