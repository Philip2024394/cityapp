'use client'
import { ShieldCheck, BadgeCheck, Clock } from 'lucide-react'

// Trust strip rendered above the contact CTA. Only shows badges that
// reflect REAL data per the founder's professional cull (no fabricated
// "active this week" labels). "Last active X ago" is the honest version.

export default function TrustBadges({
  idVerified,
  phoneVerified,
  memberSince,
  lastActiveAt,
}: {
  idVerified?:    boolean
  phoneVerified?: boolean
  /** ISO timestamp from created_at / verified_at. */
  memberSince?:   string | null
  /** ISO timestamp from last_active_at — null = don't render the badge. */
  lastActiveAt?:  string | null
}) {
  const badges: React.ReactNode[] = []
  if (idVerified)    badges.push(<Badge key="id"    icon={ShieldCheck} tint="#10B981" label="ID verified"    />)
  if (phoneVerified) badges.push(<Badge key="phone" icon={BadgeCheck}  tint="#0EA5E9" label="Phone verified" />)
  if (lastActiveAt) {
    const txt = formatLastActive(lastActiveAt)
    if (txt) badges.push(<Badge key="active" icon={Clock} tint="#FACC15" label={`Last active ${txt}`} />)
  }
  if (memberSince) {
    const txt = formatMemberSince(memberSince)
    if (txt) badges.push(<TextChip key="member">{`Member ${txt}`}</TextChip>)
  }
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">{badges}</div>
  )
}

function Badge({
  icon: Icon, tint, label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tint: string
  label: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full px-2 py-0.5"
      style={{
        background: `${tint}22`,   // 13% opacity hex
        border:     `1px solid ${tint}66`,
        color:      tint,
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </span>
  )
}

function TextChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[11px] font-bold text-muted px-2 py-0.5">
      {children}
    </span>
  )
}

function formatLastActive(iso: string): string | null {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return null  // don't show "last active 4 months ago" — looks dead
}

function formatMemberSince(iso: string): string | null {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return `since ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
}
