'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, Check, Palette, Image as ImageIcon, Type, Megaphone, MoreHorizontal, Zap, UserCircle2, Lock } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import ThemeColorPicker from '@/components/dashboard/ThemeColorPicker'
import DomainRequestModal from '@/components/dashboard/DomainRequestModal'
import AvatarFrame, { type AvatarFrameStyle } from '@/components/profile/AvatarFrame'
import {
  BANNER_LIBRARY,
  BEAUTICIAN_SERVICES_OFFERED,
  type BeauticianProvider,
  type BeauticianServiceOffered,
  type BeauticianServicePhoto,
  type BeauticianHeroText,
  type BeauticianHeroEffect,
} from '@/lib/beautician/types'

// WYSIWYG profile editor — beautician sees a live preview of their
// public profile hero/banner section and taps an Edit pencil to open
// a focused modal for that section. Modal changes auto-preview on the
// underlying hero before saving so they see the result first.
//
// This is V1: ONLY the banner / hero-text section is editable here.
// Services, theme, etc. continue to be edited from the main dashboard
// form until they're lifted into this WYSIWYG view in follow-ups.

const DEFAULT_THEME = '#FACC15'
const DEFAULT_HERO = {
  line1:   'Professional',
  line2:   'Beautician',
  tagline: 'Enhancing your natural beauty effortless',
}
const DEFAULT_HERO_IMAGE = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

type Extras = {
  cover_image_url?: string | null
  theme_color?:     string | null
  hero_text?:       BeauticianHeroText | null
  promo_text?:      string | null
  services_offered?: BeauticianServiceOffered[] | null
  service_photos?: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>> | null
  // mig 0140 — primary CTA button animation
  cta_button_effect?: 'none' | 'pulse' | 'glow' | 'shake' | null
  // mig 0141 — animated avatar ring style
  avatar_frame_style?: 'none' | 'gradient' | 'pulse' | 'rainbow' | null
  // Button text color (also drives hero icon strokes on the public page).
  // Hex #RRGGBB — defaults to white when null.
  button_text_color?: string | null
  // mig 0226 — Pro/Studio draft lock. is_draft hides the public profile
  // behind draft_password (the visitor sees a branded password prompt).
  // Plain-text password by design (casual share-with-photographer
  // feature, not auth — see task 10/12 brief).
  is_draft?:        boolean | null
  draft_password?:  string | null
}
type FullProvider = BeauticianProvider & Extras

