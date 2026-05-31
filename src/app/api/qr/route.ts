import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

// ============================================================================
// GET /api/qr?text=<url>
// ----------------------------------------------------------------------------
// Returns a black-on-transparent SVG QR code for the given text. Cached
// aggressively because QR codes for a given input are stable forever.
//
// Used by the public driver page share row and (later) the PDF sticker
// generator. The "text" param should typically be an absolute URL like
// https://citydrivers.id/r/wayan-bali.
// ============================================================================

// Dynamic — the SVG is a pure function of the `text` query param, but
// `force-static` in Next 15 zeroes out searchParams at request time
// (returns 400 every time). We instead get long-lived caching via the
// Cache-Control header below, which is honoured by the browser and any
// upstream CDN.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const text = searchParams.get('text')?.trim() ?? ''

  if (!text) {
    return NextResponse.json({ error: 'text param required' }, { status: 400 })
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'text too long (max 1000)' }, { status: 400 })
  }

  // Solid white background (not transparent) so the QR is readable on any
  // surface — dark dashboards, printed cards, social shares. Scanners
  // expect a quiet zone of contrast around the code; transparent broke
  // visibility against the dark partner-dashboard scrim.
  const svg = await QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
