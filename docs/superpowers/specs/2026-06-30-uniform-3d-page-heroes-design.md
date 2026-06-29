# Uniform 3D page heroes

**Date:** 2026-06-30
**Status:** Design — awaiting review

## Goal

Give the four secondary pages (About, Projects, Bookshelf, Open Source) a hero that
matches the home page's treatment: a **two-column layout** with copy on the left and a
**decorative 3D object** on the right. The *frame* is uniform across all pages; the 3D
*object* is themed per page. The home page hero is intentionally left structurally
unchanged (it already works), but its headline copy is updated.

## Decisions (locked during brainstorming)

1. **Strategy B — shared frame, motif per page.** Same layout, lighting, glow, and
   motion language everywhere; each page's 3D object themed to its content.
2. **Home is not restructured.** It keeps its existing `HeroVisual` (the PC + live
   terminal). Only its *headline + deck copy* change.
3. **New home headline (#1):** "Engineering software, and rethinking how it's built in
   **the age of AI**." Gradient (`.grad`) moves onto "the age of AI". The deck is
   trimmed so it no longer repeats "first-class citizen".
4. **Two-column layout** for the four secondary heroes (copy left, 3D right), collapsing
   to single column under 860px — same breakpoint as `HeroVisual`.
5. **Per-page motifs:**
   | Page | Motif | What it is |
   |------|-------|------------|
   | About | `constellation` | Small nodes orbiting a central core — breadth of the stack the page lists |
   | Projects | `blocks` | Wireframe cubes locked into a built form — things assembled from parts |
   | Bookshelf | `books` | A few 3D book volumes drifting and turning |
   | Open Source | `graph` | Connected nodes on branching edges — a git/collaboration network |

## Architecture

Two new components, mirroring the existing `src/components` conventions. The home
`HeroVisual` stays as the special case (its canvas-texture terminal is genuinely
bespoke); these new components are the generalized, reusable frame.

### `src/components/MotifHero.astro` — the 3D visual
*Justification: shared three.js scaffolding lives once; each page supplies only a small
geometry. Sibling to the existing `HeroVisual`.*

- **Props:** `motif: "constellation" | "blocks" | "books" | "graph"`.
- **Markup:** `.hero-visual > .visual-glow + canvas[data-hero-canvas][data-motif]` — the
  same shell as `HeroVisual` (so the CSS glow shows with JS off / reduced motion).
- **Client script:** imports `three`, reads `data-motif` from the canvas, and builds the
  matching `THREE.Group` via a `switch` over four small builder functions. Everything
  else is shared and copied from `HeroVisual`'s proven setup: alpha renderer, ambient +
  key (violet) + rim (teal) lights, `ResizeObserver`, pointer parallax (`curX/curY`
  easing), sine-wave float + slow rotate, `IntersectionObserver` pause when offscreen,
  and a single static frame under `prefers-reduced-motion: reduce`.
- **Scene colors** are hex literals chosen to match the design tokens (`--violet`
  `#7b6af0`, `--teal` `#48bea6`, chassis `#1a1a26`), following `HeroVisual`'s existing
  precedent — three.js material colors can't reference CSS custom properties.

### `src/components/PageHero.astro` — the uniform two-column shell
*Justification: single source of truth for the hero layout shared by four pages;
replaces four near-identical hand-rolled hero blocks.*

- **Props:** `eyebrow: string`, `accent?: "violet" | "orange" | "teal"`,
  `motif: <same union as MotifHero>`.
- **Slots:** default slot = title content (pages pass their own markup, e.g.
  `Things I build to<br/><span class="grad">understand them</span>`); named slot `deck`
  = deck paragraph content; optional named slot `lead` = content rendered above the
  Eyebrow in the copy column (used only by About, to keep its profile photo).
- **Renders:** `section.page-hero > .wrap > .page-hero-inner (grid) >`
  - `.page-hero-copy`: `<Eyebrow accent>{eyebrow}</Eyebrow>`, `<h1 class="hero-title"><slot/></h1>`, `<p class="hero-deck"><slot name="deck"/></p>`
  - `<MotifHero motif={motif} />`
- **Scoped styles:** the grid layout, `.hero-title`, `.hero-deck`, and the responsive
  collapse. These typography classes sit on PageHero's *own* `<h1>`/`<p>`, so Astro's
  scoping applies cleanly.

### `.grad` becomes global
The gradient span is provided by the *parent page* inside the title slot, so PageHero's
scoped `.grad` would not reach it (Astro scopes slotted content to the parent). Move
`.grad` into `src/styles/global.css` as the canonical definition. Home's existing scoped
`.grad` is left in place (identical values — harmless redundancy, avoids touching Home's
structure); the four secondary pages drop their scoped copies and rely on the global one.

## Page edits

- **`index.astro`** — copy only: new `<h1>` headline with gradient on "the age of AI";
  trimmed deck. No structural or 3D change.
- **`about.astro`** — replace `<section class="wrap hero">…</section>` with
  `<PageHero eyebrow="About · Software Engineer · Stockholm" accent="violet" motif="constellation">`. The existing `<img class="avatar">` is passed into the `lead`
  slot so the profile photo stays (now a small identity marker above the eyebrow); its
  scoped `.avatar` CSS is kept. Remove the page's scoped `.hero` / `.hero-body` /
  `.hero-title` / `.hero-deck` CSS.
- **`projects.astro`** — same swap, `motif="blocks"`, eyebrow "Projects · Things I've
  built"; title keeps its existing gradient span.
- **`bookshelf.astro`** — same swap, `motif="books"`, eyebrow "Bookshelf · Papers".
- **`opensource.astro`** — same swap, `motif="graph"`, eyebrow "Open Source".

## Test plan

No new unit tests — these are presentational `.astro` components; per the project's
testing rules the build + a visual check cover them.

1. **`npm run build`** (= `astro check && astro build`) — the gate. `astro check`
   validates the typed props on both new components and catches broken references.
2. **Visual check (dev), each of the 4 pages:** hero is two-column on desktop; the
   correct motif renders and animates; pointer parallax responds.
3. **JS-off:** hero copy renders, the CSS glow shows, layout doesn't break (empty canvas).
4. **`prefers-reduced-motion: reduce`:** a single static frame, no animation loop.
5. **Narrow (<860px):** layout collapses to one column; the 3D scales down (max-width
   300px, as `HeroVisual` does).
6. **Home:** new headline renders with the gradient on "the age of AI"; deck no longer
   contains "first-class citizen"; nothing else on Home changed.

## What could break / mitigations

- **Removing per-page hero CSS** could affect elements below if class names are reused.
  *Mitigation:* `.hero-title`/`.hero-deck`/`.hero` appear only in each page's hero region
  (verified by grep); confirm again per page before deleting.
- **Global `.grad`** could touch other `.grad` users. *Mitigation:* grep — only hero
  titles use it.
- **three.js now bundles on 4 more pages**, increasing per-page JS. Accepted: it's
  progressive enhancement, lazy-driven by `IntersectionObserver`, and the page is fully
  usable without it.

## Rollback

Both components are additive; page edits are localized to hero sections and the copy
change is a two-line edit. Reverting the commit restores the prior state cleanly.

## Out of scope

- Restructuring the home hero.
- Per-page motif *alternatives* / a motif picker.
- Any backend, data, or content changes beyond the home headline/deck copy.
