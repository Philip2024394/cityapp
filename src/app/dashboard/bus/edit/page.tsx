'use client'
// ============================================================================
// /dashboard/bus/edit — Page design (banner picker)
// ----------------------------------------------------------------------------
// Drivers pick the hero backdrop shown on their public /bus/[slug]
// profile. We persist to drivers.cover_image_url; null falls back to
// DEFAULT_CAR_HERO in DriverProfileShell.
//
// Out of scope for now: hero text, per-line colors, theme color. Driver
// public pages don't need that copy-customisation surface yet — keep
// this page scoped to what the customer actually sees on /bus/[slug].
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Upload, Pencil, ImageIcon, Link2,
  CheckCircle2, ExternalLink,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import { BUS_BANNERS, getDefaultBanner } from '@/lib/drivers/banners'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
type DriverRow = {
  user_id: string
  vehicle_type: string | null
  business_name: string | null
  slug: string | null
  cover_image_url: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; row: DriverRow }

// ============================================================================
// Page
// ============================================================================
export default function BusEditPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) { setState({ kind: 'ready', row: dev.driver as unknown as DriverRow }); return }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select('user_id, vehicle_type, business_name, slug, cover_image_url')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    setState({ kind: 'ready', row: data as unknown as DriverRow })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading page design…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/login?next=/dashboard/bus/edit', label: 'Sign in' }}>Sign in to edit your page design.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=bus', label: 'Create driver profile' }}>No driver profile yet.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load profile: {state.message}</FullPageMessage>

  return <EditShell row={state.row} onSaved={() => void reload()} />
}

// ============================================================================
// Shell — composed layout matching the beautician/edit reference
// ============================================================================
function EditShell({ row, onSaved }: { row: DriverRow; onSaved: () => void }) {
  const defaultBanner = useMemo(() => getDefaultBanner(row.vehicle_type), [row.vehicle_type])
  const effectiveCover = row.cover_image_url || defaultBanner
  const profileHref = row.slug ? `/bus/${row.slug}` : null

  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-24">
        <Link
          href="/dashboard/bus"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-4"
          style={{ minHeight: 44 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero strip — yellow gradient, mirrors beautician/edit pattern */}
        <div
          className="rounded-3xl p-5 sm:p-6 shadow-sm mb-4"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            color: '#0A0A0A',
            boxShadow: '0 12px 32px rgba(250,204,21,0.30)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FACC15] text-[#0A0A0A] flex items-center justify-center shadow-sm shrink-0">
              <Pencil size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] opacity-70">
                Page design
              </div>
              <h1 className="text-[22px] sm:text-[26px] font-black leading-tight truncate mt-0.5">
                Banner
              </h1>
              <p className="text-[12.5px] font-bold opacity-80 mt-1 leading-snug">
                Pick the hero image shown on your public profile.
              </p>
            </div>
          </div>
        </div>

        {/* Live preview of the public profile card hero */}
        <Section title="Preview" icon={<ImageIcon size={16} strokeWidth={2.5} />}>
          <div className="rounded-2xl overflow-hidden border border-black/10 bg-[#F4F4F5]">
            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectiveCover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
          {profileHref && (
            <Link
              href={profileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#EAB308] hover:text-[#0A0A0A] transition"
              style={{ minHeight: 44 }}
            >
              View live profile <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          )}
        </Section>

        {/* Banner picker — curated BUS_BANNERS + upload + paste URL */}
        <BannerPickerSection row={row} onSaved={onSaved} />
      </div>
    </main>
  )
}

