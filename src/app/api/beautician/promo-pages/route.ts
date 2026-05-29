import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PROMO_LIMITS, resolveTier, currentYearMonth, newPromoSlug } from '@/lib/promo/config'

// POST /api/beautician/promo-pages
// Generate a new promo page from one of the beautician's service photos.
// Body: { photo_url, headline, badge_type?, badge_value?, badge_color?, price_idr? }
//
// Pipeline:
//   1. Auth + provider lookup.
//   2. Resolve tier from subscription_status; reject if free tier.
//   3. Check monthly cap (ai_usage_monthly) + daily cap + active cap.
//   4. Call Claude Haiku with the photo URL + service context to generate
//      the AI caption. Anthropic Claude 4.5 Haiku supports image input
//      via vision URLs, so we pass the photo directly.
//   5. Insert promo_pages row with mint'd slug.
//   6. Increment ai_usage_monthly counter atomically.
//
// On Claude failure the counter is NOT incremented, so a failed call
// doesn't burn the user's monthly quota.

export const runtime = 'nodejs'

const MAX_HEADLINE_LEN = 120
const MAX_CAPTION_LEN  = 1200

type Body = {
  photo_url?:   string
  headline?:    string
  badge_type?:  string | null
  badge_value?: number | null
  badge_color?: 'red' | 'yellow' | 'black' | null
  price_idr?:   number | null
  tone?:        'professional' | 'fun' | 'luxury'
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

  const photoUrl = (body.photo_url ?? '').trim()
  const headline = (body.headline ?? '').trim().slice(0, MAX_HEADLINE_LEN)
  if (!photoUrl || !/^https:\/\//.test(photoUrl)) {
    return NextResponse.json({ error: 'invalid_photo_url' }, { status: 400 })
  }
  if (!headline) return NextResponse.json({ error: 'invalid_headline' }, { status: 400 })

  // Resolve provider + tier
  const { data: provider, error: lookupErr } = await admin
    .from('beautician_providers')
    .select('id, slug, display_name, subscription_status, country_code, theme_color')
    .eq('user_id', user.id)
    .maybeSingle()
  if (lookupErr || !provider) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const tier   = resolveTier(provider.subscription_status as string | null)
  const limits = PROMO_LIMITS[tier]
  if (limits.monthlyCap === 0) {
    return NextResponse.json({ error: 'tier_locked', tier }, { status: 402 })
  }

  // Active cap — count non-archived, non-expired pages
  const { count: activeCount } = await admin
    .from('promo_pages')
    .select('id', { count: 'exact', head: true })
    .eq('provider_type', 'beautician')
    .eq('provider_id',   provider.id)
    .is('archived_at',   null)
  if (typeof activeCount === 'number' && activeCount >= limits.activeCap) {
    return NextResponse.json({ error: 'active_cap_reached', limit: limits.activeCap }, { status: 403 })
  }

  // Daily cap — promos created in the last 24h
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: dayCount } = await admin
    .from('promo_pages')
    .select('id', { count: 'exact', head: true })
    .eq('provider_type', 'beautician')
    .eq('provider_id',   provider.id)
    .gte('created_at',   dayAgo)
  if (typeof dayCount === 'number' && dayCount >= limits.dailyCap) {
    return NextResponse.json({ error: 'daily_cap_reached', limit: limits.dailyCap }, { status: 429 })
  }

  // Monthly cap — read ai_usage_monthly for current bucket
  const yearMonth = currentYearMonth()
  const { data: usage } = await admin
    .from('ai_usage_monthly')
    .select('ai_promo_count')
    .eq('provider_type', 'beautician')
    .eq('provider_id',   provider.id)
    .eq('year_month',    yearMonth)
    .maybeSingle()
  const usedThisMonth = usage?.ai_promo_count ?? 0
  if (usedThisMonth >= limits.monthlyCap) {
    return NextResponse.json({
      error:    'monthly_cap_reached',
      limit:    limits.monthlyCap,
      used:     usedThisMonth,
      tier,
    }, { status: 429 })
  }

  // ── Claude generation ────────────────────────────────────────────
  const apiKey = process.env.AGENT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[promo-pages] AGENT_ANTHROPIC_API_KEY missing')
    return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 })
  }

  const tone = body.tone ?? 'professional'
  const toneInstruction =
    tone === 'fun'      ? 'A warm, playful tone. May use 1-2 emojis.'
    : tone === 'luxury' ? 'A polished, premium tone. No emojis. Evocative language.'
    :                     'A clear, confident, professional tone. No emojis.'

  // Structured JSON output — single Claude call produces the body
  // caption + 1-sentence short caption + per-platform hashtag packs.
  // Hashtag counts follow each platform's 2026 best practice: IG 5,
  // TikTok 5, X 2, Facebook 0, Snapchat 0, WhatsApp 0.
  const systemPrompt = [
    `You are writing promotional content for an Indonesian beautician\'s service photo.`,
    `The content will appear on a landing page customers reach by tapping a link the beautician shared on social media.`,
    toneInstruction,
    `Mix Bahasa Indonesia and English naturally — Indonesian speakers expect this. Lean ~60% Indonesian for body, more English for X.`,
    `Output ONLY a single valid JSON object — no preamble, no markdown fence, no commentary. The schema:`,
    `{ "body": string, "short": string, "hashtags": { "instagram": string[], "tiktok": string[], "facebook": string[], "x": string[], "snapchat": string[], "whatsapp": string[] } }`,
    `- body: 60-180 words. Must end with a soft call to book ("DM untuk booking", "Tap below to book", etc.).`,
    `- short: ≤180 characters total, one punchy sentence for X / Snapchat. Must end with a CTA verb.`,
    `- hashtags.instagram: 5 entries (include # prefix). Mix service-specific + location + Indonesian.`,
    `- hashtags.tiktok: 5 entries.`,
    `- hashtags.x: 2 entries.`,
    `- hashtags.facebook / snapchat / whatsapp: empty arrays — those platforms don\'t use hashtags.`,
    `If you cannot infer the location from context, use generic Indonesian tags like #indonesianbeauty.`,
  ].join(' ')

  const userPrompt = [
    `Beautician: ${provider.display_name}.`,
    provider.country_code ? `Country code: ${provider.country_code}.` : '',
    `Service / headline they entered: "${headline}".`,
    body.price_idr ? `Price: Rp ${body.price_idr.toLocaleString('id-ID')}.` : '',
    body.badge_type === 'discount' && body.badge_value ? `Promo badge: ${body.badge_value}% off.` : '',
    body.badge_type === 'new_listing' ? `Promo badge: New listing.` : '',
    body.badge_type === 'bridal_special' ? `Promo badge: Bridal special.` : '',
    `Photo URL: ${photoUrl}.`,
    `Write the JSON now.`,
  ].filter(Boolean).join(' ')

  let aiCaption = ''
  let aiShort: string | null = null
  let aiHashtags: Record<string, string[]> = {}
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1100,
        system:     systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: photoUrl } },
              { type: 'text',  text: userPrompt },
            ],
          },
        ],
      }),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      console.error('[promo-pages] claude failed', r.status, txt.slice(0, 400))
      return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
    }
    const j: { content?: Array<{ type: string; text?: string }> } = await r.json()
    const rawText = (j.content ?? []).find((c) => c.type === 'text')?.text?.trim() ?? ''
    if (!rawText) return NextResponse.json({ error: 'ai_empty' }, { status: 502 })

    // Tolerant JSON extraction — Claude sometimes wraps in fences
    // despite the instruction. Strip any leading/trailing non-JSON.
    const jsonStart = rawText.indexOf('{')
    const jsonEnd   = rawText.lastIndexOf('}')
    const jsonSlice = jsonStart >= 0 && jsonEnd > jsonStart ? rawText.slice(jsonStart, jsonEnd + 1) : rawText

    type Parsed = {
      body?:     string
      short?:    string
      hashtags?: Record<string, unknown>
    }
    let parsed: Parsed
    try { parsed = JSON.parse(jsonSlice) as Parsed }
    catch {
      // Fallback — treat the whole output as the body, no hashtags.
      parsed = { body: rawText }
    }

    aiCaption = (parsed.body ?? '').trim()
    if (!aiCaption) return NextResponse.json({ error: 'ai_empty' }, { status: 502 })
    if (aiCaption.length > MAX_CAPTION_LEN) aiCaption = aiCaption.slice(0, MAX_CAPTION_LEN)

    if (typeof parsed.short === 'string' && parsed.short.trim()) {
      aiShort = parsed.short.trim().slice(0, 250)
    }

    if (parsed.hashtags && typeof parsed.hashtags === 'object') {
      const allowedKeys = ['instagram','tiktok','facebook','x','snapchat','whatsapp'] as const
      const cleaned: Record<string, string[]> = {}
      for (const k of allowedKeys) {
        const raw = (parsed.hashtags as Record<string, unknown>)[k]
        if (!Array.isArray(raw)) { cleaned[k] = []; continue }
        cleaned[k] = raw
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length <= 60)
          .map((t) => t.startsWith('#') ? t : `#${t}`)
          .slice(0, 10)
      }
      aiHashtags = cleaned
    }
  } catch (e) {
    console.error('[promo-pages] claude exception', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
  }

  // ── Insert + counter ─────────────────────────────────────────────
  const slug = newPromoSlug()
  const insertPayload = {
    provider_type:        'beautician' as const,
    provider_id:          provider.id,
    slug,
    photo_url:            photoUrl,
    headline,
    ai_caption:           aiCaption,
    ai_caption_short:     aiShort,
    hashtags_by_platform: aiHashtags,
    badge_type:           body.badge_type ?? null,
    badge_value:          typeof body.badge_value === 'number' ? body.badge_value : null,
    badge_color:          body.badge_color ?? null,
    price_idr:            typeof body.price_idr === 'number' && body.price_idr > 0 ? body.price_idr : null,
  }
  const { data: inserted, error: insertErr } = await admin
    .from('promo_pages')
    .insert(insertPayload)
    .select('id, slug, headline, ai_caption, ai_caption_short, hashtags_by_platform, photo_url, created_at')
    .single()
  if (insertErr || !inserted) {
    console.error('[promo-pages] insert failed', insertErr?.code, insertErr?.message)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  // Increment counter — upsert via select + update with optimistic concurrency
  await admin
    .from('ai_usage_monthly')
    .upsert(
      {
        provider_type:  'beautician',
        provider_id:    provider.id,
        year_month:     yearMonth,
        ai_promo_count: usedThisMonth + 1,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'provider_type,provider_id,year_month' },
    )

  return NextResponse.json({
    ok:    true,
    promo: inserted,
    used:  usedThisMonth + 1,
    limit: limits.monthlyCap,
  })
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/beautician/promo-pages — list provider's promos for dashboard
// ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data: provider } = await admin
    .from('beautician_providers')
    .select('id, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!provider) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const tier   = resolveTier(provider.subscription_status as string | null)
  const limits = PROMO_LIMITS[tier]
  const yearMonth = currentYearMonth()

  const [{ data: promos }, { data: usage }] = await Promise.all([
    admin.from('promo_pages')
      .select('id, slug, headline, ai_caption, ai_caption_short, hashtags_by_platform, photo_url, view_count, click_count, created_at, archived_at')
      .eq('provider_type', 'beautician')
      .eq('provider_id',   provider.id)
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('ai_usage_monthly')
      .select('ai_promo_count')
      .eq('provider_type', 'beautician')
      .eq('provider_id',   provider.id)
      .eq('year_month',    yearMonth)
      .maybeSingle(),
  ])

  return NextResponse.json({
    promos: promos ?? [],
    tier,
    used:   usage?.ai_promo_count ?? 0,
    limits,
    yearMonth,
  })
}
