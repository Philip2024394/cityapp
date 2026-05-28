import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Minimal Cloudflare config for the first deploy. No R2 incremental cache
// (the app is mostly dynamic SSR — no ISR/SSG revalidation needed today).
// If we later add page-level revalidation, switch to r2IncrementalCache.
export default defineCloudflareConfig({})
