// ============================================================================
// Legal entity info — env-driven so the user can populate when PT/CV is
// registered without code changes. Renders ONLY if the relevant env vars
// are set; otherwise the legal-entity blocks self-hide so the public
// pages don't display claims that aren't backed by real registration.
//
// To populate (when PT/CV is registered):
//
//   NEXT_PUBLIC_LEGAL_ENTITY_NAME=PT Street Local Digital
//   NEXT_PUBLIC_LEGAL_ENTITY_NPWP=01.234.567.8-901.000
//   NEXT_PUBLIC_LEGAL_ENTITY_ADDRESS=Jl. Malioboro No. 123, Yogyakarta 55271
//   NEXT_PUBLIC_LEGAL_ENTITY_PSE_NUMBER=PSE-12345/IPK/2026
//   NEXT_PUBLIC_LEGAL_ENTITY_CONTACT_EMAIL=hello@streetlocal.live
//   NEXT_PUBLIC_LEGAL_ENTITY_CONTACT_WHATSAPP=628123456789
//
// All fields are optional. Pages render whatever is set, omit what isn't.
// ============================================================================

export type LegalEntity = {
  name?: string
  npwp?: string
  address?: string
  pseNumber?: string
  contactEmail?: string
  contactWhatsapp?: string
}

export function getLegalEntity(): LegalEntity {
  return {
    name:            process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME,
    npwp:            process.env.NEXT_PUBLIC_LEGAL_ENTITY_NPWP,
    address:         process.env.NEXT_PUBLIC_LEGAL_ENTITY_ADDRESS,
    pseNumber:       process.env.NEXT_PUBLIC_LEGAL_ENTITY_PSE_NUMBER,
    contactEmail:    process.env.NEXT_PUBLIC_LEGAL_ENTITY_CONTACT_EMAIL,
    contactWhatsapp: process.env.NEXT_PUBLIC_LEGAL_ENTITY_CONTACT_WHATSAPP,
  }
}

export function hasAnyLegalEntity(entity: LegalEntity = getLegalEntity()): boolean {
  return !!(entity.name || entity.npwp || entity.address || entity.pseNumber)
}
