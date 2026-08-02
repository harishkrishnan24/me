# Terminal-editorial redesign

**Date:** 2026-08-02
**Status:** Design — awaiting review
**Source:** Claude Design project `58fabaaa-b51a-4b79-a89e-71cafcd9fc63`, file `harish.dev.dc.html`

## Goal

Adopt the design's visual language and interaction model across the whole site. The
design is a React SPA with client-side routing (`<sc-if value="{{ isHome }}">` swapping
route state in one document); this site is static multi-page Astro. The design is
therefore a *reference*, not source to port — each route block becomes a real page.

Textual content is **not** taken from the design. Existing copy stays; only look, feel,
and interaction change.

## Decisions (locked during brainstorming)

1. **Full adoption**, including the interactive layer: three-theme switcher, ⌘K command
   palette, backtick terminal, konami glitch, scroll progress, ASCII hero canvas.
2. **Mono for UI, serif for article prose.** The design sets article paragraphs in
   JetBrains Mono. Adopted everywhere the visitor *scans* — nav, labels, cards, lists,
   metadata, tables — but blog article paragraphs keep a reading serif. Monospace
   measurably slows sustained reading and the posts run long.
3. **Source Serif 4 stays** as that prose face. Already installed, designed for text, and
   it sits well against the warm off-white. Instrument Serif is a display face with one
   weight and thin strokes — fragile at 15px over long passages.
4. **three.js is removed.** `HeroVisual`, `MotifHero`, `PageHero`, `three`, and
   `@types/three` all go. The design gives a hero visual to the home page only.
5. **Secondary pages get more than the design gives them** (explicit latitude from the
   owner). The design opens About/Work/Writing with a bare heading, which reads flat next
   to the home page. They instead get a short, low-density, non-interactive `GlyphField`
   band behind the page heading — same component, two props.
6. **Inter is dropped.** The design has no sans-serif.

## Architecture

### Token layer — `src/styles/tokens.css` (rewritten)

Names become **semantic rather than literal**. This is forced by theming: a variable
called `--violet` would hold amber in the CRT theme. The rename is the reason the rest of
the change is mechanical.

| Old | New | Dark | Light | CRT |
|---|---|---|---|---|
| `--bg` | `--bg` | `#0a0a0c` | `#f4f2ec` | `#0b0a06` |
| `--surface` | `--panel` | `#101014` | `#eae7df` | `#12100a` |
| `--text` | `--fg` | `#edeae3` | `#14141a` | `oklch(0.86 0.16 86)` |
| `--text-muted` | `--dim` | `#8b8880` | `#6b6862` | `oklch(0.72 0.10 86)` † |
| `--border` | `--line` | `rgba(237,234,227,0.13)` | `rgba(20,20,26,0.15)` | `oklch(0.40 0.08 86)` |
| `--violet` | `--accent` | `oklch(0.80 0.15 145)` | `oklch(0.52 0.15 145)` | `oklch(0.86 0.16 86)` |
| `--teal` | `--accent2` | `oklch(0.80 0.15 78)` | `oklch(0.52 0.15 60)` | `oklch(0.78 0.16 45)` |

† **Deliberate deviation from the design.** The design specifies `oklch(0.60 0.10 86)`
for CRT dim text, which against `#0b0a06` falls below WCAG AA for body copy. Raised to
`0.72`. The CRT theme is a novelty, but long-form posts are still readable in it.

`--radius` and `--radius-sm` become `0` — the design has no rounded corners. Keeping the
tokens (rather than deleting 12 call sites) makes the flattening one line and reversible.

Call sites to remap: 25 `--violet*`, 32 `--teal*`, 4 `--orange*`.

### Type — `src/layouts/BaseLayout.astro`

| Role | Token | Face | Used for |
|---|---|---|---|
| Display | `--font-display` | Instrument Serif 400 | All headings, large numerals, pull quotes |
| UI / body | `--font-mono` | JetBrains Mono | Nav, labels, cards, lists, tables, metadata |
| Prose | `--font-serif` | Source Serif 4 | Blog article paragraphs only |

