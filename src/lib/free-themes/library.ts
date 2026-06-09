// ============================================================================
// Free-tier theme library — 15 distinct one-page link-in-bio templates
// ----------------------------------------------------------------------------
// Founder direction 2026-06-09 (Free-tier visual investment):
//   - Free becomes 15 distinct one-page templates (this file).
//   - Pro keeps the 23 vertical-specific templates already shipped.
//
// Each Free theme renders ONLY: profile photo + display name + bio +
// WhatsApp CTA + unlimited links + social icons + "Made with Kita2u"
// badge. No portfolio, no services, no before/after, no QRIS, no reviews
// — those stay locked to the Pro vertical templates.
//
// Originality rule (apply across the whole picker):
//   - inspired by the link-in-bio genre, no copying of specific tools,
//   - no copyrighted assets, no song lyrics, no trademarked names.
//
// Rendering:
//   src/components/free-themes/FreeThemeRenderer.tsx consumes this
//   library and renders the chosen { layout, cardStyle, buttonStyle,
//   fontFamily, animation }. All animations respect
//   prefers-reduced-motion via CSS.
// ============================================================================

export type FreeThemeId =
  | 'minimalist-mono' | 'pastel-bloom' | 'neon-pulse' | 'bento-studio'
  | 'marble-editorial' | 'tropical-bali' | 'brutalist-block' | 'glassmorphism'
  | 'vintage-paper' | 'donut-dance' | 'bubble-pop' | 'magazine-grid'
  | 'geometric-confetti' | 'watercolor-wash' | 'cyberpunk-glitch'

export type FreeTheme = {
  id: FreeThemeId
  name: string
  tagline: string
  thumbnail: string   // ImageKit URL or a placeholder path. Renderer falls
                      // back to a CSS gradient using `defaults` when the
                      // image isn't uploaded yet.
  defaults: {
    pageBackground: string
    brandColor: string
    buttonTextColor: string
  }
  layout:        'centered' | 'split-left' | 'bento' | 'magazine' | 'pinned-bottom'
  cardStyle:     'flat' | 'glass' | 'paper' | 'neon' | 'brutalist' | 'serif'
  buttonStyle:   'filled' | 'outline' | 'ghost' | 'chips' | 'underline' | 'pill'
  fontFamily:    'sans' | 'serif' | 'mono' | 'display'
  animation:     'none' | 'heartbeat-socials' | 'dancing-donut' | 'floating-bubbles'
               | 'petals-falling' | 'parallax-cards' | 'glitch-avatar'
               | 'leaves-sway' | 'wobble-buttons' | 'ink-bleed' | 'paper-curl'
               | 'drifting-shapes' | 'breathing-tiles'
}

