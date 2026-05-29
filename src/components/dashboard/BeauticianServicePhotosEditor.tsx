'use client'
import { useState } from 'react'
import { Upload, X, Plus, ChevronDown, Tag } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  BEAUTICIAN_SERVICES_OFFERED,
  type BeauticianServiceOffered,
  type BeauticianServicePhoto,
} from '@/lib/beautician/types'
import {
  BADGE_CATALOGUE,
  BADGE_COLOR_OVERRIDES,
  resolveBadge,
  type BadgeType,
  type ServicePhotoBadge,
} from '@/lib/badges'

// Per-service portfolio uploader. Each photo carries a name (header),
// a 500-char description, an optional start price, and an optional
// promotional badge (mig 0131 — Discount %, New, Appointment Only,
// Low Stock, Bridal Special, Trending). The public /[slug] page
// renders these as carousel cards with a corner-anchored glow badge.
//
// Photos go into the same `profile-images` bucket as the avatar /
// cover / gallery — under a per-service subfolder.

const MAX_BYTES_PER_FILE = 6 * 1024 * 1024
const MIME_RE            = /^image\/(jpeg|jpg|png|webp)$/
const SLOTS_PER_SERVICE  = 4
const MAX_DESCRIPTION    = 500
const MAX_NAME           = 60

