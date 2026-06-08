import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Car Wash · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Car Wash"
      verticalSlug="carwash"
      dashboardHref="/dashboard/car-wash"
      backHref="/dashboard/car-wash"
      inclusions={[
        'Listing profil di /car-wash — sampai 3 vehicle + wash specialties (Motor / Mobil Kecil / Mobil Sedang / SUV / Pickup / MPV / Detailing / Coating)',
        'Anchor price + paket detailing/coating bebas atur, home-call toggle (panggilan ke rumah dalam kota) ditampilkan',
        'Client kontak via WhatsApp — quote cuci kendaraan + booking slot + intake (vehicle size / wash level / panggilan ke rumah)',
        'Hasil Cucian sampai 12 foto per kategori — motor express + body+dalam + detailing premium + coating ceramic + before/after',
      ]}
    />
  )
}
