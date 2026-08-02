# Terminal-editorial redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the Claude Design terminal-editorial language across the whole site — semantic three-theme tokens, Instrument Serif + JetBrains Mono, hairline-grid layouts, an ASCII glyph-field hero, and a keyboard command surface — without breaking static output or the JS-optional rule.

**Architecture:** Tokens are rewritten semantically so three themes can share one vocabulary. Pure logic (theme cycling, terminal commands) lives in tested `src/lib` modules; `.astro` components stay presentational. The design's SPA route-switching is re-expressed as the existing multi-page Astro routes.

**Tech Stack:** Astro 7 static, `@fontsource/instrument-serif`, JetBrains Mono, Source Serif 4, Vitest, TypeScript strict. `three` is removed.

**Spec:** `docs/superpowers/specs/2026-08-02-terminal-editorial-redesign-design.md`

## Global Constraints

- **Base path is `/me`.** Never a bare leading-slash internal URL — resolve through `href()` in `src/lib/links.ts`.
- **Colors come from `src/styles/tokens.css`.** No hex in components. The single sanctioned exception is `src/lib/og-card.ts`, which is a *format translation* (Satori cannot read CSS custom properties and cannot parse `oklch()`).
- **Satori cannot parse `oklch()`.** Verified: it renders such values as black, silently. `og-card.ts` uses the sRGB hex table in the spec.
- **Satori parses WOFF, not WOFF2.** Always the `.woff` file.
- **Self-hosted fonts only.** No Google Fonts link, no CDN, no runtime third-party request. The design's `<link href="fonts.googleapis.com">` is NOT carried over.
- **JS-optional.** Every page's content must render with JavaScript disabled. The theme switcher, command palette, terminal, konami, scroll progress, and glyph canvas are all enhancement — each must degrade silently.
- **Type roles:** `--font-display` Instrument Serif = headings; `--font-mono` JetBrains Mono = UI and body; `--font-serif` Source Serif 4 = blog article prose ONLY.
- **`npm run build`** (`astro check && astro build`) is the gate. Never bypass `astro check`.
- **Do NOT unit-test `.astro` files.** Build plus visual check covers them.
- **Content is not redesigned.** Existing copy stays; the design's placeholder text (`// FILL IN`, `Add your previous roles here`) is NOT imported.

### A note on this plan's shape

Tasks 1, 6 carry complete code: tokens, pure logic, and their tests, where exact values matter and are testable. Tasks 3–5 are page restyling — they specify the **pattern vocabulary and acceptance criteria** rather than pasting ~2,000 lines of CSS, because visual work is verified by looking at it, not by transcribing it. Every such task ends with a mandatory screenshot check. This is deliberate, not an omission.

