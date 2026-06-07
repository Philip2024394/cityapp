'use client'
import { useState } from 'react'
import CoverImageUploader from '@/components/kyc/CoverImageUploader'
import GalleryUploader    from '@/components/kyc/GalleryUploader'

// Shared editor for the mig 0072 "universal profile extras" — every
// service-provider dashboard mounts this same block, so a tukang adding
// a portfolio uses the exact same UI as a massage therapist.
//
// Field set:
//   cover_image_url     — 16:9 hero
//   gallery_image_urls  — up to 12 portfolio photos (DB CHECK)
//   instagram_url, tiktok_url, facebook_url
//   operating_hours     — { mon,tue,...,sun } each "HH:MM-HH:MM" or empty
//   certifications      — text[] freeform chips (one per line)
//   languages           — text[] of 2-letter codes (id, en, ko, ja, zh, …)
//
// Each field is OPTIONAL — caller's API decides which to accept.

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'mon', label: 'Senin' },
  { key: 'tue', label: 'Selasa' },
  { key: 'wed', label: 'Rabu' },
  { key: 'thu', label: 'Kamis' },
  { key: 'fri', label: 'Jumat' },
  { key: 'sat', label: 'Sabtu' },
  { key: 'sun', label: 'Minggu' },
]
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

const LANGS: Array<{ code: string; label: string }> = [
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'jv', label: 'Jawa' },
  { code: 'su', label: 'Sunda' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ru', label: 'Русский' },
]

export type UniversalProfileExtras = {
  cover_image_url?:    string | null
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  // mig 0130 — extra socials + custom domain
  x_url?:              string | null
  snapchat_url?:       string | null
  website_url?:        string | null
  // mig 0132 — chat handles
  telegram_handle?:    string | null
  wechat_id?:          string | null
  line_id?:            string | null
  kakaotalk_id?:       string | null
  // mig 0137 — public-page contact form opt-in
  contact_form_enabled?: boolean
  contact_email?:        string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
}

