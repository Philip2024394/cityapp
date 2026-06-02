'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import {
  User, BookOpen, MapPin, Banknote, MessageCircle, Compass, Camera,
  Sun, Droplet, Sparkles, Flame, Snowflake, Award,
  Check, AlertCircle, Briefcase,
  type LucideIcon,
} from 'lucide-react'
import { INDONESIAN_CITIES } from '@/data/indonesianCities'
import type { FacialServiceOffered } from '@/lib/facial/types'

// 8-tile main-services picker. Each tile maps to one or more entries
// in our internal services_offered catalog. Max 3 picks total — the 3
// picked tiles also become the marketplace_categories so the facial
// provider shows up under the right filter groups on the public marketplace.
const MAIN_SERVICES: ReadonlyArray<{
  id:      string
  label:   string
  hint:    string
  icon:    LucideIcon
  /** services_offered IDs flipped on when this tile is selected. */
  fillsIn: FacialServiceOffered[]
}> = [
  { id: 'classic',  label: 'Classic Facial',  hint: 'Cleanse · tone · mask',         icon: Sun,       fillsIn: ['classic_facial'] },
  { id: 'deep',     label: 'Deep Cleansing',  hint: 'Extractions · pore care',       icon: Droplet,   fillsIn: ['deep_cleansing', 'extractions'] },
  { id: 'hydra',    label: 'Hydra Facial',    hint: 'Hydration · glow',              icon: Snowflake, fillsIn: ['hydra_facial', 'hydrating'] },
  { id: 'antiaging',label: 'Anti-Aging',      hint: 'Lifting · firming',             icon: Sparkles,  fillsIn: ['anti_aging', 'lifting'] },
  { id: 'bright',   label: 'Brightening',     hint: 'Whitening · radiance',          icon: Award,     fillsIn: ['brightening'] },
  { id: 'acne',     label: 'Acne Treatment',  hint: 'Spot care · purifying',         icon: Flame,     fillsIn: ['acne_treatment'] },
  { id: 'kbeauty',  label: 'K/J-Beauty',      hint: 'Korean & Japanese routines',    icon: Sun,       fillsIn: ['kbeauty', 'jbeauty'] },
  { id: 'mixed',    label: 'Mixed services',  hint: 'Combination treatments',        icon: Sparkles,  fillsIn: ['mixed'] },
]

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'signedIn'; userId: string; email: string | null }
  | { status: 'alreadyProvider' }

export default function FacialSignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      try {
        const r = await fetch('/api/facial/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider?: unknown }
          if (j.provider) {
            setAuth({ status: 'alreadyProvider' })
            setTimeout(() => router.replace('/dashboard/facial'), 400)
            return
          }
        }
      } catch { /* fall through */ }
      setAuth({ status: 'signedIn', userId: user.id, email: user.email ?? null })
    })
  }, [router])

  if (auth.status === 'loading') return <Shell><Loading /></Shell>
  if (auth.status === 'alreadyProvider') return <Shell><AlreadyProvider /></Shell>
  if (auth.status === 'anon') return <Shell><Gate /></Shell>
  return <Shell><Form userId={auth.userId} /></Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      <AppNav />
      {children}
    </main>
  )
}

function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
}
function AlreadyProvider() {
  return <div className="px-4 pt-20 max-w-md mx-auto text-center"><h1 className="text-[20px] font-black mb-2">Opening your dashboard…</h1></div>
}
function Gate() {
  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">
          Facial Pro
        </div>
        <h1 className="text-[26px] font-black leading-tight mb-3">Sign up as a facial pro</h1>
        <p className="text-[13px] text-ink/70 leading-relaxed">
          Create an account first — your facial profile is linked to it. Already have a rider, therapist, or customer login? Use the same one.
        </p>
      </div>
      <div className="space-y-3">
        <Link href="/signup?intent=facial&next=/facial/signup" className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105">
          Create new account
        </Link>
        <Link href="/login?next=/facial/signup" className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10">
          Sign in to existing account
        </Link>
      </div>
    </div>
  )
}

type ServiceType = 'mobile' | 'business' | 'both'

