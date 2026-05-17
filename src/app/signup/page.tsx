'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Mail, Lock, User, Phone, Sparkles, ArrowRight } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', password: '' })
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <AppNav />
      <main className="min-h-screen flex items-start justify-center pt-10 px-4 grid-bg">
        <div className="w-full max-w-md space-y-4 mt-2">
          <div className="card p-6 space-y-5">
            <div>
              <div className="chip mb-3"><Sparkles className="w-3.5 h-3.5" /> 30-day free trial</div>
              <h1 className="text-2xl font-extrabold">Sign up as a rider</h1>
              <p className="text-muted text-[14px] mt-1">Start receiving quotes in 2 minutes.</p>
            </div>

            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <Field label="Full name" icon={<User className="w-4 h-4 text-dim" />}>
                <input className="input pl-11" placeholder="Andi Pratama" value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Email" icon={<Mail className="w-4 h-4 text-dim" />}>
                <input className="input pl-11" type="email" placeholder="andi@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="WhatsApp" icon={<Phone className="w-4 h-4 text-dim" />} hint="Start with 62, e.g. 6281234567890">
                <input className="input pl-11 font-mono" placeholder="6281234567890" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
              </Field>
              <Field label="Password" icon={<Lock className="w-4 h-4 text-dim" />}>
                <input className="input pl-11" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
              </Field>

              <button type="submit" className="btn-primary w-full mt-2">
                Sign up for 30-day free trial
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center text-[13px] text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-brand font-bold">Login</Link>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">After trial</div>
            <div className="text-[14px]">
              <span className="font-extrabold text-brand">Rp 30.000/month</span> · billed via Midtrans. Cancel anytime.
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function Field({ label, icon, hint, children }: { label: string; icon?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
      {hint && <p className="text-[12px] text-dim mt-1.5">{hint}</p>}
    </div>
  )
}
