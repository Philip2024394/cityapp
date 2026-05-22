'use client'
import { registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { isNative, getNativePlatform } from './isNative'

// ============================================================================
// Battery-optimization prompt — Android-only, fires ONCE per device the
// first time a driver successfully toggles "Go Online". Xiaomi (MIUI),
// Oppo (ColorOS) and Vivo (FunTouch) handsets — ~70% of Indonesia —
// aggressively kill the foreground location service after ~30-60 min
// unless the user manually whitelists the app under Settings → Battery →
// Don't optimize.
//
// We expose `maybePromptBatteryOpt()` returning `true` when the UI layer
// should render its modal (i.e. native Android AND not previously
// prompted AND not already whitelisted). The modal owns the actual
// "Lanjut / Nanti" buttons and calls back here to either fire the OS
// intent or just stamp the dismissed flag.
//
// We deliberately do NOT track whether the OS dialog was approved — that
// requires polling `isIgnoringBatteryOptimizations` post-resume which is
// noisier than it's worth. Driver dismissed once → never asked again.
// ============================================================================

type BatteryOptPlugin = {
  isIgnoringBatteryOptimizations: () => Promise<{ ignoring: boolean }>
  requestIgnoreBatteryOptimizations: () => Promise<void>
}

const BatteryOpt = registerPlugin<BatteryOptPlugin>('BatteryOpt')

const PROMPTED_KEY = 'cityrider:battery_opt_prompted_v1'

async function hasPrompted(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: PROMPTED_KEY })
    return value === '1'
  } catch {
    // Preferences plugin unavailable — fail safe (treat as prompted so
    // we never spam the user from a broken state).
    return true
  }
}

async function markPrompted(): Promise<void> {
  try {
    await Preferences.set({ key: PROMPTED_KEY, value: '1' })
  } catch {
    /* ignore — best-effort */
  }
}

// Returns true when the caller should display the in-app explainer modal.
// Caller is responsible for invoking `acceptBatteryOptPrompt()` /
// `dismissBatteryOptPrompt()` based on which button the driver taps.
export async function maybePromptBatteryOpt(): Promise<boolean> {
  if (!isNative()) return false
  if (getNativePlatform() !== 'android') return false
  if (await hasPrompted()) return false

  // Already whitelisted (e.g. manually whitelisted by user, OEM default,
  // or app reinstall after previous approval). Stamp the flag so we
  // don't ask later if the user revokes it, and skip the modal.
  try {
    const { ignoring } = await BatteryOpt.isIgnoringBatteryOptimizations()
    if (ignoring) {
      await markPrompted()
      return false
    }
  } catch {
    // Plugin not registered on this build — likely a stale APK without
    // the native side merged in yet. Stamp the flag to avoid a loop and
    // skip the modal (the request would fail too).
    await markPrompted()
    return false
  }

  return true
}

// Driver tapped "Lanjut" — fire the OS settings intent and stamp the
// flag so we never re-prompt. Intent failure still stamps — driver
// already saw the explainer.
export async function acceptBatteryOptPrompt(): Promise<void> {
  await markPrompted()
  try {
    await BatteryOpt.requestIgnoreBatteryOptimizations()
  } catch (e) {
    console.warn('[battery-opt] requestIgnoreBatteryOptimizations failed:', e)
  }
}

// Driver tapped "Nanti" — stamp the flag, don't fire the intent.
export async function dismissBatteryOptPrompt(): Promise<void> {
  await markPrompted()
}
