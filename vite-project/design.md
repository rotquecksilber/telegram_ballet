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
- Display: **Fraunces**, weight 600 (semibold), roman only — headings, lesson
  names, big numbers (time, counts, stats). Tight tracking (-0.01em to -0.02em).
  No italic on headings — italic is an AI tell on headers; if ever used, only
  inside running body copy.
- Body: **IBM Plex Sans**, weight 400/600 — all UI text: buttons, labels,
  list rows, hints. Replaces the system-ui stack everywhere.
- No third/outlier face. Fraunces carries numerals too (tabular-nums) instead
  of a separate mono face — keeps the pairing to two families, per the 2+1 rule.
- Weight contrast: body 400, headings 600/700 — never both at the same weight.

## Colour
Semantic accent set is functional, not decorative — do not restyle per page:
- `--color-accent` (blue) — primary actions, links, active state
- `--color-success` (green) — attended, confirmed
- `--color-danger` (red) — cancelled, destructive
- `--color-warning` (orange) — expiring, needs attention
- `--color-purple` — advanced level tag, popularity rank
- `--color-accent-deep` — solid hero surfaces (e.g. subscription card), never gradient

Paper/ink come from `--tg-theme-*` (Telegram's own theme). No page invents its
own surface colour. Card separation uses `--color-card-edge` (adapts to the
active Telegram theme) — never relies on bg-vs-secondary-bg contrast alone.

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
