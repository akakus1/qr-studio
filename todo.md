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
- [x] All 6 QR types: URL, Text, Wi-Fi, vCard, Email, Phone
- [x] qr-code-styling library for high-quality rounded QR codes
- [x] Pricing page with monthly/yearly toggle and feature comparison table
- [x] Dashboard with stats overview (total QR, scans, active, dynamic)
- [x] Upgrade flow (plan selection → backend mutation)

## Pending / Future
- [ ] Stripe payment integration for real billing
- [ ] Email notifications on scan milestones
- [ ] QR code AI style suggestions (LLM-powered)
- [ ] Bulk QR code generation
- [ ] API access for Business plan users
- [ ] White-label / custom domain support
- [ ] Instagram, Location, PDF QR types (UI panels)
- [ ] Admin blog editor UI
