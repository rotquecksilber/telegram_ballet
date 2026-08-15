# Design — Ballet Studio Mini App

Locked design system for this Telegram Mini App. Every page redesign reads this
file before touching CSS. Extend it here first; don't invent per-page.

## Genre
editorial (balletic — grace over decoration; type carries the identity, not chrome)
Tone: calm, quiet, uncluttered. No visual "tension" — low-contrast type, soft
shadows over hard outlines, plain white over tinted surfaces.

## Context constraint
This is a Telegram Mini App, not a marketing site. No nav/footer/hero
macrostructures apply — every screen is a functional list/form UI.

## Typography
- Display: **Newsreader**, weight 600, roman only — headings, lesson names,
  big numbers (time, counts, stats). No italic on headings — italic is an
  AI tell on headers; if ever used, only inside running body copy.
- Body: **EB Garamond**, weight 400/600 — all UI text: buttons, labels,
  list rows, hints.
- Both calm reading serifs, one register, low contrast — deliberately avoids
  a "designed-tension" feel. No third/outlier face; Newsreader carries
  numerals too (tabular-nums) instead of a separate mono face.
- Weight contrast: body 400, headings 600/700 — never both at the same weight.
- (Superseded picks, in order: Fraunces + IBM Plex Sans → read as
  artisan-café, not balletic. Cormorant Garamond + EB Garamond → Cormorant's
  high-contrast hairlines read as visually "tense". Settled on Newsreader.)

## Colour
Fixed brand palette — **not derived from Telegram's `--tg-theme-*`
variables**. Every user sees the same app regardless of their Telegram theme.
**Light only, deliberately — no dark variant.**
- `--color-paper` — plain white (not tinted).
- `--color-paper-2` — light neutral grey, used for page/container backgrounds
  and for a card-within-a-card (e.g. admin-item-card on admin-card, stat-card
  on admin-card) so it separates from its white parent without a border.
- `--color-ink` / `--color-hint` — text.

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

## Card voice — no borders
Cards separate from their background via **contrast + soft shadow only, no
outline**. (An earlier pass added a `--color-card-edge` border to every card
as a workaround for Telegram's per-user theme sometimes giving zero contrast
between surfaces. Once the palette became fixed and self-controlled, that
workaround was removed — it read as "заигрался с обводкой", over-outlined.)
Pattern: page/container background is `--color-paper-2`, the card itself is
`--color-paper` (white) — or the reverse nesting (white parent, grey child)
— never same-on-same with no separation.
**No side-stripe borders** either (thick coloured left edge) — status reads
through background tint, badge colour, or a pill.

## Per-screen notes
- **Schedule** — `.schedule-container` (grey) holds white `.lesson-card`s.
- **Profile** — subscription card is the one "hero" surface (solid
  `--color-accent-deep`, no gradient); "Мои записи" is one white card per
  week, no separate-colour header band.
- **Admin** — `.admin-container` (grey) holds white `.admin-card` sections;
  inside those, list rows/stat tiles go grey again for the next contrast step.

## What every page MUST share
- Newsreader + EB Garamond, nowhere else.
- The six semantic accent tokens, unchanged in hue.
- Paper/paper-2 alternation for card separation — never a border.
- No gradients except `--fill-*` same-hue tints and the gold donate button
  (kept — thematic, not decorative-default).

## Stamp
`/* Hallmark · genre: editorial · design-system: design.md · designed-as-app */`
at the top of every stylesheet this system governs.
