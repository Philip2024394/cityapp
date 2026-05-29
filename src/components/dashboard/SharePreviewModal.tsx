'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  Check, ChevronDown, Copy, Download, Heart, Link2, Mail, MessageCircle,
  Send, Share2, Smartphone, X as XIcon,
} from 'lucide-react'
import { PLATFORMS, imagekitCrop, type PlatformId, type PlatformSpec } from '@/lib/promo/platforms'
import {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
  SocialXIcon,
  SocialSnapchatIcon,
  ChatWhatsAppIcon,
  ChatTelegramIcon,
} from '@/components/profile/VisitUsPanel'

// Share modal — redesigned so the user has actual tappable share
// targets instead of just mockups. Three tiers:
//
//   1. Native phone share (mobile only) — opens the OS share sheet,
//      which on mobile includes Instagram / TikTok / Snapchat as
//      targets even though those platforms don't expose a web URL.
//   2. Direct platform buttons — open the platform with the message
//      pre-filled. Works for WhatsApp / Telegram / Facebook / X /
//      Email / Copy link.
//   3. Manual save-and-paste — Save image + Copy caption for
//      Instagram / TikTok / Snapchat, the platforms that block
//      programmatic posting entirely.
//
// The platform mockups still exist under a collapsible "Preview how
// it looks" section at the bottom so the user can verify how the
// post will appear before sharing.

export type SharePromo = {
  slug:                 string
  headline:             string
  photo_url:            string
  ai_caption:           string
  ai_caption_short:     string | null
  hashtags_by_platform: Record<string, string[]> | null
}

