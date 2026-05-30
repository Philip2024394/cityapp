'use client'
import { useState } from 'react'
import { Star, X as XIcon } from 'lucide-react'

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_MUTED   = '#71717A'
const TEXT_SECOND  = '#52525B'
const BORDER       = '#E4E4E7'

export type Review = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

// Stable per-browser session id for review dedup. Reused across leave-
// review submissions; the API rejects same-session-same-provider dupes.
// Mirrors beautician/[slug] so customers reviewing multiple providers
// stay the same anonymous identity.
function readOrMakeReviewSessionId(): string {
  try {
    let v = localStorage.getItem('cr-review-sid')
    if (!v) {
      v = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('cr-review-sid', v)
    }
    return v
  } catch { return `sid-${Date.now()}` }
}

// Human-readable relative time for review timestamps. Byte-for-byte
// format parity with beautician/[slug]/page.tsx.
function formatReviewWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Direct port of the beautician page's ReviewsPanel, adapted for the
// driver vertical. Submits to /api/reviews with provider_type: 'driver' +
// provider_id: driver.id. Brand-yellow accents (no per-provider theme
// prop) so it slots into both /r and /car.
export default function ReviewsPanel({
  providerId, reviews, loading, onSubmitted,
}: {
  providerId:  string
  reviews:     Review[]
  loading:     boolean
  onSubmitted: () => void
}) {
  const [formOpen, setFormOpen]     = useState(false)
  const [stars, setStars]           = useState(0)
  const [name, setName]             = useState('')
  const [comment, setComment]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState<string | null>(null)

  const visible = reviews ?? []
  const avg = visible.length === 0
    ? 0
    : visible.reduce((s, r) => s + r.rating, 0) / visible.length

  async function submit() {
    setErr(null)
    if (!providerId) { setErr('Driver profile not loaded yet.'); return }
    if (stars < 1 || stars > 5) { setErr('Pick a 1-5 star rating.'); return }
    if (!name.trim())           { setErr('Please enter your name.'); return }
    if (comment.trim().length > 600) { setErr('Review max 600 characters.'); return }
    setSubmitting(true)
    try {
      const sessionId = readOrMakeReviewSessionId()
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: 'driver',
          provider_id:   providerId,
          reviewer_name: name.trim(),
          rating:        stars,
          comment:       comment.trim() || undefined,
          session_id:    sessionId,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j?.error || 'Failed to submit review.'); return }
      setStars(0); setName(''); setComment(''); setFormOpen(false)
      onSubmitted()
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-2" style={{ marginTop: 16 }}>
      {!formOpen && (
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
            Reviews
          </h2>
          <div className="text-[12px] font-bold" style={{ color: TEXT_MUTED }}>
            <span className="font-black text-[14px]" style={{ color: TEXT_INK }}>
              {avg > 0 ? avg.toFixed(1) : '—'}
            </span>
            {' · '}{visible.length} {visible.length === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      )}

      {/* Inline review form — opened by the "Leave a review" CTA below
          the list. Renders directly on the page background (no card
          wrapper) so it doesn't feel like a nested popup. */}
      {formOpen && (
        <div className="space-y-2.5 px-1 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold" style={{ color: TEXT_INK }}>Leave a review</div>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setErr(null) }}
              aria-label="Close form"
              className="rounded-full flex items-center justify-center shadow-sm active:scale-[0.95] transition"
              style={{
                background: BRAND_YELLOW, color: TEXT_INK,
                minWidth: 44, minHeight: 44,
              }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i < stars
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i + 1)}
                  aria-label={`Rate ${i + 1} star${i ? 's' : ''}`}
                  className="active:scale-[0.9] transition flex items-center justify-center"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Star
                    className="w-7 h-7 transition-colors"
                    strokeWidth={1.5}
                    fill={filled ? BRAND_YELLOW : '#D1D5DB'}
                    style={{ color: filled ? BRAND_YELLOW : '#9CA3AF' }}
                  />
                </button>
              )
            })}
          </div>

          <input
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg px-3 text-[13px] focus:outline-none"
            style={{
              minHeight: 44,
              background: '#FFFFFF',
              border: `1px solid ${BORDER}`,
              color: TEXT_INK,
            }}
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={600}
              rows={4}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (max 600 characters)"
              className="w-full rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${BORDER}`,
                color: TEXT_INK,
              }}
            />
            <div className="text-[12px] text-right" style={{ color: TEXT_MUTED }}>
              {comment.length}/600
            </div>
          </div>

          {err && (
            <div
              className="rounded-md text-[12px] px-2 py-1.5"
              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}
            >
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center rounded-full font-extrabold disabled:opacity-60 active:scale-[0.98] transition"
            style={{
              minHeight: 48,
              background: BRAND_YELLOW, color: TEXT_INK,
              border: `1px solid ${BRAND_YELLOW}`,
              fontSize: 13,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      )}

      {!formOpen && (
        <>
          <div className="space-y-2 pr-1">
            {loading && visible.length === 0 && (
              <div className="text-[12px] italic" style={{ color: TEXT_MUTED }}>Loading reviews…</div>
            )}
            {!loading && visible.length === 0 && (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: '#FAFAFA', border: `1px solid ${BORDER}` }}
              >
                <div className="text-[12px]" style={{ color: TEXT_MUTED }}>
                  No reviews yet. Be the first to leave one.
                </div>
              </div>
            )}
            {visible.map((r) => (
              <div
                key={r.id}
                className="rounded-xl p-3 space-y-1.5"
                style={{ background: '#FAFAFA', border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black shrink-0"
                      style={{ background: BRAND_YELLOW, color: TEXT_INK }}
                    >
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-extrabold truncate" style={{ color: TEXT_INK }}>
                        {r.reviewer_name}
                      </div>
                      <div className="text-[12px]" style={{ color: TEXT_MUTED }}>
                        {formatReviewWhen(r.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-3 h-3"
                        strokeWidth={0}
                        fill={j < r.rating ? BRAND_YELLOW : '#E5E7EB'}
                        style={{ color: j < r.rating ? BRAND_YELLOW : '#E5E7EB' }}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-[13px] leading-snug" style={{ color: TEXT_SECOND }}>
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-full font-extrabold uppercase tracking-wider active:scale-[0.98] transition"
            style={{
              marginTop: 12,
              minHeight: 48,
              background: BRAND_YELLOW, color: TEXT_INK,
              border: `1px solid ${BRAND_YELLOW}`,
              fontSize: 13,
              boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
            }}
          >
            <Star className="w-4 h-4" strokeWidth={0} fill={TEXT_INK} />
            Leave a review
          </button>
        </>
      )}
    </section>
  )
}
