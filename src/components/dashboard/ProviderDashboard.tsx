'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, Sparkles, Plus, X } from 'lucide-react'
import ThemeColorPicker from '@/components/dashboard/ThemeColorPicker'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import { PROPERTY_BANNER_LIBRARY, PROPERTY_BANNER_CATEGORIES } from '@/lib/property/banners'
import {
  CATEGORY_CONFIGS,
  type CategoryId,
  type CategoryConfig,
  type ServiceOption,
  type PricingField,
} from '@/lib/dashboard/categories'

// ============================================================================
// <ProviderDashboard category="…" />
// ----------------------------------------------------------------------------
// Shared WYSIWYG editor — same studio effects, swapping per-category config.
// Loads the signed-in user's row via /api/dashboard/<category>, saves the
// same way. Beautician's existing /dashboard/beautician/edit route keeps
// its bespoke editor; new mounts (places, massage, laundry, handyman,
// home-clean, tour, rent, property) use this component instead.
//
// Surfaces in v1 (this commit):
//   • Cover image URL editor
//   • Live hero overlay (line1 / line2 / tagline + effect + colors)
//   • Theme color picker
//   • Business name + promo marquee
//   • Instagram / TikTok / Facebook URLs
//
// Surfaces in follow-ups (TBD):
//   • Gallery uploader
//   • Service-photos editor (object vs array shape from config)
//   • Pricing tiles (config-driven)
//   • Services dropdown (config-driven)
// ============================================================================

type Row = Record<string, unknown>

type HeroText = {
  line1?:         string
  line2?:         string
  tagline?:       string
  color?:         string
  line1_color?:   string
  tagline_color?: string
  effect?:        'none' | 'shimmer' | 'dance' | 'underline'
}

const DEFAULT_THEME = '#FACC15'
const DEFAULT_HERO: Required<Pick<HeroText, 'line1' | 'line2' | 'tagline'>> = {
  line1:   'Professional',
  line2:   'Provider',
  tagline: 'Crafted for you',
}
const DEFAULT_HERO_IMAGE = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