The spec describes six phases; this plan has seven tasks. Two deliberate departures: the OG card moves **into** Task 1 (removing Inter breaks the OG endpoint, so the card's face and palette must change atomically with the tokens), and site chrome splits out of the foundation into Task 2 (it is independently reviewable and it is where the look visibly flips).

### Pattern vocabulary (referenced by Tasks 2–5)

| Pattern | Rule |
|---|---|
| **Hairline grid** | `display:grid; gap:1px; background:var(--line); border:1px solid var(--line)`, children `background:var(--bg)`. Produces table-like cells with no radius. |
| **Section header** | Two-column `grid-template-columns:200px minmax(0,1fr); gap:56px`, left cell is `01 — Label` at `font-size:11px; letter-spacing:0.2em; color:var(--dim); text-transform:uppercase`. |
| **Link row** | `grid-template-columns:120px minmax(0,1fr) 40px; gap:28px; padding:30px 0; border-top:1px solid var(--line)`, trailing `→`, hover `color:var(--accent)`. |
| **Display heading** | `font-family:var(--font-display); font-weight:400; line-height:1.02; letter-spacing:-0.02em`, fluid `clamp()`. |
| **Chip** | `border:1px solid var(--line); padding:8px 14px; font-size:12px`. No radius, no fill. |
| **Page padding** | `0 6vw`; sections `padding:90px 6vw`; first section under the fixed nav `padding-top:120px`. |

---

### Task 1: Token layer, type system, and the OG card

Everything that must change atomically. Removing `@fontsource/inter` breaks the OG endpoint (it loads Inter 800), and the palette change makes the card inconsistent — so the card moves in the same task, not later.

**Files:**
- Rewrite: `src/styles/tokens.css`
- Modify: `src/layouts/BaseLayout.astro` (font imports)
- Modify: `src/lib/og-card.ts`, `src/lib/og-card.test.ts`
- Modify: `src/pages/og/[...slug].png.ts` (font list)
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the token vocabulary `--bg --panel --fg --dim --line --accent --accent2 --font-display --font-mono --font-serif --radius`, consumed by every later task.

- [ ] **Step 1: Install Instrument Serif, remove Inter**

```bash
npm install @fontsource/instrument-serif@5.3.0 && npm uninstall @fontsource/inter
```

*Justification: Instrument Serif is the design's display face; Inter has no role in the new type system.*

- [ ] **Step 2: Rewrite `src/styles/tokens.css`**

```css
/* ─────────────────────────────────────────────────────────────
   Design tokens — single source of truth for palette and type.
   Names are SEMANTIC, not literal: --accent is green in dark and
   light themes and amber in crt, so a name like --violet would
   lie. Components reference these vars; they never hardcode hex.

   Mirrored (and translated to sRGB hex) in src/lib/og-card.ts —
   Satori reads neither CSS vars nor oklch(). Update both.
   ───────────────────────────────────────────────────────────── */
:root {
  /* ── Surfaces ── */
  --bg: #0a0a0c;
  --panel: #101014;
  --line: rgba(237, 234, 227, 0.13);

  /* ── Text ── */
  --fg: #edeae3;
  --dim: #8b8880;

  /* ── Accents ── */
  --accent: oklch(0.8 0.15 145);
  --accent2: oklch(0.8 0.15 78);

  /* ── Type families (three roles) ── */
  --font-display: "Instrument Serif", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", monospace;
  --font-serif: "Source Serif 4", Georgia, serif;

  /* ── Fluid type scale ── */
  --step--1: clamp(0.83rem, 0.78rem + 0.2vw, 0.94rem);
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.13rem);
  --step-1: clamp(1.2rem, 1.1rem + 0.5vw, 1.5rem);
  --step-2: clamp(1.5rem, 1.3rem + 1vw, 2rem);
  --step-3: clamp(1.9rem, 1.5rem + 2vw, 3rem);
  --step-4: clamp(2.3rem, 1.6rem + 3.4vw, 3.8rem);

  /* ── Layout ── */
  --measure: 74ch;
  --measure-wide: 1180px;
  --nav-h: 62px;
  /* The design has no rounded corners. Kept as tokens so the
     flattening is one line and reversible. */
  --radius: 0;
  --radius-sm: 0;

  /* ── Motion ── */
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dur: 0.45s;
}

html[data-theme="light"] {
  --bg: #f4f2ec;
  --panel: #eae7df;
  --line: rgba(20, 20, 26, 0.15);
  --fg: #14141a;
  --dim: #6b6862;
  --accent: oklch(0.52 0.15 145);
  --accent2: oklch(0.52 0.15 60);
}

html[data-theme="crt"] {
  --bg: #0b0a06;
  --panel: #12100a;
  --line: oklch(0.4 0.08 86);
  --fg: oklch(0.86 0.16 86);
  /* Design specifies 0.60 here; raised to 0.72 so body copy clears
     WCAG AA against --bg. The theme is a novelty, posts are long. */
  --dim: oklch(0.72 0.1 86);
  --accent: oklch(0.86 0.16 86);
  --accent2: oklch(0.78 0.16 45);
}
```

- [ ] **Step 3: Update font imports in `src/layouts/BaseLayout.astro`**

Replace the five `@fontsource/inter/*` imports with:

```ts
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
```

Keep the existing Source Serif 4 and JetBrains Mono imports.

- [ ] **Step 4: Write the failing OG card test**

Replace the palette expectations in `src/lib/og-card.test.ts`. Add to the existing suite:

```ts
describe("card palette", () => {
  it("uses sRGB hex, never oklch — Satori renders oklch as black", () => {
    const json = JSON.stringify(ogCard("Probe"));
    expect(json).not.toMatch(/oklch/i);
  });

  it("uses the dark-theme accent green", () => {
    expect(JSON.stringify(ogCard("Probe"))).toContain("#7bd77f");
  });

  it("sets the title in the display face", () => {
    const json = JSON.stringify(ogCard("Probe"));
    expect(json).toContain("Instrument Serif");
    expect(json).not.toContain("Inter");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
npx vitest run src/lib/og-card.test.ts
```

Expected: FAIL — the card still carries `#7b6af0` and `Inter`.

- [ ] **Step 6: Repalette `src/lib/og-card.ts`**

Replace the `COLOR` object, keeping the comment block's intent and extending it to explain the oklch translation:

```ts
// Satori reads neither CSS custom properties nor oklch(), so the palette
// is translated to sRGB hex here. These are the computed equivalents of
// the dark-theme tokens in src/styles/tokens.css — update both.
// An oklch() string passed to Satori renders BLACK, silently.
const COLOR = {
  bg: "#0a0a0c", // --bg
  fg: "#edeae3", // --fg
  dim: "#8b8880", // --dim
  line: "rgba(237, 234, 227, 0.13)", // --line
  accent: "#7bd77f", // --accent  oklch(0.80 0.15 145)
  accent2: "#f2b036", // --accent2 oklch(0.80 0.15 78)
} as const;
```

Update every reference (`COLOR.text` → `COLOR.fg`, `COLOR.textMuted` → `COLOR.dim`, `COLOR.violet` → `COLOR.accent`, `COLOR.teal` → `COLOR.accent2`, `COLOR.textDim` → `COLOR.dim`, `COLOR.violetLine` → `COLOR.line`). Remove the radial-glow `backgroundImage` — the new card is flat. Set the title element's `fontFamily` to `"Instrument Serif"` and its `fontWeight` to `400`.

Instrument Serif 400 is considerably narrower than Inter 800, so the existing 50/84/92 thresholds now under-fill the card. **Re-measure rather than guess** — the current numbers were measured, and replacing them with an estimate would silently degrade the calibration. Use the same method that produced them:

```js
// scratch script — render the title alone and read back its laid-out height
const boxes = [];
await satori(
  { type: "div", props: { style: { width: 1040, display: "flex",
      fontFamily: "Instrument Serif", fontSize: SIZE, lineHeight: 1.06,
      letterSpacing: "-0.02em" }, children: LONG_TITLE } },
  { width: 1040, height: 900, fonts, onNodeDetected: (n) => boxes.push(n) },
);
const lines = Math.round(boxes[0].height / (SIZE * 1.06));
```

Run it at 72/64/56px, derive characters-per-line, set the thresholds so no title exceeds 3 lines, and update the boundary tests plus the spec's "Title fitting" table to the measured values. Record the measurements in the task report.

- [ ] **Step 7: Load Instrument Serif in the endpoint**

In `src/pages/og/[...slug].png.ts`, replace the Inter entry in `FONTS`:

```ts
  {
    name: "Instrument Serif",
    data: fontData(
      "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff",
    ),
    weight: 400 as const,
    style: "normal" as const,
  },
```

Verified present: `@fontsource/instrument-serif@5.3.0` ships that exact filename.

- [ ] **Step 8: Run tests and build**

```bash
npx vitest run src/lib/og-card.test.ts && npm run build
```

Expected: tests PASS; `astro check` 0 errors; build completes.

- [ ] **Step 9: Look at a generated card**

Open `dist/og/what-happens-when-you-run-a-query.png`. Confirm: the eyebrow `~/harish.dev` is **visible** (this is the oklch regression check — invisible text means an oklch value leaked in), the title is in Instrument Serif and does not overflow, the rule is green→amber, and the chip and name are legible. Report what you see.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(design): semantic three-theme tokens, Instrument Serif, repaletted OG card"
```

---

### Task 2: Chrome — Nav, Footer, Eyebrow, PostCard, global.css

The site-wide look flips here. After this task every page is recognisably the new design even though page interiors are untouched.

**Files:**
- Modify: `src/styles/global.css`
- Rewrite: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/PostCard.astro`
- Modify: `src/components/Eyebrow.astro`

**Interfaces:**
- Consumes: Task 1's tokens.
- Produces: `Eyebrow` gains a `num` prop (`num="01"` renders `01 — Label`); `PostCard` renders a link row, not a card.

- [ ] **Step 1: Rework `src/styles/global.css`**

Apply, in place, keeping the file's existing comment-banner structure:

- `body` — `font-family: var(--font-mono)`, `background: var(--bg)`, `color: var(--fg)`.
- **Delete `body::before` and `body::after`** (the dot-matrix grid and aurora glows). The design's texture comes from the glyph canvas; the aurora fights it and does not exist in any of the three themes.
- Headings — `font-family: var(--font-display); font-weight: 400`.
- `.eyebrow` — keep; replace the `.violet` / `.orange` / `.teal` modifiers with a single accent treatment.
- `.card` and its three colour modifiers — replace with the **hairline grid** pattern.
- `.btn` — bordered box, no radius, no fill: `border:1px solid var(--line); padding:14px 22px; text-transform:uppercase; letter-spacing:0.14em`.
- `.tag` — the **chip** pattern.
- `table` / `th` / `td` — hairline: `border-collapse:collapse`, `1px solid var(--line)`, uppercase mono `th`.
- `.grad` — the design has no gradient text; make it `color: var(--accent); font-style: italic` and keep the class name so existing call sites keep working.
- `.prose` — `font-family: var(--font-serif)` (this is the one serif-prose surface), `max-width: var(--measure)`.
- `.prose pre.astro-code` — `background: var(--panel); border:1px solid var(--line)`, no radius.
- Keep the scroll-reveal block, the `prefers-reduced-motion` block, and `:focus-visible` unchanged.

- [ ] **Step 2: Rewrite `Nav.astro`**

Fixed 62px bar: `position:fixed; inset:0 0 auto; height:var(--nav-h); border-bottom:1px solid var(--line); background:var(--bg); z-index:40; padding:0 6vw`, flex with `justify-content:space-between`. Left: `~/harish.dev` wordmark (`~/` in `var(--accent)`). Right: uppercase tracked mono links at `opacity:0.7`, `opacity:1; color:var(--accent)` on hover and for the active page (`isActive` from `src/lib/links.ts`), then a 12px circular theme dot — `border:1px solid var(--fg); background:var(--accent)`.

The theme dot is a `<button>` with an accessible label, inert until Task 6 wires it. Keep the existing mobile nav toggle behaviour and its no-JS fallback.

`main` needs `padding-top: var(--nav-h)` since the bar is now fixed.

- [ ] **Step 3: Rewrite `Footer.astro`**

`border-top:1px solid var(--line); padding:60px 6vw 90px`, `grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:40px; align-items:end`. Left: "Let's talk." as a 40px display line plus the mailto. Right: uppercase mono link row (GitHub, LinkedIn, X, Bookshelf), right-aligned. Full-width bottom strip above a `1px solid var(--line)`: `© 2026 Harish Krishnan` left, `⌘K palette · \` terminal · T theme` right.

Keep every existing link target. Do not invent new destinations.

- [ ] **Step 4: Rewrite `PostCard.astro` as a link row**

Per the **link row** pattern: `date | title + description | →`. Title uses the display face at `clamp(24px,3vw,40px)`; description `13px; color:var(--dim); max-width:62ch`. The whole row is one `<a>`. Remove the card border, background, and radius.

- [ ] **Step 5: Add the `num` prop to `Eyebrow.astro`**

Optional `num?: string`. When present, render `{num} — {slot}`. Drop the `accent="violet|orange|teal"` prop and its call sites in favour of the single accent.

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: `astro check` 0 errors. Note: pages still using the removed `accent` prop must be updated here — search for `accent=` across `src/pages` and fix every hit.

- [ ] **Step 7: Visual check**

Serve `dist/` and screenshot the home page and one blog post at 1280×800. Confirm the fixed nav, the new palette, mono UI text, and serif article prose. Content will still be in the old page structure — that is expected at this stage. Report what you see.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(design): restyle nav, footer, post rows, and global chrome"
```

---

### Task 3: GlyphField component and the home page

**Files:**
- Create: `src/components/GlyphField.astro`
- Rewrite: `src/pages/index.astro`

**Interfaces:**
- Consumes: Task 1 tokens, Task 2 `Eyebrow` `num` prop and `PostCard` link row.
- Produces: `<GlyphField density={number} interactive={boolean} height={string} />`, reused by Task 4.

- [ ] **Step 1: Build `GlyphField.astro`**

A `<canvas>` filling its container, drawing a field of glyphs from `01<>/\{}[]()=+-*#$&%@_|~^`. Per cell, brightness comes from `sin(i*0.19+t)*cos(j*0.23-t*0.8) + sin((i+j)*0.07+t*1.4)`; cells under `0.34` are skipped. Glyphs are batched into five alpha buckets (`0.05 + k*0.055`) drawn in `--fg`; when `interactive`, cells within 260px of the pointer are drawn in `--accent` at `0.95` alpha.

Requirements:
- Read `--fg` and `--accent` via `getComputedStyle(document.documentElement)` so the canvas follows the active theme, and re-read them on theme change (Task 6 dispatches an event; listen for it defensively now).
- Cap DPR at 1.5.
- **Honour `prefers-reduced-motion`:** render one static frame instead of animating.
- **No-JS:** the canvas is decorative and empty; the hero text must be readable with the canvas blank. Give the canvas `aria-hidden="true"`.
- Clean up `requestAnimationFrame`, `pointermove`, and `resize` listeners on unmount.

*Justification: the design's signature visual, needed full-bleed and interactive on home and as a static band elsewhere.*

- [ ] **Step 2: Rewrite `src/pages/index.astro`**

Three sections:
1. **Hero** — `min-height:calc(100vh - var(--nav-h))`, `align-items:flex-end`, full-bleed `GlyphField` behind (`interactive`), content at `z-index:2` with `pointer-events:none` except the spec table. Contains: status line (accent dot · role · location · employer), the display name with the surname in `.grad` (accent italic), a two-column block of intro paragraph + spec table (`ROLE / ALSO / FOCUS / LEARNING`), and a vertical "move the cursor" label on the right edge.
2. **`01 — Now`** — section header + hairline grid of three cells.
3. **`02 — Latest writing`** — section header + `PostCard` link rows + an "All posts →" link.

**Use the existing home page's copy.** Do not import the design's text.

- [ ] **Step 3: Build and screenshot**

```bash
npm run build
```

Serve `dist/` and screenshot the home page at 1280×800 and 390×844. Confirm: glyphs visible behind the hero, name legible over them, no horizontal scroll at mobile width, hero fits the viewport. Report what you see.

- [ ] **Step 4: Verify JS-disabled**

Load the home page with JavaScript disabled. Confirm all hero text, the Now grid, and the writing rows render, and no layout collapses where the canvas is blank.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(design): ASCII glyph-field hero and home page"
```

---

### Task 4: Content pages

**Files:**
- Rewrite: `src/pages/about.astro`, `src/pages/projects.astro`, `src/pages/opensource.astro`, `src/pages/bookshelf.astro`, `src/pages/blog/index.astro`

**Interfaces:**
- Consumes: Task 3's `GlyphField`, Task 2's patterns.
- Produces: nothing consumed later.

- [ ] **Step 1: Establish the shared page-head treatment**

Every one of these pages opens with: a short `GlyphField` band (`height:200px`, `density={26}`, `interactive={false}`) behind an `Eyebrow` and a display `<h2>` at `clamp(34px,5.4vw,80px); max-width:20ch`. This is the agreed improvement over the design, which leaves these pages with a bare heading.

- [ ] **Step 2: Restyle each page body to the pattern vocabulary**

| Page | Structure |
|---|---|
| `about` | Two-column intro (prose + spec table) → `Track record` link rows → `How I work` hairline grid of three → `Toolbox` chips |
| `projects` | Hairline grid of project cells (label in accent, display title, description, footer meta) → `Case note` with a hairline stat-cell row |
| `opensource` | Hairline link rows |
| `bookshelf` | Hairline grid; keep the existing book cover images, no radius, `1px solid var(--line)` |
| `blog/index` | `PostCard` link rows |

Delete each page's `<style>` rules that duplicate what `global.css` now provides. **Preserve all existing copy and every link target.**

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `astro check` 0 errors, 8 pages built.

- [ ] **Step 4: Screenshot every page**

Serve `dist/` and capture all five at 1280×800 and 390×844. Confirm consistent rhythm across pages, no horizontal overflow, book covers intact. Report what you see, per page.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(design): restyle about, projects, open source, bookshelf, blog index"
```

---

### Task 5: Post layout

**Files:**
- Rewrite: `src/layouts/PostLayout.astro`

**Interfaces:**
- Consumes: Tasks 1–2. Must preserve the `slug` prop and the `image={`og/${slug}.png`}` forwarding added by the OG work — **removing it silently reverts every post to the default share image.**

- [ ] **Step 1: Rebuild the post shell**

- Fixed scroll-progress bar directly under the nav: `position:fixed; top:var(--nav-h); height:2px`, inner fill `background:var(--accent)`, width driven by scroll. Pure enhancement; absent without JS.
- Header: `← Writing` back link, accent kicker (`tags · N min read`), display `<h1>` at `clamp(38px,6.4vw,92px)`, then a metadata row (date · author · tags) above a `1px solid var(--line)`.
- Body: `grid-template-columns:220px minmax(0,1fr); gap:64px; max-width:var(--measure-wide)`. Left is a `position:sticky; top:110px` **Contents** list; right is the article at `max-width:var(--measure)`.
- Lead paragraph in the display face at 19px; remaining prose in `var(--font-serif)`.
- Pull quotes: `border-left:2px solid var(--accent); padding-left:26px`, display face.
- Footer: tag chips → author block → next-post link row.
- Keep the existing share links and the copy-link progressive enhancement.

- [ ] **Step 2: Generate the Contents list**

Astro's `render()` returns `headings`. Use it — do not hand-maintain a list. Render only `depth === 2`. If a post has fewer than two such headings, omit the sidebar and let the article span the full width.

- [ ] **Step 3: Build and verify the OG wiring survived**

```bash
npm run build && grep -o 'og:image" content="[^"]*"' dist/blog/*/index.html
```

Expected: two distinct per-post URLs, neither `og-default.png`. If either regressed, the `slug`/`image` forwarding was dropped — fix before continuing.

- [ ] **Step 4: Screenshot and read**

Screenshot a full post at 1280×800 and 390×844. Confirm: sticky TOC tracks, progress bar advances, prose is serif and comfortable, code blocks are readable, mobile drops to one column. Report what you see.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(design): post layout with contents sidebar and progress"
```

---

### Task 6: Command deck — theme, palette, terminal

**Files:**
- Create: `src/lib/theme.ts`, `src/lib/theme.test.ts`
- Create: `src/lib/terminal-commands.ts`, `src/lib/terminal-commands.test.ts`
- Create: `src/components/CommandDeck.astro`
- Modify: `src/layouts/BaseLayout.astro` (boot script + mount `CommandDeck`)

**Interfaces:**
- Consumes: Task 2's nav theme dot.
- Produces: `THEMES`, `nextTheme(current)`, `applyTheme(t)`; `runCommand(input)`.

- [ ] **Step 1: Write the failing tests**

`src/lib/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { THEMES, nextTheme } from "./theme";

describe("nextTheme", () => {
  it("cycles dark → light → crt → dark", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("crt");
    expect(nextTheme("crt")).toBe("dark");
  });

  it("falls back to the first theme for an unknown value", () => {
    expect(nextTheme("solarized")).toBe("dark");
  });

  it("exposes exactly the three supported themes", () => {
    expect(THEMES).toEqual(["dark", "light", "crt"]);
  });
});
```

`src/lib/terminal-commands.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runCommand } from "./terminal-commands";

