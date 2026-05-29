'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Check, Palette, Image as ImageIcon, Type, Megaphone, MoreHorizontal, Wallet, Bike, KeyRound, Truck } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import ThemeColorPicker from '@/components/dashboard/ThemeColorPicker'
import { RENTAL_BANNER_LIBRARY, RENTAL_BANNER_CATEGORIES } from '@/lib/rentals/banners'

// WYSIWYG profile editor for bike rentals — byte-for-byte JSX clone of
// /dashboard/beautician/edit/page.tsx, adapted to the bike_rentals table.
// Field mappings:
//   display_name     → owner_name
//   business_name    → owner_company
//   bio              → description
//   gallery_image_urls → image_urls
//   latitude/longitude → lat/lng
// Catalog:
//   bike_type discriminator (matic, sport, adventure, bebek, vespa,
//   classic, big_bike, electric) + rental_mode (self_ride / with_driver /
//   both). services_offered is a single-element [bike_type] array for
//   parity with the beautician shape.
// Pricing (mig 0129 + 0023): 4 base tiles (daily / weekly / monthly /
// deposit) + 5 with-driver tiles (3h / 6h / 8h / driver day-rate).
// Adds a Vehicle Specs section and a Delivery toggles section.

const DEFAULT_THEME = '#FACC15'
const DEFAULT_HERO = {
  line1:   'Premium',
  line2:   'Rental',
  tagline: 'Motorbikes ready when you are',
}
const DEFAULT_HERO_IMAGE = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

type BikeType = 'matic' | 'sport' | 'adventure' | 'bebek' | 'vespa' | 'classic' | 'big_bike' | 'electric'
type RentalMode = 'self_ride' | 'with_driver' | 'both'
type Transmission = 'automatic' | 'manual' | 'semi_auto'
type HeroEffect = 'none' | 'shimmer' | 'dance' | 'underline'

type HeroText = {
  line1?:         string
  line2?:         string
  tagline?:       string
  color?:         string
  line1_color?:   string
  tagline_color?: string
  effect?:        HeroEffect
}

const BIKE_TYPE_OPTIONS: Array<{ id: BikeType; label: string }> = [
  { id: 'matic',     label: 'Matic'      },
  { id: 'sport',     label: 'Sport'      },
  { id: 'adventure', label: 'Adventure'  },
  { id: 'bebek',     label: 'Bebek'      },
  { id: 'vespa',     label: 'Vespa'      },
  { id: 'classic',   label: 'Classic'    },
  { id: 'big_bike',  label: 'Big Bike'   },
  { id: 'electric',  label: 'Electric'   },
]

const RENTAL_MODE_OPTIONS: Array<{ id: RentalMode; label: string; desc: string }> = [
  { id: 'self_ride',   label: 'Self ride',   desc: 'Renter rides on their own'        },
  { id: 'with_driver', label: 'With driver', desc: 'Tour-style bike + local driver'   },
  { id: 'both',        label: 'Both',        desc: 'Customer picks either option'     },
]

type Rental = {
  id:                       string
  slug:                     string | null
  owner_user_id:            string | null
  owner_name:               string
  owner_company:            string | null
  owner_whatsapp_e164:      string
  description:              string | null
  city:                     string
  // Vehicle
  brand:                    string
  model:                    string
  year:                     number | null
  cc:                       number | null
  transmission:             Transmission
  color:                    string | null
  bike_type:                BikeType | null
  helmet_count:             number | null
  raincoat_count:           number | null
  // Delivery
  has_phone_holder:         boolean
  has_phone_charger:        boolean
  has_delivery_box:         boolean
  delivers_to_hotel:        boolean
  delivers_to_villa:        boolean
  pickup_dropoff:           boolean
  // Pricing
  rental_mode:              RentalMode
  daily_price_idr:          number | null
  weekly_price_idr:         number | null
  monthly_price_idr:        number | null
  security_deposit_idr:     number | null
  driver_rate_per_day_idr:  number | null
  tour_3h_idr:              number | null
  tour_6h_idr:              number | null
  tour_8h_idr:              number | null
  // Gallery
  image_urls:               string[] | null
  // Universal extras
  cover_image_url:          string | null
  // Mig 0129 — profile-editor parity
  theme_color:              string | null
  hero_text:                HeroText | null
  promo_text:               string | null
  services_offered:         string[] | null
}