// ----------------------------------------------------------------------------
// Banner picker section
// ----------------------------------------------------------------------------
function BannerPickerSection({ row, onSaved }: { row: DriverRow; onSaved: () => void }) {
  const [selected, setSelected] = useState<string | null>(row.cover_image_url ?? null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pastedUrl, setPastedUrl] = useState('')

  // Keep local selection in sync if the row reloads from upstream.
  useEffect(() => { setSelected(row.cover_image_url ?? null) }, [row.cover_image_url])

  const curatedUrls = useMemo(() => new Set(BUS_BANNERS.map((b) => b.url)), [])
  const customUrl = selected && !curatedUrls.has(selected) ? selected : null

  // Save-on-change: commits the new URL immediately when the driver
  // picks a thumbnail. Mirrors beautician/edit's auto-save pattern.
  const commit = useCallback(async (nextUrl: string | null) => {
    setError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setError('Supabase not configured.'); return false }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in.'); return false }
    setSaving(true)
    const { error } = await supabase
      .from('drivers')
      .update({ cover_image_url: nextUrl })
      .eq('user_id', user.id)
    setSaving(false)
    if (error) { setError(error.message); return false }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1400)
    onSaved()
    return true
  }, [onSaved])

  async function pickUrl(url: string | null) {
    setSelected(url)
    await commit(url)
  }

  async function handleFile(file: File) {
    setUploadError(null)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image too large — max 5MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) { setUploadError('Upload not available.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadError('Sign-in required.'); return }
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${user.id}/banner-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('driver-banners')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) { setUploadError(error.message); setUploading(false); return }
      const { data: pub } = supabase.storage.from('driver-banners').getPublicUrl(path)
      setSelected(pub.publicUrl)
      await commit(pub.publicUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function applyPastedUrl() {
    const url = pastedUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setError('URL must start with http:// or https://')
      return
    }
    setSelected(url)
    setPastedUrl('')
    await commit(url)
  }

  return (
    <Section
      title="Banner image"
      icon={<ImageIcon size={16} strokeWidth={2.5} />}
      flash={savedFlash ? 'Saved' : null}
    >
      <p className="text-[13px] text-black/65 leading-snug">
        Tap a banner to set it. Changes save automatically.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Default option — null cover_image_url */}
        <BannerTile
          active={selected === null}
          onClick={() => void pickUrl(null)}
          label="Default"
        />

        {/* Custom uploaded / pasted banner (if any) */}
        {customUrl && (
          <BannerTile
            active
            onClick={() => void pickUrl(customUrl)}
            imageUrl={customUrl}
            badge="Custom"
          />
        )}

        {BUS_BANNERS.map((b) => (
          <BannerTile
            key={b.id}
            active={selected === b.url}
            onClick={() => void pickUrl(b.url)}
            imageUrl={b.url}
            ariaLabel={b.label || b.id}
          />
        ))}
      </div>

      {/* Upload your own banner — file picker. Auto-saves on success. */}
      <div className="pt-1">
        <label
          className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white text-black/80 px-4 py-2.5 text-[13px] font-extrabold cursor-pointer hover:bg-[#FFFBEA] hover:border-[#FACC15] transition"
          style={{ minHeight: 44 }}
          aria-disabled={uploading}
        >
          <Upload className="w-4 h-4" strokeWidth={2.5} />
          {uploading ? 'Uploading…' : 'Upload your own'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
        </label>
        {uploadError && (
          <p className="mt-2 text-[12px] font-bold text-red-600">{uploadError}</p>
        )}
      </div>

      {/* Paste URL — power-user escape hatch */}
      <div className="rounded-2xl bg-[#FAFAFA] border border-black/10 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-black/55">
          <Link2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          Or paste an image URL
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-xl bg-white border border-black/15 px-3 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-black/35 focus:outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/20"
            style={{ minHeight: 44 }}
          />
          <button
            type="button"
            onClick={() => void applyPastedUrl()}
            disabled={!pastedUrl.trim() || saving}
            className="shrink-0 rounded-xl bg-[#FACC15] text-[#0A0A0A] px-4 text-[12px] font-extrabold disabled:opacity-50 active:scale-[0.98] transition"
            style={{ minHeight: 44 }}
          >
            Apply
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[12px] font-bold text-red-600">{error}</p>
      )}
      {saving && (
        <p className="text-[12px] font-bold text-black/55 inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} /> Saving…
        </p>
      )}
    </Section>
  )
}

// ----------------------------------------------------------------------------
// Banner thumbnail tile
// ----------------------------------------------------------------------------
function BannerTile({
  active, onClick, imageUrl, label, badge, ariaLabel,
}: {
  active: boolean
  onClick: () => void
  imageUrl?: string
  label?: string
  badge?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel || label || 'Banner'}
      className="relative aspect-[16/9] rounded-xl overflow-hidden border-2 transition active:scale-[0.99]"
      style={{
        borderColor: active ? '#FACC15' : '#E4E4E7',
        boxShadow: active ? '0 4px 12px rgba(250,204,21,0.30)' : 'none',
        minHeight: 44,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] font-extrabold text-black/70 bg-gray-50">
          {label || 'Default'}
        </div>
      )}
      {badge && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white/85 text-[#0A0A0A] ring-1 ring-black/15">
          {badge}
        </span>
      )}
    </button>
  )
}

// ----------------------------------------------------------------------------
// Section card wrapper — yellow tinted icon to match beautician's pink one
// ----------------------------------------------------------------------------
function Section({
  title, icon, children, flash,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  flash?: string | null
}) {
  return (
    <section className="rounded-3xl bg-white border border-black/10 p-5 shadow-sm space-y-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
          {icon && (
            <span className="w-7 h-7 rounded-lg bg-[#FFFBEA] text-[#EAB308] flex items-center justify-center shrink-0 border border-[#FACC15]/45">
              {icon}
            </span>
          )}
          <span>{title}</span>
        </div>
        {flash && (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" strokeWidth={3} /> {flash}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// ----------------------------------------------------------------------------
// Full-page message shell — auth / error states
// ----------------------------------------------------------------------------
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
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </main>
  )
}
