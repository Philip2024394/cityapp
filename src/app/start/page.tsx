// ============================================================================
// /start — vertical-first signup wizard server wrapper.
// Server side: nothing. The wizard is a pure client component because every
// piece of state (picked vertical, photo, colour, name) is pre-auth UX.
// Suspense boundary is required so future use of useSearchParams inside the
// client tree compiles under Next 15.
// ============================================================================
import { Suspense } from 'react'
import type { Metadata } from 'next'
import StartWizardClient from './StartWizardClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Start your Kita2u page — pick your business',
  description: 'Pick your business type and watch your Kita2u page come to life. 23 verticals, 7-day free trial, no credit card.',
}

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartWizardClient />
    </Suspense>
  )
}