export default function BeauticianServicePhotosEditor({
  userId,
  servicesOffered,
  value,
  onChange,
  currencySymbol = 'Rp',
}: {
  userId: string
  servicesOffered: BeauticianServiceOffered[]
  value: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>>
  onChange: (next: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>>) => void
  /** Currency symbol from the provider's country (mig 0131). Defaults
   *  to Rp so legacy rows with no country_code still read correctly. */
  currencySymbol?: string
}) {
  if (servicesOffered.length === 0) {
    return (
      <div className="rounded-2xl bg-pink-50 border border-pink-200 p-4 text-[13px] text-black/75 leading-snug">
        Pick services in the &quot;Services I offer&quot; section above first — each selected service gets 4 photo slots here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {servicesOffered.map((sid) => (
        <ServiceSlotRow
          key={sid}
          sid={sid}
          userId={userId}
          photos={normalisePhotos(value[sid])}
          currencySymbol={currencySymbol}
          onChange={(photos) => onChange({ ...value, [sid]: photos })}
        />
      ))}
    </div>
  )
}

// Older rows stored just URLs as strings. Lift them into the rich shape
// so the editor can render the metadata fields without losing data.
function normalisePhotos(raw: unknown): BeauticianServicePhoto[] {
  if (!Array.isArray(raw)) return []
  const out: BeauticianServicePhoto[] = []
  for (const item of raw) {
    if (typeof item === 'string') out.push({ url: item })
    else if (item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string') {
      out.push(item as BeauticianServicePhoto)
    }
  }
  return out
}

function ServiceSlotRow({
  sid, userId, photos, onChange, currencySymbol,
}: {
  sid: BeauticianServiceOffered
  userId: string
  photos: BeauticianServicePhoto[]
  onChange: (photos: BeauticianServicePhoto[]) => void
  currencySymbol: string
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const remaining = Math.max(0, SLOTS_PER_SERVICE - photos.length)
  const label = BEAUTICIAN_SERVICES_OFFERED.find((s) => s.id === sid)?.label ?? sid

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (files.length > remaining) { setErr(`Can upload max ${remaining} more.`); return }
    for (const f of files) {
      if (f.size > MAX_BYTES_PER_FILE) { setErr(`"${f.name}" is too large (max 6MB).`); return }
      if (!MIME_RE.test(f.type))        { setErr(`"${f.name}" — JPG/PNG/WEBP only.`); return }
    }

    setUploading(true); setErr(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setErr('Not connected to server.'); setUploading(false); return }

    const uploaded: BeauticianServicePhoto[] = []
    for (const f of files) {
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/services/${sid}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) { setErr(`Upload of "${f.name}" failed: ${error.message}`); continue }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (pub?.publicUrl) uploaded.push({ url: pub.publicUrl })
    }
    setUploading(false)
    if (uploaded.length > 0) onChange([...photos, ...uploaded])
    e.target.value = ''
  }

  async function removeAt(idx: number) {
    const photo = photos[idx]
    if (!photo) return
    const supabase = getBrowserSupabase()
    if (supabase && photo.url.includes('/storage/v1/object/public/profile-images/')) {
      const i = photo.url.indexOf('/profile-images/')
      if (i !== -1) {
        const objectPath = photo.url.slice(i + '/profile-images/'.length)
        await supabase.storage.from('profile-images').remove([objectPath]).catch(() => {})
      }
    }
    onChange(photos.filter((_, j) => j !== idx))
  }

  function updateMeta(idx: number, patch: Partial<BeauticianServicePhoto> & { badge?: ServicePhotoBadge | null }) {
    onChange(photos.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  return (
    <div className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-black text-black">{label}</div>
        <div className="text-[12px] font-bold text-black/55 tabular-nums">{photos.length}/{SLOTS_PER_SERVICE}</div>
      </div>

      <div className="space-y-3">
        {photos.map((photo, i) => (
          <div
            key={photo.url + i}
            className="rounded-2xl bg-gray-50 border border-gray-200 p-3 space-y-2"
          >
            <div className="flex gap-3">
              <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-white">
                <img src={photo.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {/* Live badge preview — mirrors the public-profile render
                    so the owner sees the exact corner-anchored sticker
                    they'll publish, including the running glow. */}
                {(() => {
                  const badgeOnPhoto = (photo as BeauticianServicePhoto & { badge?: ServicePhotoBadge | null }).badge ?? null
                  const resolved = resolveBadge(badgeOnPhoto)
                  if (!resolved) return null
                  const animName = `cr-edit-badge-glow-${badgeOnPhoto?.color ?? resolved.def.type}`
                  return (
                    <>
                      <style>{`
                        @keyframes ${animName} {
                          0%, 100% { box-shadow: 0 0 0 0 ${resolved.def.glow}, 0 1px 3px rgba(0,0,0,0.25); }
                          50%      { box-shadow: 0 0 10px 3px ${resolved.def.glow}, 0 1px 3px rgba(0,0,0,0.25); }
                        }
                      `}</style>
                      <div
                        className={`absolute top-1.5 left-0 inline-flex items-center px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider rounded-r-md ${resolved.def.bg} ${resolved.def.text}`}
                        style={{ animation: `${animName} 2.4s ease-in-out infinite` }}
                        aria-hidden
                      >
                        {resolved.display}
                      </div>
                    </>
                  )
                })()}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Delete photo"
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-700 text-white border border-red-800 hover:bg-red-800 flex items-center justify-center shadow-sm transition z-10"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  maxLength={MAX_NAME}
                  value={photo.name ?? ''}
                  onChange={(e) => updateMeta(i, { name: e.target.value })}
                  placeholder="Name (e.g. Nail Art)"
                  className={inputCls}
                />
                <div className="relative">
                  <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-pink-500 pointer-events-none select-none">{currencySymbol}</span>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={photo.price_idr ? photo.price_idr / 1000 : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') { updateMeta(i, { price_idr: null }); return }
                      const n = Number(v)
                      if (Number.isFinite(n) && n >= 0 && n <= 9999) {
                        updateMeta(i, { price_idr: Math.round(n * 1000) })
                      }
                    }}
                    placeholder="Starting price (k)"
                    className={inputCls}
                    style={{ paddingLeft: `${(currencySymbol.length + 1) * 9 + 12}px`, paddingRight: '24px' }}
                  />
                  <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-pink-500 pointer-events-none select-none">k</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <textarea
                maxLength={MAX_DESCRIPTION}
                rows={2}
                value={photo.description ?? ''}
                onChange={(e) => updateMeta(i, { description: e.target.value })}
                placeholder="Description (max 500 chars)"
                className={inputCls + ' resize-none'}
              />
              <div className="text-[12px] text-black/45 text-right tabular-nums">
                {(photo.description ?? '').length}/{MAX_DESCRIPTION}
              </div>
            </div>

            {/* Promo badge — dropdown picker. When 'discount' is picked
                a numeric value appears for the percentage off. */}
            <BadgePicker
              badge={(photo as BeauticianServicePhoto & { badge?: ServicePhotoBadge | null }).badge ?? null}
              onChange={(badge) => updateMeta(i, { badge })}
            />
          </div>
        ))}

        {remaining > 0 && (
          <label className="block rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50/50 px-4 py-5 text-center text-pink-700 hover:bg-pink-50 hover:border-pink-400 transition cursor-pointer">
            {uploading
              ? <Upload className="w-4 h-4 inline animate-pulse" />
              : <Plus className="w-4 h-4 inline" strokeWidth={2.5} />}
            <span className="ml-1.5 text-[13px] font-extrabold">
              {uploading ? 'Uploading…' : `Add photo (${remaining} left)`}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={remaining > 1}
              onChange={pick}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
          {err}
        </div>
      )}
    </div>
  )
}

function BadgePicker({
  badge, onChange,
}: {
  badge: ServicePhotoBadge | null
  onChange: (next: ServicePhotoBadge | null) => void
}) {
  const [open, setOpen] = useState(false)
  const current = badge?.type ? BADGE_CATALOGUE.find((b) => b.type === badge.type) : null
  const label = current ? current.label : 'Add promo badge'

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] font-bold text-black hover:border-pink-300 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px] transition"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Tag className={`w-4 h-4 ${current ? 'text-pink-500' : 'text-black/45'}`} strokeWidth={2.5} />
          <span className={current ? 'text-black' : 'text-black/55'}>{label}</span>
          {current && badge?.type === 'discount' && (
            <span className="text-[12px] font-mono text-pink-600 ml-1">{badge.value ?? 0}%</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-black/55 transition ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] hover:bg-gray-50 text-black/70 border-b border-gray-200"
          >
            <X className="w-4 h-4 text-black/45" strokeWidth={2.5} />
            No badge
          </button>
          {BADGE_CATALOGUE.map((def) => {
            const on = badge?.type === def.type
            return (
              <button
                key={def.type}
                type="button"
                onClick={() => {
                  onChange(def.type === 'discount'
                    ? { type: 'discount', value: badge?.value ?? 20 }
                    : { type: def.type })
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] hover:bg-gray-50 transition ${on ? 'bg-pink-50' : ''}`}
              >
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white shrink-0 ${def.bg}`}>
                  {def.display.replace('{value}', '20')}
                </span>
                <span className="text-black/85 font-bold flex-1">{def.label}</span>
                {on && <span className="text-pink-600 text-[12px] font-extrabold">Active</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Discount value input — appears only when 'discount' is picked. */}
      {badge?.type === 'discount' && (
        <div className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2.5">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/55">Discount</span>
          <input
            type="number"
            min={1}
            max={99}
            value={badge.value ?? ''}
            onChange={(e) => {
              const v = e.target.value
              if (v === '') return
              const n = Math.max(1, Math.min(99, parseInt(v, 10) || 0))
              onChange({ ...badge, type: 'discount', value: n })
            }}
            className="w-16 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1.5 text-[14px] font-bold text-black text-center focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          />
          <span className="text-[14px] font-extrabold text-pink-500">% OFF</span>
        </div>
      )}

      {/* Colour override — three high-contrast options that take over
          the badge's bg/text/glow when set. Default = semantic colour
          of the badge type (red for discount, emerald for new, etc.).
          Mobile-friendly: 44px tap targets, generous gap, labels below
          each swatch so users don't confuse colours when fingers cover
          the buttons. */}
      {badge && (
        <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-2">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/55">Badge colour</div>
          <div className="flex items-end gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => onChange({ ...badge, color: undefined })}
              aria-pressed={!badge.color}
              className={`flex flex-col items-center gap-1.5 transition active:scale-[0.96] min-h-[44px]`}
            >
              <span
                className={`w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider ${
                  !badge.color
                    ? 'bg-pink-500 text-white ring-2 ring-offset-2 ring-offset-white ring-gray-900'
                    : 'bg-gray-50 text-black/55 ring-1 ring-gray-200'
                }`}
              >
                Auto
              </span>
              <span className={`text-[11px] font-bold ${!badge.color ? 'text-black' : 'text-black/55'}`}>Default</span>
            </button>
            {(['red','yellow','black'] as const).map((c) => {
              const on = badge.color === c
              const o = BADGE_COLOR_OVERRIDES[c]
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...badge, color: c })}
                  aria-pressed={on}
                  aria-label={`${c} badge colour`}
                  className="flex flex-col items-center gap-1.5 transition active:scale-[0.96] min-h-[44px]"
                >
                  <span
                    className={`w-11 h-11 rounded-full ${o.bg} ${
                      on ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-900' : 'ring-1 ring-gray-200'
                    }`}
                  />
                  <span className={`text-[11px] font-bold capitalize ${on ? 'text-black' : 'text-black/55'}`}>{c}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[12px] text-black/55 leading-snug">
            Preview shows on the photo above — change to see the badge update in real time.
          </p>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-[13px] text-black placeholder:text-black/35 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100'
