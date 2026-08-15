# Design — Ballet Studio Mini App

Locked design system for this Telegram Mini App. Every page redesign reads this
file before touching CSS. Extend it here first; don't invent per-page.

## Genre
modern-minimal (Stripe/Linear/Vercel school). Serif/editorial was tried and
rejected twice — read as dated ("из нулевых") regardless of which serif or
palette. One grotesk sans, tight neutral surfaces, no ornament.

## Context constraint
This is a Telegram Mini App, not a marketing site. No nav/footer/hero
macrostructures apply — every screen is a functional list/form UI.

## Typography
- **Geist**, one family, weight only for contrast (400 body / 600–700
  headings). Not a display+body pairing — a single modern grotesk is the
  deliberate choice for this genre (typography.md's single-font allowance).
- No italic anywhere (was used once as a body accent in "Мои записи" —
  removed, didn't fit the sans register).
- Tabular numerals on time/counts/stats via `font-variant-numeric: tabular-nums`.
- (Rejected picks, in order: Fraunces + IBM Plex Sans → artisan-café.
  Cormorant Garamond + EB Garamond → high-contrast hairlines read as
  visually "tense". Newsreader + EB Garamond → whole serif direction read
  as dated regardless of which serif. Settled on Geist.)

## Colour
Fixed brand palette — **not derived from Telegram's `--tg-theme-*`
variables**. Every user sees the same app regardless of their Telegram theme.
**Light only, deliberately — no dark variant.**
- `--color-paper` — plain white.
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
4pt scale (`--space-*`). Radius scale tightened from the original bubbly
18–24px cards to 6/10/14px (`--radius-sm/md/lg`) — smaller radii read as
current, large ones read dated the same way the serif did. Two eases
(`--ease-out`, plus native `:active` scale-down). `prefers-reduced-motion`
supported globally.

## Card voice — no borders
Cards separate from their background via **contrast + soft shadow only, no
outline**. (An earlier pass added a `--color-card-edge` border to every card
as a workaround for Telegram's per-user theme sometimes giving zero contrast
between surfaces. Once the palette became fixed and self-controlled, that
workaround was removed — it read as over-outlined, "заигрался с обводкой".)
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
- Geist, nowhere else.
- The six semantic accent tokens, unchanged in hue.
- Paper/paper-2 alternation for card separation — never a border.
- No gradients except `--fill-*` same-hue tints and the gold donate button
  (kept — thematic, not decorative-default).

## Stamp
`/* Hallmark · genre: modern-minimal · design-system: design.md · designed-as-app */`
at the top of every stylesheet this system governs.
