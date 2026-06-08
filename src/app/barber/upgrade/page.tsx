import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Barber · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Barber"
      verticalSlug="barber"
      dashboardHref="/dashboard/barber"
      backHref="/dashboard/barber"
      inclusions={[
        'Listing profil di /barber — sampai 3 layanan andalan',
        'Per-cut dan combo rate bebas atur',
        'Customer kontak via WhatsApp — booking + walk-in langsung',
        'Before/after gallery + chair photos sampai 12 foto',
      ]}
    />
  )
}
