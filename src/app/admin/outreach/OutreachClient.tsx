'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  CATEGORY_LABELS,
  WHATSAPP_TEMPLATES,
  GMAPS_QUERIES,
  fillTemplate,
  gmapsSearchUrl,
  type OutreachCategory,
} from '@/lib/outreach/templates'

// Outreach CRM client — runs on the admin page.
// Three tabs:
//   • Pipeline — list of leads, filter by category/status, bulk add
//   • Templates — copy WA message templates with name/city auto-fill
//   • Find leads — Google Maps search-URL launcher per category × city

type Contact = {
  id: string
  business_name: string
  category: OutreachCategory
  city: string | null
  whatsapp_e164: string | null
  email: string | null
  website: string | null
  notes: string | null
  status: 'queued'|'contacted'|'replied'|'meeting'|'converted'|'passed'|'no_reply'
  source: string | null
  contacted_at: string | null
  last_touch_at: string | null
  touch_count: number
  converted_at: string | null
  updated_at: string
}

const STATUS_OPTS = ['queued','contacted','replied','meeting','converted','passed','no_reply'] as const

export default function OutreachClient() {
  const [tab, setTab] = useState<'pipeline'|'templates'|'find'>('pipeline')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [filterCat, setFilterCat] = useState<OutreachCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<typeof STATUS_OPTS[number] | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filterCat !== 'all') qs.set('category', filterCat)
      if (filterStatus !== 'all') qs.set('status', filterStatus)
      const r = await fetch(`/api/admin/outreach${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
      const j = await r.json() as { contacts: Contact[] }
      setContacts(j.contacts || [])
    } finally { setLoading(false) }
  }, [filterCat, filterStatus])

  useEffect(() => { load() }, [load])

  const stats = {
    total: contacts.length,
    queued: contacts.filter((c) => c.status === 'queued').length,
    contacted: contacts.filter((c) => c.status === 'contacted').length,
    replied: contacts.filter((c) => c.status === 'replied').length,
    converted: contacts.filter((c) => c.status === 'converted').length,
  }

  return (
    <div className="space-y-4">
      {/* Header counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label="Total" n={stats.total} />
        <Stat label="Queued" n={stats.queued} />
        <Stat label="Contacted" n={stats.contacted} />
        <Stat label="Replied" n={stats.replied} />
        <Stat label="Converted" n={stats.converted} accent />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-line">
        {(['pipeline','templates','find'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-[13px] font-bold transition ${
              tab === t ? 'text-brand border-b-2 border-brand -mb-px' : 'text-muted hover:text-ink'
            }`}
          >
            {t === 'pipeline' ? 'Pipeline' : t === 'templates' ? 'Templates' : 'Find leads'}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <Pipeline
          contacts={contacts}
          loading={loading}
          filterCat={filterCat} setFilterCat={setFilterCat}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          onChange={load}
        />
      )}
      {tab === 'templates' && <Templates />}
      {tab === 'find' && <FindLeads />}
    </div>
  )
}

