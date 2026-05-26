// ============================================================================
// PageBackground — single global background for the whole app.
// Mounted once at the root layout. Solid white per founder direction —
// every page (landing, marketplaces, dashboards) reads on white now;
// individual surfaces handle their own contrast.
//
// Server component (no 'use client') — renders a static fixed white div
// with no hooks, props, or browser APIs. Forcing a client boundary just
// to paint white burns one hydration pass on every route. Done as part
// of the pre-launch perf pass.
// ============================================================================

export default function PageBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none bg-white"
    />
  )
}
