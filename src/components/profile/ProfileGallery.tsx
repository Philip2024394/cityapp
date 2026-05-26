'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import PortfolioViewToggle, { type PortfolioView } from './PortfolioViewToggle'

// Photo gallery with a fullscreen lightbox on tap.
//   variant='grid' (default) — responsive 3-col grid
//   variant='carousel'        — horizontal scroll, left-to-right swipe
//                              snaps per item, scrollbar hidden.
// Renders nothing when there are no photos — caller doesn't need to gate.
// Caps at 12 photos in the DB (mig 0072 CHECK); component slices to be safe.
//
// When both `view` AND `onViewChange` are supplied, the variant is
// driven by the controlled prop and a small grid/carousel toggle
// button renders next to the heading.

export default function ProfileGallery({
  photos,
  title = 'Gallery',
  variant = 'grid',
  titleClassName,
  view,
  onViewChange,
  enableToggle = false,
  toggleThemeColor,
}: {
  photos: string[] | null | undefined
  title?: string
  variant?: 'grid' | 'carousel'
  /** Override the heading classes — e.g. light pages want dark text. */
  titleClassName?: string
  /** Controlled layout — overrides `variant` and the internal toggle
   *  state when supplied. Pair with `onViewChange` for full control. */
  view?: PortfolioView
  /** Pair with `view` for controlled mode. Without it (and with
   *  `enableToggle`), the component manages its own toggle state. */
  onViewChange?: (next: PortfolioView) => void
  /** Show the grid/carousel toggle button with internal state.
   *  Ignored when `view` + `onViewChange` are supplied (controlled mode). */
  enableToggle?: boolean
  /** Theme accent for the toggle button. */
  toggleThemeColor?: string
}) {
  const items = (photos ?? []).slice(0, 12).filter(Boolean)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  // Internal toggle state — used only when the caller asks for the
  // toggle but doesn't pass a controlled `view`. Initialised from the
  // `variant` prop so the first render matches the caller's intent.
  const [internalView, setInternalView] = useState<PortfolioView>(variant)
  if (items.length === 0) return null

  const heading = titleClassName ?? 'text-[13px] font-extrabold uppercase tracking-wider text-ink/70'
  const controlled = view !== undefined && onViewChange !== undefined
  const effectiveVariant: PortfolioView = controlled ? view : (enableToggle ? internalView : variant)
  const showToggle = controlled || enableToggle

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className={heading}>{title}</h2>
        {showToggle && (
          <PortfolioViewToggle
            view={effectiveVariant}
            onChange={controlled ? onViewChange! : setInternalView}
            themeColor={toggleThemeColor}
          />
        )}
      </div>
      {effectiveVariant === 'carousel' ? (
        <div
          className="-mx-4 px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setOpenIdx(i)}
              className="relative w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-xl overflow-hidden bg-black/10 shrink-0 snap-start active:scale-[0.98] transition shadow-sm"
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setOpenIdx(i)}
              className="relative aspect-square rounded-lg overflow-hidden bg-black/40 active:scale-[0.98] transition"
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {openIdx != null && items[openIdx] && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setOpenIdx(null)}
        >
          <img
            src={items[openIdx]}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpenIdx(null) }}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/80 text-white flex items-center justify-center border border-white/15"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
          {/* prev / next via swipe could be added later; for v1 tap-anywhere
              closes and the grid is right behind. */}
        </div>
      )}
    </section>
  )
}
