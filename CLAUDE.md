# CLAUDE.md

Operational guide for AI agents working in this repo. Not a README — no setup prose, no marketing. Read this before editing.

## What this is
Personal site + blog. Astro 7, static output, deployed to GitHub Pages under base `/me`. Dark editorial theme. Zero runtime JS on content; JS is progressive enhancement only.

## Non-negotiable gotchas
- **Base path is `/me`.** A hardcoded `<a href="/about">` or `src="/img.png"` works in dev and 404s in production. ALWAYS resolve internal links/assets through `href()` in `src/lib/links.ts` (or `import.meta.env.BASE_URL`). Never write a bare leading-slash internal URL.
- **Colors come from tokens.** Reference `var(--...)` defined in `src/styles/tokens.css`. Never hardcode a hex value in a component.
- **Three font roles** (tokens): `--font-sans` Inter = headings/UI, `--font-serif` Source Serif 4 = body prose, `--font-mono` JetBrains Mono = labels/code/tags.
- **JS-optional.** Content must render with JavaScript disabled. JS is allowed only as enhancement (nav toggle, copy-link) and must degrade silently.
- **Self-hosted only.** Fonts via `@fontsource`; no third-party CDN/runtime requests. OG image is a local PNG.

## Commands
- `npm run dev` — dev server (drafts visible).
- `npm run build` — `astro check && astro build`. **This is the gate. Run it before claiming done; show output.**
- `npm test` — Vitest (logic only).
- `npm run new:post "Title"` — scaffold `src/content/blog/<slug>.md` (frontmatter, `draft: true`).

## Add a blog post
1. `npm run new:post "Title"` → edit the generated Markdown.
2. Fill `description` (used in cards, OG, RSS, llms.txt), set `draft: false` to publish.
3. Frontmatter is Zod-validated in `src/content.config.ts` — invalid frontmatter FAILS the build (intended). Drafts show in `dev`, hidden in `build`.
4. No other file edits needed: home "latest", `/blog`, RSS, sitemap, and `/llms.txt` all pick it up automatically.

## Where things live
- `src/styles/{tokens,global}.css` — design system. Change the palette here, once.
- `src/layouts/BaseLayout.astro` — `<head>`, SEO/OG/Twitter/JSON-LD meta, fonts. Pages pass `title`, `description`, optional `image`/`ogType`/`publishedTime`/`tags`.
- `src/layouts/PostLayout.astro` — article shell + share links.
- `src/components/` — `Nav`, `Footer`, `Eyebrow`, `PostCard`. Reuse these; don't duplicate.
- `src/lib/posts.ts` — pure `sortByDateDesc`/`visiblePosts` (unit-tested; keep them free of `astro:content` imports).
- `src/pages/{rss.xml,llms.txt}.ts` — generated endpoints; both derive from the blog collection.
- `public/` — static assets (`images/`, `og-default.png`, `robots.txt`). Referenced base-aware.

## Testing rules
- TDD the real logic only: `scripts/new-post.mjs` slugify, `src/lib/posts.ts`. Co-locate `*.test.{ts,mjs}`.
- Do NOT unit-test presentational `.astro` — the build + a visual check cover those.

## Don't
- Don't add a backend, database, or server (it must stay static).
- Don't add a dependency without a one-line justification; prefer the existing toolset.
- Don't regenerate `og-default.png` casually — it's a rendered brand asset (1200×630).
- Don't bypass `astro check` to make a build pass.
