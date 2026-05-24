import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Laundry · City Rider' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Bike Laundry"
      verticalSlug="laundry"
      dashboardHref="/dashboard/laundry"
      backHref="/dashboard/laundry"
      inclusions={[
        'Listing shop di /laundry — wash · wash-dry · wash-iron per kg',
        'Pickup + dropoff bundled — kamu atur min-kg dan turnaround',
        'Customer kontak via WhatsApp — kamu pegang 100% pembayaran',
        'Verifikasi KTP oleh admin untuk badge trust',
      ]}
    />
  )
}
