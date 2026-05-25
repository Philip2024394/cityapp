'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Lock, LockOpen, Copy, MessageCircle, Check, ChevronRight, ChevronDown,
  Palette, Image as ImageIcon, ListChecks, Camera, Clock, Tags,
  Upload, X,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import CoverImageUploader from '@/components/kyc/CoverImageUploader'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import type {
  BeauticianProvider,
  BeauticianServiceOffered,
  BeauticianServicePhoto,
} from '@/lib/beautician/types'

// Post-signup completion screen. Shows the beautician's public shareable
// URL at the top — LOCKED until all profile sections are filled. Each
// incomplete item below is a tile linking back to the relevant dashboard
// section so the beautician can fill it in.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cityriders.id'
const DEFAULT_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png'

type Extras = {
  cover_image_url?:    string | null
  theme_color?:        string | null
  operating_hours?:    Record<string, string> | null
  service_photos?:     Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>> | null
  services_offered?:   BeauticianServiceOffered[] | null
  marketplace_categories?: BeauticianServiceOffered[] | null
}

type FullProvider = BeauticianProvider & Extras

export default function BeauticianWelcomePage() {
  const router = useRouter()
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  // Which section is expanded for inline editing. Banner opens by
  // default since it's the first onboarding step per the founder's
  // brief; user can collapse and open any other.
  const [openSection, setOpenSection] = useState<string | null>('banner')
  // Banner-section sub-mode: 'library' (pick from admin-curated list)
  // or 'upload' (CoverImageUploader). Defaults to library.
  const [bannerMode, setBannerMode] = useState<'library' | 'upload'>('library')
  const [savingField, setSavingField] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { router.replace('/login?next=/beautician/welcome'); return }
      try {
        const r = await fetch('/api/beautician/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider: FullProvider | null }
          setProvider(j.provider ?? null)
        }
      } finally { setLoading(false) }
    })
  }, [router])

  // Persist a partial profile update + reflect in local state so the
  // checklist + locked-URL banner refresh without a full refetch.
  async function saveField<K extends keyof FullProvider>(
    field: K, value: FullProvider[K], displayKey: string,
  ) {
    if (!provider) return
    setSavingField(displayKey)
    try {
      const r = await fetch('/api/beautician/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        alert(typeof j?.error === 'string' ? j.error : 'Could not save.')
        return
      }
      setProvider((prev) => prev ? { ...prev, [field]: value } : prev)
    } finally { setSavingField(null) }
  }

  if (loading) return <Shell><Loading /></Shell>
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Not a beautician yet</h1>
          <Link href="/beautician/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Register as beautician</Link>
        </div>
      </Shell>
    )
  }

  // Completion checklist (the 6 items required to "unlock" the link).
  const items = computeChecklist(provider)
  const completedCount = items.filter((i) => i.done).length
  const total = items.length
  const allDone = completedCount === total
  const profileUrl = `${SITE_URL}/beautician/${provider.slug}`
  const theme = provider.theme_color || '#EC4899'
  const hero = provider.cover_image_url || DEFAULT_HERO

  async function copyLink() {
    if (!allDone) return
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {/* Locked URL display — top of page */}
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-ink/55 mb-1.5">
            Your business website
          </div>
          <div
            className={`flex items-center gap-2 rounded-2xl px-3 py-3 transition ${
              allDone
                ? 'bg-green-500/10 border border-green-500/40'
                : 'bg-black/85 border border-white/15'
            }`}
          >
            {allDone
              ? <LockOpen className="w-5 h-5 text-green-300 shrink-0" strokeWidth={2.5} />
              : <Lock     className="w-5 h-5 text-ink/55 shrink-0"     strokeWidth={2.5} />
            }
            <div
              className={`flex-1 min-w-0 font-mono text-[12px] truncate select-${allDone ? 'all' : 'none'} ${allDone ? 'text-ink' : 'text-ink/40 blur-[2px]'}`}
              aria-disabled={!allDone}
            >
              {profileUrl}
            </div>
            {allDone && (
              <>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white shrink-0"
                  style={{ background: theme }}
                >
                  <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Cek profil saya di City Riders: ${profileUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white shrink-0"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Share
                </a>
              </>
            )}
          </div>
          {!allDone && (
            <p className="text-[12px] text-ink/65 mt-2 leading-snug text-center">
              Complete all areas below to unlock your business website link
            </p>
          )}
        </div>

        {/* Hero banner preview */}
        <div className="relative rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: '16 / 9', maxHeight: 200 }}>
          <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 text-white">
            <div className="text-[11px] uppercase tracking-wider opacity-80">Hello {provider.display_name.split(' ')[0]}</div>
            <div className="text-[18px] font-black">{completedCount} / {total} sections complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white/10 mb-5 overflow-hidden">
          <div
            className="h-full transition-all rounded-full"
            style={{ width: `${(completedCount / total) * 100}%`, background: theme }}
          />
        </div>

        {/* Checklist — Banner section is INLINE (expandable). The
            other 5 sections still route to the dashboard until they're
            also lifted into this page in a follow-up. */}
        <div className="space-y-2">
          {items.map((it) => {
            const isBanner = it.key === 'banner'
            const open = isBanner && openSection === 'banner'
            // Banner section is the only one with inline editing today.
            if (isBanner) {
              return (
                <div
                  key={it.key}
                  className={`rounded-xl ${it.done ? 'bg-green-500/10 border border-green-500/30' : 'bg-black/85 border border-white/15'}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenSection(open ? null : 'banner')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${it.done ? 'bg-green-500/20' : 'bg-white/5'}`}>
                      {it.done
                        ? <Check className="w-4 h-4 text-green-300" strokeWidth={2.5} />
                        : <it.icon className="w-4 h-4 text-brand"   strokeWidth={2.5} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-extrabold ${it.done ? 'text-green-200' : 'text-ink'}`}>
                        {it.label}
                      </div>
                      <div className="text-[11px] text-ink/55 leading-snug">{it.hint}</div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-ink/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                      strokeWidth={2.5}
                    />
                  </button>

                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                      {/* Current banner preview */}
                      {provider.cover_image_url ? (
                        <div className="relative rounded-lg overflow-hidden border border-white/15" style={{ aspectRatio: '16 / 9' }}>
                          <img src={provider.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => saveField('cover_image_url', null, 'banner')}
                            disabled={savingField === 'banner'}
                            aria-label="Remove banner"
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-white/20 px-4 py-6 text-center text-[12px] text-ink/55" style={{ aspectRatio: '16 / 9' }}>
                          <ImageIcon className="w-5 h-5 mx-auto mb-1 text-ink/40" />
                          Belum ada banner dipilih
                        </div>
                      )}

                      {/* Mode switch — library OR upload */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBannerMode('library')}
                          className={`rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                            bannerMode === 'library'
                              ? 'bg-brand text-bg border-brand'
                              : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
                          }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2.5} />
                          Banner library
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerMode('upload')}
                          className={`rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                            bannerMode === 'upload'
                              ? 'bg-brand text-bg border-brand'
                              : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2.5} />
                          Upload own
                        </button>
                      </div>

                      {/* Sizing + format guidance — always visible. */}
                      <div className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-ink/70 leading-snug">
                        <strong className="text-ink">Best size:</strong> 1600 × 900 px (16:9 wide).{' '}
                        <strong className="text-ink">Formats:</strong> PNG · JPG · WEBP.{' '}
                        <strong className="text-ink">Max:</strong> 8 MB.
                      </div>

                      {bannerMode === 'library' ? (
                        <BannerLibraryPicker
                          themeHex={provider.theme_color ?? null}
                          servicesOffered={(provider.services_offered ?? []) as BeauticianServiceOffered[]}
                          selected={provider.cover_image_url ?? null}
                          onChange={(url) => saveField('cover_image_url', url, 'banner')}
                          userId={provider.user_id ?? null}
                        />
                      ) : (
                        provider.user_id && (
                          <CoverImageUploader
                            userId={provider.user_id}
                            value={provider.cover_image_url ?? null}
                            onChange={(url) => saveField('cover_image_url', url, 'banner')}
                          />
                        )
                      )}

                      {savingField === 'banner' && (
                        <div className="text-[11px] text-ink/55 italic">Menyimpan…</div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            // All other items still link out to the dashboard for now.
            return (
              <Link
                key={it.key}
                href={it.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  it.done
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-black/85 border border-white/15 hover:border-white/30'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${it.done ? 'bg-green-500/20' : 'bg-white/5'}`}
                >
                  {it.done
                    ? <Check className="w-4 h-4 text-green-300" strokeWidth={2.5} />
                    : <it.icon className="w-4 h-4 text-brand"   strokeWidth={2.5} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-extrabold ${it.done ? 'text-green-200' : 'text-ink'}`}>
                    {it.label}
                  </div>
                  <div className="text-[11px] text-ink/55 leading-snug">{it.hint}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink/40 shrink-0" strokeWidth={2.5} />
              </Link>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/dashboard/beautician"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider"
          >
            Open dashboard
          </Link>
          {allDone && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-ink/70 hover:text-ink"
            >
              View live profile →
            </a>
          )}
        </div>
      </div>
    </Shell>
  )
}

function computeChecklist(p: FullProvider): Array<{
  key: string
  label: string
  hint: string
  href: string
  done: boolean
  icon: typeof Palette
}> {
  const services = (p.services_offered ?? []) as string[]
  const sp       = (p.service_photos ?? {}) as Partial<Record<string, BeauticianServicePhoto[]>>
  const photosCount = Object.values(sp).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
  const hoursCount  = p.operating_hours ? Object.keys(p.operating_hours).length : 0
  const cats        = (p.marketplace_categories ?? []) as string[]

  return [
    {
      key:   'theme',
      label: 'Pick your theme color',
      hint:  'Drives the accent color on your profile page.',
      href:  '/dashboard/beautician#theme',
      done:  !!p.theme_color,
      icon:  Palette,
    },
    {
      key:   'services',
      label: 'Add at least 3 services',
      hint:  `Pick services you offer (${services.length}/3 minimum).`,
      href:  '/dashboard/beautician#services',
      done:  services.length >= 3,
      icon:  ListChecks,
    },
    {
      key:   'categories',
      label: 'Set marketplace categories',
      hint:  'Pick max 3 primary categories you appear under in the marketplace.',
      href:  '/dashboard/beautician#categories',
      done:  cats.length > 0,
      icon:  Tags,
    },
    {
      key:   'banner',
      label: 'Choose a banner',
      hint:  'Pick from the library matching your theme, or upload your own.',
      href:  '/dashboard/beautician#banner',
      done:  !!p.cover_image_url,
      icon:  ImageIcon,
    },
    {
      key:   'photos',
      label: 'Upload service photos',
      hint:  `Add at least 1 photo to any service (${photosCount} so far).`,
      href:  '/dashboard/beautician#photos',
      done:  photosCount >= 1,
      icon:  Camera,
    },
    {
      key:   'hours',
      label: 'Set operating hours',
      hint:  `Fill at least 1 day so customers know when you're open (${hoursCount} day${hoursCount === 1 ? '' : 's'} set).`,
      href:  '/dashboard/beautician#hours',
      done:  hoursCount >= 1,
      icon:  Clock,
    },
  ]
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink">
      <AppNav />
      {children}
    </main>
  )
}
function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
}
