# Journal by Noel

A modern futures trading journal and performance analytics platform — dashboard, trade journal, analytics, calendar, playbook, psychology tracking, risk tools, and multi-account/prop-firm support.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres database + Auth (see [`DEPLOYMENT.md`](./DEPLOYMENT.md) for setup)
- **Recharts** for charts, **Zustand** for client state, **Lucide** icons

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full step-by-step guide covering GitHub, Supabase, and Vercel.
