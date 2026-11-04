# Project Wheel design

The same warm minimal theme as Acorn (study hub), fitted to this app: warm stone neutrals, one marigold accent, thin borders instead of shadows, rounded shapes, strong type hierarchy.

**Every value lives in `src/tokens.css`.** Dark mode overrides sit under `:root[data-theme="dark"]`. Components in `src/app.css` only reference tokens, and the wheel reads them at draw time with `token()`.

A few values can't reference tokens, and need updating by hand if the tokens change:
- `index.html` and `public/manifest.webmanifest`: the page background, because the browser reads them before any CSS loads.
- `public/favicon.svg`: the logo colours, because the SVG is also used as a standalone file. The icons in `public/icons/` are PNGs rendered once from it; redo them if the SVG changes.

## Colour

Role | Token | Light | Dark
---|---|---|---
Background | `--bg` | #f6f5f2 | #121211
Surface | `--surface` | #ffffff | #1b1a18
Sunken | `--sunken` | #efede8 | #0e0e0d
Hover | `--hover` | #f2f0ec | #23221f
Border | `--line` | #e4e1da | #2c2a27
Strong border | `--line-strong` | #cdc9c0 | #3d3a35
Text | `--ink` | #1c1b19 | #f1efea
Muted text | `--muted` | #6b675f | #a39f96
Accent fill | `--accent-fill` | #f2a922 | #f5b13a
Accent fill hover | `--accent-fill-hover` | #e39912 | #f8c160
Text on accent | `--on-accent` | #2a1d04 | #2a1d04
Accent as text | `--accent` | #8a5a00 | #f5b13a
Soft accent | `--accent-soft` | #fdf0d5 | #33270f
Positive | `--ok` | #1d8049 | #4cbd78
Negative | `--hi` | #c2413a | #ec6b61
Hard difficulty | `--hard` | #b4541a | #f08a4b
Wheel slices | `--slice-1` to `--slice-4` | #f5c56a, #e9a88e, #a9d0a6, #d3c7b5 | same

**The accent has two forms.** `--accent-fill` with `--on-accent` is for buttons and the wheel's centre. `--accent` is the readable form for text and strokes; the bright fill fails contrast as text on a light background.

## Decisions for this app

**Colours beyond the accent.**
- Wheel slices need to be told apart, so they get four warm colours with dark text on all of them. They appear nowhere else. If the last slice would match the first, it takes a different colour.
- Difficulty runs green, marigold, orange, red, because that order means easy to hard. Status: "doing" is marigold and "completed" is green. "idea" and "no content" are neutral, since nothing is happening there.
- Categories, dev type and other labels are neutral, because they don't carry meaning that colour should add to.
- Small coloured badge text is mixed 15% toward `--ink`. The raw colours on their own tint came out around 4.2:1; mixed, they are at least 5:1 in both themes.

**Layout.**
- Desktop keeps a sidebar on every screen (15rem), because the filters live there and you change them while looking at the wheel or the list.
- Phones get four bottom tabs (wheel, projects, categories, theme). Filters move behind a button because seven-plus options per group would push the wheel off the screen.
- Popups (add, edit, filters, categories, result) stay focused: no navigation, and on phones they rise from the bottom like a sheet, within thumb reach.
- The projects list is capped at 72rem and not the 46rem used for study hub's reading pages, because it's a grid of cards.

**Fonts.** Inter for body and UI, Nunito 800 for titles and the wordmark, both stored in `public/fonts/` so they work offline. No monospace: the app shows no code or aligned data. All numbers use tabular figures.

**Earlier design choices.** The arcade look (pixel fonts, neon green, square corners, glow, scanlines, magenta pointer) conflicted with the theme on every point, so it's gone. What carried over:
- The lowercase wording ("spin the wheel", "no projects match"), now also on titles and buttons, which were uppercase only for the arcade look.
- The wheel as the main feature.
- The coloured left border on cards is gone: difficulty already shows as a badge, and the border was a second accent on every card.

**Logo.** A marigold wheel with dark brown spokes and pointer, so logo and accent are one thing. App icons sit on the soft accent background; the maskable icon keeps the logo inside the centre 66%.

**Theme.** Follows the system until you choose with the theme button, then remembers your choice on that device. `index.html` sets it before first paint so the page never flashes the wrong theme.

## Shape, depth, motion

- Radius: 8, 12, 18, 24px and pill. Cards and popups 24px, inputs 12px, buttons and badges pill.
- Cards: surface, 1px border, 20px padding, no shadow. Nothing nested gets its own card: badges are sunken with no border, and category rows are separated by a 1px line.
- Only popups, the one floating layer, get `--shadow`.
- 120ms transitions. Hover styles only inside `@media (hover: hover)`. Real `:active` states: buttons scale to .97.
- Icons: Lucide at 20px with 1.75 stroke, pasted into `App.jsx`. No emoji as icons.
- Controls are 44px on phones, 36–40px on desktop. Inputs are 16px on phones so iPhones don't zoom in.
