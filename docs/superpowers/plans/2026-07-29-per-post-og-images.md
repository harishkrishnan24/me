# Per-post OG images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every published blog post its own 1200×630 Open Graph card, generated at build time from the post title, so LinkedIn shows a post-specific preview instead of the shared `og-default.png`.

**Architecture:** A pure module (`src/lib/og-card.ts`) builds a Satori element tree from a title. A static Astro endpoint (`src/pages/og/[slug].png.ts`) iterates the blog collection, renders each tree through Satori → resvg, and emits `dist/og/<slug>.png`. `PostLayout` forwards the matching path to `BaseLayout`, whose existing `image` prop already produces the absolute URL crawlers need.

**Tech Stack:** Astro 7 (static output), `satori@0.29.0`, `@resvg/resvg-js@2.6.2`, Vitest, TypeScript strict.

## Global Constraints

- **Base path is `/me`.** Never write a bare leading-slash internal URL. Internal paths resolve through `href()` in `src/lib/links.ts`. The `image` prop passed to `BaseLayout` is base-relative with **no leading slash** (e.g. `og/my-post.png`) — `BaseLayout` calls `href()` on it.
- **Palette values come from `src/styles/tokens.css`.** Satori cannot resolve CSS custom properties, so `og-card.ts` mirrors the hex values in a single `COLOR` object with a comment binding it to the token file. This is the one sanctioned place in the repo where hexes are written in TypeScript.
- **Three font roles:** Inter (`--font-sans`) headings, Source Serif 4 (`--font-serif`) prose, JetBrains Mono (`--font-mono`) labels. The card uses Inter 800 for the title and JetBrains Mono 500 for eyebrow and footer.
- **Self-hosted only.** Fonts are read from `node_modules/@fontsource` at build time. No CDN, no runtime network calls.
- **Satori parses TTF/OTF/WOFF but not WOFF2.** Always load the `.woff` file, never `.woff2`.
- **Satori 0.29 ignores `lineClamp`.** Verified against the installed package. Truncation must happen in our own code.
- **`npm run build` (`astro check && astro build`) is the gate.** Run it and show output before claiming any task done. Never bypass `astro check`.
- **Static output only.** No backend, no server, no runtime image generation.
- Do NOT unit-test presentational `.astro` files — the build plus a visual check covers those.

---

### Task 1: The card template (pure)

Builds the Satori element tree and the title-fitting rule. No dependencies are installed in this task — `og-card.ts` imports nothing, because Satori accepts plain `{ type, props }` objects and needs no JSX runtime. That keeps this task fully unit-testable on its own.

**Files:**
- Create: `src/lib/og-card.ts`
- Test: `src/lib/og-card.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `CARD_WIDTH: 1200`, `CARD_HEIGHT: 630` (const numbers)
  - `titleLayout(title: string): { text: string; fontSize: number }`
  - `ogCard(title: string): OgNode`
  - `interface OgNode { type: string; props: { style: Record<string, unknown>; children?: OgChild } }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/og-card.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, ogCard, titleLayout } from "./og-card";

