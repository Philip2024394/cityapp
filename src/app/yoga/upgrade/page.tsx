import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Yoga · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Yoga teacher"
      verticalSlug="yoga"
      dashboardHref="/dashboard/yoga"
      backHref="/dashboard/yoga"
      inclusions={[
        'Listing profil di /yoga — sampai 3 style (vinyasa / yin / hatha / prenatal / aerial)',
        'Drop-in + monthly unlimited package bebas atur, package discount tiers (10-pack / unlimited) ditampilkan',
        'Client kontak via WhatsApp — trial class booking + intake form + jadwal kelas langsung',
        'Class vibes gallery sampai 12 foto per style — studio shots + pose demos',
      ]}
    />
  )
}
