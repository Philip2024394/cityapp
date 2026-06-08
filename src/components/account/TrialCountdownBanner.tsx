'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchMyAccountCached } from '@/lib/auth/client'
import { getTrialInfo, type TrialInfo } from '@/lib/auth/trial'
import type { UserAccount } from '@/lib/auth/account'

// ============================================================================
// "Day X of 7 — Y days left in your free trial" banner.
// ----------------------------------------------------------------------------
// Renders ONLY for users in the trial encoding
// (subscription_status='active' + subscription_plan=null + expires_at set).
// Paid users (plan='monthly'|'yearly'), expired users, and signed-out users
// all see nothing — getTrialInfo(account).is_trial === false → return null.
//
// We deliberately do NOT set a 60s re-render interval. The math is rounded
// to days (or hours in the last 24h) so a single render at page load is
// indistinguishable from a ticking countdown until the next nav.
// ============================================================================

const GRADIENT = 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)'

export default function TrialCountdownBanner() {
  const [info, setInfo] = useState<TrialInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyAccountCached()
      .then((res) => {
        if (cancelled) return
        // The cached fetcher loosely types the account row. Cast to the
        // canonical UserAccount shape — getTrialInfo guards every field.
        const account = (res?.account ?? null) as UserAccount | null
        setInfo(getTrialInfo(account))
      })
      .catch(() => { /* silent — banner is best-effort */ })
    return () => { cancelled = true }
  }, [])

  if (!info || !info.is_trial) return null

  const useHours = info.days_remaining <= 1
  const remainingLabel = useHours
    ? `${info.hours_remaining} hours left in your trial`
    : `${info.days_remaining} days left in your free trial`

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: GRADIENT,
        color: '#1A1A1A',
        borderRadius: 16,
        padding: '12px 16px',
        margin: '12px 16px 0',
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
        lineHeight: 1.35,
        fontWeight: 500,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
      <span style={{ flex: 1 }}>
        <strong style={{ fontWeight: 700 }}>Day {info.day_number} of 7</strong>
        <span style={{ opacity: 0.85 }}> — {remainingLabel}</span>
      </span>
      <Link
        href="/pricing"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 36,
          padding: '6px 14px',
          borderRadius: 999,
          background: '#1A1A1A',
          color: '#FACC15',
          fontWeight: 600,
          fontSize: 13,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        See plans
      </Link>
    </div>
  )
}
