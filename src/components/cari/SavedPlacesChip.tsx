'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, MapPin, Plus, Loader2, Trash2, AlertCircle, X as XIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// SavedPlacesChip — replaces the "Tap map" hint on the drop-off tile.
// ----------------------------------------------------------------------------
// Three states (modal contents change based on auth):
//
//   1. Loading  — checking signed-in state
//   2. Anon     — signup prompt ("Save your favorite places")
//   3. Signed in — list of saved places + "Add new" CTA
//
// Tapping a saved place calls onSelect() with its lat/lng/label — the
// parent (/cari) wires this to setDropoff + setDropoffLabel so the user
// goes from "0 typing" to "drop-off set" in one tap.
//
// Tapping "Add new" requires that a drop-off be ALREADY set (via map tap
// or search). The modal pulls the current drop-off + label from props
// and lets the user name it (Home / Office / Custom) + pick an emoji.
// ============================================================================

const EMOJI_OPTIONS = ['🏠', '🏢', '❤️', '🏝️', '🍔', '🎓', '🛒', '⛽', '🏥', '✈️', '🚉', '📍'] as const

type SavedPlace = {
  id: string
  name: string
  emoji: string
  lat: number
  lng: number
  label: string | null
}

type Props = {
  /** Current location (pickup or drop-off, depending on `kind`) — used
   *  as the source coords + label for the "Add new place" flow. */
  currentLocation?: { lat: number; lng: number } | null
  currentLocationLabel?: string
  /** Which tile this chip is attached to. Drives the modal copy ("set
   *  a pick-up location" vs "set a drop-off location"). Defaults to
   *  'dropoff' so the existing dropoff call sites keep behaving as
   *  before with no prop changes there. */
  kind?: 'pickup' | 'dropoff'
  /** Called when the user picks a saved place — parent fills the tile. */
  onSelect: (place: { lat: number; lng: number; label: string }) => void
}

