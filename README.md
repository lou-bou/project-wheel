# Project Wheel

A personal tool for managing a backlog of project ideas and spinning a wheel to pick what to build next. Filter by category, difficulty, dev type, status or content before spinning, track status (idea → doing → completed), and browse the full list.

Live at **https://wheel.boussaid.me**, self-hosted on the ThinkPad home server.

## How it fits together

```
browser ──► Cloudflare Access (email one-time PIN)
        ──► Cloudflare Tunnel (cloudflared on the ThinkPad)
        ──► Node server on 127.0.0.1:3000  (server/index.js)
              ├── /api/*  → Postgres database "wheel"
              └── everything else → the built React app in dist/
```

- **Frontend:** React + Vite (`src/App.jsx`). Built into `dist/` with `npm run build`.
- **Backend:** one small Express file (`server/index.js`) that serves both the API and the built frontend.
- **Database:** Postgres on the same laptop. Tables are defined in `Schema.sql`.
- **Login:** handled entirely by Cloudflare Access in front of the site. The app itself has no accounts or auth, and the server only listens on localhost, so the tunnel is the only way in.

Previously ran on Vercel + Supabase; moved to the home server in October 2026.

## Project layout

| Path | What it is |
|---|---|
| `src/App.jsx` | The whole frontend |
| `src/tokens.css` | Every colour, font and radius, with dark mode overrides (see `DESIGN.md`) |
| `src/app.css` | Component styles, including the phone layout (`max-width: 700px`) |
| `src/offline.js` | API calls, the saved copy of the data, and the device queue |
| `src/sw.template.js` | Service worker; `vite.config.js` turns it into `dist/sw.js` on build |
| `public/icons/` | App icons, rendered once from `public/favicon.svg` and committed |
| `public/fonts/` | Inter and Nunito, stored here so they work offline |
| `DESIGN.md` | The theme and the reasons behind its decisions |
| `server/index.js` | API + static file server |
| `Schema.sql` | Database tables; run once on a fresh database |
| `scripts/import-from-supabase.sh` | One-time copy of data from the old Supabase project (already done) |
| `.env.example` | Template for `.env` (holds `DATABASE_URL`; never committed) |

### API

All requests and responses are JSON.

| Method | Path | Does |
|---|---|---|
| GET | `/api/data` | All projects (each with `categoryIds`) and all categories |
| POST | `/api/projects` | Create a project (fields + optional `categoryIds`) |
| PATCH | `/api/projects/:id` | Update any fields; if `categoryIds` is sent, replaces the project's categories |
| DELETE | `/api/projects/:id` | Delete a project |
| POST | `/api/categories` | Create a category (`{ name }`) |
| PATCH | `/api/categories/:id` | Rename a category |
| DELETE | `/api/categories/:id` | Delete a category (projects stay, the link is removed) |

## Phone app and offline

The site can be installed from the browser (Add to Home Screen) and has a phone layout under 700px wide.

- **Viewing and spinning** work offline from a copy of the data saved on the device.
- **Project changes** (add, edit, status, delete) go into a queue on the device and are shown as "saved on this device" until the server confirms them. They're sent on load, when the connection returns and every 30 seconds. If two devices edit the same field, the last one sent wins.
- **Category changes** need a connection, because queued projects can point at categories.
- The service worker never caches `/api`. The laptop being down counts as offline, because Cloudflare answers with a 5xx page.

## Working on it locally

You need Node 22+ and a Postgres database you can connect to.

```bash
npm install
cp .env.example .env        # then edit DATABASE_URL to point at your local database
psql "postgres://..." -f Schema.sql
```

Run these in two terminals:

```bash
npm run dev:api   # API on http://localhost:3000, restarts on changes
npm run dev       # Vite dev server; forwards /api to port 3000
```

When you're happy, commit and push to `main`, then deploy (see [Updating the live site](#updating-the-live-site)).

## Updating the live site

On the ThinkPad:

```bash
cd ~/project-wheel && git pull && npm ci && npm run build && sudo systemctl restart project-wheel
```

Always make changes on your own computer and push them. Don't edit files or run `npm audit fix` on the server, or the next `git pull` will conflict.