export default function SharePreviewModal({
  promo, providerName, providerHandle, profileImageUrl, city, themeColor, onClose,
}: {
  promo:           SharePromo
  providerName:    string
  providerHandle:  string
  profileImageUrl?: string | null
  city?:            string | null
  themeColor:      string
  onClose:         () => void
}) {
  const promoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/promo/${promo.slug}`
    : `/promo/${promo.slug}`

  // Detect Web Share API availability on mount. Only mobile + recent
  // desktop Safari support it; falls back to nothing on older
  // browsers (the button stays hidden).
  const [canNativeShare, setCanNativeShare] = useState(false)
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const [previewOpen, setPreviewOpen] = useState(false)

  // Default caption for the "share now" buttons + manual copy — body
  // + Instagram hashtag pack (most-paste-friendly default). Each
  // direct-share button can override per-platform conventions.
  const igTags = (promo.hashtags_by_platform ?? {}).instagram ?? []
  const xTags  = (promo.hashtags_by_platform ?? {}).x ?? []
  const xText  = (promo.ai_caption_short ?? promo.headline)
  const captionWithIgTags = `${promo.ai_caption}${igTags.length ? `\n\n${igTags.join(' ')}` : ''}`
  const captionWithXTags  = `${xText}${xTags.length ? ` ${xTags.join(' ')}` : ''}`

  async function nativeShare() {
    try {
      await navigator.share({
        title: promo.headline,
        text:  captionWithIgTags,
        url:   promoUrl,
      })
    } catch { /* user cancelled */ }
  }

  const directButtons: Array<{
    id:       string
    label:    string
    onClick?: () => void
    href?:    string
    icon:     React.ReactNode
    bg:       string
  }> = [
    {
      id:    'whatsapp',
      label: 'WhatsApp',
      href:  `https://wa.me/?text=${encodeURIComponent(`${promo.headline}\n${promoUrl}`)}`,
      icon:  <span className="inline-block w-4 h-4 text-white"><ChatWhatsAppIcon /></span>,
      bg:    '#25D366',
    },
    {
      id:    'telegram',
      label: 'Telegram',
      href:  `https://t.me/share/url?url=${encodeURIComponent(promoUrl)}&text=${encodeURIComponent(promo.headline)}`,
      icon:  <span className="inline-block w-4 h-4 text-white"><ChatTelegramIcon /></span>,
      bg:    '#229ED9',
    },
    {
      id:    'facebook',
      label: 'Facebook',
      href:  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(promoUrl)}`,
      icon:  <span className="inline-block w-4 h-4 text-white"><SocialFacebookIcon /></span>,
      bg:    '#1877F2',
    },
    {
      id:    'x',
      label: 'X (Twitter)',
      href:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(captionWithXTags)}&url=${encodeURIComponent(promoUrl)}`,
      icon:  <span className="inline-block w-4 h-4 text-white"><SocialXIcon /></span>,
      bg:    '#0A0A0A',
    },
    {
      id:    'email',
      label: 'Email',
      href:  `mailto:?subject=${encodeURIComponent(promo.headline)}&body=${encodeURIComponent(`${promo.ai_caption}\n\n${promoUrl}`)}`,
      icon:  <Mail className="w-4 h-4 text-white" strokeWidth={2.5} />,
      bg:    '#6B7280',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.62)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] overflow-hidden flex flex-col"
      >
        {/* Theme-coloured top edge with running glow. */}
        <style>{`
          @keyframes cr-modal-edge-sweep {
            0%   { background-position: -100% 0; }
            100% { background-position:  200% 0; }
          }
        `}</style>
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none z-10"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, ${themeColor} 30%, rgba(255,255,255,0.85) 50%, ${themeColor} 70%, transparent 100%)`,
            backgroundColor: themeColor,
            backgroundSize: '220% 100%',
            animation: 'cr-modal-edge-sweep 3s linear infinite',
            boxShadow: `0 0 18px 2px ${themeColor}, 0 0 4px 0 ${themeColor}`,
          }}
        />

        {/* Centre drag handle on mobile. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share preview"
          className="shrink-0 pt-3 pb-1 flex justify-center bg-white sm:hidden"
        >
          <span className="block w-10 h-1.5 rounded-full bg-gray-300" />
        </button>

        <header className="shrink-0 px-4 pt-3 pb-3 sm:pt-4 border-b border-gray-200 flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-[15px] font-black text-black">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: themeColor }}
            >
              <Share2 className="w-3.5 h-3.5" strokeWidth={2.75} />
            </span>
            Share this promo
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-sm transition active:scale-[0.95]"
            style={{ background: themeColor }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Tier 1 — native phone share (mobile + supported desktop) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-white text-[14px] font-extrabold uppercase tracking-wider shadow-md active:scale-[0.98] transition min-h-[52px]"
              style={{ background: themeColor, boxShadow: `0 6px 20px -4px ${themeColor}` }}
            >
              <Smartphone className="w-5 h-5" strokeWidth={2.5} />
              Share via my phone
            </button>
          )}
          {canNativeShare && (
            <p className="text-[12px] text-black/55 text-center -mt-2 leading-snug">
              Opens your phone&apos;s share menu — includes Instagram, TikTok, Snap if installed.
            </p>
          )}

          {/* Tier 2 — direct platform share buttons */}
          <div>
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/55 mb-2">
              Or share directly to:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {directButtons.map((b) => (
                <a
                  key={b.id}
                  href={b.href}
                  onClick={b.onClick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl text-white px-3 py-3 text-[13px] font-extrabold transition active:scale-[0.97] min-h-[48px] shadow-sm"
                  style={{ background: b.bg }}
                >
                  {b.icon}
                  {b.label}
                </a>
              ))}
              <CopyLinkButton url={promoUrl} themeColor={themeColor} />
            </div>
          </div>

          {/* Tier 3 — manual fallback for platforms that block direct posting */}
          <div>
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/55 mb-2 inline-flex items-center gap-2 flex-wrap">
              For
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 text-black/70"><SocialInstagramIcon /></span>
                Instagram
              </span>
              ·
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 text-black/70"><SocialTikTokIcon /></span>
                TikTok
              </span>
              ·
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 text-black/70"><SocialSnapchatIcon /></span>
                Snap
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SaveImageButton url={promo.photo_url} themeColor={themeColor} />
              <CopyCaptionButton text={captionWithIgTags} themeColor={themeColor} />
            </div>
            <p className="text-[11px] text-black/55 mt-2 leading-snug">
              These platforms don&apos;t let outside apps post for you. Save the image, copy the caption, then open the app and paste.
            </p>
          </div>

          {/* Collapsible mockup preview */}
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            aria-expanded={previewOpen}
            className="w-full inline-flex items-center justify-between rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-3 text-[13px] font-extrabold text-black transition min-h-[44px]"
          >
            <span>Preview how it looks on each platform</span>
            <ChevronDown
              className={`w-4 h-4 text-black/55 transition ${previewOpen ? 'rotate-180' : ''}`}
              strokeWidth={2.5}
            />
          </button>

          {previewOpen && (
            <PreviewSection
              promo={promo}
              promoUrl={promoUrl}
              providerName={providerName}
              providerHandle={providerHandle}
              profileImageUrl={profileImageUrl ?? null}
              city={city ?? null}
              themeColor={themeColor}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Small action buttons
// ─────────────────────────────────────────────────────────────────────

function CopyLinkButton({ url, themeColor }: { url: string; themeColor: string }) {
  const [copied, setCopied] = useState(false)
  async function go() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard may be unavailable */ }
  }
  return (
    <button
      type="button"
      onClick={go}
      className="inline-flex items-center justify-center gap-2 rounded-xl text-white px-3 py-3 text-[13px] font-extrabold transition active:scale-[0.97] min-h-[48px] shadow-sm"
      style={{ background: themeColor }}
    >
      {copied ? <Check className="w-4 h-4" strokeWidth={3} /> : <Link2 className="w-4 h-4" strokeWidth={2.5} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

function SaveImageButton({ url, themeColor }: { url: string; themeColor: string }) {
  // Square crop default — best fit for Instagram feed + WhatsApp status.
  const cropped = useMemo(() => imagekitCrop(url, [1, 1], 1080), [url])
  return (
    <a
      href={cropped}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black border border-gray-200 px-3 py-3 text-[13px] font-extrabold transition active:scale-[0.97] min-h-[48px] hover:bg-gray-50 shadow-sm"
      style={{ borderColor: themeColor + '55' }}
    >
      <Download className="w-4 h-4" strokeWidth={2.5} style={{ color: themeColor }} />
      Save image
    </a>
  )
}

function CopyCaptionButton({ text, themeColor }: { text: string; themeColor: string }) {
  const [copied, setCopied] = useState(false)
  async function go() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard may be unavailable */ }
  }
  return (
    <button
      type="button"
      onClick={go}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black border border-gray-200 px-3 py-3 text-[13px] font-extrabold transition active:scale-[0.97] min-h-[48px] hover:bg-gray-50 shadow-sm"
      style={{ borderColor: themeColor + '55' }}
    >
      {copied ? <Check className="w-4 h-4" strokeWidth={3} style={{ color: themeColor }} /> : <Copy className="w-4 h-4" strokeWidth={2.5} style={{ color: themeColor }} />}
      {copied ? 'Copied!' : 'Copy caption'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Collapsible mockup preview — kept from the previous design but moved
// behind a disclosure so the share buttons take centre stage.
// ─────────────────────────────────────────────────────────────────────

function PreviewSection({
  promo, promoUrl, providerName, providerHandle, profileImageUrl, city, themeColor,
}: {
  promo:           SharePromo
  promoUrl:        string
  providerName:    string
  providerHandle:  string
  profileImageUrl: string | null
  city:            string | null
  themeColor:      string
}) {
  const [selected, setSelected] = useState<PlatformId>('instagram_feed')
  const [pickerOpen, setPickerOpen] = useState(false)
  const spec = PLATFORMS.find((p) => p.id === selected) ?? PLATFORMS[0]

  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3 space-y-3">
      {/* Platform picker — single dropdown button. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          className="w-full inline-flex items-center justify-between gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] font-extrabold text-black hover:border-gray-300 transition min-h-[44px]"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: themeColor }}>
              <PlatformIcon id={spec.id} />
            </span>
            <span className="truncate uppercase tracking-wider text-[12px]">{spec.label}</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-black/55 shrink-0 transition ${pickerOpen ? 'rotate-180' : ''}`}
            strokeWidth={2.5}
          />
        </button>

        {pickerOpen && (
          <>
            <div aria-hidden className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)} />
            <div
              role="listbox"
              className="absolute z-30 left-0 right-0 mt-1 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden grid grid-cols-2 gap-px bg-gray-200"
            >
              {PLATFORMS.map((p) => {
                const on = p.id === selected
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => { setSelected(p.id); setPickerOpen(false) }}
                    className={`inline-flex items-center gap-2 px-3 py-3 text-left transition min-h-[48px] ${
                      on ? 'text-white' : 'bg-white text-black/85 hover:bg-gray-50'
                    }`}
                    style={on ? { background: themeColor } : undefined}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      on ? 'bg-white/25 text-white' : 'bg-gray-100 text-black/65'
                    }`}>
                      <PlatformIcon id={p.id} />
                    </span>
                    <span className="text-[12px] font-extrabold uppercase tracking-wider truncate">{p.label}</span>
                    {on && <Check className="w-3.5 h-3.5 ml-auto shrink-0" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <PlatformMockup
        spec={spec}
        promo={promo}
        promoUrl={promoUrl}
        providerName={providerName}
        providerHandle={providerHandle}
        profileImageUrl={profileImageUrl}
        city={city}
        themeColor={themeColor}
      />
      <p className="text-[12px] text-black/55 leading-snug text-center">
        {spec.hint}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Per-platform mockup
// ─────────────────────────────────────────────────────────────────────

function PlatformMockup({
  spec, promo, promoUrl, providerName, providerHandle, profileImageUrl, city, themeColor,
}: {
  spec:            PlatformSpec
  promo:           SharePromo
  promoUrl:        string
  providerName:    string
  providerHandle:  string
  profileImageUrl: string | null
  city:            string | null
  themeColor:      string
}) {
  const photoCropped = useMemo(
    () => imagekitCrop(promo.photo_url, spec.ratio, spec.width),
    [promo.photo_url, spec.ratio, spec.width],
  )
  const captionText = captionForPlatform(promo, spec)
  const hashtags    = (promo.hashtags_by_platform ?? {})[spec.id.replace(/_(feed|story)$/, '')] ?? []

  switch (spec.id) {
    case 'instagram_feed':
      return <InstagramFeed photo={photoCropped} caption={captionText} hashtags={hashtags} handle={providerHandle} avatarUrl={profileImageUrl} />
    case 'instagram_story':
      return <InstagramStory photo={photoCropped} caption={captionText} themeColor={themeColor} />
    case 'tiktok':
      return <TikTok photo={photoCropped} caption={captionText} hashtags={hashtags} handle={providerHandle} themeColor={themeColor} />
    case 'facebook':
      return <FacebookCard photo={photoCropped} headline={promo.headline} providerName={providerName} url={promoUrl} avatarUrl={profileImageUrl} city={city} />
    case 'x':
      return <XPost photo={photoCropped} caption={captionText} hashtags={hashtags} handle={providerHandle} url={promoUrl} avatarUrl={profileImageUrl} />
    case 'snapchat':
      return <SnapchatStory photo={photoCropped} caption={captionText} themeColor={themeColor} />
    case 'whatsapp':
      return <WhatsAppPreview photo={photoCropped} headline={promo.headline} caption={captionText} url={promoUrl} providerName={providerName} avatarUrl={profileImageUrl} city={city} />
    default:
      return null
  }
}

function InstagramFeed({ photo, caption, hashtags, handle, avatarUrl }: { photo: string; caption: string; hashtags: string[]; handle: string; avatarUrl: string | null }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm max-w-[360px] mx-auto">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-yellow-400 p-[2px]">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover bg-white" />
          ) : (
            <div className="w-full h-full rounded-full bg-white" />
          )}
        </div>
        <span className="text-[13px] font-bold text-black">{handle}</span>
      </div>
      <img src={photo} alt="" className="w-full aspect-square object-cover bg-gray-100" />
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-3 text-black/85">
          <Heart className="w-5 h-5" strokeWidth={2.25} />
          <MessageCircle className="w-5 h-5" strokeWidth={2.25} />
          <Send className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <p className="text-[12px] text-black leading-snug">
          <span className="font-bold">{handle}</span>{' '}
          <span className="whitespace-pre-wrap">{caption}</span>
        </p>
        {hashtags.length > 0 && (
          <p className="text-[12px] text-sky-700 font-bold leading-snug">{hashtags.join(' ')}</p>
        )}
      </div>
    </div>
  )
}

function InstagramStory({ photo, caption, themeColor }: { photo: string; caption: string; themeColor: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-sm mx-auto bg-black"
      style={{ aspectRatio: '9 / 16', maxWidth: 220 }}
    >
      <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute top-2 left-2 right-2 h-1 bg-white/60 rounded-full" />
      <div className="absolute bottom-3 left-3 right-3 space-y-2">
        <div
          className="rounded-lg px-2.5 py-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold text-white shadow-md"
          style={{ background: themeColor, boxShadow: `0 4px 12px -2px ${themeColor}` }}
        >
          <Link2 className="w-3 h-3" strokeWidth={2.5} />
          Book now
        </div>
        <p className="text-[11px] text-white drop-shadow font-bold leading-snug line-clamp-3">
          {caption}
        </p>
      </div>
    </div>
  )
}

function TikTok({ photo, caption, hashtags, handle, themeColor }: { photo: string; caption: string; hashtags: string[]; handle: string; themeColor: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-sm mx-auto bg-black"
      style={{ aspectRatio: '9 / 16', maxWidth: 220 }}
    >
      <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 right-12 text-white drop-shadow">
        <div className="text-[11px] font-extrabold">@{handle}</div>
        <p className="text-[11px] mt-0.5 font-bold leading-snug line-clamp-2">{caption}</p>
        {hashtags.length > 0 && (
          <p className="text-[11px] mt-0.5 text-white/90 font-bold leading-snug line-clamp-1">{hashtags.join(' ')}</p>
        )}
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col items-center gap-2 text-white">
        <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center" style={{ outline: `1px solid ${themeColor}` }}>
          <Heart className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
          <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}

function FacebookCard({ photo, headline, providerName, url, avatarUrl, city }: { photo: string; headline: string; providerName: string; url: string; avatarUrl: string | null; city: string | null }) {
  const host = safeHost(url)
  const initial = providerName.trim()[0]?.toUpperCase() ?? '?'
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm max-w-[400px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-[15px] font-black shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-black leading-tight truncate">{providerName}</div>
          <div className="text-[11px] text-gray-500 leading-tight truncate">
            {city ? `${city} · ` : ''}<span aria-hidden>🌐</span> Public
          </div>
        </div>
      </div>
      <img src={photo} alt="" className="w-full aspect-[1.91/1] object-cover bg-gray-100" />
      <div className="px-3 py-3 space-y-1 bg-gray-50 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{host}</div>
        <div className="text-[13px] font-black text-black leading-snug line-clamp-2">{headline}</div>
      </div>
    </div>
  )
}

function XPost({ photo, caption, hashtags, handle, url, avatarUrl }: { photo: string; caption: string; hashtags: string[]; handle: string; url: string; avatarUrl: string | null }) {
  const tag = hashtags.slice(0, 2).join(' ')
  const text = `${caption}${tag ? ' ' + tag : ''}\n${url}`
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm max-w-[400px] mx-auto">
      <div className="flex items-start gap-2.5">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100 shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-extrabold text-black inline-flex items-center gap-1">
            {handle}
            <span className="text-[12px] text-gray-500 font-normal">@{handle}</span>
          </div>
          <p className="text-[13px] text-black leading-snug whitespace-pre-wrap break-words mt-0.5">{text}</p>
          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
            <img src={photo} alt="" className="w-full aspect-[1.91/1] object-cover bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SnapchatStory({ photo, caption, themeColor }: { photo: string; caption: string; themeColor: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-sm mx-auto"
      style={{ aspectRatio: '9 / 16', maxWidth: 220, background: '#FFFC00' }}
    >
      <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute bottom-12 left-3 right-3">
        <p className="bg-black/55 text-white text-[12px] font-bold rounded-md px-2 py-1 line-clamp-2 leading-snug">
          {caption}
        </p>
      </div>
      <div
        className="absolute bottom-3 left-3 right-3 rounded-full px-3 py-1.5 inline-flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-white shadow-md"
        style={{ background: themeColor, boxShadow: `0 4px 12px -2px ${themeColor}` }}
      >
        <Link2 className="w-3 h-3" strokeWidth={2.5} />
        SWIPE UP TO BOOK
      </div>
    </div>
  )
}

function WhatsAppPreview({
  photo, headline, caption, url, providerName, avatarUrl, city,
}: {
  photo:        string
  headline:     string
  caption:      string
  url:          string
  providerName: string
  avatarUrl:    string | null
  city:         string | null
}) {
  const host    = safeHost(url)
  const initial = providerName.trim()[0]?.toUpperCase() ?? '?'
  const WA_GREEN_BUBBLE = '#D9FDD3'
  const WA_GREEN_BRAND  = '#25D366'
  const WA_GREEN_DARK   = '#128C7E'

  return (
    <div className="mx-auto max-w-[320px]">
      <div className="flex items-center gap-2.5 px-1 mb-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100 shrink-0" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-black shrink-0"
            style={{ background: WA_GREEN_BRAND }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-black text-black leading-tight truncate">{providerName}</div>
          {city && (
            <div className="text-[11px] text-gray-500 leading-tight truncate">{city}</div>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl rounded-br-sm p-2 shadow-sm border"
        style={{ background: WA_GREEN_BUBBLE, borderColor: 'rgba(18,140,126,0.18)' }}
      >
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <img src={photo} alt="" className="w-full aspect-square object-cover bg-gray-100" />
          <div className="px-3 py-2">
            <div className="text-[13px] font-black text-black leading-snug line-clamp-2">{headline}</div>
            <div className="text-[11px] text-gray-500 leading-snug line-clamp-2 mt-0.5">{caption}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-1">{host}</div>
          </div>
        </div>

        <div
          className="mt-1.5 rounded-xl px-3 py-2 inline-flex items-center justify-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-white w-full shadow-sm"
          style={{ background: WA_GREEN_BRAND, boxShadow: `0 4px 10px -2px ${WA_GREEN_DARK}` }}
        >
          <Link2 className="w-3.5 h-3.5" strokeWidth={2.75} />
          Open link
        </div>
      </div>
    </div>
  )
}

// Small wrapper around the existing brand SVGs from VisitUsPanel.
function PlatformIcon({ id }: { id: PlatformId }) {
  switch (id) {
    case 'instagram_feed':
    case 'instagram_story': return <span className="inline-block w-3.5 h-3.5"><SocialInstagramIcon /></span>
    case 'tiktok':          return <span className="inline-block w-3.5 h-3.5"><SocialTikTokIcon />    </span>
    case 'facebook':        return <span className="inline-block w-3.5 h-3.5"><SocialFacebookIcon />  </span>
    case 'x':               return <span className="inline-block w-3.5 h-3.5"><SocialXIcon />        </span>
    case 'snapchat':        return <span className="inline-block w-3.5 h-3.5"><SocialSnapchatIcon /> </span>
    case 'whatsapp':        return <span className="inline-block w-3.5 h-3.5"><ChatWhatsAppIcon />   </span>
    default:                return null
  }
}

// Helpers

function captionForPlatform(promo: SharePromo, spec: PlatformSpec): string {
  const base = spec.useShort && promo.ai_caption_short
    ? promo.ai_caption_short
    : promo.ai_caption
  if (spec.captionMax > 0 && base.length > spec.captionMax) {
    return base.slice(0, spec.captionMax - 1).trimEnd() + '…'
  }
  return base
}

function safeHost(url: string): string {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return 'kita2u.com' }
}
