# Spec: Personal Website — Astro Rebuild + Dark Editorial Theme + Self-Hosted Blog

## Objective

Rebuild the existing static HTML/CSS personal site (`harishkrishnan24/me`) as an **Astro**
project that:

1. **Adopts the dark editorial theme** from the reference blog post — its color palette,
   tri-font type system, and visual language (eyebrow labels, accent-bordered cards, prose
   styling) — across every page, then **elevates it** into a beautiful, engaging, "techy"
   experience (see **Design Direction**) rather than a flat palette swap.
2. **Replaces the external Medium link with a self-hosted blog** authored as Markdown/MDX
   files in the repo, powered by Astro Content Collections. Creating a post is a one-command
   scaffold + commit; no backend, no database.
3. **Preserves all existing content** (home/intro, about + work history, projects, bookshelf,
   open source, contact) — restyled, not rewritten.
4. **Stays fully static**, deployed to GitHub Pages on the same repo via GitHub Actions, and
   keeps the site usable with JavaScript disabled.

### Target user

The site owner (Harish) as author/maintainer; visitors (recruiters, peers, readers) as the
audience. "Easy blog management" success = *write a Markdown file, run one command, commit,
and it's live* — no CMS, no dashboard, no server.

### What success looks like

- The site looks like the reference theme, not the 1990s retro theme.
- Publishing a post is: `npm run new:post "Title"` → edit the generated `.md` → commit → live.
- A push to `master` auto-builds and deploys to GitHub Pages.
- Lighthouse: works with JS off; no third-party network requests for fonts.

## Tech Stack

