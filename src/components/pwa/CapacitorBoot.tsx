'use client'
import { useEffect } from 'react'
import { initCapacitorShell } from '@/lib/capacitor/initShell'

// ============================================================================
// Mounts once at the root layout. On native, fires the one-time shell
// init (status bar + splash). On web, does nothing.
// ============================================================================

export default function CapacitorBoot() {
  useEffect(() => {
    void initCapacitorShell()
  }, [])
  return null
}
