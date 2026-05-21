import { NextResponse } from 'next/server'

// ============================================================================
// Admin gateway — cross-app federation helpers
// ----------------------------------------------------------------------------
// The landing/Admin.jsx dashboard runs on streetlocal.live and needs to
// read/write cityrider data (affiliates, members, receipts, …) even though
// the two apps live on SEPARATE Supabase projects. We expose narrow
// admin-only endpoints under /api/admin/gateway/* that:
//
//   1. Authenticate via `Authorization: Bearer ${ADMIN_GATEWAY_SECRET}`.
//      Shared secret stored in BOTH projects' env. Single source of trust
//      until we replace the landing PIN-5050 with proper Supabase auth.
//   2. Allow CORS only from the landing origins (streetlocal.live + any
//      dev origin you wire via ADMIN_GATEWAY_ALLOWED_ORIGINS env, comma-
//      separated). Same-origin admin can still call without CORS.
//
// Usage in a route handler:
//
//   import { withGateway, ok } from '@/lib/admin/gateway'
//   export const GET  = withGateway(async (req) => { … return ok(data) })
//   export const POST = withGateway(async (req) => { … })
//   export const OPTIONS = withGateway(async () => ok({}))
//
// withGateway runs the bearer check, attaches CORS headers, and forwards
// to the handler. OPTIONS is required for the browser preflight to pass.
// ============================================================================

type Handler = (req: Request) => Promise<Response>

const DEV_ORIGINS = [
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
  'http://localhost:5176', 'http://localhost:5177',
]
const PROD_ORIGINS = [
  'https://streetlocal.live',
  'https://www.streetlocal.live',
]

function allowedOrigins(): string[] {
  const env = (process.env.ADMIN_GATEWAY_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  return [...PROD_ORIGINS, ...DEV_ORIGINS, ...env]
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && allowedOrigins().includes(origin) ? origin : 'null'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  }
}

export function withGateway(handler: Handler): Handler {
  return async (req: Request) => {
    const origin = req.headers.get('origin')
    const headers = corsHeaders(origin)

    // CORS preflight — handled inside withGateway so individual routes
    // don't have to re-declare OPTIONS.
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    const secret = process.env.ADMIN_GATEWAY_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'ADMIN_GATEWAY_SECRET not configured on server' },
        { status: 500, headers },
      )
    }
    const auth = req.headers.get('authorization') || ''
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
    if (!m || m[1] !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers })
    }

    const res = await handler(req)
    // Inject CORS headers on the handler response without copying body.
    const merged = new Headers(res.headers)
    for (const [k, v] of Object.entries(headers)) merged.set(k, v)
    return new Response(res.body, { status: res.status, headers: merged })
  }
}

export function ok(data: unknown, init: number | ResponseInit = 200): Response {
  const status = typeof init === 'number' ? init : init.status ?? 200
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export function fail(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
