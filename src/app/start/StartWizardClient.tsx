'use client'
// ============================================================================
// /start — vertical-first signup wizard (tasks 5 + 6 of the 12-item rollout).
// ----------------------------------------------------------------------------
// Founder direction 2026-06-09 — the Linktree audit showed our single biggest
// UX delta vs them is that they drop you on a blank link editor while we have
// 23 vertical templates already shaped like a finished business. Step 1 of
// our funnel should be "pick your business," not "type your name." A live
// phone-mockup preview that updates as the user fills photo + colour + name
// locks emotional commitment before any required field is touched.
//
// 3-step state machine:
//   1. pick      — VerticalTilePicker grid (23 verticals, food = locked)
//   2. customise — ProfileImageUploader + colour swatches + display name
//   3. confirm   — review card + Continue → /<vertical>/signup?display_name=
//                  &theme_color=&profile_image_url= (the canonical vertical
//                  form starts pre-filled; wiring the form to READ those
//                  params is a follow-up task per spec)
//
// Hard constraint: client-only. No server actions. No fetches. The wizard
// purely funnels users into the existing vertical signup pages — those are
// untouched.
// ============================================================================
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, ChevronLeft, Check, AlertCircle,
} from 'lucide-react'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import VerticalTilePicker from '@/components/start/VerticalTilePicker'
import PhonePreview from '@/components/start/PhonePreview'
import { VERTICALS, findVertical } from './verticals'

// 8 swatches — kept compact so the right column doesn't compete with the
// phone preview. Mirrors the most-picked colours from the dashboard's
// full ThemeColorPicker palette + the Kita2u brand yellow at the front.
const SWATCHES: ReadonlyArray<{ label: string; hex: string }> = [
  { label: 'Kita Yellow', hex: '#FACC15' },
  { label: 'Pink',        hex: '#EC4899' },
  { label: 'Rose',        hex: '#F43F5E' },
  { label: 'Purple',      hex: '#9333EA' },
  { label: 'Blue',        hex: '#2563EB' },
  { label: 'Teal',        hex: '#0D9488' },
  { label: 'Emerald',     hex: '#10B981' },
  { label: 'Coral',       hex: '#F97316' },
]

type Step = 'pick' | 'customise' | 'confirm'

export default function StartWizardClient() {
  const router = useRouter()
  const [step, setStep]                       = useState<Step>('pick')
  const [vertical, setVertical]               = useState<string | null>(null)
  const [displayName, setDisplayName]         = useState<string>('')
  const [themeColor, setThemeColor]           = useState<string>('#FACC15')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [error, setError]                     = useState<string | null>(null)

  const picked = useMemo(() => findVertical(vertical), [vertical])

  // Anon-friendly userId placeholder — the uploader writes to the
  // `profile-images` bucket under `<userId>/<uuid>.<ext>`. The wizard is
  // pre-auth (no Supabase session yet), so we use a transient client id.
  // The canonical signup form will re-collect / move the image when the
  // user is real — this is a preview-grade upload only.
  const [anonId] = useState(() => `start-${cryptoRandom()}`)

  function pickVertical(slug: string) {
    setVertical(slug)
    setError(null)
    setStep('customise')
  }

  function goToConfirm() {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Please enter your business name (at least 2 characters)')
      return
    }
    setError(null)
    setStep('confirm')
  }

  function handoffToCanonicalForm() {
    if (!picked) return
    const qs = new URLSearchParams()
    qs.set('display_name', displayName.trim())
    qs.set('theme_color',  themeColor)
    if (profileImageUrl) qs.set('profile_image_url', profileImageUrl)
    router.push(`${picked.href}?${qs.toString()}`)
  }

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      {/* Header — Kita2u wordmark + back-to-home. Sticky so the wizard
          feels framed by the brand even when the user scrolls a long
          tile grid on mobile. */}
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-sm border-b border-gray-100 px-5 sm:px-6 pt-4 pb-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[18px] tracking-tight">
              <span style={{ color: '#0A0A0A' }}>Kita</span>
              <span style={{ color: '#FACC15' }}>2u</span>
            </span>
          </Link>
          <StepDots active={step} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {step === 'pick' && (
          <StepPick onPick={pickVertical} />
        )}

        {step === 'customise' && picked && (
          <StepCustomise
            vertical={picked.slug}
            verticalLabel={picked.label}
            displayName={displayName}
            onDisplayName={setDisplayName}
            themeColor={themeColor}
            onThemeColor={setThemeColor}
            profileImageUrl={profileImageUrl}
            onProfileImage={setProfileImageUrl}
            anonId={anonId}
            error={error}
            onBack={() => { setStep('pick'); setError(null) }}
            onContinue={goToConfirm}
          />
        )}

        {step === 'confirm' && picked && (
          <StepConfirm
            vertical={picked.slug}
            verticalLabel={picked.label}
            verticalHref={picked.href}
            displayName={displayName}
            themeColor={themeColor}
            profileImageUrl={profileImageUrl}
            onBack={() => setStep('customise')}
            onContinue={handoffToCanonicalForm}
          />
        )}
      </div>
    </main>
  )
}

