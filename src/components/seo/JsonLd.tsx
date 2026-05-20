// ============================================================================
// JsonLd — emits a single Schema.org JSON-LD <script> tag.
// ----------------------------------------------------------------------------
// Server component (no 'use client'). Pass any plain object — it's JSON-
// stringified and emitted in the document body. Safe in App Router because
// the value is serialised, not interpolated.
//
// Reference vocabularies used across the app:
//   • LocalBusiness — driver public profile (/r/[slug])
//   • Place         — landmark detail page (/places/[slug])
//   • Service       — bike rental listing (/rent/[slug])
//   • Organization  — site footer
//
// Schema docs: https://schema.org/
// ============================================================================

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // dangerouslySetInnerHTML is the only way Next.js currently allows
      // arbitrary JSON in a <script> body. The string is server-rendered
      // from a typed object — there is no user-controlled HTML in it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