describe("runCommand", () => {
  it("echoes the prompt line first", () => {
    expect(runCommand("whoami").lines[0]).toBe("harish@dev:~$ whoami");
  });

  it("lists commands for help", () => {
    expect(runCommand("help").lines.join("\n")).toContain("available commands:");
  });

  it("routes cd to a known section", () => {
    expect(runCommand("cd about").route).toBe("about");
    expect(runCommand("cd work").route).toBe("projects");
  });

  it("reports an unknown section without routing", () => {
    const r = runCommand("cd nowhere");
    expect(r.route).toBeUndefined();
    expect(r.lines.join("\n")).toContain("no such section: nowhere");
  });

  it("flags clear rather than emitting lines", () => {
    expect(runCommand("clear").clear).toBe(true);
  });

  it("reports unknown commands", () => {
    expect(runCommand("frobnicate").lines.join("\n")).toContain("command not found");
  });

  it("ignores surrounding whitespace and empty input", () => {
    expect(runCommand("   ").lines).toEqual(["harish@dev:~$ "]);
  });
});
```

- [ ] **Step 2: Run both to verify they fail**

```bash
npx vitest run src/lib/theme.test.ts src/lib/terminal-commands.test.ts
```

Expected: FAIL — modules do not resolve.

- [ ] **Step 3: Implement `src/lib/theme.ts`**

```ts
// Theme cycling. `nextTheme` is pure so it can be tested without a DOM;
// `applyTheme` is the only part that touches the document.

