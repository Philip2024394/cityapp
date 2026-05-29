'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Check } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import ThemeColorPicker from '@/components/dashboard/ThemeColorPicker'
import BeauticianServicePhotosEditor from '@/components/dashboard/BeauticianServicePhotosEditor'
import {
  PROPERTY_BANNER_LIBRARY,
  PROPERTY_BANNER_CATEGORIES,
} from '@/lib/property/banners'
import {
  PROPERTY_TYPE_OPTIONS,
  CERTIFICATE_OPTIONS,
  FURNISHED_OPTIONS,
  WATER_SOURCE_OPTIONS,
  FLOOD_ZONE_OPTIONS,
  PROPERTY_DEFAULT_THEME,
  PROPERTY_DEFAULT_HERO,
  PROPERTY_DEFAULT_HERO_IMAGE,
  VARIANT_LABELS,
  type PropertyVariant,
  type PropertyTypeId,
} from '@/lib/property/variants'
import type {
  BeauticianHeroText,
  BeauticianHeroEffect,
  BeauticianServiceOffered,
  BeauticianServicePhoto,
} from '@/lib/beautician/types'

// WYSIWYG property editor — byte-for-byte clone of the beautician edit
// page (src/app/dashboard/beautician/edit/page.tsx) adapted to the
// property_listings table with a fixed listing_type discriminator per
// variant (property-sale / property-rent / property-builder).

type Extras = {
  cover_image_url?: string | null
  theme_color?:     string | null
  hero_text?:       BeauticianHeroText | null
  promo_text?:      string | null
  property_type?:   PropertyTypeId | null
  service_photos?:  Partial<Record<string, BeauticianServicePhoto[]>> | null
  // Property Details
  bedrooms?:          number | null
  bathrooms?:         number | null
  land_size_sqm?:     number | null
  building_size_sqm?: number | null
  floors?:            number | null
  certificate_type?:  string | null
  facing_direction?:  string | null
  year_built?:        number | null
  furnished?:         string | null
  parking_cars?:      number | null
  parking_bikes?:     number | null
  has_pool?:          boolean | null
  has_garden?:        boolean | null
  electricity_va?:    number | null
  water_source?:      string | null
  // Compliance
  agent_license_no?:          string | null
  kpr_eligible?:              boolean | null
  flood_zone?:                string | null
  expat_friendly?:            boolean | null
  leasehold_years_remaining?: number | null
  drone_url?:                 string | null
  virtual_tour_url?:          string | null
  video_url?:                 string | null
  // Sale pricing
  price_idr?:        number | null
  price_negotiable?: boolean | null
  price_on_request?: boolean | null
  // Rent pricing
  daily_rent_idr?:    number | null
  weekly_rent_idr?:   number | null
  monthly_rent_idr?:  number | null
  deposit_idr?:       number | null
  min_lease_months?:  number | null
  // Builder pricing
  starting_price_idr?: number | null
  nup_idr?:            number | null
  units_total?:        number | null
  units_available?:    number | null
  developer_name?:     string | null
  completion_date?:    string | null
}
type FullProvider = {
  id?:           string
  user_id?:      string | null
  slug?:         string
  display_name?: string
} & Extras

const VARIANT_API: Record<PropertyVariant, { me: string; profile: string; dashboard: string }> = {
  for_sale: {
    me:        '/api/property-sale/me',
    profile:   '/api/property-sale/me/profile',
    dashboard: '/dashboard/property-sale',
  },
  for_rent: {
    me:        '/api/property-rent/me',
    profile:   '/api/property-rent/me/profile',
    dashboard: '/dashboard/property-rent',
  },
  new_construction: {
    me:        '/api/property-builder/me',
    profile:   '/api/property-builder/me/profile',
    dashboard: '/dashboard/property-builder',
  },
}