export default function SavedPlacesChip({
  currentLocation,
  currentLocationLabel,
  kind = 'dropoff',
  onSelect,
}: Props) {
  const router = useRouter()
  const haptic = useHaptic()
  const [open, setOpen] = useState(false)
  const [authState, setAuthState] = useState<'loading' | 'anon' | 'signed-in'>('loading')
  const [places, setPlaces] = useState<SavedPlace[]>([])
  const [error, setError] = useState<string | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState<string>('🏠')
  const [submitting, setSubmitting] = useState(false)

  const loadPlaces = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuthState('anon'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAuthState('anon'); setPlaces([]); return }
    setAuthState('signed-in')
    try {
      const res = await fetch('/api/places/saved')
      const json = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(json.places)) {
        setPlaces(json.places as SavedPlace[])
      }
    } catch {
      /* keep stale list — non-fatal */
    }
  }, [])

  // Lazy auth check — only fires when the modal opens, so anon users
  // who never tap "Saved" don't pay a Supabase round-trip.
  useEffect(() => {
    if (!open) return
    setError(null)
    void loadPlaces()
  }, [open, loadPlaces])

  function openModal() {
    haptic.tap()
    setOpen(true)
    setAddMode(false)
  }

  function closeModal() {
    if (submitting) return
    setOpen(false)
    setAddMode(false)
    setNewName('')
    setNewEmoji('🏠')
    setError(null)
  }

  function pickPlace(p: SavedPlace) {
    haptic.tap()
    onSelect({ lat: p.lat, lng: p.lng, label: p.label || p.name })
    closeModal()
  }

  async function deletePlace(id: string) {
    haptic.tap()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/places/saved/${id}`, { method: 'DELETE' })
      if (res.ok) setPlaces((prev) => prev.filter((p) => p.id !== id))
      else setError('Could not delete — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const kindLabel = kind === 'pickup' ? 'pick-up' : 'drop-off'

  async function saveNewPlace() {
    if (!currentLocation) {
      setError(`Tap the map (or search) to set a ${kindLabel} location first, then save it.`)
      return
    }
    const cleanName = newName.trim()
    if (!cleanName) {
      setError('Give this place a name (e.g. Home, Office)')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/places/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          emoji: newEmoji,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          label: currentLocationLabel || cleanName,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || `Could not save (${res.status})`)
        return
      }
      setPlaces((prev) => [json.place as SavedPlace, ...prev])
      setAddMode(false)
      setNewName('')
      setNewEmoji('🏠')
      haptic.impact()
    } finally {
      setSubmitting(false)
    }
  }

  function goToSignup() {
    closeModal()
    router.push('/signup?role=customer')
  }

  return (
    <>
      {/* Inline chip — dark-red pill with yellow rim. Matches the
          Reviews button on /r/[slug] for visual consistency across
          the two header pills. */}
      <button
        type="button"
        onClick={openModal}
        aria-label={`Saved ${kindLabel} places`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider active:scale-95 transition"
        style={{
          background: 'linear-gradient(135deg, #B91C1C, #7F1D1D)',
          border: '2px solid #FACC15',
          boxShadow: '0 4px 12px rgba(127,29,29,0.45)',
          minHeight: 26,
        }}
      >
        <Star className="w-3 h-3" strokeWidth={2.5} fill="currentColor" style={{ color: '#FACC15' }} />
        Saved
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-safe sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Saved places"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            style={{ background: '#0A0A0A', border: '1px solid rgba(250,204,21,0.30)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 text-brand" fill="currentColor" />
                <h2 className="font-extrabold text-[16px] text-ink">
                  {addMode ? 'Save this place' : authState === 'signed-in' ? 'Your saved places' : 'Saved places'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* ─── Anon state — signup prompt ─────────────────────────── */}
            {authState === 'anon' && !addMode && (
              <div className="space-y-3">
                <p className="text-[14px] text-ink/90 leading-relaxed">
                  Save Home, Office, Mom&apos;s house — one tap to book again.
                </p>
                <ul className="text-[13px] text-muted space-y-1.5 leading-relaxed">
                  <li>📍 Sync across all your devices</li>
                  <li>⚡ One-tap booking from anywhere</li>
                  <li>🔒 Stored under UU PDP — delete anytime</li>
                </ul>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={goToSignup}
                    className="rounded-2xl py-3 inline-flex items-center justify-center gap-2 font-extrabold text-[14px] text-bg bg-gradient-to-r from-brand to-brand2 active:scale-95 transition"
                    style={{ minHeight: 48 }}
                  >
                    Sign up — 30 seconds
                  </button>
                  <button
                    type="button"
                    onClick={() => { closeModal(); router.push('/login?next=/cari') }}
                    className="rounded-2xl py-2.5 inline-flex items-center justify-center font-extrabold text-[13px] transition"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      minHeight: 44,
                    }}
                  >
                    Sign in instead
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-[12px] text-muted/70 hover:text-ink transition pt-1"
                  >
                    No thanks, tap the map instead
                  </button>
                </div>
              </div>
            )}

            {/* ─── Loading ────────────────────────────────────────────── */}
            {authState === 'loading' && (
              <div className="flex items-center justify-center py-6 text-muted text-[13px]">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading…
              </div>
            )}

            {/* ─── Signed-in: list mode ──────────────────────────────── */}
            {authState === 'signed-in' && !addMode && (
              <div className="space-y-2">
                {places.length === 0 && (
                  <p className="text-[13px] text-muted leading-relaxed py-2">
                    No saved places yet. Set a {kindLabel} (map tap or search), then come back here to save it.
                  </p>
                )}
                {places.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <button
                      type="button"
                      onClick={() => pickPlace(p)}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                    >
                      <span className="text-[20px] shrink-0" aria-hidden>{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-extrabold text-ink truncate">{p.name}</div>
                        {p.label && (
                          <div className="text-[11px] text-muted truncate leading-tight">{p.label}</div>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePlace(p.id)}
                      disabled={submitting}
                      aria-label={`Delete ${p.name}`}
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-red-400 transition"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => { setAddMode(true); setError(null); setNewName(''); setNewEmoji('🏠') }}
                  className="w-full mt-1 rounded-2xl py-2.5 inline-flex items-center justify-center gap-2 font-extrabold text-[13px] text-brand transition active:scale-[0.99]"
                  style={{
                    background: 'rgba(250,204,21,0.08)',
                    border: '1px solid rgba(250,204,21,0.30)',
                    minHeight: 44,
                  }}
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Add new place
                </button>
              </div>
            )}

            {/* ─── Signed-in: add mode ───────────────────────────────── */}
            {authState === 'signed-in' && addMode && (
              <div className="space-y-3">
                {!currentLocation && (
                  <div
                    className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
                    style={{ background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.30)' }}
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#60A5FA' }} />
                    <span className="text-ink/90">
                      Tap the map (or search) on /cari first to set a {kindLabel} location, then come back to save it.
                    </span>
                  </div>
                )}
                {currentLocation && (
                  <div
                    className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.30)' }}
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
                    <span className="text-ink/90">
                      Saving: <strong className="text-ink">{currentLocationLabel || 'Selected location'}</strong>
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value.slice(0, 30))}
                    placeholder="Home"
                    maxLength={30}
                    className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-[14px] font-extrabold text-ink focus:outline-none focus:ring-2 focus:ring-brand/60"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      minHeight: 44,
                    }}
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted">
                    Icon
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {EMOJI_OPTIONS.map((e) => {
                      const active = newEmoji === e
                      return (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setNewEmoji(e)}
                          aria-label={`Icon ${e}`}
                          className="w-10 h-10 rounded-xl text-[20px] flex items-center justify-center transition active:scale-95"
                          style={{
                            background: active ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${active ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          {e}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddMode(false)}
                    disabled={submitting}
                    className="flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition active:scale-[0.99] disabled:opacity-50"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      minHeight: 44,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNewPlace}
                    disabled={submitting || !currentLocation || newName.trim().length < 1}
                    className="flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition active:scale-[0.99] disabled:opacity-30 inline-flex items-center justify-center gap-2 text-bg bg-gradient-to-r from-brand to-brand2"
                    style={{ minHeight: 44 }}
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save place
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <span className="text-ink/90">{error}</span>
              </div>
            )}

            {/* PDP footnote */}
            {authState === 'anon' && !addMode && (
              <p className="text-[10px] text-muted/60 text-center leading-relaxed pt-1">
                We store only what you save — phone, name, and chosen places. Stored under UU 27/2022 (Indonesia PDP).
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