function Form({ userId }: { userId: string }) {
  const router = useRouter()
  const [f, setF] = useState({
    display_name: '',
    business_name: '',
    bio: '',
    main_services: [] as string[], // picked tile IDs (max 3)
    service_type: 'mobile' as ServiceType,
    price_60min_idr: '' as string,
    price_90min_idr: '' as string,
    price_120min_idr: '' as string,
    whatsapp_e164: '',
    city: '',
    service_area_notes: '',
    profile_image_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Missing-field validation: a Set<fieldKey> populated on submit when
  // required fields are empty. Used to:
  //   - Show a notification banner at the top listing what's missing
  //   - Highlight each empty field with a red border
  //   - Scroll to the first missing field on submit failure
  // Clears the field's miss flag as soon as the user edits it.
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    display_name:     useRef<HTMLDivElement | null>(null),
    business_name:    useRef<HTMLDivElement | null>(null),
    bio:              useRef<HTMLDivElement | null>(null),
    main_services:    useRef<HTMLDivElement | null>(null),
    whatsapp_e164:    useRef<HTMLDivElement | null>(null),
    city:             useRef<HTMLDivElement | null>(null),
    profile_image_url:useRef<HTMLDivElement | null>(null),
  }

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
    setErr(null)
    // Clear the miss flag for this field — user is fixing it.
    setMissing((prev) => {
      if (!prev.has(k as string)) return prev
      const next = new Set(prev)
      next.delete(k as string)
      return next
    })
  }
  /** Inputs are in THOUSANDS (k) for UX — user types 235 → stored as
   *  235,000 IDR. Display uses formatPriceIdr to render "Rp 235k" or
   *  "Rp 1.2jt" on the public profile. */
  function priceNum(v: string): number | null {
    const s = v.trim()
    if (!s) return null
    const n = Number(s)
    if (!Number.isFinite(n) || n < 0) return null
    return Math.round(n * 1000)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    // 1. Collect every missing required field into one Set so we can
    //    highlight all of them at once + scroll to the first one.
    const miss = new Set<string>()
    if (!f.display_name.trim() || f.display_name.trim().length < 2) miss.add('display_name')
    if (!f.business_name.trim() || f.business_name.trim().length < 2) miss.add('business_name')
    if (!f.bio.trim())                                              miss.add('bio')
    if (f.main_services.length === 0)                               miss.add('main_services')
    const waDigits = f.whatsapp_e164.replace(/[^\d]/g, '')
    if (waDigits.length < 8 || waDigits.length > 15)                miss.add('whatsapp_e164')
    if (!f.city.trim())                                             miss.add('city')
    if (!f.profile_image_url)                                       miss.add('profile_image_url')

    if (miss.size > 0) {
      setMissing(miss)
      setErr(null)
      // Scroll to the first missing field. Sections render top-to-bottom,
      // so iterate the form order: name → business → bio → services →
      // whatsapp → city → profile.
      const order = ['display_name','business_name','bio','main_services','whatsapp_e164','city','profile_image_url']
      const first = order.find((k) => miss.has(k))
      if (first) refs[first]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // 2. Soft-required: at least one starting price.
    const p60  = priceNum(f.price_60min_idr)
    const p90  = priceNum(f.price_90min_idr)
    const p120 = priceNum(f.price_120min_idr)
    if (p60 === null && p90 === null && p120 === null) {
      setErr('Set at least one starting price (60min, 90min, or 120min).')
      return
    }

    // Derive services_offered + marketplace_categories from the
    // picker. services_offered is the FLAT union of every sub-service
    // each picked tile unlocks. marketplace_categories is also derived
    // from the picker but limited to 3 entries (DB CHECK), taking the
    // first sub-service of each picked tile.
    const servicesOffered: FacialServiceOffered[] = []
    const marketplaceCategories: FacialServiceOffered[] = []
    for (const id of f.main_services) {
      const tile = MAIN_SERVICES.find((m) => m.id === id)
      if (!tile) continue
      for (const sid of tile.fillsIn) {
        if (!servicesOffered.includes(sid)) servicesOffered.push(sid)
      }
      // First sub-service of the tile represents it in marketplace_categories.
      if (marketplaceCategories.length < 3 && tile.fillsIn[0]) {
        marketplaceCategories.push(tile.fillsIn[0])
      }
    }
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch('/api/facial/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:  f.display_name,
          business_name: f.business_name,
          bio: f.bio,
          price_60min_idr:  p60,
          price_90min_idr:  p90,
          price_120min_idr: p120,
          // Prepend Indonesia country code — input only captures the
          // digits after +62 to keep the UX simple.
          whatsapp_e164: `+62${f.whatsapp_e164.replace(/[^\d]/g, '')}`,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
          // Service type → has_physical_location: business + both opt in.
          has_physical_location: f.service_type !== 'mobile',
          // Main-services picker → services_offered + marketplace_categories
          services_offered:       servicesOffered,
          marketplace_categories: marketplaceCategories,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { setErr(humaniseError(j.error)); return }
      setDone(true)
      // Land on the welcome page (locked share-link + setup checklist)
      // instead of straight into the dashboard so providers see the
      // remaining setup steps before their public profile goes live.
      setTimeout(() => router.push('/facial/welcome'), 1200)
    } catch { setErr('Tidak bisa terhubung.') }
    finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[22px] font-black mb-2">Profile created</h1>
      <p className="text-[13px] text-ink/70">Opening dashboard…</p>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-20 max-w-md mx-auto">
      <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back</Link>

      <h1 className="text-[26px] font-black leading-tight mb-2">Facial signup</h1>
      <p className="text-[13px] text-ink/70 mb-6">
        Set your services + package prices.
        Rp 38.000/month, 7-day free trial.
      </p>

      {missing.size > 0 && (
        <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/50 px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-extrabold text-red-200">
              Lengkapi {missing.size} kolom yang wajib diisi
            </div>
            <div className="text-[11px] text-red-200/80 mt-0.5 leading-snug">
              Scroll otomatis ke kolom pertama yang kosong. Semua kolom wajib dilengkapi sebelum profil bisa disimpan.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Field
          icon={User}
          label="Full Name *"
          missing={missing.has('display_name')}
          innerRef={refs.display_name}
          help="Nama lengkap Anda. Muncul di profil publik & marketplace."
        >
          <input maxLength={80} value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="e.g. Ayu Prameswari" className={inputCls} />
        </Field>

        <Field
          icon={Briefcase}
          label="Business Name *"
          missing={missing.has('business_name')}
          innerRef={refs.business_name}
          help="Nama studio/salon yang muncul sebagai banner title di profil. Bisa nama brand atau personal: 'Ayu Skin Studio', 'Mira Facial Bali', dll."
        >
          <input maxLength={80} value={f.business_name} onChange={(e) => upd('business_name', e.target.value)} placeholder="e.g. Ayu Skin Studio" className={inputCls} />
        </Field>

        <Field
          icon={BookOpen}
          label="Short bio (max 300 chars) *"
          missing={missing.has('bio')}
          innerRef={refs.bio}
          help="Singkat & jelas — gaya kerja, training, dan apa yang klien dapatkan. Muncul di section 'About' di halaman profil."
        >
          <div className="relative">
            <textarea
              required
              maxLength={300}
              rows={6}
              value={f.bio}
              onChange={(e) => upd('bio', e.target.value)}
              placeholder="3 lines: your style, training, what clients can expect."
              className={inputCls + ' resize-none pb-6 leading-snug'}
            />
            {/* Live character counter — bottom-right corner of the box.
                Color flips red as user nears the limit so the cap is
                obvious before the maxLength kicks in. */}
            <div
              className={`absolute bottom-2 right-3 text-[11px] font-extrabold tabular-nums pointer-events-none select-none ${
                f.bio.length >= 280
                  ? 'text-red-400'
                  : f.bio.length >= 240
                    ? 'text-amber-300'
                    : 'text-ink/45'
              }`}
              aria-live="polite"
            >
              {f.bio.length} / 300
            </div>
          </div>
        </Field>

        {/* Main Facial Services — pick up to 3 categories. Drives
            both services_offered (full list of sub-services unlocked
            in the dashboard later) and marketplace_categories (the
            filter groups this facial pro shows up under). */}
        <div ref={refs.main_services} className={`rounded-2xl p-4 ${missing.has('main_services') ? 'bg-red-500/10 border border-red-500/50' : 'bg-black/85 border border-white/10'}`}>
          <div className="text-[13px] font-extrabold uppercase tracking-wider text-ink inline-flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-brand" strokeWidth={2.5} />
            Main Facial Services *
          </div>
          <p className="text-[11px] text-ink/55 mt-0.5 mb-3 leading-snug">
            Pilih maksimal <strong>3 kategori utama</strong> yang Anda tawarkan ({f.main_services.length}/3). Sub-services bisa di-detail di dashboard nanti.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MAIN_SERVICES.map((m) => {
              const on    = f.main_services.includes(m.id)
              const atCap = !on && f.main_services.length >= 3
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={atCap}
                  onClick={() => upd(
                    'main_services',
                    on ? f.main_services.filter((x) => x !== m.id)
                       : [...f.main_services, m.id],
                  )}
                  className={`relative rounded-xl p-3 text-left border transition active:scale-[0.98] ${
                    on
                      ? 'bg-brand text-bg border-brand shadow-[0_2px_10px_rgba(250,204,21,0.45)]'
                      : atCap
                        ? 'bg-black/85 text-ink/40 border-white/5 cursor-not-allowed'
                        : 'bg-black/85 text-ink border-white/10 hover:border-white/30'
                  }`}
                >
                  {on && (
                    <span
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-bg/95 flex items-center justify-center"
                      aria-hidden
                    >
                      <Check className="w-3.5 h-3.5 text-brand" strokeWidth={3} />
                    </span>
                  )}
                  <m.icon className={`w-6 h-6 mb-1.5 ${on ? 'text-bg' : 'text-brand'}`} strokeWidth={2.25} />
                  <div className="text-[13px] font-extrabold leading-tight">{m.label}</div>
                  <div className={`text-[10px] leading-snug mt-0.5 ${on ? 'text-bg/70' : 'text-ink/55'}`}>
                    {m.hint}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Service Type — drives whether the public profile shows a
            "Visit Us" link (only when there's a business place). */}
        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-wider text-ink inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand" strokeWidth={2.5} />
            Your service is at *
          </div>
          <p className="text-[11px] text-ink/55 mt-0.5 mb-3 leading-snug">
            Pilih lokasi layanan Anda. Business Place mengaktifkan link "Visit Us" di profil — customer bisa lihat alamat & peta. Mobile = Anda yang datang ke customer.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'mobile',   label: 'Home · Hotel · Villa', hint: 'Mobile' },
              { v: 'business', label: 'Business Place',       hint: 'Walk-in' },
              { v: 'both',     label: 'Both',                 hint: 'Mobile + Walk-in' },
            ] as const).map((opt) => (
              <label key={opt.v} className={`flex flex-col items-center justify-center gap-0.5 rounded-xl p-3 cursor-pointer border transition text-center ${
                f.service_type === opt.v
                  ? 'bg-brand text-bg border-brand shadow-[0_2px_10px_rgba(250,204,21,0.45)]'
                  : 'bg-black/85 border-white/10 hover:border-white/20 text-ink'
              }`}>
                <input type="radio" name="service_type" value={opt.v} checked={f.service_type === opt.v} onChange={() => upd('service_type', opt.v)} className="sr-only" />
                <span className="text-[12px] font-extrabold leading-tight">{opt.label}</span>
                <span className={`text-[10px] ${f.service_type === opt.v ? 'text-bg/70' : 'text-ink/55'}`}>{opt.hint}</span>
              </label>
            ))}
          </div>
          {f.service_type !== 'mobile' && (
            <p className="text-[11px] text-ink/55 mt-2 leading-snug">
              Catatan: Setelah signup, atur lokasi tempat (lat/lng) di dashboard untuk mengaktifkan map di Visit Us.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-wider text-ink inline-flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-brand" strokeWidth={2.5} />
            Session starting prices
          </div>
          <p className="text-[11px] text-ink/55 mt-0.5 mb-3 leading-snug">
            Ketik dalam <strong>ribuan</strong>. Contoh: <strong>235</strong> = Rp 235k, <strong>1200</strong> = Rp 1.2jt. Kosongkan jika tidak ditawarkan; minimal satu wajib.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['60min','90min','120min'] as const).map((k) => (
              <label key={k} className="block">
                <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">{k}</span>
                <div className="relative">
                  <input
                    type="number" min={0}
                    value={f[`price_${k}_idr` as const]}
                    onChange={(e) => upd(`price_${k}_idr` as const, e.target.value)}
                    placeholder="235"
                    className={inputCls + ' text-[13px] pr-9'}
                  />
                  <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-ink/50 pointer-events-none select-none">
                    k
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Field
          icon={MessageCircle}
          label="WhatsApp / Mobile Number *"
          missing={missing.has('whatsapp_e164')}
          innerRef={refs.whatsapp_e164}
          help="Nomor Indonesia. Cukup ketik nomor setelah +62 (cth: 812 3456 7890). Tidak dibagikan ke siapa pun selain customer yang menekan tombol Contact."
        >
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-extrabold text-ink/70 pointer-events-none select-none"
            >
              +62
            </span>
            <input
              type="tel"
              inputMode="numeric"
              required
              // Store only the digits the user types; we prepend +62 on submit.
              value={f.whatsapp_e164}
              onChange={(e) => upd('whatsapp_e164', e.target.value.replace(/[^\d]/g, ''))}
              placeholder="812 3456 7890"
              className={inputCls + ' pl-14'}
            />
          </div>
        </Field>
        <Field
          icon={MapPin}
          label="City / Location *"
          missing={missing.has('city')}
          innerRef={refs.city}
          help="Pilih kota utama tempat Anda beroperasi. Customer memfilter facial pro berdasarkan kota ini di marketplace."
        >
          {/* Typeable combobox — native datalist gives free autocomplete +
              still allows custom city names not in the list. */}
          <input
            required
            type="text"
            list="cr-city-list"
            value={f.city}
            onChange={(e) => upd('city', e.target.value)}
            placeholder="Ketik kota — saran muncul otomatis"
            autoComplete="off"
            className={inputCls}
          />
          <datalist id="cr-city-list">
            {INDONESIAN_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field
          icon={Compass}
          label="Province / area"
          help="Provinsi atau area spesifik yang Anda layani — cth: 'Jawa Barat — Bandung Selatan' atau 'Bali — Hotel Kuta · Seminyak'. Muncul di profil sebagai info tambahan."
        >
          <input value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Jawa Barat — Cianjur" className={inputCls} />
        </Field>

        <div
          ref={refs.profile_image_url}
          className={`space-y-1 ${missing.has('profile_image_url') ? 'rounded-xl p-3 -m-3 bg-red-500/10 border border-red-500/50' : ''}`}
        >
          <span className={`text-[13px] font-bold inline-flex items-center gap-1.5 ${missing.has('profile_image_url') ? 'text-red-300' : 'text-ink/85'}`}>
            <Camera className={`w-4 h-4 ${missing.has('profile_image_url') ? 'text-red-400' : 'text-brand'}`} strokeWidth={2.5} />
            Profile Image *
            {missing.has('profile_image_url') && <span className="text-[11px] font-extrabold text-red-300 ml-1">required</span>}
          </span>
          <p className="text-[11px] text-ink/55 leading-snug">Foto wajah jelas — muncul di kartu marketplace + floating card di profil.</p>
          <ProfileImageUploader
            value={f.profile_image_url || null}
            onChange={(v) => upd('profile_image_url', v ?? '')}
            userId={userId}
            previewShape="circle"
          />
        </div>

        {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">{err}</div>}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
          {submitting ? 'Mendaftarkan…' : 'Create facial profile'}
        </button>
      </form>
    </div>
  )
}

function humaniseError(code?: string): string {
  switch (code) {
    case 'name_required':       return 'Display name is required.'
    case 'bio_required':        return 'Please add a short bio.'
    case 'bio_too_long':        return 'Bio must be 300 characters or fewer.'
    case 'whatsapp_required':   return 'Valid WhatsApp number is required.'
    case 'at_least_one_service':return 'Set at least one service price.'
    case 'slug_collision':      return 'That display name is taken — try a variation.'
    case 'already_registered':  return 'You already have a facial profile.'
    default:                    return 'Could not register. Please try again.'
  }
}

const inputCls = 'w-full rounded-xl bg-black/85 border border-white/15 px-4 py-3 text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand'
function Field({
  label, help, icon: Icon, missing, innerRef, children,
}: {
  label: string
  help?: string
  icon?: LucideIcon
  missing?: boolean
  innerRef?: React.Ref<HTMLDivElement>
  children: React.ReactNode
}) {
  return (
    <div
      ref={innerRef}
      className={`block space-y-1 ${missing ? 'rounded-xl p-3 -m-3 bg-red-500/10 border border-red-500/50' : ''}`}
    >
      <span className={`text-[13px] font-bold inline-flex items-center gap-1.5 ${missing ? 'text-red-300' : 'text-ink/85'}`}>
        {Icon && <Icon className={`w-4 h-4 ${missing ? 'text-red-400' : 'text-brand'}`} strokeWidth={2.5} />}
        {label}
        {missing && <span className="text-[11px] font-extrabold text-red-300 ml-1">required</span>}
      </span>
      {help && <p className="text-[11px] text-ink/55 leading-snug">{help}</p>}
      {children}
    </div>
  )
}