Add `@fontsource/instrument-serif`. Remove `@fontsource/inter` (8 `--font-sans` call
sites move to mono). Self-hosted, per the no-CDN rule — the design's Google Fonts link is
not carried over.

### Pure logic (unit-tested)

Per the repo rule, only real logic is tested. Three modules:

- **`src/lib/theme.ts`** — `THEMES = ["dark","light","crt"]`, `nextTheme(current)` (pure
  cycle, wraps, falls back to `"dark"` on an unknown value), `applyTheme(t)` (DOM +
  `localStorage`).
- **`src/lib/terminal-commands.ts`** — `runCommand(input): { lines: string[]; route?: string; clear?: boolean }`.
  The entire shell as a pure function: `help`, `whoami`, `ls`, `cd <page>`, `theme`,
  `social`, `clear`, `sudo`, and unknown-command handling.
- **`src/lib/og-card.ts`** — existing; `COLOR` repalette and Instrument Serif title.
  Note the coupling: the OG endpoint currently loads **Inter 800** for card titles, so
  removing `@fontsource/inter` breaks the build unless the card switches face in the same
  phase. Card titles move to Instrument Serif, matching the site's new display face.

  **Satori cannot parse `oklch()`.** Verified by rendering a prototype card: Instrument
  Serif rasterized correctly, but every `oklch()` value came out black — silently, with
  no error, producing invisible text. `og-card.ts` must therefore use the sRGB hex
  equivalents below, not the token strings. This is a second, sharper reason the `COLOR`
  object exists: it is not merely a mirror of `tokens.css`, it is a *format translation*
  of it.

### sRGB equivalents (computed, for `og-card.ts` and any non-CSS consumer)

| Token | oklch (CSS) | sRGB hex |
|---|---|---|
| dark `--accent` | `oklch(0.80 0.15 145)` | `#7bd77f` |
| dark `--accent2` | `oklch(0.80 0.15 78)` | `#f2b036` |
| light `--accent` | `oklch(0.52 0.15 145)` | `#1b7e2a` |
| light `--accent2` | `oklch(0.52 0.15 60)` | `#a44d00` * |
| crt `--fg` | `oklch(0.86 0.16 86)` | `#ffc83a` * |
| crt `--dim` (adjusted) | `oklch(0.72 0.10 86)` | `#c0a057` |
| crt `--line` | `oklch(0.40 0.08 86)` | `#5b4403` |
| crt `--accent2` | `oklch(0.78 0.16 45)` | `#ff935a` * |

\* Outside the sRGB gamut; browsers gamut-map these, so the CSS rendering is marginally
more saturated than the hex. Only the dark-theme values matter for OG cards.

### Components

**New**
- `src/components/GlyphField.astro` — the ASCII glyph canvas. Props: `density` (px cell),
  `interactive` (cursor reactivity), `height`. Full-bleed interactive on home; short
  low-density static band on secondary pages.
  *Justification: the design's signature visual, needed in two configurations.*
