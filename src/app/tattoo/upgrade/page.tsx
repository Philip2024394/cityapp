import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Tattoo Artist · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Tattoo Artist"
      verticalSlug="tattoo"
      dashboardHref="/dashboard/tattoo"
      backHref="/dashboard/tattoo"
      inclusions={[
        'Listing profil di /tattoo — sampai 3 style spesialisasi',
        'Per-jam dan full-day rate bebas atur',
        'Customer kontak via WhatsApp — konsultasi + deposit langsung',
        'Portfolio gallery + flash designs sampai 12 foto',
      ]}
    />
  )
}
