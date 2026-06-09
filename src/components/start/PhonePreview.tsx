'use client'
// ============================================================================
// PhonePreview — static phone-frame mockup used by /start step 2 and step 3.
// Purpose: lock emotional commitment before the user fills any required field
// by showing a live, theme-tinted preview of their future profile page as
// they pick photo + color + name.
//
// IMPORTANT: this is a STATIC preview, not an iframe of the real page. It
// renders a hand-built simplified version (hero / display name / theme CTA /
// 3 vertical-specific sample services / WhatsApp button) so updates feel
// instant with zero network cost.
// ============================================================================
import { MessageCircle, ImageIcon, Signal, Wifi, BatteryFull } from 'lucide-react'

// Vertical-specific sample services rendered as 3 rows inside the preview.
// Kept in this file (not the wizard) so the preview component is fully
// self-contained — drop it into any future page without re-exporting samples.
const SAMPLE_SERVICES: Record<string, string[]> = {
  beautician:   ['Makeup', 'Nail Art', 'Hair Styling'],
  handyman:     ['AC Service', 'Plumbing', 'Painting'],
  barber:       ['Classic Cut', 'Skin Fade', 'Beard Trim'],
  tattoo:       ['Fineline', 'Blackwork', 'Cover-up'],
  photo:        ['Wedding', 'Prewedding', 'Product'],
  video:        ['Wedding Cinematic', 'Brand Reel', 'Music Video'],
  catering:     ['Nasi Box', 'Buffet Wedding', 'Tumpeng'],
  cake:         ['Birthday', 'Korean Bento', 'Dessert Table'],
  florist:      ['Hand Bouquet', 'Standing Flower', 'Box Arrangement'],
  fitness:      ['Drop-in PT', '10-Pack', 'Pair Training'],
  yoga:         ['Drop-in Class', '10-Pack', 'Private Session'],
  tutoring:     ['Matematika SMA', 'UTBK Paket', 'English Online'],
  pet:          ['Bath + Blow Dry', 'Full Grooming', 'Pet Hotel'],
  mover:        ['Grandmax Kota', 'Pickup Antar Kota', 'Box CDD'],
  tailor:       ['Vermak', 'Jas Custom', 'Kebaya Bridal'],
  'car-wash':   ['Motor Body', 'Mobil + Dalam', 'Detailing Premium'],
  parcel:       ['Motor Dalam Kota', 'Pickup Antar Kota', 'Instant 60-menit'],
  massage:      ['Swedish 60min', 'Deep Tissue', 'Aromatherapy'],
  laundry:      ['Cuci Kering', 'Cuci Setrika', 'Express 4 Jam'],
  facial:       ['Basic Facial', 'Brightening', 'Anti-Aging'],
  tour:         ['Borobudur Day Trip', 'Yogya City Tour', 'Adventure Pack'],
  food:         ['Set Menu', 'Catering Box', 'Snack Tray'],
  'home-clean': ['Standard Clean', 'Deep Clean', 'Move-Out Clean'],
}

// Fallback when the vertical doesn't have a sample row (defensive — every
// vertical in VERTICALS has one, but a future addition could miss the map).
const DEFAULT_SAMPLE = ['Service A', 'Service B', 'Service C']

export type PhonePreviewProps = {
  vertical: string | null
  displayName: string
  themeColor: string
  profileImageUrl: string | null
}