| Concern        | Choice                                                            | Justification |
|----------------|-------------------------------------------------------------------|---------------|
| Framework      | **Astro 7.x** (static output, default)                            | Zero-JS by default; first-class Markdown content; keeps the "no JS required" property. (npm resolved 7.0.3.) |
| Language       | **TypeScript** (`astro check` for type safety)                    | Type-safe content frontmatter via collection schema. |
| Content        | **Astro Content Collections** (`src/content.config.ts` + `glob` loader, verified present in 7.0.3) | Type-checked frontmatter; the "blog management" feature with no backend. |
| Markdown       | **`@astrojs/mdx`**                                                | Lets posts embed components/code blocks matching the theme. |
| Fonts          | **`@fontsource/inter`, `@fontsource/source-serif-4`, `@fontsource/jetbrains-mono`** | Self-hosted (no Google Fonts CDN), bundled + fingerprinted by Astro. |
| Syntax highlighting | Astro built-in **Shiki**                                     | No extra dep; themeable to match palette. |
| SEO            | **`@astrojs/sitemap`** + per-page Open Graph/Twitter meta + JSON-LD | Discoverability; rich social cards; structured data for crawlers. |
| Feed / share   | **`@astrojs/rss`** (feed) + a branded 1200×630 OG image + per-post share links | Each post is subscribable and shareable with a social card. |
| AI-friendly    | Dynamic **`/llms.txt`** ([llmstxt.org](https://llmstxt.org)) + JSON-LD + semantic HTML | LLMs/agents can map and cite the site; regenerated from content. |
| Deploy         | **GitHub Pages** via `@actions/deploy-pages` workflow + `withastro/action` | Same repo/URL, free, static. |

> Every dependency above is justified inline. Adding any dependency **not** in this table
> requires approval (see Boundaries).

## Commands

```bash
# Install
npm install

# Dev server (hot reload) — http://localhost:4321
npm run dev

# Type-check + content schema validation (the primary correctness gate)
npm run check          # → astro check

# Production build to ./dist
npm run build          # → astro check && astro build

# Preview the production build locally
npm run preview

# Scaffold a new blog post (creates src/content/blog/<slug>.md with frontmatter)
npm run new:post "My Post Title"
```

## Project Structure

```
personal-website/
├── astro.config.mjs              → Astro config (site URL, base, mdx integration)
├── package.json
├── tsconfig.json
├── SPEC.md                       → this file
├── public/
│   └── images/                   → static assets migrated from existing ./images
├── scripts/
│   └── new-post.mjs              → `npm run new:post` scaffolder (slugify + frontmatter)
├── src/
│   ├── content.config.ts         → blog collection schema (title, date, description, tags, draft)
│   ├── content/
│   │   └── blog/                  → Markdown/MDX posts (one file per post)
│   │       └── hello-world.md     → sample seed post
│   ├── styles/
│   │   ├── tokens.css             → CSS custom properties (the palette + type scale)
│   │   └── global.css             → reset, base typography, .prose rules
│   ├── layouts/
│   │   ├── BaseLayout.astro       → <html> shell: head, fonts, nav, footer, theme tokens
│   │   └── PostLayout.astro       → article/editorial layout for a single blog post
│   ├── components/
│   │   ├── Nav.astro              → top navigation (current-page aware)
│   │   ├── Footer.astro
│   │   ├── PostCard.astro         → blog-index listing item
│   │   └── Eyebrow.astro          → reusable mono uppercase label (violet/orange/teal)
│   └── pages/
│       ├── index.astro            → home (hero + intro + latest posts + contact)
│       ├── about.astro            → about + work history
│       ├── projects.astro
│       ├── bookshelf.astro
│       ├── opensource.astro
│       └── blog/
│           ├── index.astro        → post listing (sorted newest-first, drafts hidden in prod)
│           └── [...slug].astro    → renders a single post via PostLayout
└── .github/workflows/
    └── deploy.yml                 → build Astro + deploy to GitHub Pages on push to master
```

## Code Style

- **Indentation:** 2 spaces. **Quotes:** double in markup attributes, single in JS/TS.
- **Colors:** never hardcode hex in components — reference CSS custom properties from
  `tokens.css`. The palette lives in exactly one place.
- **Type roles (from the reference theme), enforced via tokens:**
  - `--font-sans` (Inter) → headings, nav, buttons
  - `--font-serif` (Source Serif 4) → body prose, hero deck
  - `--font-mono` (JetBrains Mono) → eyebrow labels, code, tags, table keys
- **Components are concrete and single-responsibility** — `PostCard`, `Eyebrow`, `Nav`; no
  `utils.astro` / generic dumping grounds.

`tokens.css` — single source of truth for the palette:

```css
:root {
  /* Surfaces */
  --bg: #0C0C13;
  --surface: #13131D;
  --surface-2: #1A1A26;
  --border: #21212F;

  /* Text */
  --text: #E8E8F2;
  --text-muted: #7A7A9A;
  --text-dim: #4A4A66;

  /* Accents */
  --violet: #7B6AF0;
  --orange: #E06B50;
  --teal: #48BEA6;

  /* Type */
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-serif: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Cascadia Code", monospace;
}
```

Example component using tokens (no inline hex, single responsibility):

```astro
---
// src/components/Eyebrow.astro
interface Props { accent?: "violet" | "orange" | "teal"; }
const { accent = "violet" } = Astro.props;
---
<span class={`eyebrow ${accent}`}><slot /></span>

<style>
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    display: block;
  }
  .violet { color: var(--violet); }
  .orange { color: var(--orange); }
  .teal   { color: var(--teal); }
</style>
```

Blog collection schema (`src/content.config.ts`) — the "blog management" contract:

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

## Design Direction

Goal: **beautiful, engaging, and techy — with imagination — while staying fast and JS-optional.**
The reference palette is the foundation; these moves give it life. Everything here is
**CSS-first and progressively enhanced**: core content reads perfectly with JS disabled, and
motion respects `prefers-reduced-motion`.

**Atmosphere**
- Layered radial-gradient "aurora" glows (violet/teal/orange at low opacity) behind the hero
  and section anchors — exactly the `radial-gradient(...rgba(123,106,240,0.07)...)` technique
  from the reference, scaled up.
- A subtle fixed grid / dot-matrix or faint noise texture over `--bg` for depth (CSS only,
  no image request) — a refined nod to the old site's dot background.
- Accent "scanline"/gradient hairlines and glow on focus/hover states.

**Type & motion**
- Big, confident hero with `clamp()` fluid sizing and `text-wrap: balance` (as in the reference).
- Scroll-reveal fade/slide for sections via the CSS `animation-timeline: view()` scroll-driven
  API where supported, degrading to static when not — **no JS required**.
- Tasteful hover transitions on cards, links (animated underline), and nav.

**Techy details**
- A monospace "terminal" treatment for the hero tagline (prompt caret, optional CSS typewriter)
  replacing the old green-on-black `.typewriter`, themed to the palette.
- Code blocks with Shiki syntax highlighting tuned to the violet/teal/orange tokens.
- Tag chips, eyebrow labels, and table keys in mono — the reference's signature.
- Animated gradient/glow accents on interactive elements; accent-bordered cards
  (`border-left: 3px solid var(--accent)`) for highlights, work entries, and callouts.

**Optional progressive-enhancement JS (each requires approval per Boundaries):**
- Theme is dark-only by default; a light toggle is out of scope unless requested.
- A small scroll-progress bar or animated nav-active indicator — only if it adds value and
  degrades gracefully.

**Guardrails:** no gratuitous motion, no layout shift, no blocking the read; every effect must
survive JS being off and honor reduced-motion. Imagination serves legibility, not the reverse.

## Testing Strategy

This is a content-driven static site. The bulk of the work is presentational migration, which
does not warrant a unit-test suite. Tests focus where there is **actual logic**, and the build
itself is the primary correctness gate.

| Level | Tool | What it covers |
|-------|------|----------------|
| **Schema / type** | `astro check` (run inside `npm run build`) | Frontmatter validation against the Zod schema; broken post → build fails. This *is* the test that "blog management works." |
| **Build gate** | `astro build` | Every page + every post renders without error; broken links to collection entries fail the build. |
| **Unit (logic only)** | **Vitest** | `scripts/new-post.mjs` slugify logic, draft-filtering, and date-sorting helpers used by `blog/index.astro`. Added only for the pieces with branching logic. |
| **Manual / visual** | `npm run preview` + browser | Theme matches reference; JS-disabled smoke check; mobile breakpoints. |

- TDD applies to the **`new-post` scaffolder and any sort/filter helper** (real logic): write
  the failing Vitest test first, then implement. Pure `.astro` presentational components are
  verified by build + visual check, not unit tests.
- Tests live next to logic: `scripts/new-post.test.mjs`, or `src/lib/posts.test.ts` if helpers
  are extracted there.
- Coverage target: the logic helpers, not the markup. No arbitrary % gate.

## Boundaries

**Always:**
- Run `npm run build` (which runs `astro check` first) before committing; show the output.
- Reference palette/type via `tokens.css` custom properties — never hardcode hex in components.
- Preserve existing page content (work history, books, projects, OSS, contact details).
- Keep the site static and usable with JavaScript disabled.
- Migrate existing images into `public/images/` rather than re-sourcing them.

**Ask first:**
- Adding any npm dependency beyond the Tech Stack table.
- Removing or merging any existing page, or cutting existing content.
- Changing the deploy host away from GitHub Pages, or changing repo Pages settings.
- Adding client-side JS, analytics, comments, or a newsletter.
- Changing the URL structure of existing pages (affects external links/SEO).

**Never:**
- Introduce a backend, database, or server (breaks the static model the user chose).
- Commit secrets, tokens, or `.env` files.
- Fetch fonts/assets from a third-party CDN at runtime (must stay self-hosted).
- Delete existing images or content without confirmation.
- Remove or skip the build/type-check gate to make a commit pass.

## Success Criteria

1. `npm run build` exits 0 and `dist/` contains: `index.html`, `about`, `projects`,
   `bookshelf`, `opensource`, `blog/` index, and the sample post page.
2. Every page renders the dark theme — verified by the presence of `--bg: #0C0C13` tokens and
   the tri-font type roles; zero remnants of the silver/Courier retro theme.
3. **Blog management works:** running `npm run new:post "Some Title"` creates a valid post file;
   editing it and rebuilding makes it appear on `/blog` newest-first — with no other code change.
4. A post with invalid frontmatter (e.g. missing `title`) **fails the build** — proving schema
   enforcement.
5. Posts with `draft: true` are hidden in the production build but visible in `npm run dev`.
6. No third-party network requests for fonts (self-hosted via `@fontsource`); site renders with
   JS disabled.
7. Pushing to `master` triggers the GitHub Actions workflow that builds and deploys to Pages,
   serving the same URL as today.

## Open Questions

1. **`base` path:** ✅ Resolved — project subpath. `astro.config.mjs` uses
   `site: 'https://harishkrishnan24.github.io'`, `base: '/me'`. All internal links/assets must
   honor `base` (use Astro's `import.meta.env.BASE_URL` / relative helpers, never hardcode `/`).
2. **Keep the "Udemy Courses" external nav link?** ✅ Yes — external link retained.
3. **Sample post content** — ✅ Seed one themed placeholder post demonstrating headings, code
   (Shiki), tags, and an accent card.
4. **Existing content** — ✅ Preserved verbatim (work history, books, OSS, contact details);
   restyle only, no rewrites.
5. **Contact form** — ✅ Retained as a themed `mailto:` form plus styled contact links (no
   backend; stays static).
6. **Design latitude** — ✅ Owner delegated visual decisions ("use your imagination") within the
   Design Direction guardrails.
```