- `src/components/CommandDeck.astro` — ⌘K palette, backtick terminal, and the global
  keymap.
  *Justification: one `keydown` listener must own ⌘K, `` ` ``, `T`, Escape, and the konami
  sequence. Splitting palette and terminal into separate components means two scripts
  competing for the same events and duplicated Escape handling. One responsibility:
  keyboard-driven site controls.*

**Deleted**
- `HeroVisual.astro`, `MotifHero.astro`, `PageHero.astro`
- deps `three`, `@types/three`

**Rewritten**
- `Nav.astro` — 62px fixed bar, `~/harish.dev` wordmark, uppercase tracked mono links,
  accent theme dot.
- `Footer.astro` — "Let's talk." display line, uppercase link row, hint line.
- `PostCard.astro` — from card to hairline **link row**: `date | title + description | →`.
- `Eyebrow.astro` — the design's `01 — Now` numbered section label.
- `PostLayout.astro` — sticky TOC sidebar, scroll progress bar, tag chips, author block,
  next-post row.
- `BaseLayout.astro` — fonts, and the theme boot script.

### Theme boot (no flash)

A blocking `is:inline` script in `<head>` reads `localStorage` and sets `data-theme`
before first paint. Without it, a light-theme visitor gets a dark flash on every
navigation — a multi-page site hits this on every click, unlike the SPA the design came
from. Without JS, `:root` supplies dark and nothing breaks.

### Pages

Content is preserved; structure is restyled.

| Page | Treatment |
|---|---|
| `index` | Full-bleed interactive `GlyphField` hero, giant display name with accent italic, spec table; `01 — Now` grid; `02 — Latest writing` rows |
| `about` | Heading band, two-column intro, spec table, track-record rows, `How I work` grid, toolbox chips |
| `projects` | Heading band, hairline project grid, case note with stat cells |
| `opensource` | Heading band, hairline link rows |
| `bookshelf` | Heading band, hairline grid; book cover images retained |
| `blog/index` | Heading band, link rows |
| `blog/[...slug]` | Sticky TOC, progress bar, serif prose, tag chips, author block, next-post row |

## Testing

- `src/lib/theme.test.ts` — `nextTheme` cycles, wraps, and falls back on unknown input.
- `src/lib/terminal-commands.test.ts` — every command's output, `cd` routing and its
  unknown-section error, unknown-command message, `clear`.
- `src/lib/og-card.test.ts` — existing tests updated for the new palette.
- Do NOT unit-test `.astro` files.
- Build gate: `npm run build` (`astro check && astro build`).
- Manual: every page at desktop and mobile widths, in all three themes, plus one pass
  with JavaScript disabled confirming all content renders and links work.

## Sequencing

Six phases. Each leaves the site building and deployable.

1. **Foundation** — tokens, fonts, `global.css`, `Nav`, `Footer`. The site-wide look flips here.
2. **Home** — `GlyphField` + home sections.
3. **Content pages** — about, projects, opensource, bookshelf, blog index.
4. **Post layout** — TOC, progress, prose treatment.
5. **Command deck** — palette, terminal, theme switching, konami.
6. **Cleanup** — OG card repalette, delete three.js and the dead hero components.

## Risks

1. **Large diff.** ~2,100 lines of page-level CSS across 7 pages. Visual regressions are
   the main hazard; the per-phase build-and-look checkpoints are the mitigation.
2. **Theme flash.** Mitigated by the blocking inline boot script. Verify by loading a page
   with `light` saved.
3. **CRT contrast.** Addressed by the `0.72` lightness deviation above; re-check after
   implementation.
4. **`oklch()` support.** Fine in current Chrome/Safari/Firefox (Safari 15.4+). No
   fallback planned; the site is a personal blog, not a commerce funnel.
5. **Removing three.js.** Confirm nothing else imports it before deleting.
6. ~~**Instrument Serif in Satori.**~~ **Resolved before planning.**
   `@fontsource/instrument-serif@5.3.0` ships `instrument-serif-latin-400-normal.woff`,
   and a prototype card rendered with it correctly at 1200×630. Inter can be removed
   cleanly. The prototype also surfaced the `oklch()` limitation recorded above — which
   would otherwise have shipped as invisible text on every share card.
7. **JS-disabled regressions.** The command deck and theme toggle are enhancement-only,
   but the verification pass is mandatory, not optional.

## Accepted limitations

- The CRT theme remains lower-contrast than dark or light even after the adjustment.
- Non-Latin post titles still render a blank OG card (pre-existing; see the
  per-post OG images spec).

## Rollback

The work is sequenced so each phase is a coherent revert point. A full rollback is
`git revert` of the phase range; `tokens.css` alone restores most of the old look, since
the palette drives the majority of the visual identity.
