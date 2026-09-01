# Project Wheel

A personal tool for managing a backlog of project ideas and spinning a wheel to pick what to build next. Filter by category, difficulty, or dev type before spinning, track status (idea → doing → completed), and browse the full list.

## Ownership

The Supabase project and Vercel deployment for this repo are tied to the repo owner's GitHub account. That's where:
- the database (tables, RLS policies, seed data) lives
- SQL migrations are run (SQL Editor)
- deployments and environment variables are managed

## Stack

- React (Vite)
- Supabase (Postgres + Auth)
- Deployed on Vercel

## Local setup

```bash
npm install
```

Create `.env` at the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from the Supabase dashboard → Settings → API.

```bash
npm run dev
```

## Database

Schema, seed data, and the ownership migration live in the repo's `sql/` folder. Run them in order in the Supabase SQL Editor:

1. `schema.sql` — tables + RLS policies
2. `seed.sql` — initial project/category data
3. `migration.sql` — adds `owner_id` to scope rows per account, back-fills existing rows, tightens RLS to per-owner access

## Auth

Email + password (Supabase Auth). Each account only sees its own projects and categories — enforced via RLS on `owner_id`.

Password reset not yet setup. Also no email confirmations.

Auth redirect URLs are configured under Supabase → Authentication → URL Configuration, and must match wherever the app is actually running (local dev port or the Vercel URL).

## Deployment

```bash
npm install -g vercel
vercel
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings, then add the deployed URL to Supabase's Site URL and Redirect URLs.