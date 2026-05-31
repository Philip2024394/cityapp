import Link from 'next/link'
import { Bike, Car, Bus, Truck } from 'lucide-react'

// /rentals — category picker for the by-day vehicle hire product line.
// Distinct mental model from /cari (per-km, urgent ride-hailing): here
// drivers self-publish daily rates and buyers contact via WhatsApp.
// CityDrivers is a software directory only — we never set or modify prices.

export const metadata = {
  title: 'Rentals · Kita2u',
  description:
    'Vehicle hire by-day across Indonesia. Self-drive (lepas kunci) or with driver. ' +
    'Compare daily rates self-published by drivers and contact them directly via WhatsApp.',
}

type Tile = {
  id:   string
  label:string
  sub:  string
  href: string
  Icon: typeof Bike
}

const TILES: ReadonlyArray<Tile> = [
  {
    id:   'bike',
    label:'Bike',
    sub:  'Lepas kunci — Rp 75K/day from',
    href: '/rent',
    Icon: Bike,
  },
  {
    id:   'car',
    label:'Car',
    sub:  'Self-drive or with driver — Rp 250K/day from',
    href: '/rentals/car',
    Icon: Car,
  },
  {
    id:   'bus',
    label:'Bus / Minibus',
    sub:  'Charter with driver — Hiace, Innova, Avanza',
    href: '/bus',
    Icon: Bus,
  },
  {
    id:   'truck',
    label:'Truck',
    sub:  'Pickup, box-van, engkel — usually with driver+helper',
    href: '/rentals/truck',
    Icon: Truck,
  },
]

export default function RentalsHubPage() {
  return (
    <main className="relative min-h-[100dvh] bg-white text-[#0F172A]">
      <header className="px-4 pt-safe pt-[35px] pb-2 max-w-5xl mx-auto">
        <Link href="/" aria-label="Home" className="inline-block">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351"
            alt="Kita2u"
            className="h-8 sm:h-10 w-auto"
          />
        </Link>
      </header>

      <div className="px-4 pb-24 max-w-5xl mx-auto">
        <div className="mb-8 text-center mt-2">
          <div className="text-[13px] uppercase tracking-[0.18em] font-extrabold text-[#0F172A]/55">
            By-day vehicle hire
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-black text-[#0F172A] mt-1 leading-tight">
            Rentals
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#0F172A]/70 mt-3 max-w-lg mx-auto leading-snug">
            Vehicle hire by-day. Self-drive (lepas kunci) or with driver.
            Compare daily rates, contact drivers directly via WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {TILES.map((t) => {
            const Icon = t.Icon
            return (
              <Link
                key={t.id}
                href={t.href}
                prefetch
                aria-label={`Browse ${t.label} rentals`}
                className="group flex flex-col min-h-[170px] sm:min-h-[180px] p-4 sm:p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-sm hover:border-[#FACC15] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all"
              >
                <span
                  className="shrink-0 w-12 h-12 rounded-xl bg-[#FACC15]/15 flex items-center justify-center group-hover:bg-[#FACC15]/30 transition-colors"
                  aria-hidden
                >
                  <Icon className="w-6 h-6 text-[#0F172A]" strokeWidth={2.25} />
                </span>
                <span className="block font-black text-[16px] sm:text-[17px] leading-tight text-[#0F172A] mt-3">
                  {t.label}
                </span>
                <span className="block text-[13px] text-[#0F172A]/65 leading-snug mt-1.5 flex-1">
                  {t.sub}
                </span>
                <span className="block text-[13px] font-extrabold text-[#0F172A] mt-3 group-hover:text-[#0F172A]">
                  Browse <span className="text-[#EAB308]">→</span>
                </span>
              </Link>
            )
          })}
        </div>

        <p className="text-[13px] text-[#0F172A]/55 text-center mt-10 leading-snug max-w-lg mx-auto">
          All rates self-published by drivers. Kita2u is a software
          directory — we never set or modify prices.
        </p>
      </div>
    </main>
  )
}
