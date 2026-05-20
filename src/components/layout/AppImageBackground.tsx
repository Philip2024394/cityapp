// ============================================================================
// AppImageBackground — the shared dark-image scrim used on /dashboard,
// /profile, and the rental pages. Drop this into any layout file to
// override the global MapBackground for that subtree.
//
// Renders two fixed layers behind the page content:
//   1. Image layer at z-index -5 (above the global map at -10)
//   2. Soft radial scrim at z-index -4 so .card / .glass-strong content
//      stays readable over any bright spots in the image
// ============================================================================

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

export default function AppImageBackground() {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -5,
          backgroundImage: `url('${BG_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#0A0A0A',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -4,
          background:
            'radial-gradient(ellipse at center, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.55) 60%, rgba(10,10,10,0.75) 100%)',
        }}
      />
    </>
  )
}
