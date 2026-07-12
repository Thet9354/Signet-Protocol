# Signet design system

One place defines color, type, spacing, radius, shadow, and motion:
[`app/globals.css`](app/globals.css). Components never hardcode a hex, radius,
or shadow — they reference tokens. This is how every screen looks like it
belongs to the same product.

## The idea

A **signet** is a seal pressed into wax to authorize a document — exactly what
a 2-of-3 release is. The whole look comes from that: warm graphite (unlit
metal), parchment ink, and **burnished brass** for anything that acts or
demands attention. Aged-bronze **verdigris** marks things that have settled;
**rust** marks disputes. No purple, no blue gradient, no fake glow.

## Tokens (defined in `@theme`)

| Group | Tokens | Use |
|---|---|---|
| Surfaces | `canvas` `card` `card2` `line` `line2` | `bg-canvas`, `bg-card`, `border-line` |
| Ink | `ink` `ink2` `ink3` | `text-ink` (primary), `text-ink2` (muted), `text-ink3` (faint) |
| Accent | `brass` `brass2` `brassink` | actions, focus, attention |
| Status | `moss` `rust` `slate` | success · dispute · neutral |
| Radius | `--radius-sm…xl` | `rounded-[var(--radius-lg)]` |
| Shadow | `--shadow-card` `--shadow-pop` `--shadow-brass` | real depth: top hairline highlight + soft drop |

Change a brand color in exactly one place (the `@theme` block) and it
propagates everywhere.

## Reusable classes — don't restyle, reuse

**Type** — `t-display` (hero), `t-h1` `t-h2` (headings), `t-lede` (intro),
`t-label` (uppercase section label), `t-mono` (hashes/addresses), `nums`
(tabular figures on any number).

**Buttons** — `btn` + one of `btn-primary` `btn-secondary` `btn-ghost`
`btn-success` `btn-danger`, optionally `btn-sm`. They carry hover, active,
disabled, and focus states already.

**Surfaces** — `card` (raised panel), `card-inset` (recessed sub-panel),
`card-link` (adds hover lift for rows that navigate).

**Fields** — `field` on any `input`/`textarea`/`select`. Includes hover +
brass focus ring.

**Badges** — `badge` + `badge-dot`; colour via inline `style` from a status
token (see `components/StateBadge.tsx` for the one mapping every screen reuses).

**Detail** — `label-tick` adds the brass hairline before a section label.

## Motion

- `<Reveal delay={n}>` (`components/Reveal.tsx`) — content settles up + in once
  on scroll; `delay` staggers siblings. Honors `prefers-reduced-motion`.
- `pulse-dot` — the breathing dot on "in review" / pending badges.
- `shimmer` — loading skeleton (`<Skeleton/>` in `components/ui.tsx`).
- `card-link` hover lift, `.btn` press, brass focus ring — all automatic.

## Adding a screen

1. Wrap sections in `<Reveal>` for the entrance.
2. Titles use `t-label` + `t-h1`; panels use `card`; numbers get `nums`,
   addresses/hashes get `t-mono`.
3. Every fetch gets three states: `<Skeleton/>` while loading, a `card`
   empty-state with a `<Seal/>` when there's nothing, and a rust-bordered
   `card-inset` on error.
4. Never add a new hex — if you need a colour, it's already a token.
