// ============================================================================
// navTiming — tiny client-side helper for measuring perceived navigation
// latency. Drop `logNav('click')` into a button handler and `logNav('mount')`
// into the destination page's first useEffect to see the gap between tap
// and first paint in the DevTools console.
// ----------------------------------------------------------------------------
// Phil's brief: button presses that should navigate to another route have
// noticeable delay before navigation actually happens. This helper lets us
// confirm the suspect handler/page pair with one console paste.
//
// Output:   [nav] click @ +12345ms
//           [nav] mount @ +12567ms     ← gap = 222ms perceived delay
//
// Zero deps. Server-side calls are a no-op. performance.mark() is also
// fired so DevTools Performance panel surfaces the mark on the timeline.
// ============================================================================

export function logNav(label: string): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return
  const t = performance.now()
  try {
    performance.mark(`nav:${label}:${t.toFixed(0)}`)
  } catch {
    /* mark name collisions ignored — Safari is strict on duplicate names */
  }
  // eslint-disable-next-line no-console
  console.log(`[nav] ${label} @ +${t.toFixed(0)}ms`)
}
