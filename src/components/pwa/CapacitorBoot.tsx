'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initCapacitorShell } from '@/lib/capacitor/initShell'
import { attachPushTapHandler } from '@/lib/capacitor/pushChannel'

// ============================================================================
// Mounts once at the root layout. On native, fires the one-time shell
// init (status bar + splash + push notification channel) and attaches the
// push-tap handler so a driver tapping a booking-alert notification lands
// on /alert with the pingId in the URL. On web, both are no-ops.
// ============================================================================

export default function CapacitorBoot() {
  const router = useRouter()
  useEffect(() => {
    void initCapacitorShell()
    void attachPushTapHandler((path) => router.push(path))
  }, [router])
  return null
}