function Stat({ label, n, accent }: { label: string; n: number; accent?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-muted">{label}</div>
      <div className={`text-[22px] font-extrabold leading-none mt-1 ${accent ? 'text-brand' : 'text-ink'}`}>{n}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Pipeline tab — list + filters + add + status changes
// ────────────────────────────────────────────────────────────────────────
function Pipeline({
  contacts, loading, filterCat, setFilterCat, filterStatus, setFilterStatus, onChange,
}: {
  contacts: Contact[]; loading: boolean
  filterCat: OutreachCategory | 'all'; setFilterCat: (v: OutreachCategory | 'all') => void
  filterStatus: typeof STATUS_OPTS[number] | 'all'; setFilterStatus: (v: typeof STATUS_OPTS[number] | 'all') => void
  onChange: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value as OutreachCategory | 'all')} className="rounded-lg bg-black/40 border border-ink/15 px-3 py-1.5 text-[12px] font-bold">
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof STATUS_OPTS[number] | 'all')} className="rounded-lg bg-black/40 border border-ink/15 px-3 py-1.5 text-[12px] font-bold">
          <option value="all">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <AddContactForm onAdded={onChange} defaultCategory={filterCat !== 'all' ? filterCat : 'bike_rental'} />

      <section className="card p-3">
        <h3 className="text-[13px] font-extrabold mb-2">Pipeline ({contacts.length})</h3>
        {loading ? (
          <div className="text-[12px] text-muted py-3">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="text-[12px] text-muted py-3">No leads in this filter. Add one above or open the "Find leads" tab.</div>
        ) : (
          <div className="space-y-1">
            {contacts.map((c) => <ContactRow key={c.id} contact={c} onChange={onChange} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function ContactRow({ contact: c, onChange }: { contact: Contact; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const waDigits = (c.whatsapp_e164 || '').replace(/[^0-9]/g, '')
  const templates = WHATSAPP_TEMPLATES[c.category]
  const idTpl = templates.find((t) => t.lang === 'id')

  async function update(patch: { status?: typeof STATUS_OPTS[number]; touch?: boolean }) {
    setBusy(true)
    try {
      await fetch('/api/admin/outreach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, ...patch }),
      })
      onChange()
    } finally { setBusy(false) }
  }

  function openWA() {
    if (!waDigits) return alert('No WhatsApp number on file.')
    const msg = idTpl ? fillTemplate(idTpl.body, { name: c.business_name, city: c.city ?? undefined }) : ''
    const url = `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener')
    update({ status: 'contacted', touch: true })
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white/[0.02] p-2.5 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <div className="text-[13px] font-bold truncate">{c.business_name}</div>
        <div className="text-[11px] text-muted truncate">
          {CATEGORY_LABELS[c.category]}{c.city ? ` · ${c.city}` : ''}
          {c.whatsapp_e164 ? ` · WA ${c.whatsapp_e164}` : ''}
          {c.touch_count > 0 ? ` · ${c.touch_count} touches` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={c.status}
          onChange={(e) => update({ status: e.target.value as typeof STATUS_OPTS[number] })}
          disabled={busy}
          className="rounded-md bg-black/40 border border-ink/15 px-2 py-1 text-[11px] font-extrabold uppercase"
        >
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={openWA}
          disabled={busy || !waDigits}
          className="px-2.5 py-1 rounded-md bg-[#25D366] text-white text-[11px] font-extrabold uppercase tracking-wider disabled:opacity-40"
          title={waDigits ? 'Open WhatsApp + auto-fill template' : 'Add a WA number first'}
        >
          WA
        </button>
      </div>
    </div>
  )
}

function AddContactForm({ onAdded, defaultCategory }: { onAdded: () => void; defaultCategory: OutreachCategory }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ business_name: '', category: defaultCategory, city: '', whatsapp_e164: '', email: '', website: '', notes: '', source: '' })
  const [saving, setSaving] = useState(false)
  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) { setF((p) => ({ ...p, [k]: v })) }

  async function submit() {
    if (!f.business_name.trim()) return alert('Business name required.')
    setSaving(true)
    try {
      const r = await fetch('/api/admin/outreach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) return alert(j.error || 'failed')
      setF({ business_name: '', category: defaultCategory, city: f.city, whatsapp_e164: '', email: '', website: '', notes: '', source: f.source })
      onAdded()
    } finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card p-3 w-full text-left text-[13px] font-bold text-brand hover:bg-white/5">
        + Add a lead
      </button>
    )
  }
  return (
    <div className="card p-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Business name *" value={f.business_name} onChange={(e) => upd('business_name', e.target.value)} />
        <select className={inputCls} value={f.category} onChange={(e) => upd('category', e.target.value as OutreachCategory)}>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className={inputCls} placeholder="City" value={f.city} onChange={(e) => upd('city', e.target.value)} />
        <input className={inputCls} placeholder="WhatsApp (+62…)" value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} />
        <input className={inputCls} placeholder="Email" value={f.email} onChange={(e) => upd('email', e.target.value)} />
        <input className={inputCls} placeholder="Website" value={f.website} onChange={(e) => upd('website', e.target.value)} />
      </div>
      <textarea className={inputCls + ' resize-none'} rows={2} placeholder="Notes (source: gmaps · referral · etc.)" value={f.notes} onChange={(e) => upd('notes', e.target.value)} />
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="px-3 py-1.5 rounded-lg bg-brand text-bg text-[12px] font-extrabold uppercase tracking-wider disabled:opacity-50">
          {saving ? 'Saving…' : 'Save lead'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-ink/15 text-[12px] font-bold">Cancel</button>
      </div>
    </div>
  )
}

const inputCls = 'rounded-lg bg-black/40 border border-ink/15 px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand'

// ────────────────────────────────────────────────────────────────────────
// Templates tab
// ────────────────────────────────────────────────────────────────────────
function Templates() {
  const [cat, setCat] = useState<OutreachCategory>('bike_rental')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const templates = WHATSAPP_TEMPLATES[cat]
  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value as OutreachCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className={inputCls} placeholder="Business name (for {{name}})" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} placeholder="City (for {{city}})" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="text-[12px] text-muted">No templates for this category yet — add one in src/lib/outreach/templates.ts.</div>
      ) : templates.map((t) => {
        const filled = fillTemplate(t.body, { name, city })
        return (
          <div key={t.id} className="card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-brand">
                {t.lang.toUpperCase()} · {t.label}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(filled)}
                className="px-3 py-1 rounded-full bg-brand text-bg text-[11px] font-extrabold uppercase tracking-wider"
              >
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[13px] text-ink/85 bg-black/30 p-3 rounded-lg border border-ink/10">{filled}</pre>
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Find leads — Google Maps URL launcher
// ────────────────────────────────────────────────────────────────────────
function FindLeads() {
  const [city, setCity] = useState('Yogyakarta')
  const [cat, setCat] = useState<OutreachCategory>('bike_rental')
  const queries = GMAPS_QUERIES[cat](city)
  return (
    <div className="space-y-3">
      <div className="card p-4 space-y-3">
        <div className="text-[13px] text-ink/85 leading-relaxed">
          <p className="font-bold mb-1">How this works:</p>
          <p className="text-muted">
            Pick a category + city → click a query → Google Maps opens in a new tab with relevant shops/people.
            Tap any shop card → their WA number + website are usually shown publicly. Copy them into the Pipeline tab.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value as OutreachCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (e.g. Kuta, Seminyak, Yogyakarta)" />
        </div>
      </div>
      <div className="space-y-2">
        {queries.length === 0 ? (
          <div className="text-[12px] text-muted">No search queries for this category yet.</div>
        ) : queries.map((q) => (
          <a
            key={q}
            href={gmapsSearchUrl(q)}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition"
          >
            <span className="text-[13px] font-bold">{q}</span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">Open Maps →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