export default function PhonePreview({
  vertical, displayName, themeColor, profileImageUrl,
}: PhonePreviewProps) {
  const services = (vertical && SAMPLE_SERVICES[vertical]) || DEFAULT_SAMPLE
  const name     = displayName.trim() || 'Your business name'
  const color    = themeColor || '#FACC15'

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500">
        Live preview
      </div>

      {/* Phone frame — fixed aspect-ratio rounded shell with a notch.
          We approximate an iPhone 14 silhouette: rounded-[3rem], thin
          black bezel, status-bar row, then the screen content. */}
      <div
        className="relative w-[260px] h-[540px] rounded-[2.5rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] overflow-hidden"
        style={{
          background: '#0A0A0A',
          padding: '10px',
        }}
      >
        {/* Screen — inner rounded white card the actual content sits inside. */}
        <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-white flex flex-col">
          {/* Notch (dynamic-island style pill) */}
          <div
            aria-hidden
            className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[88px] h-[22px] rounded-full bg-black z-20"
          />

          {/* Status bar — time + signal/wifi/battery glyphs so the frame
              actually reads as a phone instead of just a rounded rectangle. */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-2 text-[10px] font-bold text-[#0A0A0A]">
            <span className="tabular-nums">9:41</span>
            <span className="flex items-center gap-1">
              <Signal className="w-3 h-3" strokeWidth={2.5} />
              <Wifi className="w-3 h-3" strokeWidth={2.5} />
              <BatteryFull className="w-4 h-4" strokeWidth={2.5} />
            </span>
          </div>

          {/* Scrollable content area — hero banner + name + sample rows +
              CTA. overflow-hidden on the parent contains the bleed. */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Hero band — themed strip behind the avatar so the picked
                color is the first thing the user sees. */}
            <div
              className="relative pt-7 pb-10 flex justify-center"
              style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)` }}
            >
              {/* Avatar — circular, profile image or placeholder icon. */}
              <div
                className="w-20 h-20 rounded-full border-[3px] bg-white shadow-md overflow-hidden flex items-center justify-center"
                style={{ borderColor: color }}
              >
                {profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
                )}
              </div>
            </div>

            {/* Name + handle row */}
            <div className="px-4 -mt-4 text-center">
              <div className="text-[14px] font-black text-[#0A0A0A] leading-tight truncate">
                {name}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                kita2u.com/{slugify(name)}
              </div>
            </div>

            {/* Primary CTA — themed colour button under the name. Pure
                visual; preview never navigates. */}
            <div className="px-4 mt-3">
              <div
                className="w-full h-9 rounded-full inline-flex items-center justify-center text-[11px] font-extrabold tracking-wide"
                style={{ background: color, color: pickInkOn(color) }}
              >
                Book Now
              </div>
            </div>

            {/* Services list — 3 rows. Themed left-bar accent so the
                colour repeats further down the page (matches the live
                profile templates). */}
            <div className="px-4 mt-4 space-y-2">
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-gray-500">
                Services
              </div>
              {services.slice(0, 3).map((svc) => (
                <div
                  key={svc}
                  className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center gap-2"
                >
                  <span
                    className="w-1 h-5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[11px] font-bold text-[#0A0A0A] truncate flex-1">
                    {svc}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">→</span>
                </div>
              ))}
            </div>

            {/* Spacer pushes the WhatsApp button toward the bottom of the
                screen content area, mimicking the sticky CTA on the live
                profile page. */}
            <div className="flex-1" />

            {/* WhatsApp CTA — themed bg + white message icon. */}
            <div className="px-4 pb-4">
              <div
                className="w-full h-10 rounded-full inline-flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-wide"
                style={{ background: color, color: pickInkOn(color) }}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                WhatsApp
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 text-center max-w-[260px] leading-snug">
        Updates instantly as you choose your photo, color, and business name.
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// pickInkOn — accessibility helper: returns black for light theme colors,
// white for dark ones, using a quick relative-luminance threshold. Cheaper
// than importing chroma.js for one heuristic.
// ----------------------------------------------------------------------------
function pickInkOn(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#0A0A0A'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // Rec. 709 luma — simple, accurate enough for the contrast pick.
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luma > 0.6 ? '#0A0A0A' : '#FFFFFF'
}

// ----------------------------------------------------------------------------
// slugify — rough kebab-case slug used only for the preview handle line.
// The real handle is generated server-side at signup; this is decorative.
// ----------------------------------------------------------------------------
function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'your-handle'
}
