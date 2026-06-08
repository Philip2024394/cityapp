import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Fitness · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Personal trainer"
      verticalSlug="fitness"
      dashboardHref="/dashboard/fitness"
      backHref="/dashboard/fitness"
      inclusions={[
        'Listing profil di /fitness — sampai 3 spesialisasi (strength / HIIT / yoga / weight loss / muscle gain)',
        'Drop-in + monthly coaching bundle bebas atur, package discount tiers (5-pack / 10-pack) ditampilkan',
        'Client kontak via WhatsApp — konsultasi goal + intake form + free body assessment langsung',
        'Training snapshots gallery sampai 12 foto per kategori — action shots + before/after transformations',
      ]}
    />
  )
}
