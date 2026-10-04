# Essayist redesign

**Date:** 2026-10-04
**Status:** Design — awaiting review
**Branch:** `redesign/essayist`
**Reference:** approved mockup "Essayist + Quiet dark" (`hybrid.html` in the comparison artifact
https://claude.ai/artifact/2Jwpu749MVtwyiPKp6cTGW). The live post page
(`/blog/the-memory-wall/`) is the in-repo reference for type and spacing.

## Goal

Make the site read as a calm, professional engineer's site where the writing is the main
thing. One narrow column, serif for headings and running text, mono only for metadata.
Light paper is the default; a toggle switches to a quiet dark palette.

This **reverses decision 1 of the 2026-08-02 terminal-editorial spec** ("full adoption,
including the interactive layer"). The glyph field, CRT theme, command palette, terminal,
and konami glitch go. Copy does not change, except where a section is removed.

## Decisions

Each item has a recommendation that this spec adopts. Item 2 reverses a deliberate earlier
choice, so it needs your explicit yes.

1. **Two themes: light (default) and dark.** `THEMES = ["light", "dark"]`. CRT is deleted.
   No `prefers-color-scheme` block: the owner chose "light by default", not "follow the
   system". Do not add one.
2. **Delete `CommandDeck` entirely** (⌘K palette, backtick terminal, konami glitch), with
   `src/lib/terminal-commands.ts` and its test. On a six-page site the nav already does
   the palette's job, and the terminal is the most "gimmick" part of the current design.
3. **Delete `GlyphField`.** It leaves the home hero and every `PageHead` band.
   `applyTheme`'s `themechange` event loses its only listener; remove the dispatch.
4. **Section labels lose their numbers.** `Eyebrow` keeps the mono uppercase label;
   the `num` prop and the "01 —" prefix go.
5. **One serif.** `--font-display` becomes Source Serif 4 (one-line token change, 19 call
   sites follow). `@fontsource/instrument-serif` is removed from `package.json`.
   Add `@fontsource/source-serif-4/500.css` — the mockup sets titles at weight 500, and the
   site imports only 400 and 600 today.
6. **Code blocks keep Shiki `github-dark` in both themes.** A dark code block on light
   paper is a normal, readable look, and it needs no work. Dual Shiki themes are a
   possible follow-up, not part of this change.
7. **OG cards stay dark** (a dark card stands out in social feeds). `og-card.ts` mirrors the
   new *dark* tokens, and the title font changes to Source Serif 4
   (`source-serif-4-latin-400-normal.woff`, verified present). `public/og-default.png`
   is **not** regenerated (CLAUDE.md: rendered brand asset); it keeps Instrument Serif
   and the old green until a separate task replaces it.
8. **Brand text** in the nav changes from `~/harish.dev` to `Harish Krishnan`. The site
   is not served from harish.dev.

## Tokens — `src/styles/tokens.css`

**Every existing token name stays.** Only values change. Renaming would risk a dangling
`var()`, which fails silently (CLAUDE.md). One token is added:

- `--fg-soft` — secondary running text (intro, post descriptions, project summaries). It
  needs more contrast than `--dim`, which is for metadata labels.

`:root` becomes the light set; `html[data-theme="dark"]` the dark set; the CRT block is
deleted. Every colour token has a value in both blocks.

| Token | Light (`:root`) | Dark (`[data-theme="dark"]`) |
|---|---|---|
| `--bg` | `#F6F5F0` | `#0F1012` |
| `--panel` | `#EDECE5` | `#16181B` |
| `--line` | `#DAD9D1` | `#26282D` |
| `--line-strong` | `#8C8E87` (3.04:1) | `#5F6168` (3.08:1) |
| `--fg` | `#1B1C1A` | `#EBE8E2` |
| `--fg-soft` | `#474A45` (8.2:1) | `#A9A69F` (7.8:1) |
| `--dim` | `#646761` (5.3:1 bg, 4.9:1 panel) | `#8D8A84` (5.5:1 bg, 5.2:1 panel) |
| `--accent` | `#2E6A50` (5.8:1) | `#84B8A0` (8.5:1) |
| `--accent2` | `#8A5300` (5.8:1) | `#D9A55B` (8.6:1) |

Ratios are WCAG contrast against `--bg` unless stated. `--line-strong` keeps its 3:1
role for control borders. Light `:root` and dark block both set `color-scheme`.

Type roles after the change: `--font-display` and `--font-serif` = Source Serif 4;
`--font-mono` = JetBrains Mono. `body` switches from `--font-mono` to `--font-serif`.
Mono stays only on: dates, tags, section labels, nav theme toggle, table headers, code.
Each of the ~76 `--font-mono` call sites is reviewed against that list.

## Theme boot and toggle

- Boot script in `BaseLayout.astro` stays inline and before any stylesheet. New logic:
  set `data-theme="dark"` only when `localStorage["hk-theme"] === "dark"`; anything else
  (including a stored `"crt"`) leaves the attribute unset → light. Key stays `hk-theme`.
- `<meta name="theme-color">` becomes the light `--bg`, `#F6F5F0`.
- Nav: the coloured theme dot becomes a text toggle (`Dark` / `Light`, mono, pill border
  in `--line-strong`, `aria-pressed`). Without JS it does nothing and the page stays light.

## Pages

All pages use one centred column of `--measure` width (≈680px of text). No cards, no
shadows, hairline `--line` rules between list items. The post page is the reference.

- **Nav / Footer.** Brand `Harish Krishnan` (serif, links home) left; Writing, Projects,
  Open source, About, LinkedIn, theme toggle right. The mobile toggle keeps its current
  behaviour; only styling changes. Footer keeps its content (email, GitHub, LinkedIn, X,
  Bookshelf — the only link to Bookshelf) restyled as quiet mono text; the
  "⌘K palette · \` terminal" hint is removed with `CommandDeck`.
- **Home.** Meta line (role · city · employer) → intro sentence as `h1` with the accent
  italic phrase → intro paragraph in `--fg-soft`. The two CTA buttons, the social row,
  and the "ALSO / FOCUS" spec table are removed (the nav and the contact section cover
  them). Then: **Writing** (latest 5 posts, "All essays →"), **Selected projects**
  (2 rows), **Now** (plain list with accent dash — this removes the empty grid cell
  by design), **Contact** (one paragraph, email + links as text).
- **Projects data** moves from `projects.astro` into `src/data/projects.ts` so home and the
  Projects page read one source (justification: the home page now lists projects; a copy
  would drift).
- **`PageHead`** (About, Projects, Open source, Bookshelf, Blog index). No glyph band:
  mono meta line, serif `h1`, optional lede in `--fg-soft`, inside the column.
- **Blog index.** Same post rows as the home Writing list, all visible posts.
- **`PostCard`.** Becomes the mockup's post row: mono date column, serif title (500),
  one-line description in `--fg-soft`, tags as mono `#tag` text (no boxed chips).
- **Post page (`PostLayout`).** Least change. Title font follows `--font-display`. Tag chips
  become `#tag` text like `PostCard`. Contents sidebar and scroll progress stay.
- **About.** The bio becomes serif running text in the column. The right-hand "at a glance"
  spec table is removed (it repeats the home meta line). Skills, certifications and
  experience become plain lists under unnumbered mono labels; "learning" markers stay as
  a mono suffix.
- **Projects.** The "2 projects / 3 languages / ∞" stat tiles are removed. Each project is a
  stacked entry: serif title + mono languages, summary, highlights list, repo links.
- **Open source.** Repo groups and the contributions table restyle into the column; the
  table keeps mono headers and gets `overflow-x: auto` at narrow widths.
- **Bookshelf.** The book grid becomes a single list: serif title, author in `--fg-soft`.

Only Home has an approved picture. The other pages are approved by this text; check them
during review on the branch preview.

## Testing

TDD applies to logic changes only (CLAUDE.md: presentational `.astro` is covered by build
and visual check).

- `src/lib/theme.test.ts` — rewrite first: `THEMES` equals `["light", "dark"]`; cycle
  `light → dark → light`; unknown input (including `"crt"`) → `"light"`. Then change
  `theme.ts`.
- `src/lib/og-card.test.ts` — update the colour assertion to the new dark accent hex and
  the font assertion to `"Source Serif 4"` first, then change `og-card.ts`.
- `src/lib/terminal-commands.test.ts` — deleted with its module.
- **Dangling-token check** (must print nothing):
  `comm -23 <(grep -rhoE 'var\(--[a-z0-9-]+' src | sed 's/var(//' | sort -u) <(grep -oE '^\s*--[a-z0-9-]+' src/styles/tokens.css | tr -d ' ' | sort -u)`
- **Removed-name check** (must print nothing): `grep -rn "GlyphField\|CommandDeck\|terminal-commands\|crt\|Instrument Serif\|instrument-serif" src package.json`
- `npm test` and `npm run build` pass; output shown.
- **Visual check** on `npm run dev`, every page, in light and dark, at desktop and 375px,
  and with JavaScript disabled: no horizontal scroll, no invisible text, the Memory Wall
  diagrams readable in both themes (they use `--accent2` and `--line-strong`).

## What could break

- A missed `--font-mono` call site leaves a paragraph in mono. Caught by the visual check.
- A token used only in the old CRT block, or a typo in a new name, renders invisible text.
  Caught by the dangling-token check.
- Visitors with a stored `"crt"` or `"dark"` value: `"crt"` falls back to light; `"dark"`
  keeps dark. Nobody gets a broken theme.
- Shared links to existing posts keep their cached OG images until platforms re-scrape.

## Rollback

All work is on `redesign/essayist`. Nothing reaches GitHub Pages until it merges to
`master`. After a merge, `git revert` of the merge commit restores the old design.

## Out of scope (follow-ups)

- "Udemy" copy on the home Now list and the About bio.
- Regenerating `public/og-default.png` in the new font and palette.
- Dual Shiki themes for light-mode code blocks.
