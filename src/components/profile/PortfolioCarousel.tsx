'use client'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Minus, Plus, ShoppingBag, X } from 'lucide-react'

// Auto-drifting horizontal portfolio carousel + the lightbox popup that
// opens when a card's View Details is tapped. Extracted from
// /beautician/[slug] so every vertical can render the same UX.
//
// Photo shape is flat — caller is responsible for flattening any
// grouped-by-category record into a single array.

export type PortfolioPhoto = {
  url:               string
  name?:             string | null
  description?:      string | null
  price_idr?:        number | null
  object_position?:  string | null
  before_image_url?: string | null
  after_image_url?:  string | null
}

function priceLabel(amount: number | null | undefined): string | null {
  if (typeof amount !== 'number' || amount <= 0) return null
  if (amount >= 1_000_000) {
    const jt = amount / 1_000_000
    return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
  }
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export default function PortfolioCarousel({
  photos, themeColor, onViewDetails, view = 'carousel',
}: {
  photos: PortfolioPhoto[]
  themeColor: string
  onViewDetails: (photo: PortfolioPhoto) => void
  /** Layout mode. 'carousel' = auto-drifting horizontal strip (default).
   *  'grid' = static 2-col responsive grid. Same PortfolioCard items in
   *  both modes — toggled from outside via PortfolioViewToggle. */
  view?: 'carousel' | 'grid'
}) {
  const scrollerRef   = useRef<HTMLDivElement | null>(null)
  const lastInteract  = useRef<number>(0)
  // scrollLeft snaps to integer pixels in most browsers, so we track the
  // precise position in `pos` and only write the rounded value when a
  // full pixel has accumulated. Easing from inherited scroll-behavior
  // would make the drift look stuttery — we force `auto` inline.
  const lastAutoLeft  = useRef<number>(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const SPEED_PX_PER_SEC = 22
    const PAUSE_MS         = 2500

    let rafId = 0
    let lastT = performance.now()
    let pos   = el.scrollLeft

    function tick(now: number) {
      if (!el) { rafId = requestAnimationFrame(tick); return }
      const dt = (now - lastT) / 1000
      lastT = now

      const wallNow  = Date.now()
      const drifting = wallNow - lastInteract.current > PAUSE_MS
      const dragJump = Math.abs(el.scrollLeft - lastAutoLeft.current) > 3
      if (dragJump) {
        lastInteract.current = wallNow
        pos = el.scrollLeft
      } else if (drifting) {
        pos += SPEED_PX_PER_SEC * dt
        const halfWidth = el.scrollWidth / 2
        if (halfWidth > 0 && pos >= halfWidth) pos -= halfWidth
        const target = Math.round(pos)
        if (target !== el.scrollLeft) el.scrollLeft = target
      }
      lastAutoLeft.current = el.scrollLeft
      rafId = requestAnimationFrame(tick)
    }
    el.style.scrollBehavior = 'auto'
    rafId = requestAnimationFrame(tick)

    function mark() { lastInteract.current = Date.now() }
    el.addEventListener('pointerdown', mark)
    el.addEventListener('touchstart',  mark, { passive: true })
    el.addEventListener('wheel',       mark, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('pointerdown', mark)
      el.removeEventListener('touchstart',  mark)
      el.removeEventListener('wheel',       mark)
    }
  }, [photos.length])

  if (photos.length === 0) return null

  // Grid branch — same PortfolioCard items, 2/3-col responsive grid.
  // Sits below the same heading row in the caller, just a different
  // layout. Auto-drift hooks above stay mounted but the rAF loop is
  // harmless when the scroller ref isn't rendered (el will be null).
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {photos.map((photo, i) => (
          <PortfolioCard
            key={photo.url + i}
            photo={photo}
            onViewDetails={() => onViewDetails(photo)}
            themeColor={themeColor}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={scrollerRef}
      className="-mx-4 px-4 overflow-x-auto overflow-y-hidden cr-portfolio-scroll"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      <style>{`.cr-portfolio-scroll::-webkit-scrollbar{display:none}`}</style>
      <div className="flex gap-2.5 w-max">
        {photos.map((photo, i) => (
          <PortfolioCard
            key={photo.url + i}
            photo={photo}
            onViewDetails={() => onViewDetails(photo)}
            themeColor={themeColor}
          />
        ))}
        {/* Duplicate strip so the seamless drift loop has no visible gap. */}
        {photos.map((photo, i) => (
          <PortfolioCard
            key={`d-${photo.url}-${i}`}
            photo={photo}
            onViewDetails={() => onViewDetails(photo)}
            themeColor={themeColor}
          />
        ))}
      </div>
    </div>
  )
}

function PortfolioCard({
  photo, onViewDetails, themeColor,
}: {
  photo: PortfolioPhoto
  onViewDetails: () => void
  themeColor: string
}) {
  const price = priceLabel(photo.price_idr)
  return (
    <div className="w-[170px] shrink-0 snap-start rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col">
      <img
        src={photo.url}
        alt={photo.name || ''}
        loading="lazy"
        className="w-full h-[130px] object-cover bg-gray-100"
        style={{ objectPosition: photo.object_position || 'center' }}
      />
      <div className="p-2 flex flex-col gap-1">
        <div className="text-[12px] font-black text-black leading-tight truncate">
          {photo.name || '—'}
        </div>
        <p
          className="text-[10px] text-gray-500 leading-snug"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.4em',
            textOverflow: 'ellipsis',
          }}
        >
          {photo.description || ''}
        </p>
        <div className="flex items-center justify-between gap-2">
          {price && (
            <div className="text-[11px] font-extrabold text-black truncate">{price}</div>
          )}
          <button
            type="button"
            onClick={onViewDetails}
            className="ml-auto inline-flex items-center justify-center px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold active:scale-[0.97] transition shrink-0"
            style={{ background: themeColor }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// View Details lightbox popup
// ─────────────────────────────────────────────────────────────────────

export function PortfolioDetailPopup({
  photo, themeColor, canContact, onClose, onContact,
  onAddToCart, cartQty,
}: {
  photo:      PortfolioPhoto
  themeColor: string
  canContact: boolean
  onClose:    () => void
  onContact:  () => void
  /** Optional. When supplied AND photo has a positive price, the popup
   *  renders a quantity stepper + "Add to cart" CTA below the price.
   *  Beautician + handyman call sites omit this prop entirely and the
   *  cart UI is invisible — no regression there. */
  onAddToCart?: (qty: number) => void
  /** Initial quantity when opening the popup. Useful for items already
   *  in the cart (parent can pass the current line qty so editing feels
   *  continuous). Defaults to 1 otherwise. */
  cartQty?: number
}) {
  type View = 'main' | 'before' | 'after'
  const [view, setView] = useState<View>('main')
  // Local stepper qty — only matters when onAddToCart is supplied.
  // Clamped to 1..99 so a user can't ship a 0-quantity order or fat-
  // finger an absurd number into WhatsApp.
  const initialQty = typeof cartQty === 'number' && cartQty > 0 ? Math.floor(cartQty) : 1
  const [qty, setQty] = useState<number>(initialQty)
  const hasBefore = Boolean(photo.before_image_url)
  const hasAfter  = Boolean(photo.after_image_url)
  const showThumbs = hasBefore || hasAfter
  const priceIdr  = typeof photo.price_idr === 'number' && photo.price_idr > 0 ? photo.price_idr : null
  const showCartUi = Boolean(onAddToCart) && priceIdr != null
  const totalIdr   = priceIdr != null ? priceIdr * qty : 0

  const mainSrc = view === 'before' ? photo.before_image_url
                : view === 'after'  ? photo.after_image_url
                :                     photo.url
  const mainPosition = view === 'main' ? (photo.object_position || 'center') : 'center'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        style={{ borderTop: `4px solid ${themeColor}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
        >
          <X className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
        </button>

        <div className="relative">
          <img
            src={mainSrc || photo.url}
            alt={photo.name || ''}
            className="w-full aspect-square object-cover transition-opacity"
            style={{ objectPosition: mainPosition }}
          />
          {view !== 'main' && (
            <div
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow"
              style={{ background: themeColor }}
            >
              {view === 'before' ? 'Before' : 'After'}
            </div>
          )}
        </div>

        {showThumbs && (
          <div className="px-4 pt-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              Compare
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ThumbButton
                label="Main"
                src={photo.url}
                active={view === 'main'}
                onClick={() => setView('main')}
                themeColor={themeColor}
                objectPosition={photo.object_position ?? undefined}
              />
              {hasBefore && (
                <ThumbButton
                  label="Before"
                  src={photo.before_image_url ?? ''}
                  active={view === 'before'}
                  onClick={() => setView('before')}
                  themeColor={themeColor}
                />
              )}
              {hasAfter && (
                <ThumbButton
                  label="After"
                  src={photo.after_image_url ?? ''}
                  active={view === 'after'}
                  onClick={() => setView('after')}
                  themeColor={themeColor}
                />
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {photo.name && (
            <h3 className="text-[18px] font-black text-black leading-tight">{photo.name}</h3>
          )}
          {photo.description && (
            <p className="text-[13px] text-gray-600 leading-snug whitespace-pre-wrap">
              {photo.description}
            </p>
          )}
          {priceLabel(photo.price_idr) && (
            <div className="leading-none">
              <div className="text-[22px] font-black text-black">
                {priceLabel(photo.price_idr)}
              </div>
              <div className="text-[11px] font-medium text-gray-500 mt-1">Start from</div>
            </div>
          )}

          {/* Cart stepper + Add to cart — restaurant template only.
              Hidden entirely when the caller didn't pass onAddToCart
              (beautician / handyman keep their original layout) OR
              when the offer has no price (so we never wire up a
              0-rupiah line item). */}
          {showCartUi && priceIdr != null && onAddToCart && (
            <>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[13px] font-extrabold text-black">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    disabled={qty <= 1}
                    className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-black active:scale-[0.95] transition disabled:opacity-40 disabled:active:scale-100"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Minus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <span
                    className="text-[15px] font-black text-black tabular-nums"
                    style={{ minWidth: 22, textAlign: 'center' }}
                    aria-live="polite"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    aria-label="Increase quantity"
                    disabled={qty >= 99}
                    className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-black active:scale-[0.95] transition disabled:opacity-40 disabled:active:scale-100"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddToCart(qty)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full font-extrabold text-[13px] shadow-md active:scale-[0.98] transition"
                style={{ background: '#FACC15', color: '#0F172A', minHeight: 44 }}
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
                Add {qty} to cart · {priceLabel(totalIdr)}
              </button>
            </>
          )}

          {canContact && !showCartUi && (
            <button
              type="button"
              onClick={onContact}
              className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full text-white font-extrabold text-[13px] shadow-md active:scale-[0.98] transition"
              style={{ background: themeColor }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Contact
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ThumbButton({
  label, src, active, onClick, themeColor, objectPosition,
}: {
  label:           string
  src:             string
  active:          boolean
  onClick:         () => void
  themeColor:      string
  objectPosition?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-lg overflow-hidden border-2 transition active:scale-95 ${
        active ? '' : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{
        aspectRatio: '1 / 1',
        borderColor: active ? themeColor : undefined,
      }}
    >
      <img
        src={src}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: objectPosition || 'center' }}
      />
      <div
        className="absolute bottom-0 inset-x-0 text-center text-[10px] font-black uppercase tracking-wider py-0.5"
        style={{
          background: active ? themeColor : 'rgba(0,0,0,0.55)',
          color: '#FFFFFF',
        }}
      >
        {label}
      </div>
    </button>
  )
}
