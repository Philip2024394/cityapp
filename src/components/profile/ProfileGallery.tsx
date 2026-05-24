'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

// Responsive 3-col grid that opens a fullscreen lightbox on tap.
// Renders nothing when there are no photos — caller doesn't need to gate.
// Caps at 12 photos in the DB (mig 0072 CHECK); component slices to be safe.

export default function ProfileGallery({
  photos,
  title = 'Gallery',
}: {
  photos: string[] | null | undefined
  title?: string
}) {
  const items = (photos ?? []).slice(0, 12).filter(Boolean)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-ink/70">
        {title}
      </h2>
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
