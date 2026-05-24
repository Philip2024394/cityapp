'use client'
import { useState } from 'react'
import { TOUR_SERVICES, type TourServiceId } from '@/data/tourServices'

// Single-select service picker on the tour-guide dashboard. Writes
// to the same `services` text[] column as the multi-select on the
// signup form; we just store one element. The marketplace card
// already renders services with .slice(0, 3) so it shows one chip.

export default function TourServicePicker({
  initial,
}: {
  initial: TourServiceId | null
}) {
  const [value, setValue] = useState<TourServiceId | null>(initial)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  async function save(next: TourServiceId) {
    if (saving || next === value) return
    const prev = value
    setValue(next)
    setSaving(true)
    setSavedFlash(false)
    try {
      const r = await fetch('/api/tour-guide/me/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) {
        setValue(prev)
        alert('Could not save service.')
        return
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch {
      setValue(prev)
      alert('Network error — could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
        Your specialty
      </div>
      <p className="text-[11px] text-muted leading-snug">
        Pick ONE service you lead with. Customers see this as your headline category.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {TOUR_SERVICES.map((s) => {
          const active = value === s.id
          return (
            <button
              key={s.id}
              onClick={() => save(s.id)}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-extrabold border transition text-left ${
                active
                  ? 'bg-brand text-bg border-brand'
                  : 'bg-black/40 text-ink/85 border-white/15 hover:bg-white/5'
              } ${saving ? 'opacity-70' : ''}`}
            >
              <span aria-hidden>{s.emoji}</span>
              <span className="truncate">{s.label}</span>
            </button>
          )
        })}
      </div>
      {savedFlash && (
        <div className="text-[11px] font-bold text-green-300">Saved.</div>
      )}
    </div>
  )
}
