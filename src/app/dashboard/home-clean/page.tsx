'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import type { HomeCleanProvider, HomeCleanAvailability } from '@/lib/home-clean/types'

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

export default function HomeCleanDashboardPage() {
  const [p, setP] = useState<HomeCleanProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/home-clean/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: HomeCleanProvider | null }
      setP(j.provider)
    } catch { setErr('fetch_failed') } finally { setLoading(false) }
  }, [])
  useEffect(() => { reload() }, [reload])

  async function setAvailability(next: HomeCleanAvailability) {
    if (!p) return
    const prev = p.availability
    setP({ ...p, availability: next })
    try {
      const r = await fetch('/api/home-clean/me/availability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) { setP({ ...p, availability: prev }); alert(j.error === 'not_verified' ? 'Awaiting verification.' : 'Update failed.') }
    } catch { setP({ ...p, availability: prev }) }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>
  if (err === 'not_signed_in') return (
    <Shell><div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
      <Link href="/login?next=/dashboard/home-clean" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Sign in</Link>
    </div></Shell>
  )
  if (!p) return (
    <Shell><div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">No cleaner profile yet</h1>
      <Link href="/home-clean/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Register as cleaner</Link>
    </div></Shell>
  )

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        <section className="rounded-2xl bg-black/85 border border-white/10 p-5 shadow-card">
          <h1 className="text-[20px] font-black mb-1 truncate">{p.display_name}</h1>
          <div className="text-[12px] text-ink/60 font-mono mb-3">{p.slug}</div>
          {p.status !== 'active' && (
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 text-yellow-200 text-[12px] px-3 py-2 mb-3">
              <strong>Awaiting verification.</strong> Profile not yet listed on marketplace.
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {(['online','busy','offline'] as const).map((a) => {
              const active = p.availability === a
              return (
                <button key={a} onClick={() => setAvailability(a)}
                  className={`rounded-xl px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                    active ? 'bg-brand text-bg border-brand' : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
                  }`}
                >
                  {a === 'online' ? 'Online' : a === 'busy' ? 'Busy' : 'Offline'}
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-black/85 border border-white/10 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-extrabold uppercase tracking-wider">Profile + tariffs</h2>
            <button onClick={() => setEditing((v) => !v)} className="text-[12px] font-bold text-brand hover:underline">
              {editing ? 'Close' : 'Edit'}
            </button>
          </div>
          {!editing ? <ReadOnly p={p} /> : <EditForm p={p} onSaved={reload} />}
        </section>

        <p className="text-[12px] text-ink/60 text-center">
          Public profile: <a href={`/home-clean/${p.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">/home-clean/{p.slug}</a>
        </p>
      </div>
    </Shell>
  )
}

function ReadOnly({ p }: { p: HomeCleanProvider }) {
  return (
    <div className="space-y-3 text-[13px]">
      <KV k="Years" v={String(p.years_experience)} />
      <KV k="Bio" v={p.bio} multiline />
      <div className="grid grid-cols-2 gap-2 pt-2">
        {p.hourly_rate_idr != null && <PriceBox label="Hour"     v={p.hourly_rate_idr} />}
        {p.day_rate_idr    != null && <PriceBox label="Day · 8h" v={p.day_rate_idr}    />}
      </div>
      <KV k="WhatsApp" v={p.whatsapp_e164} />
      <KV k="City" v={p.city ?? '—'} />
      <KV k="Service area" v={p.service_area_notes ?? '—'} multiline />
    </div>
  )
}
function PriceBox({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-center">
      <div className="text-[11px] text-ink/60 uppercase tracking-wider font-bold">{label}</div>
      <div className="text-[14px] font-black text-brand">Rp {v.toLocaleString('id-ID')}</div>
    </div>
  )
}
function KV({ k, v, multiline = false }: { k: string; v: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-bold text-ink/55">{k}</div>
      <div className={`text-[13px] text-ink ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>{v}</div>
    </div>
  )
}

function EditForm({ p, onSaved }: { p: HomeCleanProvider; onSaved: () => void }) {
  const [f, setF] = useState({
    display_name: p.display_name,
    years_experience: p.years_experience,
    bio: p.bio,
    hourly_rate: p.hourly_rate_idr != null ? String(p.hourly_rate_idr) : '',
    day_rate:    p.day_rate_idr    != null ? String(p.day_rate_idr)    : '',
    whatsapp_e164: p.whatsapp_e164,
    city: p.city ?? '',
    service_area_notes: p.service_area_notes ?? '',
    profile_image_url: p.profile_image_url ?? '',
    ktp_image_url: p.ktp_image_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) { setF((p) => ({ ...p, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/home-clean/me/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          years_experience: f.years_experience,
          bio: f.bio,
          hourly_rate_idr: f.hourly_rate === '' ? null : Number(f.hourly_rate),
          day_rate_idr:    f.day_rate    === '' ? null : Number(f.day_rate),
          whatsapp_e164: f.whatsapp_e164,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
          ktp_image_url: f.ktp_image_url,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { alert(j.error || 'failed'); return }
      setFlash(true); setTimeout(() => setFlash(false), 1800)
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input type="text" value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} className={inputCls} />
      <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} placeholder="Years" className={inputCls} />
      <textarea maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="Bio (max 300)" className={inputCls + ' resize-none'} />
      <div className="grid grid-cols-2 gap-2">
        <PriceInput label="Hour"     v={f.hourly_rate} set={(v) => upd('hourly_rate', v)} />
        <PriceInput label="Day · 8h" v={f.day_rate}    set={(v) => upd('day_rate', v)} />
      </div>
      <input type="tel"  value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} className={inputCls} />
      <input type="text" value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="City" className={inputCls} />
      <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Service area" className={inputCls} />
      <input type="url"  value={f.profile_image_url} onChange={(e) => upd('profile_image_url', e.target.value)} placeholder="Profile image URL" className={inputCls} />
      <input type="url"  value={f.ktp_image_url} onChange={(e) => upd('ktp_image_url', e.target.value)} placeholder="KTP image URL (private)" className={inputCls} />
      {flash && <div className="rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[13px] px-3 py-2">Saved.</div>}
      <button type="submit" disabled={saving} className="w-full rounded-full bg-brand text-bg px-6 py-3 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function PriceInput({ label, v, set }: { label: string; v: string; set: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">{label}</span>
      <input type="number" min={0} value={v} onChange={(e) => set(e.target.value)} placeholder="—" className={inputCls + ' text-[13px]'} />
    </label>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${BG_URL})` }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/75" />
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-black/85 border border-white/15 px-4 py-3 text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand'
