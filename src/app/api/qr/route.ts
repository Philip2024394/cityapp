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
// https://cityrider.id/r/wayan-bali.
// ============================================================================

export const dynamic = 'force-static'
export const revalidate = 31_536_000 // 1 year

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const text = searchParams.get('text')?.trim() ?? ''

  if (!text) {
    return NextResponse.json({ error: 'text param required' }, { status: 400 })
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'text too long (max 1000)' }, { status: 400 })
  }

  const svg = await QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#000000', light: '#00000000' }, // transparent background
  })

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
