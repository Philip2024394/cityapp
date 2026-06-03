import type { Metadata } from 'next'

// /signup layout — forces CityDrivers branding on every sign-up route
// regardless of host. The root layout (src/app/layout.tsx) returns
// Kita2u branding when host !== citydrivers.id (Vercel preview URLs,
// localhost, the indocity-named project domain etc), which leaked the
// wrong tab title + applicationName into the sign-up flow. Founder
// feedback Jun 2026: "why is brand in header showing indocity for
// create account sign in page". `title.absolute` bypasses the parent
// template so the title stays exactly "Sign up — CityDrivers"
// everywhere the user might land.

export const metadata: Metadata = {
  title:           { absolute: 'Sign up — CityDrivers' },
  applicationName: 'CityDrivers',
  description:     'Create your CityDrivers driver account. Bike, car, truck, minibus, or jeep — one signup per vehicle vertical.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
