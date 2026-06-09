'use client'
// ============================================================================
// ThemePickerClient — the visual choose-your-template grid.
// ----------------------------------------------------------------------------
// Two tabs:
//   - Free (15 cards)     → clicks navigate to /free-signup?handle=&theme=
//   - Premium (23 cards)  → clicks navigate to /pricing (locked)
//
// Premium tiles re-use the LIFESTYLE_TILES icon set from /explore so a
// visitor coming from the marketplace sees the same iconography here.
//
// No thumbnails uploaded yet — each card paints a CSS gradient derived
// from the theme's defaults until the founder uploads real PNGs to
// /public/themes/<id>.png.
// ============================================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Lock, ChevronRight,
  UtensilsCrossed, MapPinned, Flower2, Scissors, Shirt, Sparkles,
  Wrench, SprayCan, Brush, Crown, Camera, Video, ChefHat, Cake,
  Flower, Dumbbell, Heart, GraduationCap, PawPrint, Truck, PenTool,
  Car, Package, type LucideIcon,
} from 'lucide-react'
import { FREE_THEMES, type FreeTheme } from '@/lib/free-themes/library'

type PremiumTile = { id: string; label: string; tagline: string; Icon: LucideIcon }

const PREMIUM_TEMPLATES: ReadonlyArray<PremiumTile> = [
  { id: 'beautician', label: 'Beautician',   tagline: 'Salon / makeup / nails template', Icon: Scissors },
  { id: 'handyman',   label: 'Handyman',     tagline: 'Per-job tukang template',         Icon: Wrench },
  { id: 'massage',    label: 'Massage',      tagline: 'Therapy bookings template',       Icon: Flower2 },
  { id: 'facial',     label: 'Facial',       tagline: 'Skincare clinic template',        Icon: Sparkles },
  { id: 'laundry',    label: 'Laundry',      tagline: 'Pickup + drop-off template',      Icon: Shirt },
  { id: 'home-clean', label: 'Home clean',   tagline: 'House cleaning template',         Icon: SprayCan },
  { id: 'tour',       label: 'Tour guide',   tagline: 'Day trip + package template',     Icon: MapPinned },
  { id: 'food',       label: 'Restaurant',   tagline: 'Menu + delivery template',        Icon: UtensilsCrossed },
  { id: 'tattoo',     label: 'Tattoo',       tagline: 'Studio portfolio template',       Icon: Brush },
  { id: 'barber',     label: 'Barber',       tagline: 'Cuts + shaves template',          Icon: Crown },
  { id: 'photo',      label: 'Photographer', tagline: 'Portfolio + booking template',    Icon: Camera },
  { id: 'video',      label: 'Videographer', tagline: 'Reel + packages template',        Icon: Video },
  { id: 'catering',   label: 'Catering',     tagline: 'Event catering template',         Icon: ChefHat },
  { id: 'cake',       label: 'Cake shop',    tagline: 'Custom cakes template',           Icon: Cake },
  { id: 'florist',    label: 'Florist',      tagline: 'Bouquets + arrangements',         Icon: Flower },
  { id: 'fitness',    label: 'Fitness',      tagline: 'Gym + PT template',               Icon: Dumbbell },
  { id: 'yoga',       label: 'Yoga',         tagline: 'Classes + retreats template',     Icon: Heart },
  { id: 'tutoring',   label: 'Tutoring',     tagline: 'Subjects + rates template',       Icon: GraduationCap },
  { id: 'pet',        label: 'Pet care',     tagline: 'Grooming + boarding template',    Icon: PawPrint },
  { id: 'mover',      label: 'Mover',        tagline: 'Movers + trucks template',        Icon: Truck },
  { id: 'tailor',     label: 'Tailor',       tagline: 'Custom tailoring template',       Icon: PenTool },
  { id: 'car-wash',   label: 'Car wash',     tagline: 'Wash + detailing template',       Icon: Car },
  { id: 'parcel',     label: 'Parcel',       tagline: 'Courier handoff template',        Icon: Package },
]

