import Link from 'next/link'

export default function PropertySaleHome() {
  return (
    <main className="min-h-[100dvh] bg-bg text-ink px-4 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[22px] font-black mb-1">Property · Sales dashboard</h1>
        <p className="text-[12px] text-ink/65 leading-snug mb-6">
          List a property for sale. Editor uses the shared studio surface.
        </p>
        <Link
          href="/dashboard/property-sale/edit"
          className="inline-block rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold"
        >Open editor</Link>
      </div>
    </main>
  )
}
