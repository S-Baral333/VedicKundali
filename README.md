# Kundali — Vedic Astrology Platform

**Built by WandongBulls Corp**

Your stars. Your story. Your dharma.

## About

Kundali is a precision Vedic astrology web app built on React 18, Vite, TypeScript, Supabase, and i18next. It delivers birth chart generation, daily horoscopes, dream interpretation, Kundali Milan compatibility, muhurta timing, and AI-powered oracle readings — rooted in the classical Sanskrit tradition of Jyotisha.

Supported languages: English, Hindi (हिन्दी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Nepali (नेपाली).

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Auth & DB:** Supabase (Postgres + Row-Level Security)
- **Edge Functions:** Deno (Supabase Functions)
- **i18n:** i18next (7 locales)
- **Styling:** Tailwind CSS + custom sacred design system
- **PWA:** vite-plugin-pwa (offline-ready)

## Getting Started

```bash
# 1. Clone the repo
git clone <repo-url>
cd dharma-chart-guru-main

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local

# 4. Start the dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |

Edge function secrets are set in the Supabase dashboard under **Settings → Edge Functions → Secrets**:

| Secret | Description |
|---|---|
| `AI_GATEWAY_API_KEY` | API key for the AI gateway (required for oracle, horoscope, dream, and reading generation) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (localhost:8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Deployment

Deploy via any static host (Vercel, Netlify, Cloudflare Pages) pointed at the `dist/` output. Supabase edge functions deploy separately via the Supabase CLI:

```bash
supabase functions deploy
```

## License

© WandongBulls Corp. All rights reserved.
