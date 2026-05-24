'use client'
import { useEffect, useState } from 'react'
import ProviderRenewBanner from './ProviderRenewBanner'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Reuses ProviderRenewBanner's UI for the driver subscription. Lives
// outside the driver dashboard's main data load so we can drop it in
// without re-plumbing the existing Rider object — it fetches the
// subscription dates directly with a single tiny query.
//
// Status enum mapping (drivers use a slightly different vocab):
//   trial      → trial      (unchanged)
//   active     → active     (unchanged)
//   past_due   → expired    (so the banner shows the overdue style)
//   canceled   → cancelled  (1-L → 2-L drift, see audit; spelling sweep elsewhere)

type DriverSub = {
  status: 'trial' | 'active' | 'past_due' | 'canceled' | null
  trial_ends_at: string | null
  current_period_end: string | null
}

export default function DriverSubscriptionBanner() {
  const [sub, setSub] = useState<DriverSub | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_end')
        .eq('driver_id', user.id)
        .maybeSingle()
      if (cancelled || !data) return
      setSub(data as DriverSub)
    })().catch(() => { /* silent — banner is best-effort */ })
    return () => { cancelled = true }
  }, [])

  if (!sub) return null

  return (
    <ProviderRenewBanner
      provider={{
        subscription_status:
          sub.status === 'past_due'  ? 'expired'  :
          sub.status === 'canceled'  ? 'cancelled' :
          sub.status                  ?? 'trial',
        trial_ends_at: sub.trial_ends_at,
        paid_until:    sub.current_period_end,
      }}
      upgradeHref="/dashboard/renew"
    />
  )
}
