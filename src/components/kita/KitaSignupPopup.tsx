'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, X as XIcon, Check as CheckIcon } from 'lucide-react'

// =============================================================================
// KitaSignupPopup — Linktree-style "claim your handle" modal.
//
// Mirrors the HourlyBookingPopup modal chrome (fixed inset, bottom-sheet on
// mobile + center on desktop, yellow top border, yellow circular brand icon +
// X close in the top-right corner).
//
// Flow:
//   1. User types a handle. We debounce 300ms then hit /api/kita/handle-check
//      to confirm availability. The "kita2u.com/" prefix is shown as static
//      copy in front of the input so the social-handle metaphor stays loud.
//   2. User picks one of the 4 macro chips (Beauty & Wellness / Home
//      Services / Transport / Stays & Places). The macro is auto-selected
//      from defaultVertical when the popup opens from a vertical-specific
//      profile.
//   3. Once a macro is picked, a sub-row of specialty chips appears. Single
//      select.
//   4. CTA enables only when handle is valid + available + specialty is
//      picked. Tapping it diverts to /signup with ?handle=… &vertical=…
//      pre-filled so the signup page can route the user to the right
//      dashboard on success.
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'

// Canonical 13 verticals grouped into 4 customer-facing macros. Source of
// truth for both the chip UI here and the macro → specialty mapping on the
// signup page. Specialty ids must match the dashboard slug mapping in
// src/app/signup/page.tsx.
const MACROS = [
  {
    id:    'beauty-wellness',
    label: 'Beauty & Wellness',
    specs: [
      { id: 'beautician', label: 'Beautician' },
      { id: 'massage',    label: 'Massage' },
      { id: 'facial',     label: 'Facial' },
      { id: 'skincare',   label: 'Skincare' },
    ],
  },
  {
    id:    'home-services',
    label: 'Home Services',
    specs: [
      { id: 'handyman',   label: 'Handyman' },
      { id: 'laundry',    label: 'Laundry' },
      { id: 'home-clean', label: 'Home Clean' },
    ],
  },
  {
    id:    'transport',
    label: 'Transport',
    specs: [
      { id: 'bike-driver',  label: 'Bike Driver' },
      { id: 'car-driver',   label: 'Car Driver' },
      { id: 'truck-driver', label: 'Truck Driver' },
      { id: 'tour-guide',   label: 'Tour Guide' },
    ],
  },
  {
    id:    'stays-places',
    label: 'Stays & Places',
    specs: [
      { id: 'property', label: 'Property' },
      { id: 'places',   label: 'Places' },
    ],
  },
] as const

type MacroId = typeof MACROS[number]['id']

// Reserved list — must stay in sync with the server route. Includes all
// CityDrivers vertical routes + auth/dashboard surfaces so a creator can't
// claim a handle that would shadow a system URL.
const RESERVED = new Set([
  'admin', 'support', 'api', 'dashboard', 'signup', 'login', 'cari',
  'cityriders', 'places', 'kita2u', 'beautician', 'handyman', 'laundry',
  'massage', 'home-clean', 'facial', 'skincare', 'tour', 'tour-guide',
  'car', 'truck', 'r', 'bus', 'food', 'drivers', 'business', 'explore',
  'dev', 'www', 'mail', 'help', 'contact', 'about', 'terms', 'privacy',
])

// Mirrors the server regex — anchors enforce no leading/trailing hyphen.
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])?$/

function macroForVertical(v?: string): MacroId | null {
  if (!v) return null
  for (const m of MACROS) {
    if (m.specs.some((s) => s.id === v)) return m.id
  }
  return null
}

export type KitaSignupPopupProps = {
  onClose: () => void
  /** When the user opened the popup from a vertical-specific profile,
   *  pre-select the matching macro + specialty. Use the vertical's
   *  canonical id (e.g. 'beautician', 'car-driver'). */
  defaultVertical?: string
}

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'taken'; suggestion?: string }
  | { status: 'invalid'; reason: string }

