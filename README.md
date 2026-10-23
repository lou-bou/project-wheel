# Project Wheel

A personal tool for managing a backlog of project ideas and spinning a wheel to pick what to build next. Filter by category, difficulty, or dev type before spinning, track status (idea → doing → completed), and browse the full list.

## Stack

- React (Vite) frontend
- Small Express API (`server/index.js`) talking to Postgres, which also serves the built frontend
- Self-hosted on the ThinkPad home server, exposed through the Cloudflare Tunnel at `wheel.boussaid.me`
- Login handled by Cloudflare Access (email one-time PIN) — the app itself has no auth

## Local setup

```bash
npm install
cp .env.example .env   # point DATABASE_URL at a Postgres database
psql "$DATABASE_URL" -f Schema.sql
```

Run the API and the Vite dev server in two terminals (Vite proxies `/api` to port 3000):

```bash
npm run dev:api
npm run dev
```

## Database

`Schema.sql` creates the tables (`projects`, `categories`, `project_categories`). Run it once on a fresh database.

To bring data over from the old Supabase project (one time), run the schema first, then:

```bash
SUPABASE_DB_URL='postgresql://...' DATABASE_URL='postgres://wheel:...@localhost/wheel' scripts/import-from-supabase.sh
```

The Supabase connection string is under Connect → Session pooler in the Supabase dashboard.

Back up with `pg_dump wheel > wheel-$(date +%F).sql` (e.g. nightly from cron).

## Server setup (ThinkPad)

Needs Node 22+ and Postgres.

1. **Postgres**

   ```bash
   sudo apt install postgresql
   sudo -u postgres createuser -P wheel
   sudo -u postgres createdb -O wheel wheel
   ```

2. **App**

   ```bash
   git clone <this repo> ~/project-wheel && cd ~/project-wheel
   npm ci && npm run build
   cp .env.example .env   # set DATABASE_URL=postgres://wheel:<password>@localhost:5432/wheel
   psql "$(grep DATABASE_URL .env | cut -d= -f2-)" -f Schema.sql
   ```

3. **systemd service** — `/etc/systemd/system/project-wheel.service`:

   ```ini
   [Unit]
   Description=Project Wheel
   After=network.target postgresql.service

   [Service]
   User=lou
   WorkingDirectory=/home/lou/project-wheel
   # use the output of `which node` (nvm installs aren't on systemd's PATH)
   ExecStart=/usr/bin/node --env-file=.env server/index.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable --now project-wheel
   ```

   It listens on `127.0.0.1:3000` only, so the tunnel (behind Cloudflare Access) is the only way in.

4. **Tunnel** — add to the cloudflared ingress rules, above the catch-all:

   ```yaml
   - hostname: wheel.boussaid.me
     service: http://localhost:3000
   ```

   ```bash
   cloudflared tunnel route dns <tunnel-name> wheel.boussaid.me
   sudo systemctl restart cloudflared
   ```

5. **Cloudflare Access** — Zero Trust → Access → Applications → Add → Self-hosted, domain `wheel.boussaid.me`, policy Allow → Include → Emails → your email, login method One-time PIN (same as study hub).

### Updating

```bash
cd ~/project-wheel && git pull && npm ci && npm run build && sudo systemctl restart project-wheel
```
