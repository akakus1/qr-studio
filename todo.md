# QR Studio — Project TODO

## Phase 1: Conversion Fixes
- [x] Remove sign-in gate before QR generation (generate-first flow)
- [x] Allow PNG and SVG download without login
- [x] Only gate "Save to Account" behind login
- [x] Display pricing clearly on homepage (pricing section + upgrade banner)
- [x] Add trust signals: testimonials, user count badge, feature pills
- [x] Live preview auto-updating as user types
- [x] Promo banner after QR generation (upsell to Pro)

## Phase 2: Core Product Features
- [x] Dynamic QR codes (toggle at save time)
- [x] Scan analytics dashboard (per-QR analytics page)
- [x] User accounts system (save/manage QR codes)
- [x] Subscription system (free/pro/business plans)
- [x] QR code list with edit, delete, pause/activate
- [x] Scan event recording (device, referrer, IP)
- [x] Scan count per QR code
- [x] Analytics: daily chart, device breakdown, recent scans

## Phase 3: UX Flow Optimisation
- [x] Generate → Preview → Save/Download flow (no login gate)
- [x] Mobile-responsive layout (CSS variables, fluid sizing)
- [x] Live preview panel with auto-update
- [x] FAQ accordion section
- [x] Toast notifications for user feedback
- [x] Loading states on all async actions
- [x] Redirect page for dynamic QR codes (/r/:slug)

## Phase 4: SEO & Growth
- [x] Blog listing page (/blog)
- [x] Blog post page (/blog/:slug) with seed content
- [x] SEO meta tags (title, description, OG, Twitter card)
- [x] Structured data (JSON-LD WebApplication schema)
- [x] Canonical URLs
- [x] Sitemap-ready URL structure
- [x] 6 seed blog posts covering key QR topics

## Phase 5: Advanced Features
- [x] QR code customisation: colors, logo upload, size
- [x] All 9 QR types: URL, Text, Wi-Fi, vCard, Email, Phone, Instagram, Location, PDF
- [x] qr-code-styling library for high-quality rounded QR codes
- [x] Pricing page with monthly/yearly toggle and feature comparison table
- [x] Dashboard with stats overview (total QR, scans, active, dynamic)
- [x] Upgrade flow (plan selection → backend mutation)
- [x] AI style suggestions (LLM-powered color scheme generator)

## Pending / Future
- [x] Stripe payment integration (Stripe Checkout, webhook handler, plan upgrade on payment)
- [x] Scan milestone notifications (10, 50, 100, 500, 1000, 5000, 10000 scans — owner push notification)
- [x] Bulk QR code generation (/bulk — Pro plan, CSV upload, batch PNG download)
- [x] API access for Business plan users (SHA-256 hashed API keys, create/revoke UI at /api-keys, Business plan gated, max 5 keys, usage tracking)
- [x] Admin blog editor: fetch full post content when editing existing posts
- [x] Admin blog editor: add delete/unpublish action
- [x] Bulk QR: add Vitest coverage for CSV parsing logic (8 tests)
- [x] White-label / custom domain support — DEFERRED: requires DNS CNAME mapping infrastructure at the hosting/platform level; not implementable within this application codebase. Noted as v2 roadmap item.
- [x] Admin blog editor UI (/admin/blog — admin-only, full CRUD with preview)
- [x] Harden AI style suggestions with safe JSON parsing and Vitest coverage

## Deployment Preparation (GitHub + Vercel)

## Independence Migration — Supabase Full Migration

- [x] Migrate schema from MySQL to PostgreSQL (drizzle postgres-js)
- [x] Update drizzle.config.ts to postgresql dialect
- [x] Update server/db.ts to postgres-js driver
- [x] Run SQL migrations on Supabase
- [x] Replace Manus OAuth with email/password auth (register/login/logout tRPC procedures)
- [x] Build register/login/logout tRPC procedures
- [x] Build login and signup UI pages
- [x] Update useAuth hook to use new email/password auth
- [x] Replace Manus LLM with OpenAI API (OPENAI_API_KEY env var)
- [x] Remove Manus notification dependency (console.log fallback)
- [x] Update all environment variables for independence
- [x] Fix aiStyle test to mock LLM (25 tests passing)
- [x] Verify all features end-to-end (25 tests passing, 0 TS errors)
- [x] Save checkpoint (version d0a8d63f)

## Deployment Preparation (GitHub + Vercel)

- [x] Audit Manus-specific dependencies and platform bindings
- [x] Replace Manus OAuth with standard auth (JWT + email/password)
- [x] Replace Manus LLM helper with direct OpenAI API call
- [x] Remove Manus notification helper (console.log fallback)
- [x] Add vercel.json with correct build/output settings
- [x] Write comprehensive README.md with setup and deployment instructions
- [ ] Export project to GitHub via Manus UI
