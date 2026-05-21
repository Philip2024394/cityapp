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
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

export default function PageBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage:
          `linear-gradient(rgba(10,10,10,0.72), rgba(10,10,10,0.86)), url('${BG_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
