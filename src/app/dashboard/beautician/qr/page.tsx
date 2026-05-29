'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Download, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'
import AppNav from '@/components/layout/AppNav'
import type { BeauticianProvider } from '@/lib/beautician/types'

// /dashboard/beautician/qr — printable profile QR code.
// Pure client-side: pulls the provider via /api/beautician/me, mints a
// canvas QR for /beautician/<slug> in the provider's theme colour, and
// offers a 1080×1080 PNG export with a coloured header bar for printing
// on business cards, salon mirrors, etc.

type Provider = BeauticianProvider & {
  theme_color?: string | null
}

const DEFAULT_THEME = '#EC4899'

export default function BeauticianQrPage() {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [origin,   setOrigin]   = useState<string>('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: Provider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const themeColor = provider?.theme_color || DEFAULT_THEME
  const publicUrl  = provider && origin ? `${origin}/beautician/${provider.slug}` : ''

  // Draw the on-page QR whenever the URL or theme colour changes.
  useEffect(() => {
    if (!canvasRef.current || !publicUrl) return
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width:  360,
      margin: 1,
      color:  { dark: themeColor, light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).catch(() => { /* swallow — canvas just stays blank */ })
  }, [publicUrl, themeColor])

  async function copyUrl() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* ignore */ }
  }

  // Build the 1080×1080 print PNG off-screen and trigger a download.
  // Header bar (theme colour) holds the provider name + "Scan to book",
  // a big high-EC QR sits centered on white below, footer = "kita2u.com".
  async function downloadPng() {
    if (!provider || !publicUrl) return
    const SIZE     = 1080
    const HEADER_H = 120
    const out      = document.createElement('canvas')
    out.width  = SIZE
    out.height = SIZE
    const ctx = out.getContext('2d')
    if (!ctx) return

    // White background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Top header bar in theme colour
    ctx.fillStyle = themeColor
    ctx.fillRect(0, 0, SIZE, HEADER_H)

    // Header text — provider name + scan-to-book line
    ctx.fillStyle    = '#FFFFFF'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = '700 38px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(provider.display_name || 'Book me', SIZE / 2, HEADER_H / 2 - 14)
    ctx.font         = '600 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('Scan to book', SIZE / 2, HEADER_H / 2 + 22)

    // Big QR on a white tile, centred in the remaining space
    const QR_SIZE = 760
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, publicUrl, {
      width:  QR_SIZE,
      margin: 1,
      color:  { dark: themeColor, light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })
    const qrX = (SIZE - QR_SIZE) / 2
    const qrY = HEADER_H + ((SIZE - HEADER_H) - QR_SIZE) / 2 - 20
    ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE)

    // Footer
    ctx.fillStyle    = 'rgba(0,0,0,0.45)'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = '600 20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('kita2u.com', SIZE / 2, SIZE - 40)

    const dataUrl = out.toDataURL('image/png')
    const a = document.createElement('a')
    a.href     = dataUrl
    a.download = `${provider.slug || 'beautician'}-qr.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (loading) return <Shell><Loading /></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link
            href="/login?next=/dashboard/beautician/qr"
            className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block min-h-[44px]"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }
  if (!provider) return <Shell><div className="px-4 pt-20 text-center text-black/70 text-[14px]">No beautician profile yet.</div></Shell>

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        {/* Brand header */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-black leading-tight text-black truncate mb-0.5">Profile QR</h1>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Print on business cards, salon mirrors, anywhere. Scan = direct to your profile.
              </p>
            </div>
          </div>
        </div>

        {/* QR card */}
        <section
          className="rounded-3xl bg-white p-5 shadow-sm border-2"
          style={{ borderColor: themeColor }}
        >
          <div className="flex items-center justify-center mb-4">
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              className="rounded-2xl"
              aria-label="Profile QR code"
            />
          </div>

          {/* URL preview */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 mb-3 overflow-hidden">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/55 mb-0.5">Public link</div>
            <div className="text-[13px] font-mono text-black truncate">{publicUrl || '—'}</div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={downloadPng}
              disabled={!publicUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shadow-md min-h-[48px] transition"
            >
              <Download size={15} strokeWidth={2.5} />
              Download PNG for printing
            </button>
            <button
              type="button"
              onClick={copyUrl}
              disabled={!publicUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black border border-gray-200 hover:bg-gray-50 px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition"
            >
              {copied ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2.5} />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>
          </div>
        </section>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
function Loading() {
  return (
    <div className="flex items-center justify-center pt-32">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
