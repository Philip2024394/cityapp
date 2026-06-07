'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, Check, Palette, Image as ImageIcon, Type, Megaphone, MoreHorizontal, Wallet, Tag } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import ThemeColorPicker from '@/components/dashboard/ThemeColorPicker'
import DomainRequestModal from '@/components/dashboard/DomainRequestModal'

// WYSIWYG profile editor — place owner sees a live preview of their
// public listing hero/banner section. Same studio surface as the
// beautician edit page; the underlying data source/table is `places`
// instead of `beautician_providers`.

const DEFAULT_THEME = '#FACC15'
const DEFAULT_HERO = {
  line1:   'Welcome to',
  line2:   'Our Place',
  tagline: 'A taste of Indonesia, made for you',
}
const DEFAULT_HERO_IMAGE = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

// Places banner library — curated banners live in @/lib/places/banners
// keyed by theme hex → cuisine id. Picker shows the category header for
// any cuisine bucket that has at least one banner; empty buckets are
// hidden by the picker automatically.
import {
  PLACES_BANNER_LIBRARY,
  PLACES_BANNER_CATEGORIES,
} from '@/lib/places/banners'

type PlaceHeroEffect = 'none' | 'shimmer' | 'dance' | 'underline'
type PlaceHeroText = {
  line1?:         string
  line2?:         string
  tagline?:       string
  color?:         string
  line1_color?:   string
  tagline_color?: string
  effect?:        PlaceHeroEffect
}

type PlaceServicePhoto = {
  url:          string
  name?:        string
  description?: string
  price_idr?:   number | null
}

type PlaceCategory = 'restaurant' | 'cafe' | 'bar' | 'club'

// Local catalog — places only support the 4 food/drink categories on the
// dashboard editor (parity with the beautician services-offered shape).
const PLACE_CATEGORIES: Array<{ id: PlaceCategory; label: string }> = [
  { id: 'restaurant', label: 'Resto' },
  { id: 'cafe',       label: 'Kafe'  },
  { id: 'bar',        label: 'Bar'   },
  { id: 'club',       label: 'Klub'  },
]

type PriceTier = 'budget' | 'mid' | 'upscale'

// Local "FullProvider" shape — limited to columns we actually write
// through the /api/places/me/profile endpoint.
type PlaceFullProvider = {
  id:               string
  user_id:          string | null  // alias for owner_user_id, used by uploader scoping
  slug:             string
  name:             string
  business_name?:   string | null
  bio?:             string | null
  description?:     string | null
  category?:        PlaceCategory | null
  cuisine_types?:   string[] | null
  hours_json?:      Record<string, string> | null
  image_urls?:      string[] | null
  cover_image_url?: string | null
  profile_image_url?: string | null
  theme_color?:     string | null
  hero_text?:       PlaceHeroText | null
  promo_text?:      string | null
  service_photos?:  Record<string, PlaceServicePhoto[]> | null
  instagram_url?:   string | null
  tiktok_url?:      string | null
  facebook_url?:    string | null
  languages?:       string[] | null
  dietary_tags?:    string[] | null
  price_tier?:      PriceTier | null
  tags?:            string[] | null
  free_delivery?:   boolean | null
}

export default function PlacesEditPage() {
  const router = useRouter()
  const [provider, setProvider] = useState<PlaceFullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) { router.replace('/login?next=/dashboard/places/edit'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/places/me', { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json() as { provider: (PlaceFullProvider & { owner_user_id?: string | null }) | null }
        // Normalise — API returns the raw row with owner_user_id, but the
        // upload-scoped components read `user_id` (beautician convention).
        const p = j.provider
        setProvider(p ? { ...p, user_id: p.user_id ?? p.owner_user_id ?? null } : null)
      }
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void reload() }, [reload])

  // Persist a partial profile update + reflect in local state so the
  // live preview updates instantly without a full refetch.
  async function save(patch: Partial<PlaceFullProvider>) {
    const r = await fetch('/api/places/me/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.ok) { alert(j?.error || 'Could not save.'); return false }
    setProvider((prev) => prev ? { ...prev, ...patch } : prev)
    return true
  }

  if (loading) return <Shell><Loading /></Shell>
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center text-black">
          <h1 className="text-[20px] font-black mb-2">No place listed yet</h1>
          <Link href="/places/submit" className="rounded-full bg-emerald-500 text-white px-6 py-3 text-[13px] font-extrabold inline-block">List your place</Link>
        </div>
      </Shell>
    )
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
  const effect: PlaceHeroEffect = (['none','shimmer','dance','underline'].includes(rawEffect) ? rawEffect : 'none') as PlaceHeroEffect
  const cover  = provider.cover_image_url || DEFAULT_HERO_IMAGE

  return (
    <Shell>
      <div className="max-w-2xl mx-auto pt-4 pb-32 px-4">
        {/* Brand header — emerald-tinted strip with sparkle icon, matching
            the hub's polished feel. */}
        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Design Studio</h1>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                  Live
                </span>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Tune your place page in real time — theme, banner, text. Auto-saves as you type.
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
            owner can see what they're editing without opening a modal.
            Auto-saves on change. */}
        <BannerInlineControls
          provider={provider}
          theme={theme}
          ht={ht}
          onSave={save}
        />

        <p className="text-[12px] text-black/55 mt-4 leading-snug">
          More inline-edit sections coming soon (menu · theme · hours). For now use the
          {' '}<Link href="/dashboard/places" className="text-emerald-600 hover:underline font-bold">full dashboard form</Link>{' '}
          for the rest.
        </p>
      </div>
    </Shell>
  )
}

