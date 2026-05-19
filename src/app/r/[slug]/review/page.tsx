'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Star, CheckCircle2, Loader2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { fetchDriverBySlugBrowser } from '@/lib/drivers/queries'
import { findRiderBySlug } from '@/data/mockRiders'
import type { Rider } from '@/types/rider'

// ============================================================================
// /r/[slug]/review — public anonymous review submission
// ----------------------------------------------------------------------------
// Customers tap "Leave a review" on the driver's public page. No auth.
// Session id is a localStorage-stored UUID so the same browser session
// cannot post duplicate reviews for one driver (server enforces via
// unique index too). Standard Yelp/Google-Review model — the platform
// makes no representation that the reviewer actually used the driver.
// ============================================================================

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'cityrider:session_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export default function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()

  const [rider, setRider] = useState<Rider | null>(() => findRiderBySlug(slug) ?? null)
  useEffect(() => {
    let cancelled = false
    fetchDriverBySlugBrowser(slug).then((r) => { if (!cancelled && r) setRider(r) })
    return () => { cancelled = true }
  }, [slug])

  const [rating, setRating]   = useState<number>(0)
  const [name, setName]       = useState('')
  const [country, setCountry] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rider) return
    setError(null)
    if (rating < 1) { setError('Pilih rating 1-5 bintang.'); return }
    if (!name.trim()) { setError('Masukkan nama panggilan.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_user_id: rider.id,
          reviewer_name: name.trim(),
          reviewer_country: country.trim() || null,
          rating,
          comment: comment.trim() || null,
          session_id: getSessionId(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || 'Gagal submit review.'); return }
      setDone(true)
      // Auto-return to the driver page after a beat
      setTimeout(() => router.push(`/r/${slug}`), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit gagal.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!rider) {
    return (
      <>
        <AppNav />
        <main className="max-w-md mx-auto px-4 pt-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-12">
        <div className="max-w-md mx-auto px-4 pt-3 space-y-4">
          <Link
            href={`/r/${slug}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {rider.name}
          </Link>

          <header className="text-center pt-2">
            <img
              src={rider.photoUrl}
              alt={rider.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto ring-2 ring-white/15"
            />
            <h1 className="text-[20px] font-extrabold leading-tight mt-3">
              Rate {rider.name.split(' ')[0]}
            </h1>
            <p className="text-[12px] text-muted mt-1 leading-snug">
              Your review will appear on {rider.name.split(' ')[0]}&apos;s public page.
              No account needed.
            </p>
          </header>

          {done ? (
            <div
              className="rounded-2xl p-6 text-center space-y-2"
              style={{
                background: 'rgba(250,204,21,0.10)',
                border: '1px solid rgba(250,204,21,0.40)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(250,204,21,0.08) inset',
              }}
            >
              <CheckCircle2 className="w-10 h-10 text-brand mx-auto" />
              <p className="text-[15px] font-extrabold">Terima kasih!</p>
              <p className="text-[12px] text-muted">Returning to {rider.name.split(' ')[0]}&apos;s page…</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-4 space-y-4"
              style={{
                // Yellow-tinted glass container so the review form pops
                // against the dark background image. Visible whether the
                // user is reading "Your rating" or scrolled to the comment
                // textarea — gives the whole section a clear boundary.
                background: 'rgba(250,204,21,0.08)',
                border: '1px solid rgba(250,204,21,0.40)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(250,204,21,0.08) inset',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {/* Stars */}
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2 text-center">
                  Your rating
                </div>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      className="p-1 active:scale-95 transition"
                    >
                      <Star
                        className="w-9 h-9"
                        style={{
                          color: n <= rating ? '#FACC15' : 'rgba(255,255,255,0.18)',
                          fill: n <= rating ? '#FACC15' : 'transparent',
                        }}
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">Your name</label>
                <input
                  className="input"
                  placeholder="Sarah"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Country (optional) */}
              <div>
                <label className="label">Country (optional)</label>
                <input
                  className="input"
                  placeholder="AU"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                />
                <p className="text-[11px] text-dim mt-1">
                  2-letter code (AU, ID, FR…). Shown next to your name.
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="label">Comment (optional)</label>
                <textarea
                  className="input min-h-[88px]"
                  placeholder="What was the ride / tour like?"
                  rows={4}
                  maxLength={600}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <p className="text-[11px] text-dim mt-1 text-right">
                  {comment.length} / 600
                </p>
              </div>

              {error && (
                <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || rating < 1}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  : <><Star className="w-4 h-4" /> Submit review</>}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
