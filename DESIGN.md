# Whirl — design spec

Hand-off spec for building the Whirl UI. Read this fully before touching styles.
Stack: React + Express + Postgres, installable PWA, works offline. Single user (just me).

## 1. Identity

- **Name:** Whirl. Always capitalised "Whirl" in UI text, `whirl` in code/package names.
- **What it is:** a backlog of project ideas + a wheel that picks what to build next.
- **Personality:** "arcade workshop". Playful at the moment of the spin, calm and fast everywhere else.
  Think a tidy workbench with one slot machine on it.
- **Rule of one indulgence:** the spin is the only theatrical moment. Lists, forms and filters are flat,
  dense and quick. No confetti on every save, no bouncing cards.

## 2. Files in this kit

| File | Use |
|---|---|
| `tokens.css` | All colors, fonts, spacing, radii, motion. Import once at the app root. **Never hard-code a hex value in components** — add a token if one is missing. |
| `logo/whirl-mark.svg` | Logo mark for light backgrounds (dark pointer + hub). |
| `logo/whirl-mark-on-dark.svg` | Logo mark for dark backgrounds (cream pointer + hub). Default for the app header since dark is default. |
| `icons/favicon.svg` | Browser tab favicon (rounded tile). |
| `icons/whirl-icon.svg` | Full-bleed square, maskable-safe. Source for PWA icons. |
| `icons/*.png` | Pre-rendered: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), `favicon-32.png`. |

**Wordmark:** there is no wordmark file. Render it as live text: mark + "Whirl" in `--font-display`,
weight 700, `letter-spacing: -0.02em`, mark height = 1.2× cap height, gap `--space-2`.

## 3. Color

Dark theme is the default. Light theme follows the OS or a manual toggle (`data-theme` on `<html>`).

**Brand trio = status system.** This is the core idea — the logo's three colors are the three statuses:

| Status | Token | Hex | Icon (Tabler / Lucide) |
|---|---|---|---|
| Idea | `--status-idea` | #F5B82E amber | `bulb` |
| Doing | `--status-doing` | #F2613F coral | `hammer` |
| Completed | `--status-completed` | #2BB3A3 teal | `circle-check` |

