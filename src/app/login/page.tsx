'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <>
      <AppNav />
      <main className="min-h-screen flex items-start justify-center pt-12 px-4 grid-bg">
        <div className="w-full max-w-md card p-6 space-y-5 mt-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-bg text-2xl mb-3">🛵</div>
            <h1 className="text-2xl font-extrabold">Masuk sebagai rider</h1>
            <p className="text-muted text-[14px] mt-1">Welcome back. Riders only.</p>
          </div>

          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="input pl-11"
                  type="email"
                  placeholder="andi@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label flex items-center justify-between">
                <span>Password</span>
                <Link href="/forgot" className="text-brand text-[12px] normal-case tracking-normal">Lupa?</Link>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="input pl-11"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">
              <LogIn className="w-4 h-4" />
              Masuk
            </button>
          </form>

          <div className="text-center text-[13px] text-muted">
            Belum punya akun?{' '}
            <Link href="/signup" className="text-brand font-bold">Daftar sebagai rider</Link>
          </div>

          <div className="text-center text-[11px] text-dim pt-2 border-t border-line">
            Hanya untuk rider. Customer langsung kontak rider via WhatsApp.
          </div>
        </div>
      </main>
    </>
  )
}
