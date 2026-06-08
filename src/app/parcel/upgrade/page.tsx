import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Parcel · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Parcel"
      verticalSlug="parcel"
      dashboardHref="/dashboard/parcel"
      backHref="/dashboard/parcel"
      inclusions={[
        'Listing profil di /parcel — sampai 3 vehicle + service specialties (Motor / Pickup Van / Box CDD / Sepeda / Same-Day / Instant 60-min / Antar Kota)',
        'Anchor price + paket bulk bebas atur, pickup-di-lokasi toggle (siap pickup di lokasi pengirim) ditampilkan',
        'Client kontak via WhatsApp — quote kurir antar barang + slot pickup + intake (vehicle / service level / coverage / COD / asuransi)',
        'Armada Kurir sampai 12 foto per kategori — motor dalam kota + pickup antar kota + instant 60-menit + box CDD bulk',
      ]}
    />
  )
}
