'use client'

// ============================================================================
// /search results client — reads ?q= from the URL, calls /api/search, and
// renders mixed-vertical hits in a single white-card list. Each row links
// to its own profile (handles /food/[slug], /beautician/[slug], etc.).
//
// Mobile-first layout: 72px image left, name + city + summary middle,
// chevron right. 44px+ tap targets. Reading order matches what a thumb
// scans top-down on a phone.
// ============================================================================

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronRight, MapPin, Search as SearchIcon, X,
  UtensilsCrossed, Scissors, Wrench, Shirt, Flower2, SprayCan, Sparkles, MapPinned,
  type LucideIcon,
} from 'lucide-react'

type SearchHit = {
  id:          string
  kind:        'food' | 'place' | 'beautician' | 'handyman' | 'laundry' | 'massage' | 'home-clean' | 'facial'
  slug:        string
  name:        string
  city:        string | null
  imageUrl:    string | null
  summary:     string | null
  profileUrl:  string
  relevance:   number
}

type SearchResponse = { q: string; hits: SearchHit[]; count?: number; error?: string }

const KIND_BADGE: Record<SearchHit['kind'], { label: string; Icon: LucideIcon; tint: string }> = {
  food:         { label: 'Resto',      Icon: UtensilsCrossed, tint: '#F59E0B' },
  place:        { label: 'Tempat',     Icon: MapPinned,       tint: '#0EA5E9' },
  beautician:   { label: 'Beauty',     Icon: Scissors,        tint: '#EC4899' },
  handyman:     { label: 'Tukang',     Icon: Wrench,          tint: '#0A0A0A' },
  laundry:      { label: 'Laundry',    Icon: Shirt,           tint: '#2563EB' },
  massage:      { label: 'Pijat',      Icon: Flower2,         tint: '#16A34A' },
  'home-clean': { label: 'Bersih',     Icon: SprayCan,        tint: '#0891B2' },
  facial:       { label: 'Facial',     Icon: Sparkles,        tint: '#DB2777' },
}

export default function SearchResultsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = (searchParams?.get('q') ?? '').trim()

  const [query, setQuery] = useState(initialQ)
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string>('')

  // Debounced fetch — wait 250ms after the user stops typing to avoid
  // a request per keystroke. Empty queries clear the result list without
  // hitting the API.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setHits([])
      setLastQuery('')
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error('search request failed')
        const data: SearchResponse = await res.json()
        setHits(data.hits || [])
        setLastQuery(trimmed)
        // Keep the URL in sync so refreshes / shared links survive.
        const sp = new URLSearchParams(window.location.search)
        sp.set('q', trimmed)
        router.replace(`/search?${sp.toString()}`, { scroll: false })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Pencarian gagal. Coba lagi.')
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => { clearTimeout(handle); ctrl.abort() }
  }, [query, router])

  const grouped = useMemo(() => groupByKind(hits), [hits])

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-16">
      {/* Search input — always at the top so the user can refine without
          having to go back to /explore. */}
      <div
        className="relative flex items-center bg-white rounded-2xl mb-4"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
      >
        <SearchIcon className="absolute left-3.5 w-5 h-5 text-gray-400" strokeWidth={2.25} aria-hidden />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari — potong rambut, computer service, laundry…"
          aria-label="Cari"
          className="w-full pl-11 pr-11 py-3 rounded-2xl bg-transparent text-[14px] font-bold placeholder:text-gray-400 focus:outline-none"
          style={{ minHeight: 48 }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Kosongkan pencarian"
            className="absolute right-2 w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-500 hover:text-[#0A0A0A] hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* States: empty / loading / error / no-results / results */}
      {query.trim().length < 2 ? (
        <EmptyHint />
      ) : loading ? (
        <div className="text-[13px] text-[#71717A] font-bold py-6">Memuat hasil…</div>
      ) : error ? (
        <div className="text-[13px] text-red-700 font-bold py-6">{error}</div>
      ) : hits.length === 0 ? (
        <NoResults query={lastQuery} />
      ) : (
        <div className="space-y-6">
          <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-gray-500">
            {hits.length} hasil untuk "{lastQuery}"
          </div>
          {grouped.map(([kind, rows]) => (
            <section key={kind}>
              <KindHeader kind={kind} count={rows.length} />
              <ul className="space-y-2 mt-2">
                {rows.map((hit) => <ResultRow key={hit.id} hit={hit} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function groupByKind(hits: SearchHit[]): Array<[SearchHit['kind'], SearchHit[]]> {
  const order: SearchHit['kind'][] = ['food','beautician','handyman','massage','facial','laundry','home-clean','place']
  const map = new Map<SearchHit['kind'], SearchHit[]>()
  for (const k of order) map.set(k, [])
  for (const h of hits) map.get(h.kind)?.push(h)
  return order.map(k => [k, map.get(k) ?? []]).filter(([, rows]) => rows.length > 0) as Array<[SearchHit['kind'], SearchHit[]]>
}

function KindHeader({ kind, count }: { kind: SearchHit['kind']; count: number }) {
  const meta = KIND_BADGE[kind]
  const Icon = meta.Icon
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-7 h-7 rounded-lg inline-flex items-center justify-center"
        style={{ background: '#FACC15' }}
        aria-hidden
      >
        <Icon className="w-4 h-4" style={{ color: '#0A0A0A' }} strokeWidth={2.5} />
      </span>
      <h2 className="font-extrabold text-[15px] tracking-tight">{meta.label}</h2>
      <span className="text-[12px] font-bold text-gray-500">· {count}</span>
    </div>
  )
}

function ResultRow({ hit }: { hit: SearchHit }) {
  const meta = KIND_BADGE[hit.kind]
  return (
    <li>
      <Link
        href={hit.profileUrl}
        prefetch={false}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition min-h-[92px]"
        style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
      >
        <div
          className="shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-[#F4F4F5] flex items-center justify-center"
          aria-hidden
        >
          {hit.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hit.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <meta.Icon className="w-7 h-7 text-gray-400" strokeWidth={2} aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[14px] truncate leading-tight">{hit.name || 'Tanpa nama'}</span>
          </div>
          {hit.city && (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#52525B] leading-tight">
              <MapPin className="w-3 h-3" strokeWidth={2.5} aria-hidden />
              <span className="truncate">{hit.city}</span>
              <span className="text-[#A1A1AA]">·</span>
              <span className="font-extrabold" style={{ color: meta.tint }}>{meta.label}</span>
            </div>
          )}
          {hit.summary && (
            <p className="mt-1 text-[12px] text-[#71717A] leading-tight line-clamp-2">{hit.summary}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2.5} aria-hidden />
      </Link>
    </li>
  )
}

function EmptyHint() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
      <SearchIcon className="w-7 h-7 text-gray-300 mx-auto mb-2" strokeWidth={2} aria-hidden />
      <p className="text-[13px] font-bold text-gray-600">
        Ketik apa yang kamu cari — minimal 2 huruf.
      </p>
      <p className="text-[12px] text-gray-500 mt-1">
        Contoh: <span className="font-bold">potong rambut</span> · <span className="font-bold">computer service</span> · <span className="font-bold">laundry</span>
      </p>
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
      <p className="text-[14px] font-extrabold text-[#0A0A0A] mb-1">
        Belum ada hasil untuk "{query}"
      </p>
      <p className="text-[12px] text-gray-500">
        Coba kata lain, atau{' '}
        <Link href="/signup?intent=provider" className="font-extrabold text-[#0A0A0A] underline">
          daftarkan usahamu sebagai yang pertama →
        </Link>
      </p>
    </div>
  )
}
