# Personal Website — AI Agent Instructions

## Project Overview
A personal portfolio + blog for Harish Krishnan, built with **Astro** (static output) and a **dark editorial theme**. Deployed to GitHub Pages under base `/me`. The site is fast, accessible, and works with JavaScript disabled.

## Architecture

### Technology Stack
- **Astro 7** (static site generation, zero runtime JS on content)
- **TypeScript** (`astro check` is the type/diagnostics gate)
- **Markdown Content Collections** for the blog (`src/content/blog/`)
- **MDX** (`@astrojs/mdx`) for posts that need components
- **Self-hosted fonts** via `@fontsource` (no CDN requests)
- **Shiki** for code syntax highlighting (built into Astro)

### Design System
Dark editorial theme. The single source of truth for colors, fonts, and scale is `src/styles/tokens.css` — **always reference `var(--...)` tokens; never hardcode hex.**

Three type roles:
- `--font-sans` (Inter) → headings, nav, buttons
- `--font-serif` (Source Serif 4) → body prose
- `--font-mono` (JetBrains Mono) → eyebrow labels, code, tags

Shared classes live in `src/styles/global.css`: `.wrap`, `.prose`, `.card` (+ `.violet`/`.orange`/`.teal` accents), `.eyebrow`, `.tag`/`.tag-row`, `.divider`, `.rule`, `.btn`, `.reveal` (scroll-driven CSS reveal).

## Project Structure
```
src/
  content.config.ts        Blog collection schema (Zod-validated frontmatter)
  content/blog/            Markdown/MDX posts (one file per post)
  styles/                  tokens.css (palette/type) + global.css (base/prose)
  layouts/                 BaseLayout.astro (shell), PostLayout.astro (article)
  components/              Nav, Footer, Eyebrow, PostCard
  lib/                     links.ts (base-aware href), posts.ts (sort/filter)
  pages/                   index, about, projects, bookshelf, opensource
    blog/                  index.astro (listing), [...slug].astro (post)
scripts/new-post.mjs       `npm run new:post` scaffolder
public/images/             static assets (referenced base-aware)
.github/workflows/         deploy.yml (build + deploy to Pages)
```

## Critical Conventions

### Base path (`/me`) — most common bug source
The site deploys under base `/me`. A hardcoded `<a href="/about">` works in dev but **404s in production**. ALL internal links and asset srcs must be base-aware:
- Import and use `href()` from `src/lib/links.ts`, or
- Use `import.meta.env.BASE_URL`.

### Blog authoring
1. `npm run new:post "My Post Title"` → creates `src/content/blog/<slug>.md` with valid frontmatter (`draft: true`).
2. Write the body, set `draft: false`.
3. Commit + push → GitHub Action builds and deploys.

Frontmatter is validated at build time against `src/content.config.ts`. Drafts show in `astro dev`, are hidden in production. Invalid frontmatter **fails the build** — that's intentional.

### Accessibility
Semantic HTML, descriptive `alt` on all images, proper heading hierarchy, `aria-current="page"` on the active nav link (handled in `Nav.astro`).

### JS-optional + self-hosted
Prefer CSS-only solutions (animations via `animation-timeline: view()`, honor `prefers-reduced-motion`). No third-party CDN requests at runtime — fonts and assets are self-hosted.

## Commands
```bash
npm run dev          # dev server (drafts visible)
npm run check        # astro check (types + diagnostics)
npm run build        # astro check && astro build
npm run preview      # preview production build
npm run new:post "T" # scaffold a blog post
npm test             # vitest (logic helpers: slugify, sort/filter)
```

## Testing
- `astro check` + `astro build` is the primary correctness gate.
- Vitest covers the real logic only: `scripts/new-post.mjs` slugify, `src/lib/posts.ts` sort/filter. Presentational `.astro` is verified by build + visual check.

## External References
- **Udemy**: https://www.udemy.com/user/harish-krishnan-5/
- **LinkedIn**: https://www.linkedin.com/in/harishkrishnan1993/
- **GitHub**: https://github.com/harishkrishnan24
- **X**: https://x.com/harishkforu

---
*The full specification lives in [SPEC.md](../SPEC.md). Last updated: June 2026.*