- Text on any status fill is always `--status-on-color` (ink #1F2430). Never white on amber.
- Status must never be color-only: always pair the color with the icon or the word.
- **Coral is also the primary action color** (the Spin button, "Start building"). Don't use coral for errors —
  errors use `--danger`, which is a different red and always comes with an icon + message.

**Neutrals:** `--bg` (page), `--surface` (cards, sheets), `--surface-2` (inputs, chips, hovered rows),
`--border` (1px hairlines), `--text`, `--text-muted`.

Proportions: ~85% neutrals, ~10% one status color per card, ~5% coral CTA. If a screen looks like a
fruit salad, there is too much color.

## 4. Typography

Self-host all fonts (woff2 in `/public/fonts`, or `@fontsource/*` packages) — **no Google Fonts CDN**,
the app must work offline.

| Role | Font | Weight | Size token |
|---|---|---|---|
| App title, screen titles, spin result | Bricolage Grotesque | 700 | `--text-xl` / `--text-2xl` |
| Card titles | Bricolage Grotesque | 600 | `--text-lg` |
| Body, forms, filters | DM Sans | 400 / 500 | `--text-md`, `--text-sm` |
| Counts, dates, IDs | JetBrains Mono | 400 | `--text-xs` / `--text-sm` |

Sentence case everywhere ("New idea", not "New Idea"). No all-caps except tiny mono labels if needed.

## 5. Space, shape, elevation

- 4px grid via `--space-*`. Card padding `--space-4` (mobile) / `--space-5` (desktop).
- Radii are chunky: buttons + inputs `--radius-sm`, cards `--radius-md`, sheets/modals `--radius-lg`,
  chips `--radius-pill`.
- No drop shadows in dark mode; separate layers with `--surface` vs `--surface-2` and `--border`.
  In light mode, one soft shadow allowed on floating elements only (sheet, menu):
  `0 8px 24px rgb(31 36 48 / 0.12)`.

## 6. Layout & screens

Mobile-first; main target is the installed PWA on a phone. Desktop gets a two-pane layout ≥ 900px.

1. **Backlog (home)** — search bar on top, filter chips row (horizontally scrollable on mobile),
   then the idea list. Floating coral **Spin** button bottom-right (mobile) / in the header (desktop).
   Bottom nav on mobile: Backlog · Wheel · Board · Settings.
2. **Wheel** — the wheel fills ~70% of viewport width (max 520px), centered. Under it: "Spinning from N ideas"
   + the active filters as removable chips, so it's obvious what the pool is.
3. **Spin result** — a sheet that rises after the wheel stops: project title in `--text-2xl`, category,
   difficulty, dev type, then two buttons: **Start building** (coral, sets status → Doing) and **Spin again** (ghost).
4. **Board** — three columns Idea / Doing / Completed with the status color as a 4px top border on each
   column header. On mobile: a segmented control switches columns instead of horizontal scroll.
5. **Idea detail / edit** — full-screen sheet on mobile, right pane on desktop. Fields: title, description
   (markdown), category, difficulty, dev type, status, links, notes.

### Idea card

```
┌─────────────────────────────────────┐
│▌ Title of the idea          ● Doing │  ← 4px left bar + status pill in status color
│▌ One-line description, muted…       │
│▌ [web] [backend]  ●●○  updated 3d   │  ← category chips, difficulty dots, mono date
└─────────────────────────────────────┘
```

- Left bar 4px in status color. Status pill = status fill + ink text + icon.
- Difficulty: 3 dots, filled count = level (1 easy, 2 medium, 3 hard), in `--text-muted` / `--text`.
- Category & dev-type chips: neutral (`--surface-2` fill, `--text-muted` text). Only status gets color.
- Whole card is the tap target; min height 72px.

### Filters

- Chips for category, difficulty, dev type, status; free-text search over title + description.
- Active chip: `--text` fill with `--bg` text (inverted). Inactive: `--surface-2`.
- "Clear all" text button appears only when ≥1 filter is active.

## 7. The wheel (the hero)

- Draw it in SVG. Segments cycle `--wheel-1/2/3` (amber, coral, teal) in order; with only 1–2 ideas,
  still split into at least 6 visual segments by repeating them.
- Segment labels: idea titles, ink text, truncated with ellipsis to fit; hide labels when > 16 segments
  and show only colors (the result sheet names the pick).
- Pointer at 12 o'clock, ink in light theme / cream in dark (same as the logo variants). Hub circle in the center.
- **Spin physics:** pick the winner first (uniform random over the filtered pool), then animate to land on it:
  rotate by 5–7 full turns + target angle, `--spin-duration` with `--spin-ease`. Small random offset
  within the segment so it doesn't always land dead-center.
- A subtle tick (optional `navigator.vibrate(5)`) each time a segment boundary passes the pointer; off by default.
- **Reduced motion:** if `prefers-reduced-motion: reduce`, skip rotation — fade the wheel, highlight the
  winning segment, open the result sheet immediately.
- Empty pool: wheel renders as a single `--surface-2` disc with "No ideas match these filters" and a
  "Clear filters" button. Never spin on an empty pool.

## 8. Motion

- Default transitions: `--dur-fast` for hover/press, `--dur-med` for sheets/route changes, `--ease-out`.
- Press feedback: `transform: scale(0.97)` on buttons.
- Status change: the card's left bar cross-fades to the new color (`--dur-med`). That's it.
- Completing a project is the one allowed celebration: a short teal burst on the card (≤ 600ms), skipped
  under reduced motion.

## 9. PWA & offline

- `manifest.webmanifest`:
  ```json
  {
    "name": "Whirl",
    "short_name": "Whirl",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#17191F",
    "theme_color": "#1F2430",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
      { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
  }
  ```
- `<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">` + `favicon-32.png` fallback +
  `apple-touch-icon.png`.
- `<meta name="theme-color">` should follow the active theme (`#1F2430` dark, `#FBF7F0` light).
- Offline state: a small pill in the header "Offline · changes will sync" in `--text-muted`. Don't block the UI.

## 10. Accessibility

- Body text contrast ≥ 4.5:1 in both themes (tokens are chosen for this — don't lighten `--text-muted`).
- Visible focus ring everywhere: `outline: 2px solid var(--focus); outline-offset: 2px`.
- Tap targets ≥ 44×44px.
- The wheel is `role="img"` with an `aria-label` ("Wheel with 12 ideas"); the result is announced via an
  `aria-live="polite"` region.

## 11. Don'ts

- No gradients, glassmorphism, neon glow or emoji in UI chrome.
- Don't introduce new accent colors. Categories are neutral chips, not a rainbow.
- Don't use the brand trio for anything that isn't status, the wheel, or the coral CTA.
- Don't put the logo pointer/hub in ink on a dark background (use the `on-dark` variant).

## 12. Decisions where the spec had gaps

Everything above is the brand kit's spec, unchanged. These are the choices made to fit it to the real app.

**Names.** The UI, package and code say Whirl or `whirl`. The repo folder, the `project-wheel` service and `wheel.boussaid.me` kept the old name, because renaming them means changing the server setup. Devices that used the old version keep their waiting changes, and old caches are deleted.

**Difficulty has four dots, not three.** The database has Easy, Medium, Hard and Expert, and existing ideas use all four, so dropping one would change your data.

**Content stays.** "Content made" isn't in the spec but it's a field you added on purpose. It's a neutral chip on the card, a filter group and a field in the detail screen.

**The wheel spins ideas.** By default the pool is ideas with status Idea, so "Spinning from N ideas" is true and "Start building" never reopens finished work. Choosing a status filter overrides this. Search narrows the Backlog only, since it isn't visible on the Wheel screen.

**Wheel size.** 75% of viewport width on phones rather than ~70%, so labels stay readable. On short screens it also shrinks to leave room for the controls.

**Wheel colours.** Slices cycle amber, coral, teal. If that would put two matching slices side by side where the circle closes, the last slice takes coral.

**Added to reach the whole spec.**
- *New idea:* a neutral button next to search, because coral is kept for Spin and Start building.
- *Moving ideas on the Board:* each card has one ghost button for the next step (Start building, Mark completed, Back to ideas). No drag and drop, because it's unreliable on phones and would need a library.
- *Filters on the Wheel screen:* a Filters button opens a sheet, since the chip row lives on the Backlog.
- *Settings:* theme (System, Light, Dark), the optional spin tick where the device supports vibration, and category management.
- *Desktop navigation:* in the header, next to the Spin button.
- *Result sheet:* also shows up to three lines of the description.

**Fields.**
- *Links:* one per line, stored in the existing `link` column, and no longer only available on completed ideas. Only `http`, `https` and `mailto` links become clickable.
- *Notes:* a new `notes` column. The server adds it when it starts, so no manual SQL is needed.
- *Description:* markdown with a Write and Preview switch, using a small renderer built into the app. Cards show it as one plain line.
- *Delete:* moved into the detail screen, since the whole card is now the tap target.

**Offline.** The header pill covers being offline. "Saved on this device" stays on cards with unsent changes, and an expired login gets a banner with a Sign in button.

**Tokens.** `src/tokens.css` is the kit's file, with an "App additions" block at the end for what it didn't cover: `--pointer`, `--scrim`, `--shadow-float`, `--nav-height` and `--tap`. The logo in the app is drawn inline using tokens, so it switches between the light and dark variants by itself.

**Exception to the shadow rule.** None in dark mode, and one soft shadow in light mode, used on sheets and the floating Spin button.
