'use client'

// ============================================================================
// Q&A editor for the dashboard. Three actions: add, edit inline, delete.
// Stays intentionally minimal — no rich text, no drag reorder in v1,
// no per-language fields. If a provider wants more they can add more rows.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Save, MessageCircleQuestion } from 'lucide-react'

type Item = { id: string; question: string; answer: string; sort_order: number }

export default function QaEditorClient() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/addons/qa', { cache: 'no-store' })
      if (r.status === 401) {
        setError('Sesi habis. Silakan masuk lagi.')
        return
      }
      const j = await r.json() as { items?: Item[] }
      setItems(j.items ?? [])
    } catch {
      setError('Gagal memuat. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addItem() {
    const q = newQ.trim()
    const a = newA.trim()
    if (q.length < 3) { setError('Pertanyaan terlalu pendek (min 3 huruf).'); return }
    if (a.length < 3) { setError('Jawaban terlalu pendek (min 3 huruf).');    return }
    setAdding(true)
    setError(null)
    try {
      const r = await fetch('/api/addons/qa', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ question: q, answer: a, sort_order: items.length }),
      })
      if (r.status === 403) { setError('Tambahan Q&A belum aktif.'); return }
      if (!r.ok)            { setError('Gagal menyimpan. Coba lagi.'); return }
      setNewQ(''); setNewA('')
      await load()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <p className="text-[13px] text-[#52525B] leading-relaxed mb-5">
        Pertanyaan dan jawaban yang muncul di profilmu. Tambah sebanyak yang
        kamu butuhkan. Customer lihat ini sebelum chat — kamu tidak perlu
        jawab pertanyaan yang sama berulang-ulang.
      </p>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-[13px] font-bold text-red-800">
          {error}
        </div>
      )}

      {/* Add new */}
      <section className="rounded-2xl border border-[#E4E4E7] p-4 mb-6">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#71717A] mb-3">
          Tambah pertanyaan baru
        </h2>
        <label className="block mb-3">
          <span className="block text-[12px] font-bold text-[#52525B] mb-1">Pertanyaan</span>
          <input
            type="text"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            maxLength={200}
            placeholder="Contoh: Berapa harga makeup wedding?"
            className="w-full px-3 py-2.5 rounded-xl border border-[#E4E4E7] bg-white text-[14px] font-bold focus:outline-none focus:border-[#FACC15] transition min-h-[44px]"
          />
        </label>
        <label className="block mb-3">
          <span className="block text-[12px] font-bold text-[#52525B] mb-1">Jawaban</span>
          <textarea
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            maxLength={1200}
            rows={3}
            placeholder="Contoh: Mulai dari Rp 1.500.000. Termasuk uji coba sebelum hari H."
            className="w-full px-3 py-2.5 rounded-xl border border-[#E4E4E7] bg-white text-[14px] font-medium focus:outline-none focus:border-[#FACC15] transition resize-y"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={addItem}
            disabled={adding || !newQ.trim() || !newA.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#0A0A0A] text-white text-[13px] font-bold hover:opacity-90 transition min-h-[44px] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            {adding ? 'Menyimpan…' : 'Tambah'}
          </button>
        </div>
      </section>

      {/* Existing items */}
      <section>
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#71717A] mb-3">
          {items.length} {items.length === 1 ? 'pertanyaan' : 'pertanyaan'}
        </h2>
        {loading ? (
          <div className="text-[13px] text-[#71717A] font-bold py-4">Memuat…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4E4E7] p-6 text-center">
            <MessageCircleQuestion className="w-7 h-7 text-gray-300 mx-auto mb-2" strokeWidth={2} aria-hidden />
            <p className="text-[13px] font-bold text-gray-600">Belum ada pertanyaan</p>
            <p className="text-[12px] text-gray-500 mt-1">
              Tambah yang pertama di atas untuk mulai
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => <Row key={it.id} item={it} onChanged={load} />)}
          </ul>
        )}
      </section>
    </div>
  )
}

function Row({ item, onChanged }: { item: Item; onChanged: () => void }) {
  const [q, setQ] = useState(item.question)
  const [a, setA] = useState(item.answer)
  const [working, setWorking] = useState(false)
  const dirty = q !== item.question || a !== item.answer

  async function save() {
    if (!dirty) return
    setWorking(true)
    try {
      await fetch('/api/addons/qa', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id: item.id, question: q, answer: a }),
      })
      await onChanged()
    } finally {
      setWorking(false)
    }
  }

  async function remove() {
    if (!confirm('Hapus pertanyaan ini?')) return
    setWorking(true)
    try {
      await fetch(`/api/addons/qa?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      await onChanged()
    } finally {
      setWorking(false)
    }
  }

  return (
    <li className="rounded-2xl border border-[#E4E4E7] p-4 bg-white">
      <label className="block mb-2">
        <span className="block text-[11px] font-bold text-[#52525B] mb-1">Pertanyaan</span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={200}
          className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-[14px] font-bold focus:outline-none focus:border-[#FACC15] transition min-h-[44px]"
        />
      </label>
      <label className="block mb-2">
        <span className="block text-[11px] font-bold text-[#52525B] mb-1">Jawaban</span>
        <textarea
          value={a}
          onChange={(e) => setA(e.target.value)}
          maxLength={1200}
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-[14px] font-medium focus:outline-none focus:border-[#FACC15] transition resize-y"
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={working}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold text-red-700 hover:bg-red-50 transition min-h-[40px] disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          Hapus
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || working}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold bg-[#FACC15] text-[#0A0A0A] hover:opacity-90 transition min-h-[40px] disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" strokeWidth={2.5} />
          {working ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </li>
  )
}
