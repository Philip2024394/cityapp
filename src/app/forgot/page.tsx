'use client'
import Link from 'next/link'
import { ChevronLeft, KeyRound, Phone } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

export default function ForgotPage() {
  return (
    <>
      <AppNav />
      <main className="min-h-screen flex items-start justify-center pt-12 px-4 grid-bg">
        <div className="w-full max-w-md card p-6 space-y-5 mt-4">
          <Link href="/login" className="text-muted text-[13px] flex items-center gap-1 -mt-2 -ml-1 font-bold">
            <ChevronLeft className="w-4 h-4" />
            Back to sign in
          </Link>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-bg mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold">No password needed</h1>
            <p className="text-muted text-[14px] mt-1">
              IndoCity uses phone-OTP sign-in. Every time you sign in we send a fresh 6-digit code to your WhatsApp number — there's no password to forget.
            </p>
          </div>

          <Link href="/login" className="btn-primary w-full">
            <Phone className="w-4 h-4" />
            Sign in with phone
          </Link>

          <div className="text-center text-[12px] text-dim pt-2 border-t border-line">
            Lost access to your phone number? Email <a href="mailto:support@cityrider.app" className="text-brand">support@cityrider.app</a>
          </div>
        </div>
      </main>
    </>
  )
}
