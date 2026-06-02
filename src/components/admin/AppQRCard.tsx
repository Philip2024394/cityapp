'use client'
import { useRef } from 'react'

// ============================================================================
// AppQRCard — admin-only "main app" QR poster
// ----------------------------------------------------------------------------
// Generates a printable QR card for the top-level CityDrivers app URL
// (citydrivers.id by default). Mirrors PartnerQRCard's behaviour for
// consistency:
//   - Download as PNG via html2canvas (fallback: open the raw SVG)
//   - Print via window.open + print stylesheet (A4-ready)
//
// The QR encodes whatever URL the admin passes — defaults to the
// canonical citydrivers.id homepage. Drop this component on the admin
// overview, /admin/qr-codes header, or anywhere else that needs a
// shareable poster.
// ============================================================================

export type AppQRCardProps = {
  /** Display headline above the QR. */
  title?: string
  /** Optional subtitle (city / tagline). */
  subtitle?: string | null
  /** Call-to-action under the QR. */
  cta?: string
  /** The URL the QR encodes. Defaults to https://citydrivers.id. */
  url?: string
  /** Filename stem for PNG download. */
  filename?: string
}

export default function AppQRCard({
  title    = 'CityDrivers',
  subtitle = 'Indonesia · Self-employed drivers',
  cta      = 'Scan to open the app',
  url      = 'https://citydrivers.id',
  filename = 'citydrivers-app',
}: AppQRCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const qrSrc = `/api/qr?text=${encodeURIComponent(url)}&v=2`

  async function downloadAsPng() {
    const card = cardRef.current
    if (!card) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 })
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${filename}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      // Fallback — open the raw SVG so the admin can right-click → save.
      window.open(qrSrc, '_blank', 'noopener')
    }
  }

  function printCard() {
    const w = window.open('', '_blank', 'noopener')
    if (!w) return
    w.document.write(`<!DOCTYPE html>
<html><head><title>${escapeHtml(title)} — QR poster</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; padding: 32px; display: flex; justify-content: center; }
  .card { width: 360px; padding: 28px; border: 2px solid #0A0A0A; border-radius: 18px; text-align: center; }
  .brand { font-size: 11px; font-weight: 800; letter-spacing: 0.18em; color: #EAB308; text-transform: uppercase; margin-bottom: 6px; }
  .name { font-size: 22px; font-weight: 900; color: #0A0A0A; margin-bottom: 4px; }
  .city { font-size: 12px; color: #525252; margin-bottom: 16px; }
  .qr { width: 260px; height: 260px; margin: 0 auto 16px; }
  .cta { font-size: 14px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px; }
  .url { font-size: 11px; font-family: monospace; color: #737373; word-break: break-all; }
  @media print { @page { margin: 12mm; } body { padding: 0; } }
</style></head><body>
<div class="card">
  <div class="brand">CityDrivers</div>
  <div class="name">${escapeHtml(title)}</div>
  ${subtitle ? `<div class="city">${escapeHtml(subtitle)}</div>` : ''}
  <div class="qr"><img src="${qrSrc}" style="width:100%;height:100%" alt="QR" /></div>
  <div class="cta">${escapeHtml(cta)}</div>
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
        className="bg-white text-black rounded-2xl border-2 border-black/85 p-6 max-w-[360px] text-center mx-auto"
      >
        <div className="text-[11px] font-extrabold tracking-[0.18em] uppercase mb-1" style={{ color: '#EAB308' }}>
          CityDrivers
        </div>
        <div className="text-[20px] font-black text-black mb-1 leading-tight">{title}</div>
        {subtitle ? <div className="text-[12px] text-gray-600 mb-4">{subtitle}</div> : null}
        <div className="w-[260px] h-[260px] mx-auto mb-3">
          <img src={qrSrc} alt={`QR for ${title}`} className="w-full h-full" />
        </div>
        <div className="text-[13px] font-bold text-black mb-1">{cta}</div>
        <div className="text-[10px] font-mono text-gray-500 break-all">{url}</div>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={downloadAsPng}
          className="inline-flex items-center px-4 py-2 rounded-full text-[13px] font-bold border transition"
          style={{
            minHeight: 44,
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.85)',
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={printCard}
          className="inline-flex items-center px-4 py-2 rounded-full text-[13px] font-extrabold border transition"
          style={{
            minHeight: 44,
            background: '#FACC15',
            color: '#0A0A0A',
            borderColor: '#FACC15',
          }}
        >
          Print
        </button>
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;' : '&#39;'
  ))
}