function BannerInlineControls({
  provider, theme, ht, onSave,
}: {
  provider: PlaceFullProvider
  theme:    string
  ht:       PlaceHeroText
  onSave:   (patch: Partial<PlaceFullProvider>) => Promise<boolean> | boolean
}) {
  // Drafts live locally; debounced commits push to onSave so we don't
  // hit the API on every keystroke.
  const [draftLine1,        setDraftLine1]        = useState(ht.line1   ?? DEFAULT_HERO.line1)
  const [draftLine2,        setDraftLine2]        = useState(ht.line2   ?? DEFAULT_HERO.line2)
  const [draftTagline,      setDraftTagline]      = useState(ht.tagline ?? DEFAULT_HERO.tagline)
  const [draftColor,        setDraftColor]        = useState(ht.color   ?? theme)
  const [draftLine1Color,   setDraftLine1Color]   = useState(ht.line1_color   ?? '#000000')
  const [draftTaglineColor, setDraftTaglineColor] = useState(ht.tagline_color ?? '#000000')
  const [draftEffect,       setDraftEffect]       = useState<PlaceHeroEffect>(((['none','shimmer','glow','underline'].includes(ht.effect ?? 'none')) ? (ht.effect ?? 'none') : 'none') as PlaceHeroEffect)
  const [savedFlash,   setSavedFlash]   = useState(false)
  // "Follow theme" mode: true when the owner hasn't explicitly
  // overridden the hero text color. In that mode, picking a new theme
  // color auto-recolors the main word. The moment the owner picks a
  // custom color from the swatches below, this flips to false and the
  // color stays put even if the theme changes.
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
        } as PlaceHeroText,
      })
      if (ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1200)
      }
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLine1, draftLine2, draftTagline, draftColor, draftLine1Color, draftTaglineColor, draftEffect, colorFollowsTheme])

  const EFFECTS: Array<{ id: PlaceHeroEffect; label: string; desc: string }> = [
    { id: 'none',      label: 'None',          desc: 'Static text' },
    { id: 'shimmer',   label: 'Shimmer',       desc: 'Light sweeps across — luxe' },
    { id: 'dance',     label: 'Dancing text',  desc: 'Letters playfully wiggle' },
    { id: 'underline', label: 'Underline',     desc: 'Elegant accent line' },
  ]

  const currentCategory: PlaceCategory | null = provider.category ?? null
  const currentTier: PriceTier | null = provider.price_tier ?? null
  const freeDelivery = !!provider.free_delivery

  const PRICE_TIERS: Array<{ id: PriceTier; symbol: string; label: string }> = [
    { id: 'budget',  symbol: '$',   label: 'Budget'  },
    { id: 'mid',     symbol: '$$',  label: 'Mid'     },
    { id: 'upscale', symbol: '$$$', label: 'Upscale' },
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
          star ratings, hero overlay default, etc.). Lives FIRST so
          owners make the brand decision before fine-tuning. Picking a
          theme color ALSO clears any prior hero-text color override so
          the main word follows the new theme. The user can lock a
          custom color below if they want it different. */}
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

      {/* Category — places only support one (restaurant/cafe/bar/club).
          Mirrors the beautician services-offered chips, single-select. */}
      <Section title="Category" icon={<Tag size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {PLACE_CATEGORIES.map((cat) => {
            const on = currentCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSave({ category: cat.id })}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-[13px] font-extrabold">{cat.label}</div>
                <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{cat.id}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Banner image — library + upload */}
      <Section title="Banner image" icon={<ImageIcon size={16} strokeWidth={2.5} />}>
        <BannerLibraryPicker
          themeHex={provider.theme_color ?? null}
          selected={provider.cover_image_url ?? null}
          onChange={(url) => onSave({ cover_image_url: url })}
          userId={provider.user_id ?? null}
          library={PLACES_BANNER_LIBRARY}
          categories={PLACES_BANNER_CATEGORIES}
          defaultThemeHex="#10B981"
          selectedAccentHex="#10B981"
        />
      </Section>

      {/* Text inputs with per-line color picker */}
      <Section title="Banner text" icon={<Type size={16} strokeWidth={2.5} />}>
        <div className="space-y-3">
          <FieldWithColor
            label="Top line" max={30}
            value={draftLine1} onChange={setDraftLine1}
            placeholder="Welcome to"
            color={draftLine1Color} onColorChange={setDraftLine1Color}
          />
          <FieldWithColor
            label="Main word" max={30}
            value={draftLine2} onChange={setDraftLine2}
            placeholder="Our Place"
            color={draftColor}
            onColorChange={(hex) => { setColorFollowsTheme(false); setDraftColor(hex) }}
            colorNote={colorFollowsTheme
              ? <>Following theme <span className="font-mono">{theme}</span>. Pick a color to override.</>
              : <>Override locked. <button type="button" onClick={() => { setColorFollowsTheme(true); setDraftColor(theme) }} className="text-emerald-600 underline font-bold">Reset to theme</button></>
            }
          />
          <FieldWithColor
            label="Tagline" max={80}
            value={draftTagline} onChange={setDraftTagline}
            placeholder="A taste of Indonesia, made for you…"
            color={draftTaglineColor} onColorChange={setDraftTaglineColor}
          />
        </div>
      </Section>


      {/* Effect */}
      <Section title="Text effect (main word)" icon={<Sparkles size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {EFFECTS.map((ef) => {
            const on = draftEffect === ef.id
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => setDraftEffect(ef.id)}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-[13px] font-extrabold">{ef.label}</div>
                <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{ef.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Pricing — places have no per-service price. Owner picks a
          $/$$/$$$ marketing pill + toggles whether the venue offers
          free in-house delivery. Mirrors the beautician pricing block. */}
      <Section title="Pricing" icon={<Wallet size={16} strokeWidth={2.5} />}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {PRICE_TIERS.map((tier) => {
              const on = currentTier === tier.id
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onSave({ price_tier: on ? null : tier.id })}
                  className={`text-center rounded-xl p-3 border transition active:scale-[0.98] ${
                    on ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-[15px] font-black tabular-nums">{tier.symbol}</div>
                  <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{tier.label}</div>
                </button>
              )
            })}
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-200 p-3 cursor-pointer">
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-black">Free delivery by venue</div>
              <div className="text-[12px] text-black/55 leading-snug">When on, the cart sheet hides the bike-rider estimate row.</div>
            </div>
            <input
              type="checkbox"
              checked={freeDelivery}
              onChange={(e) => onSave({ free_delivery: e.target.checked })}
              className="w-5 h-5 accent-emerald-500"
            />
          </label>
        </div>
      </Section>

      {/* Running marquee text — the pink ribbon that scrolls under the
          gallery on the public profile. Max 280 chars on places. */}
      <Section title="Running text (marquee under gallery)" icon={<Megaphone size={16} strokeWidth={2.5} />}>
        <PromoTextEditor
          value={provider.promo_text ?? ''}
          onChange={(v) => onSave({ promo_text: v || null })}
          themeColor={theme}
        />
      </Section>

      {/* Quick links — full dashboard and public preview. */}
      <Section title="More" icon={<MoreHorizontal size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/places"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 text-black px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-gray-100 hover:border-emerald-300 transition min-h-[44px]"
          >
            Full dashboard
          </Link>
          <a
            href={`/places/${provider.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 text-black px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-gray-100 hover:border-emerald-300 transition min-h-[44px]"
          >
            View live profile →
          </a>
        </div>
      </Section>

      {/* Explicit Save button — auto-save runs in the background but this
          gives owners a clear "I'm done" confirmation. Clicking flushes
          the pending hero_text payload immediately. */}
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
            } as PlaceHeroText,
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
      if (draft !== value) onChange(draft.trim().slice(0, 280))
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const display = (draft.trim() || 'Drop in this week — special menu, fresh chef pick, served straight to your table in the comfort of your stay.') + ' ✦'

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
        maxLength={280}
        rows={3}
        placeholder="Write your promo message — appears as scrolling text below your gallery."
        className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none leading-snug"
      />
      <p className="text-[12px] text-black/60 leading-snug">
        Use this for daily specials, happy hour, live music nights, or
        seasonal events. Tap a suggestion to drop it in.
      </p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {[
          'Happy hour 5–7 — half-price cocktails',
          'Live acoustic Friday night — no cover',
          'Chef\'s special: fresh seafood today',
          'Free es teh with every nasi goreng this week',
          'Open-air rooftop — book your table now',
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
      <div className={`text-[12px] tabular-nums text-right ${draft.length >= 250 ? 'text-amber-600' : 'text-black/45'}`}>
        {draft.length} / 280
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
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
          e.currentTarget.select()
        }}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[14px] font-bold placeholder:text-black/35 placeholder:font-normal focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
}
