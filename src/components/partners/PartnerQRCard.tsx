'use client'
import { useRef } from 'react'

// Printable QR card for hotel/villa partners. The QR encodes
// https://citydrivers.id/p/[slug] — guests scan, app opens, attribution
// stored for 24h, partner earns 8% on any booking that follows.

export default function PartnerQRCard({
  partnerName,
  partnerSlug,
  city,
  baseUrl = 'https://citydrivers.id',
}: {
  partnerName: string
  partnerSlug: string
  city?: string | null
  baseUrl?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const url = `${baseUrl}/p/${encodeURIComponent(partnerSlug)}`
  // `v` busts any cached version of the QR endpoint — the route was
  // briefly returning 400 (force-static stripped searchParams) and the
  // 1-year immutable Cache-Control header pinned that broken response
  // in browsers. Bump this number whenever the QR rendering changes.
  const qrSrc = `/api/qr?text=${encodeURIComponent(url)}&v=2`

  async function downloadAsPng() {
    // Render the card to PNG via the browser's canvas. We use the
    // foreignObject trick to inline the SVG QR + HTML caption in one
    // raster, then trigger a download. Works in modern Chrome / Safari.
    const card = cardRef.current
    if (!card) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 })
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `citydrivers-${partnerSlug}.png`
      a.click()
    } catch {
      // Fallback: just open the QR SVG in a new tab so they can save it.
      window.open(qrSrc, '_blank', 'noopener')
    }
  }

  function printCard() {
    const w = window.open('', '_blank', 'noopener')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>${partnerName} — Kita2u QR</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; padding: 32px; display: flex; justify-content: center; }
        .card { width: 320px; padding: 24px; border: 2px solid #0A0A0A; border-radius: 16px; text-align: center; }
        .brand { font-size: 11px; font-weight: 800; letter-spacing: 0.15em; color: #EAB308; text-transform: uppercase; margin-bottom: 4px; }
        .name { font-size: 18px; font-weight: 900; color: #0A0A0A; margin-bottom: 4px; }
        .city { font-size: 12px; color: #525252; margin-bottom: 16px; }
        .qr { width: 220px; height: 220px; margin: 0 auto 16px; }
        .cta { font-size: 13px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px; }
        .url { font-size: 10px; font-family: monospace; color: #737373; word-break: break-all; }
        @media print { @page { margin: 12mm; } body { padding: 0; } }
      </style></head><body>
      <div class="card">
        <div class="brand">Kita2u</div>
        <div class="name">${escapeHtml(partnerName)}</div>
        ${city ? `<div class="city">${escapeHtml(city)}</div>` : ''}
        <div class="qr"><img src="${qrSrc}" style="width:100%;height:100%" alt="QR" /></div>
        <div class="cta">Scan to book a rider</div>
        <div class="url">${escapeHtml(url)}</div>
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="bg-white text-black rounded-2xl border-2 border-black/85 p-6 max-w-[320px] text-center mx-auto"
      >
        <div className="text-[11px] font-extrabold tracking-[0.15em] text-brand2 uppercase mb-1">
          Kita2u
        </div>
        <div className="text-[18px] font-black text-black mb-1 leading-tight">{partnerName}</div>
        {city && <div className="text-[12px] text-gray-600 mb-4">{city}</div>}
        <div className="w-[220px] h-[220px] mx-auto mb-3">
          <img src={qrSrc} alt={`QR code for ${partnerName}`} className="w-full h-full" />
        </div>
        <div className="text-[13px] font-bold text-black mb-1">Scan to book a rider</div>
        <div className="text-[10px] font-mono text-gray-500 break-all">{url}</div>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={downloadAsPng}
          className="rounded-full bg-bg text-ink border border-ink/30 px-4 py-2 text-[12px] font-bold hover:bg-black/40"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={printCard}
          className="rounded-full bg-brand text-bg px-4 py-2 text-[12px] font-extrabold hover:brightness-105"
        >
          Print
        </button>
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] || c))
}