export const FREE_THEMES: ReadonlyArray<FreeTheme> = [
  { id: 'minimalist-mono',  name: 'Minimalist Mono',  tagline: 'Pure typography. Nothing extra.',  layout: 'centered',     cardStyle: 'flat',       buttonStyle: 'underline', fontFamily: 'serif',  animation: 'none',                 defaults: { pageBackground: '#FFFFFF', brandColor: '#0A0A0A', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/minimalist-mono.png' },
  { id: 'pastel-bloom',     name: 'Pastel Bloom',     tagline: 'Soft + warm + welcoming.',          layout: 'centered',     cardStyle: 'paper',      buttonStyle: 'pill',      fontFamily: 'sans',   animation: 'petals-falling',       defaults: { pageBackground: '#FCE7F3', brandColor: '#EC4899', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/pastel-bloom.png' },
  { id: 'neon-pulse',       name: 'Neon Pulse',       tagline: 'Dark + bright + alive.',            layout: 'centered',     cardStyle: 'neon',       buttonStyle: 'outline',   fontFamily: 'mono',   animation: 'heartbeat-socials',    defaults: { pageBackground: '#0A0A0A', brandColor: '#00FF88', buttonTextColor: '#0A0A0A' }, thumbnail: '/themes/neon-pulse.png' },
  { id: 'bento-studio',     name: 'Bento Studio',     tagline: 'Grid-first. Picture-perfect.',      layout: 'bento',        cardStyle: 'flat',       buttonStyle: 'filled',    fontFamily: 'sans',   animation: 'breathing-tiles',      defaults: { pageBackground: '#F5F5F4', brandColor: '#0A0A0A', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/bento-studio.png' },
  { id: 'marble-editorial', name: 'Marble Editorial', tagline: 'Magazine elegance.',                layout: 'magazine',     cardStyle: 'serif',      buttonStyle: 'ghost',     fontFamily: 'serif',  animation: 'ink-bleed',            defaults: { pageBackground: '#FAFAF7', brandColor: '#1F2937', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/marble-editorial.png' },
  { id: 'tropical-bali',    name: 'Tropical Bali',    tagline: 'Warm sunset + palm shadow.',        layout: 'centered',     cardStyle: 'glass',      buttonStyle: 'pill',      fontFamily: 'sans',   animation: 'leaves-sway',          defaults: { pageBackground: '#FED7AA', brandColor: '#EA580C', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/tropical-bali.png' },
  { id: 'brutalist-block',  name: 'Brutalist Block',  tagline: 'Bold + raw + loud.',                layout: 'centered',     cardStyle: 'brutalist',  buttonStyle: 'filled',    fontFamily: 'display', animation: 'wobble-buttons',       defaults: { pageBackground: '#FACC15', brandColor: '#0A0A0A', buttonTextColor: '#FACC15' }, thumbnail: '/themes/brutalist-block.png' },
  { id: 'glassmorphism',    name: 'Glassmorphism',    tagline: 'Frosted blur over color.',          layout: 'centered',     cardStyle: 'glass',      buttonStyle: 'ghost',     fontFamily: 'sans',   animation: 'parallax-cards',       defaults: { pageBackground: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)', brandColor: '#FFFFFF', buttonTextColor: '#0A0A0A' }, thumbnail: '/themes/glassmorphism.png' },
  { id: 'vintage-paper',    name: 'Vintage Paper',    tagline: 'Sepia + serif + nostalgia.',        layout: 'centered',     cardStyle: 'paper',      buttonStyle: 'underline', fontFamily: 'serif',  animation: 'paper-curl',           defaults: { pageBackground: '#FEF3C7', brandColor: '#92400E', buttonTextColor: '#FEF3C7' }, thumbnail: '/themes/vintage-paper.png' },
  { id: 'donut-dance',      name: 'Donut Dance',      tagline: 'Playful. Yellow. Fun.',             layout: 'centered',     cardStyle: 'flat',       buttonStyle: 'pill',      fontFamily: 'sans',   animation: 'dancing-donut',        defaults: { pageBackground: '#FFFBEB', brandColor: '#FACC15', buttonTextColor: '#0A0A0A' }, thumbnail: '/themes/donut-dance.png' },
  { id: 'bubble-pop',       name: 'Bubble Pop',       tagline: 'Floating product orbs.',            layout: 'pinned-bottom', cardStyle: 'flat',      buttonStyle: 'pill',      fontFamily: 'sans',   animation: 'floating-bubbles',     defaults: { pageBackground: '#E0F2FE', brandColor: '#0EA5E9', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/bubble-pop.png' },
  { id: 'magazine-grid',    name: 'Magazine Grid',    tagline: 'Editorial 3-column.',               layout: 'magazine',     cardStyle: 'flat',       buttonStyle: 'chips',     fontFamily: 'serif',  animation: 'parallax-cards',       defaults: { pageBackground: '#F9FAFB', brandColor: '#0A0A0A', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/magazine-grid.png' },
  { id: 'geometric-confetti', name: 'Geometric Confetti', tagline: 'Shapes + scatter + delight.',  layout: 'centered',      cardStyle: 'flat',       buttonStyle: 'filled',    fontFamily: 'sans',   animation: 'drifting-shapes',      defaults: { pageBackground: '#FFFFFF', brandColor: '#7C3AED', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/geometric-confetti.png' },
  { id: 'watercolor-wash',  name: 'Watercolor Wash',  tagline: 'Soft + bleeding + organic.',        layout: 'centered',      cardStyle: 'paper',      buttonStyle: 'ghost',     fontFamily: 'serif',  animation: 'ink-bleed',            defaults: { pageBackground: '#FDF2F8', brandColor: '#A855F7', buttonTextColor: '#FFFFFF' }, thumbnail: '/themes/watercolor-wash.png' },
  { id: 'cyberpunk-glitch', name: 'Cyberpunk Glitch', tagline: 'Glitched. Neon. Loud.',             layout: 'centered',      cardStyle: 'neon',       buttonStyle: 'outline',   fontFamily: 'mono',   animation: 'glitch-avatar',        defaults: { pageBackground: '#0A0A0A', brandColor: '#FF00FF', buttonTextColor: '#00FFFF' }, thumbnail: '/themes/cyberpunk-glitch.png' },
]

/** Look up a theme by id, falling back to the first (minimalist-mono)
 *  when the id is unknown or null. This is the canonical entry point —
 *  always go through this rather than indexing FREE_THEMES directly so
 *  unknown ids never throw. */
export function findTheme(id: string | null | undefined): FreeTheme {
  return FREE_THEMES.find((t) => t.id === id) ?? FREE_THEMES[0]
}

/** The set of themes that have been fleshed out in the renderer. Themes
 *  not in this set fall back to Minimalist Mono with a "coming soon"
 *  banner. Keep in sync with the switch in FreeThemeRenderer. */
export const FULLY_RENDERED_THEME_IDS: ReadonlyArray<FreeThemeId> = [
  'minimalist-mono', 'pastel-bloom', 'neon-pulse', 'donut-dance', 'bento-studio',
]

export function isThemeFullyRendered(id: FreeThemeId): boolean {
  return FULLY_RENDERED_THEME_IDS.includes(id)
}

/** Profile shape consumed by the renderer. Mirrors the free_profiles
 *  table columns the renderer needs. Anything UI-only that isn't in the
 *  DB lives here as optional. */
export type FreeProfile = {
  slug:                       string
  display_name:               string
  bio:                        string | null
  profile_image_url:          string | null
  cover_image_url:            string | null
  page_background_image_url:  string | null
  brand_color:                string | null
  button_text_color:          string | null
  whatsapp_e164:              string | null
  avatar_placement:           'center' | 'top-left' | 'bottom-left' | null
  show_url_under_avatar:      boolean | null
  free_theme_id:              string | null
  links:                      Array<{ title: string; url: string }>
  socials:                    {
    instagram?: string
    tiktok?:    string
    facebook?:  string
    youtube?:   string
    x?:         string
    email?:     string
  }
}
