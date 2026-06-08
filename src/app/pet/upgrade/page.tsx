import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Pet · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Pet Care"
      verticalSlug="pet"
      dashboardHref="/dashboard/pet"
      backHref="/dashboard/pet"
      inclusions={[
        'Listing profil di /pet — sampai 3 species + services (kucing / anjing / grooming / pet hotel / pet sitting / training)',
        'Anchor price + pet-hotel per-malam + pet-sitting per-hari bebas atur, size-tier (S/M/L/XL) ditampilkan',
        'Client kontak via WhatsApp — booking grooming + reservasi pet hotel + intake (species / size / vaksin)',
        'Pet Gallery sampai 12 foto per species + service — before/after grooming + kamar pet hotel + sertifikat groomer',
      ]}
    />
  )
}