export default function UniversalProfileExtrasEditor({
  userId, value, onChange, hideGallery = false, hideCover = false, hideOperatingHours = false,
}: {
  userId: string
  value: UniversalProfileExtras
  onChange: (patch: UniversalProfileExtras) => void
  // bike_rentals already has its own `image_urls` photo array — the editor's
  // gallery block would collide with it. Setting hideGallery suppresses
  // ONLY the gallery UI; the API also drops gallery_image_urls server-side.
  hideGallery?: boolean
  // When the dashboard renders its own banner picker (e.g. handyman's
  // BannerLibraryPicker), set hideCover so the cover uploader inside
  // this editor doesn't duplicate the control. cover_image_url is still
  // pulled from `value` and saved by the dashboard — only the UI is hidden.
  hideCover?: boolean
  // Dashboards that render the dedicated WeeklyHoursEditor (beautician,
  // massage, etc.) set this to suppress the legacy text-input "Jam
  // operasional" block — otherwise the user sees two hours controls
  // editing the same operating_hours field.
  hideOperatingHours?: boolean
}) {
  // Local-shape projections — store hours as a flat object the UI can mutate.
  const hours = value.operating_hours || {}
  const certs = value.certifications  || []
  const langs = value.languages       || []

  const [certInput, setCertInput] = useState('')

  function setHour(d: DayKey, v: string) {
    const next = { ...hours, [d]: v }
    // Strip empty keys so we send null when fully cleared.
    const cleaned: Record<string, string> = {}
    for (const [k, val] of Object.entries(next)) if (val && val.trim()) cleaned[k] = val.trim()
    onChange({ ...value, operating_hours: Object.keys(cleaned).length ? cleaned : null })
  }

  function addCert() {
    const v = certInput.trim()
    if (!v) return
    if (certs.includes(v)) { setCertInput(''); return }
    onChange({ ...value, certifications: [...certs, v] })
    setCertInput('')
  }

  function rmCert(i: number) {
    onChange({ ...value, certifications: certs.filter((_, j) => j !== i) })
  }

  function toggleLang(code: string) {
    const set = new Set(langs)
    if (set.has(code)) set.delete(code); else set.add(code)
    onChange({ ...value, languages: Array.from(set) })
  }

  return (
    <div className="space-y-4">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">
        Universal profile extras
      </div>

      {!hideCover && (
        <CoverImageUploader
          userId={userId}
          value={value.cover_image_url ?? null}
          onChange={(v) => onChange({ ...value, cover_image_url: v })}
        />
      )}

      {!hideGallery && (
        <GalleryUploader
          userId={userId}
          value={value.gallery_image_urls ?? []}
          onChange={(v) => onChange({ ...value, gallery_image_urls: v })}
        />
      )}

      {/* Socials */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black">
          Social links (optional)
        </div>
        <input type="url" placeholder="https://instagram.com/yourname" value={value.instagram_url ?? ''}
          onChange={(e) => onChange({ ...value, instagram_url: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="url" placeholder="https://tiktok.com/@yourname" value={value.tiktok_url ?? ''}
          onChange={(e) => onChange({ ...value, tiktok_url: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="url" placeholder="https://facebook.com/yourpage" value={value.facebook_url ?? ''}
          onChange={(e) => onChange({ ...value, facebook_url: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="url" placeholder="https://x.com/yourhandle" value={value.x_url ?? ''}
          onChange={(e) => onChange({ ...value, x_url: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="url" placeholder="https://snapchat.com/add/yourhandle" value={value.snapchat_url ?? ''}
          onChange={(e) => onChange({ ...value, snapchat_url: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="url" placeholder="https://your-domain.com" value={value.website_url ?? ''}
          onChange={(e) => onChange({ ...value, website_url: e.target.value.trim() || null })}
          className={inputCls} />
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black">
          Chat handles (optional) — WhatsApp lives in the main contact field
        </div>
        <input type="text" placeholder="Telegram — @handle, t.me URL, or +phone" value={value.telegram_handle ?? ''}
          onChange={(e) => onChange({ ...value, telegram_handle: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="text" placeholder="WeChat ID" value={value.wechat_id ?? ''}
          onChange={(e) => onChange({ ...value, wechat_id: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="text" placeholder="Line ID" value={value.line_id ?? ''}
          onChange={(e) => onChange({ ...value, line_id: e.target.value.trim() || null })}
          className={inputCls} />
        <input type="text" placeholder="KakaoTalk ID" value={value.kakaotalk_id ?? ''}
          onChange={(e) => onChange({ ...value, kakaotalk_id: e.target.value.trim() || null })}
          className={inputCls} />
      </div>

      {/* Contact form (mig 0137) — optional public form on the profile
          page. Toggle is disabled until contact_email has a value so
          the panel never renders without a destination. */}
      <div className="space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black">
          Contact form (optional)
        </div>
        <input
          type="email"
          placeholder="Email for notifications (you@example.com)"
          value={value.contact_email ?? ''}
          onChange={(e) => onChange({ ...value, contact_email: e.target.value.trim() || null })}
          className={inputCls}
        />
        <label className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-200 p-3 cursor-pointer">
          <span className="text-[13px] text-black/85">Show contact form on my public page</span>
          <input
            type="checkbox"
            checked={Boolean(value.contact_form_enabled)}
            onChange={(e) => onChange({ ...value, contact_form_enabled: e.target.checked })}
            disabled={!value.contact_email?.trim()}
            className="w-5 h-5"
          />
        </label>
      </div>

      {/* Operating hours — suppressed when the parent dashboard mounts
          its own WeeklyHoursEditor (avoids two surfaces editing the
          same operating_hours field). */}
      {!hideOperatingHours && (
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black">
          Jam operasional (optional)
        </div>
        <p className="text-[11px] text-black/55 leading-snug">
          Format: <span className="font-mono">09:00-18:00</span>. Kosongkan kalau hari libur.
        </p>
        <div className="space-y-1.5">
          {DAYS.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <div className="w-16 text-[12px] font-bold text-black/70">{d.label}</div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="09:00-18:00"
                value={hours[d.key] ?? ''}
                onChange={(e) => setHour(d.key, e.target.value)}
                className={inputCls + ' flex-1 text-[13px]'}
              />
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Certifications */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black">
          Sertifikasi (optional)
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="cth: BLK Massage Therapy"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert() } }}
            className={inputCls + ' flex-1'} />
          <button type="button" onClick={addCert}
            className="rounded-xl bg-[color:var(--accent,#FACC15)] text-white px-4 py-3 text-[13px] font-extrabold hover:brightness-95 transition">
            Tambah
          </button>
        </div>
        {certs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {certs.map((c, i) => (
              <span key={c + i} className="inline-flex items-center gap-1 text-[12px] font-extrabold text-black px-2.5 py-1 rounded-full bg-white border border-gray-200">
                {c}
                <button type="button" onClick={() => rmCert(i)} className="text-black/55 hover:text-black" aria-label="Hapus">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black">
          Bahasa (optional)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map((l) => {
            const on = langs.includes(l.code)
            return (
              <button key={l.code} type="button"
                onClick={() => toggleLang(l.code)}
                className={`text-[12px] font-extrabold px-3 py-1.5 rounded-full border transition ${
                  on
                    ? 'bg-[color:var(--accent,#FACC15)] text-white border-[color:var(--accent,#FACC15)]'
                    : 'bg-white text-black/80 border-gray-200 hover:bg-gray-50'
                }`}>
                {l.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-[color:var(--accent,#FACC15)] focus:ring-2 focus:ring-[color:var(--accent,#FACC15)]/30 min-h-[44px]'