export default function PropertyEditPage({ variant }: { variant: PropertyVariant }) {
  const router = useRouter()
  const api = VARIANT_API[variant]
  const variantLabel = VARIANT_LABELS[variant]
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) { router.replace(`/login?next=${api.dashboard}/edit`); return }
    setLoading(true)
    try {
      const r = await fetch(api.me, { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json() as { provider: FullProvider | null }
        setProvider(j.provider)
      }
    } finally { setLoading(false) }
  }, [router, api.me, api.dashboard])
  useEffect(() => { void reload() }, [reload])

  async function save(patch: Partial<FullProvider>) {
    const r = await fetch(api.profile, {
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
        <div className="px-4 pt-20 max-w-md mx-auto text-center text-ink">
          <h1 className="text-[20px] font-black mb-2">No {variantLabel.en.toLowerCase()} listing yet</h1>
          <Link href={`${api.dashboard}`} className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Open dashboard</Link>
        </div>
      </Shell>
    )
  }

  const theme = provider.theme_color || PROPERTY_DEFAULT_THEME
  const ht = provider.hero_text || {}
  const line1   = ht.line1   ?? PROPERTY_DEFAULT_HERO.line1
  const line2   = ht.line2   ?? variantLabel.line2
  const tagline = ht.tagline ?? PROPERTY_DEFAULT_HERO.tagline
  const line2Color   = ht.color         ?? theme
  const line1Color   = ht.line1_color   ?? '#000000'
  const taglineColor = ht.tagline_color ?? '#000000'
  const rawEffect = ht.effect ?? 'none'
  const effect: BeauticianHeroEffect = (['none','shimmer','dance','underline'].includes(rawEffect) ? rawEffect : 'none') as BeauticianHeroEffect
  const cover  = provider.cover_image_url || PROPERTY_DEFAULT_HERO_IMAGE

  return (
    <Shell>
      <div className="max-w-2xl mx-auto pt-3 pb-32 px-4">
        {/* Top bar */}
        <div className="flex items-center justify-end mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">
            Live editor · {variantLabel.en}
          </div>
        </div>

        <h1 className="text-[22px] font-black leading-tight mb-1">Edit your listing</h1>
        <p className="text-[12px] text-ink/65 leading-snug mb-4">
          The hero preview above updates in real time as you edit below. Changes save automatically.
        </p>

        {/* Live hero preview */}
        <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-lg">
          <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '16 / 9', maxHeight: 220 }}>
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
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

        <BannerInlineControls
          variant={variant}
          provider={provider}
          theme={theme}
          ht={ht}
          onSave={save}
        />

        <p className="text-[11px] text-ink/45 mt-4 leading-snug">
          More inline-edit sections coming soon. For now use the
          {' '}<Link href={api.dashboard} className="text-brand hover:underline">full dashboard form</Link>{' '}
          for the rest.
        </p>
      </div>
    </Shell>
  )
}

