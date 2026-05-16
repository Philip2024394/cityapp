'use client'
import { useState } from 'react'
import { Camera, Save, MapPin, Phone, Bike as BikeIcon, Box } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import { MOCK_RIDERS } from '@/data/mockRiders'

const ME = MOCK_RIDERS[0]!

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: ME.name,
    whatsapp: ME.whatsappE164,
    bio: ME.bio,
    area: ME.area,
    city: ME.city,
    bikeMake: ME.bike.make,
    bikeModel: ME.bike.model,
    bikeYear: ME.bike.year,
    bikeColor: ME.bike.color,
    bikeType: ME.bike.type,
    plate: ME.bike.plate ?? '',
    hasBox: ME.bike.hasBox,
  })

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
          <h1 className="text-2xl font-extrabold">Profil & Motor</h1>

          {/* Photo */}
          <div className="card p-5 flex items-center gap-4">
            <div className="relative shrink-0">
              <img src={ME.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
              <button className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand text-bg flex items-center justify-center shadow-glow">
                <Camera className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <div>
              <div className="text-[13px] text-muted">Foto rider</div>
              <div className="font-bold mt-0.5">Tap kamera untuk ubah</div>
              <div className="text-[12px] text-dim mt-1">Wajib jelas, JPG/PNG, min 400px</div>
            </div>
          </div>

          {/* Identity */}
          <Section title="Identitas">
            <Field label="Nama rider">
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="WhatsApp (E.164)" hint="Nomor untuk customer kontak — pakai 62 di depan">
              <div className="relative">
                <Phone className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input className="input pl-11 font-mono" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
              </div>
            </Field>
            <Field label="Bio / about" hint="Maksimal 200 karakter">
              <textarea className="input" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={200} />
            </Field>
          </Section>

          {/* Area */}
          <Section title="Area operasi">
            <Field label="Area utama">
              <div className="relative">
                <MapPin className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input className="input pl-11" value={form.area} onChange={e => set('area', e.target.value)} />
              </div>
            </Field>
            <Field label="Kota">
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
          </Section>

          {/* Bike */}
          <Section title="Motor">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Merk">
                <input className="input" placeholder="Honda" value={form.bikeMake} onChange={e => set('bikeMake', e.target.value)} />
              </Field>
              <Field label="Model">
                <div className="relative">
                  <BikeIcon className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                  <input className="input pl-11" placeholder="BeAT" value={form.bikeModel} onChange={e => set('bikeModel', e.target.value)} />
                </div>
              </Field>
              <Field label="Tahun">
                <input
                  className="input"
                  type="number"
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  value={form.bikeYear}
                  onChange={e => set('bikeYear', parseInt(e.target.value, 10) || form.bikeYear)}
                />
              </Field>
              <Field label="Warna">
                <input className="input" placeholder="Hitam" value={form.bikeColor} onChange={e => set('bikeColor', e.target.value)} />
              </Field>
            </div>
            <Field label="Jenis">
              <div className="grid grid-cols-3 gap-2">
                {(['matic', 'sport', 'manual'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => set('bikeType', t)}
                    className="px-3 py-3 rounded-xl border text-[13px] font-bold capitalize transition"
                    style={{
                      background: form.bikeType === t ? '#FACC15' : 'rgba(255,255,255,0.04)',
                      color: form.bikeType === t ? '#0A0A0A' : 'rgba(255,255,255,0.8)',
                      borderColor: form.bikeType === t ? '#FACC15' : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Plat nomor (opsional)">
              <input className="input font-mono" placeholder="AB 1234 XX" value={form.plate} onChange={e => set('plate', e.target.value)} />
            </Field>
            <Field label="Delivery box">
              <button
                onClick={() => set('hasBox', !form.hasBox)}
                className="card p-4 flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Box className="w-5 h-5 text-brand" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-[14px]">Punya box paket</div>
                    <div className="text-[12px] text-muted">Penting untuk paket besar</div>
                  </div>
                </div>
                <div
                  className="w-12 h-7 rounded-full p-0.5 transition"
                  style={{ background: form.hasBox ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full bg-white transition-transform"
                    style={{ transform: form.hasBox ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </div>
              </button>
            </Field>
          </Section>

          <button className="btn-primary w-full">
            <Save className="w-4 h-4" />
            Simpan perubahan
          </button>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-dim mt-1.5">{hint}</p>}
    </div>
  )
}
