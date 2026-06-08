import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Tutoring · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Tutor"
      verticalSlug="tutoring"
      dashboardHref="/dashboard/tutoring"
      backHref="/dashboard/tutoring"
      inclusions={[
        'Listing profil di /tutoring — sampai 3 mata pelajaran (matematika / fisika / UTBK / english / mengaji)',
        'Per-pertemuan + paket bundle bebas atur, diskon paket (8x / 12x / monthly intensive) ditampilkan',
        'Client kontak via WhatsApp — gratis trial 30 menit + intake form (target grade / kurikulum / jadwal) + jadwal sesi langsung',
        'Belajar Bareng gallery sampai 12 foto per mata pelajaran — sesi belajar + qualifikasi visual',
      ]}
    />
  )
}
