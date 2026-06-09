'use client'
// ============================================================================
// HandleEntryHero — typed-handle entry pair for the landing hero
// ----------------------------------------------------------------------------
// Replaces the plain "Start free →" button with a Linktree-style "type your
// handle, see it's available, claim your page" funnel. Per the Linktree
// audit this converts ~2× better than a blank CTA because the visitor has
// already invested the typing + emotional commitment of choosing a name
// before they see the signup form.
//
// Behaviour:
//   * Static `kita2u.com/` visual prefix + free-text input
//   * Lowercase on type, strip invalid chars in real time (no UPPERCASE,
//     no spaces, no specials — only a-z, 0-9, -)
//   * 300ms debounced fetch to /api/handle/check?h=<value>
//   * Status line below the input:
//       empty     → no status (placeholder helper text)
//       checking  → spinner + "Checking…"
//       available → green check + "Yours! Tap to claim."
//       taken     → red X + suggestion line
//       invalid   → red X + "Use 4-32 letters / numbers / dashes."
//       reserved  → red X + "That one is reserved — try another."
//   * "Get my page →" CTA disabled until status === 'available'
//   * On submit → router.push(`/start?handle=<handle>`)
//
// Styling matches the existing hero — yellow gradient button, font weights,
// max-w-md container — so it slots under the headline + lede without
// breaking the visual rhythm of the page.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

type Locale = 'id' | 'en'

type Status =
  | { kind: 'empty' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'invalid' }
  | { kind: 'reserved' }

const STRINGS: Record<Locale, {
  prefix:      string
  placeholder: string
  cta:         string
  helper:      string
  checking:    string
  available:   string
  takenLead:   string
  takenSep:    string
  invalid:     string
  reserved:    string
}> = {
  id: {
    prefix:      'kita2u.com/',
    placeholder: 'usahakamu',
    cta:         'Ambil halaman saya →',
    helper:      'Klaim handelmu — 4-32 huruf, angka, atau strip.',
    checking:    'Mengecek…',
    available:   'Punyamu! Tap untuk klaim.',
    takenLead:   'Sudah dipakai — coba',
    takenSep:    'atau',
    invalid:     'Gunakan 4-32 huruf / angka / strip.',
    reserved:    'Itu sudah dipesan — coba lainnya.',
  },
  en: {
    prefix:      'kita2u.com/',
    placeholder: 'yourbusiness',
    cta:         'Get my page →',
    helper:      'Claim your handle — 4-32 letters, numbers, or dashes.',
    checking:    'Checking…',
    available:   'Yours! Tap to claim.',
    takenLead:   'Taken — try',
    takenSep:    'or',
    invalid:     'Use 4-32 letters / numbers / dashes.',
    reserved:    'That one is reserved — try another.',
  },
}

const SUGGESTION_SUFFIXES = ['hq', 'jogja', 'co', 'official']

/** Strip everything that isn't a-z, 0-9, or `-`, and lowercase whatever
 *  the user typed. Mirrors the server's HANDLE_RE shape so the UI never
 *  sends a request the server would reject for cosmetic reasons. */
