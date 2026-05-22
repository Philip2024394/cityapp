'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchMyAccountCached } from '@/lib/auth/client'

// ============================================================================
// /cari ClientAuthGuard — vendor-only redirect, evaluated on the client.
// ----------------------------------------------------------------------------
// Replaces the previous `force-dynamic` server layout that did a full
// Supabase round-trip on every /cari navigation. The cari pages render
// immediately; if the signed-in account turns out to be an active rental
// company, we bounce to /dashboard/rentals after the cached account fetch
// resolves (deduped with the dashboard's own check via fetchMyAccountCached).
//
// Anonymous and personal users stay on /cari — there is no flash for them,
// because we only call router.replace when the account_type matches.
// Rental Company accounts see a brief flash of /cari content, then get
// redirected; this is the explicit trade-off vs. blocking SSR on every nav.
// ============================================================================

export default function ClientAuthGuard() {
  const router = useRouter()
  useEffect(() => {
    fetchMyAccountCached().then((j) => {
      const a = j?.account
      if (a?.account_type === 'rental_company' && a?.subscription_status === 'active') {
        router.replace('/dashboard/rentals')
      }
    })
  }, [router])
  return null
}
