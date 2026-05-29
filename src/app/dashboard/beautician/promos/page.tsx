'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Copy, Eye, MousePointerClick, Wand2, X, Loader2, Lock, Plus, Share2, Archive, RotateCcw, Tag } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { BEAUTICIAN_SERVICES_OFFERED, SERVICE_OFFERED_LABELS, type BeauticianServiceOffered, type BeauticianServicePhoto, type BeauticianProvider } from '@/lib/beautician/types'
import SharePreviewModal, { type SharePromo } from '@/components/dashboard/SharePreviewModal'
import { BADGE_CATALOGUE, BADGE_COLOR_OVERRIDES, type BadgeType } from '@/lib/badges'
import { countryByCode } from '@/lib/data/countries'

// /dashboard/beautician/promos — the AI promo-page builder + history.
// Beautician picks one of their existing service photos, gives a short
// headline, picks a tone, taps Generate. The API calls Claude, mints
// /p/{slug}, returns the new row. The list below shows every promo
// with view + click counters so she can see which one's working.

type Provider = BeauticianProvider & {
  service_photos?: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>> | null
  services_offered?: BeauticianServiceOffered[] | null
  cover_image_url?: string | null
}

type Promo = {
  id:                   string
  slug:                 string
  headline:             string
  ai_caption:           string
  ai_caption_short:     string | null
  hashtags_by_platform: Record<string, string[]> | null
  photo_url:            string
  view_count:           number
  click_count:          number
  created_at:           string
  archived_at:          string | null
}

type Limits = { monthlyCap: number; dailyCap: number; activeCap: number }

export default function BeauticianPromosPage() {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [promos,   setPromos]   = useState<Promo[]>([])
  const [tier,     setTier]     = useState<'free'|'pro'|'pro_plus'>('free')
  const [used,     setUsed]     = useState(0)
  const [limits,   setLimits]   = useState<Limits>({ monthlyCap: 0, dailyCap: 0, activeCap: 0 })
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, listRes] = await Promise.all([
        fetch('/api/beautician/me', { cache: 'no-store' }),
        fetch('/api/beautician/promo-pages', { cache: 'no-store' }),
      ])
      if (pRes.status === 401) { setErr('not_signed_in'); return }
      const pj   = await pRes.json() as { provider: Provider | null }
      const lj   = await listRes.json() as {
        promos: Promo[]
        tier:   'free'|'pro'|'pro_plus'
        used:   number
        limits: Limits
      }
      setProvider(pj.provider)
      setPromos(lj.promos ?? [])
      setTier(lj.tier)
      setUsed(lj.used)
      setLimits(lj.limits)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  if (loading) return <Shell><Loading /></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician/promos" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) return <Shell><div className="px-4 pt-20 text-center text-black/70">No beautician profile yet.</div></Shell>

  const remaining = Math.max(0, limits.monthlyCap - used)
  const canCreate = tier !== 'free' && remaining > 0

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        {/* Brand header */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Wand2 size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Promo pages</h1>
                <span className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                  tier === 'free' ? 'text-gray-600 bg-gray-100 border-gray-200'
                  : tier === 'pro_plus' ? 'text-amber-700 bg-amber-100 border-amber-200'
                  :                       'text-pink-600 bg-pink-100 border-pink-200'
                }`}>
                  {tier === 'free' ? 'Free' : tier === 'pro_plus' ? 'Pro+' : 'Pro'}
                </span>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Create a shareable AI promo page from any service photo. Share the link on Instagram, WhatsApp, Facebook.
              </p>
            </div>
          </div>
        </div>

        {/* Usage strip */}
        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm mb-4">
          {tier === 'free' ? (
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-black text-black">Upgrade to unlock AI promos</div>
                <p className="text-[12px] text-black/55 leading-snug">Pro gives you 20 AI promos / month, Pro+ gives 100.</p>
              </div>
              <Link href="/beautician/upgrade" className="rounded-full bg-pink-500 text-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider whitespace-nowrap">Upgrade</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[14px] font-black text-black">{used} / {limits.monthlyCap} promos this month</div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  disabled={!canCreate}
                  className="inline-flex items-center gap-1.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] transition"
                >
                  <Plus size={14} strokeWidth={3} />
                  New promo
                </button>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${Math.min(100, (used / Math.max(1, limits.monthlyCap)) * 100)}%` }}
                />
              </div>
              {!canCreate && remaining === 0 && (
                <p className="text-[12px] text-amber-700 mt-2">Monthly limit reached. Resets on the 1st.</p>
              )}
            </>
          )}
        </div>

        {/* Promo list — split into active + recently-archived sections.
            Archived rows can be restored within 7 days. */}
        <PromoListSections
          promos={promos}
          provider={provider}
          onUpdate={reload}
        />
        {false && promos.length === 0 ? (
          <div className="rounded-3xl bg-white border border-gray-200 p-8 text-center shadow-sm">
            <Sparkles className="w-10 h-10 text-pink-200 mx-auto mb-3" strokeWidth={2} />
            <h2 className="text-[16px] font-black text-black">No promos yet</h2>
            <p className="text-[13px] text-black/55 leading-snug mt-1 max-w-sm mx-auto">
              Tap <strong>New promo</strong> to generate your first shareable page from one of your service photos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* legacy unreached branch — PromoListSections renders above */}
            {null}
          </div>
        )}
      </div>

      {createOpen && (
        <CreatePromoModal
          provider={provider}
          onClose={() => setCreateOpen(false)}
          onCreated={(newOne) => {
            setCreateOpen(false)
            setPromos((cur) => [newOne, ...cur])
            setUsed((n) => n + 1)
          }}
        />
      )}
    </Shell>
  )
}

