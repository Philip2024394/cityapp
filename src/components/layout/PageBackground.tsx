'use client'

// ============================================================================
// PageBackground — single global background image for the whole app.
// Mounted once at the root layout. Fixed to the viewport, scrolls under
// content. Dark gradient scrim keeps text legible on every surface.
//
// Image source: ImageKit (Indonesian motorcycle courier scene).
// Scrim: 72→82% black gradient — dark enough that .card glass and white
// text stay readable, light enough that the photo still reads through.
// ============================================================================

const BG_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2002_50_48%20PM.png?updatedAt=1779781869703'

export default function PageBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: `url('${BG_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
