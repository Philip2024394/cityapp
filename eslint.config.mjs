import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// ESLint 9 flat config. `eslint-config-next` v15 still ships as a legacy
// eslintrc preset (uses @rushstack/eslint-patch internally), so we wrap it
// via FlatCompat rather than importing it directly.
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/',
      '.open-next/',
      'out/',
      'node_modules/',
      'supabase/',
      'scripts/',                  // dev utility scripts, not shipped
      'src/types/supabase.ts',     // generated, 220k lines
      'src/components/admin/**',   // legacy WIP — skip until owner is decided
    ],
  },
  {
    rules: {
      // Project posture: ship velocity > lint purity. Keep these as warnings,
      // not errors, so they surface without blocking ship.
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // ImageKit URLs are remote; <img> is intentional in many places.
      '@next/next/no-img-element': 'off',
      // Cosmetic JSX text escaping (smart-quotes, apostrophes). Modern
      // browsers render `"` and `'` in text nodes fine; the rule guards
      // against pre-React-16 ambiguity that no longer applies. Initial
      // scaffold flagged 49 of these as errors — downgraded to warn so
      // they surface without blocking builds.
      'react/no-unescaped-entities': 'warn',
    },
  },
]