export default function RentalsEditPage() {
  const router = useRouter()
  const [provider, setProvider] = useState<Rental | null>(null)
  const [loading,  setLoading]  = useState(true)

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) { router.replace('/login?next=/dashboard/rentals/edit'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/rent/me', { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json() as { provider: Rental | null }
        setProvider(j.provider)
      }
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void reload() }, [reload])

  async function save(patch: Partial<Rental>) {
    const r = await fetch('/api/rent/me/profile', {
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
          <h1 className="text-[20px] font-black mb-2">No rental listing yet</h1>
          <Link href="/rent/list/new" className="rounded-full bg-orange-500 text-white px-6 py-3 text-[13px] font-extrabold inline-block">List a bike</Link>
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
  const effect: HeroEffect = (['none','shimmer','dance','underline'].includes(rawEffect) ? rawEffect : 'none') as HeroEffect
  const cover  = provider.cover_image_url || DEFAULT_HERO_IMAGE

  return (
    <Shell>
      <div className="max-w-2xl mx-auto pt-4 pb-32 px-4">
        {/* Brand header — orange-tinted strip with sparkle icon, matching
            the hub's polished feel. Auto-save badge lives on the right. */}
        <div className="rounded-3xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Design Studio</h1>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-orange-700 bg-orange-100 border border-orange-200 rounded-full px-2 py-0.5">
                  Live
                </span>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Tune your rental page in real time — theme, banner, text. Auto-saves as you type.
              </p>
            </div>
          </div>
        </div>

        {/* Live hero preview */}
        <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
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
          provider={provider}
          theme={theme}
          ht={ht}
          onSave={save}
        />

        <p className="text-[12px] text-black/55 mt-4 leading-snug">
          More inline-edit sections coming soon (availability · hours). For now use the
          {' '}<Link href="/dashboard/rentals" className="text-orange-600 hover:underline font-bold">full dashboard form</Link>{' '}
          for the rest.
        </p>
      </div>
    </Shell>
  )
}

function BannerInlineControls({
  provider, theme, ht, onSave,
}: {
  provider: Rental
  theme:    string
  ht:       HeroText
  onSave:   (patch: Partial<Rental>) => Promise<boolean> | boolean
}) {
  // Drafts live locally; debounced commits push to onSave.
  const [draftLine1,        setDraftLine1]        = useState(ht.line1   ?? DEFAULT_HERO.line1)
  const [draftLine2,        setDraftLine2]        = useState(ht.line2   ?? DEFAULT_HERO.line2)
  const [draftTagline,      setDraftTagline]      = useState(ht.tagline ?? DEFAULT_HERO.tagline)
  const [draftColor,        setDraftColor]        = useState(ht.color   ?? theme)
  const [draftLine1Color,   setDraftLine1Color]   = useState(ht.line1_color   ?? '#000000')
  const [draftTaglineColor, setDraftTaglineColor] = useState(ht.tagline_color ?? '#000000')
  const [draftEffect,       setDraftEffect]       = useState<HeroEffect>(((['none','shimmer','dance','underline'].includes(ht.effect ?? 'none')) ? (ht.effect ?? 'none') : 'none') as HeroEffect)
  const [savedFlash,   setSavedFlash]   = useState(false)
  const [colorFollowsTheme, setColorFollowsTheme] = useState(!ht.color)

  // ── Vehicle Specs ────────────────────────────────────────────────────
  const [draftBrand,         setDraftBrand]         = useState(provider.brand ?? '')
  const [draftModel,         setDraftModel]         = useState(provider.model ?? '')
  const [draftYear,          setDraftYear]          = useState<string>(provider.year != null ? String(provider.year) : '')
  const [draftCc,            setDraftCc]            = useState<string>(provider.cc != null ? String(provider.cc) : '')
  const [draftTransmission,  setDraftTransmission]  = useState<Transmission>(provider.transmission ?? 'automatic')
  const [draftBikeColor,     setDraftBikeColor]     = useState(provider.color ?? '')
  const [draftBikeType,      setDraftBikeType]      = useState<BikeType | ''>((provider.services_offered?.[0] as BikeType | undefined) ?? provider.bike_type ?? '')
  const [draftHelmetCount,   setDraftHelmetCount]   = useState<string>(provider.helmet_count   != null ? String(provider.helmet_count)   : '')
  const [draftRaincoatCount, setDraftRaincoatCount] = useState<string>(provider.raincoat_count != null ? String(provider.raincoat_count) : '')

  // ── Delivery toggles ─────────────────────────────────────────────────
  const [hasPhoneHolder,  setHasPhoneHolder]  = useState(!!provider.has_phone_holder)
  const [hasPhoneCharger, setHasPhoneCharger] = useState(!!provider.has_phone_charger)
  const [hasDeliveryBox,  setHasDeliveryBox]  = useState(!!provider.has_delivery_box)
  const [deliversToHotel, setDeliversToHotel] = useState(!!provider.delivers_to_hotel)
  const [deliversToVilla, setDeliversToVilla] = useState(!!provider.delivers_to_villa)
  const [pickupDropoff,   setPickupDropoff]   = useState(!!provider.pickup_dropoff)

  // ── Pricing ──────────────────────────────────────────────────────────
  const [draftMode,        setDraftMode]        = useState<RentalMode>(provider.rental_mode ?? 'self_ride')
  const [draftDaily,       setDraftDaily]       = useState<string>(provider.daily_price_idr       != null ? String(provider.daily_price_idr)       : '')
  const [draftWeekly,      setDraftWeekly]      = useState<string>(provider.weekly_price_idr      != null ? String(provider.weekly_price_idr)      : '')
  const [draftMonthly,     setDraftMonthly]     = useState<string>(provider.monthly_price_idr     != null ? String(provider.monthly_price_idr)     : '')
  const [draftDeposit,     setDraftDeposit]     = useState<string>(provider.security_deposit_idr  != null ? String(provider.security_deposit_idr)  : '')
  const [draftTour3h,      setDraftTour3h]      = useState<string>(provider.tour_3h_idr           != null ? String(provider.tour_3h_idr)           : '')
  const [draftTour6h,      setDraftTour6h]      = useState<string>(provider.tour_6h_idr           != null ? String(provider.tour_6h_idr)           : '')
  const [draftTour8h,      setDraftTour8h]      = useState<string>(provider.tour_8h_idr           != null ? String(provider.tour_8h_idr)           : '')
  const [draftDriverRate,  setDraftDriverRate]  = useState<string>(provider.driver_rate_per_day_idr != null ? String(provider.driver_rate_per_day_idr) : '')

  // Follow-theme sync.
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

  // Auto-save hero_text on debounce.
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
        } as HeroText,
      })
      if (ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1200)
      }
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLine1, draftLine2, draftTagline, draftColor, draftLine1Color, draftTaglineColor, draftEffect, colorFollowsTheme])

  const EFFECTS: Array<{ id: HeroEffect; label: string; desc: string }> = [
    { id: 'none',      label: 'None',          desc: 'Static text' },
    { id: 'shimmer',   label: 'Shimmer',       desc: 'Light sweeps across — luxe' },
    { id: 'dance',     label: 'Dancing text',  desc: 'Letters playfully wiggle' },
    { id: 'underline', label: 'Underline',     desc: 'Elegant accent line' },
  ]

  return (
    <div className="mt-4 space-y-4">
      {/* Auto-save badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-black">Edit listing</h2>
        <div className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider transition ${savedFlash ? 'text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5 opacity-100' : 'opacity-0'}`}>
          ✓ Saved
        </div>
      </div>

      {/* Theme color */}
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

      {/* Banner image — library + upload. Library is the curated set of
          motorbike rental banners from @/lib/rentals/banners. */}
      <Section title="Banner image" icon={<ImageIcon size={16} strokeWidth={2.5} />}>
        <BannerLibraryPicker
          themeHex={provider.theme_color ?? null}
          selected={provider.cover_image_url ?? null}
          onChange={(url) => onSave({ cover_image_url: url })}
          userId={provider.owner_user_id ?? null}
          library={RENTAL_BANNER_LIBRARY}
          categories={RENTAL_BANNER_CATEGORIES}
          defaultThemeHex="#FACC15"
          selectedAccentHex="#F97316"
        />
      </Section>

      {/* Banner text */}
      <Section title="Banner text" icon={<Type size={16} strokeWidth={2.5} />}>
        <div className="space-y-3">
          <FieldWithColor
            label="Top line" max={30}
            value={draftLine1} onChange={setDraftLine1}
            placeholder="Premium"
            color={draftLine1Color} onColorChange={setDraftLine1Color}
          />
          <FieldWithColor
            label="Main word" max={30}
            value={draftLine2} onChange={setDraftLine2}
            placeholder="Rental"
            color={draftColor}
            onColorChange={(hex) => { setColorFollowsTheme(false); setDraftColor(hex) }}
            colorNote={colorFollowsTheme
              ? <>Following theme <span className="font-mono">{theme}</span>. Pick a color to override.</>
              : <>Override locked. <button type="button" onClick={() => { setColorFollowsTheme(true); setDraftColor(theme) }} className="text-orange-600 underline font-bold">Reset to theme</button></>
            }
          />
          <FieldWithColor
            label="Tagline" max={80}
            value={draftTagline} onChange={setDraftTagline}
            placeholder="Motorbikes ready when you are…"
            color={draftTaglineColor} onColorChange={setDraftTaglineColor}
          />
        </div>
      </Section>

      {/* Effect */}
      <Section title="Text effect (Rental word)" icon={<Sparkles size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {EFFECTS.map((ef) => {
            const on = draftEffect === ef.id
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => setDraftEffect(ef.id)}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-orange-500 text-white border-orange-500 shadow-[0_2px_10px_rgba(249,115,22,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-[13px] font-extrabold">{ef.label}</div>
                <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{ef.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Vehicle Specs */}
      <Section title="Vehicle specs" icon={<Bike size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          <SpecField label="Brand" value={draftBrand} onChange={setDraftBrand}                placeholder="Honda" />
          <SpecField label="Model" value={draftModel} onChange={setDraftModel}                placeholder="PCX 150" />
          <SpecField label="Year"  value={draftYear}  onChange={setDraftYear}                 placeholder="2024" mono />
          <SpecField label="CC"    value={draftCc}    onChange={setDraftCc}                   placeholder="150"  mono />
          <SelectField label="Transmission" value={draftTransmission} onChange={(v) => setDraftTransmission(v as Transmission)} options={[
            { value: 'automatic', label: 'Automatic' },
            { value: 'manual',    label: 'Manual'    },
            { value: 'semi_auto', label: 'Semi-auto' },
          ]} />
          <SpecField label="Color" value={draftBikeColor} onChange={setDraftBikeColor}        placeholder="Hitam" />
          <SpecField label="Helmets"   value={draftHelmetCount}   onChange={setDraftHelmetCount}   placeholder="2" mono />
          <SpecField label="Raincoats" value={draftRaincoatCount} onChange={setDraftRaincoatCount} placeholder="1" mono />
        </div>

        <div className="mt-3">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1.5">Bike type</div>
          <div className="grid grid-cols-2 gap-2">
            {BIKE_TYPE_OPTIONS.map((bt) => {
              const on = draftBikeType === bt.id
              return (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => setDraftBikeType(bt.id)}
                  className={`text-left rounded-xl p-2.5 border transition active:scale-[0.98] ${
                    on
                      ? 'bg-orange-500 text-white border-orange-500 shadow-[0_2px_10px_rgba(249,115,22,0.35)]'
                      : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-[12px] font-extrabold">{bt.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            const yearNum    = parseInt(draftYear.replace(/\D/g, ''), 10)
            const ccNum      = parseInt(draftCc.replace(/\D/g, ''),   10)
            const helmetNum  = parseInt(draftHelmetCount.replace(/\D/g, ''),  10)
            const raincoatNum = parseInt(draftRaincoatCount.replace(/\D/g, ''), 10)
            const ok = await onSave({
              brand:          draftBrand.trim(),
              model:          draftModel.trim(),
              year:           Number.isFinite(yearNum)    && yearNum    > 0 ? yearNum    : null,
              cc:             Number.isFinite(ccNum)      && ccNum      > 0 ? ccNum      : null,
              transmission:   draftTransmission,
              color:          draftBikeColor.trim() || null,
              bike_type:      (draftBikeType || null) as BikeType | null,
              helmet_count:   Number.isFinite(helmetNum)  ? helmetNum  : null,
              raincoat_count: Number.isFinite(raincoatNum) ? raincoatNum : null,
              services_offered: draftBikeType ? [draftBikeType] : [],
            })
            if (ok) { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }
          }}
          className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 text-white border border-orange-500 text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.99] hover:bg-orange-600 transition min-h-[44px]"
        >
          Save vehicle specs
        </button>
      </Section>

      {/* Rental mode discriminator */}
      <Section title="Rental mode" icon={<KeyRound size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-1 gap-2">
          {RENTAL_MODE_OPTIONS.map((rm) => {
            const on = draftMode === rm.id
            return (
              <button
                key={rm.id}
                type="button"
                onClick={async () => {
                  setDraftMode(rm.id)
                  await onSave({ rental_mode: rm.id })
                }}
                className={`text-left rounded-xl p-3 border transition active:scale-[0.98] ${
                  on ? 'bg-orange-500 text-white border-orange-500 shadow-[0_2px_10px_rgba(249,115,22,0.35)]' : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-[13px] font-extrabold">{rm.label}</div>
                <div className={`text-[12px] ${on ? 'text-white/85' : 'text-black/55'}`}>{rm.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Pricing — 4 tiles always */}
      <Section title="Pricing (IDR)" icon={<Wallet size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          <PriceTile label="Daily"   value={draftDaily}   onChange={setDraftDaily} />
          <PriceTile label="Weekly"  value={draftWeekly}  onChange={setDraftWeekly} />
          <PriceTile label="Monthly" value={draftMonthly} onChange={setDraftMonthly} />
          <PriceTile label="Deposit" value={draftDeposit} onChange={setDraftDeposit} />
        </div>

        {/* With-driver tier — 5 more tiles when rental_mode !== 'self_ride' */}
        {draftMode !== 'self_ride' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PriceTile label="Tour 3h" value={draftTour3h} onChange={setDraftTour3h} />
            <PriceTile label="Tour 6h" value={draftTour6h} onChange={setDraftTour6h} />
            <PriceTile label="Tour 8h" value={draftTour8h} onChange={setDraftTour8h} />
            <PriceTile label="Driver/day" value={draftDriverRate} onChange={setDraftDriverRate} />
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            const num = (s: string) => {
              const n = parseInt(s.replace(/\D/g, ''), 10)
              return Number.isFinite(n) && n > 0 ? n : null
            }
            const patch: Partial<Rental> = {
              daily_price_idr:      num(draftDaily),
              weekly_price_idr:     num(draftWeekly),
              monthly_price_idr:    num(draftMonthly),
              security_deposit_idr: num(draftDeposit),
            }
            if (draftMode !== 'self_ride') {
              patch.tour_3h_idr             = num(draftTour3h)
              patch.tour_6h_idr             = num(draftTour6h)
              patch.tour_8h_idr             = num(draftTour8h)
              patch.driver_rate_per_day_idr = num(draftDriverRate)
            }
            const ok = await onSave(patch)
            if (ok) { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }
          }}
          className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 text-white border border-orange-500 text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.99] hover:bg-orange-600 transition min-h-[44px]"
        >
          Save pricing
        </button>
      </Section>

      {/* Delivery */}
      <Section title="Delivery & inclusions" icon={<Truck size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-1 gap-2">
          <Toggle label="Phone holder"      value={hasPhoneHolder}  onChange={setHasPhoneHolder}  />
          <Toggle label="Phone charger"     value={hasPhoneCharger} onChange={setHasPhoneCharger} />
          <Toggle label="Delivery box"      value={hasDeliveryBox}  onChange={setHasDeliveryBox}  />
          <Toggle label="Delivers to hotel" value={deliversToHotel} onChange={setDeliversToHotel} />
          <Toggle label="Delivers to villa" value={deliversToVilla} onChange={setDeliversToVilla} />
          <Toggle label="Pickup / dropoff"  value={pickupDropoff}   onChange={setPickupDropoff}   />
        </div>

        <button
          type="button"
          onClick={async () => {
            const ok = await onSave({
              has_phone_holder:  hasPhoneHolder,
              has_phone_charger: hasPhoneCharger,
              has_delivery_box:  hasDeliveryBox,
              delivers_to_hotel: deliversToHotel,
              delivers_to_villa: deliversToVilla,
              pickup_dropoff:    pickupDropoff,
            })
            if (ok) { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }
          }}
          className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 text-white border border-orange-500 text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.99] hover:bg-orange-600 transition min-h-[44px]"
        >
          Save delivery
        </button>
      </Section>

      {/* Marquee */}
      <Section title="Running text (marquee under photos)" icon={<Megaphone size={16} strokeWidth={2.5} />}>
        <PromoTextEditor
          value={provider.promo_text ?? ''}
          onChange={(v) => onSave({ promo_text: v || null })}
          themeColor={theme}
        />
      </Section>

      {/* Quick links */}
      <Section title="More" icon={<MoreHorizontal size={16} strokeWidth={2.5} />}>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/rentals"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 text-black px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-gray-100 hover:border-orange-300 transition min-h-[44px]"
          >
            All my rentals
          </Link>
          {provider.slug && (
            <a
              href={`/rent/${provider.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 text-black px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider hover:bg-gray-100 hover:border-orange-300 transition min-h-[44px]"
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
            } as HeroText,
          })
          if (ok) {
            setSavedFlash(true)
            setTimeout(() => setSavedFlash(false), 1500)
          }
        }}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-white font-extrabold text-[14px] shadow-md active:scale-[0.98] transition"
        style={{ background: draftColor }}
      >
        Save banner
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
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== value) onChange(draft.trim().slice(0, 500))
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const display = (draft.trim() || 'Free hotel & villa delivery this week — Yogya & Bali. Pickup & dropoff included, English-speaking team standing by.') + ' ✦'

  return (
    <div className="space-y-2">
      <div className="overflow-hidden py-1.5 rounded-full" style={{ background: '#FEF9C3' }}>
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
        placeholder="Write your promo message — appears as scrolling text under your photos."
        className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none leading-snug"
      />
      <p className="text-[12px] text-black/60 leading-snug">
        Use this for time-limited offers — weekly discount, holiday tour rates,
        long-term lease deals. Tap a suggestion to drop it in.
      </p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {[
          'Weekly rental discount — book 7 days, get 1 day free',
          'Hotel & villa delivery free in Kuta + Seminyak this month',
          'Monthly lease specials — long-term riders save 25%',
          'Free 2nd helmet + raincoat included this week',
          'English-speaking owner — WhatsApp 24/7',
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

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
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
        onFocus={(e) => { e.currentTarget.select() }}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[14px] font-bold placeholder:text-black/35 placeholder:font-normal focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        style={{ color, textShadow: '0 0 1px rgba(0,0,0,0.15)' }}
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

function SpecField({
  label, value, onChange, placeholder, mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1.5 rounded-xl bg-gray-50 border border-gray-200 p-2.5">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg bg-white border border-gray-200 px-2.5 py-2 text-[13px] text-black placeholder:text-black/35 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label:   string
  value:   string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-1.5 rounded-xl bg-gray-50 border border-gray-200 p-2.5">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white border border-gray-200 px-2.5 py-2 text-[13px] text-black focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function PriceTile({
  label, value, onChange,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5 rounded-xl bg-gray-50 border border-gray-200 p-2.5">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">{label}</div>
      <div className="flex items-center gap-1">
        <span className="text-[12px] text-black/55 font-mono">Rp</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 rounded-lg bg-white border border-gray-200 px-2.5 py-2 text-[13px] text-black placeholder:text-black/35 font-mono focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </div>
    </div>
  )
}

function Toggle({
  label, value, onChange,
}: {
  label:    string
  value:    boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 hover:bg-gray-100 transition active:scale-[0.99] min-h-[44px]"
    >
      <span className="text-[13px] font-extrabold text-black">{label}</span>
      <span
        className="relative inline-flex h-5 w-9 rounded-full transition"
        style={{ background: value ? '#F97316' : 'rgba(0,0,0,0.12)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }}
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
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
}
