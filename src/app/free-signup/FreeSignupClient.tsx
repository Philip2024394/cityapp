'use client'
// ============================================================================
// FreeSignupClient — Free-tier profile setup with live preview.
// ----------------------------------------------------------------------------
// Layout: form on the left (or stacked on mobile), live preview on the
// right using FreeThemeRenderer.
//
// Auth: if no signed-in session, the visitor is shown a sign-in gate
// rather than a hard redirect (matches the patterns from other signup
// pages — visitor can still see what they're committing to first). Save
// requires a session — the API enforces that authoritatively.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Save, Eye, Pencil, GripVertical,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import FreeThemeRenderer from '@/components/free-themes/FreeThemeRenderer'
import {
  FREE_THEMES, findTheme, type FreeProfile, type FreeThemeId, type FreeTheme,
} from '@/lib/free-themes/library'

type Link_ = { title: string; url: string }
type Socials = FreeProfile['socials']

const COLOR_SWATCHES: ReadonlyArray<string> = [
  '#FACC15', '#EC4899', '#0A0A0A', '#0EA5E9',
  '#7C3AED', '#10B981', '#EA580C', '#FFFFFF',
]

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'signedIn'; userId: string; email: string | null }

export default function FreeSignupClient({
  initialHandle, initialThemeId,
}: {
  initialHandle: string
  initialThemeId: FreeThemeId
}) {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  const [themeId, setThemeId] = useState<FreeThemeId>(initialThemeId)
  const [slug] = useState(initialHandle || '')
  const [displayName, setDisplayName] = useState(initialHandle || '')
  const [bio, setBio] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState<string>(findTheme(initialThemeId).defaults.brandColor)
  const [buttonTextColor, setButtonTextColor] = useState<string>(findTheme(initialThemeId).defaults.buttonTextColor)
  const [placement, setPlacement] = useState<'center' | 'top-left' | 'bottom-left'>('center')
  const [showUrlUnderAvatar, setShowUrlUnderAvatar] = useState(false)
  const [links, setLinks] = useState<Link_[]>([])
  const [socials, setSocials] = useState<Socials>({})

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false) // mobile toggle

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      setAuth({ status: 'signedIn', userId: user.id, email: user.email ?? null })
    })
  }, [])

  // When the theme changes, sync brand+button text colour to the new
  // theme's defaults — but ONLY if the user hadn't customised yet (i.e.
  // brandColor still matches the previously-active theme's default).
  // Otherwise respect the user's custom pick.
  function switchTheme(next: FreeThemeId) {
    const prev = findTheme(themeId)
    const nextTheme = findTheme(next)
    if (brandColor === prev.defaults.brandColor) {
      setBrandColor(nextTheme.defaults.brandColor)
    }
    if (buttonTextColor === prev.defaults.buttonTextColor) {
      setButtonTextColor(nextTheme.defaults.buttonTextColor)
    }
    setThemeId(next)
  }

  const activeTheme: FreeTheme = useMemo(() => findTheme(themeId), [themeId])

  // Live preview profile object — mirrors FreeProfile so the renderer
  // can paint it identically to the saved version.
  const previewProfile: FreeProfile = useMemo(() => ({
    slug:                       slug || 'preview',
    display_name:               displayName || 'Your name',
    bio:                        bio || null,
    profile_image_url:          profileImageUrl,
    cover_image_url:            null,
    page_background_image_url:  bgImageUrl,
    brand_color:                brandColor,
    button_text_color:          buttonTextColor,
    whatsapp_e164:              whatsapp || null,
    avatar_placement:           placement,
    show_url_under_avatar:      showUrlUnderAvatar,
    free_theme_id:              themeId,
    links,
    socials,
  }), [slug, displayName, bio, profileImageUrl, bgImageUrl, brandColor, buttonTextColor, whatsapp, placement, showUrlUnderAvatar, themeId, links, socials])

  async function onSave() {
    setErr(null)
    if (auth.status !== 'signedIn') {
      router.push(`/login?next=${encodeURIComponent(`/free-signup?handle=${slug}&theme=${themeId}`)}`)
      return
    }
    if (!displayName.trim()) { setErr('Please enter a display name.'); return }
    if (!slug.trim())        { setErr('Missing handle — go back to /themes.'); return }

    setSaving(true)
    try {
      const r = await fetch('/api/free-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          profile_image_url: profileImageUrl,
          page_background_image_url: bgImageUrl,
          brand_color: brandColor,
          button_text_color: buttonTextColor,
          whatsapp_e164: whatsapp.trim() || null,
          avatar_placement: placement,
          show_url_under_avatar: showUrlUnderAvatar,
          free_theme_id: themeId,
          links,
          socials,
        }),
      })
      const j = await r.json().catch(() => ({} as { error?: string }))
      if (!r.ok) {
        setErr((j as { error?: string })?.error || `Save failed (${r.status})`)
        setSaving(false)
        return
      }
      router.push(`/u/${slug}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------
  // Anonymous gate
  // -----------------------------------------------------------------
  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (auth.status === 'anon') {
    const next = encodeURIComponent(`/free-signup?handle=${slug}&theme=${themeId}`)
    return (
      <div className="px-6 pt-12 pb-24 max-w-md mx-auto text-center space-y-5">
        <h1 className="text-[24px] font-black leading-tight">Save your free page</h1>
        <p className="text-[13px] text-gray-600 leading-relaxed">
          Create a free Kita2u account so your page is saved and reachable at <strong>kita2u.com/{slug || 'your-handle'}</strong>. No card needed.
        </p>
        <div className="space-y-3 pt-2">
          <Link
            href={`/signup?intent=free&next=${next}`}
            className="block w-full rounded-2xl bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] px-6 py-4 text-center text-[14px] font-extrabold shadow-[0_8px_22px_rgba(250,204,21,0.35)] active:scale-95"
          >
            Create my free account
          </Link>
          <Link
            href={`/login?next=${next}`}
            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 text-[#0A0A0A] px-6 py-4 text-center text-[14px] font-extrabold hover:bg-gray-100"
          >
            Sign in to existing account
          </Link>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------
  // Signed-in editor
  // -----------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
      {/* Mobile toggle: Edit vs Preview. lg+ always shows both. */}
      <div className="lg:hidden flex items-center bg-gray-100 rounded-full p-1 mb-4">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className={`flex-1 min-h-[40px] rounded-full text-[12.5px] font-extrabold transition inline-flex items-center justify-center gap-1.5 ${!showPreview ? 'bg-white shadow' : 'text-gray-500'}`}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className={`flex-1 min-h-[40px] rounded-full text-[12.5px] font-extrabold transition inline-flex items-center justify-center gap-1.5 ${showPreview ? 'bg-white shadow' : 'text-gray-500'}`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* ============================ FORM ============================ */}
        <section className={`${showPreview ? 'hidden lg:block' : ''} space-y-5`}>
          <h1 className="text-[24px] font-black leading-tight">Set up your free page</h1>
          <p className="text-[13px] text-gray-600 -mt-2">
            kita2u.com/<strong>{slug || 'your-handle'}</strong>
          </p>

          {/* THEME swap */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="font-extrabold text-[13px] text-[#0A0A0A]">Theme</div>
            <div className="flex flex-wrap gap-2">
              {FREE_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTheme(t.id)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold transition ${themeId === t.id ? 'bg-[#0A0A0A] text-[#FACC15]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* PROFILE IMAGE */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="font-extrabold text-[13px] text-[#0A0A0A]">Profile photo</div>
            <ProfileImageUploader
              value={profileImageUrl}
              onChange={setProfileImageUrl}
              userId={auth.userId}
              label="Profile photo"
              helpText="JPG / PNG / WEBP · max 5MB. Shown at the top of your page."
            />
          </div>

          {/* DISPLAY NAME + BIO */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <label className="block">
              <span className="font-extrabold text-[13px] text-[#0A0A0A]">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={64}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] font-bold focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 outline-none"
                placeholder="Your name"
              />
            </label>
            <label className="block">
              <span className="font-extrabold text-[13px] text-[#0A0A0A]">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={240}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] font-medium leading-snug focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 outline-none resize-none"
                placeholder="Tell visitors who you are in a sentence."
              />
              <div className="text-[11px] text-gray-400 mt-1">{bio.length}/240</div>
            </label>
            <label className="block">
              <span className="font-extrabold text-[13px] text-[#0A0A0A]">WhatsApp number</span>
              <input
                type="text"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+62..."
                maxLength={20}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] font-bold focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 outline-none"
              />
            </label>
          </div>

          {/* COLORS */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="font-extrabold text-[13px] text-[#0A0A0A]">Brand colour</div>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrandColor(c)}
                  aria-label={c}
                  className={`w-9 h-9 rounded-full border-2 transition ${brandColor === c ? 'border-[#0A0A0A] scale-110' : 'border-white'}`}
                  style={{ background: c, boxShadow: brandColor === c ? '0 0 0 2px #FACC15' : '0 2px 6px rgba(0,0,0,0.10)' }}
                />
              ))}
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 cursor-pointer"
                aria-label="Custom colour"
              />
            </div>
            <label className="block pt-2">
              <span className="font-extrabold text-[13px] text-[#0A0A0A]">Button text colour</span>
              <div className="flex gap-2 mt-1.5">
                {['#FFFFFF', '#0A0A0A'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setButtonTextColor(c)}
                    className={`px-4 py-2 rounded-full text-[12px] font-extrabold border-2 transition ${buttonTextColor === c ? 'border-[#0A0A0A]' : 'border-gray-200'}`}
                    style={{ background: c, color: c === '#FFFFFF' ? '#0A0A0A' : '#FFFFFF' }}
                  >
                    {c === '#FFFFFF' ? 'Light text' : 'Dark text'}
                  </button>
                ))}
              </div>
            </label>
          </div>

          {/* BACKGROUND IMAGE */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <ProfileImageUploader
              value={bgImageUrl}
              onChange={setBgImageUrl}
              userId={auth.userId}
              label="Background image (optional)"
              helpText="Shown behind every section with a white overlay."
              previewShape="square"
            />
          </div>

          {/* AVATAR PLACEMENT */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="font-extrabold text-[13px] text-[#0A0A0A]">Avatar placement</div>
            <div className="grid grid-cols-3 gap-2">
              {(['center', 'top-left', 'bottom-left'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlacement(p)}
                  className={`min-h-[60px] rounded-xl border-2 text-[11px] font-extrabold capitalize transition ${placement === p ? 'border-[#FACC15] bg-[#FFFBEA]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  {p.replace('-', ' ')}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showUrlUnderAvatar}
                onChange={(e) => setShowUrlUnderAvatar(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-[12.5px] font-bold text-[#0A0A0A]">Show kita2u.com/{slug || 'handle'} under name</span>
            </label>
          </div>

          {/* LINKS */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-[13px] text-[#0A0A0A]">Links</div>
              <button
                type="button"
                onClick={() => setLinks((arr) => [...arr, { title: '', url: '' }])}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FACC15] text-[#0A0A0A] text-[11.5px] font-extrabold active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add
              </button>
            </div>
            {links.length === 0 && (
              <div className="text-[12px] text-gray-500 italic">No links yet. Tap "Add" to drop in your TikTok, store, anything.</div>
            )}
            {links.map((ln, i) => (
              <div key={i} className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-gray-400 shrink-0 mt-3.5" />
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={ln.title}
                    onChange={(e) => setLinks((arr) => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    placeholder="Title"
                    maxLength={64}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] font-bold focus:border-[#FACC15] outline-none"
                  />
                  <input
                    type="url"
                    value={ln.url}
                    onChange={(e) => setLinks((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] font-medium focus:border-[#FACC15] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLinks((arr) => arr.filter((_, j) => j !== i))}
                  className="w-8 h-8 mt-1 rounded-full bg-gray-50 hover:bg-rose-50 flex items-center justify-center text-gray-500 hover:text-rose-700"
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* SOCIALS */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="font-extrabold text-[13px] text-[#0A0A0A]">Social icons</div>
            {(['instagram', 'tiktok', 'facebook', 'youtube', 'x', 'email'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[12px] font-bold capitalize text-[#0A0A0A]">{k}</span>
                <input
                  type="text"
                  value={socials[k] || ''}
                  onChange={(e) => setSocials((s) => ({ ...s, [k]: e.target.value }))}
                  placeholder={k === 'email' ? 'you@email.com' : `@yourhandle`}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-[13px] font-medium focus:border-[#FACC15] outline-none"
                />
              </label>
            ))}
          </div>

          {/* SAVE */}
          <div className="sticky bottom-3 z-20">
            {err && (
              <div className="mb-2 text-[12px] text-rose-700 font-bold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] font-extrabold text-[15px] shadow-[0_8px_22px_rgba(250,204,21,0.45)] active:scale-[0.99] disabled:opacity-60 transition"
            >
              {saving ? 'Saving…' : <><Save className="w-4 h-4" strokeWidth={2.75} /> Publish my free page</>}
            </button>
          </div>
        </section>

        {/* ============================ PREVIEW ============================ */}
        <section className={`${showPreview ? '' : 'hidden lg:block'} lg:sticky lg:top-24`}>
          <div className="rounded-3xl border border-gray-200 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.10)] bg-white">
            <div className="px-3 py-2 bg-gray-100 flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate">kita2u.com/{slug || 'preview'}</span>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <FreeThemeRenderer theme={activeTheme} profile={previewProfile} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