function BannerInlineControls({
  variant, provider, theme, ht, onSave,
}: {
  variant: PropertyVariant
  provider: FullProvider
  theme:    string
  ht:       BeauticianHeroText
  onSave:   (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  const variantLabel = VARIANT_LABELS[variant]
  const [draftLine1,        setDraftLine1]        = useState(ht.line1   ?? PROPERTY_DEFAULT_HERO.line1)
  const [draftLine2,        setDraftLine2]        = useState(ht.line2   ?? variantLabel.line2)
  const [draftTagline,      setDraftTagline]      = useState(ht.tagline ?? PROPERTY_DEFAULT_HERO.tagline)
  const [draftColor,        setDraftColor]        = useState(ht.color   ?? theme)
  const [draftLine1Color,   setDraftLine1Color]   = useState(ht.line1_color   ?? '#000000')
  const [draftTaglineColor, setDraftTaglineColor] = useState(ht.tagline_color ?? '#000000')
  const [draftEffect,       setDraftEffect]       = useState<BeauticianHeroEffect>(((['none','shimmer','dance','underline'].includes(ht.effect ?? 'none')) ? (ht.effect ?? 'none') : 'none') as BeauticianHeroEffect)
  const [savedFlash,   setSavedFlash]   = useState(false)
  const [colorFollowsTheme, setColorFollowsTheme] = useState(!ht.color)

  useEffect(() => {
    if (colorFollowsTheme) setDraftColor(theme)
  }, [theme, colorFollowsTheme])

  useEffect(() => {
    if (!ht.color) {
      setColorFollowsTheme(true)
      setDraftColor(theme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ht.color])

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

  const propertyType = (provider.property_type ?? null) as PropertyTypeId | null

  return (
    <div className="mt-4 space-y-5">
      {/* Auto-save badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-ink">Edit banner</h2>
        <div className={`text-[11px] font-bold transition ${savedFlash ? 'text-green-300 opacity-100' : 'opacity-0'}`}>
          ✓ Saved
        </div>
      </div>

      {/* Theme color */}
      <Section title="Theme color">
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

      {/* Banner image */}
      <Section title="Banner image">
        <BannerLibraryPicker
          themeHex={provider.theme_color ?? null}
          selected={provider.cover_image_url ?? null}
          onChange={(url) => onSave({ cover_image_url: url })}
          userId={provider.user_id ?? null}
          library={PROPERTY_BANNER_LIBRARY}
          categories={PROPERTY_BANNER_CATEGORIES}
          defaultThemeHex="#0EA5E9"
          selectedAccentHex="#0EA5E9"
        />
      </Section>

      {/* Text inputs with per-line color picker */}
      <Section title="Banner text">
        <div className="space-y-3">
          <FieldWithColor
            label="Top line" max={30}
            value={draftLine1} onChange={setDraftLine1}
            placeholder="Indonesia"
            color={draftLine1Color} onColorChange={setDraftLine1Color}
          />
          <FieldWithColor
            label="Main word" max={30}
            value={draftLine2} onChange={setDraftLine2}
            placeholder={variantLabel.line2}
            color={draftColor}
            onColorChange={(hex) => { setColorFollowsTheme(false); setDraftColor(hex) }}
            colorNote={colorFollowsTheme
              ? <>Following theme <span className="font-mono">{theme}</span>. Pick a color to override.</>
              : <>Override locked. <button type="button" onClick={() => { setColorFollowsTheme(true); setDraftColor(theme) }} className="text-brand underline font-bold">Reset to theme</button></>
            }
          />
          <FieldWithColor
            label="Tagline" max={80}
            value={draftTagline} onChange={setDraftTagline}
            placeholder="Find your next home…"
            color={draftTaglineColor} onColorChange={setDraftTaglineColor}
          />
        </div>
      </Section>

      {/* Effect */}
      <Section title="Text effect (Main word)">
        <div className="grid grid-cols-2 gap-1.5">
          {EFFECTS.map((ef) => {
            const on = draftEffect === ef.id
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => setDraftEffect(ef.id)}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-sky-500 text-white border-sky-500 shadow-[0_2px_10px_rgba(14,165,233,0.45)]' : 'bg-black/40 text-ink border-white/15 hover:bg-white/5'
                }`}
              >
                <div className="text-[13px] font-extrabold">{ef.label}</div>
                <div className={`text-[11px] ${on ? 'text-white/80' : 'text-ink/55'}`}>{ef.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Property type — single-pick from catalog. Saved as services_offered:[id] */}
      <Section title="Property type">
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPE_OPTIONS.map((opt) => {
            const on = propertyType === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSave({
                  property_type: opt.id,
                  // services_offered single-element array — backend mirrors
                  // the beautician services_offered shape.
                  ...({ services_offered: [opt.id] } as Partial<FullProvider>),
                })}
                className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold border transition active:scale-[0.97] ${
                  on ? 'bg-sky-500 text-white border-sky-500' : 'bg-black/40 text-ink border-white/15 hover:bg-white/5'
                }`}
              >
                {opt.label_id}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Variant-specific pricing block */}
      {variant === 'for_sale'         && <SalePricingSection      provider={provider} onSave={onSave} />}
      {variant === 'for_rent'         && <RentPricingSection      provider={provider} onSave={onSave} />}
      {variant === 'new_construction' && <BuilderPricingSection   provider={provider} onSave={onSave} />}

      {/* Property Details */}
      <PropertyDetailsSection provider={provider} onSave={onSave} />

      {/* Compliance */}
      <ComplianceSection provider={provider} onSave={onSave} />

      {/* Service photos — keyed object (same shape as beautician) */}
      {provider.user_id && propertyType && (
        <Section title="Photos">
          <BeauticianServicePhotosEditor
            userId={provider.user_id}
            servicesOffered={[propertyType as unknown as BeauticianServiceOffered]}
            value={(provider.service_photos ?? {}) as Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>>}
            onChange={(next) => onSave({ service_photos: next as Partial<Record<string, BeauticianServicePhoto[]>> })}
          />
        </Section>
      )}

      {/* Running marquee text */}
      <Section title="Running text (marquee under listing)">
        <PromoTextEditor
          value={provider.promo_text ?? ''}
          onChange={(v) => onSave({ promo_text: v || null })}
          themeColor={theme}
        />
      </Section>

      {/* Quick links */}
      <Section title="More">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={VARIANT_API[variant].dashboard}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-gray-200 shadow-sm text-ink px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-black/65 hover:border-white/20 shadow-md shadow-black/20 transition"
          >
            Back to dashboard
          </Link>
          {provider.slug && (
            <a
              href={`/property/${provider.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-gray-200 shadow-sm text-ink px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-black/65 hover:border-white/20 shadow-md shadow-black/20 transition"
            >
              View live listing →
            </a>
          )}
        </div>
      </Section>

      {/* Explicit Save button */}
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
      <p className="text-[11px] text-ink/45 text-center mt-1 leading-snug">
        Auto-save also runs in the background — your changes are saved as you type.
      </p>
    </div>
  )
}

// ─── Variant pricing sections ──────────────────────────────────────────

function SalePricingSection({
  provider, onSave,
}: {
  provider: FullProvider
  onSave: (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  return (
    <Section title="Sale pricing">
      <div className="space-y-3">
        <NumberField
          label="Asking price (IDR)"
          value={provider.price_idr ?? null}
          onCommit={(v) => onSave({ price_idr: v })}
          placeholder="e.g. 2500000000"
        />
        <ToggleRow
          label="Price negotiable"
          checked={!!provider.price_negotiable}
          onChange={(b) => onSave({ price_negotiable: b })}
        />
        <ToggleRow
          label="Price on request (hide from listing)"
          checked={!!provider.price_on_request}
          onChange={(b) => onSave({ price_on_request: b })}
        />
      </div>
    </Section>
  )
}

function RentPricingSection({
  provider, onSave,
}: {
  provider: FullProvider
  onSave: (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  return (
    <Section title="Rental pricing">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Per day (IDR)"
          value={provider.daily_rent_idr ?? null}
          onCommit={(v) => onSave({ daily_rent_idr: v })}
        />
        <NumberField
          label="Per week (IDR)"
          value={provider.weekly_rent_idr ?? null}
          onCommit={(v) => onSave({ weekly_rent_idr: v })}
        />
        <NumberField
          label="Per month (IDR)"
          value={provider.monthly_rent_idr ?? null}
          onCommit={(v) => onSave({ monthly_rent_idr: v })}
        />
        <NumberField
          label="Deposit (IDR)"
          value={provider.deposit_idr ?? null}
          onCommit={(v) => onSave({ deposit_idr: v })}
        />
        <NumberField
          label="Min lease (months)"
          value={provider.min_lease_months ?? null}
          onCommit={(v) => onSave({ min_lease_months: v })}
        />
      </div>
    </Section>
  )
}

function BuilderPricingSection({
  provider, onSave,
}: {
  provider: FullProvider
  onSave: (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  return (
    <Section title="Builder pricing & project">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Starting price (IDR)"
            value={provider.starting_price_idr ?? null}
            onCommit={(v) => onSave({ starting_price_idr: v })}
          />
          <NumberField
            label="NUP / Booking fee (IDR)"
            value={provider.nup_idr ?? null}
            onCommit={(v) => onSave({ nup_idr: v })}
          />
          <NumberField
            label="Total units"
            value={provider.units_total ?? null}
            onCommit={(v) => onSave({ units_total: v })}
          />
          <NumberField
            label="Units available"
            value={provider.units_available ?? null}
            onCommit={(v) => onSave({ units_available: v })}
          />
        </div>
        <TextField
          label="Developer name"
          value={provider.developer_name ?? ''}
          onCommit={(v) => onSave({ developer_name: v || null })}
          placeholder="e.g. Sinarmas Land"
          max={120}
        />
        <DateField
          label="Estimated completion"
          value={provider.completion_date ?? ''}
          onCommit={(v) => onSave({ completion_date: v || null })}
        />
      </div>
    </Section>
  )
}

// ─── Property Details ──────────────────────────────────────────────────

function PropertyDetailsSection({
  provider, onSave,
}: {
  provider: FullProvider
  onSave: (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  return (
    <Section title="Property details">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Bedrooms"
            value={provider.bedrooms ?? null}
            onCommit={(v) => onSave({ bedrooms: v })}
          />
          <NumberField
            label="Bathrooms"
            value={provider.bathrooms ?? null}
            onCommit={(v) => onSave({ bathrooms: v })}
          />
          <NumberField
            label="Land size (sqm)"
            value={provider.land_size_sqm ?? null}
            onCommit={(v) => onSave({ land_size_sqm: v })}
            allowDecimal
          />
          <NumberField
            label="Building size (sqm)"
            value={provider.building_size_sqm ?? null}
            onCommit={(v) => onSave({ building_size_sqm: v })}
            allowDecimal
          />
          <NumberField
            label="Floors"
            value={provider.floors ?? null}
            onCommit={(v) => onSave({ floors: v })}
          />
          <NumberField
            label="Year built"
            value={provider.year_built ?? null}
            onCommit={(v) => onSave({ year_built: v })}
          />
          <NumberField
            label="Parking (cars)"
            value={provider.parking_cars ?? null}
            onCommit={(v) => onSave({ parking_cars: v })}
          />
          <NumberField
            label="Parking (bikes)"
            value={provider.parking_bikes ?? null}
            onCommit={(v) => onSave({ parking_bikes: v })}
          />
          <NumberField
            label="Electricity (VA)"
            value={provider.electricity_va ?? null}
            onCommit={(v) => onSave({ electricity_va: v })}
          />
          <TextField
            label="Facing"
            value={provider.facing_direction ?? ''}
            onCommit={(v) => onSave({ facing_direction: v || null })}
            placeholder="e.g. North"
            max={40}
          />
        </div>

        <PillRow
          label="Certificate"
          options={CERTIFICATE_OPTIONS.map((c) => ({ id: c, label: c }))}
          value={provider.certificate_type ?? null}
          onChange={(id) => onSave({ certificate_type: id })}
        />
        <PillRow
          label="Furnished"
          options={FURNISHED_OPTIONS.map((f) => ({ id: f, label: f }))}
          value={provider.furnished ?? null}
          onChange={(id) => onSave({ furnished: id })}
        />
        <PillRow
          label="Water source"
          options={WATER_SOURCE_OPTIONS.map((w) => ({ id: w, label: w }))}
          value={provider.water_source ?? null}
          onChange={(id) => onSave({ water_source: id })}
        />

        <div className="grid grid-cols-2 gap-2">
          <ToggleRow
            label="Pool"
            checked={!!provider.has_pool}
            onChange={(b) => onSave({ has_pool: b })}
          />
          <ToggleRow
            label="Garden"
            checked={!!provider.has_garden}
            onChange={(b) => onSave({ has_garden: b })}
          />
        </div>
      </div>
    </Section>
  )
}

// ─── Compliance ────────────────────────────────────────────────────────

function ComplianceSection({
  provider, onSave,
}: {
  provider: FullProvider
  onSave: (patch: Partial<FullProvider>) => Promise<boolean> | boolean
}) {
  return (
    <Section title="Compliance">
      <div className="space-y-3">
        <TextField
          label="Agent license # (AREBI)"
          value={provider.agent_license_no ?? ''}
          onCommit={(v) => onSave({ agent_license_no: v || null })}
          placeholder="e.g. AREBI-12345"
          max={60}
        />
        <div className="grid grid-cols-2 gap-2">
          <ToggleRow
            label="KPR eligible"
            checked={!!provider.kpr_eligible}
            onChange={(b) => onSave({ kpr_eligible: b })}
          />
          <ToggleRow
            label="Expat friendly"
            checked={!!provider.expat_friendly}
            onChange={(b) => onSave({ expat_friendly: b })}
          />
        </div>
        <PillRow
          label="Flood zone"
          options={FLOOD_ZONE_OPTIONS.map((f) => ({ id: f, label: f }))}
          value={provider.flood_zone ?? null}
          onChange={(id) => onSave({ flood_zone: id })}
        />
        <NumberField
          label="Leasehold years remaining"
          value={provider.leasehold_years_remaining ?? null}
          onCommit={(v) => onSave({ leasehold_years_remaining: v })}
        />
        <TextField
          label="Drone footage URL"
          value={provider.drone_url ?? ''}
          onCommit={(v) => onSave({ drone_url: v || null })}
          placeholder="https://…"
          max={500}
        />
        <TextField
          label="Virtual tour URL"
          value={provider.virtual_tour_url ?? ''}
          onCommit={(v) => onSave({ virtual_tour_url: v || null })}
          placeholder="https://…"
          max={500}
        />
        <TextField
          label="Video URL"
          value={provider.video_url ?? ''}
          onCommit={(v) => onSave({ video_url: v || null })}
          placeholder="https://…"
          max={500}
        />
      </div>
    </Section>
  )
}

// ─── Promo text editor (clone of beautician) ───────────────────────────

function PromoTextEditor({
  value, onChange, themeColor,
}: {
  value: string
  onChange: (next: string) => void
  themeColor: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== value) onChange(draft.trim().slice(0, 280))
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const display = (draft.trim() || 'New listing — schedule a viewing this week.') + ' ✦'

  return (
    <div className="space-y-2">
      <div className="overflow-hidden py-1.5 rounded-full" style={{ background: '#E0F2FE' }}>
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
        placeholder="Write your promo message — appears as scrolling text on the listing."
        className="w-full rounded-xl bg-black/85 border border-white/15 px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand resize-none leading-snug"
      />
      <p className="text-[11px] text-ink/60 leading-snug">
        Open house this weekend? Price reduction? Use this to highlight it.
      </p>
      <div className={`text-[10px] tabular-nums text-right ${draft.length >= 240 ? 'text-amber-300' : 'text-ink/45'}`}>
        {draft.length} / 280
      </div>
    </div>
  )
}

// ─── Reusable atoms ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink/80">{title}</div>
      {children}
    </div>
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
    '#0EA5E9', '#38BDF8', '#0284C7',
    '#F97316', '#FACC15', '#10B981',
    '#EC4899', '#9333EA', '#B91C1C',
  ]
  return (
    <div className="space-y-1.5 rounded-xl bg-black/40 border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-extrabold uppercase tracking-wider text-ink">{label}</span>
        <span className={`text-[10px] tabular-nums ${value.length >= max - 5 ? 'text-amber-300' : 'text-ink/45'}`}>
          {value.length} / {max}
        </span>
      </div>
      <input
        type="text"
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        placeholder={placeholder}
        className="w-full rounded-xl bg-black/85 border border-white/15 px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand"
        style={{ color, textShadow: '0 0 6px rgba(255,255,255,0.55), 0 0 2px rgba(0,0,0,0.55)' }}
      />
      <div className="flex items-center flex-wrap gap-1.5 pt-1">
        {PRESET.map((hex) => {
          const on = color.toUpperCase() === hex.toUpperCase()
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onColorChange(hex)}
              aria-label={hex}
              className={`relative w-7 h-7 rounded-full transition active:scale-95 ${on ? 'ring-2 ring-offset-1 ring-offset-bg ring-white' : ''}`}
              style={{ background: hex, border: hex === '#FFFFFF' ? '1px solid rgba(255,255,255,0.18)' : 'none' }}
            >
              {on && <Check className="absolute inset-0 m-auto w-3 h-3" style={{ color: hex === '#FFFFFF' || hex === '#FACC15' ? '#0A0A0A' : '#FFFFFF' }} strokeWidth={3} />}
            </button>
          )
        })}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value.toUpperCase())}
          aria-label="Custom color"
          className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/15"
        />
        <span className="text-[10px] font-mono text-ink/55">{color}</span>
      </div>
      {colorNote && <p className="text-[10px] text-ink/55 leading-snug">{colorNote}</p>}
    </div>
  )
}

function NumberField({
  label, value, onCommit, placeholder, allowDecimal,
}: {
  label: string
  value: number | null
  onCommit: (next: number | null) => void
  placeholder?: string
  allowDecimal?: boolean
}) {
  const [draft, setDraft] = useState(value === null || value === undefined ? '' : String(value))
  useEffect(() => {
    setDraft(value === null || value === undefined ? '' : String(value))
  }, [value])
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/80">{label}</span>
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          if (!trimmed) { onCommit(null); return }
          const n = Number(trimmed)
          if (Number.isFinite(n)) onCommit(n)
        }}
        placeholder={placeholder}
        className="w-full rounded-xl bg-black/85 border border-white/15 px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand"
      />
    </label>
  )
}

function TextField({
  label, value, onCommit, placeholder, max,
}: {
  label: string
  value: string
  onCommit: (next: string) => void
  placeholder?: string
  max: number
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/80">{label}</span>
      <input
        type="text"
        maxLength={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onCommit(draft.trim()) }}
        placeholder={placeholder}
        className="w-full rounded-xl bg-black/85 border border-white/15 px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand"
      />
    </label>
  )
}

function DateField({
  label, value, onCommit,
}: {
  label: string
  value: string
  onCommit: (next: string) => void
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/80">{label}</span>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onCommit(e.target.value)}
        className="w-full rounded-xl bg-black/85 border border-white/15 px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand"
      />
    </label>
  )
}

function PillRow({
  label, options, value, onChange,
}: {
  label: string
  options: Array<{ id: string; label: string }>
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/80">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(on ? null : opt.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold border transition active:scale-[0.97] ${
                on ? 'bg-sky-500 text-white border-sky-500' : 'bg-black/40 text-ink border-white/15 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ToggleRow({
  label, checked, onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-extrabold border transition active:scale-[0.98] ${
        checked ? 'bg-sky-500/15 text-ink border-sky-400/40' : 'bg-black/40 text-ink border-white/15 hover:bg-white/5'
      }`}
    >
      <span>{label}</span>
      <span className={`relative inline-block w-9 h-5 rounded-full transition ${checked ? 'bg-sky-500' : 'bg-white/15'}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </span>
    </button>
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
