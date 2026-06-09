// ============================================================================
// /start verticals catalog — single source of truth for the wizard's tile
// grid. Each entry has a slug (matches the route prefix), label, lucide icon,
// destination href for the canonical signup form, and a comingSoon flag for
// verticals where no /signup page exists yet (only `food` today).
//
// Icon parity with src/app/explore/ExploreClient — same icon per slug so the
// marketplace tile and the wizard tile read as the same vertical.
// ============================================================================
import {
  Scissors, Wrench, Flower2, Shirt, SprayCan, Sparkles, MapPinned,
  UtensilsCrossed, Brush, Crown, Camera, Video, ChefHat, Cake, Flower,
  Dumbbell, Heart, GraduationCap, PawPrint, Truck, PenTool, Car, Package,
  type LucideIcon,
} from 'lucide-react'

export type VerticalEntry = {
  slug:        string
  label:       string
  icon:        LucideIcon
  href:        string
  comingSoon:  boolean
}

// Order chosen to surface the highest-converting verticals first (Beauty,
// Tukang, Massage, Laundry — the four with the most live providers in
// 2026-Q2). Coming-soon entries drop to the end of the row they're in so
// the grid never opens with a locked tile.
export const VERTICALS: ReadonlyArray<VerticalEntry> = [
  { slug: 'beautician', label: 'Beauty',    icon: Scissors,        href: '/beautician/signup', comingSoon: false },
  { slug: 'handyman',   label: 'Tukang',    icon: Wrench,          href: '/handyman/signup',   comingSoon: false },
  { slug: 'massage',    label: 'Massage',   icon: Flower2,         href: '/massage/signup',    comingSoon: false },
  { slug: 'laundry',    label: 'Laundry',   icon: Shirt,           href: '/laundry/signup',    comingSoon: false },
  { slug: 'home-clean', label: 'Clean',     icon: SprayCan,        href: '/home-clean/signup', comingSoon: false },
  { slug: 'facial',     label: 'Facial',    icon: Sparkles,        href: '/facial/signup',     comingSoon: false },
  { slug: 'tour',       label: 'Tour',      icon: MapPinned,       href: '/tour/signup',       comingSoon: false },
  { slug: 'food',       label: 'Food',      icon: UtensilsCrossed, href: '/food',              comingSoon: true  },
  { slug: 'tattoo',     label: 'Tattoo',    icon: Brush,           href: '/tattoo/signup',     comingSoon: false },
  { slug: 'barber',     label: 'Barber',    icon: Crown,           href: '/barber/signup',     comingSoon: false },
  { slug: 'photo',      label: 'Photo',     icon: Camera,          href: '/photo/signup',      comingSoon: false },
  { slug: 'video',      label: 'Video',     icon: Video,           href: '/video/signup',      comingSoon: false },
  { slug: 'catering',   label: 'Catering',  icon: ChefHat,         href: '/catering/signup',   comingSoon: false },
  { slug: 'cake',       label: 'Cake',      icon: Cake,            href: '/cake/signup',       comingSoon: false },
  { slug: 'florist',    label: 'Florist',   icon: Flower,          href: '/florist/signup',    comingSoon: false },
  { slug: 'fitness',    label: 'Fitness',   icon: Dumbbell,        href: '/fitness/signup',    comingSoon: false },
  { slug: 'yoga',       label: 'Yoga',      icon: Heart,           href: '/yoga/signup',       comingSoon: false },
  { slug: 'tutoring',   label: 'Tutoring',  icon: GraduationCap,   href: '/tutoring/signup',   comingSoon: false },
  { slug: 'pet',        label: 'Pet',       icon: PawPrint,        href: '/pet/signup',        comingSoon: false },
  { slug: 'mover',      label: 'Mover',     icon: Truck,           href: '/mover/signup',      comingSoon: false },
  { slug: 'tailor',     label: 'Tailor',    icon: PenTool,         href: '/tailor/signup',     comingSoon: false },
  { slug: 'car-wash',   label: 'Car wash',  icon: Car,             href: '/car-wash/signup',   comingSoon: false },
  { slug: 'parcel',     label: 'Parcel',    icon: Package,         href: '/parcel/signup',     comingSoon: false },
]

export function findVertical(slug: string | null): VerticalEntry | null {
  if (!slug) return null
  return VERTICALS.find((v) => v.slug === slug) ?? null
}