export default function ProviderDashboard({ category }: { category: CategoryId }) {
  const config: CategoryConfig = CATEGORY_CONFIGS[category]
  const router = useRouter()

  const [row,     setRow]     = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/dashboard/${category}`, { cache: 'no-store' })
      if (r.status === 401) { router.replace(`/login?next=${config.dashboardBase}/edit`); return }
      if (r.ok) {
        const j = await r.json() as { row: Row | null }
        setRow(j.row)
      }
    } finally { setLoading(false) }
  }, [category, config.dashboardBase, router])
  useEffect(() => { void reload() }, [reload])

  // Save a partial patch and reflect in local state for instant preview.
  async function save(patch: Record<string, unknown>): Promise<boolean> {
    setSaving(true)
    try {
      const r = await fetch(`/api/dashboard/${category}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patch }),
      })
      const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { alert(j.error || 'Could not save.'); return false }
      setRow((prev) => prev ? { ...prev, ...patch } : prev)
      setSavedAt(Date.now())
      return true
    } finally { setSaving(false) }
  }

  if (loading) return <Shell><Loading /></Shell>
  if (!row) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center text-ink">
          <h1 className="text-[20px] font-black mb-2">
            Not registered as {config.display.title_en} yet
          </h1>
          <Link
            href={`${config.publicProfilePath.replace(/\/$/, '')}/signup`}
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block"
          >
            Register
          </Link>
        </div>
      </Shell>
    )
  }

  // Field-name-aware reads. Config maps logical → column for each table.
  const f = config.fields
  const themeColor = (row[f.themeColor] as string | null) || DEFAULT_THEME
  const heroText   = (row[f.heroText]   as HeroText | null) || {}
  const promoText  = (row[f.promoText]  as string | null) || ''
  const coverImage = (row[f.coverImage] as string | null) || DEFAULT_HERO_IMAGE
  const businessName = (row[f.businessName] as string | null) ?? (row[f.displayName] as string | null) ?? ''
  const igUrl = (row.instagram_url as string | null) || ''
  const ttUrl = (row.tiktok_url    as string | null) || ''
  const fbUrl = (row.facebook_url  as string | null) || ''

  return (
    <Shell>
      <div className="max-w-2xl mx-auto pt-3 pb-32 px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <Link
            href={config.dashboardBase}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink/70 hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 flex items-center gap-2">
            {saving ? <span className="opacity-70">Saving…</span>
              : savedAt ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="w-3 h-3" /> Saved</span>
              : 'Live editor'}
          </div>
        </div>

        <h1 className="text-[22px] font-black leading-tight mb-1">
          Edit your {config.display.title_en.toLowerCase()} profile
        </h1>
        <p className="text-[12px] text-ink/65 leading-snug mb-4">
          The hero preview below updates as you edit. Changes save automatically.
        </p>

        {/* ───── LIVE HERO PREVIEW ───── */}
        <HeroPreview
          coverImage={coverImage}
          heroText={heroText}
          themeColor={themeColor}
        />

        {/* ───── EDITOR SECTIONS ───── */}
        <div className="mt-6 space-y-4">

          <Section title="Cover Image">
            <TextField
              label="Cover image URL"
              value={coverImage}
              onSave={(v) => save({ [f.coverImage]: v })}
              placeholder="https://…"
            />
            <p className="text-[11px] text-ink/55 leading-snug mt-1">
              Use a wide landscape photo. Best 1600 × 900 or larger.
            </p>
            {(category === 'property-sale' || category === 'property-rent' || category === 'property-builder') && (
              <div className="mt-3 pt-3 border-t border-line">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 mb-2">
                  Or pick from the property banner library
                </div>
                <BannerLibraryPicker
                  themeHex={themeColor}
                  selected={coverImage === DEFAULT_HERO_IMAGE ? null : coverImage}
                  onChange={(url) => void save({ [f.coverImage]: url ?? '' })}
                  library={PROPERTY_BANNER_LIBRARY}
                  categories={PROPERTY_BANNER_CATEGORIES}
                  defaultThemeHex="#0EA5E9"
                  selectedAccentHex="#0EA5E9"
                />
              </div>
            )}
          </Section>

          <Section title="Hero Text">
            <TextField
              label="Line 1 (small top)"
              value={heroText.line1 ?? DEFAULT_HERO.line1}
              onSave={(v) => save({ [f.heroText]: { ...heroText, line1: v } })}
            />
            <TextField
              label="Line 2 (big bold)"
              value={heroText.line2 ?? DEFAULT_HERO.line2}
              onSave={(v) => save({ [f.heroText]: { ...heroText, line2: v } })}
            />
            <TextField
              label="Tagline"
              value={heroText.tagline ?? DEFAULT_HERO.tagline}
              onSave={(v) => save({ [f.heroText]: { ...heroText, tagline: v } })}
            />
            <EffectPicker
              value={(heroText.effect ?? 'none')}
              onChange={(effect) => save({ [f.heroText]: { ...heroText, effect } })}
            />
          </Section>

          <Section title="Theme Color">
            <ThemeColorPicker
              value={themeColor}
              onChange={(c) => save({ [f.themeColor]: c })}
            />
          </Section>

          <Section title="Business Details">
            <TextField
              label="Business / Display name"
              value={businessName}
              onSave={(v) => save({ [f.businessName]: v })}
            />
            <TextField
              label="Promo marquee (max 280 chars)"
              value={promoText}
              onSave={(v) => save({ [f.promoText]: v })}
              maxLength={280}
            />
          </Section>

          <Section title="Social Links">
            <TextField
              label="Instagram URL"
              value={igUrl}
              onSave={(v) => save({ instagram_url: v })}
              placeholder="https://instagram.com/…"
            />
            <TextField
              label="TikTok URL"
              value={ttUrl}
              onSave={(v) => save({ tiktok_url: v })}
              placeholder="https://tiktok.com/@…"
            />
            <TextField
              label="Facebook URL"
              value={fbUrl}
              onSave={(v) => save({ facebook_url: v })}
              placeholder="https://facebook.com/…"
            />
          </Section>

          {/* ───── GALLERY UPLOADER ───── */}
          <Section title="Gallery">
            <GalleryEditor
              urls={(row[f.gallery] as string[] | null) ?? []}
              onSave={(urls) => save({ [f.gallery]: urls })}
            />
          </Section>

          {/* ───── SERVICES DROPDOWN (config-driven) ───── */}
          <Section title={config.services.label_en}>
            <ServicePicker
              config={config}
              value={readServicesValue(row, config)}
              onSave={(next) => save({ [config.services.column]: next })}
            />
          </Section>

          {/* ───── DISCRIMINATOR (property listing_type) ───── */}
          {config.discriminator && (() => {
            const d = config.discriminator
            return (
              <Section title={d.label_en}>
                <DiscriminatorPicker
                  column={d.column}
                  options={d.options}
                  value={(row[d.column] as string | null) ?? null}
                  onSave={(v) => save({ [d.column]: v })}
                />
              </Section>
            )
          })()}

          {/* ───── PRICING TILES (config-driven) ───── */}
          {config.pricing.length > 0 && (
            <Section title="Pricing">
              <PricingTiles
                config={config}
                row={row}
                onSave={(patch) => save(patch)}
              />
            </Section>
          )}

          {/* ───── OPERATING HOURS (7-day grid) ───── */}
          <Section title="Operating Hours">
            <HoursEditor
              value={(row[f.operatingHours] as Record<string, string> | null) ?? {}}
              onSave={(v) => save({ [f.operatingHours]: v })}
            />
          </Section>

          {/* ───── SERVICE PHOTOS — config picks object vs array shape ───── */}
          {f.servicePhotos && f.servicePhotosShape && (
            <Section title="Service Portfolio">
              <ServicePhotosEditor
                shape={f.servicePhotosShape}
                services={config.services.options}
                pickedServices={readServicesValue(row, config)}
                value={(row[f.servicePhotos] as ServicePhotosValue | null) ?? (f.servicePhotosShape === 'array' ? [] : {})}
                onSave={(next) => save({ [f.servicePhotos!]: next })}
              />
            </Section>
          )}

          {/* ───── PROPERTY-SPECIFIC FIELDS ───── */}
          {(category === 'property' || category === 'property-sale' || category === 'property-rent' || category === 'property-builder') && (
            <Section title="Property Details">
              <PropertyExtrasEditor row={row} onSave={save} />
            </Section>
          )}

          {/* ───── BUILDER-SPECIFIC FIELDS ───── */}
          {category === 'property-builder' && (
            <Section title="Development Details">
              <BuilderExtrasEditor row={row} onSave={save} />
            </Section>
          )}

          <p className="text-[11px] text-ink/55 leading-snug mt-2 text-center">
            All studio surfaces shipped. Real image-upload widget &amp; per-category extras land iteratively.
          </p>
        </div>
      </div>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Services value reader — handles both single-select (text) and
// multi-select (text[]) shapes per the config.
// ─────────────────────────────────────────────────────────────────────────
function readServicesValue(row: Row, config: CategoryConfig): string[] {
  const raw = row[config.services.column]
  if (config.services.type === 'single') {
    return typeof raw === 'string' && raw ? [raw] : []
  }
  return Array.isArray(raw) ? (raw as string[]) : []
}

// ─────────────────────────────────────────────────────────────────────────
// Local UI primitives
// ─────────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[100dvh] bg-bg text-ink pb-32">{children}</main>
}

