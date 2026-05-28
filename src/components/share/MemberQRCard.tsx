'use client'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, Share2, Loader2 } from 'lucide-react'

// Universal QR business card — every vendor vertical renders one. Replaces
// the old rider-only QRBusinessCard (which fetched the QR from qrserver.com).
// We generate the QR locally with the `qrcode` package: zero third-party
// runtime dependency, and we can hand the user a Download-as-PNG file.
//
// Visual: credit-card aspect, yellow front with a dark strip header. Left
// column is identity + accents; right column is an inverted dark panel
// holding the QR + scan call-to-action. Vertical-themed via `themeColor`
// (defaults to gold) for the header strip + accents.
//
// Action buttons (Download / Print / Share) live OUTSIDE this component —
// see the parent dashboard page that places the card. The card itself is
// pure visual so the same DOM is what `window.print()` captures.

export type MemberQRCardProps = {
  /** Full URL the QR encodes — e.g. https://indocity.id/beautician/jane-doe */
  profileUrl: string
  /** Vendor display name shown in big text */
  displayName: string
  /** Vendor city (top-right tag) */
  city?: string | null
  /** Subtitle under the name — e.g. "Beautician · Yogyakarta" */
  subtitle?: string | null
  /** Square avatar / cover (140x140 recommended). Falls back to initials. */
  photoUrl?: string | null
  /** Vertical label shown in the dark header strip — e.g. "IndoCity · Beautician" */
  verticalLabel: string
  /** WhatsApp number in any format — digits-only or +E.164. Optional. */
  whatsappE164?: string | null
  /** Optional "From Rp 50.000 / session" line on the right panel */
  priceLine?: string | null
  /** Theme accent for the header strip + service pills. Defaults to gold. */
  themeColor?: string
}

const GOLD = '#FACC15'
const INK  = '#0A0A0A'