// ----------------------------------------------------------------------------
// StepPick — full-width tile grid. Tile click advances to step 2 in one tap
// (no Continue button needed at this step — the choice IS the navigation).
// ----------------------------------------------------------------------------
function StepPick({ onPick }: { onPick: (slug: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-block bg-[#FFFBEA] text-[#854D0E] text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-[#FACC15]/55">
          Step 1 of 3 — Pick your business
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-tight">
          What do you do?
        </h1>
        <p className="text-[14px] text-gray-600 leading-snug">
          Pick the closest match. Your page is shaped for that vertical from the first tap — no blank canvas to stare at.
        </p>
      </div>

      <VerticalTilePicker
        verticals={VERTICALS}
        selected={null}
        onSelect={onPick}
      />

      <p className="text-center text-[12px] text-gray-500 italic pt-2">
        Don&apos;t see your category? Pick the closest one and we&apos;ll adjust the template for you within 24 hours.
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// StepCustomise — two-column on sm+ (form left, phone preview right). On
// mobile the preview stacks below the form so the user can still see it
// after they scroll past the inputs.
// ----------------------------------------------------------------------------
function StepCustomise({
  vertical, verticalLabel,
  displayName, onDisplayName,
  themeColor, onThemeColor,
  profileImageUrl, onProfileImage,
  anonId,
  error,
  onBack, onContinue,
}: {
  vertical: string
  verticalLabel: string
  displayName: string
  onDisplayName: (v: string) => void
  themeColor: string
  onThemeColor: (v: string) => void
  profileImageUrl: string | null
  onProfileImage: (v: string | null) => void
  anonId: string
  error: string | null
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-block bg-[#FFFBEA] text-[#854D0E] text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-[#FACC15]/55">
          Step 2 of 3 — Make it yours
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-tight">
          Your {verticalLabel.toLowerCase()} page, your way.
        </h1>
        <p className="text-[14px] text-gray-600 leading-snug">
          Add a photo, pick a colour, drop your business name. Watch it come to life on the right.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* LEFT — controls */}
        <div className="space-y-5">
          <div className="space-y-4">
            {/* Profile photo deferred to the authenticated signup form
                (fixes the upload-fails issue: /start runs pre-auth so
                Supabase Storage RLS rejected the upload). The canonical
                /<vertical>/signup page has its own ProfileImageUploader
                that runs after phone+password auth. Founder direction
                2026-06-09. */}
            <div
              className="rounded-2xl border p-3.5 flex items-start gap-3"
              style={{ background: '#FEFCE8', borderColor: '#FDE68A' }}
            >
              <div className="text-[12px] sm:text-[13px] leading-relaxed" style={{ color: '#854D0E' }}>
                <strong>Photo comes next.</strong> You&apos;ll upload your profile photo on the next page after signing in — same look, just safer for your data.
              </div>
            </div>

            {/* Brand colour swatches */}
            <div>
              <div className="text-[13px] font-extrabold uppercase tracking-wider text-[#0A0A0A] mb-2">
                Brand colour
              </div>
              <div className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm">
                <p className="text-[12px] text-gray-500 leading-snug mb-3">
                  This colour drives your hero, buttons, and badges.
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {SWATCHES.map((s) => {
                    const on = themeColor.toUpperCase() === s.hex.toUpperCase()
                    return (
                      <button
                        key={s.hex}
                        type="button"
                        onClick={() => onThemeColor(s.hex)}
                        className={`relative aspect-square rounded-2xl transition active:scale-[0.95] ${on ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-900' : 'ring-1 ring-gray-200'}`}
                        style={{ background: s.hex }}
                        title={s.label}
                        aria-label={`${s.label} swatch`}
                        aria-pressed={on}
                      >
                        {on && (
                          <Check
                            className="absolute inset-0 m-auto w-5 h-5 drop-shadow"
                            strokeWidth={3}
                            style={{ color: '#FFFFFF' }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="text-[11px] text-gray-500 mt-3 font-mono">
                  {themeColor.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label
              htmlFor="start-display-name"
              className="block text-[13px] font-extrabold uppercase tracking-wider text-[#0A0A0A] mb-2"
            >
              Business name *
            </label>
            <input
              id="start-display-name"
              type="text"
              value={displayName}
              onChange={(e) => onDisplayName(e.target.value)}
              placeholder="e.g. Ayu Bridal Studio"
              maxLength={80}
              className="w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 min-h-[44px]"
              autoComplete="organization"
            />
            <p className="text-[12px] text-gray-500 mt-1.5 leading-snug">
              The name that appears at the top of your page. You can change it later in your dashboard.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="text-[13px] font-extrabold text-red-600">{error}</div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-5 rounded-2xl bg-gray-50 border border-gray-200 text-[#0A0A0A] text-[14px] font-extrabold hover:bg-gray-100 active:scale-[0.99] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_22px_rgba(250,204,21,0.35)] active:scale-[0.99] transition"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT — phone preview (sticky on lg+ so it stays visible while
            the user scrolls long forms below). */}
        <div className="lg:sticky lg:top-24">
          <PhonePreview
            vertical={vertical}
            displayName={displayName}
            themeColor={themeColor}
            profileImageUrl={profileImageUrl}
          />
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// StepConfirm — review card with the phone preview side-by-side. Continue
// hands off to the canonical vertical signup form with everything pre-set in
// the URL as query params. The canonical forms ignore unknown params today;
// teaching them to PRE-FILL from these params is a follow-up task.
// ----------------------------------------------------------------------------
function StepConfirm({
  vertical, verticalLabel, verticalHref,
  displayName, themeColor, profileImageUrl,
  onBack, onContinue,
}: {
  vertical: string
  verticalLabel: string
  verticalHref: string
  displayName: string
  themeColor: string
  profileImageUrl: string | null
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-block bg-[#FFFBEA] text-[#854D0E] text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-[#FACC15]/55">
          Step 3 of 3 — Looks good?
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-tight">
          Almost there.
        </h1>
        <p className="text-[14px] text-gray-600 leading-snug">
          One last step on the next screen — your WhatsApp number and a password. Then your page is live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 space-y-3">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500">
              Your page so far
            </div>
            <ReviewRow label="Business type" value={verticalLabel} />
            <ReviewRow label="Business name" value={displayName || 'Not set'} />
            <ReviewRow
              label="Brand colour"
              value={themeColor.toUpperCase()}
              swatch={themeColor}
            />
            <ReviewRow
              label="Profile photo"
              value={profileImageUrl ? 'Uploaded' : 'Skipped'}
            />
          </div>

          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(234,179,8,0.18) 100%)',
              border: '1px solid rgba(250,204,21,0.40)',
            }}
          >
            <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#854D0E' }} strokeWidth={2.5} />
            <div className="text-[13px] leading-relaxed">
              <div className="font-extrabold text-[#0A0A0A]">7 days free — no credit card required</div>
              <div className="text-gray-700 mt-0.5">
                Every feature unlocked for 7 days. Cancel anytime from the side drawer in your dashboard.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-5 rounded-2xl bg-gray-50 border border-gray-200 text-[#0A0A0A] text-[14px] font-extrabold hover:bg-gray-100 active:scale-[0.99] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_22px_rgba(250,204,21,0.35)] active:scale-[0.99] transition"
            >
              Create my account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center leading-snug">
            Next: phone + password on{' '}
            <span className="font-mono">{verticalHref}</span>
          </p>
        </div>

        <div className="lg:sticky lg:top-24">
          <PhonePreview
            vertical={vertical}
            displayName={displayName}
            themeColor={themeColor}
            profileImageUrl={profileImageUrl}
          />
        </div>
      </div>
    </div>
  )
}

function ReviewRow({
  label, value, swatch,
}: {
  label: string
  value: string
  swatch?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-[13px] font-extrabold text-[#0A0A0A] inline-flex items-center gap-2 truncate">
        {swatch && (
          <span
            className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
            style={{ background: swatch }}
            aria-hidden
          />
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// StepDots — 3-dot progress indicator in the sticky header. Active dot is
// wider + Kita yellow; inactive dots stay neutral gray. Matches the
// CityDrivers signup stepper pattern for visual consistency.
// ----------------------------------------------------------------------------
function StepDots({ active }: { active: Step }) {
  const steps: ReadonlyArray<{ id: Step; label: string }> = [
    { id: 'pick',      label: 'Pick' },
    { id: 'customise', label: 'Customise' },
    { id: 'confirm',   label: 'Confirm' },
  ]
  return (
    <div className="flex items-center gap-2" aria-label="Sign-up progress">
      {steps.map((s) => {
        const isActive = s.id === active
        return (
          <span
            key={s.id}
            className="rounded-full transition-all"
            style={{
              width: isActive ? 28 : 8,
              height: 8,
              background: isActive ? '#FACC15' : '#E4E4E7',
            }}
            aria-label={s.label}
            aria-current={isActive ? 'step' : undefined}
          />
        )
      })}
    </div>
  )
}

// ----------------------------------------------------------------------------
// cryptoRandom — short random id for the anon upload path. Avoids importing
// uuid for a single-use case; crypto.randomUUID has wide browser support
// but we keep this for SSR-safe fallback.
// ----------------------------------------------------------------------------
function cryptoRandom(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10)
}
