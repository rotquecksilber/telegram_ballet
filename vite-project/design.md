# Design — Ballet Studio Mini App

Locked design system for this Telegram Mini App. Every page redesign reads this
file before touching CSS. Extend it here first; don't invent per-page.

## Genre
editorial (balletic — grace over decoration; type carries the identity, not chrome)

## Context constraint
This is a Telegram Mini App, not a marketing site. No nav/footer/hero
macrostructures apply — every screen is a functional list/form UI. Telegram
supplies the paper/ink layer via `--tg-theme-*` (adapts to the user's own
light/dark theme automatically) — this system does **not** override those;
it only adds what Telegram doesn't: typography, semantic accents, spacing,
card edges.

## Typography
- Display: **Cormorant Garamond**, weight 600, roman only — headings, lesson
  names, big numbers (time, counts, stats). No italic on headings — italic is
  an AI tell on headers; if ever used, only inside running body copy.
- Body: **EB Garamond**, weight 400/600 — all UI text: buttons, labels,
  list rows, hints. Replaces the system-ui stack everywhere.
- Both classical serifs, one register — deliberate, not a serif+sans/serif+mono
  contrast pairing. No third/outlier face; Cormorant carries numerals too
  (tabular-nums) instead of a separate mono face.
- Weight contrast: body 400, headings 600/700 — never both at the same weight.
- (Superseded pick: Fraunces + IBM Plex Sans — read as "chujerodno"/artisan-café,
  not balletic. Replaced.)

## Colour
Fixed brand palette — **no longer derived from Telegram's `--tg-theme-*`
variables**. Every user sees the same app regardless of their Telegram theme
(including wild third-party ones). Light and dark variants ship as our own
tokens, switching on the device's `prefers-color-scheme`, not Telegram's
theme picker:
- `--color-paper` / `--color-paper-2` — warm ivory (light) / warm charcoal
  (dark) surfaces, same hue anchor as the accent.
- `--color-ink` / `--color-hint` — text, tinted toward the anchor hue per
  color.md (never pure black/white).
- `--color-card-edge` — always-visible card border, independent of paper vs
  paper-2 contrast.

Semantic accent set is functional, not decorative — do not restyle per page:
- `--color-accent` (blue) — primary actions, links, active state
- `--color-success` (green) — attended, confirmed
- `--color-danger` (red) — cancelled, destructive
- `--color-warning` (orange) — expiring, needs attention
- `--color-purple` — advanced level tag, popularity rank
- `--color-accent-deep` — solid hero surfaces (e.g. subscription card), never gradient

## Spacing / radius / motion
4pt scale (`--space-*`), radius scale (`--radius-sm/md/lg/pill`), two eases
(`--ease-out`, plus native `:active` scale-down) — all in `tokens.css`.
`prefers-reduced-motion` supported globally.

## Card voice
Hairline border (`--color-card-edge`) + soft shadow. **No side-stripe
borders** (thick coloured left edge) — status reads through background tint,
badge colour, or a pill, never an asymmetric coloured edge.

## Per-screen notes
- **Schedule** — list of lesson cards. Time in Fraunces (tabular), class name
  in Fraunces 600, everything else IBM Plex Sans.
- **Profile** — subscription card is the one "hero" surface (solid
  `--color-accent-deep`, no gradient); booking history list reuses the same
  card voice as Schedule.
- **Admin** — same type system; functional density wins over decoration
  (forms, tables, lists) — no enrichment.

## What every page MUST share
- Fraunces + IBM Plex Sans, nowhere else.
- The five semantic accent tokens, unchanged in hue.
- `--color-card-edge` on every card-like container.
- No gradients except `--fill-*` same-hue tints and the gold donate button
  (kept — thematic, not decorative-default).

## Stamp
`/* Hallmark · genre: editorial · design-system: design.md · designed-as-app */`
at the top of every stylesheet this system governs.
