'use client'
// ============================================================================
// /dashboard/rider/qr — Printable profile QR for bike riders
// ----------------------------------------------------------------------------
// Pure client-side: pulls the rider row from public.drivers, mints a
// 360×360 canvas QR for the public profile URL (citydrivers.id/r/<slug>),
// and offers a 1080×1080 PNG export with a yellow header bar for printing
// on business cards, helmet stickers, hotel concierge desks, etc.
//
// Public URL is always /r/<slug> — bike riders share a single route,
// unlike car drivers whose URL forks between /car / /bus / /truck.
//
// Includes a CSS @media print A6 flier so the rider can hit Cmd-P to get
// a clean handout without going through Photoshop.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, QrCode, Download, Copy, Check, MessageCircle,
  Printer, Loader2,
} from 'lucide-react'
import QRCode from 'qrcode'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'

const SITE_HOST = 'citydrivers.id'
const BRAND_YELLOW = '#FACC15'
const BRAND_YELLOW_DEEP = '#EAB308'
const INK = '#0A0A0A'

type DriverMeta = {
  user_id: string
  slug: string | null
  business_name: string | null
  city: string | null
  area: string | null
  vehicle_type: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'no_slug' }
  | { kind: 'ready'; driver: DriverMeta }
  | { kind: 'error'; message: string }

// Bike riders always share /r/<slug>.
function publicPathFor(slug: string): string {
  return `/r/${slug}`
}

