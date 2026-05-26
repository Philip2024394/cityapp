'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Gift, Users, MessageCircle, ArrowRight, Sparkles } from 'lucide-react'

// ============================================================================
// ViralityPanel — the dashboard's driver-acquisition surface.
// ----------------------------------------------------------------------------
// Renders four cards in a stack:
//   1. Leaderboard rank — "You rank #X of Y in {city}"
//   2. Referral CTA — links to /dashboard/refer with months-earned summary
//   3. Buddy pairing — shows mentor (for new drivers) or mentees (for veterans)
//   4. WhatsApp group — env-var-driven invite link
//
// Single-fetch from /api/drivers/me/virality so the dashboard mounts only
// one network call for the whole virality stack.
//
// Cards self-hide if their data is empty (no rank yet, no buddy, no group
// URL set). Avoids dead surfaces that say "no data" — better to render
// nothing than to render a placeholder card.
// ============================================================================

type Referral = {
  driverId: string
  name: string
  slug: string
  city: string | null
  photoUrl: string | null
  joinedAt: string
  rewardStatus: 'pending' | 'granted' | 'cancelled'
  monthsGranted: number
}

type Mentor = {
  name: string
  slug: string
  photoUrl: string | null
  pairedAt: string
}

type Mentee = Mentor

type Payload = {
  referralCode: string | null
  referrals: Referral[]
  monthsEarned: number
  monthsPending: number
  rank: number | null
  cityTotal: number | null
  city: string | null
  mentor: Mentor | null
  mentees: Mentee[]
}

const DRIVER_GROUP_URL = process.env.NEXT_PUBLIC_DRIVER_WHATSAPP_GROUP_URL ?? ''

export default function ViralityPanel() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/drivers/me/virality')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled) return
        setData(j)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="card h-24 shimmer" />
  }
  if (!data) return null

  return (
    <div className="space-y-2.5">
      <RankCard rank={data.rank} cityTotal={data.cityTotal} city={data.city} />
      <ReferralCard
        monthsEarned={data.monthsEarned}
        monthsPending={data.monthsPending}
        referralCount={data.referrals.length}
      />
      <BuddyCard mentor={data.mentor} mentees={data.mentees} />
      {DRIVER_GROUP_URL && <DriverGroupCard city={data.city} />}
    </div>
  )
}

function RankCard({ rank, cityTotal, city }: { rank: number | null; cityTotal: number | null; city: string | null }) {
  if (rank == null || cityTotal == null || cityTotal < 2) return null
  // Top-10 gets a yellow badge, otherwise dim.
  const isTop10 = rank <= 10
  return (
    <div
      className="card p-4 flex items-center gap-3"
      style={{
        borderColor: isTop10 ? 'rgba(250,204,21,0.30)' : undefined,
        background: isTop10 ? 'rgba(250,204,21,0.05)' : undefined,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: isTop10 ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isTop10 ? 'rgba(250,204,21,0.30)' : 'rgba(255,255,255,0.10)'}`,
        }}
      >
        <Trophy className="w-5 h-5" style={{ color: isTop10 ? '#FACC15' : 'rgba(255,255,255,0.55)' }} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
          Your rank this week
        </div>
        <div className="text-[16px] font-extrabold mt-0.5 leading-tight">
          #{rank} <span className="text-muted font-bold">of {cityTotal}</span>{' '}
          {city && <span className="text-muted font-bold">in {city}</span>}
        </div>
      </div>
    </div>
  )
}

function ReferralCard({ monthsEarned, monthsPending, referralCount }: { monthsEarned: number; monthsPending: number; referralCount: number }) {
  return (
    <Link
      href="/dashboard/refer"
      className="card card-interactive p-4 flex items-center gap-3"
      style={{ background: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.30)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(250,204,21,0.18)', border: '1px solid rgba(250,204,21,0.35)' }}
      >
        <Gift className="w-5 h-5 text-brand" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[14px]">
          {referralCount === 0
            ? 'Earn 1 free month per referral'
            : `${referralCount} referred · ${monthsEarned}mo earned`}
        </div>
        <div className="text-[12px] text-muted truncate mt-0.5">
          {referralCount === 0
            ? 'Share your link in WhatsApp driver groups'
            : monthsPending > 0
              ? `${monthsPending} pending — waiting for paid signup`
              : 'Tap to share your link with more drivers'}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-brand shrink-0" />
    </Link>
  )
}

function BuddyCard({ mentor, mentees }: { mentor: Mentor | null; mentees: Mentee[] }) {
  // Show mentor card if the driver IS a mentee (new driver paired with a vet).
  if (mentor) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <img
          src={mentor.photoUrl || `https://i.pravatar.cc/100?u=${mentor.slug}`}
          alt=""
          className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
            Your buddy
          </div>
          <div className="font-extrabold text-[14px] mt-0.5 truncate">{mentor.name}</div>
          <div className="text-[12px] text-muted mt-0.5">Tap to view their profile</div>
        </div>
        <Link
          href={`/r/${mentor.slug}`}
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          aria-label={`View ${mentor.name}'s profile`}
        >
          <ArrowRight className="w-4 h-4 text-muted" strokeWidth={2.5} />
        </Link>
      </div>
    )
  }
  // Show mentees card if the driver IS a mentor.
  if (mentees && mentees.length > 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand" />
          <div className="text-[14px] font-extrabold">
            You&apos;re mentoring <span className="text-muted font-bold">· {mentees.length}</span>
          </div>
        </div>
        <ul className="space-y-2">
          {mentees.slice(0, 3).map((m) => (
            <li key={m.slug} className="flex items-center gap-3">
              <img
                src={m.photoUrl || `https://i.pravatar.cc/100?u=${m.slug}`}
                alt=""
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">{m.name}</div>
              </div>
              <Link
                href={`/r/${m.slug}`}
                className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
                aria-label={`View ${m.name}'s profile`}
              >
                <ArrowRight className="w-3.5 h-3.5 text-muted" strokeWidth={2.5} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  // No buddy data — render nothing.
  return null
}

function DriverGroupCard({ city }: { city: string | null }) {
  // env-var-driven WhatsApp invite link. Card self-hides at the parent
  // level if NEXT_PUBLIC_DRIVER_WHATSAPP_GROUP_URL is empty.
  return (
    <a
      href={DRIVER_GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-interactive p-4 flex items-center gap-3"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(37,211,102,0.20), rgba(18,140,126,0.10))',
          border: '1px solid rgba(37,211,102,0.30)',
        }}
      >
        <Users className="w-5 h-5" style={{ color: '#25D366' }} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[14px]">
          Join the {city ? `${city} ` : ''}IndoCity drivers group
        </div>
        <div className="text-[12px] text-muted truncate mt-0.5">
          WhatsApp group — driver tips, hotspots, peer support
        </div>
      </div>
      <MessageCircle className="w-4 h-4 shrink-0" style={{ color: '#25D366' }} strokeWidth={2.5} />
    </a>
  )
}
