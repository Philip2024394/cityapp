'use client'
import { useState } from 'react'
import { Save, Info } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import SuggestedPricingCard from '@/components/rider/SuggestedPricingCard'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { idr } from '@/lib/format/idr'
import { quoteFare } from '@/lib/pricing/quote'

// City benchmarks — would come from server-side aggregation of rider_pricing
// in production. For Yogya MVP, these are reasonable based on local Gojek
// equivalent rates after the platform's 20% cut is added back.
const CITY_BENCHMARK = {
  averagePerKm: 2_500,
  averageMinFee: 10_000,
}

const ME = MOCK_RIDERS[0]!

const PRESETS = [
  { label: 'Rendah', perKm: 2000, min: 8000 },
  { label: 'Standar', perKm: 2500, min: 10000 },
  { label: 'Premium', perKm: 3500, min: 15000 },
]

const SAMPLE_DISTANCES = [1, 3, 5, 10]

export default function PricingPage() {
  const [perKm, setPerKm] = useState(ME.pricePerKm)
  const [minFee, setMinFee] = useState(ME.minFee)

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold">Harga kamu</h1>
            <p className="text-muted text-[14px] mt-1">
              Atur sendiri tarif per km dan minimum fee. Platform tidak ambil komisi.
            </p>
          </div>

          {/* Suggested pricing — compare your rate vs city average */}
          <SuggestedPricingCard
            city={ME.city}
            cityAveragePerKm={CITY_BENCHMARK.averagePerKm}
            cityAverageMinFee={CITY_BENCHMARK.averageMinFee}
            yourPerKm={perKm}
            yourMinFee={minFee}
          />

          {/* Live quote preview */}
          <div className="card p-5 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-60"
                 style={{ background: 'radial-gradient(ellipse at top, rgba(250,204,21,0.18), transparent 60%)' }} />
            <div className="relative">
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-3">Preview ongkos</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {SAMPLE_DISTANCES.map(km => (
                  <div key={km} className="bg-white/5 rounded-2xl p-3">
                    <div className="text-[12px] text-muted font-bold">{km} km</div>
                    <div className="text-[15px] font-extrabold gradient-text mt-1">
                      {idr(quoteFare(km, { pricePerKm: perKm, minFee }))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">Preset cepat</div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPerKm(p.perKm); setMinFee(p.min) }}
                  className="card p-3"
                >
                  <div className="text-[13px] font-extrabold">{p.label}</div>
                  <div className="text-brand text-[12px] mt-1">{idr(p.perKm)}/km</div>
                  <div className="text-dim text-[11px]">min {idr(p.min)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <SliderRow
              label="Harga per kilometer"
              value={perKm}
              min={1500} max={6000} step={100}
              format={idr}
              onChange={setPerKm}
            />
            <SliderRow
              label="Minimum fee"
              value={minFee}
              min={5000} max={25000} step={500}
              format={idr}
              onChange={setMinFee}
            />
          </div>

          {/* Tip */}
          <div className="card p-4 bg-brand/5 border-brand/20 flex gap-3">
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink/85 leading-relaxed">
              Rata-rata rider Yogya pasang <strong className="text-brand">Rp 2.500/km</strong> dengan minimum <strong className="text-brand">Rp 10.000</strong>. Naikkan jika area mu jauh atau motor punya box besar.
            </div>
          </div>

          <button className="btn-primary w-full">
            <Save className="w-4 h-4" />
            Simpan harga
          </button>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string
  value: number
  min: number; max: number; step: number
  format: (n: number) => string
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="label !mb-0">{label}</label>
        <div className="text-brand font-extrabold text-lg">{format(value)}</div>
      </div>
      <input
        type="range"
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#FACC15] h-2"
      />
      <div className="flex justify-between text-[11px] text-dim mt-1.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}
