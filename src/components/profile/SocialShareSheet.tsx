'use client'
import { useState } from 'react'
import { X, Copy, Check, MessageCircle, Facebook, QrCode, Download } from 'lucide-react'
import { trackShareClick, type ProviderType } from '@/lib/tracking/shareClick'

// Bottom-sheet share modal. Four actions:
//   • Share to WhatsApp     — wa.me share intent
//   • Share to Facebook     — sharer.php
//   • Copy link             — clipboard
//   • QR code               — opens a sub-dialog with a downloadable PNG
//
// `url` is the public profile URL the visitor / provider wants to share.
// `prefillText` is the leading text (e.g. "Lihat profil ini di CityDrivers:").
//
// providerType + providerId drive the share-click telemetry (mig 0177).
// Without those two props nothing is logged — they're required so callers
// can't accidentally leave them out.

export default function SocialShareSheet({
  open, onClose, url, prefillText, providerName, providerType, providerId,
}: {
  open: boolean
  onClose: () => void
  url: string
  prefillText: string
  providerName: string
  providerType: ProviderType
  providerId: string
}) {
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  if (!open) return null

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${prefillText} ${url}`)}`
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  // First-party QR endpoint (api/qr) — no third-party dependency.
  // /api/qr accepts ?text= (audit fix 2026-06-02 — was ?data= which the
  // route ignored, returning 400 and a broken QR image in the share sheet).
  // The route renders an SVG so the size param isn't needed; CSS handles
  // sizing in the modal.
  const qrSrc = `/api/qr?text=${encodeURIComponent(url)}`

  async function copy() {
    trackShareClick({ providerType, providerId, platform: 'copy_link' })
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* no clipboard permission — silent */ }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[71] pb-safe">
        <div className="max-w-2xl mx-auto bg-bg border-t border-white/10 rounded-t-2xl p-4 space-y-3"
             style={{ boxShadow: '0 -12px 32px rgba(0,0,0,0.55)' }}>
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold uppercase tracking-wider text-ink/85">
              Share profile
            </div>
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <ShareTile
              href={waUrl}
              icon={MessageCircle}
              label="WhatsApp"
              tint="#25D366"
              onClick={() => trackShareClick({ providerType, providerId, platform: 'whatsapp' })}
            />
            <ShareTile
              href={fbUrl}
              icon={Facebook}
              label="Facebook"
              tint="#1877F2"
              onClick={() => trackShareClick({ providerType, providerId, platform: 'facebook' })}
            />
            <ShareTile
              onClick={copy}
              icon={copied ? Check : Copy}
              label={copied ? 'Copied' : 'Copy link'}
              tint="#FACC15"
            />
            <ShareTile
              onClick={() => {
                trackShareClick({ providerType, providerId, platform: 'qr_view' })
                setQrOpen(true)
              }}
              icon={QrCode}
              label="QR code"
              tint="#A78BFA"
            />
          </div>

          <div className="text-[11px] text-muted text-center truncate font-mono">{url}</div>
        </div>
      </div>

      {qrOpen && (
        <div className="fixed inset-0 z-[72] bg-black/85 flex items-center justify-center p-4" onClick={() => setQrOpen(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-[360px] w-full text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-extrabold uppercase tracking-wider text-black/70">{providerName}</div>
            <img src={qrSrc} alt="QR code" className="w-full aspect-square" style={{ imageRendering: 'pixelated' }} />
            <div className="text-[11px] text-black/60 font-mono break-all">{url}</div>
            <a
              href={qrSrc}
              download={`citydrivers-${providerName.toLowerCase().replace(/\s+/g, '-')}-qr.png`}
              onClick={() => trackShareClick({ providerType, providerId, platform: 'qr_download' })}
              className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-black text-white px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider"
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Download PNG
            </a>
          </div>
        </div>
      )}
    </>
  )
}

function ShareTile({
  href, onClick, icon: Icon, label, tint,
}: {
  href?: string
  onClick?: () => void
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  tint: string
}) {
  const inner = (
    <>
      <span
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: tint, color: tint === '#FACC15' ? '#0A0A0A' : '#FFFFFF' }}
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <span className="text-[11px] font-bold text-ink/80 text-center">{label}</span>
    </>
  )
  const className = 'flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-white/5 transition'
  if (href) {
    // onClick fires synchronously before the browser follows the href so
    // sendBeacon dispatches before the new tab opens.
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
        {inner}
      </a>
    )
  }
  return <button type="button" onClick={onClick} className={className}>{inner}</button>
}
