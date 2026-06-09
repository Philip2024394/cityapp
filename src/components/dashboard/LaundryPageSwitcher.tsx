'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, X, Loader2 } from 'lucide-react'
import { pageCapForPlan } from '@/lib/auth/pageCap'
import type { AccountPlan } from '@/lib/auth/account'

// ============================================================================
// LaundryPageSwitcher
// ----------------------------------------------------------------------------
// Studio-tier (Rp 149K/mo) multi-location / agency sub-account switcher.
// Cloned from BeauticianPageSwitcher (task 11/12) so every vertical has
// the same chip. Renders only when the user owns >1 laundry page OR they
// are on the Studio plan (so the "+ Add a new page" affordance is
// discoverable even with one page).
// ============================================================================

type Page = {
  id: string
  slug: string
  display_name: string
  profile_image_url: string | null
  theme_color: string | null
  status: string
  is_draft: boolean
}

const ACTIVE_SLUG_KEY = 'laundry.activeSlug'

export default function LaundryPageSwitcher() {
  const [pages,      setPages]      = useState<Page[]>([])
  const [plan,       setPlan]       = useState<AccountPlan | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [open,       setOpen]       = useState(false)
  const [adding,     setAdding]     = useState(false)
  const [loaded,     setLoaded]     = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const fromQuery = url.searchParams.get('slug')
    const fromStore = window.localStorage.getItem(ACTIVE_SLUG_KEY)
    setActiveSlug(fromQuery || fromStore || null)
  }, [])

  const loadPages = useCallback(async () => {
    try {
      const [pagesRes, acctRes] = await Promise.all([
        fetch('/api/laundry/me/pages', { cache: 'no-store' }),
        fetch('/api/me/account',          { cache: 'no-store' }),
      ])
      if (pagesRes.ok) {
        const j = await pagesRes.json() as { pages: Page[] }
        setPages(j.pages ?? [])
      }
      if (acctRes.ok) {
        const j = await acctRes.json() as { account?: { plan?: AccountPlan } | null }
        setPlan(j.account?.plan ?? null)
      }
    } catch { /* silent */ }
    finally { setLoaded(true) }
  }, [])

  useEffect(() => { void loadPages() }, [loadPages])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  if (!loaded) return null

  const cap        = pageCapForPlan(plan)
  const isStudio   = plan === 'studio'
  const hasMany    = pages.length > 1
  if (!hasMany && !isStudio) return null

  const current = pages.find((p) => p.slug === activeSlug) ?? pages[0] ?? null

  function switchTo(slug: string) {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(ACTIVE_SLUG_KEY, slug) } catch { /* private mode */ }
    const url = new URL(window.location.href)
    url.searchParams.set('slug', slug)
    window.location.assign(url.toString())
  }

  return (
    <div ref={wrapRef} className="relative max-w-lg mx-auto px-4 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 pl-1 pr-3 py-1 shadow-sm hover:bg-gray-50 transition"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {current?.profile_image_url
          ? <img src={current.profile_image_url} alt="" className="w-7 h-7 rounded-full object-cover bg-gray-100" />
          : <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-black/60 text-[11px] font-black">
              {(current?.display_name ?? '?')[0]?.toUpperCase()}
            </div>}
        <span className="text-[12.5px] font-extrabold text-black max-w-[160px] truncate">
          {current?.display_name ?? 'Choose page'}
        </span>
        <ChevronDown size={14} className={`text-black/50 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 left-4 right-4 mt-2 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden"
        >
          <div className="max-h-[60vh] overflow-y-auto">
            {pages.length === 0 ? (
              <div className="px-4 py-3 text-[12.5px] text-black/55">No pages yet</div>
            ) : (
              pages.map((p) => {
                const isActive = current?.slug === p.slug
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-b-0 ${isActive ? 'bg-gray-50' : ''}`}
                  >
                    {p.profile_image_url
                      ? <img src={p.profile_image_url} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100 flex-shrink-0" />
                      : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-black/60 text-[12px] font-black flex-shrink-0">
                          {p.display_name[0]?.toUpperCase()}
                        </div>}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-extrabold text-black truncate">{p.display_name}</div>
                      <div className="text-[11px] text-black/50 truncate">/{p.slug}{p.is_draft ? ' · draft' : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchTo(p.slug)}
                      disabled={isActive}
                      className={`text-[11px] font-extrabold uppercase tracking-wider rounded-full px-3 py-1.5 ${
                        isActive
                          ? 'bg-gray-100 text-black/50 cursor-default'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {isActive ? 'Current' : 'Switch to this page'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          {isStudio && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setAdding(true) }}
                disabled={pages.length >= cap}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-gray-200 disabled:text-black/40 text-white px-3 py-2.5 text-[12.5px] font-extrabold transition"
              >
                <Plus size={14} /> Add a new page {pages.length >= cap ? `(${cap}/${cap})` : `(${pages.length}/${cap})`}
              </button>
            </div>
          )}
        </div>
      )}

      {adding && (
        <AddPageModal
          cap={cap}
          plan={plan}
          onClose={() => setAdding(false)}
          onCreated={(slug) => {
            try { window.localStorage.setItem(ACTIVE_SLUG_KEY, slug) } catch { /* private mode */ }
            const url = new URL(window.location.href)
            url.pathname = '/dashboard/laundry'
            url.searchParams.set('slug', slug)
            window.location.assign(url.toString())
          }}
        />
      )}
    </div>
  )
}

function AddPageModal({
  cap, plan, onClose, onCreated,
}: {
  cap: number
  plan: AccountPlan | null
  onClose: () => void
  onCreated: (slug: string) => void
}) {
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<'cap' | 'name' | 'other' | null>(null)

  async function submit() {
    setError(null)
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('name'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/laundry/me/pages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ display_name: trimmed }),
      })
      const j = await r.json().catch(() => null) as { ok?: boolean; slug?: string; error?: string } | null
      if (r.status === 409 && j?.error === 'page_cap_reached') {
        setError('cap')
        return
      }
      if (!r.ok || !j?.ok || !j.slug) {
        setError('other')
        return
      }
      onCreated(j.slug)
    } catch {
      setError('other')
    } finally {
      setSaving(false)
    }
  }

  const showUpgrade = error === 'cap' || (plan !== 'studio' && plan !== null)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-[16px] font-black text-black">Add a new page</h3>
            <p className="text-[12px] text-black/60 mt-0.5">Studio plan · up to {cap} pages per account</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {showUpgrade ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-pink-50 border border-pink-200 px-4 py-3">
              <div className="text-[13px] font-extrabold text-pink-700 mb-1">
                {error === 'cap'
                  ? `You're at the ${cap}-page cap.`
                  : 'Studio plan needed to add more pages.'}
              </div>
              <div className="text-[12px] text-pink-900/80 leading-snug">
                Studio plan supports up to 5 pages for Rp 149,000/month.
              </div>
            </div>
            <a
              href="/pricing"
              className="block text-center rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-3 py-3 text-[13px] font-extrabold transition"
            >
              See plans →
            </a>
          </div>
        ) : (
          <>
            <label className="block text-[12px] font-extrabold uppercase tracking-wider text-black/55 mb-1">
              Page name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
              autoFocus
              placeholder="e.g. Branch A, Branch B, …"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-[14px] font-semibold text-black placeholder:text-black/35 focus:outline-none focus:border-pink-500"
            />
            {error === 'name' && (
              <div className="text-[11.5px] text-red-600 mt-1.5 font-bold">Please enter at least 2 characters.</div>
            )}
            {error === 'other' && (
              <div className="text-[11.5px] text-red-600 mt-1.5 font-bold">Could not create page. Please try again.</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gray-100 hover:bg-gray-200 text-black px-3 py-3 text-[13px] font-extrabold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white px-3 py-3 text-[13px] font-extrabold transition"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
