'use client'

// ============================================================================
// PageBackground — single global background for the whole app.
// Mounted once at the root layout. Solid white per founder direction —
// every page (landing, marketplaces, dashboards) reads on white now;
// individual surfaces handle their own contrast.
// ============================================================================

export default function PageBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none bg-white"
    />
  )
}
