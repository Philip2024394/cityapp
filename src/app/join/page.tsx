'use client'
import Link from 'next/link'

// /join — directory category picker.
// Reached from the landing footer ("Join today indoscity.id →"). User
// picks which vertical they want to list under; each tile routes to
// that vertical's existing signup flow. After signup the existing
// flow signs them in and drops them on the matching dashboard.

type Tile = {
  id:    string
  label: string
  sub:   string
  href:  string
  img:   string
}

const CATEGORIES: ReadonlyArray<Tile> = [
  { id: 'handyman',   label: 'Handyman',    sub: 'Tukang · Listrik · Pipa · AC',
    href: '/handyman/signup',
    img:  'https://ik.imagekit.io/nepgaxllc/Untitledasdasaasdasd-removebg-preview.png' },
  { id: 'beautician', label: 'Beautician',  sub: 'Makeup · Nail · Hair',
    href: '/beautician/signup',
    img:  'https://ik.imagekit.io/nepgaxllc/Untitledassss-removebg-preview.png' },
  { id: 'laundry',    label: 'Laundry',     sub: 'Pickup & dropoff · per kg',
    href: '/laundry/signup',
    img:  'https://ik.imagekit.io/nepgaxllc/Untitledasdasaaaaa-removebg-preview.png' },
  { id: 'massage',    label: 'Massage',     sub: 'Home & Hotel · therapist',
    href: '/massage/signup',
    img:  'https://ik.imagekit.io/nepgaxllc/Untitledsssaaa-removebg-preview.png?updatedAt=1779390066960' },
  { id: 'home-clean', label: 'Home Clean',  sub: 'Bersih rumah · per jam / hari',
    href: '/home-clean/signup',
    img:  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdasd-removebg-preview%20(1).png' },
  { id: 'tour',       label: 'Tour Guide',  sub: 'Local guides · Day trips',
    href: '/tour/list/auth',
    img:  'https://ik.imagekit.io/nepgaxllc/Untitledsssaaa-removebg-preview.png?updatedAt=1779390066960' },
]

export default function JoinPage() {
  return (
    <main className="relative min-h-screen bg-white text-black">
      <header className="px-4 pt-safe pt-[35px] pb-2 max-w-4xl mx-auto">
        <Link href="/" aria-label="Home" className="inline-block">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdas-removebg-preview.png?updatedAt=1779782176718"
            alt="IndoCity"
            className="h-8 sm:h-10 w-auto"
          />
        </Link>
      </header>

      <div className="px-4 pb-24 max-w-2xl mx-auto">
        <div className="mb-6 text-center mt-2">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-black/55">
            Join today
          </div>
          <div className="text-[24px] sm:text-[28px] font-black text-black mt-1 leading-tight">
            Pick your category
          </div>
          <p className="text-[13px] text-black/65 mt-2 max-w-md mx-auto leading-snug">
            Select the directory you want to be listed in. We&apos;ll take
            you to a quick signup, then drop you in your dashboard to
            upload your details and photos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.id}
              href={c.href}
              prefetch
              className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-brand/60 hover:bg-gray-50 active:scale-[0.99] transition-all"
              style={{ animation: `fadeUp 0.45s ease-out ${i * 0.06}s both` }}
              aria-label={`Join as ${c.label}`}
            >
              <span
                className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center"
                aria-hidden
              >
                <img src={c.img} alt="" className="h-9 w-auto object-contain" loading="lazy" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-black text-[15px] leading-tight text-black truncate">
                  {c.label}
                </span>
                <span className="block text-[12px] text-black/65 leading-snug mt-0.5 truncate">
                  {c.sub}
                </span>
              </span>
              <span className="shrink-0 text-brand text-[20px] font-extrabold">→</span>
            </Link>
          ))}
        </div>

        <p className="text-[11px] text-black/45 text-center mt-6 leading-snug max-w-md mx-auto">
          By signing up you agree to our terms. Your profile goes live
          once we verify your KTP — usually under 24 hours.
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
