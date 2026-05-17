'use client'
import { useState } from 'react'
import { Save } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import { MOCK_RIDERS } from '@/data/mockRiders'
import type { ServiceType } from '@/types/rider'
import { SERVICE_ICONS, SERVICE_LABELS } from '@/types/rider'

const ME = MOCK_RIDERS[0]!

const ALL: { key: ServiceType; desc: string; primary?: boolean }[] = [
  { key: 'parcel', desc: 'Paket, dokumen, kiriman, kurir luar kota. Fokus utama platform.', primary: true },
  { key: 'food',   desc: 'Antar makanan dari resto / warung, COD bahan dapur.' },
  { key: 'person', desc: 'Antar jemput penumpang, ojek harian, ojek event.' },
]

export default function ServicesPage() {
  const [enabled, setEnabled] = useState<Set<ServiceType>>(new Set(ME.services))

  function toggle(s: ServiceType) {
    const next = new Set(enabled)
    if (next.has(s)) next.delete(s); else next.add(s)
    setEnabled(next)
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold">Layanan yang kamu tawarkan</h1>
            <p className="text-muted text-[14px] mt-1">
              Pilih jenis pekerjaan yang mau kamu terima. Bisa diubah kapan saja.
            </p>
          </div>

          <div className="space-y-2.5">
            {ALL.map(s => {
              const on = enabled.has(s.key)
              return (
                <button
                  key={s.key}
                  onClick={() => toggle(s.key)}
                  className="card p-4 w-full text-left flex items-center gap-4 transition"
                  style={{
                    borderColor: on ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.06)',
                    background: on ? 'rgba(250,204,21,0.04)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: on ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.05)' }}
                  >
                    {SERVICE_ICONS[s.key]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[15px]">{SERVICE_LABELS[s.key]}</span>
                      {s.primary && <span className="chip text-[11px] py-0.5 px-2">Utama</span>}
                    </div>
                    <div className="text-[13px] text-muted mt-1">{s.desc}</div>
                  </div>
                  <div
                    className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
                    style={{ background: on ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-white transition-transform"
                      style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <button className="btn-primary w-full">
            <Save className="w-4 h-4" />
            Simpan layanan
          </button>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}
