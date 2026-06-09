'use client'
// mig 0228 — Draft-lock controls. Posts `is_draft` + `draft_password` to
// the vertical's `/api/<v>/me/profile` endpoint. Used near the bottom of
// every vertical's dashboard edit page. We don't auto-save here (unlike
// the hero-text editors) because flipping draft mode is deliberate and
// the user wants explicit feedback.

import { useEffect, useState } from 'react'

type Props = {
  isDraft:         boolean
  currentPassword: string
  /** Caller persists the patch — typically the page's existing `save()`
   *  wrapper that POSTs to `/api/<v>/me/profile`. */
  onSave:          (patch: { is_draft: boolean; draft_password: string | null }) => Promise<boolean> | boolean
  /** Vertical accent hex for the checkbox accent + input focus ring.
   *  Falls back to pink. */
  accentHex?:      string
}

export default function DraftModeControlsCard({
  isDraft, currentPassword, onSave, accentHex = '#EC4899',
}: Props) {
  const [draftOn,  setDraftOn]  = useState(isDraft)
  const [password, setPassword] = useState(currentPassword)
  const [saving,   setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => { setDraftOn(isDraft) }, [isDraft])
  useEffect(() => { setPassword(currentPassword) }, [currentPassword])

  const dirty =
    draftOn !== isDraft ||
    (draftOn && password.trim() !== currentPassword.trim())

  async function commit() {
    setError(null)
    if (draftOn && !password.trim()) {
      setError('Password is required when draft mode is on.')
      return
    }
    setSaving(true)
    try {
      const ok = await onSave({
        is_draft:       draftOn,
        draft_password: draftOn ? password.trim() : null,
      })
      if (ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      } else {
        setError('Could not save. Try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-black/65 leading-snug">
        Useful for sharing a work-in-progress version with photographers or your team.
        Draft is for sharing, not hiding — your profile is also excluded from the marketplace while draft is on.
      </p>

      <label className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-200 p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={draftOn}
          onChange={(e) => setDraftOn(e.target.checked)}
          className="mt-0.5 w-5 h-5 shrink-0"
          style={{ accentColor: accentHex }}
        />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-extrabold text-black leading-snug">
            Hide my profile behind a password (draft)
          </span>
          <span className="block text-[12px] text-black/55 leading-snug mt-0.5">
            Visitors see a password prompt instead of your profile until they enter the password below.
          </span>
        </span>
      </label>

      {draftOn && (
        <div className="space-y-1.5">
          <label className="block text-[12px] font-extrabold uppercase tracking-wider text-black/70">
            Draft password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null) }}
            maxLength={200}
            placeholder="e.g. preview123"
            className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[14px] font-bold focus:outline-none"
          />
          <p className="text-[11px] text-black/45 leading-snug">
            Stored as plain text — this is a casual review password, not auth. Share it via WhatsApp or email.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] font-bold text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void commit()}
          disabled={!dirty || saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-black text-white px-4 py-2.5 text-[13px] font-extrabold disabled:opacity-50 active:scale-[0.98] transition min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save draft mode'}
        </button>
        {savedFlash && (
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  )
}
