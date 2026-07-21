# Prysm Frontend

Next.js App Router dashboard for **Prysm** — AI data analysis, refracted into insight.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Lucide icons + Radix primitives

## Local development

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Backend API defaults to `http://localhost:8000` via `NEXT_PUBLIC_API_URL`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing landing |
| `/login`, `/register` | Authentication |
| `/dashboard` | Overview KPIs |
| `/dashboard/upload` | CSV upload |
| `/dashboard/analyze` | Run AI analysis |
| `/dashboard/history` | Past analyses |

## Design

Sunset glassmorphism UI (violet → magenta → rose on deep purple). See the root README for the full Prysm architecture.