export default function KitaSignupPopup({ onClose, defaultVertical }: KitaSignupPopupProps) {
  const initialMacro = macroForVertical(defaultVertical)
  const [handle, setHandle]     = useState('')
  const [macro,  setMacro]      = useState<MacroId | null>(initialMacro)
  const [spec,   setSpec]       = useState<string | null>(defaultVertical && initialMacro ? defaultVertical : null)
  const [check,  setCheck]      = useState<CheckState>({ status: 'idle' })

  // Local client-side validation — never trust this alone, the API route
  // re-validates with the same regex + reserved list before hitting the DB.
  const localError = useMemo<string | null>(() => {
    if (!handle) return null
    if (handle.length < 3)   return 'At least 3 characters.'
    if (handle.length > 24)  return 'Max 24 characters.'
    if (!HANDLE_RE.test(handle)) return 'Lowercase letters, digits, hyphens only.'
    if (RESERVED.has(handle))   return 'That handle is reserved.'
    return null
  }, [handle])

  // Debounced availability lookup. We bail out for any locally-invalid
  // handle so we don't spam the API while the user is still typing.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef    = useRef(0)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!handle) { setCheck({ status: 'idle' }); return }
    if (localError) { setCheck({ status: 'invalid', reason: localError }); return }

    setCheck({ status: 'checking' })
    const myReq = ++reqIdRef.current
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kita/handle-check?h=${encodeURIComponent(handle)}`, { cache: 'no-store' })
        const data = await res.json() as { available: boolean; suggestion?: string; error?: string }
        if (myReq !== reqIdRef.current) return // stale
        if (data.available) setCheck({ status: 'ok' })
        else                setCheck({ status: 'taken', suggestion: data.suggestion })
      } catch {
        if (myReq !== reqIdRef.current) return
        setCheck({ status: 'idle' }) // soft-fail; CTA stays disabled
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [handle, localError])

  // Esc-to-close — modal pattern parity with the rest of the app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const activeMacro = MACROS.find((m) => m.id === macro) ?? null
  const canSubmit = handle.length >= 3 && check.status === 'ok' && !!spec

  function submit() {
    if (!canSubmit || !spec) return
    const qs = new URLSearchParams({ handle, vertical: spec })
    window.location.assign(`/signup?${qs.toString()}`)
  }

  const loginHref = spec ? `/login?next=/dashboard/${spec}` : '/login'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Claim your Kita2u link"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ borderTop: `4px solid ${BRAND_YELLOW}` }}
      >
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <span
            aria-hidden
            className="w-9 h-9 rounded-full inline-flex items-center justify-center"
            style={{
              background: BRAND_YELLOW,
              color: TEXT_INK,
              boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
            }}
          >
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 pt-6 pb-6 space-y-4">
          <div className="border-b border-gray-100 pb-3 pr-24">
            <h2 className="text-[20px] font-black text-black leading-tight">
              Claim your link.
            </h2>
            <p className="text-[13px] text-gray-500 leading-snug mt-1">
              The only profile you&apos;ll ever need.
            </p>
          </div>

          {/* Handle input — static prefix + inline editable handle. The
              prefix is intentionally non-interactive so the user only ever
              types the handle itself. */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-extrabold text-gray-700 uppercase tracking-wider">
              Your link
            </label>
            <div
              className="flex items-center rounded-xl border bg-white overflow-hidden focus-within:border-[#FACC15] focus-within:ring-2 focus-within:ring-[#FACC15]/30 transition"
              style={{ borderColor: '#E4E4E7' }}
            >
              <span className="pl-3 pr-1 text-[14px] text-gray-500 select-none tabular-nums">
                kita2u.com/
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="your-name"
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
                className="flex-1 min-w-0 py-3 pr-3 text-[14px] text-black bg-transparent placeholder:text-gray-400 focus:outline-none min-h-[44px]"
                aria-label="Choose your handle"
              />
              {check.status === 'ok' && (
                <span aria-hidden className="pr-3 text-emerald-600">
                  <CheckIcon className="w-4 h-4" strokeWidth={3} />
                </span>
              )}
            </div>

            {check.status === 'invalid' && (
              <p className="text-[12px] font-semibold text-red-600 leading-snug">{check.reason}</p>
            )}
            {check.status === 'taken' && (
              <p className="text-[12px] font-semibold text-red-600 leading-snug">
                Taken{check.suggestion ? ` — try ${check.suggestion}` : ''}
              </p>
            )}
            {check.status === 'ok' && (
              <p className="text-[12px] font-bold text-emerald-700 leading-snug">
                kita2u.com/{handle} is free.
              </p>
            )}
            {check.status === 'checking' && (
              <p className="text-[12px] text-gray-500 leading-snug">Checking…</p>
            )}
          </div>

          {/* Macro chips — 4 customer-facing groups. We render them in a
              wrapping row so they reflow cleanly on narrow phones. */}
          <div className="space-y-2">
            <div className="text-[13px] font-extrabold text-gray-700 uppercase tracking-wider">
              What do you offer?
            </div>
            <div className="flex flex-wrap gap-2">
              {MACROS.map((m) => {
                const active = m.id === macro
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (m.id === macro) return
                      setMacro(m.id)
                      setSpec(null)
                    }}
                    className="px-3.5 rounded-full border text-[13px] font-bold transition active:scale-[0.98]"
                    style={{
                      minHeight: 44,
                      background: active ? BRAND_YELLOW : '#F4F4F5',
                      color:      active ? TEXT_INK    : '#3F3F46',
                      borderColor: active ? BRAND_YELLOW : '#E4E4E7',
                    }}
                    aria-pressed={active}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Specialty chips — only render once a macro is chosen so the
              modal stays compact for first-touch users. */}
          {activeMacro && (
            <div className="space-y-2">
              <div className="text-[13px] font-extrabold text-gray-700 uppercase tracking-wider">
                Pick your specialty
              </div>
              <div className="flex flex-wrap gap-2">
                {activeMacro.specs.map((s) => {
                  const active = s.id === spec
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpec(s.id)}
                      className="px-3.5 rounded-full border text-[13px] font-bold transition active:scale-[0.98]"
                      style={{
                        minHeight: 44,
                        background: active ? TEXT_INK : '#FFFFFF',
                        color:      active ? BRAND_YELLOW : '#3F3F46',
                        borderColor: active ? TEXT_INK : '#E4E4E7',
                      }}
                      aria-pressed={active}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-extrabold text-[14px] shadow-md active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: BRAND_YELLOW, color: TEXT_INK, minHeight: 48 }}
          >
            Claim your link &rarr;
          </button>

          <div className="text-center text-[13px] text-gray-500 pt-1">
            <a
              href={loginHref}
              className="font-bold text-[#EAB308] hover:underline"
            >
              Sign in
            </a>{' '}
            if you already have an account
          </div>
        </div>
      </div>
    </div>
  )
}
