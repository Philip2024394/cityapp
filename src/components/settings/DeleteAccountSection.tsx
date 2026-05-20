'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// DeleteAccountSection — destructive settings card.
// ----------------------------------------------------------------------------
// Two-step confirmation:
//   1. Tap "Delete my account"  → opens modal
//   2. Type "DELETE" in modal   → enables the final destructive button
//
// On success: redirects to home. On partial failure: shows the support
// email so the user can complete the request.
// ============================================================================

const CONFIRM_PHRASE = 'DELETE'

export default function DeleteAccountSection() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open() {
    setError(null)
    setPhrase('')
    setModalOpen(true)
  }
  function close() {
    if (pending) return
    setModalOpen(false)
  }

  async function confirmDelete() {
    if (phrase.trim().toUpperCase() !== CONFIRM_PHRASE) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || `Failed (${res.status})`)
        setPending(false)
        return
      }
      // Belt-and-suspenders client sign-out — the endpoint already did
      // this server-side but the browser client may hold cached tokens.
      const supabase = getBrowserSupabase()
      if (supabase) await supabase.auth.signOut().catch(() => undefined)
      router.push('/?deleted=1')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setPending(false)
    }
  }

  return (
    <>
      <div
        className="card-dark p-4 space-y-2.5"
        style={{ borderColor: 'rgba(239,68,68,0.30)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-[14px]">Delete my account</div>
            <div className="text-[12px] text-muted leading-snug">
              Permanently removes your profile, listings, push tokens, and subscription. Irreversible.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={open}
          className="w-full rounded-xl py-2.5 text-[13px] font-extrabold transition active:scale-[0.99]"
          style={{
            background: 'rgba(239,68,68,0.10)',
            color: '#F87171',
            border: '1px solid rgba(239,68,68,0.40)',
            minHeight: 44,
          }}
        >
          Delete my account…
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: '#0A0A0A', border: '1px solid rgba(239,68,68,0.35)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#EF4444' }} />
              <h2 className="font-extrabold text-[16px]">Confirm account deletion</h2>
            </div>
            <div className="text-[13px] text-muted leading-relaxed space-y-2">
              <p>This will permanently remove:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[12px]">
                <li>Your driver profile and public listing</li>
                <li>All bike rental listings you own</li>
                <li>Your subscription (no refunds for current period)</li>
                <li>Push notification tokens for all your devices</li>
                <li>Reviews you authored</li>
              </ul>
              <p className="text-[12px]">
                Customer reviews of YOU remain visible but show your profile as &quot;[deleted account]&quot;.
              </p>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted">
                Type {CONFIRM_PHRASE} to confirm
              </label>
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoFocus
                disabled={pending}
                className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-[14px] font-extrabold text-ink focus:outline-none focus:ring-2 focus:ring-red-500/60"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  minHeight: 44,
                }}
                placeholder={CONFIRM_PHRASE}
              />
            </div>
            {error && (
              <div
                className="rounded-xl p-3 text-[12px] leading-relaxed"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: '#F87171' }}
              >
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
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
                onClick={confirmDelete}
                disabled={pending || phrase.trim().toUpperCase() !== CONFIRM_PHRASE}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition active:scale-[0.99] disabled:opacity-30 inline-flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                  color: '#FFFFFF',
                  minHeight: 44,
                  boxShadow: '0 6px 16px rgba(220,38,38,0.40)',
                }}
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
