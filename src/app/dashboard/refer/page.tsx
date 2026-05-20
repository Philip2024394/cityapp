'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Share2, Copy, Check, Users, Gift, MessageCircle, CheckCircle2, Clock } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// /dashboard/refer — driver-to-driver referral surface.
// ----------------------------------------------------------------------------
// Every driver gets a /?ref={slug} link they can share. New drivers who
// sign up via that link get attributed to the referrer; once they convert
// to an active paid subscription, the referrer earns one free month of
// subscription credit.
//
// This is the highest-leverage growth surface in the app — drivers in
// Indonesia organise in WhatsApp groups, and a single share-to-WA tap
// drops the referral link into their network. Per the original viral
// plan: this alone could drive 20-40% of new signups within 90 days.
// ============================================================================

type Referral = {
  driverId: string
  name: string
  slug: string
  city: string | null
  photoUrl: string | null
  joinedAt: string
  rating: number | null
  tripsCount: number | null
  rewardStatus: 'pending' | 'granted' | 'cancelled'
  monthsGranted: number
}

type ViralityPayload = {
  referralCode: string | null
  referralUrl: string | null
  referrals: Referral[]
  monthsEarned: number
  monthsPending: number
  rank: number | null
  cityTotal: number | null
  city: string | null
}

export default function ReferDashboard() {
  const haptic = useHaptic()
  const [data, setData] = useState<ViralityPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/drivers/me/virality')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled) return
        setData(j)
        setLoading(false)
        if (j?.referralCode && typeof window !== 'undefined') {
          setShareUrl(`${window.location.origin}/?ref=${encodeURIComponent(j.referralCode)}`)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function onCopy() {
    if (!shareUrl) return
    haptic.tap()
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  async function onShareWhatsApp() {
    if (!shareUrl) return
    haptic.tap()
    const text = `Saya gabung City Rider — platform driver motor independen tanpa potongan komisi. Profil + harga kamu sendiri, customer langsung WhatsApp. Sign up pakai link saya:

${shareUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function onShareNative() {
    if (!shareUrl) return
    haptic.tap()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on City Rider',
          text: 'Platform driver motor independen — tanpa potongan komisi.',
          url: shareUrl,
        })
      } catch { /* user cancel */ }
    } else {
      void onCopy()
    }
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-28">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          {/* Back nav */}
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>

          {/* Hero — code + share buttons */}
          <div className="card p-5 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-70"
              style={{
                background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.18), transparent 60%)',
              }}
            />
            <div className="relative">
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim leading-none flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                Refer a driver — earn 1 free month
              </div>
              <h1 className="text-[22px] font-extrabold mt-2 leading-tight">
                Your referral link
              </h1>
              <p className="text-[13px] text-muted mt-1 leading-relaxed">
                Every driver who signs up via your link gives you <span className="text-brand font-bold">+1 month</span> of free subscription. Share in your WhatsApp groups.
              </p>

              {loading ? (
                <div className="mt-4 h-14 rounded-2xl bg-white/5 shimmer" />
              ) : data?.referralCode ? (
                <>
                  {/* Share link block */}
                  <div
                    className="mt-4 rounded-2xl p-3 flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold">Your link</div>
                      <div className="text-[14px] font-bold truncate font-mono">{shareUrl || '—'}</div>
                    </div>
                    <button
                      onClick={onCopy}
                      aria-label="Copy link"
                      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95"
                      style={{
                        background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {copied
                        ? <Check className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                        : <Copy className="w-4 h-4 text-muted" strokeWidth={2.5} />}
                    </button>
                  </div>

                  {/* Share to WhatsApp — primary CTA */}
                  <button
                    onClick={onShareWhatsApp}
                    className="mt-3 w-full p-4 rounded-2xl font-extrabold text-[15px] text-bg active:scale-[0.99] transition flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      boxShadow: '0 10px 24px rgba(37,211,102,0.35)',
                      minHeight: 52,
                    }}
                  >
                    <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
                    Share on WhatsApp
                  </button>

                  <button
                    onClick={onShareNative}
                    className="mt-2 w-full p-3 rounded-2xl font-extrabold text-[13px] text-ink active:scale-[0.99] transition flex items-center justify-center gap-2"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      minHeight: 44,
                    }}
                  >
                    <Share2 className="w-4 h-4" strokeWidth={2.5} />
                    More share options
                  </button>
                </>
              ) : (
                <div className="mt-4 text-[13px] text-muted">
                  Complete your driver profile to get your referral link.
                </div>
              )}
            </div>
          </div>

          {/* Reward summary */}
          {!loading && data && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-4 text-center">
                <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">Months earned</div>
                <div className="text-[28px] font-extrabold mt-1 leading-none" style={{ color: '#22C55E' }}>
                  {data.monthsEarned}
                </div>
                <div className="text-[12px] text-muted mt-1">already credited</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">Pending</div>
                <div className="text-[28px] font-extrabold mt-1 leading-none text-brand">
                  {data.monthsPending}
                </div>
                <div className="text-[12px] text-muted mt-1">awaiting paid signup</div>
              </div>
            </div>
          )}

          {/* Referrals list */}
          {!loading && data && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted" />
                <h2 className="text-[14px] font-extrabold">
                  Drivers you referred {data.referrals.length > 0 && (
                    <span className="text-muted font-bold">· {data.referrals.length}</span>
                  )}
                </h2>
              </div>
              {data.referrals.length === 0 ? (
                <p className="text-[13px] text-muted leading-relaxed">
                  No referrals yet. Share your link above — every driver who joins through it gives you a free month.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.referrals.map((r) => (
                    <li
                      key={r.driverId}
                      className="rounded-xl p-2.5 flex items-center gap-3"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <img
                        src={r.photoUrl || `https://i.pravatar.cc/100?u=${r.slug}`}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-[13px] truncate">{r.name}</div>
                        <div className="text-[12px] text-muted mt-0.5 truncate">
                          {r.city ?? 'Indonesia'} · joined {formatJoined(r.joinedAt)}
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-[12px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full"
                        style={{
                          background: r.rewardStatus === 'granted' ? 'rgba(34,197,94,0.15)' : 'rgba(250,204,21,0.15)',
                          color:      r.rewardStatus === 'granted' ? '#22C55E' : '#FACC15',
                        }}
                      >
                        {r.rewardStatus === 'granted'
                          ? <><CheckCircle2 className="w-3 h-3" /> +{r.monthsGranted} mo</>
                          : <><Clock className="w-3 h-3" /> Pending</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="card p-4">
            <h2 className="text-[14px] font-extrabold mb-3">How it works</h2>
            <ol className="space-y-2.5 text-[13px] text-muted leading-relaxed">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-bg font-extrabold flex items-center justify-center text-[12px]">1</span>
                <span>Share your link in driver WhatsApp groups, Facebook, or in person.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-bg font-extrabold flex items-center justify-center text-[12px]">2</span>
                <span>Friend signs up via your link. We track the attribution automatically.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-bg font-extrabold flex items-center justify-center text-[12px]">3</span>
                <span>When they convert to a paid subscription, your account gets credited <span className="text-brand font-bold">+1 month free</span> automatically.</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
    </>
  )
}

function formatJoined(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const ageMs = Date.now() - t
  const days = Math.floor(ageMs / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}
