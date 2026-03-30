# QR Studio

AI-powered QR code generator with print-ready promotional design pack. Users generate a QR code, enter their business details, receive 8 AI-generated canvas designs, pay once via Stripe, and download print-ready PDF and PNG files. Purchases are saved to a dashboard for re-download at any time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hosting | Vercel (serverless functions + static) |
| Auth + Database | Supabase (Auth + Postgres) |
| Payments | Stripe Checkout Sessions |
| AI Copy | Anthropic Claude API |
| Frontend | Vanilla HTML/CSS/JS — no build step |
| PDF export | jsPDF (CDN) |
| QR generation | qrcodejs (CDN) |

---

## Project Structure

```
qr-studio/
├── api/
│   ├── generate-copy.js          POST — Claude AI copy generation
│   ├── auth/
│   │   ├── login.js              POST — sign in, returns JWT
│   │   ├── register.js           POST — create account
│   │   ├── me.js                 GET  — current user profile
│   │   └── reset-password.js     POST — send password reset email
│   ├── orders/
│   │   ├── create-checkout.js    POST — create Stripe Checkout Session
│   │   ├── verify-session.js     POST — verify payment, issue download token
│   │   ├── list.js               GET  — user's paid orders
│   │   └── download.js           POST — ownership-verified re-download
│   └── webhooks/
│       └── stripe.js             POST — Stripe event handler (guaranteed delivery)
├── lib/
│   ├── auth.js                   Server middleware (requireAuth, setCors)
│   └── supabase.js               Supabase admin client + JWT verification
├── public/
│   ├── index.html                Free QR generator
│   ├── promo.html                AI promo design tool + checkout
│   ├── auth.html                 Sign up / sign in / password reset
│   ├── dashboard.html            Customer dashboard + re-downloads
│   ├── css/styles.css            Shared styles
│   └── js/
│       ├── config.js             Supabase public config (edit before deploy)
│       ├── app.js                Shared utilities (translations, toast, session)
│       ├── auth.js               Client-side auth (QRAuth)
│       ├── promo.js              Canvas templates + promo page logic
│       └── dashboard.js          Dashboard page logic
├── supabase-schema.sql           Full database schema — run once in Supabase SQL Editor
├── vercel.json                   Vercel routing config
├── package.json
└── .env.example                  Copy to .env.local for local development
```

---

## Environment Variables

Set all of these in **Vercel → Project → Settings → Environment Variables** before deploying.

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → Settings → API → service_role key ⚠️ secret |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_BASIC` | Stripe → Products → Basic ($10) → Price ID |
| `STRIPE_PRICE_RECOMMENDED` | Stripe → Products → Recommended ($15) → Price ID |
| `STRIPE_PRICE_PREMIUM` | Stripe → Products → Premium ($20) → Price ID |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `JWT_SECRET` | 64-char random hex — see generation command below |
| `ALLOWED_ORIGIN` | Your production domain e.g. `https://yourdomain.com` |

Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## One-time Database Setup

Run `supabase-schema.sql` once in your Supabase project:

1. Go to **supabase.com** → your project → **SQL Editor**
2. Paste the full contents of `supabase-schema.sql`
3. Click **Run**

The schema is idempotent — safe to re-run at any time.

---

## Stripe Setup

**1. Create three one-time payment Products in Stripe:**

| Product name | Price | Price ID env var |
|---|---|---|
| QR Promo Basic | $10 USD | `STRIPE_PRICE_BASIC` |
| QR Promo Recommended | $15 USD | `STRIPE_PRICE_RECOMMENDED` |
| QR Promo Premium | $20 USD | `STRIPE_PRICE_PREMIUM` |

**2. Create a Webhook endpoint:**

- URL: `https://yourdomain.com/api/webhooks/stripe`
- Listen for: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
- Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## Edit config.js Before Deploying

Open `public/js/config.js` and replace both placeholder values:

```js
window.QR_SUPABASE_URL  = 'https://your-project-ref.supabase.co';
window.QR_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

These values are safe for frontend — the anon key is not secret.  
**Never** put `SUPABASE_SERVICE_ROLE_KEY` here.

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel --prod
```

After deploying, set all environment variables in the Vercel dashboard, then redeploy:
```bash
vercel --prod
```

---

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in real values
cp .env.example .env.local

# 3. Edit public/js/config.js with your Supabase URL and anon key

# 4. Start local dev server (runs API functions + static files)
vercel dev
# Opens at http://localhost:3000
```

---

## User Flow

```
1. index.html      → generate QR code (free, no auth)
2. promo.html      → sign in / register if not authenticated
3. promo.html      → fill business form → POST /api/generate-copy
4.                 → Claude returns 8 copy variations
5.                 → 8 watermarked canvas designs rendered
6.                 → user selects design, edits headline/CTA/colour
7.                 → click tier → POST /api/orders/create-checkout
8.                 → Stripe Checkout Session created → redirect to Stripe
9. Stripe          → payment → redirect to /promo.html?session_id=...
10. promo.html     → POST /api/orders/verify-session → order saved
11.                → watermarks removed → PDF + PNG download enabled
12. Stripe webhook → POST /api/webhooks/stripe → idempotent order upsert (guaranteed)
13. dashboard.html → GET /api/orders/list → all purchases shown
14.                → "Download" → POST /api/orders/download → ownership verified → PNG
```

---

## Security

- All API keys are server-side only (`process.env.*` in `/api` and `/lib`)
- `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser
- Stripe keys never reach the browser
- Anthropic key never reaches the browser
- All authenticated API routes verify the Supabase JWT server-side via `requireAuth()`
- All order writes are performed by the service role server-side — authenticated users can only SELECT their own rows
- Download tokens are HMAC-SHA256 signed with `JWT_SECRET`, valid for 30 minutes
- Stripe webhook signature is verified with `stripe.webhooks.constructEvent()` before any processing
