'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { ArrowRight, MessageCircle, Shield, Wallet, Zap } from 'lucide-react'
import type { Rider } from '@/types/rider'

// Landing-background map — dimmed Yogyakarta view so the hero pops.
const LandingMap = dynamic(() => import('@/components/map/RiderMapDynamic'), { ssr: false })

// 42 demo riders sprinkled across a Yogyakarta bounding box so the hero map
// has a constellation of pulsing dots. Deterministic positions (no randomness)
// so SSR + hydration are identical.
const YOGYA_CENTER = { lat: -7.7928, lng: 110.3657 }
function buildHeroRiders(count: number): Rider[] {
  const out: Rider[] = []
  for (let i = 0; i < count; i++) {
    // Golden-angle scatter inside ~5km box around Yogya center
    const angle = i * 2.39996323 // golden angle (rad)
    const radius = 0.005 + (i / count) * 0.045 // 0.5km → 5km
    out.push({
      id: `hero-${i}`,
      slug: `hero-${i}`,
      name: '',
      photoUrl: '',
      whatsappE164: '',
      bio: '',
      area: '',
      city: 'Yogyakarta',
      services: [],
      bike: { make: '', model: '', year: 0, color: '', type: 'matic', hasBox: false },
      pricePerKm: 0, minFee: 0,
      isOnline: true,
      lastSeenAt: '',
      lat: YOGYA_CENTER.lat + Math.sin(angle) * radius,
      lng: YOGYA_CENTER.lng + Math.cos(angle) * radius,
      subscriptionStatus: 'active',
    })
  }
  return out
}

export default function LandingPage() {
  const [center] = useState(YOGYA_CENTER)
  const heroRiders = useMemo(() => buildHeroRiders(42), [])

  return (
    <main className="min-h-screen relative overflow-hidden bg-bg">
      {/* Background map — dark, roads-only, label-free, slowly panning */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: 1 }}
      >
        <LandingMap
          center={center}
          zoom={13}
          height="100dvh"
          interactive={false}
          variant="dark"
          hideLabels
          roadsOnly
          autoPan
          riders={heroRiders}
          markerStyle="ping"
        />
      </div>

      {/* Soft yellow glow + gradient for hero legibility */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 80% 50% at 50% 35%, rgba(250,204,21,0.10) 0%, transparent 60%)',
            'linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.35) 40%, rgba(10,10,10,0.95) 100%)',
          ].join(', '),
        }}
      />

      {/* Top mini nav */}
      <header className="relative z-20 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-bg text-lg shadow-glow">🛵</div>
            <div className="font-extrabold tracking-tight">
              City <span className="gradient-text">Rider</span>
            </div>
          </div>
          <Link href="/login" className="text-[13px] font-bold text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-white/5">
            Login Rider
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-20 px-4 pt-10 pb-16">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/25">
            <span className="dot-online !w-2 !h-2" />
            <span className="text-[12px] font-extrabold text-brand uppercase tracking-wider">
              42 rider online di Yogyakarta
            </span>
          </div>

          <h1 className="text-[42px] sm:text-[56px] font-extrabold leading-[1.05] tracking-tight">
            Kurir motor,
            <br />
            <span className="gradient-text">harga jelas.</span>
          </h1>

          <p className="text-muted text-[15px] leading-relaxed max-w-md mx-auto">
            Set jemput & antar. Lihat harga total tiap rider. Pesan langsung lewat WhatsApp.
            Tanpa komisi, tanpa dispatch.
          </p>

          <div className="pt-3 space-y-3">
            <Link
              href="/cari"
              className="btn-primary w-full max-w-sm mx-auto !text-[16px] !py-4 animate-[fadeUp_0.6s_ease-out_both]"
            >
              <Zap className="w-4 h-4" />
              Cari Kurir Sekarang
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[12px] text-dim">Gratis · langsung kontak rider</p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="relative z-20 px-4 pb-10">
        <div className="max-w-xl mx-auto grid grid-cols-3 gap-3">
          <TrustPill icon={<Wallet className="w-4 h-4" />} label="0% komisi" />
          <TrustPill icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" />
          <TrustPill icon={<Shield className="w-4 h-4" />} label="Rider terverifikasi" />
        </div>
      </section>

      {/* For riders CTA */}
      <section className="relative z-20 px-4 pb-12">
        <div className="max-w-xl mx-auto">
          <div className="card p-5 backdrop-blur-xl bg-bg2/70">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">Untuk rider</div>
            <div className="text-[17px] font-extrabold mt-1">
              Punya motor? Dapat customer lewat City Rider.
            </div>
            <div className="text-muted text-[13px] mt-1.5">
              Daftar gratis 30 hari · setelah itu Rp 30.000/bulan · keep 100% pendapatan.
            </div>
            <div className="flex gap-2 mt-4">
              <Link href="/signup" className="btn-primary flex-1 !text-[14px] !py-3">
                Daftar sebagai rider
              </Link>
              <Link href="/login" className="btn-secondary !text-[14px] !py-3 !px-4">
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function TrustPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="card p-3 text-center backdrop-blur-xl bg-bg2/60">
      <div className="text-brand inline-flex">{icon}</div>
      <div className="text-[12px] font-extrabold mt-1.5 text-ink/90">{label}</div>
    </div>
  )
}
