'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Mail, Send, ChevronLeft } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <>
      <AppNav />
      <main className="min-h-screen flex items-start justify-center pt-12 px-4 grid-bg">
        <div className="w-full max-w-md card p-6 space-y-5 mt-4">
          <Link href="/login" className="text-muted text-[13px] flex items-center gap-1 -mt-2 -ml-1 font-bold">
            <ChevronLeft className="w-4 h-4" />
            Back to login
          </Link>
          {!sent ? (
            <>
              <div>
                <h1 className="text-2xl font-extrabold">Reset password</h1>
                <p className="text-muted text-[14px] mt-1">We'll email you a reset link.</p>
              </div>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      className="input pl-11"
                      type="email"
                      required
                      placeholder="andi@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full">
                  <Send className="w-4 h-4" />
                  Send reset link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-online/15 mx-auto flex items-center justify-center text-2xl">✓</div>
              <h2 className="font-extrabold text-xl">Check your email</h2>
              <p className="text-muted text-[14px]">
                We sent a password reset link to<br />
                <span className="text-ink font-bold">{email}</span>
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
