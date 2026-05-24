import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/geo/admin-lookup?lat=&lng=
// ----------------------------------------------------------------------------
// Given a lat/lng anywhere in Indonesia, returns the full admin chain
// IDs from our DB:
//   { province_id, regency_id, district_id, village_id, names: {…} }
//
// Strategy:
//   1. Reverse-geocode lat/lng via Nominatim → admin NAMES (province,
//      regency, district, village).
//   2. Match each name against our DB tables (fuzzy: case-insensitive,
//      strip "KOTA "/"KABUPATEN " prefix).
//   3. Return IDs for whatever we matched. Unmatched levels return null
//      (e.g. if a brand-new village isn't in our seed yet).
//
// This is the canonical "what district is this point in?" lookup.
// Used by the LocationPicker to autofill admin FK columns on save.
// ============================================================================

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT = 'CityRider/1.0 (cityriders.streetlocal.live)'

type LookupResponse = {
  lat: number
  lng: number
  province_id: string | null
  regency_id: string | null
  district_id: string | null
  village_id: string | null
  names: {
    province: string | null
    regency: string | null
    district: string | null
    village: string | null
  }
}

// Normalise an admin name for matching across BPS + Nominatim spellings.
// Both sources are slightly inconsistent: BPS often writes "GEDONG TENGEN"
// (two words) while OSM writes "Gedongtengen" (one word); BPS uses
// "KOTA YOGYAKARTA" while OSM drops the prefix; some districts use
// "KEC." prefix etc. So we:
//   1. Uppercase
//   2. Strip every admin prefix
//   3. Strip ALL whitespace (handles the "GEDONG TENGEN" vs "Gedongtengen" gap)
//   4. Strip non-alphanumeric punctuation (handles "PRAY." vs "PRAY")
function normaliseAdminName(name: string | null): string {
  if (!name) return ''
  return name
    .toUpperCase()
    .replace(/^KOTA\s+/i, '')
    .replace(/^KABUPATEN\s+/i, '')
    .replace(/^KAB\.\s*/i, '')
    .replace(/^KEC\.\s*/i, '')
    .replace(/^KECAMATAN\s+/i, '')
    .replace(/^DESA\s+/i, '')
    .replace(/^KELURAHAN\s+/i, '')
    .replace(/^KEL\.\s*/i, '')
    .replace(/[^A-Z0-9]/g, '')
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lng = parseFloat(url.searchParams.get('lng') ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng query params required as numbers' }, { status: 400 })
  }
  if (lat < -11 || lat > 6 || lng < 95 || lng > 142) {
    return NextResponse.json({ error: 'Coordinates outside Indonesia' }, { status: 400 })
  }

  // ─── Step 1: Nominatim reverse-geocode for admin NAMES ──────────────
  const nomUrl = `${NOMINATIM_BASE}?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=14&accept-language=id`
  let nomData: { address?: Record<string, string | undefined> }
  try {
    const res = await fetch(nomUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!res.ok) return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 })
    nomData = await res.json()
  } catch (err) {
    return NextResponse.json(
      { error: 'Nominatim fetch failed', message: err instanceof Error ? err.message : 'network error' },
      { status: 502 },
    )
  }

  const addr = nomData.address ?? {}
  const provinceName = addr.state ?? null
  const regencyName  = addr.city ?? addr.town ?? addr.municipality ?? addr.county ?? null
  const districtName = addr.city_district ?? addr.suburb ?? null
  const villageName  = addr.village ?? addr.hamlet ?? addr.neighbourhood ?? null

  const result: LookupResponse = {
    lat,
    lng,
    province_id: null,
    regency_id: null,
    district_id: null,
    village_id: null,
    names: {
      province: provinceName,
      regency: regencyName,
      district: districtName,
      village: villageName,
    },
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json(result)

  // ─── Step 2: cascading name-to-ID lookups ───────────────────────────
  // Province — match against `name` ignoring case + prefix.
  if (provinceName) {
    const target = normaliseAdminName(provinceName)
    const { data } = await admin.from('provinces').select('id, name')
    const hit = data?.find((p) => normaliseAdminName(p.name) === target)
    if (hit) result.province_id = hit.id
  }

  // Regency — only match within the resolved province if known.
  if (regencyName && (result.province_id || provinceName)) {
    const target = normaliseAdminName(regencyName)
    let query = admin.from('regencies').select('id, name, province_id')
    if (result.province_id) query = query.eq('province_id', result.province_id)
    const { data } = await query
    const hit = data?.find((r) => normaliseAdminName(r.name) === target)
    if (hit) {
      result.regency_id = hit.id
      // Pick up the province_id if it wasn't matched directly.
      if (!result.province_id) result.province_id = hit.province_id
    }
  }

  // District — only match within the resolved regency if known.
  if (districtName && result.regency_id) {
    const target = normaliseAdminName(districtName)
    const { data } = await admin
      .from('districts')
      .select('id, name, regency_id')
      .eq('regency_id', result.regency_id)
    const hit = data?.find((d) => normaliseAdminName(d.name) === target)
    if (hit) result.district_id = hit.id
  }

  // Village — only match within the resolved district if known.
  if (villageName && result.district_id) {
    const target = normaliseAdminName(villageName)
    const { data } = await admin
      .from('villages')
      .select('id, name, district_id')
      .eq('district_id', result.district_id)
    const hit = data?.find((v) => normaliseAdminName(v.name) === target)
    if (hit) result.village_id = hit.id
  }

  return NextResponse.json(result)
}