function sanitise(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

/** Pick 2 cute-suffix suggestions deterministically so the same input
 *  always yields the same two — fewer DOM repaints, fewer surprises. */
function suggestionsFor(handle: string): [string, string] {
  // Shift the suffix window by handle length so different handles see
  // different pairs (otherwise everyone gets `-hq` / `-jogja`).
  const offset = handle.length % SUGGESTION_SUFFIXES.length
  const a = SUGGESTION_SUFFIXES[offset]
  const b = SUGGESTION_SUFFIXES[(offset + 1) % SUGGESTION_SUFFIXES.length]
  return [`${handle}-${a}`, `${handle}-${b}`]
}

export default function HandleEntryHero({ locale }: { locale: Locale }) {
  const router = useRouter()
  const t = STRINGS[locale]

  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'empty' })

  // Track the in-flight request so a stale response (user kept typing)
  // can't overwrite the status of a newer one. AbortController is the
  // canonical fix.
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced availability check. 300ms balances feeling-instant with
  // not hammering the API on every keystroke.
  useEffect(() => {
    // Reset abort + debounce timers on every keystroke.
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current)    abortRef.current.abort()

    const trimmed = handle.trim()
    if (!trimmed) {
      setStatus({ kind: 'empty' })
      return
    }

    setStatus({ kind: 'checking' })

    debounceRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      fetch(`/api/handle/check?h=${encodeURIComponent(trimmed)}`, {
        signal: ctrl.signal,
        cache:  'no-store',
      })
        .then((r) => r.json())
        .then((j: { available: boolean; reason?: 'invalid' | 'reserved' | 'taken' }) => {
          if (ctrl.signal.aborted) return
          if (j.available) {
            setStatus({ kind: 'available' })
            return
          }
          switch (j.reason) {
            case 'invalid':  setStatus({ kind: 'invalid' });  break
            case 'reserved': setStatus({ kind: 'reserved' }); break
            case 'taken':    setStatus({ kind: 'taken' });    break
            default:         setStatus({ kind: 'invalid' })
          }
        })
        .catch(() => {
          if (ctrl.signal.aborted) return
          // Network failure → don't block the funnel; let the user
          // submit and the signup form's own validation catches it.
          setStatus({ kind: 'available' })
        })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [handle])

  function submit() {
    if (status.kind !== 'available') return
    const trimmed = handle.trim()
    if (!trimmed) return
    router.push(`/start?handle=${encodeURIComponent(trimmed)}`)
  }

  const ready = status.kind === 'available'

  return (
    <div className="space-y-2 pt-1">
      {/* Input row — visual prefix span + free-text input + CTA. Stacks
          on mobile (sm- = below sm), single row on sm+. */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <div
          className="flex-1 flex items-center min-h-[52px] rounded-2xl bg-white border-2 border-gray-200 focus-within:border-[#FACC15] focus-within:ring-2 focus-within:ring-[#FACC15]/30 transition overflow-hidden"
        >
          <span
            aria-hidden
            className="pl-3 pr-1 text-[14px] font-bold text-gray-400 select-none whitespace-nowrap"
          >
            {t.prefix}
          </span>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            value={handle}
            onChange={(e) => setHandle(sanitise(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && ready) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={t.placeholder}
            maxLength={32}
            aria-label={t.prefix}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none py-3 pr-3 text-[15px] font-extrabold text-[#0A0A0A] placeholder:text-gray-400 placeholder:font-medium"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          className={`min-h-[52px] rounded-2xl px-5 sm:px-6 font-extrabold text-[14px] sm:text-[15px] whitespace-nowrap transition active:scale-[0.99] ${
            ready
              ? 'bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] shadow-[0_8px_22px_rgba(250,204,21,0.35)] hover:from-brand2 hover:to-brand cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          aria-disabled={!ready}
        >
          {t.cta}
        </button>
      </div>

      {/* Status line — fixed minimum height so the layout doesn't jump
          as the status flips between states. */}
      <div className="min-h-[20px] text-[12.5px] font-bold leading-snug pl-1 flex items-start gap-1.5">
        <StatusLine status={status} handle={handle.trim()} t={t} />
      </div>
    </div>
  )
}

function StatusLine({
  status, handle, t,
}: {
  status: Status
  handle: string
  t: typeof STRINGS[Locale]
}) {
  if (status.kind === 'empty') {
    return <span className="text-gray-500 font-medium">{t.helper}</span>
  }
  if (status.kind === 'checking') {
    return (
      <>
        <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin text-gray-500" strokeWidth={2.75} />
        <span className="text-gray-500">{t.checking}</span>
      </>
    )
  }
  if (status.kind === 'available') {
    return (
      <>
        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" strokeWidth={3} />
        <span className="text-emerald-700">{t.available}</span>
      </>
    )
  }
  if (status.kind === 'invalid') {
    return (
      <>
        <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" strokeWidth={3} />
        <span className="text-rose-700">{t.invalid}</span>
      </>
    )
  }
  if (status.kind === 'reserved') {
    return (
      <>
        <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" strokeWidth={3} />
        <span className="text-rose-700">{t.reserved}</span>
      </>
    )
  }
  // taken
  const [s1, s2] = suggestionsFor(handle)
  return (
    <>
      <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" strokeWidth={3} />
      <span className="text-rose-700">
        {t.takenLead}{' '}
        <span className="font-extrabold text-[#0A0A0A]">{s1}</span>
        {' '}{t.takenSep}{' '}
        <span className="font-extrabold text-[#0A0A0A]">{s2}</span>.
      </span>
    </>
  )
}
