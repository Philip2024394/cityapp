'use client'
import { MessageCircle, Share2 } from 'lucide-react'

// Sticky bottom action bar — universal across all 8 verticals.
// Two actions: primary WhatsApp (green, takes 70%) + secondary Share (yellow).
// `whatsappE164` should be digits-only or E.164 with +.
// `prefillText` is the pre-filled message body (e.g. "Hi, found you on
// City Riders, can I book…?"). Pass empty string for plain wa.me link.
// `onShare` opens the share sheet (handled by the parent — usually opens
// a <SocialShareSheet> modal).

export default function StickyContactBar({
  whatsappE164,
  prefillText,
  onShare,
  onContact,
  contactLabel = 'Contact via WhatsApp',
  shareLabel   = 'Share',
}: {
  whatsappE164: string | null | undefined
  prefillText: string
  onShare: () => void
  /** When provided, the green primary button calls this instead of
   *  opening WhatsApp directly. Used by profile pages that want a
   *  ContactBookingPopup form in between (records the request, then
   *  bounces to WhatsApp with structured data). */
  onContact?: () => void
  contactLabel?: string
  shareLabel?: string
}) {
  const digits = (whatsappE164 ?? '').replace(/[^0-9]/g, '')
  const waHref = digits
    ? `https://wa.me/${digits}${prefillText ? `?text=${encodeURIComponent(prefillText)}` : ''}`
    : null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 pb-safe"
      style={{
        background: 'linear-gradient(to top, rgba(10,10,10,0.98) 60%, rgba(10,10,10,0.85))',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2">
        {onContact ? (
          <button
            type="button"
            onClick={onContact}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-extrabold uppercase tracking-wider text-white active:scale-[0.98] transition"
            style={{
              background: '#25D366',
              boxShadow: '0 6px 16px rgba(37,211,102,0.35)',
              minHeight: 48,
            }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.75} />
            {contactLabel}
          </button>
        ) : waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-extrabold uppercase tracking-wider text-white active:scale-[0.98] transition"
            style={{
              background: '#25D366',
              boxShadow: '0 6px 16px rgba(37,211,102,0.35)',
              minHeight: 48,
            }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.75} />
            {contactLabel}
          </a>
        ) : (
          <div className="flex-1 text-center text-[12px] text-muted italic py-3">
            No contact number on file
          </div>
        )}
        <button
          type="button"
          onClick={onShare}
          aria-label={shareLabel}
          className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95"
          style={{
            background: '#FACC15',
            color: '#0A0A0A',
            border: '1px solid rgba(0,0,0,0.85)',
            boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
          }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.75} />
        </button>
      </div>
    </div>
  )
}