export default function ThemePickerClient({ handle }: { handle: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'free' | 'premium'>('free')

  function pickFree(theme: FreeTheme) {
    const q = new URLSearchParams()
    if (handle) q.set('handle', handle)
    q.set('theme', theme.id)
    router.push(`/free-signup?${q.toString()}`)
  }

  return (
    <>
      {/* HERO */}
      <section className="px-6 pt-10 pb-6 text-center">
        <div className="max-w-2xl mx-auto space-y-2">
          <h1 className="font-black text-[30px] sm:text-[40px] leading-[1.05] tracking-tight">
            Pick your <span style={{ color: '#FACC15' }}>theme</span>.
          </h1>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            Switch anytime from your dashboard.
          </p>
        </div>
      </section>

      {/* TAB TOGGLE */}
      <section className="px-6 pb-6">
        <div className="max-w-md mx-auto flex items-center bg-gray-100 rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab('free')}
            aria-pressed={tab === 'free'}
            className={`flex-1 min-h-[44px] rounded-full text-[13px] font-extrabold transition ${
              tab === 'free'
                ? 'bg-white text-[#0A0A0A] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-gray-500 hover:text-[#0A0A0A]'
            }`}
          >
            Free templates · 15
          </button>
          <button
            type="button"
            onClick={() => setTab('premium')}
            aria-pressed={tab === 'premium'}
            className={`flex-1 min-h-[44px] rounded-full text-[13px] font-extrabold transition inline-flex items-center justify-center gap-1.5 ${
              tab === 'premium'
                ? 'bg-white text-[#0A0A0A] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-gray-500 hover:text-[#0A0A0A]'
            }`}
          >
            Premium · 23
            <Lock className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* GRID */}
      {tab === 'free' ? (
        <section className="px-5 pb-16">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {FREE_THEMES.map((theme) => (
              <FreeCard key={theme.id} theme={theme} onClick={() => pickFree(theme)} />
            ))}
          </div>
        </section>
      ) : (
        <section className="px-5 pb-16">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {PREMIUM_TEMPLATES.map((tile) => (
              <PremiumCard key={tile.id} tile={tile} />
            ))}
          </div>
          <div className="max-w-md mx-auto pt-6 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] font-extrabold text-[14px] shadow-[0_8px_22px_rgba(250,204,21,0.35)] active:scale-95 transition"
            >
              See Pro plans
              <ChevronRight className="w-4 h-4" strokeWidth={2.75} />
            </Link>
            <p className="text-[12px] text-gray-500 mt-3 leading-snug">
              Industry templates unlock with Pro · Rp 38k / month · 7-day free trial.
            </p>
          </div>
        </section>
      )}
    </>
  )
}

function FreeCard({ theme, onClick }: { theme: FreeTheme; onClick: () => void }) {
  // Until founder uploads real thumbnails to /public/themes/, render a
  // gradient using the theme's defaults so each card still feels distinct.
  const bg = theme.defaults.pageBackground
  const accent = theme.defaults.brandColor
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.10)] hover:border-[#FACC15] transition active:scale-[0.99]"
    >
      <div
        className="aspect-[3/4] w-full flex items-center justify-center relative"
        style={{ background: bg }}
      >
        {/* Faux preview hint — small accent disc + a bar to suggest a card */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-12 h-12 rounded-full border-2"
            style={{ background: accent, borderColor: 'rgba(255,255,255,0.6)' }}
          />
          <div className="w-20 h-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />
          <div className="w-16 h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.10)' }} />
          <div className="w-24 h-7 rounded-full mt-1" style={{ background: accent }} />
        </div>
      </div>
      <div className="p-3.5 space-y-1">
        <div className="font-extrabold text-[13.5px] leading-tight text-[#0A0A0A]">{theme.name}</div>
        <div className="text-[11.5px] text-gray-500 leading-snug line-clamp-2">{theme.tagline}</div>
      </div>
    </button>
  )
}

function PremiumCard({ tile }: { tile: PremiumTile }) {
  const Icon = tile.Icon
  return (
    <Link
      href="/pricing"
      className="group relative rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.10)] hover:border-[#FACC15] transition active:scale-[0.99]"
    >
      <div
        className="aspect-[3/4] w-full flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #FAFAF7 0%, #F5F5F4 100%)' }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(250,204,21,0.18)', border: '1px solid rgba(250,204,21,0.45)' }}>
          <Icon className="w-7 h-7" strokeWidth={2} style={{ color: '#0A0A0A' }} />
        </div>
        <span
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0A0A0A] flex items-center justify-center"
          aria-label="Pro template"
        >
          <Lock className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#FACC15' }} />
        </span>
      </div>
      <div className="p-3.5 space-y-1">
        <div className="font-extrabold text-[13.5px] leading-tight text-[#0A0A0A]">{tile.label}</div>
        <div className="text-[11.5px] text-gray-500 leading-snug line-clamp-2">{tile.tagline}</div>
        <div className="pt-1 text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: '#92400E' }}>
          Pro · Rp 38k/mo
        </div>
      </div>
    </Link>
  )
}