export default function MemberQRCard({
  profileUrl,
  displayName,
  city,
  subtitle,
  photoUrl,
  verticalLabel,
  whatsappE164,
  priceLine,
  themeColor = GOLD,
}: MemberQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    if (!profileUrl) { setQrDataUrl(''); return }
    QRCode.toDataURL(profileUrl, {
      errorCorrectionLevel: 'H',  // High — survives small print + smudges
      margin: 1,
      width: 360,
      color: { dark: INK, light: themeColor },
    })
      .then(url => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => { if (!cancelled) setQrDataUrl('') })
    return () => { cancelled = true }
  }, [profileUrl, themeColor])

  const initials = displayName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('') || '·'

  const cleanUrl = profileUrl.replace(/^https?:\/\//, '')

  return (
    <div className="qrcard">
      {/* Header strip */}
      <div className="qrcard-strip">
        <div className="qrcard-brand">{verticalLabel}</div>
        {city && <div className="qrcard-tag">{city}</div>}
      </div>

      <div className="qrcard-body">
        {/* Left column — identity */}
        <div className="qrcard-left">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="qrcard-photo" />
          ) : (
            <div className="qrcard-photo qrcard-photo-fallback">{initials}</div>
          )}
          <div className="qrcard-name">{displayName}</div>
          {subtitle && <div className="qrcard-subtitle">{subtitle}</div>}

          {whatsappE164 && (
            <div className="qrcard-wa">
              <span className="qrcard-wa-icon">📱</span>
              <span className="qrcard-wa-num">{whatsappE164.startsWith('+') ? whatsappE164 : `+${whatsappE164}`}</span>
            </div>
          )}
        </div>

        {/* Right column — QR + scan CTA */}
        <div className="qrcard-right">
          <div className="qrcard-scan-label">Scan to book</div>
          <div className="qrcard-qr-wrap">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Profile QR code" className="qrcard-qr" />
            ) : (
              <div className="qrcard-qr qrcard-qr-loading">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>
          {priceLine && <div className="qrcard-price">{priceLine}</div>}
          <div className="qrcard-url">{cleanUrl}</div>
        </div>
      </div>

      <style jsx>{`
        .qrcard {
          width: 100%; max-width: 560px; margin: 0 auto;
          background: ${themeColor};
          color: ${INK};
          border-radius: 22px;
          overflow: hidden;
          font-family: ui-sans-serif, system-ui, sans-serif;
          box-shadow: 0 20px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04);
        }
        .qrcard-strip {
          background: ${INK}; color: ${themeColor};
          padding: 14px 22px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .qrcard-brand {
          font-weight: 900; font-size: 16px; letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .qrcard-tag {
          font-size: 13px; font-weight: 800;
          background: rgba(255,255,255,0.08);
          border: 1px solid ${themeColor};
          color: ${themeColor};
          padding: 4px 10px; border-radius: 9999px;
        }
        .qrcard-body {
          display: grid; grid-template-columns: 1fr 0.9fr; gap: 18px;
          padding: 22px;
        }
        .qrcard-left  { display: flex; flex-direction: column; gap: 10px; }
        .qrcard-photo {
          width: 96px; height: 96px; border-radius: 18px; object-fit: cover;
          border: 3px solid ${INK};
          background: #ffffff;
        }
        .qrcard-photo-fallback {
          display: flex; align-items: center; justify-content: center;
          font-size: 38px; font-weight: 900;
          color: ${themeColor};
          background: ${INK};
        }
        .qrcard-name { font-size: 22px; font-weight: 900; line-height: 1.1; }
        .qrcard-subtitle {
          font-size: 13px; font-weight: 700;
          color: rgba(10,10,10,0.7); margin-top: -2px;
        }
        .qrcard-wa {
          margin-top: 8px;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 800; color: ${INK};
          background: rgba(255,255,255,0.45);
          padding: 6px 10px; border-radius: 9999px;
          width: fit-content;
        }
        .qrcard-wa-icon { font-size: 14px; }
        .qrcard-wa-num  { font-family: ui-monospace, "SF Mono", monospace; }

        .qrcard-right {
          background: ${INK}; color: ${themeColor};
          border-radius: 16px; padding: 14px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .qrcard-scan-label {
          font-size: 13px; font-weight: 900;
          color: ${themeColor};
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .qrcard-qr-wrap {
          background: ${themeColor};
          padding: 8px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .qrcard-qr {
          width: 156px; height: 156px;
          image-rendering: pixelated;
          display: block;
        }
        .qrcard-qr-loading {
          color: ${INK};
        }
        .qrcard-price {
          font-size: 13px; font-weight: 800;
          color: #ffffff; opacity: 0.85;
          text-align: center;
        }
        .qrcard-url {
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.55);
          word-break: break-all; text-align: center;
          line-height: 1.25;
        }

        @media (max-width: 480px) {
          .qrcard-body { grid-template-columns: 1fr; gap: 14px; }
          .qrcard-photo { width: 84px; height: 84px; }
          .qrcard-name { font-size: 20px; }
          .qrcard-qr { width: 180px; height: 180px; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Action buttons — sit BELOW the card. Print / Download / Share.
// Kept here so every dashboard imports one bundle. The Download produces a
// fresh higher-res QR png (separate from the displayed 360-pixel version)
// so the saved file is good for stickers + warung printing.
// ============================================================================

export function MemberQRActions({
  profileUrl,
  displayName,
  shareTitle,
  shareText,
  className,
}: {
  profileUrl: string
  displayName: string
  /** Browser share-sheet title — falls back to displayName + IndoCity */
  shareTitle?: string
  /** Body for the share sheet / WhatsApp prefill */
  shareText?: string
  className?: string
}) {
  const [busy, setBusy] = useState<'download' | null>(null)

  async function onDownload() {
    if (busy) return
    setBusy('download')
    try {
      // Re-generate at higher resolution for the download — 800px wide
      // looks crisp on stickers and Instagram stories.
      const png = await QRCode.toDataURL(profileUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 800,
        color: { dark: '#0A0A0A', light: '#FFFFFF' },
      })
      const a = document.createElement('a')
      a.href = png
      a.download = `${slugify(displayName)}-indocity-qr.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setBusy(null)
    }
  }

  function onPrint() {
    window.print()
  }

  async function onShare() {
    const data: ShareData = {
      title: shareTitle ?? `${displayName} · IndoCity`,
      text:  shareText  ?? `Find me on IndoCity — scan the QR or visit ${profileUrl}`,
      url:   profileUrl,
    }
    if (navigator.share) {
      try { await navigator.share(data) } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl)
        alert('Profile link copied — paste into WhatsApp / Instagram / Facebook.')
      } catch { /* clipboard blocked */ }
    }
  }

  return (
    <div className={`grid grid-cols-3 gap-2 no-print ${className ?? ''}`}>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy === 'download'}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-extrabold uppercase tracking-wide active:scale-[0.98] transition disabled:opacity-60"
        style={{ background: '#0A0A0A', color: '#FACC15', minHeight: 48 }}
      >
        {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={2.5} />}
        Download
      </button>
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-extrabold uppercase tracking-wide active:scale-[0.98] transition"
        style={{ background: '#FACC15', color: '#0A0A0A', minHeight: 48 }}
      >
        <Printer className="w-4 h-4" strokeWidth={2.75} />
        Print
      </button>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-extrabold uppercase tracking-wide text-white active:scale-[0.98] transition"
        style={{ background: '#25D366', minHeight: 48 }}
      >
        <Share2 className="w-4 h-4" strokeWidth={2.75} />
        Share
      </button>
    </div>
  )
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'indocity'
}
