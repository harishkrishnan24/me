# Per-post OG images

**Date:** 2026-07-29
**Status:** Design — awaiting review

## Problem

Sharing any blog post to LinkedIn shows the same picture. `BaseLayout` defaults
`image = "og-default.png"` (`src/layouts/BaseLayout.astro:36`) and the post route never
overrides it (`src/pages/blog/[...slug].astro:21`), so every post emits an identical
`og:image`. LinkedIn is rendering exactly what the markup declares.

`PostLayout` is the break in the chain: it accepts `title`/`description`/`date`/`tags`
but has no `image` prop to forward, so a post page cannot set one today even if it
wanted to.

## Goal

Every published post gets its own 1200×630 share card, generated at build time from the
post title, visually a sibling of the existing `og-default.png`. Zero per-post manual
work: writing a new post must require no extra step beyond today's `npm run new:post`.

## Decisions (locked during brainstorming)

1. **Auto-generated cards**, not hand-made images. No `image` frontmatter field and no
   manual override — an override is speculative until a post actually needs one (YAGNI).
2. **Card content: title + name.** No date, tags, or description on the card. LinkedIn
   already renders title and description as caption text beneath the image; repeating
   them inside the image is clutter, and at LinkedIn preview size the title is the only
   thing that reliably reads.
3. **Blog posts only.** Home, About, Projects, Open Source, and Bookshelf keep
   `og-default.png`. Those pages are few and stable; a rendered brand card serves them
   better than a generated one.
4. **Satori + resvg-js**, chosen over a hand-rolled SVG template and over
   `astro-og-canvas`:
   - Hand-rolled SVG has no auto-wrap, so it needs heuristic text measurement. The
     failure mode — a long title overflowing its box — is permanent and public once
     shared. Satori does real glyph-advance measurement.
   - `astro-og-canvas` pulls ~7MB of `canvaskit-wasm` and its fixed template cannot
     reproduce the existing card's design.

## Architecture

Two new files, plus wiring changes to existing ones.

### `src/lib/og-card.ts` — the card template (pure)
*Justification: the card is the only visually-reviewable logic here; isolating it from
font I/O and rasterization keeps `titleFontSize` unit-testable and the endpoint thin.*

Exports:
- `titleFontSize(title: string): number` — 72px for titles up to 40 characters, 64px up
  to 70, 56px beyond. Measured on `title.length`.
- `ogCard(title: string): object` — returns the Satori element tree (a plain
  `{ type, props }` object; Satori accepts these directly, no JSX runtime needed).

No `astro:content` import, matching the discipline in `src/lib/posts.ts`.

**Visual spec** (all colors sourced from `src/styles/tokens.css` values):

| Region | Treatment |
|--------|-----------|
| Canvas | 1200×630, `--bg` `#0c0c13`, violet radial glow top-left, 80px padding |
| Eyebrow | `~/harish.dev` in JetBrains Mono — `~/` violet, `harish` in `--text`, `.dev` dim |
| Title | Inter 800, `letter-spacing: -0.03em`, `line-height: 1.06`, `--text`, `lineClamp: 3` |
| Rule | Violet→teal linear gradient bar beneath the title |
| Footer | Bordered violet `WRITING` chip + `Harish Krishnan` in mono |

Two deliberate departures from `og-default.png`:

- **The gradient moves off the text.** The default card art-directs its violet→teal
  gradient onto the second line of one known string. Applying that to an arbitrary line
  count is fragile, so the title stays solid and the gradient becomes a fixed rule below
  it — same visual signature, no per-title tuning.
- **The dot grid may be dropped.** Satori implements a CSS subset and tiled background
  patterns are its weak spot. Attempt it as a data-URI background; if it does not render
  cleanly, ship glow-only rather than a half-rendered pattern.

### `src/pages/og/[slug].png.ts` — the static endpoint
*Justification: a static Astro endpoint is the only way to emit generated binary files
into the build without adding a server.*

- `getStaticPaths()` over `getCollection("blog")` filtered by
  `visiblePosts(all, import.meta.env.DEV)` — the same rule as the post route, so drafts
  never emit a card into a production build.
- Reads font buffers directly from `node_modules/@fontsource`:
  `inter-latin-800-normal.woff`, `inter-latin-400-normal.woff`,
  `jetbrains-mono-latin-500-normal.woff`. These are `.woff`, not `.woff2` — Satori parses
  TTF/OTF/WOFF but not Brotli-compressed WOFF2. No new font assets are committed and the
  cards use the same typefaces as the site.
- `satori(...)` → SVG → `@resvg/resvg-js` → PNG `Response` with `Content-Type: image/png`.
- Output: `dist/og/<slug>.png`, served at `/me/og/<slug>.png`.

### Modified files

| File | Change |
|------|--------|
| `src/layouts/PostLayout.astro` | Add `slug: string` prop; compute and forward ``image={`og/${slug}.png`}`` to `BaseLayout` |
| `src/pages/blog/[...slug].astro` | Pass `slug={post.id}` |
| `astro.config.mjs` | Sitemap `filter` excluding `/og/` routes |
| `package.json` | Add `satori`, `@resvg/resvg-js` |

`BaseLayout` needs no change. Its existing `image?: string` prop and
`new URL(href(image), Astro.site)` already produce the base-aware absolute URL that
crawlers require.

**Why `PostLayout` computes the path rather than the page passing it:** the convention
"posts have generated cards" then lives in the post shell, and a future post route
cannot forget to opt in.

## Testing

Per the repo rule, only real logic is unit-tested; presentational output is covered by
the build plus a visual check.

**`src/lib/og-card.test.ts`**
- `titleFontSize` returns the expected step at each length threshold, including the
  boundary values.
- `ogCard(title)` produces a tree containing the title text, the `~/harish.dev` eyebrow,
  and the `Harish Krishnan` footer.

**Build gate**
- `npm run build` (`astro check && astro build`) passes.
- `dist/og/` contains exactly one PNG per visible post, each 1200×630.
- Render one card and inspect it visually before declaring the work done.

## Risks

1. **Native binary on CI.** `@resvg/resvg-js` resolves a per-platform optional
   dependency. The lockfile is generated on darwin-arm64 but `withastro/action@v3`
   builds on `ubuntu-latest`. *Mitigation:* confirm `package-lock.json` contains the
   `linux-x64-gnu` entry after install; a green Actions run is the real proof.
2. **Satori's CSS subset.** The dot-grid background may not render. *Mitigation:* the
   documented fallback above.
3. **Sitemap pollution.** `@astrojs/sitemap` would otherwise list the PNG routes.
   *Mitigation:* the `filter` in `astro.config.mjs`.
4. **LinkedIn caches OG data per URL for roughly 7 days.** Links already shared will keep
   showing the old image until refreshed through LinkedIn's Post Inspector
   (`https://www.linkedin.com/post-inspector/`). This is operational, not fixable in
   code, and is the expected reason a correct deploy can still look unchanged at first.
5. **Build time** grows by roughly a second per post. Negligible at the current count.

## Rollback

`git revert` the commit. `BaseLayout`'s `image = "og-default.png"` default immediately
restores today's behavior. No frontmatter, content, or committed-asset changes, so there
is nothing to unwind in the posts themselves.