function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 text-center text-ink/65 text-[13px]">
      Loading editor…
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white/[0.02] p-4">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 mb-3">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function TextField({
  label, value, onSave, placeholder, maxLength,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<boolean>
  placeholder?: string
  maxLength?: number
}) {
  const [local, setLocal]     = useState(value)
  const [dirty, setDirty]     = useState(false)
  useEffect(() => { setLocal(value); setDirty(false) }, [value])

  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-ink/65 mb-1">{label}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={local}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => { setLocal(e.target.value); setDirty(true) }}
          onBlur={() => { if (dirty) void onSave(local).then(() => setDirty(false)) }}
          className="flex-1 min-h-[40px] rounded-lg border border-line bg-bg px-3 text-[13px] focus:border-brand focus:outline-none"
        />
        {dirty && (
          <button
            type="button"
            onClick={() => void onSave(local).then(() => setDirty(false))}
            className="rounded-lg bg-brand text-bg px-3 text-[12px] font-extrabold"
          >Save</button>
        )}
      </div>
    </label>
  )
}

function EffectPicker({
  value, onChange,
}: {
  value: 'none' | 'shimmer' | 'dance' | 'underline'
  onChange: (v: 'none' | 'shimmer' | 'dance' | 'underline') => void
}) {
  const opts: Array<{ id: 'none' | 'shimmer' | 'dance' | 'underline'; label: string }> = [
    { id: 'none',      label: 'None' },
    { id: 'shimmer',   label: 'Shimmer' },
    { id: 'dance',     label: 'Dance' },
    { id: 'underline', label: 'Underline' },
  ]
  return (
    <div>
      <div className="text-[11px] font-bold text-ink/65 mb-1">Hero animation</div>
      <div className="flex gap-2 flex-wrap">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`min-h-[36px] px-3 rounded-full text-[12px] font-extrabold border transition ${
              value === o.id
                ? 'bg-brand text-bg border-brand'
                : 'bg-bg text-ink/70 border-line hover:border-ink/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Gallery editor — array of URLs with add / remove. v1 takes raw URLs
// (paste from ImageKit / Supabase Storage). Upload widget can replace
// this later without changing the row shape.
// ─────────────────────────────────────────────────────────────────────────
function GalleryEditor({
  urls, onSave,
}: { urls: string[]; onSave: (next: string[]) => Promise<boolean> }) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v) return
    void onSave([...urls, v]).then((ok) => { if (ok) setDraft('') })
  }
  function remove(i: number) {
    const next = urls.filter((_, idx) => idx !== i)
    void onSave(next)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {urls.map((u, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden border border-line bg-bg aspect-square">
            <img src={u} alt="" className="block w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white inline-flex items-center justify-center"
              aria-label="Remove"
            ><X className="w-3 h-3" /></button>
          </div>
        ))}
        {urls.length === 0 && (
          <div className="col-span-3 text-[12px] text-ink/55 py-4 text-center">
            No photos yet — paste an image URL below to add one.
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder="https://… (paste a photo URL)"
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 min-h-[40px] rounded-lg border border-line bg-bg px-3 text-[13px] focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-brand text-bg px-3 min-h-[40px] text-[12px] font-extrabold inline-flex items-center gap-1"
        ><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Service picker — single or multi from config catalogue, optional max cap.
// ─────────────────────────────────────────────────────────────────────────
function ServicePicker({
  config, value, onSave,
}: {
  config: CategoryConfig
  value: string[]
  onSave: (next: string | string[]) => Promise<boolean>
}) {
  const { options, type, maxSelected } = config.services
  const isSelected = (id: string) => value.includes(id)

  function toggle(id: string) {
    if (type === 'single') {
      void onSave(id)
      return
    }
    const has = value.includes(id)
    let next: string[]
    if (has) next = value.filter((x) => x !== id)
    else {
      if (maxSelected && value.length >= maxSelected) return
      next = [...value, id]
    }
    void onSave(next)
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {options.map((opt: ServiceOption) => {
          const sel = isSelected(opt.id)
          const atCap = type === 'multi' && !!maxSelected && value.length >= maxSelected && !sel
          return (
            <button
              key={opt.id}
              type="button"
              disabled={atCap}
              onClick={() => toggle(opt.id)}
              className={`min-h-[44px] px-3 rounded-xl text-[12px] font-extrabold border transition text-left ${
                sel
                  ? 'bg-brand text-bg border-brand'
                  : atCap
                  ? 'bg-bg text-ink/30 border-line cursor-not-allowed'
                  : 'bg-bg text-ink/80 border-line hover:border-ink/40'
              }`}
              aria-pressed={sel}
            >
              <span className="block">{opt.label_en}</span>
              <span className="block text-[10px] font-bold opacity-70">{opt.label_id}</span>
            </button>
          )
        })}
      </div>
      {type === 'multi' && maxSelected && (
        <p className="text-[10px] text-ink/55 mt-2">
          Max {maxSelected} selected. {value.length}/{maxSelected} chosen.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Discriminator (property listing_type) — single select pill row.
// ─────────────────────────────────────────────────────────────────────────
function DiscriminatorPicker({
  column, options, value, onSave,
}: {
  column: string
  options: ServiceOption[]
  value: string | null
  onSave: (v: string) => Promise<boolean>
}) {
  return (
    <div className="flex gap-2 flex-wrap" data-column={column}>
      {options.map((o) => {
        const sel = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => void onSave(o.id)}
            className={`min-h-[44px] px-4 rounded-full text-[12px] font-extrabold border transition ${
              sel
                ? 'bg-brand text-bg border-brand'
                : 'bg-bg text-ink/70 border-line hover:border-ink/40'
            }`}
            aria-pressed={sel}
          >
            {o.label_en} <span className="opacity-70">· {o.label_id}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Pricing tiles — config drives which fields appear. Discriminator
// (property listing_type) gates `showWhen` rules.
// ─────────────────────────────────────────────────────────────────────────
function PricingTiles({
  config, row, onSave,
}: {
  config: CategoryConfig
  row: Row
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const discriminatorValue = config.discriminator
    ? (row[config.discriminator.column] as string | null)
    : null

  const visible = config.pricing.filter((p) => isFieldVisible(p, discriminatorValue))

  if (visible.length === 0) {
    return (
      <p className="text-[12px] text-ink/55">
        {config.discriminator
          ? `Pick a ${config.discriminator.label_en.toLowerCase()} above to see pricing fields.`
          : 'No pricing fields configured.'}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {visible.map((field) => (
        <PriceTile
          key={field.column}
          field={field}
          value={(row[field.column] as number | null) ?? null}
          onSave={(v) => onSave({ [field.column]: v })}
        />
      ))}
    </div>
  )
}

function isFieldVisible(field: PricingField, discriminatorValue: string | null): boolean {
  if (!field.showWhen) return true
  for (const [k, expected] of Object.entries(field.showWhen)) {
    if (!discriminatorValue) return false
    const actual = discriminatorValue
    if (Array.isArray(expected) ? !expected.includes(actual) : actual !== expected) return false
    if (k !== 'listing_type') {
      // unsupported discriminator key for now — be conservative
      return false
    }
  }
  return true
}

function PriceTile({
  field, value, onSave,
}: {
  field: PricingField
  value: number | null
  onSave: (v: number | null) => Promise<boolean>
}) {
  const [local, setLocal] = useState<string>(value != null ? String(value) : '')
  const [dirty, setDirty] = useState(false)
  useEffect(() => { setLocal(value != null ? String(value) : ''); setDirty(false) }, [value])

  function commit() {
    if (!dirty) return
    const trimmed = local.trim()
    if (trimmed === '') { void onSave(null).then(() => setDirty(false)); return }
    const n = Number(trimmed.replace(/[^0-9]/g, ''))
    if (!Number.isFinite(n)) return
    void onSave(n).then(() => setDirty(false))
  }

  return (
    <label className="rounded-xl border border-line bg-bg p-3 flex flex-col gap-1">
      <span className="text-[11px] font-bold text-ink/65">
        {field.label} <span className="text-ink/40">({unitLabel(field.unit)})</span>
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-ink/55">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          value={local}
          placeholder="0"
          onChange={(e) => { setLocal(e.target.value); setDirty(true) }}
          onBlur={commit}
          className="flex-1 min-h-[36px] rounded-md border border-transparent bg-transparent text-[13px] font-bold focus:border-brand focus:outline-none focus:px-2"
        />
        {dirty && (
          <button
            type="button"
            onClick={commit}
            className="text-[10px] font-extrabold uppercase tracking-wider text-brand"
          >Save</button>
        )}
      </div>
    </label>
  )
}

function unitLabel(u: PricingField['unit']): string {
  switch (u) {
    case 'flat':        return 'flat'
    case 'per_kg':      return '/ kg'
    case 'per_hour':    return '/ hour'
    case 'per_day':     return '/ day'
    case 'per_sqm':     return '/ m²'
    case 'per_pair':    return '/ pair'
    case 'per_session': return '/ session'
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Operating hours — 7-day grid, HH:MM-HH:MM strings keyed by day.
// ─────────────────────────────────────────────────────────────────────────
const DAYS: Array<{ id: string; label: string }> = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

function HoursEditor({
  value, onSave,
}: {
  value: Record<string, string>
  onSave: (next: Record<string, string>) => Promise<boolean>
}) {
  function parse(range: string | undefined): { open: string; close: string } {
    if (!range) return { open: '', close: '' }
    const [a, b] = range.split('-').map((s) => s.trim())
    return { open: a ?? '', close: b ?? '' }
  }
  function setRange(dayId: string, open: string, close: string) {
    const next = { ...value }
    if (!open && !close) delete next[dayId]
    else next[dayId] = `${open}-${close}`
    void onSave(next)
  }
  return (
    <div className="space-y-1.5">
      {DAYS.map((d) => {
        const { open, close } = parse(value[d.id])
        return (
          <div key={d.id} className="grid grid-cols-[44px_1fr_1fr] items-center gap-2">
            <span className="text-[11px] font-bold text-ink/65">{d.label}</span>
            <input
              type="time"
              value={open}
              onChange={(e) => setRange(d.id, e.target.value, close)}
              className="min-h-[36px] rounded-md border border-line bg-bg px-2 text-[12px] focus:border-brand focus:outline-none"
            />
            <input
              type="time"
              value={close}
              onChange={(e) => setRange(d.id, open, e.target.value)}
              className="min-h-[36px] rounded-md border border-line bg-bg px-2 text-[12px] focus:border-brand focus:outline-none"
            />
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Service-photos editor — two shapes:
//   object: { service_id: [{url, name, description, price_idr}, ...] }
//   array:  [{url, name, description, price_idr}, ...]  (handyman, flat)
// ─────────────────────────────────────────────────────────────────────────
type ServicePhoto = {
  url:         string
  name?:       string
  description?: string
  price_idr?:   number | null
}
type ServicePhotosValue = ServicePhoto[] | Record<string, ServicePhoto[]>

function ServicePhotosEditor({
  shape, services, pickedServices, value, onSave,
}: {
  shape: 'object' | 'array'
  services: ServiceOption[]
  pickedServices: string[]
  value: ServicePhotosValue
  onSave: (next: ServicePhotosValue) => Promise<boolean>
}) {
  if (shape === 'array') {
    const photos = Array.isArray(value) ? value : []
    return (
      <PhotoArrayEditor
        photos={photos}
        onSave={(next) => onSave(next)}
      />
    )
  }

  // object shape — one bucket per picked service.
  const v = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? (value as Record<string, ServicePhoto[]>) : {}
  const visibleServices = pickedServices.length > 0
    ? services.filter((s) => pickedServices.includes(s.id))
    : services.slice(0, 3)

  if (visibleServices.length === 0) {
    return <p className="text-[12px] text-ink/55">Pick a service above to add portfolio photos.</p>
  }

  return (
    <div className="space-y-4">
      {visibleServices.map((s) => (
        <div key={s.id}>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/70 mb-2">
            {s.label_en} <span className="text-ink/40">· {s.label_id}</span>
          </div>
          <PhotoArrayEditor
            photos={v[s.id] ?? []}
            onSave={(next) => onSave({ ...v, [s.id]: next })}
          />
        </div>
      ))}
    </div>
  )
}

function PhotoArrayEditor({
  photos, onSave,
}: {
  photos: ServicePhoto[]
  onSave: (next: ServicePhoto[]) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<ServicePhoto>({ url: '', name: '', description: '', price_idr: null })

  function add() {
    if (!draft.url.trim()) return
    void onSave([...photos, draft]).then(() => {
      setDraft({ url: '', name: '', description: '', price_idr: null })
    })
  }
  function remove(i: number) {
    void onSave(photos.filter((_, idx) => idx !== i))
  }
  function update(i: number, patch: Partial<ServicePhoto>) {
    void onSave(photos.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  }

  return (
    <div className="space-y-2">
      {photos.map((p, i) => (
        <div key={i} className="rounded-xl border border-line bg-bg p-2 flex gap-2">
          {p.url && (
            <img src={p.url} alt="" className="w-16 h-16 object-cover rounded-md shrink-0" />
          )}
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              type="text"
              value={p.name ?? ''}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Name (e.g. Soft Glam)"
              className="w-full min-h-[32px] rounded-md border border-line bg-bg px-2 text-[12px] font-bold focus:border-brand focus:outline-none"
            />
            <textarea
              value={p.description ?? ''}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Description (≤ 500 chars)"
              rows={2}
              maxLength={500}
              className="w-full rounded-md border border-line bg-bg px-2 py-1 text-[11px] focus:border-brand focus:outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink/55 shrink-0">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={p.price_idr != null ? String(p.price_idr) : ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^0-9]/g, ''))
                  update(i, { price_idr: Number.isFinite(n) && n > 0 ? n : null })
                }}
                placeholder="Start price"
                className="flex-1 min-h-[28px] rounded-md border border-line bg-bg px-2 text-[12px] focus:border-brand focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 w-7 h-7 rounded-full bg-black/70 text-white inline-flex items-center justify-center self-start"
            aria-label="Remove"
          ><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <div className="rounded-xl border border-dashed border-line p-2 space-y-1.5">
        <input
          type="text"
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          placeholder="https://… (photo URL)"
          className="w-full min-h-[32px] rounded-md border border-line bg-bg px-2 text-[12px] focus:border-brand focus:outline-none"
        />
        <input
          type="text"
          value={draft.name ?? ''}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Name"
          className="w-full min-h-[32px] rounded-md border border-line bg-bg px-2 text-[12px] focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.url.trim()}
          className="w-full min-h-[36px] rounded-md bg-brand text-bg text-[12px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-1"
        ><Plus className="w-3.5 h-3.5" /> Add photo</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Property extras — only mounted when category === 'property'. Captures
// bedrooms / bathrooms / sqm / certificate / furnished / parking / KPR /
// flood zone / expat-friendly. Indonesia-specific real-estate fields.
// ─────────────────────────────────────────────────────────────────────────
const CERTIFICATE_TYPES = ['SHM','HGB','SHGB','Strata','Girik','AJB'] as const
const FURNISHED_OPTIONS = [
  { id: 'unfurnished', label: 'Unfurnished' },
  { id: 'semi',        label: 'Semi-furnished' },
  { id: 'fully',       label: 'Fully furnished' },
] as const
const FLOOD_OPTIONS = [
  { id: 'none',       label: 'None' },
  { id: 'occasional', label: 'Occasional' },
  { id: 'frequent',   label: 'Frequent' },
] as const
const WATER_OPTIONS = [
  { id: 'PDAM', label: 'PDAM' },
  { id: 'well', label: 'Well' },
  { id: 'both', label: 'Both' },
] as const

function PropertyExtrasEditor({
  row, onSave,
}: {
  row: Row
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  function set<K extends string>(key: K, value: unknown) {
    void onSave({ [key]: value })
  }

  const num = (k: string) => (row[k] as number | null) ?? null
  const str = (k: string) => (row[k] as string | null) ?? null
  const bool = (k: string) => (row[k] as boolean | null) ?? false

  return (
    <div className="space-y-4">
      {/* Numeric block */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <NumField label="Bedrooms"          value={num('bedrooms')}          onSave={(v) => set('bedrooms', v)} />
        <NumField label="Bathrooms"         value={num('bathrooms')}         onSave={(v) => set('bathrooms', v)} />
        <NumField label="Floors"            value={num('floors')}            onSave={(v) => set('floors', v)} />
        <NumField label="Land size (m²)"    value={num('land_size_sqm')}     onSave={(v) => set('land_size_sqm', v)} step={1} />
        <NumField label="Building size (m²)" value={num('building_size_sqm')} onSave={(v) => set('building_size_sqm', v)} step={1} />
        <NumField label="Year built"        value={num('year_built')}        onSave={(v) => set('year_built', v)} />
        <NumField label="Parking (cars)"    value={num('parking_cars')}      onSave={(v) => set('parking_cars', v)} />
        <NumField label="Parking (bikes)"   value={num('parking_bikes')}     onSave={(v) => set('parking_bikes', v)} />
        <NumField label="Electricity (VA)"  value={num('electricity_va')}    onSave={(v) => set('electricity_va', v)} />
      </div>

      {/* Pills: certificate */}
      <PillRow
        label="Certificate"
        value={str('certificate_type')}
        options={CERTIFICATE_TYPES.map((c) => ({ id: c, label: c }))}
        onSave={(v) => set('certificate_type', v)}
      />

      {/* Pills: furnished */}
      <PillRow
        label="Furnished"
        value={str('furnished')}
        options={FURNISHED_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        onSave={(v) => set('furnished', v)}
      />

      {/* Pills: flood zone */}
      <PillRow
        label="Flood zone"
        value={str('flood_zone')}
        options={FLOOD_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        onSave={(v) => set('flood_zone', v)}
      />

      {/* Pills: water source */}
      <PillRow
        label="Water source"
        value={str('water_source')}
        options={WATER_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        onSave={(v) => set('water_source', v)}
      />

      {/* Boolean toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <BoolPill label="Pool"           value={bool('has_pool')}        onSave={(v) => set('has_pool',        v)} />
        <BoolPill label="Garden"         value={bool('has_garden')}      onSave={(v) => set('has_garden',      v)} />
        <BoolPill label="KPR eligible"   value={bool('kpr_eligible')}    onSave={(v) => set('kpr_eligible',    v)} />
        <BoolPill label="Expat friendly" value={bool('expat_friendly')}  onSave={(v) => set('expat_friendly',  v)} />
      </div>

      {/* Long URLs */}
      <div className="space-y-2">
        <TextField label="Drone shot URL"    value={str('drone_url')        ?? ''} onSave={(v) => onSave({ drone_url:        v })} placeholder="https://…" />
        <TextField label="Virtual tour URL"  value={str('virtual_tour_url') ?? ''} onSave={(v) => onSave({ virtual_tour_url: v })} placeholder="https://…" />
        <TextField label="Video URL"         value={str('video_url')        ?? ''} onSave={(v) => onSave({ video_url:        v })} placeholder="https://…" />
      </div>
    </div>
  )
}

function NumField({
  label, value, onSave, step = 1,
}: {
  label: string
  value: number | null
  onSave: (v: number | null) => void
  step?: number
}) {
  const [local, setLocal] = useState<string>(value != null ? String(value) : '')
  const [dirty, setDirty] = useState(false)
  useEffect(() => { setLocal(value != null ? String(value) : ''); setDirty(false) }, [value])

  function commit() {
    if (!dirty) return
    const t = local.trim()
    if (t === '') { onSave(null); setDirty(false); return }
    const n = Number(t.replace(/[^0-9.]/g, ''))
    if (Number.isFinite(n)) onSave(n)
    setDirty(false)
  }
  return (
    <label className="block">
      <span className="block text-[10px] font-bold text-ink/65 mb-1">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={local}
        step={step}
        placeholder="—"
        onChange={(e) => { setLocal(e.target.value); setDirty(true) }}
        onBlur={commit}
        className="w-full min-h-[36px] rounded-md border border-line bg-bg px-2 text-[12px] font-bold focus:border-brand focus:outline-none"
      />
    </label>
  )
}

function PillRow({
  label, value, options, onSave,
}: {
  label: string
  value: string | null
  options: Array<{ id: string; label: string }>
  onSave: (v: string | null) => void
}) {
  return (
    <div>
      <div className="text-[10px] font-bold text-ink/65 mb-1">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => {
          const sel = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSave(sel ? null : o.id)}
              className={`min-h-[32px] px-3 rounded-full text-[11px] font-extrabold border transition ${
                sel ? 'bg-brand text-bg border-brand' : 'bg-bg text-ink/70 border-line hover:border-ink/40'
              }`}
              aria-pressed={sel}
            >{o.label}</button>
          )
        })}
      </div>
    </div>
  )
}

function BoolPill({
  label, value, onSave,
}: {
  label: string
  value: boolean
  onSave: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSave(!value)}
      aria-pressed={value}
      className={`min-h-[40px] px-3 rounded-xl text-[12px] font-extrabold border transition text-left ${
        value ? 'bg-brand text-bg border-brand' : 'bg-bg text-ink/70 border-line hover:border-ink/40'
      }`}
    >
      <span className="block text-[10px] font-bold opacity-70 uppercase tracking-wider">
        {value ? 'Yes' : 'No'}
      </span>
      <span className="block">{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Builder-only extras — developer name, units, completion date, NUP.
// Mounted only when category === 'property-builder'.
// ─────────────────────────────────────────────────────────────────────────
function BuilderExtrasEditor({
  row, onSave,
}: { row: Row; onSave: (patch: Record<string, unknown>) => Promise<boolean> }) {
  const developer       = (row.developer_name as string | null) ?? ''
  const completionDate  = (row.completion_date as string | null) ?? ''
  const unitsTotal      = (row.units_total     as number | null)
  const unitsAvailable  = (row.units_available as number | null)

  return (
    <div className="space-y-3">
      <TextField
        label="Developer name"
        value={developer}
        onSave={(v) => onSave({ developer_name: v })}
        placeholder="e.g. Renon Land Group"
      />
      <label className="block">
        <span className="block text-[11px] font-bold text-ink/65 mb-1">Estimated completion date</span>
        <input
          type="date"
          value={completionDate}
          onChange={(e) => void onSave({ completion_date: e.target.value || null })}
          className="w-full min-h-[40px] rounded-lg border border-line bg-bg px-3 text-[13px] focus:border-brand focus:outline-none"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Total units"
          value={unitsTotal}
          onSave={(v) => void onSave({ units_total: v })}
        />
        <NumField
          label="Units available"
          value={unitsAvailable}
          onSave={(v) => void onSave({ units_available: v })}
        />
      </div>
    </div>
  )
}

function HeroPreview({
  coverImage, heroText, themeColor,
}: {
  coverImage: string
  heroText: HeroText
  themeColor: string
}) {
  const line1   = heroText.line1   ?? DEFAULT_HERO.line1
  const line2   = heroText.line2   ?? DEFAULT_HERO.line2
  const tagline = heroText.tagline ?? DEFAULT_HERO.tagline
  const line2Color   = heroText.color         ?? themeColor
  const line1Color   = heroText.line1_color   ?? '#000000'
  const taglineColor = heroText.tagline_color ?? '#000000'

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line bg-black/40">
      <img
        src={coverImage}
        alt=""
        aria-hidden
        className="block w-full aspect-[16/9] object-cover"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-gradient-to-b from-transparent via-black/10 to-black/40">
        <span
          className="text-[13px] sm:text-[15px] font-bold leading-tight"
          style={{ color: line1Color }}
        >{line1}</span>
        <span
          className="text-[40px] sm:text-[56px] font-black leading-[0.95] tracking-tight"
          style={{ color: line2Color }}
        >{line2}</span>
        <span
          className="text-[12px] sm:text-[14px] italic mt-1"
          style={{ color: taglineColor }}
        >{tagline}</span>
      </div>
      <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-white bg-black/60 px-2 py-1 rounded-full">
        <Sparkles className="w-3 h-3" /> Live preview
      </div>
    </div>
  )
}