export const THEMES = ["dark", "light", "crt"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "hk-theme";

/** Next theme in the cycle. Unknown input restarts at the first theme. */
export function nextTheme(current: string): Theme {
  const i = THEMES.indexOf(current as Theme);
  return i === -1 ? THEMES[0] : THEMES[(i + 1) % THEMES.length];
}

/** Apply to the document, persist, and notify listeners (the glyph canvas). */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}
```

- [ ] **Step 4: Implement `src/lib/terminal-commands.ts`**

Pure `runCommand(input: string): { lines: string[]; route?: string; clear?: boolean }`. First line is always `` `harish@dev:~$ ${trimmed}` ``. Commands: `help`, `whoami`, `ls`, `cd <section>` (map `home|about|work|projects|writing|~`, `work`→`projects`), `theme`, `social`, `sudo` (→ `"nice try."`), `clear` (returns `clear: true`), default → `` `${head}: command not found — try \`help\`` ``. No DOM access.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run
```

Expected: all suites pass.

- [ ] **Step 6: Add the theme boot script to `BaseLayout.astro`**

In `<head>`, before stylesheets, `is:inline` (it must not be bundled or deferred — a deferred script paints dark first, and on a multi-page site that flash happens on every click):

```astro
<script is:inline>
  try {
    var t = localStorage.getItem("hk-theme");
    if (t === "light" || t === "crt") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
</script>
```

- [ ] **Step 7: Build `CommandDeck.astro`**

Owns one `keydown` listener and both overlays:
- `⌘K` / `Ctrl+K` → palette; `` ` `` → terminal; `T` → cycle theme; `Escape` → close both. `T` and `` ` `` must not fire while focus is in an `input` or `textarea`.
- Konami sequence → set `data-glitch="1"` on `<html>` for 1200ms.
- Scroll progress: update the `PostLayout` bar if present, on a passive scroll listener.
- Palette: fixed overlay, `--panel` sheet, filter input, rows of `{label, hint}`. **Every navigation row is a real `<a href>`** resolved through `href()`, so it works if JS half-loads and is crawlable.
- Terminal: bottom sheet at `44vh`, log area, `harish@dev:~$` prompt, blinking accent caret. Feed input through `runCommand`; on a `route` result, navigate via `href()`.
- Wire the nav theme dot to `applyTheme(nextTheme(current))`.
- The whole component renders hidden and inert; without JS nothing appears and nothing breaks.

*Justification: one keydown listener must own ⌘K, backtick, T, Escape, and konami. Splitting palette and terminal into separate components means two scripts competing for the same events and duplicated Escape handling.*

- [ ] **Step 8: Build and exercise every binding**

```bash
npm run build
```

Serve `dist/`. Verify by driving the browser: ⌘K opens and filters, Escape closes, `` ` `` opens the terminal, `help` / `whoami` / `cd about` / `clear` behave, `T` cycles all three themes, the theme survives a reload with no flash, and the glyph canvas recolours on theme change. Report each result.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(design): command palette, terminal, and theme switching"
```

---

### Task 7: Remove three.js and verify the whole site

**Files:**
- Delete: `src/components/HeroVisual.astro`, `src/components/MotifHero.astro`, `src/components/PageHero.astro`
- Modify: `package.json`

- [ ] **Step 1: Confirm nothing imports them**

```bash
grep -rn "HeroVisual\|MotifHero\|PageHero\|from \"three\"\|from 'three'" src/ || echo "CLEAN"
```

Expected: `CLEAN`. Any hit must be resolved before deleting.

- [ ] **Step 2: Delete the components and the dependency**

```bash
rm src/components/HeroVisual.astro src/components/MotifHero.astro src/components/PageHero.astro
npm uninstall three @types/three
```

- [ ] **Step 3: Build and compare bundle size**

```bash
npm run build && du -sh dist/ && ls dist/_astro/ | wc -l
```

Expected: build clean; a materially smaller `dist/`. Record the number.

- [ ] **Step 4: Full-site verification pass**

For each of the 8 pages, at 1280×800 and 390×844, in all three themes:
- content renders, no horizontal scroll, no unstyled flash
- then repeat one full pass with **JavaScript disabled**: every page's content readable, all links working, no empty regions where the canvas or overlays would be

Report a table of results. Any failure is a blocker, not a note.

- [ ] **Step 5: Run the full suite**

```bash
npm test && npm run build
```

- [ ] **Step 6: Review the whole diff**

```bash
git diff ebbf1d1..HEAD --stat
```

Confirm: no hardcoded leading-slash internal URLs, no hex outside `og-card.ts`, no `oklch()` in `og-card.ts`, no Google Fonts link, no remaining `--violet`/`--teal` references.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore(design): remove three.js heroes and unused dependencies"
```

---

## After the plan

- **LinkedIn caches OG data ~7 days.** The repaletted cards will not appear on already-shared links until refreshed via <https://www.linkedin.com/post-inspector/>.
- **`oklch()` needs Safari 15.4+.** Accepted; no fallback.
- The CRT theme remains the lowest-contrast of the three even after the `0.72` adjustment.

## Rollback

Each task is one commit and a coherent revert point. `git revert` of the range restores the previous design. Reverting `tokens.css` alone recovers most of the old look, since the palette carries the majority of the visual identity.
