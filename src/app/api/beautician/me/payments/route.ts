// Payments configuration for the signed-in beautician (mig 0142).
//
// Stripe + Midtrans secret keys round-trip through the keyVault helper
// so plaintext never lives at rest and never leaves the server. The GET
// response intentionally returns *_last4 only — there is no path that
// hands the decrypted plaintext to the browser.
//
// POST semantics around the secret-key fields:
//   field === undefined  → leave column alone (typical: only the public
//                          fields changed)
//   field === ''         → vendor didn't rotate; keep existing ciphertext
//   field === null       → vendor cleared it on purpose; null the column
//   non-empty string     → encryptKey() it, store fresh ciphertext

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { encryptKey, previewLast4 } from '@/lib/security/keyVault'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

export const runtime = 'nodejs'

type PaymentProvider = 'none' | 'stripe' | 'midtrans'

type Body = {
  payment_provider?:        PaymentProvider
  stripe_secret_key?:       string | null
  stripe_publishable_key?:  string | null
  midtrans_server_key?:     string | null
  midtrans_client_key?:     string | null
  midtrans_is_production?:  boolean
}

type ProviderRow = {
  payment_provider:        PaymentProvider | null
  stripe_secret_key_enc:   string | null
  stripe_publishable_key:  string | null
  midtrans_server_key_enc: string | null
  midtrans_client_key:     string | null
  midtrans_is_production:  boolean | null
}

function publicShape(row: ProviderRow) {
  return {
    payment_provider:       (row.payment_provider ?? 'none') as PaymentProvider,
    stripe_publishable_key: row.stripe_publishable_key ?? null,
    stripe_last4:           previewLast4(row.stripe_secret_key_enc),
    midtrans_client_key:    row.midtrans_client_key ?? null,
    midtrans_last4:         previewLast4(row.midtrans_server_key_enc),
    midtrans_is_production: !!row.midtrans_is_production,
  }
}

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data, error } = await admin
    .from('beautician_providers')
    .select('payment_provider, stripe_secret_key_enc, stripe_publishable_key, midtrans_server_key_enc, midtrans_client_key, midtrans_is_production')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error)   return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!data)   return NextResponse.json({ error: 'no_provider' }, { status: 404 })
  return NextResponse.json({ ok: true, ...publicShape(data as ProviderRow) })
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: TableUpdate<'beautician_providers'> = {}

  if (body.payment_provider !== undefined) {
    if (body.payment_provider !== 'none' && body.payment_provider !== 'stripe' && body.payment_provider !== 'midtrans') {
      return NextResponse.json({ error: 'invalid_payment_provider' }, { status: 400 })
    }
    update.payment_provider = body.payment_provider
  }

  // Stripe secret — tri-state per the contract in the file header.
  if (Object.prototype.hasOwnProperty.call(body, 'stripe_secret_key')) {
    const v = body.stripe_secret_key
    if (v === null) {
      update.stripe_secret_key_enc = null
    } else if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed !== '') {
        if (!/^sk_(test|live)_/.test(trimmed)) {
          return NextResponse.json({ error: 'invalid_stripe_secret_format' }, { status: 400 })
        }
        update.stripe_secret_key_enc = encryptKey(trimmed)
      }
      // empty string → silently keep the existing ciphertext (no-op)
    } else {
      return NextResponse.json({ error: 'invalid_stripe_secret' }, { status: 400 })
    }
  }

  if (body.stripe_publishable_key !== undefined) {
    if (body.stripe_publishable_key === null || body.stripe_publishable_key === '') {
      update.stripe_publishable_key = null
    } else if (typeof body.stripe_publishable_key !== 'string') {
      return NextResponse.json({ error: 'invalid_stripe_publishable' }, { status: 400 })
    } else {
      const trimmed = body.stripe_publishable_key.trim()
      if (!/^pk_(test|live)_/.test(trimmed)) {
        return NextResponse.json({ error: 'invalid_stripe_publishable_format' }, { status: 400 })
      }
      if (trimmed.length > 500) return NextResponse.json({ error: 'stripe_publishable_too_long' }, { status: 400 })
      update.stripe_publishable_key = trimmed
    }
  }

  // Midtrans server key — same tri-state semantics as stripe_secret_key.
  if (Object.prototype.hasOwnProperty.call(body, 'midtrans_server_key')) {
    const v = body.midtrans_server_key
    if (v === null) {
      update.midtrans_server_key_enc = null
    } else if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed !== '') {
        if (trimmed.length < 8 || trimmed.length > 200) {
          return NextResponse.json({ error: 'invalid_midtrans_server' }, { status: 400 })
        }
        update.midtrans_server_key_enc = encryptKey(trimmed)
      }
    } else {
      return NextResponse.json({ error: 'invalid_midtrans_server' }, { status: 400 })
    }
  }

  if (body.midtrans_client_key !== undefined) {
    if (body.midtrans_client_key === null || body.midtrans_client_key === '') {
      update.midtrans_client_key = null
    } else if (typeof body.midtrans_client_key !== 'string') {
      return NextResponse.json({ error: 'invalid_midtrans_client' }, { status: 400 })
    } else {
      const trimmed = body.midtrans_client_key.trim()
      if (trimmed.length < 8 || trimmed.length > 200) {
        return NextResponse.json({ error: 'invalid_midtrans_client' }, { status: 400 })
      }
      update.midtrans_client_key = trimmed
    }
  }

  if (body.midtrans_is_production !== undefined) {
    if (typeof body.midtrans_is_production !== 'boolean') {
      return NextResponse.json({ error: 'invalid_midtrans_env' }, { status: 400 })
    }
    update.midtrans_is_production = body.midtrans_is_production
  }

  if (Object.keys(update).length === 0) {
    // Nothing to write — still return current shape so the client can
    // resync, instead of erroring out the user for tapping Save on an
    // unchanged form.
    const { data, error } = await admin
      .from('beautician_providers')
      .select('payment_provider, stripe_secret_key_enc, stripe_publishable_key, midtrans_server_key_enc, midtrans_client_key, midtrans_is_production')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
    return NextResponse.json({ ok: true, ...publicShape(data as ProviderRow) })
  }

  update.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('beautician_providers')
    .update(update)
    .eq('user_id', user.id)
    .select('payment_provider, stripe_secret_key_enc, stripe_publishable_key, midtrans_server_key_enc, midtrans_client_key, midtrans_is_production')
    .maybeSingle()

  if (error)  return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'no_provider' }, { status: 404 })
  return NextResponse.json({ ok: true, ...publicShape(data as ProviderRow) })
}
