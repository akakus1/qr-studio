# QR Studio — Free QR Code Generator

A full-featured QR code generator with dynamic QR codes, scan analytics, subscription plans (Free/Pro/Business), Stripe payments, AI style suggestions, bulk generation, REST API, and an admin blog editor.

**Tech Stack:** React 19 · Tailwind CSS 4 · Express 4 · tRPC 11 · Drizzle ORM · PostgreSQL (Supabase) · Stripe · OpenAI

---

## Features

- **9 QR Types** — URL, Text, Wi-Fi, vCard, Email, Phone, Instagram, Location, PDF
- **Dynamic QR Codes** — editable destination URLs after creation
- **Scan Analytics** — device, country, browser, referrer tracking with charts
- **Subscription Plans** — Free / Pro / Business via Stripe Checkout
- **AI Style Suggestions** — OpenAI-powered color scheme generator
- **Bulk QR Generator** — CSV upload, batch PNG download (Pro plan)
- **REST API v1** — programmatic QR generation (Business plan)
- **API Key Management** — SHA-256 hashed keys, create/revoke UI
- **Admin Blog Editor** — full CRUD with preview, SEO meta
- **Email/Password Auth** — register, login, logout with JWT sessions

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/qr-studio.git
cd qr-studio
pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables (see `.env.example` for full list):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler connection string |
| `JWT_SECRET` | Random secret for session signing (min 32 chars) |
| `VITE_APP_ID` | App identifier string (e.g. `qr-studio`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...` or `pk_live_...`) |
| `OPENAI_API_KEY` | OpenAI API key for AI style suggestions (optional) |

### 3. Run database migrations

```bash
pnpm db:push
```

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database**
3. Copy the **Transaction Pooler** connection string (port 6543)
4. Replace `[YOUR-PASSWORD]` with your database password
5. Set it as `DATABASE_URL` in your `.env`

The connection string format is:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

---

## Stripe Setup

1. Create a [Stripe](https://stripe.com) account
2. Copy your API keys from the Stripe Dashboard
3. Set up a webhook endpoint pointing to `https://YOUR_DOMAIN/api/stripe/webhook`
4. Add the `checkout.session.completed` event
5. Copy the webhook signing secret

**Test card:** `4242 4242 4242 4242` (any future date, any CVC)

---

## Deployment

### Option A: Railway (Recommended for full-stack)

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Add all environment variables in Railway's dashboard
5. Railway will auto-detect the build command from `package.json`

### Option B: Vercel (Frontend) + Railway (Backend)

The app is a full-stack Express server that serves both the API and the React frontend. For Vercel deployment, the `vercel.json` is included and routes all requests through the Express server.

> **Note:** Vercel Serverless Functions have a 10s timeout. For production use with heavy analytics queries, Railway or a VPS is recommended.

### Environment Variables for Production

Set all variables from `.env.example` in your hosting platform's dashboard. Never commit `.env` to version control.

---

## Making Yourself Admin

After registering your first account, run this SQL in the Supabase SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

This grants access to the Admin Blog Editor at `/admin/blog`.

---

## Project Structure

```
client/src/
  pages/          ← Page-level React components
  components/     ← Reusable UI components (shadcn/ui)
  _core/hooks/    ← useAuth and other hooks
server/
  routers.ts      ← tRPC procedures (auth, qr, blog, stripe, etc.)
  db.ts           ← Database query helpers
  _core/          ← Framework plumbing (auth, context, LLM, etc.)
drizzle/
  schema.ts       ← Database schema (PostgreSQL)
  *.sql           ← Generated migrations
```

---

## API Reference (Business Plan)

All endpoints require an `X-API-Key` header with a valid Business plan API key.

```
POST /api/v1/qr
Content-Type: application/json
X-API-Key: qrs_your_api_key

{
  "type": "url",
  "content": "https://example.com",
  "name": "My QR Code"
}
```

---

## License

MIT
