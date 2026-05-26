'use client'
import { LayoutGrid, Columns3 } from 'lucide-react'

// Small toggle button — flips a profile page's portfolio between
// auto-drifting carousel and a 2-col grid layout. Used on every
// vertical's /[slug] page next to the Portfolio heading.

export type PortfolioView = 'carousel' | 'grid'

export default function PortfolioViewToggle({
  view,
  onChange,
  themeColor = '#0A0A0A',
}: {
  view: PortfolioView
  onChange: (next: PortfolioView) => void
  /** Border + icon colour. Defaults to near-black; pass per-page theme. */
  themeColor?: string
}) {
  const next: PortfolioView = view === 'carousel' ? 'grid' : 'carousel'
  const Icon = view === 'carousel' ? LayoutGrid : Columns3
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={view === 'carousel' ? 'Switch to grid view' : 'Switch to carousel view'}
      title={view === 'carousel' ? 'Grid view' : 'Carousel view'}
      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${themeColor}33`,
        color: themeColor,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={2.25} />
    </button>
  )
}