export default function BeauticianEditPage() {
  const router = useRouter()
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) { router.replace('/login?next=/dashboard/beautician/edit'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json() as { provider: FullProvider | null }
        setProvider(j.provider)
      }
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void reload() }, [reload])

  // Persist a partial profile update + reflect in local state so the
  // live preview updates instantly without a full refetch.
  async function save(patch: Partial<FullProvider>) {
    const r = await fetch('/api/beautician/me/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.ok) { alert(j?.error || 'Could not save.'); return false }
    setProvider((prev) => prev ? { ...prev, ...patch } : prev)
    return true
  }

  // Local-state-only patch — used when a control already posted to its
  // own dedicated endpoint and just needs the live preview to refresh.
  function setLocal(patch: Partial<FullProvider>) {
    setProvider((prev) => prev ? { ...prev, ...patch } : prev)
  }

  if (loading) return <Shell><Loading /></Shell>
  // First-time visitor with a signed-in user but no provider row yet
  // skips the dead-end "Not a beautician yet" gate and lands directly
  // on the upload-profile form. See /dashboard/beautician/page.tsx for
  // the canonical comment.
  if (!provider) {
    if (typeof window !== 'undefined') {
      window.location.replace('/beautician/signup')
    }
    return <Shell><Loading /></Shell>
  }

  const theme = provider.theme_color || DEFAULT_THEME
  const ht = provider.hero_text || {}
  const line1   = ht.line1   ?? DEFAULT_HERO.line1
  const line2   = ht.line2   ?? DEFAULT_HERO.line2
  const tagline = ht.tagline ?? DEFAULT_HERO.tagline
  const line2Color   = ht.color         ?? theme
  const line1Color   = ht.line1_color   ?? '#000000'
  const taglineColor = ht.tagline_color ?? '#000000'
  const rawEffect = ht.effect ?? 'none'
  const effect: BeauticianHeroEffect = (['none','shimmer','dance','underline'].includes(rawEffect) ? rawEffect : 'none') as BeauticianHeroEffect
  const cover  = provider.cover_image_url || DEFAULT_HERO_IMAGE

  return (
    <Shell>
      <div className="max-w-2xl mx-auto pt-4 pb-32 px-4">
        {/* Brand header — pink-tinted strip with sparkle icon, matching the
            hub's polished feel. Auto-save badge lives on the right. */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Design Studio</h1>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-pink-600 bg-pink-100 border border-pink-200 rounded-full px-2 py-0.5">
                  Live
                </span>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Tune your public page in real time — theme, banner, text. Auto-saves as you type.
              </p>
            </div>
          </div>
        </div>

        {/* Live hero preview — wrapped in a relative container so the
            edit pencil floats over the top-right corner. */}
        <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
          {/* Cover */}
          <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '16 / 9', maxHeight: 220 }}>
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
            {/* Hero overlay text */}
            <div className={`absolute left-4 z-10 select-none leading-none cr-hero-${effect}`} style={{ top: 22 }}>
              <style>{`
                @keyframes cr-hero-dance {
                  0%,100% { transform: translate(0,0) rotate(0) }
                  20%     { transform: translate(-3px, 2px) rotate(-3deg) }
                  40%     { transform: translate(3px, -2px) rotate(2deg) }
                  60%     { transform: translate(-2px, -2px) rotate(-2deg) }
                  80%     { transform: translate(2px, 3px) rotate(3deg) }
                }
                @keyframes cr-hero-shimmer {
                  0%   { background-position: 200% center }
                  100% { background-position: -100% center }
                }
                @keyframes cr-hero-underline {
                  0%   { width: 0 }
                  35%  { width: 100% }
                  75%  { width: 100% }
                  100% { width: 0 }
                }
                .cr-hero-dance .cr-hero-word { animation: cr-hero-dance 1.4s ease-in-out infinite; transform-origin: center; display: inline-block; }
                .cr-hero-shimmer .cr-hero-word {
                  background-image: linear-gradient(95deg, ${line2Color} 0%, ${line2Color} 35%, #FFFFFF 50%, ${line2Color} 65%, ${line2Color} 100%);
                  background-size: 220% 100%;
                  -webkit-background-clip: text;
                  background-clip: text;
                  color: transparent !important;
                  animation: cr-hero-shimmer 3s linear infinite;
                }
                .cr-hero-underline .cr-hero-word { position: relative; }
                .cr-hero-underline .cr-hero-word::after {
                  content: '';
                  position: absolute;
                  left: 0; bottom: -3px;
                  height: 2.5px;
                  background: ${line2Color};
                  border-radius: 2px;
                  animation: cr-hero-underline 3.2s cubic-bezier(0.4,0,0.2,1) infinite;
                }
              `}</style>
              <div className="flex items-center gap-0.5 text-[22px] sm:text-[28px] font-normal drop-shadow-[0_2px_6px_rgba(255,255,255,0.55)]" style={{ color: line1Color }}>
                <span>{line1}</span>
                <Sparkles
                  className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 -mt-2"
                  strokeWidth={0}
                  fill={theme}
                  style={{ color: theme, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                />
              </div>
              <div className="text-[22px] sm:text-[28px] font-black mt-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] overflow-hidden">
                <span className="cr-hero-word inline-block" style={{ color: line2Color }}>
                  {line2}
                </span>
              </div>
              <div className="text-[11px] sm:text-[12px] font-medium mt-1 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] max-w-[200px] leading-snug" style={{ color: taglineColor }}>
                {tagline}
              </div>
            </div>
          </div>
        </div>

        {/* Inline banner controls — sit RIGHT under the preview so the
            beautician can see what they're editing without opening a
            modal. Auto-saves on change. */}
        <BannerInlineControls
          provider={provider}
          theme={theme}
          ht={ht}
          onSave={save}
          onSetLocal={setLocal}
        />

        <p className="text-[12px] text-black/55 mt-4 leading-snug">
          More inline-edit sections coming soon (services · hours). For now use the
          {' '}<Link href="/dashboard/beautician" className="text-pink-600 hover:underline font-bold">full dashboard form</Link>{' '}
          for the rest.
        </p>
      </div>
    </Shell>
  )
}

function BannerInlineControls({
  provider, theme, ht, onSave, onSetLocal,
}: {
  provider:   FullProvider
  theme:      string
  ht:         BeauticianHeroText
  onSave:     (patch: Partial<FullProvider>) => Promise<boolean> | boolean
  onSetLocal: (patch: Partial<FullProvider>) => void
}) {
  // Drafts live locally; debounced commits push to onSave so we don't
  // hit the API on every keystroke.
  const [draftLine1,        setDraftLine1]        = useState(ht.line1   ?? DEFAULT_HERO.line1)
  const [draftLine2,        setDraftLine2]        = useState(ht.line2   ?? DEFAULT_HERO.line2)
  const [draftTagline,      setDraftTagline]      = useState(ht.tagline ?? DEFAULT_HERO.tagline)
  const [draftColor,        setDraftColor]        = useState(ht.color   ?? theme)
  const [draftLine1Color,   setDraftLine1Color]   = useState(ht.line1_color   ?? '#000000')
  const [draftTaglineColor, setDraftTaglineColor] = useState(ht.tagline_color ?? '#000000')
  const [draftEffect,       setDraftEffect]       = useState<BeauticianHeroEffect>(((['none','shimmer','glow','underline'].includes(ht.effect ?? 'none')) ? (ht.effect ?? 'none') : 'none') as BeauticianHeroEffect)
  const [savedFlash,   setSavedFlash]   = useState(false)
  // "Follow theme" mode: true when the beautician hasn't explicitly
  // overridden the hero text color. In that mode, picking a new theme
  // color auto-recolors the Beautician word. The moment the beautician
  // picks a custom color from the swatches below, this flips to false
  // and the color stays put even if the theme changes.
  const [colorFollowsTheme, setColorFollowsTheme] = useState(!ht.color)
  const [domainModalOpen,   setDomainModalOpen]   = useState(false)

  // When in "follow theme" mode, sync draftColor to the current theme
  // whenever the theme changes upstream (theme picker above).
  useEffect(() => {
    if (colorFollowsTheme) setDraftColor(theme)
  }, [theme, colorFollowsTheme])

  // If the parent clears hero_text.color (e.g. the theme picker wiped
  // the override), flip back to follow-theme mode automatically.
  useEffect(() => {
    if (!ht.color) {
      setColorFollowsTheme(true)
      setDraftColor(theme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ht.color])

  // Auto-save on debounce — push the hero_text payload to the API
  // 500ms after the last change. When color follows the theme, we send
  // color:undefined so the DB stores no override and the public page
  // tracks future theme_color changes automatically.
  useEffect(() => {
    const t = setTimeout(async () => {
      const ok = await onSave({
        hero_text: {
          line1:         draftLine1.trim()   || undefined,
          line2:         draftLine2.trim()   || undefined,
          tagline:       draftTagline.trim() || undefined,
          color:         colorFollowsTheme ? undefined : draftColor,
          line1_color:   draftLine1Color,
          tagline_color: draftTaglineColor,
          effect:        draftEffect,
        } as BeauticianHeroText,
      })
      if (ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1200)
      }
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLine1, draftLine2, draftTagline, draftColor, draftLine1Color, draftTaglineColor, draftEffect, colorFollowsTheme])

  const EFFECTS: Array<{ id: BeauticianHeroEffect; label: string; desc: string }> = [
    { id: 'none',      label: 'None',          desc: 'Static text' },
    { id: 'shimmer',   label: 'Shimmer',       desc: 'Light sweeps across — luxe' },
    { id: 'dance',     label: 'Dancing text',  desc: 'Letters playfully wiggle' },
    { id: 'underline', label: 'Underline',     desc: 'Elegant accent line' },
  ]

  // mig 0140 — Animation applied to the primary public-profile CTA
  // (the Contact button under the portfolio). Saved immediately when
  // the beautician taps a card, no debounce.
  const CTA_EFFECTS: Array<{ id: 'none' | 'pulse' | 'glow' | 'shake'; label: string; desc: string }> = [
    { id: 'none',  label: 'None',  desc: 'Static' },
    { id: 'pulse', label: 'Pulse', desc: 'Gentle scale pulse' },
    { id: 'glow',  label: 'Glow',  desc: 'Glowing shadow' },
    { id: 'shake', label: 'Shake', desc: 'Subtle nudge' },
  ]

  // mig 0141 — Animated ring around the public-profile avatar. Pick-one
  // saved immediately; the rendering lives in
  // src/components/profile/AvatarFrame.tsx.
  const AVATAR_FRAMES: Array<{ id: 'none' | 'gradient' | 'pulse' | 'rainbow'; label: string; desc: string }> = [
    { id: 'none',     label: 'None',     desc: 'Plain ring' },
    { id: 'gradient', label: 'Gradient', desc: 'Instagram-style' },
    { id: 'pulse',    label: 'Pulse',    desc: 'Pulsing brand colour' },
    { id: 'rainbow',  label: 'Rainbow',  desc: 'Spinning conic gradient' },
  ]

  return (
    <div className="mt-4 space-y-4">
      {/* Auto-save badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-black">Edit banner</h2>
        <div className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider transition ${savedFlash ? 'text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5 opacity-100' : 'opacity-0'}`}>
          ✓ Saved
        </div>
      </div>

      {/* Theme color — drives the entire page's accent (buttons, badges,
          star ratings, "Beautician" overlay default, etc.). Lives FIRST
          so beauticians make the brand decision before fine-tuning.
          Picking a theme color ALSO clears any prior hero-text color
          override so the "Beautician" word follows the new theme. The
          user can lock a custom color below if they want it different. */}
      <Section title="Theme color" icon={<Palette size={16} strokeWidth={2.5} />}>
        <ThemeColorPicker
          value={provider.theme_color ?? null}
          onChange={(hex) => onSave({
            theme_color: hex,
            hero_text: {
              ...(provider.hero_text || {}),
              color: undefined,
            },
          })}
        />
      </Section>

      {/* Button text color — paired with theme so beauticians choose the
          contrasting label color right after the brand color. Same value
          also drives hero icon strokes on the public profile. Defaults to
          white when unset. Saves via a dedicated endpoint (the shared
          /profile endpoint doesn't accept this field). */}
      <Section title="Button text color" icon={<Type size={16} strokeWidth={2.5} />}>
        <ButtonTextColorPicker
          value={provider.button_text_color ?? null}
          themeColor={theme}
          onChange={async (hex) => {
            const r = await fetch('/api/beautician/me/button-text-color', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ button_text_color: hex }),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok || !j?.ok) {
              alert(j?.error || 'Could not save button text color.')
              return false
            }
            // Local-only state refresh — the dedicated endpoint already
            // persisted the change, so we just sync the live preview.
            onSetLocal({ button_text_color: hex })
            return true
          }}
        />
      </Section>

      {/* Banner image — library + upload */}
      <Section title="Banner image" icon={<ImageIcon size={16} strokeWidth={2.5} />}>
        <BannerLibraryPicker
          themeHex={provider.theme_color ?? null}
          selected={provider.cover_image_url ?? null}
          onChange={(url) => onSave({ cover_image_url: url })}
          userId={provider.user_id ?? null}
          library={BANNER_LIBRARY}
          categories={BEAUTICIAN_SERVICES_OFFERED.map((s) => ({ id: s.id, label: s.label }))}
          defaultThemeHex="#EC4899"
          purchaseEndpoint="/api/beautician/me/buy-banner"
          selectedAccentHex="#EC4899"
          userCategoryIds={provider.services_offered ?? undefined}
        />
      </Section>

      {/* Text inputs with per-line color picker */}
      <Section title="Banner text" icon={<Type size={16} strokeWidth={2.5} />}>
        <div className="space-y-3">
          <FieldWithColor
            label="Top line" max={30}
            value={draftLine1} onChange={setDraftLine1}
            placeholder="Professional"
            color={draftLine1Color} onColorChange={setDraftLine1Color}
          />
          <FieldWithColor
            label="Main word" max={30}
            value={draftLine2} onChange={setDraftLine2}
            placeholder="Beautician"
            color={draftColor}
            onColorChange={(hex) => { setColorFollowsTheme(false); setDraftColor(hex) }}
            colorNote={colorFollowsTheme
              ? <>Following theme <span className="font-mono">{theme}</span>. Pick a color to override.</>
              : <>Override locked. <button type="button" onClick={() => { setColorFollowsTheme(true); setDraftColor(theme) }} className="text-pink-600 underline font-bold">Reset to theme</button></>
            }
          />
          <FieldWithColor
            label="Tagline" max={80}
            value={draftTagline} onChange={setDraftTagline}
            placeholder="Enhancing your natural beauty…"
            color={draftTaglineColor} onColorChange={setDraftTaglineColor}
          />
        </div>
      </Section>


      {/* Effect */}
      <Section title="Text effect (Beautician word)" icon={<Sparkles size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {EFFECTS.map((ef) => {
            const on = draftEffect === ef.id
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => setDraftEffect(ef.id)}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-pink-500 text-white border-pink-500 shadow-[0_2px_10px_rgba(236,72,153,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-[13px] font-extrabold">{ef.label}</div>
                <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{ef.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* CTA button effect — animation for the primary Contact button on
          the public profile (mig 0140). Same pick-one UX as the text
          effect section above. Saves immediately on tap. */}
      <Section title="CTA button effect" icon={<Zap size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {CTA_EFFECTS.map((ef) => {
            const current = (provider.cta_button_effect ?? 'none') as 'none' | 'pulse' | 'glow' | 'shake'
            const on = current === ef.id
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => onSave({ cta_button_effect: ef.id })}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-pink-500 text-white border-pink-500 shadow-[0_2px_10px_rgba(236,72,153,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-[13px] font-extrabold">{ef.label}</div>
                <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{ef.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Avatar frame — animated ring around the public-profile avatar
          (mig 0141). Same pick-one UX as the text + CTA effect sections.
          Each tile shows a tiny preview of the ring style so the
          beautician can see the effect without leaving the dashboard. */}
      <Section title="Avatar frame" icon={<UserCircle2 size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {AVATAR_FRAMES.map((af) => {
            const current = (provider.avatar_frame_style ?? 'none') as 'none' | 'gradient' | 'pulse' | 'rainbow'
            const on = current === af.id
            return (
              <button
                key={af.id}
                type="button"
                onClick={() => onSave({ avatar_frame_style: af.id })}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] flex items-center gap-3 ${
                  on ? 'bg-pink-500 text-white border-pink-500 shadow-[0_2px_10px_rgba(236,72,153,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <AvatarFramePreview style={af.id} themeColor={theme} />
                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold truncate">{af.label}</div>
                  <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'} truncate`}>{af.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Running marquee text — the pink ribbon that scrolls under the
          portfolio carousel on the public profile. Max 500 chars. */}
      <Section title="Running text (marquee under portfolio)" icon={<Megaphone size={16} strokeWidth={2.5} />}>
        <PromoTextEditor
          value={provider.promo_text ?? ''}
          onChange={(v) => onSave({ promo_text: v || null })}
          themeColor={theme}
        />
      </Section>

      {/* mig 0226 — Draft mode (Pro/Studio share-with-team moat). Toggle
          hides the public profile behind a password the beautician
          shares with their photographer / team. NOT a subscription
          paywall — that's `subscription_status`. Sits near the bottom
          so casual editors never trip into it. */}
      <Section title="Draft mode" icon={<Lock size={16} strokeWidth={2.5} />}>
        <DraftModeControls
          isDraft={Boolean(provider.is_draft)}
          currentPassword={provider.draft_password ?? ''}
          onSave={onSave}
        />
      </Section>

      {/* Quick links — services manager (carousel) and public preview. */}
      <Section title="More" icon={<MoreHorizontal size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/beautician/services"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 text-black px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-gray-100 hover:border-pink-300 transition min-h-[44px]"
          >
            Services (carousel)
          </Link>
          <a
            href={`/beautician/${provider.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 text-black px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-gray-100 hover:border-pink-300 transition min-h-[44px]"
          >
            View live profile →
          </a>
        </div>
      </Section>

      {/* Explicit Save button — auto-save runs in the background but this
          gives beauticians a clear "I'm done" confirmation. Clicking
          flushes the pending hero_text payload immediately. */}
      <button
        type="button"
        onClick={async () => {
          const ok = await onSave({
            hero_text: {
              line1:         draftLine1.trim()   || undefined,
              line2:         draftLine2.trim()   || undefined,
              tagline:       draftTagline.trim() || undefined,
              color:         colorFollowsTheme ? undefined : draftColor,
              line1_color:   draftLine1Color,
              tagline_color: draftTaglineColor,
              effect:        draftEffect,
            } as BeauticianHeroText,
          })
          if (ok) {
            setSavedFlash(true)
            setTimeout(() => setSavedFlash(false), 1500)
          }
        }}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-white font-extrabold text-[14px] shadow-md active:scale-[0.98] transition"
        style={{ background: draftColor }}
      >
        Save changes
      </button>
      <p className="text-[12px] text-black/55 text-center mt-1 leading-snug">
        Auto-save also runs in the background — your changes are saved as you type.
      </p>
    </div>
  )
}

// mig 0226 — Draft-lock control. Local toggle + password field, posts
// to /api/beautician/me/profile when the beautician taps Save. We don't
// auto-save here (unlike hero text) because flipping draft mode is
// deliberate and the user wants explicit feedback.
function DraftModeControls({
  isDraft, currentPassword, onSave,
}: {
  isDraft:         boolean
  currentPassword: string
  onSave:          (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  const [draftOn,  setDraftOn]  = useState(isDraft)
  const [password, setPassword] = useState(currentPassword)
  const [saving,   setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Keep local state in sync if the parent reloads.
  useEffect(() => { setDraftOn(isDraft) }, [isDraft])
  useEffect(() => { setPassword(currentPassword) }, [currentPassword])

  const dirty =
    draftOn !== isDraft ||
    (draftOn && password.trim() !== currentPassword.trim())

  async function commit() {
    setError(null)
    if (draftOn && !password.trim()) {
      setError('Password is required when draft mode is on.')
      return
    }
    setSaving(true)
    try {
      const ok = await onSave({
        is_draft:       draftOn,
        // Send null on draft-off so the column is cleared; otherwise the
        // new trimmed password (or unchanged if user didn't touch it).
        draft_password: draftOn ? password.trim() : null,
      })
      if (ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      } else {
        setError('Could not save. Try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-black/65 leading-snug">
        Useful for sharing a work-in-progress version with photographers or your team.
        The marketplace will still show your profile UNLESS your subscription_status is{' '}
        <code className="text-[11px] font-mono bg-gray-100 rounded px-1 py-0.5">inactive</code>{' '}
        — draft is for sharing, not hiding.
      </p>

      {/* Toggle row */}
      <label className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-200 p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={draftOn}
          onChange={(e) => setDraftOn(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-pink-600 shrink-0"
        />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-extrabold text-black leading-snug">
            Hide my profile behind a password (draft)
          </span>
          <span className="block text-[12px] text-black/55 leading-snug mt-0.5">
            Visitors see a password prompt instead of your profile until they enter the password below.
          </span>
        </span>
      </label>

      {/* Password input — only visible when toggle is on */}
      {draftOn && (
        <div className="space-y-1.5">
          <label className="block text-[12px] font-extrabold uppercase tracking-wider text-black/70">
            Draft password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null) }}
            maxLength={200}
            placeholder="e.g. preview123"
            className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          />
          <p className="text-[11px] text-black/45 leading-snug">
            Stored as plain text — this is a casual review password, not auth. Share it via WhatsApp or email.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] font-bold text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void commit()}
          disabled={!dirty || saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-black text-white px-4 py-2.5 text-[13px] font-extrabold disabled:opacity-50 active:scale-[0.98] transition min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save draft mode'}
        </button>
        {savedFlash && (
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  )
}

function PromoTextEditor({
  value, onChange, themeColor,
}: {
  value: string
  onChange: (next: string) => void
  themeColor: string
}) {
  const [draft, setDraft] = useState(value)
  // Debounced commit — same pattern as the hero-text section above.
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== value) onChange(draft.trim().slice(0, 500))
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const display = (draft.trim() || 'Message me this week — exclusive promo on professional beauty service delivered straight to your home, hotel or villa, in the comfort of your stay.') + ' ✦'

  return (
    <div className="space-y-2">
      {/* Live preview of the marquee ribbon */}
      <div className="overflow-hidden py-1.5 rounded-full" style={{ background: '#FDF2F8' }}>
        <style>{`@keyframes cr-preview-marq { from { transform: translateX(0%); } to { transform: translateX(-50%); } }`}</style>
        <div className="flex whitespace-nowrap" style={{ animation: 'cr-preview-marq 28s linear infinite' }}>
          {[0, 1].map((k) => (
            <span
              key={k}
              aria-hidden={k === 1 ? true : undefined}
              className="px-8 text-[11px] font-extrabold tracking-wide"
              style={{ color: themeColor }}
            >
              {display}
            </span>
          ))}
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Write your promo message — appears as scrolling text below your portfolio."
        className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 resize-none leading-snug"
      />
      <p className="text-[12px] text-black/60 leading-snug">
        Use this for special offers — weddings, birthdays, graduations,
        or seasonal discounts. Tap a suggestion to drop it in.
      </p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {[
          'Bridal package — book early for wedding season discount',
          'Birthday glam? Group of 3+ gets 10% off',
          'Graduation makeup specials this month',
          'Free brow shaping with any makeup booking this week',
          'Hotel + villa mobile service — Yogya area',
        ].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setDraft(s)}
            className="text-[12px] text-black/80 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 transition active:scale-[0.97]"
          >
            {s.length > 36 ? s.slice(0, 34) + '…' : s}
          </button>
        ))}
      </div>
      <div className={`text-[12px] tabular-nums text-right ${draft.length >= 450 ? 'text-amber-600' : 'text-black/45'}`}>
        {draft.length} / 500
      </div>
    </div>
  )
}

// Small inline preview of an avatar frame for the pick-one tiles. Uses
// the same AvatarFrame renderer the public profile uses, so what the
// beautician sees in the dashboard matches the live result exactly.
function AvatarFramePreview({ style, themeColor }: { style: AvatarFrameStyle; themeColor: string }) {
  return (
    <div className="shrink-0">
      <AvatarFrame
        src={null}
        alt=""
        size={32}
        style={style}
        themeColor={themeColor}
        fallbackInitial="A"
      />
    </div>
  )
}

// Button text color picker — preset swatches sized for the most common
// brand-theme pairings (white on dark, dark hexes for cream / amber /
// orange / pink themes) plus an optional custom hex field. The live
// preview chip renders a mock CTA button using the current theme as the
// background so the beautician sees the contrast they'll ship.
//
// Defaults: when value is null the white preset is highlighted (matches
// the DB column default '#FFFFFF').
function ButtonTextColorPicker({
  value, themeColor, onChange,
}: {
  value:      string | null
  themeColor: string
  onChange:   (hex: string) => void | Promise<unknown>
}) {
  const PRESETS: Array<{ hex: string; label: string }> = [
    { hex: '#FFFFFF', label: 'White'         },
    { hex: '#0A0A0A', label: 'Black'         },
    { hex: '#5C3317', label: 'Chocolate'     },
    { hex: '#854D0E', label: 'Amber dark'    },
    { hex: '#7C2D12', label: 'Rust'          },
    { hex: '#831843', label: 'Rose dark'     },
  ]
  const HEX_RE = /^#[A-Fa-f0-9]{6}$/
  // Empty value (or unset) falls back to white per backend default.
  const active = (value ?? '#FFFFFF').toUpperCase()
  const [customDraft, setCustomDraft] = useState<string>('')
  const [customError, setCustomError] = useState<string | null>(null)

  function applyCustom() {
    const v = customDraft.trim()
    if (!v) { setCustomError(null); return }
    const normalised = v.startsWith('#') ? v : '#' + v
    if (!HEX_RE.test(normalised)) {
      setCustomError('Use #RRGGBB format, e.g. #5C3317')
      return
    }
    setCustomError(null)
    void onChange(normalised.toUpperCase())
    setCustomDraft('')
  }

  return (
    <div className="space-y-3">
      {/* Live preview — mock "Contact me" pill rendered with the current
          theme color background and the chosen text color, plus a hero
          sparkle icon stroked with the same color so the user sees both
          uses at a glance. */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center gap-3">
        <div
          className="inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-extrabold shadow-sm"
          style={{ background: themeColor, color: active }}
        >
          Contact me
        </div>
        <Sparkles
          className="w-7 h-7 shrink-0"
          strokeWidth={2}
          style={{ color: active, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
        />
        <span className="text-[12px] font-mono text-black/55 ml-auto">{active}</span>
      </div>

      {/* Preset swatches — labelled so the beautician knows what each
          preset is tuned for (cream theme → chocolate text, etc.) */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const on = active === p.hex.toUpperCase()
          // White swatch needs a visible border so it doesn't disappear
          // against the white card.
          const isWhite = p.hex.toUpperCase() === '#FFFFFF'
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => void onChange(p.hex)}
              aria-label={`${p.label} (${p.hex})`}
              aria-pressed={on}
              title={`${p.label} — ${p.hex}`}
              className={`relative w-11 h-11 rounded-full transition active:scale-[0.95] ${on ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-900' : 'ring-1 ring-gray-200'}`}
              style={{
                background: p.hex,
                border: isWhite ? '1px solid rgba(0,0,0,0.12)' : undefined,
              }}
            >
              {on && (
                <Check
                  className="absolute inset-0 m-auto w-4 h-4"
                  strokeWidth={3}
                  style={{ color: isWhite ? '#0A0A0A' : '#FFFFFF' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Optional custom hex input — kept compact so it doesn't dominate
          the section. Accepts with or without leading #. */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={7}
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCustom() } }}
          placeholder="#RRGGBB"
          aria-label="Custom hex color"
          className="w-32 rounded-xl bg-white border border-gray-200 px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        />
        <button
          type="button"
          onClick={applyCustom}
          className="inline-flex items-center gap-1 h-[38px] px-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-900 text-[12px] font-extrabold hover:bg-gray-200 active:scale-[0.97] transition"
        >
          Apply
        </button>
        {customError && (
          <span className="text-[11px] text-red-600 font-bold leading-snug">{customError}</span>
        )}
      </div>

      <p className="text-[12px] text-black/55 leading-snug">
        Used for button text and hero icon strokes on your public page.
      </p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}

function FieldWithColor({
  label, value, onChange, placeholder, max,
  color, onColorChange, colorNote,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  max: number
  color: string
  onColorChange: (hex: string) => void
  colorNote?: React.ReactNode
}) {
  const PRESET = [
    '#000000', '#FFFFFF', '#374151',
    '#EC4899', '#F472B6', '#DB2777',
    '#F97316', '#FACC15', '#10B981',
    '#0EA5E9', '#9333EA', '#B91C1C',
  ]
  return (
    <div className="space-y-2 rounded-xl bg-gray-50 border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-extrabold uppercase tracking-wider text-black">{label}</span>
        <span className={`text-[12px] tabular-nums ${value.length >= max - 5 ? 'text-amber-600' : 'text-black/45'}`}>
          {value.length} / {max}
        </span>
      </div>
      <input
        type="text"
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          // Keep the text visible but select all of it so the user
          // can immediately type to replace, OR click again to
          // deselect and edit a few characters in place. Same pattern
          // as iOS Notes / desktop browser URL bar.
          e.currentTarget.select()
        }}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[14px] font-bold placeholder:text-black/35 placeholder:font-normal focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        // textShadow keeps the colored preview readable when the chosen
        // color is too light against the white input background.
        style={{ color, textShadow: '0 0 1px rgba(0,0,0,0.15)' }}
      />
      {/* Per-line color picker — preset swatches + custom hex input */}
      <div className="flex items-center flex-wrap gap-1.5 pt-1">
        {PRESET.map((hex) => {
          const on = color.toUpperCase() === hex.toUpperCase()
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onColorChange(hex)}
              aria-label={hex}
              className={`relative w-8 h-8 rounded-full transition active:scale-95 ${on ? 'ring-2 ring-offset-2 ring-offset-gray-50 ring-gray-900' : 'ring-1 ring-gray-200'}`}
              style={{ background: hex }}
            >
              {on && <Check className="absolute inset-0 m-auto w-3.5 h-3.5" style={{ color: hex === '#FFFFFF' || hex === '#FACC15' ? '#0A0A0A' : '#FFFFFF' }} strokeWidth={3} />}
            </button>
          )
        })}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value.toUpperCase())}
          aria-label="Custom color"
          className="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-200"
        />
        <span className="text-[12px] font-mono text-black/55">{color}</span>
      </div>
      {colorNote && <p className="text-[12px] text-black/55 leading-snug">{colorNote}</p>}
    </div>
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
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
}