export default function RiderQrPage() {
  const [state,  setState]  = useState<LoadState>({ kind: 'loading' })
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState<string>('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) {
      const row = dev.driver as unknown as DriverMeta
      if (!row.slug) { setState({ kind: 'no_slug' }); return }
      setState({ kind: 'ready', driver: row })
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setState({ kind: 'unauth' }); return }

    const { data, error } = await supabase
      .from('drivers')
      .select('user_id, slug, business_name, city, area, vehicle_type')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    const row = data as DriverMeta
    if (!row.slug) { setState({ kind: 'no_slug' }); return }
    setState({ kind: 'ready', driver: row })
  }, [])

  useEffect(() => { void reload() }, [reload])

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const driver = state.kind === 'ready' ? state.driver : null

  const publicPath = useMemo(
    () => driver?.slug ? publicPathFor(driver.slug) : '',
    [driver],
  )
  // Prefer the production host for the encoded URL so the printed QR
  // doesn't carry a localhost origin if the rider previews this on dev.
  const publicUrl = useMemo(() => {
    if (!publicPath) return ''
    if (typeof window !== 'undefined' && origin.includes(SITE_HOST)) {
      return `${origin}${publicPath}`
    }
    return `https://${SITE_HOST}${publicPath}`
  }, [publicPath, origin])
  const displayUrl = useMemo(
    () => publicPath ? `${SITE_HOST}${publicPath}` : '',
    [publicPath],
  )

  // Draw the on-page QR whenever the URL changes.
  useEffect(() => {
    if (!canvasRef.current || !publicUrl) return
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width:  360,
      margin: 1,
      color:  { dark: INK, light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).catch(() => { /* canvas stays blank */ })
  }, [publicUrl])

  async function copyUrl() {
    if (!displayUrl) return
    try {
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* ignore */ }
  }

  // Build the 1080×1080 print PNG off-screen.
  // Yellow header band, big QR centred, footer = citydrivers.id.
  async function downloadPng() {
    if (!driver || !publicUrl) return
    const SIZE     = 1080
    const HEADER_H = 140
    const out      = document.createElement('canvas')
    out.width  = SIZE
    out.height = SIZE
    const ctx = out.getContext('2d')
    if (!ctx) return

    // White background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Yellow header band
    const grad = ctx.createLinearGradient(0, 0, SIZE, HEADER_H)
    grad.addColorStop(0, BRAND_YELLOW)
    grad.addColorStop(1, BRAND_YELLOW_DEEP)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SIZE, HEADER_H)

    // Header text — rider name + scan-to-book line
    ctx.fillStyle    = INK
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = '800 42px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(driver.business_name || 'Cityriders rider', SIZE / 2, HEADER_H / 2 - 14)
    ctx.font         = '600 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    const subParts: string[] = []
    if (driver.area || driver.city) {
      subParts.push([driver.area, driver.city].filter(Boolean).join(', '))
    }
    subParts.push('Scan to book a rider')
    ctx.fillText(subParts.join(' · '), SIZE / 2, HEADER_H / 2 + 22)

    // Big QR centred in the remaining space
    const QR_SIZE = 760
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, publicUrl, {
      width:  QR_SIZE,
      margin: 1,
      color:  { dark: INK, light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })
    const qrX = (SIZE - QR_SIZE) / 2
    const qrY = HEADER_H + ((SIZE - HEADER_H) - QR_SIZE) / 2 - 30
    ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE)

    // Footer — full URL + host
    ctx.fillStyle    = 'rgba(10,10,10,0.55)'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = '700 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(displayUrl, SIZE / 2, SIZE - 50)

    const dataUrl = out.toDataURL('image/png')
    const a = document.createElement('a')
    a.href     = dataUrl
    a.download = `${driver.slug || 'rider'}-qr.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function shareToWhatsApp() {
    if (!displayUrl) return
    const url = `https://${displayUrl}`
    const text = `Hubungi saya untuk pesan ojek: ${url}`
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(wa, '_blank', 'noopener,noreferrer')
  }

  function printFlier() {
    if (typeof window !== 'undefined') window.print()
  }

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading QR…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/signup', label: 'Sign in' }}>Sign in to access your QR.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=bike', label: 'Create rider profile' }}>No rider profile yet.</FullPageMessage>
  if (state.kind === 'no_slug')     return <FullPageMessage cta={{ href: '/dashboard/rider/info', label: 'Set up profile' }}>Set your public slug to generate a QR.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load profile: {state.message}</FullPageMessage>

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32 space-y-4 print:hidden">
        <Link
          href="/dashboard/rider"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black"
          style={{ minHeight: 32 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero gradient strip */}
        <section
          className="rounded-3xl p-5 sm:p-6"
          style={{
            background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DEEP} 100%)`,
            color: INK,
            boxShadow: '0 12px 32px rgba(250,204,21,0.30)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(10,10,10,0.10)' }}
            >
              <QrCode className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black leading-tight truncate">Profile QR</h1>
              <p className="text-[12.5px] font-bold opacity-80 leading-snug">
                Print on business cards, helmet stickers, hotel desks. Scan = direct to your profile.
              </p>
            </div>
          </div>
        </section>

        {/* URL pill */}
        <section className="rounded-3xl bg-white border border-black/10 p-4 shadow-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/55 mb-1.5">
            Your public link
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 min-w-0 rounded-full px-4 py-2.5 text-[13px] font-bold text-[#0A0A0A] truncate"
              style={{ background: '#FFFBEA', border: '1px solid rgba(250,204,21,0.45)' }}
            >
              {displayUrl || '—'}
            </div>
            <button
              type="button"
              onClick={copyUrl}
              disabled={!displayUrl}
              className="inline-flex items-center gap-1.5 px-3 rounded-full bg-[#FACC15] text-[#0A0A0A] text-[12px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-50"
              style={{ minHeight: 44 }}
              aria-label="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        {/* QR card */}
        <section
          className="rounded-3xl bg-white p-5 shadow-sm"
          style={{ border: `2px solid ${BRAND_YELLOW}` }}
        >
          <div className="flex items-center justify-center mb-4">
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              className="rounded-2xl"
              aria-label="Profile QR code"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={downloadPng}
              disabled={!publicUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-50"
              style={{
                background: BRAND_YELLOW,
                color:      INK,
                boxShadow:  '0 8px 24px rgba(250,204,21,0.40)',
                minHeight:  48,
              }}
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Download PNG
            </button>
            <button
              type="button"
              onClick={shareToWhatsApp}
              disabled={!publicUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-50"
              style={{
                background: '#25D366',
                color:      '#FFFFFF',
                minHeight:  48,
              }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Share to WhatsApp
            </button>
            <button
              type="button"
              onClick={printFlier}
              disabled={!publicUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-50"
              style={{
                background: '#FFFFFF',
                color:      INK,
                border:     '1px solid rgba(10,10,10,0.15)',
                minHeight:  48,
              }}
            >
              <Printer className="w-4 h-4" strokeWidth={2.5} />
              Print A6 flier
            </button>
          </div>
        </section>

        {/* Hint */}
        <p className="text-[11.5px] text-black/45 text-center leading-snug px-4">
          Tip — the Print button opens your browser's print dialog. Set page
          size to A6 (or "Actual size" on receipt paper) for a clean handout.
        </p>
      </div>

      {/* ─── Printable A6 flier ──────────────────────────────────────── */}
      {/* Hidden on screen, shown only when the user prints. A6 is 105×148mm. */}
      <PrintFlier driver={driver} displayUrl={displayUrl} publicUrl={publicUrl} />
    </Shell>
  )
}

// ─── Printable A6 flier ───────────────────────────────────────────────

function PrintFlier({
  driver, displayUrl, publicUrl,
}: {
  driver: DriverMeta | null
  displayUrl: string
  publicUrl: string
}) {
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!printCanvasRef.current || !publicUrl) return
    QRCode.toCanvas(printCanvasRef.current, publicUrl, {
      width:  600,
      margin: 1,
      color:  { dark: INK, light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).catch(() => { /* ignore */ })
  }, [publicUrl])

  if (!driver) return null

  return (
    <div className="hidden print:block">
      <style>{`
        @media print {
          @page { size: A6; margin: 6mm; }
          body { background: #FFFFFF !important; }
          .cr-flier {
            width: 93mm;
            height: 136mm;
            display: flex;
            flex-direction: column;
            color: #0A0A0A;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          }
          .cr-flier-head {
            background: linear-gradient(135deg, #FACC15 0%, #EAB308 100%);
            padding: 6mm 5mm;
            border-radius: 4mm 4mm 0 0;
            text-align: center;
          }
          .cr-flier-brand {
            font-size: 9pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            opacity: 0.7;
          }
          .cr-flier-name {
            font-size: 18pt;
            font-weight: 900;
            line-height: 1.05;
            margin-top: 1mm;
          }
          .cr-flier-loc {
            font-size: 10pt;
            font-weight: 600;
            opacity: 0.75;
            margin-top: 1mm;
          }
          .cr-flier-qr-wrap {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FFFFFF;
            border: 2px solid #FACC15;
            border-top: 0;
            border-radius: 0 0 4mm 4mm;
            padding: 5mm;
          }
          .cr-flier-qr-wrap canvas {
            width: 60mm !important;
            height: 60mm !important;
          }
          .cr-flier-foot {
            text-align: center;
            font-size: 8.5pt;
            font-weight: 700;
            margin-top: 3mm;
            color: #525252;
          }
          .cr-flier-cta {
            text-align: center;
            font-size: 10pt;
            font-weight: 800;
            margin-top: 2mm;
            color: #0A0A0A;
          }
        }
      `}</style>
      <div className="cr-flier">
        <div className="cr-flier-head">
          <div className="cr-flier-brand">Rider</div>
          <div className="cr-flier-name">{driver.business_name || 'Cityriders rider'}</div>
          {(driver.area || driver.city) && (
            <div className="cr-flier-loc">{[driver.area, driver.city].filter(Boolean).join(', ')}</div>
          )}
        </div>
        <div className="cr-flier-qr-wrap">
          <canvas ref={printCanvasRef} width={600} height={600} />
        </div>
        <div className="cr-flier-cta">Scan to book a rider</div>
        <div className="cr-flier-foot">{displayUrl}</div>
      </div>
    </div>
  )
}

// ─── Shell + chrome ───────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      {children}
    </main>
  )
}

function FullPageMessage({
  children, cta, spinner,
}: {
  children: React.ReactNode
  cta?: { href: string; label: string }
  spinner?: boolean
}) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        {spinner && (
          <Loader2 className="w-7 h-7 mx-auto text-[#EAB308] animate-spin mb-3" strokeWidth={2.5} />
        )}
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
          </Link>
        )}
        <div className="mt-6">
          <Link
            href="/dashboard/rider"
            className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
