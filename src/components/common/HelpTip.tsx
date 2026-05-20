'use client'
import { useEffect, useState } from 'react'
import { HelpCircle, X as XIcon, Lightbulb } from 'lucide-react'

// HelpTip — small icon button that opens a friendly advice popover.
// Designed for first-time + activated rider surfaces. Yellow accent,
// motivational Bahasa-friendly tone. Bottom-sheet on mobile.

export type HelpTipVariant = 'question' | 'lightbulb'

export default function HelpTip({
  title,
  body,
  variant = 'question',
  ariaLabel,
}: {
  title: string
  body: React.ReactNode
  variant?: HelpTipVariant
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const Icon = variant === 'lightbulb' ? Lightbulb : HelpCircle

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true) }}
        aria-label={ariaLabel ?? `Tips: ${title}`}
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand/60"
        style={{
          background: 'rgba(250,204,21,0.12)',
          border: '1px solid rgba(250,204,21,0.35)',
          color: '#FACC15',
        }}
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden
            className="fixed inset-0 z-[80]"
            style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(2px)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed left-0 right-0 bottom-0 z-[90] pb-safe animate-[fadeUp_0.22s_ease-out]"
          >
            <div
              className="mx-auto max-w-md w-full"
              style={{
                background: 'rgba(15,15,20,0.97)',
                borderTop: '1px solid rgba(250,204,21,0.40)',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
                      boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
                    }}
                  >
                    <Lightbulb className="w-4 h-4 text-bg" strokeWidth={2.75} />
                  </span>
                  <h2 className="text-[15px] font-extrabold text-ink leading-tight truncate">
                    {title}
                  </h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Tutup"
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <XIcon className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <div className="px-5 pb-5 text-[14px] text-ink/90 leading-relaxed space-y-2">
                {body}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