const UNDO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function PromoListSections({ promos, provider, onUpdate }: {
  promos:   Promo[]
  provider: Provider
  onUpdate: () => void
}) {
  const themeColor = (provider as Provider & { theme_color?: string | null }).theme_color || '#EC4899'
  const active   = promos.filter((p) => !p.archived_at)
  const archived = promos
    .filter((p) => p.archived_at && (Date.now() - new Date(p.archived_at).getTime()) <= UNDO_WINDOW_MS)
    .sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''))
  const [showArchived, setShowArchived] = useState(false)

  if (active.length === 0 && archived.length === 0) {
    return (
      <div className="rounded-3xl bg-white border border-gray-200 p-8 text-center shadow-sm">
        <Sparkles className="w-10 h-10 text-pink-200 mx-auto mb-3" strokeWidth={2} />
        <h2 className="text-[16px] font-black text-black">No promos yet</h2>
        <p className="text-[13px] text-black/55 leading-snug mt-1 max-w-sm mx-auto">
          Tap <strong>New promo</strong> to generate your first shareable page from one of your service photos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {active.map((p) => (
        <PromoRow
          key={p.id}
          promo={p}
          providerName={provider.display_name}
          providerHandle={provider.slug}
          profileImageUrl={provider.profile_image_url ?? null}
          city={provider.city ?? null}
          themeColor={themeColor}
          onUpdate={onUpdate}
        />
      ))}

      {archived.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-black/65 px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-wider transition min-h-[44px]"
          >
            <Archive size={13} strokeWidth={2.5} />
            {showArchived ? 'Hide archived' : `Show ${archived.length} archived (≤7 days)`}
          </button>
          {showArchived && (
            <div className="space-y-2 mt-2">
              {archived.map((p) => (
                <ArchivedRow key={p.id} promo={p} onUpdate={onUpdate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ArchivedRow({ promo, onUpdate }: { promo: Promo; onUpdate: () => void }) {
  const [busy, setBusy] = useState(false)
  const daysLeft = Math.max(0, Math.ceil((UNDO_WINDOW_MS - (Date.now() - new Date(promo.archived_at ?? '').getTime())) / (24 * 60 * 60 * 1000)))

  async function restore() {
    setBusy(true)
    try {
      const r = await fetch(`/api/beautician/promo-pages/${promo.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ restore: true }),
      })
      if (!r.ok) {
        alert('Could not restore — the 7-day undo window may have expired.')
        return
      }
      onUpdate()
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-2.5 flex items-center gap-2.5 opacity-90">
      <img src={promo.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-100 grayscale" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-black text-black/70 truncate">{promo.headline}</div>
        <div className="text-[12px] text-black/45">Archived · {daysLeft} day{daysLeft === 1 ? '' : 's'} left to restore</div>
      </div>
      <button
        type="button"
        onClick={restore}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider disabled:opacity-50 transition min-h-[36px]"
      >
        <RotateCcw size={12} strokeWidth={2.5} />
        Restore
      </button>
    </div>
  )
}

function PromoRow({ promo, providerName, providerHandle, profileImageUrl, city, themeColor, onUpdate }: {
  promo:           Promo
  providerName:    string
  providerHandle:  string
  profileImageUrl: string | null
  city:            string | null
  themeColor:      string
  onUpdate:        () => void
}) {
  const [shareOpen, setShareOpen] = useState(false)

  async function archive() {
    if (!confirm('Archive this promo? The link will stop working.')) return
    await fetch(`/api/beautician/promo-pages/${promo.id}`, { method: 'DELETE' })
    onUpdate()
  }

  return (
    <div className="rounded-3xl bg-white border border-gray-200 p-3 shadow-sm">
      <div className="flex gap-3">
        <img src={promo.photo_url} alt="" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shrink-0 bg-gray-100" />
        <div className="flex-1 min-w-0 flex flex-col">
          <h3 className="text-[14px] font-black text-black leading-tight line-clamp-2">{promo.headline}</h3>
          <p className="text-[12px] text-black/55 line-clamp-2 mt-0.5 leading-snug">{promo.ai_caption}</p>
          <div className="mt-auto flex items-center gap-3 pt-1.5 text-[12px] font-bold text-black/70">
            <span className="inline-flex items-center gap-1"><Eye size={13} strokeWidth={2.5} /> {promo.view_count}</span>
            <span className="inline-flex items-center gap-1"><MousePointerClick size={13} strokeWidth={2.5} /> {promo.click_count}</span>
            {promo.view_count > 0 && (
              <span className="text-emerald-700">{Math.round((promo.click_count / promo.view_count) * 100)}% CTR</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-3 py-2 text-[12px] font-extrabold transition min-h-[40px]"
        >
          <Share2 size={13} strokeWidth={2.5} />
          Preview &amp; share
        </button>
        <a
          href={`/promo/${promo.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-black border border-gray-200 px-3 py-2 text-[12px] font-extrabold transition min-h-[40px]"
        >
          Open page
        </a>
        <button
          type="button"
          onClick={archive}
          aria-label="Archive"
          className="w-10 h-10 rounded-xl bg-white text-gray-500 hover:text-rose-600 border border-gray-200 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      {shareOpen && (
        <SharePreviewModal
          promo={promo as SharePromo}
          providerName={providerName}
          providerHandle={providerHandle}
          profileImageUrl={profileImageUrl}
          city={city}
          themeColor={themeColor}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Create modal — pick photo, headline, tone, generate.
// ─────────────────────────────────────────────────────────────────────

function CreatePromoModal({
  provider, onClose, onCreated,
}: {
  provider: Provider
  onClose:  () => void
  onCreated: (promo: Promo) => void
}) {
  const photos: Array<{ url: string; serviceLabel: string }> = []
  const sp = provider.service_photos ?? {}
  for (const sid of Object.keys(sp) as BeauticianServiceOffered[]) {
    const arr = sp[sid] ?? []
    const label = SERVICE_OFFERED_LABELS[sid] ?? sid
    for (const p of arr) {
      if (typeof p === 'string') photos.push({ url: p as unknown as string, serviceLabel: label })
      else if (p && typeof p === 'object' && typeof p.url === 'string') photos.push({ url: p.url, serviceLabel: label })
    }
  }
  if (provider.cover_image_url) photos.unshift({ url: provider.cover_image_url, serviceLabel: 'Cover' })

  const currencySym = countryByCode(
    (provider as Provider & { country_code?: string | null }).country_code ?? 'ID',
  ).currency_symbol

  const [photoUrl, setPhotoUrl]       = useState<string>(photos[0]?.url ?? '')
  const [headline, setHeadline]       = useState('')
  const [tone, setTone]               = useState<'professional'|'fun'|'luxury'>('professional')
  const [priceK, setPriceK]           = useState<string>('')         // thousands input
  const [badgeType, setBadgeType]     = useState<BadgeType | null>(null)
  const [badgeValue, setBadgeValue]   = useState<number>(20)         // for discount %
  const [badgeColor, setBadgeColor]   = useState<'red'|'yellow'|'black'|null>(null)
  const [busy, setBusy]               = useState(false)
  const [err,  setErr]                = useState<string | null>(null)

  async function generate() {
    if (!photoUrl || headline.trim().length < 3) {
      setErr('Pick a photo + write a headline.'); return
    }
    setBusy(true); setErr(null)
    const priceIdr = priceK.trim() === '' ? null : Math.max(0, Math.round(Number(priceK) * 1000))
    try {
      const r = await fetch('/api/beautician/promo-pages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          photo_url:   photoUrl,
          headline:    headline.trim(),
          tone,
          price_idr:   priceIdr,
          badge_type:  badgeType,
          badge_value: badgeType === 'discount' ? badgeValue : null,
          badge_color: badgeColor,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const msg = j?.error === 'monthly_cap_reached' ? 'Monthly limit reached.'
                  : j?.error === 'daily_cap_reached'   ? 'Daily limit reached — try again tomorrow.'
                  : j?.error === 'active_cap_reached'  ? 'Too many active promos — archive an old one first.'
                  : j?.error === 'tier_locked'         ? 'Pro subscription required.'
                  : j?.error === 'ai_failed'           ? 'AI service failed — try again.'
                  : 'Could not create promo.'
        setErr(msg); return
      }
      onCreated(j.promo as Promo)
    } catch {
      setErr('Network error.')
    } finally { setBusy(false) }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black text-black inline-flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-pink-500" strokeWidth={2.5} />
            New promo page
          </h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {photos.length === 0 ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[13px] text-amber-800 leading-snug">
              You don&apos;t have any service photos yet. Add some on{' '}
              <Link href="/dashboard/beautician/services" className="underline font-bold">Services & prices</Link>{' '}
              first, then come back.
            </div>
          ) : (
            <>
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-2">Pick a photo</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.map((p) => {
                    const on = photoUrl === p.url
                    return (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => setPhotoUrl(p.url)}
                        aria-pressed={on}
                        className={`relative rounded-xl overflow-hidden border-2 transition active:scale-[0.97] aspect-square ${
                          on ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-200'
                        }`}
                      >
                        <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 text-[10px] font-extrabold uppercase tracking-wider text-white bg-black/45 px-1.5 py-0.5 truncate">
                          {p.serviceLabel}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Headline</span>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Bridal makeup — weddings booked all of March"
                  className="mt-1 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[14px] text-black focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
                <span className="text-[11px] text-black/45 tabular-nums">{headline.length} / 120</span>
              </label>

              <div>
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 inline-block mb-2">Tone</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['professional','fun','luxury'] as const).map((t) => {
                    const on = tone === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        aria-pressed={on}
                        className={`rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider transition border min-h-[44px] ${
                          on ? 'bg-pink-500 text-white border-pink-500'
                             : 'bg-gray-50 text-black/70 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {t === 'fun' ? 'Fun' : t === 'luxury' ? 'Luxury' : 'Pro'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Optional price — shown as a {currency} pill on the promo
                  page next to the headline. Stored as full IDR but the
                  UI accepts ribuan (k). */}
              <label className="block">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Price (optional)</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-pink-500 pointer-events-none">{currencySym}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={9999}
                    value={priceK}
                    onChange={(e) => setPriceK(e.target.value)}
                    placeholder="e.g. 350"
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-9 pr-12 py-2.5 text-[14px] font-bold text-black focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-pink-500 pointer-events-none">k</span>
                </div>
                <span className="text-[11px] text-black/45">Leave blank to hide. Type 350 = {currencySym}&nbsp;350k.</span>
              </label>

              {/* Optional badge — corner-anchored sticker with running
                  glow on the photo. Same catalogue as the service-photo
                  editor so the visual language stays consistent. */}
              <div>
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 inline-block mb-2">Badge (optional)</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setBadgeType(null); setBadgeColor(null) }}
                    aria-pressed={badgeType === null}
                    className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full border min-h-[36px] transition ${
                      badgeType === null
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-black/70 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    No badge
                  </button>
                  {BADGE_CATALOGUE.map((def) => {
                    const on = badgeType === def.type
                    const display = def.display.replace('{value}', String(badgeValue))
                    return (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => setBadgeType(def.type)}
                        aria-pressed={on}
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-full border min-h-[36px] transition ${
                          on
                            ? `${def.bg} ${def.text} border-transparent`
                            : 'bg-gray-50 text-black/70 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Tag size={11} strokeWidth={2.5} />
                        {def.type === 'discount' ? `${badgeValue}% Off` : display}
                      </button>
                    )
                  })}
                </div>

                {/* Discount value input — appears only when 'discount' picked */}
                {badgeType === 'discount' && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/55">Discount</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={badgeValue}
                      onChange={(e) => {
                        const n = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 0))
                        setBadgeValue(n)
                      }}
                      className="w-14 rounded-lg bg-white border border-gray-200 px-2 py-1 text-[14px] font-bold text-black text-center focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                    />
                    <span className="text-[13px] font-extrabold text-pink-500">% OFF</span>
                  </div>
                )}

                {/* Colour override — only relevant when a badge is picked */}
                {badgeType && (
                  <div className="mt-2 flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-black/55 shrink-0">Color</span>
                    <button
                      type="button"
                      onClick={() => setBadgeColor(null)}
                      aria-pressed={badgeColor === null}
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full border min-h-[32px] transition ${
                        badgeColor === null
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'bg-white text-black/60 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Default
                    </button>
                    {(['red','yellow','black'] as const).map((c) => {
                      const on = badgeColor === c
                      const o = BADGE_COLOR_OVERRIDES[c]
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBadgeColor(c)}
                          aria-pressed={on}
                          aria-label={`${c} badge colour`}
                          className={`w-8 h-8 rounded-full ${o.bg} transition active:scale-[0.95] ${
                            on ? 'ring-2 ring-offset-2 ring-offset-gray-50 ring-gray-900' : 'ring-1 ring-gray-300'
                          }`}
                        />
                      )
                    })}
                  </div>
                )}
              </div>

              {err && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] px-3 py-2">{err}</div>
              )}

              <button
                type="button"
                onClick={generate}
                disabled={busy || !photoUrl || headline.trim().length < 3}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white px-5 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shadow-md min-h-[48px] transition"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" strokeWidth={2.5} />}
                {busy ? 'Generating…' : 'Generate with AI'}
              </button>
              <p className="text-[11px] text-black/45 text-center leading-snug">
                Takes ~3 seconds. The new page goes live immediately at /promo/&lt;slug&gt;.
              </p>
            </>
          )}
        </div>
      </div>
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
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
}
