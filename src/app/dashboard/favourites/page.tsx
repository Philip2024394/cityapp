'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, X as XIcon, GripVertical, ChevronUp, ChevronDown,
  Loader2, CheckCircle2, MapPin, Star, Plus,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// /dashboard/favourites
// ----------------------------------------------------------------------------
// Driver curates up to 10 places they recommend to customers. These render
// on the public /r/[slug] page in a "My favourite places" grid, AND on
// /places/[slug] in the "Tour this place with these drivers" module.
//
// Distinct from /dashboard/places (which lists places the user *owns* as a
// place-owner submitter). This page is for *recommendations* — drivers
// curate places from the 200+ already in the directory, not new places.
// ============================================================================

const MAX_PICKS = 10

type PlaceRow = {
  id: string
  slug: string
  name: string
  category: string
  city: string
  image_urls: string[] | null
  address: string | null
  rating: number | null
}

type PickedItem = {
  place_id: string
  place: PlaceRow
  note: string
}

export default function FavouritesPage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()

  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)
  const [driverCity, setDriverCity] = useState<string>('')
  const [allPlaces, setAllPlaces] = useState<PlaceRow[]>([])
  const [picked, setPicked]     = useState<PickedItem[]>([])
  const [search, setSearch]     = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Boot — auth check, driver row check, load places + existing picks
  useEffect(() => {
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login?next=/dashboard/favourites'); return }
      setUserId(user.id)

      const [{ data: driver }, { data: places }, { data: existing }] = await Promise.all([
        supabase.from('drivers').select('city').eq('user_id', user.id).maybeSingle(),
        supabase.from('places')
          .select('id, slug, name, category, city, image_urls, address, rating')
          .eq('status', 'approved')
          .order('name'),
        supabase.from('driver_places')
          .select('place_id, note, display_order, places(id, slug, name, category, city, image_urls, address, rating)')
          .eq('driver_user_id', user.id)
          .order('display_order'),
      ])

      if (cancelled) return

      if (!driver) {
        setError('Selesaikan onboarding driver dulu sebelum bisa curate places.')
        setLoading(false)
        return
      }

      setDriverCity(driver.city ?? '')
      setAllPlaces((places as PlaceRow[] | null) ?? [])

      const restored: PickedItem[] = ((existing as Array<{
        place_id: string
        note: string | null
        places: PlaceRow | null
      }> | null) ?? [])
        .filter((r) => r.places)
        .map((r) => ({ place_id: r.place_id, note: r.note ?? '', place: r.places as PlaceRow }))
      setPicked(restored)

      setLoading(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived: category list from loaded places (for filter dropdown)
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of allPlaces) set.add(p.category)
    return Array.from(set).sort()
  }, [allPlaces])

  // Derived: filtered list of places NOT yet picked, matching search + city +
  // category filters. We sort drivers's own city first so they see the most
  // relevant rows.
  const filteredAvailable = useMemo(() => {
    const pickedIds = new Set(picked.map((p) => p.place_id))
    const q = search.trim().toLowerCase()
    return allPlaces
      .filter((p) => !pickedIds.has(p.id))
      .filter((p) => filterCategory === 'all' || p.category === filterCategory)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        // Driver's own city first
        if (a.city === driverCity && b.city !== driverCity) return -1
        if (b.city === driverCity && a.city !== driverCity) return 1
        return a.name.localeCompare(b.name)
      })
      .slice(0, 80) // cap render — search to find more
  }, [allPlaces, picked, search, filterCategory, driverCity])

  function addPlace(p: PlaceRow) {
    if (picked.length >= MAX_PICKS) return
    setPicked((prev) => [...prev, { place_id: p.id, place: p, note: '' }])
    setSaved(false)
  }
  function removePlace(placeId: string) {
    setPicked((prev) => prev.filter((p) => p.place_id !== placeId))
    setSaved(false)
  }
  function moveUp(idx: number) {
    if (idx <= 0) return
    setPicked((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setSaved(false)
  }
  function moveDown(idx: number) {
    setPicked((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
    setSaved(false)
  }
  function updateNote(placeId: string, note: string) {
    setPicked((prev) => prev.map((p) => (p.place_id === placeId ? { ...p, note } : p)))
    setSaved(false)
  }

  async function save() {
    setError(null); setSaved(false); setSaving(true)
    try {
      const res = await fetch('/api/driver-places', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: picked.map((p) => ({ place_id: p.place_id, note: p.note || null })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || 'Save failed.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <AppNav />
        <main className="max-w-3xl mx-auto px-4 pt-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
        </main>
      </>
    )
  }
  if (error && !userId) {
    return (
      <>
        <AppNav />
        <main className="max-w-3xl mx-auto px-4 pt-12 text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <Link href="/dashboard" className="text-brand font-bold">← Dashboard</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-24">
        <div className="max-w-3xl mx-auto px-4 pt-3 space-y-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header>
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
              My <span className="gradient-text">favourite places</span>
            </h1>
            <p className="text-[13px] text-muted mt-1 leading-snug">
              Pick up to {MAX_PICKS} places you recommend to customers. They appear on your public page
              and link customers back to you when they browse those places.
            </p>
          </header>

          {/* Picked stack — the curated list, with reorder + note + remove */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">
                Your list · {picked.length} / {MAX_PICKS}
              </h2>
              {picked.length > 0 && (
                <span className="text-[12px] text-muted">Top of list = first on your page</span>
              )}
            </div>

            {picked.length === 0 && (
              <div className="card p-5 text-center">
                <p className="text-[13px] text-muted">
                  Belum ada tempat dipilih. Cari di bawah ↓
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {picked.map((item, idx) => {
                const photo = item.place.image_urls?.[0] ?? null
                return (
                  <li key={item.place_id} className="card p-3 flex items-stretch gap-3">
                    <div className="flex flex-col justify-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-brand disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <GripVertical className="w-4 h-4 text-dim self-center" />
                      <button
                        type="button"
                        onClick={() => moveDown(idx)}
                        disabled={idx === picked.length - 1}
                        aria-label="Move down"
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-brand disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-16 shrink-0 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-dim" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[14px] font-extrabold text-ink leading-tight truncate">
                          {item.place.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removePlace(item.place_id)}
                          aria-label="Remove"
                          className="shrink-0 w-7 h-7 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[12px] text-muted truncate">
                        {item.place.address ?? item.place.city} · {item.place.category}
                      </div>
                      <input
                        type="text"
                        placeholder="Note (optional, max 200) — e.g. Best at sunset, go by 5pm"
                        value={item.note}
                        maxLength={200}
                        onChange={(e) => updateNote(item.place_id, e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-[13px] text-ink placeholder:text-dim focus:outline-none focus:border-brand/40"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Available — search + filter + add. Hidden if at the cap. */}
          {picked.length < MAX_PICKS && (
            <section className="space-y-3">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">
                Add a place
              </h2>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-dim absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search places by name or address"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[14px] text-ink placeholder:text-dim focus:outline-none focus:border-brand/40"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[13px] text-ink focus:outline-none focus:border-brand/40"
                >
                  <option value="all">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredAvailable.map((p) => {
                  const photo = p.image_urls?.[0] ?? null
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPlace(p)}
                      className="card p-2 flex items-stretch gap-2 text-left hover:border-brand/40 transition group"
                    >
                      <div className="w-14 shrink-0 rounded-lg overflow-hidden bg-black/60 border border-white/10 aspect-square">
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-dim" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-extrabold text-ink leading-tight line-clamp-2">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-muted truncate mt-0.5">
                          {p.city}{p.rating ? ` · ★${p.rating.toFixed(1)}` : ''}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-brand shrink-0 self-center opacity-60 group-hover:opacity-100" />
                    </button>
                  )
                })}
              </div>
              {filteredAvailable.length === 0 && (
                <p className="text-[13px] text-muted text-center py-6">
                  No matches. Try a different search or category.
                </p>
              )}
            </section>
          )}

          {error && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">
              {error}
            </div>
          )}

          {/* Save bar — sticky at bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            <div className="max-w-3xl mx-auto px-4 pb-3">
              <div className="glass-strong rounded-2xl p-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : saved
                      ? <><CheckCircle2 className="w-4 h-4" /> Saved · {picked.length} place{picked.length === 1 ? '' : 's'}</>
                      : <><Star className="w-4 h-4" /> Save {picked.length} place{picked.length === 1 ? '' : 's'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
