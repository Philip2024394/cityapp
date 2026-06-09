'use client'
// mig 0228 — Draft lock prompt shared by every vertical's public profile
// page. The API responds with `{ provider: { theme_color, button_text_color,
// slug, is_draft, display_name: null }, locked: true }` whenever the row
// has `is_draft = true` and the `?p=` query param is missing/wrong. The
// page renders this gate; on successful unlock we call `onUnlocked(password)`
// so the parent can re-fetch with the password held in state.

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

type Props = {
  slug:            string
  themeColor:      string
  buttonTextColor: string
  /** API base path for the vertical, e.g. `/api/handyman/<slug>/public`. */
  fetchUrl:        (password: string) => string
  /** Called with the password after a successful unlock. The parent
   *  decides what to do with the unlocked provider blob — typically
   *  it stores the password in state so re-fetches stay unlocked. */
  onUnlocked:      (password: string, provider: unknown) => void
}

export default function DraftPasswordGate({
  themeColor, buttonTextColor, fetchUrl, onUnlocked,
}: Props) {
  const [pwInput,      setPwInput]      = useState('')
  const [pwError,      setPwError]      = useState(false)
  const [pwSubmitting, setPwSubmitting] = useState(false)

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-200 shadow-sm p-6 text-center">
        <div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: themeColor, color: buttonTextColor }}
        >
          <Sparkles size={26} strokeWidth={2.5} />
        </div>
        <h1 className="text-[20px] font-black text-black mb-1">This page is in draft</h1>
        <p className="text-[13px] text-black/65 leading-snug mb-5">
          The owner shared this with you for review. Enter the password to view.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (pwSubmitting) return
            const candidate = pwInput.trim()
            if (!candidate) { setPwError(true); return }
            setPwSubmitting(true)
            setPwError(false)
            fetch(fetchUrl(candidate), { cache: 'no-store' })
              .then((r) => r.ok ? r.json() : null)
              .then((j: { provider?: unknown; locked?: boolean } | null) => {
                if (!j?.provider) { setPwError(true); return }
                if (j.locked) { setPwError(true); return }
                onUnlocked(candidate, j.provider)
              })
              .catch(() => setPwError(true))
              .finally(() => setPwSubmitting(false))
          }}
          className="space-y-3"
        >
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); if (pwError) setPwError(false) }}
            placeholder="Password"
            className={`w-full rounded-xl bg-gray-50 border px-4 py-3 text-[14px] font-bold text-center placeholder:text-black/35 placeholder:font-normal focus:outline-none focus:bg-white ${pwError ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-gray-300 focus:ring-2 focus:ring-gray-100'}`}
            aria-label="Draft password"
            aria-invalid={pwError}
          />
          {pwError && (
            <p className="text-[12px] font-bold text-red-600">Wrong password. Try again.</p>
          )}
          <button
            type="submit"
            disabled={pwSubmitting}
            className="w-full rounded-xl py-3 text-[14px] font-extrabold shadow-md active:scale-[0.98] transition disabled:opacity-60"
            style={{ background: themeColor, color: buttonTextColor }}
          >
            {pwSubmitting ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
        <p className="text-[11px] text-black/45 mt-4 leading-snug">
          Powered by Kita2u — Pro/Studio draft sharing.
        </p>
      </div>
    </div>
  )
}
