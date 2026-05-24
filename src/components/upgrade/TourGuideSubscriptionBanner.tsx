'use client'
import { useEffect, useState } from 'react'
import ProviderRenewBanner from './ProviderRenewBanner'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Tour-guide subscription lives on user_accounts (tour_guide_* cols)
// not on tour_guide_listings. This banner fetches the user's
// subscription state directly so we don't have to touch the
// dashboard's existing data shape.
//
// Status mapping: tour_guide_status uses 'active' / 'expired' / null —
// already matches what ProviderRenewBanner expects. trial_ends_at
// isn't tracked here (tour guides start at 'active' with a 7-day
// promo window baked into the page copy, not a column).

type TourGuideSub = {
  tour_guide_status: 'active' | 'expired' | 'cancelled' | null
  tour_guide_expires_at: string | null
}

export default function TourGuideSubscriptionBanner() {
  const [sub, setSub] = useState<TourGuideSub | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_accounts')
        .select('tour_guide_status, tour_guide_expires_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled || !data) return
      setSub(data as TourGuideSub)
    })().catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  if (!sub) return null

  return (
    <ProviderRenewBanner
      provider={{
        subscription_status: sub.tour_guide_status ?? 'trial',
        trial_ends_at: null,
        paid_until:    sub.tour_guide_expires_at,
      }}
      upgradeHref="/tour/upgrade"
    />
  )
}
