'use client'
// Vibration API wrapper — Android supports it, iOS Safari ignores silently.
// Acceptable: 85% of Indonesian riders are on Android.
export function useHaptic() {
  function tap()    { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20) }
  function impact() { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40) }
  function buzz()   { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([60, 30, 60]) }
  return { tap, impact, buzz }
}
