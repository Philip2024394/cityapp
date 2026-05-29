import Link from 'next/link'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'

export default function PropertyBuilderHome() {
  return (
    <main className="min-h-[100dvh] bg-bg text-ink px-4 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <PWAInstallCard />
        <h1 className="text-[22px] font-black mb-1">Property · Builder dashboard</h1>
        <p className="text-[12px] text-ink/65 leading-snug mb-6">
          List a pre-launch or under-construction development. Starting price + NUP booking fee.
        </p>
        <Link
          href="/dashboard/property-builder/edit"
          className="inline-block rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold"
        >Open editor</Link>
      </div>
    </main>
  )
}