describe("titleLayout", () => {
  it("uses the largest size for a real post title", () => {
    expect(titleLayout("There's No Magic in Your Database")).toEqual({
      text: "There's No Magic in Your Database",
      fontSize: 72,
    });
  });

  it("steps down at the 50-character boundary", () => {
    expect(titleLayout("a".repeat(50)).fontSize).toBe(72);
    expect(titleLayout("a".repeat(51)).fontSize).toBe(64);
  });

  it("steps down again at the 84-character boundary", () => {
    expect(titleLayout("a".repeat(84)).fontSize).toBe(64);
    expect(titleLayout("a".repeat(85)).fontSize).toBe(56);
  });

  it("leaves a title at the truncation budget intact", () => {
    const title = "a".repeat(92);
    expect(titleLayout(title).text).toBe(title);
  });

  it("truncates past the budget with an ellipsis", () => {
    const { text } = titleLayout("b".repeat(200));
    expect(text).toHaveLength(93); // 92 characters plus the ellipsis
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("ogCard", () => {
  /** Collect every string of text in the tree, depth-first. */
  const flatten = (node: unknown): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(flatten).join(" ");
    if (node && typeof node === "object" && "props" in node) {
      return flatten((node as { props: { children?: unknown } }).props.children);
    }
    return "";
  };

  it("renders the title, the eyebrow, and the footer", () => {
    const text = flatten(ogCard("Hello World"));
    expect(text).toContain("Hello World");
    expect(text).toContain("harish");
    expect(text).toContain("WRITING");
    expect(text).toContain("Harish Krishnan");
  });

  it("sizes the canvas to the Open Graph convention", () => {
    const { style } = ogCard("Hello World").props;
    expect(style.width).toBe(CARD_WIDTH);
    expect(style.height).toBe(CARD_HEIGHT);
    expect([CARD_WIDTH, CARD_HEIGHT]).toEqual([1200, 630]);
  });

  it("truncates a pathological title inside the tree", () => {
    expect(flatten(ogCard("c".repeat(300)))).toContain("…");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/og-card.test.ts
```

Expected: FAIL — `Failed to resolve import "./og-card"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/og-card.ts`:

```ts
// Build-time Open Graph card for a blog post. Pure: returns a Satori
// element tree as plain `{ type, props }` objects — Satori accepts these
// directly, so the project needs no JSX runtime. Kept free of `satori`
// and `astro:content` imports so it unit-tests without either.

/** Open Graph's 1.91:1 convention. LinkedIn, X, and Slack all expect it. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const PADDING = 80;

// Satori cannot resolve CSS custom properties, so the palette is mirrored
// here. These MUST stay in sync with src/styles/tokens.css.
const COLOR = {
  bg: "#0c0c13", // --bg
  text: "#e8e8f2", // --text
  textMuted: "#7a7a9a", // --text-muted
  textDim: "#4a4a66", // --text-dim
  violet: "#7b6af0", // --violet
  teal: "#48bea6", // --teal
  violetLine: "rgba(123, 106, 240, 0.42)", // near --violet-line, opaque enough to read at card scale
  violetGlow: "rgba(123, 106, 240, 0.20)", // --violet-glow, strengthened for a 1200px canvas
} as const;

type Style = Record<string, unknown>;
type OgChild = string | OgNode | Array<string | OgNode>;

export interface OgNode {
  type: string;
  props: { style: Style; children?: OgChild };
}

const el = (type: string, style: Style, children?: OgChild): OgNode => ({
  type,
  props: { style, children },
});

/**
 * Pick a font size the title fits in, truncating pathological ones.
 *
 * Satori 0.29 ignores `lineClamp`, so overflow has to be prevented here.
 * Measured for Inter 800 at -0.03em in the 1040px content column: roughly
 * 25/28/32 characters per line at 72/64/56px. The space between eyebrow and
 * footer allows three lines. The character budget is a coarse proxy for a
 * proportional font — a guard against absurd titles, not a layout mechanism.
 */
export function titleLayout(title: string): { text: string; fontSize: number } {
  if (title.length <= 50) return { text: title, fontSize: 72 };
  if (title.length <= 84) return { text: title, fontSize: 64 };
  return { text: truncate(title, 92), fontSize: 56 };
}

function truncate(title: string, max: number): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max).trimEnd()}…`;
}

/** The card: mono eyebrow, title, gradient rule, mono footer. */
export function ogCard(title: string): OgNode {
  const { text, fontSize } = titleLayout(title);

  const eyebrow = el(
    "div",
    { display: "flex", fontFamily: "JetBrains Mono", fontSize: 26 },
    [
      el("span", { color: COLOR.violet }, "~/"),
      el("span", { color: COLOR.text }, "harish"),
      el("span", { color: COLOR.textDim }, ".dev"),
    ],
  );

  const headline = el("div", { display: "flex", flexDirection: "column" }, [
    el(
      "div",
      {
        fontSize,
        fontWeight: 800,
        color: COLOR.text,
        lineHeight: 1.06,
        letterSpacing: "-0.03em",
      },
      text,
    ),
    // The default card art-directs a violet->teal gradient onto one known
    // line of text. That does not generalize to an arbitrary line count, so
    // the signature moves to a fixed rule and the title stays solid.
    el("div", {
      marginTop: 36,
      width: 220,
      height: 5,
      borderRadius: 3,
      backgroundImage: `linear-gradient(90deg, ${COLOR.violet} 0%, ${COLOR.teal} 100%)`,
    }),
  ]);

  const footer = el(
    "div",
    { display: "flex", alignItems: "center", fontFamily: "JetBrains Mono" },
    [
      el(
        "div",
        {
          display: "flex",
          fontSize: 18,
          letterSpacing: "0.18em",
          color: COLOR.violet,
          border: `1px solid ${COLOR.violetLine}`,
          borderRadius: 3,
          padding: "8px 14px",
        },
        "WRITING",
      ),
      el(
        "div",
        { marginLeft: 22, fontSize: 22, color: COLOR.textMuted },
        "Harish Krishnan",
      ),
    ],
  );

  return el(
    "div",
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: PADDING,
      backgroundColor: COLOR.bg,
      backgroundImage: `radial-gradient(900px 500px at 12% 0%, ${COLOR.violetGlow}, rgba(12, 12, 19, 0) 70%)`,
      fontFamily: "Inter",
    },
    [eyebrow, headline, footer],
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/og-card.test.ts
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Run the whole suite and the type check**

```bash
npm test && npx astro check
```

Expected: all Vitest tests pass; `astro check` reports 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/og-card.ts src/lib/og-card.test.ts
git commit -m "feat(og): add per-post OG card template"
```

---

### Task 2: The image endpoint

Installs the two rendering dependencies and emits one PNG per visible post. At the end of this task the images exist in `dist/` but nothing links to them yet — that is Task 3.

**Files:**
- Create: `src/pages/og/[slug].png.ts`
- Modify: `package.json` (dependencies), `package-lock.json`
- Modify: `astro.config.mjs` (sitemap filter)

**Interfaces:**
- Consumes: `ogCard`, `CARD_WIDTH`, `CARD_HEIGHT` from `src/lib/og-card.ts`; `visiblePosts` from `src/lib/posts.ts`.
- Produces: build artifacts at `dist/og/<slug>.png`, served at `/me/og/<slug>.png`.

- [ ] **Step 1: Install the dependencies**

```bash
npm install satori@0.29.0 @resvg/resvg-js@2.6.2
```

Justification for each — `satori` renders a flexbox layout to SVG with real glyph-advance text measurement, which is the hard part of fitting an arbitrary title; `@resvg/resvg-js` rasterizes that SVG to PNG, because Open Graph consumers do not accept SVG.

- [ ] **Step 2: Verify the Linux prebuild is in the lockfile**

The lockfile is written on darwin-arm64 but CI (`withastro/action@v3`) builds on `ubuntu-latest`. If the Linux binary is absent from the lockfile, the deploy fails while the local build stays green.

```bash
grep -c "resvg-js-linux-x64-gnu" package-lock.json
```

Expected: a count of `1` or more. If it prints `0`, stop and report it — do not proceed.

- [ ] **Step 3: Write the endpoint**

Create `src/pages/og/[slug].png.ts`:

```ts
// One Open Graph card per published post, rendered at build time into
// dist/og/<slug>.png. Static output means there is no server to generate
// these on demand, so they must be real files.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { CARD_HEIGHT, CARD_WIDTH, ogCard } from "../../lib/og-card";
import { visiblePosts } from "../../lib/posts";

// Resolved through @fontsource's exports map rather than a relative path,
// so this does not break if the module layout changes. Satori parses WOFF
// but NOT WOFF2 (Brotli), hence the .woff files.
const resolveFrom = createRequire(import.meta.url);
const fontData = (specifier: string) => readFileSync(resolveFrom.resolve(specifier));

// Loaded once per build, not once per post.
const FONTS = [
  {
    name: "Inter",
    data: fontData("@fontsource/inter/files/inter-latin-800-normal.woff"),
    weight: 800 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: fontData(
      "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff",
    ),
    weight: 500 as const,
    style: "normal" as const,
  },
];

// Same draft rule as the post route, so a draft never emits a card into
// a production build.
export async function getStaticPaths() {
  const all = await getCollection("blog");
  return visiblePosts(all, import.meta.env.DEV).map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(ogCard(props.title as string), {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: FONTS,
  });
  const png = new Resvg(svg).render().asPng();
  // Copy into a plain Uint8Array: TypeScript's BodyInit does not accept
  // Node's Buffer<ArrayBufferLike> directly.
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
```

- [ ] **Step 4: Keep the PNG routes out of the sitemap**

`@astrojs/sitemap` would otherwise list the generated images as pages. In `astro.config.mjs`, replace `sitemap()` in the `integrations` array:

```js
  integrations: [
    mdx(),
    // The /og/*.png routes are share-card assets, not pages.
    sitemap({ filter: (page) => !page.includes("/og/") }),
  ],
```

- [ ] **Step 5: Build and verify the PNGs land**

```bash
npm run build
```

Expected: `astro check` reports 0 errors and the build completes.

If `astro check` fails with `Cannot find module 'react'` originating in satori's type definitions, add the types (satori declares its element parameter as React's `ReactNode`):

```bash
npm install -D @types/react
```

Then re-run `npm run build`.

- [ ] **Step 6: Verify the output files**

```bash
ls -la dist/og/ && file dist/og/*.png
```

Expected: exactly two files — `what-happens-when-you-run-a-query.png` and `why-ai-features-feel-bolted-on.png` — each reported as `PNG image data, 1200 x 630`.

- [ ] **Step 7: Confirm the sitemap is clean**

```bash
grep -c "/og/" dist/sitemap-0.xml
```

Expected: `0`.

- [ ] **Step 8: Look at a card**

Open `dist/og/what-happens-when-you-run-a-query.png` and confirm: the title reads clearly, the `~/harish.dev` eyebrow is present, the violet→teal rule sits below the title, the `WRITING` chip and name are in the footer, and nothing overflows the canvas. Report what you see. Do not skip this — the unit tests assert structure, not appearance.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json astro.config.mjs "src/pages/og/[slug].png.ts"
git commit -m "feat(og): render a share card per post at build time"
```

---

### Task 3: Point the posts at their cards

Wires the generated images into the post markup. This is the change that actually fixes the reported LinkedIn behavior.

**Files:**
- Modify: `src/layouts/PostLayout.astro:6-13` (Props interface and destructuring), `src/layouts/PostLayout.astro:28-34` (the `BaseLayout` call)
- Modify: `src/pages/blog/[...slug].astro:21-27` (the `PostLayout` call)

**Interfaces:**
- Consumes: the `dist/og/<slug>.png` artifacts from Task 2; `BaseLayout`'s existing `image?: string` prop.
- Produces: an `og:image` and `twitter:image` per post pointing at `https://harishkrishnan24.github.io/me/og/<slug>.png`.

- [ ] **Step 1: Add the `slug` prop to `PostLayout`**

In `src/layouts/PostLayout.astro`, change the Props interface and destructuring:

```ts
interface Props {
  title: string;
  description: string;
  /** Post id — used to locate its generated OG card. */
  slug: string;
  date: Date;
  tags: string[];
  draft?: boolean;
}
const { title, description, slug, date, tags, draft } = Astro.props;
```

- [ ] **Step 2: Forward the card path to `BaseLayout`**

Still in `src/layouts/PostLayout.astro`, change the opening `BaseLayout` tag:

```astro
<BaseLayout
  title={title}
  description={description}
  image={`og/${slug}.png`}
  ogType="article"
  publishedTime={date}
  tags={tags}
>
```

Note the path has **no leading slash** — `BaseLayout` runs it through `href()`, which prepends the `/me` base. A leading slash here would 404 in production.

The layout computes the path itself rather than accepting an `image` prop so that the convention lives in the post shell; a future post route cannot forget to opt in.

- [ ] **Step 3: Pass the slug from the post route**

In `src/pages/blog/[...slug].astro`, add `slug` to the `PostLayout` call:

```astro
<PostLayout
  title={post.data.title}
  description={post.data.description}
  slug={post.id}
  date={post.data.date}
  tags={post.data.tags}
  draft={post.data.draft}
>
  <Content />
</PostLayout>
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: `astro check` reports 0 errors and the build completes.

- [ ] **Step 5: Verify each post points at its own card**

```bash
grep -o 'og:image" content="[^"]*"' dist/blog/*/index.html
```

Expected: two lines, each naming a **different** absolute URL —
`https://harishkrishnan24.github.io/me/og/what-happens-when-you-run-a-query.png` and
`https://harishkrishnan24.github.io/me/og/why-ai-features-feel-bolted-on.png`.
If either says `og-default.png`, the wiring is wrong.

- [ ] **Step 6: Verify the non-post pages are unchanged**

```bash
grep -o 'og:image" content="[^"]*"' dist/index.html dist/about/index.html
```

Expected: both still `https://harishkrishnan24.github.io/me/og-default.png`. Scope was blog posts only.

- [ ] **Step 7: Run the full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Review the whole diff**

```bash
git diff HEAD~2
```

Confirm: no hardcoded leading-slash internal URLs, no hex values outside `og-card.ts`'s `COLOR` object, no changes to post frontmatter or content.

- [ ] **Step 9: Commit**

```bash
git add src/layouts/PostLayout.astro "src/pages/blog/[...slug].astro"
git commit -m "feat(og): give each post its own share card"
```

---

## After the plan

Two things that are not code and must not be skipped when reporting completion:

1. **CI is the real proof for the native binary.** The `linux-x64-gnu` lockfile check in Task 2 Step 2 is a pre-flight, not a guarantee. Watch the GitHub Actions run after pushing; a failure there will be in the `withastro/action@v3` build step.
2. **LinkedIn caches OG metadata per URL for roughly 7 days.** Links already shared will keep showing `og-default.png` after this deploys. Refresh them at <https://www.linkedin.com/post-inspector/>. Tell the user this explicitly — otherwise a correct fix looks like no fix at all.

## Rollback

`git revert` the three commits. `BaseLayout`'s `image = "og-default.png"` default restores current behavior immediately. No frontmatter, content, or committed-asset changes, so nothing to unwind in the posts.
