'use client'
import { useCallback, useEffect, useRef } from 'react'
import { ArrowLeftRight } from 'lucide-react'

// Interactive before/after image comparison slider. Two images stacked
// with the BEFORE clipped via CSS `clip-path: inset(0 calc(100% - var(--cr-clip)) 0 0)`
// so only its left portion is visible, exposing the AFTER image beneath.
// A draggable vertical bar updates the `--cr-clip` CSS variable on the
// container so the clip + handle position stay in sync without React
// re-renders during the drag — keeps it 60fps even on low-end Android.
//
// Pointer Events API handles mouse + touch + pen in one path. We listen
// on the document during a drag so the user can drag outside the
// container without losing the gesture, which is the common case when
// pushing the handle all the way to either edge.
//
// Default aspect ratio is 4:3 — tall enough for face / eye / lash work
// and wide enough for hair / nail. Callers can override via `aspect`.
// The detail-popup view passes `4 / 5` to retain the older taller crop.

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  themeColor,
  altBefore = 'Before',
  altAfter  = 'After',
  /** CSS aspect-ratio token (e.g. '4 / 3', '4 / 5', '1 / 1'). Defaults
   *  4:3 — the portfolio-block default per Linktree-beat audit. */
  aspect    = '4 / 3',
  className = '',
}: {
  beforeUrl:  string
  afterUrl:   string
  themeColor: string
  altBefore?: string
  altAfter?:  string
  aspect?:    string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingRef  = useRef<boolean>(false)

  // Position the clip from a clientX. Math is dead simple: subtract the
  // container's left edge from clientX to get a local x, divide by the
  // container width for a 0..1 ratio, clamp, then write as a percentage.
  const setClipFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = (clientX - rect.left) / rect.width
    const pct   = Math.max(0, Math.min(1, ratio)) * 100
    el.style.setProperty('--cr-clip', pct + '%')
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    // Capture so we still get pointermove + pointerup if the finger
    // drifts off the element. Don't preventDefault on pointerdown — that
    // blocks focus on iOS.
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch {}
    setClipFromClientX(e.clientX)
  }, [setClipFromClientX])

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!draggingRef.current) return
      setClipFromClientX(e.clientX)
    }
    function up() { draggingRef.current = false }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup',     up)
    document.addEventListener('pointercancel', up)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup',     up)
      document.removeEventListener('pointercancel', up)
    }
  }, [setClipFromClientX])

  // Initial slide-in: left → 50% over ~400ms, respecting
  // prefers-reduced-motion. We mutate the CSS variable directly so the
  // container's clip + handle stay in sync without React state churn.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      el.style.setProperty('--cr-clip', '50%')
      return
    }
    el.style.setProperty('--cr-clip', '0%')
    let rafId = 0
    const start = performance.now()
    const DURATION_MS = 400
    function frame(now: number) {
      if (!el) return
      // Don't fight an active drag — bail out the moment the user grabs.
      if (draggingRef.current) return
      const t = Math.min(1, (now - start) / DURATION_MS)
      // ease-out cubic so it lands gently at 50%.
      const eased = 1 - Math.pow(1 - t, 3)
      el.style.setProperty('--cr-clip', (eased * 50) + '%')
      if (t < 1) rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [beforeUrl, afterUrl])

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      className={`relative w-full overflow-hidden bg-gray-100 select-none touch-none cursor-ew-resize ${className}`}
      style={{
        // Default to 0/100 split so the slide-in animation has somewhere
        // to travel from. The effect above interpolates to 50%.
        ['--cr-clip' as any]: '0%',
        aspectRatio: aspect,
        borderBottom: `3px solid ${themeColor}`,
      }}
    >
      {/* Layer 1 — AFTER image, full size. */}
      <img
        src={afterUrl}
        alt={altAfter}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      {/* Layer 2 — BEFORE image, clipped from the right by var(--cr-clip). */}
      <img
        src={beforeUrl}
        alt={altBefore}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: 'inset(0 calc(100% - var(--cr-clip)) 0 0)' }}
      />

      {/* Corner labels — white text on translucent black per spec. */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white pointer-events-none"
           style={{ background: 'rgba(0,0,0,0.55)' }}>
        Before
      </div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white pointer-events-none"
           style={{ background: 'rgba(0,0,0,0.55)' }}>
        After
      </div>

      {/* Vertical bar — left position tracks the clip variable directly. */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: 'var(--cr-clip)', width: 4, marginLeft: -2, background: '#FFFFFF', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }}
      />
      {/* Grip — centred on the bar via translate-x(-50%). */}
      <div
        className="absolute top-1/2 flex items-center justify-center rounded-full bg-white shadow-md pointer-events-none"
        style={{
          left: 'var(--cr-clip)',
          width: 36,
          height: 36,
          transform: 'translate(-50%, -50%)',
          border: `2px solid ${themeColor}`,
        }}
      >
        <ArrowLeftRight className="w-4 h-4" strokeWidth={2.5} style={{ color: themeColor }} />
      </div>
    </div>
  )
}