## Server setup from scratch (ThinkPad, Debian)

This is how the server was set up. You only need it again if the laptop is rebuilt.

### 1. Node 22 (via nvm)

Debian's own Node is too old. Install nvm, reopen the SSH session, then:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22
node -v   # should show v22.x
```

### 2. Postgres

```bash
sudo apt install postgresql
sudo -u postgres createuser -P wheel     # asks for a password: letters and numbers only
sudo -u postgres createdb -O wheel wheel
```

Postgres only accepts connections from the laptop itself, so the database isn't reachable from the network.

### 3. The app

```bash
git clone git@github.com:lou-bou/project-wheel.git ~/project-wheel
cd ~/project-wheel
npm ci && npm run build
cp .env.example .env
nano .env    # DATABASE_URL=postgres://wheel:<password>@localhost:5432/wheel
psql "postgres://wheel:<password>@localhost:5432/wheel" -f Schema.sql
```

### 4. Keep it running (systemd)

Find the Node path with `which node`, then create `/etc/systemd/system/project-wheel.service`:

```ini
[Unit]
Description=Project Wheel
After=network.target postgresql.service

[Service]
User=lou
WorkingDirectory=/home/lou/project-wheel
ExecStart=/home/lou/.nvm/versions/node/<version>/bin/node --env-file=.env server/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now project-wheel
curl localhost:3000/api/data   # should print your projects
```

### 5. Tunnel

The tunnel is configured in `/etc/cloudflared/config.yml` (shared with ssh and study hub). Add the wheel entry **above** the final `http_status:404` line:

```yaml
ingress:
  - hostname: ssh.boussaid.me
    service: ssh://localhost:22
  - hostname: study.boussaid.me
    service: http://localhost:8088
  - hostname: wheel.boussaid.me
    service: http://localhost:3000
  - service: http_status:404
```

```bash
cloudflared tunnel route dns <tunnel-id> wheel.boussaid.me   # tunnel id is the "tunnel:" line in config.yml
sudo systemctl restart cloudflared
```

### 6. Cloudflare Access (login)

Cloudflare dashboard → Zero Trust → Access → Applications → Add an application → Self-hosted:

- Domain: `wheel.boussaid.me`
- Policy: Allow → Include → Emails → your email
- Login method: One-time PIN

Check it in a private browser window: it should ask for your email before showing the app. **Don't skip this**, because without it anyone can edit the list.

## Backups

A cron job on the ThinkPad (`crontab -e`) backs up the database every night at 3am and uploads it to Google Drive with rclone (remote `gdrive:`):

```
0 3 * * * pg_dump "postgres://wheel:<password>@localhost:5432/wheel" > /home/lou/wheel-backup.sql && rclone copyto /home/lou/wheel-backup.sql gdrive:project-wheel-backup/wheel-$(date +\%d).sql
```

Files are named by day of the month (`wheel-01.sql` … `wheel-31.sql`), so Drive keeps about 30 days of backups and each file is overwritten a month later. The study hub backup uses the same pattern in `gdrive:study-hub-backup/`.

**Restoring a backup** (this replaces everything currently in the database):

```bash
rclone copyto gdrive:project-wheel-backup/wheel-15.sql ~/restore.sql
sudo systemctl stop project-wheel
sudo -u postgres dropdb wheel && sudo -u postgres createdb -O wheel wheel
psql "postgres://wheel:<password>@localhost:5432/wheel" -f ~/restore.sql
sudo systemctl start project-wheel
```

## When something's wrong

| Problem | Check |
|---|---|
| Site doesn't load | `systemctl status project-wheel` and `systemctl status cloudflared`; both should be "active (running)" |
| App crashes or errors | `journalctl -u project-wheel -n 50` shows the app's recent logs |
| Works on the laptop but not online | `curl localhost:3000/api/data` on the ThinkPad. If that works, the problem is the tunnel config or DNS |
| Broke after upgrading Node with nvm | Update the version in `ExecStart` in the service file, then `sudo systemctl daemon-reload && sudo systemctl restart project-wheel` |
| Changed the database password | Update `.env` and the backup cron line, then `sudo systemctl restart project-wheel` |
