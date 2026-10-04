# Essayist Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole site into the approved "Essayist + Quiet dark" design: one serif reading column, light paper by default, a quiet dark theme behind a nav toggle, and no terminal gimmicks.

**Architecture:** Token values change in `tokens.css` (names stay), `body` switches to the serif, and a small set of shared primitives in `global.css` (`.column`, `.section-head`, `.entry-list`, `.dash-list`, `.tech-list`, `.page-section`) replaces each page's bespoke grid CSS. The interactive layer (`GlyphField`, `CommandDeck`, terminal) is deleted; the theme toggle moves into `Nav`. Logic changes (`theme.ts`, `og-card.ts`) are test-first.

**Tech Stack:** Astro 7 (static), Vitest, `@fontsource` (Source Serif 4, JetBrains Mono), Satori + resvg for OG cards.

**Spec:** `docs/superpowers/specs/2026-10-04-essayist-redesign-design.md`

## Global Constraints

- Work on branch `redesign/essayist`. Never commit to `master`.
- Every internal URL goes through `href()` from `src/lib/links.ts`. Never write a bare leading-slash internal URL.
- Colours only via `var(--…)` tokens from `src/styles/tokens.css`. No hex in components. Token **names never change**; only values. One new token: `--fg-soft`.
- Font roles: `--font-display` = `--font-serif` = Source Serif 4; `--font-mono` = JetBrains Mono, only for dates, tags, section labels, nav toggle, table headers, code.
- Themes: `light` (default, no attribute needed) and `dark` (`html[data-theme="dark"]`). No `prefers-color-scheme` block. Storage key stays `hk-theme`.
- Theme boot `<script is:inline>` in `BaseLayout.astro` stays inline and before stylesheets.
- Content must render with JavaScript disabled.
- No new scroll-reveal (`.reveal`) in new markup; the approved mockup has no motion.
- Copy stays verbatim unless a task says a section heading is replaced by its label.
- No new dependencies. Only addition: the import `@fontsource/source-serif-4/500.css` (package already installed).
- Commits are GPG-signed; `~/.gnupg` is blocked by the sandbox, so run `git commit` with the sandbox disabled.
- Use `command grep` (not `grep`) in checks, so the shell's grep rewrite hook does not alter output.
- Commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## File map

| File | Change | Responsibility after the change |
|---|---|---|
| `src/lib/theme.ts` (+ test) | Modify | Two-theme cycle; apply + persist |
| `src/styles/tokens.css` | Rewrite values | Light `:root`, dark `[data-theme="dark"]` |
| `src/styles/global.css` | Modify | Base type + shared layout primitives |
| `src/layouts/BaseLayout.astro` | Modify | Fonts, boot script, theme-color; no `CommandDeck` |
| `src/components/Nav.astro` | Modify | Brand, links, theme toggle (owns toggle script) |
| `src/lib/links.ts` | Modify | `navLinks` order, no "Home" |
| `src/components/Footer.astro` | Rewrite | Quiet mono footer, same links |
| `src/components/{CommandDeck,GlyphField}.astro` | Delete | — |
| `src/lib/terminal-commands.ts` (+ test) | Delete | — |
| `src/components/Eyebrow.astro` | Modify | Label only, no `num` |
| `src/components/PageHead.astro` | Rewrite | Label + serif title in the column |
| `src/components/PostCard.astro` | Rewrite | Essayist post row |
| `src/data/projects.ts` | Create | One source for project data (home + projects page) |
| `src/pages/index.astro` | Rewrite template + styles | Essayist home |
| `src/pages/blog/index.astro` | Modify | Column + post rows |
| `src/layouts/PostLayout.astro` | Modify (small) | Tag chips → `#tag` text |
| `src/pages/{about,projects,opensource,bookshelf}.astro` | Rewrite template + styles | Column layout; data unchanged |
| `src/lib/og-card.ts` (+ test), `src/pages/og/[...slug].png.ts` | Modify | New dark palette, Source Serif 4, new thresholds |
| `package.json` | Modify | Remove `@fontsource/instrument-serif` |
| `CLAUDE.md` | Modify | Document new themes, fonts, components |

---

### Task 1: Two-theme logic

**Files:**
- Modify: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Produces: `THEMES = ["light", "dark"] as const`, `type Theme`, `nextTheme(current: string): Theme`, `applyTheme(theme: Theme): void` (sets `data-theme`, writes `localStorage["hk-theme"]`; no event). Task 3 calls these from `Nav`.

- [ ] **Step 1: Write the failing test** — replace the whole file `src/lib/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { THEMES, nextTheme } from "./theme";

describe("nextTheme", () => {
  it("cycles light → dark → light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("falls back to light for an unknown value, including the retired crt theme", () => {
    expect(nextTheme("crt")).toBe("light");
    expect(nextTheme("solarized")).toBe("light");
  });

  it("exposes exactly the two supported themes, light first", () => {
    expect(THEMES).toEqual(["light", "dark"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: FAIL — `nextTheme("light")` returns `"crt"`, and `THEMES` equals `["dark","light","crt"]`.

- [ ] **Step 3: Implement** — replace the whole file `src/lib/theme.ts`:

```ts
// Theme cycling. `nextTheme` is pure so it can be tested without a DOM;
// `applyTheme` is the only part that touches the document.

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "hk-theme";

/** Next theme in the cycle. Unknown input restarts at the first theme. */
export function nextTheme(current: string): Theme {
  const i = THEMES.indexOf(current as Theme);
  return i === -1 ? THEMES[0] : THEMES[(i + 1) % THEMES.length];
}

/** Apply to the document and persist. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Confirm nothing else breaks.** `GlyphField` listens for `themechange`; it will simply never fire until the component is deleted in Task 5. Run `npm run build`. Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat(theme): two themes, light first; drop crt and the themechange event

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tokens, base typography, fonts, theme boot

**Files:**
- Rewrite: `src/styles/tokens.css`
- Modify: `src/styles/global.css` (`body`, headings, `.eyebrow`, `.intro-deck`, `.tag`, `.tag-row`)
- Modify: `src/layouts/BaseLayout.astro:3-9` (font imports), `:78` (theme-color), `:127-132` (boot script)

**Interfaces:**
- Produces: token `--fg-soft`; every existing token name keeps a value in both themes. Global classes `.tag` (mono `#tag` text) and `.intro-deck` (serif lede) used by later tasks.

- [ ] **Step 1: Rewrite `src/styles/tokens.css`** (whole file):

```css
/* ─────────────────────────────────────────────────────────────
   Design tokens — single source of truth for palette and type.
   Names are SEMANTIC, not literal: --accent is deep green on
   light paper and soft green on dark. Components reference these
   vars; they never hardcode hex.

   Light is the default (:root). Dark applies only through
   html[data-theme="dark"], set by the boot script in BaseLayout.
   There is deliberately no prefers-color-scheme block.

   The DARK values are mirrored as hex in src/lib/og-card.ts —
   Satori reads no CSS vars. Update both.
   ───────────────────────────────────────────────────────────── */
:root {
  color-scheme: light;

  /* ── Surfaces ── */
  --bg: #f6f5f0;
  --panel: #edece5;
  /* --line is a hairline for dividers, where WCAG 1.4.11 does not apply.
     Boundaries that IDENTIFY an interactive control need 3:1 against --bg:
     use --line-strong for those (3.04:1 here). */
  --line: #dad9d1;
  --line-strong: #8c8e87;

  /* ── Text ── */
  --fg: #1b1c1a;
  --fg-soft: #474a45; /* secondary running text: ledes, descriptions */
  --dim: #646761; /* metadata labels; 4.85:1 on --panel */

  /* ── Accents ── */
  --accent: #2e6a50;
  --accent2: #8a5300;

  /* ── Type families (three roles; display and serif share a face) ── */
  --font-display: "Source Serif 4", Georgia, serif;
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
  /* 74ch of Source Serif 4 at --step-0 is ~680px: the reading column. */
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

html[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0f1012;
  --panel: #16181b;
  --line: #26282d;
  --line-strong: #5f6168; /* 3.08:1 on --bg */
  --fg: #ebe8e2;
  --fg-soft: #a9a69f;
  --dim: #8d8a84;
  --accent: #84b8a0;
  --accent2: #d9a55b;
}
```

- [ ] **Step 2: Update `src/styles/global.css`** — these exact replacements:

In the `body` rule, replace
```css
  font-family: var(--font-mono);
  font-size: var(--step-0);
  line-height: 1.7;
```
with
```css
  font-family: var(--font-serif);
  font-size: var(--step-0);
  line-height: 1.6;
```

In the `h1, h2, h3, h4` rule, replace `letter-spacing: -0.02em;` with `letter-spacing: -0.012em;`.

Replace the whole `.eyebrow` rule with:
```css
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: inline-block;
  color: var(--dim);
  font-variant-numeric: tabular-nums;
}
```

Replace the whole `/* ── Tag chips ── */` block (`.tag` and `.tag-row`) with:
```css
/* ── Tags — mono #tag text, no chips ── */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.9rem;
  list-style: none;
}
.tag {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--dim);
}
.tag::before {
  content: "#";
  opacity: 0.6;
}
```

Replace the whole `.intro-deck` rule with:
```css
.intro-deck {
  font-family: var(--font-serif);
  font-size: var(--step-1);
  line-height: 1.55;
  color: var(--fg-soft);
  max-width: 34em;
}
```

- [ ] **Step 3: Update `src/layouts/BaseLayout.astro`**

Replace lines 3–9 (the font imports) with:
```ts
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/400-italic.css";
import "@fontsource/source-serif-4/500.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
```

Replace `<meta name="theme-color" content="#0a0a0c" />` with `<meta name="theme-color" content="#f6f5f0" />`.

Replace the boot script body:
```html
    <script is:inline>
      try {
        if (localStorage.getItem("hk-theme") === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } catch (e) {}
    </script>
```
Update the comment above it: "this runs on every click — a deferred script means every page shows light briefly before switching to dark". Keep the script where it is (before `<link rel="icon">`, after meta tags; no stylesheet link precedes it).

- [ ] **Step 4: Dangling-token check** (must print nothing)

```bash
bash -c "comm -23 <(command grep -rhoE 'var\(--[a-z0-9-]+' src | sed 's/var(//' | sort -u) <(command grep -oE '^\s*--[a-z0-9-]+' src/styles/tokens.css | tr -d ' ' | sort -u)"
```
Expected: no output.

- [ ] **Step 5: Build** — `npm run build`. Expected: exits 0. (Pages still look half-old; `@fontsource/instrument-serif` stays installed until Task 10 because the OG route still loads its file.)

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/global.css src/layouts/BaseLayout.astro
git commit -m "feat(design): light-first tokens, serif body, quiet dark theme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Nav toggle, footer, delete the command deck

**Files:**
- Modify: `src/components/Nav.astro`
- Modify: `src/lib/links.ts` (`navLinks`)
- Rewrite: `src/components/Footer.astro`
- Modify: `src/layouts/BaseLayout.astro` (remove `CommandDeck`)
- Delete: `src/components/CommandDeck.astro`, `src/lib/terminal-commands.ts`, `src/lib/terminal-commands.test.ts`

**Interfaces:**
- Consumes: `nextTheme`, `applyTheme` from Task 1.
- Produces: `.theme-toggle` button in `Nav`; no other file wires theme switching.

- [ ] **Step 1: Check who imports what you will delete**

Run: `command grep -rn "CommandDeck\|terminal-commands\|navLinks" src`
Expected: only `BaseLayout.astro` (CommandDeck), `CommandDeck.astro` (terminal-commands, maybe navLinks), `terminal-commands*.ts`, `Nav.astro` and `links.ts` (navLinks). If anything else appears, stop and report.

- [ ] **Step 2: Delete the deck**

```bash
git rm src/components/CommandDeck.astro src/lib/terminal-commands.ts src/lib/terminal-commands.test.ts
```
In `BaseLayout.astro` delete `import CommandDeck from "../components/CommandDeck.astro";` and `<CommandDeck />`.

- [ ] **Step 3: Update `navLinks` in `src/lib/links.ts`** — replace the array and its comment:

```ts
// Bookshelf is intentionally not in the primary nav — it's reachable from
// the footer. The brand link goes home, so there is no "Home" item.
export const navLinks: NavLink[] = [
  { label: "Writing", path: "blog" },
  { label: "Projects", path: "projects" },
  { label: "Open Source", path: "opensource" },
  { label: "About", path: "about" },
  {
    label: "LinkedIn",
    path: "https://www.linkedin.com/in/harishkrishnan1993/",
    external: true,
  },
];
```

- [ ] **Step 4: Update `src/components/Nav.astro`**

Replace the brand anchor with:
```astro
    <a class="brand" href={href("")}>Harish Krishnan</a>
```
Replace `<button class="theme-dot" aria-label="Cycle theme"></button>` with:
```astro
    <button class="theme-toggle" type="button" aria-label="Switch to dark theme">Dark</button>
```

In `<style>`, replace the `.brand` and `.brand-slash` rules with:
```css
  .brand {
    font-family: var(--font-serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--fg);
    white-space: nowrap;
  }
```
Replace the `.nav-links a` rule and its `:hover`/`[aria-current]` rules with:
```css
  .nav-links a {
    font-family: var(--font-serif);
    font-size: 16px;
    color: var(--fg-soft);
    padding: 6px 10px;
    transition: color 0.15s var(--ease);
  }
  .nav-links a:hover,
  .nav-links a:focus-visible {
    color: var(--accent);
  }
  .nav-links a[aria-current="page"] {
    color: var(--fg);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.25em;
  }
```
Replace the `/* Theme dot — wired in Task 6 */` block (`.theme-dot` and `.theme-dot:hover`) with:
```css
  .theme-toggle {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--fg-soft);
    background: transparent;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 3px 12px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .theme-toggle:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
```
In the `@media (max-width: 720px)` block: rename `.theme-dot` to `.theme-toggle`, and replace its comment with `/* the toggle stays visible on mobile — it is the only way to change theme. */`. Fix the `.nav-details` `order` comment to `/* after brand and toggle */`.

Append to the existing `<script>`:
```ts
  import { applyTheme, nextTheme } from "../lib/theme";

  const themeToggle = document.querySelector<HTMLButtonElement>(".theme-toggle");
  if (themeToggle) {
    // The label names the action, so it flips with the theme.
    const syncLabel = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      themeToggle.textContent = dark ? "Light" : "Dark";
      themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    };
    themeToggle.addEventListener("click", () => {
      applyTheme(nextTheme(document.documentElement.getAttribute("data-theme") ?? "light"));
      syncLabel();
    });
    syncLabel();
  }
```
Move the `import` line to the top of the `<script>` block (imports must come first).

- [ ] **Step 5: Rewrite `src/components/Footer.astro`** (whole file). The "Let's talk." headline and the `⌘K palette · \` terminal` hint go; every link stays.

```astro
---
import { href } from "../lib/links";

const year = 2026;
---

<footer class="site-footer">
  <div class="column footer-inner">
    <p class="footer-line">
      <span>© {year} Harish Krishnan</span>
      <a href="mailto:harishkrishnan1993@gmail.com">harishkrishnan1993@gmail.com</a>
    </p>
    <nav class="footer-links" aria-label="Footer links">
      <a href="https://github.com/harishkrishnan24" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="https://www.linkedin.com/in/harishkrishnan1993/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="https://x.com/harishkforu" target="_blank" rel="noopener noreferrer">X</a>
      <a href={href("bookshelf")}>Bookshelf</a>
    </nav>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--line);
    padding-block: 1.5rem 3rem;
  }
  .footer-inner,
  .footer-line,
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
  }
  .footer-inner {
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--dim);
  }
  .site-footer a {
    color: var(--dim);
    overflow-wrap: anywhere;
  }
  .site-footer a:hover {
    color: var(--accent);
  }
</style>
```
`.column` does not exist yet; it is added in Task 4. Until then the footer is full width — acceptable for one task.

- [ ] **Step 6: Tests and build**

Run: `npm test` — Expected: all pass (terminal-commands tests are gone).
Run: `npm run build` — Expected: exits 0.

- [ ] **Step 7: Manual check** — `npm run dev`, open `http://localhost:4321/me/`. Click **Dark**: page turns dark, label becomes **Light**. Reload: still dark. Click **Light**, reload: light. Press ⌘K and backtick: nothing happens.

- [ ] **Step 8: Commit**

```bash
git add -A src/components src/lib src/layouts
git commit -m "feat(nav): text theme toggle in the nav; delete command deck and terminal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shared primitives, PageHead, PostCard

**Files:**
- Modify: `src/styles/global.css` (append primitives)
- Rewrite: `src/components/PageHead.astro`
- Rewrite: `src/components/PostCard.astro`

**Interfaces:**
- Produces global classes: `.column`, `.page-section`, `.section-head` (contains `h2` + optional `a`), `.entry-list` > `.entry` with `.entry-title` and `.entry-meta`, `.dash-list`, `.tech-list`, `.group-label`.
- `PageHead` props unchanged: `{ eyebrow: string }` + default slot (title).
- `PostCard` props unchanged: `{ id, title, description, date, tags, draft? }`; root element is `<article class="post-row">`; callers wrap rows in any block (`<div>`).

- [ ] **Step 1: Append to `src/styles/global.css`** (before the `/* ── Scroll-reveal` block):

```css
/* ── Reading column — the one layout every content page uses ── */
.column {
  width: 100%;
  max-width: calc(var(--measure) + 80px);
  margin-inline: auto;
  padding-inline: clamp(18px, 4vw, 40px);
}
.page-section {
  padding-block-end: clamp(48px, 8vw, 72px);
}

/* ── Section label row: mono label, optional "all →" link, ink rule ── */
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--fg);
}
.section-head h2 {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.4;
}
.section-head a {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--dim);
}
.section-head a:hover {
  color: var(--accent);
}

/* ── Hairline entry list (projects, jobs, repos, books) ── */
.entry-list {
  list-style: none;
}
.entry {
  padding-block: 1.5rem;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 0.5rem;
}
.entry:last-child {
  border-bottom: 0;
}
.entry-title {
  font-size: var(--step-1);
  font-weight: 500;
  line-height: 1.3;
}
.entry-title a {
  color: var(--fg);
}
.entry-title a:hover {
  color: var(--accent);
}
.entry-meta {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--dim);
  font-weight: 400;
}
.entry p {
  color: var(--fg-soft);
}

/* ── Lists ── */
.dash-list {
  list-style: none;
}
.dash-list li {
  position: relative;
  padding: 0.3rem 0 0.3rem 1.5rem;
}
.dash-list li::before {
  content: "";
  position: absolute;
  left: 0.15rem;
  top: 1.05em;
  width: 0.6rem;
  height: 1px;
  background: var(--accent);
}
.tech-list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--dim);
}
.group-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dim);
  margin-block: 1.5rem 0.5rem;
}
```

- [ ] **Step 2: Rewrite `src/components/PageHead.astro`** (whole file):

```astro
---
// Page heading for content pages: mono label above a serif title,
// inside the reading column.
import Eyebrow from "./Eyebrow.astro";

interface Props {
  eyebrow: string;
}

const { eyebrow } = Astro.props;
---

<header class="page-head column">
  <Eyebrow>{eyebrow}</Eyebrow>
  <h1 class="page-title"><slot /></h1>
</header>

<style>
  .page-head {
    display: grid;
    gap: 1rem;
    padding-block: clamp(56px, 9vw, 96px) clamp(32px, 5vw, 48px);
  }
  h1.page-title {
    font-size: var(--step-4);
    font-weight: 400;
    line-height: 1.08;
    letter-spacing: -0.015em;
  }
</style>
```

- [ ] **Step 3: Rewrite `src/components/PostCard.astro`** (whole file):

```astro
---
import { href } from "../lib/links";

interface Props {
  id: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  draft?: boolean;
}
const { id, title, description, date, tags, draft } = Astro.props;
const dateLabel = date.toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const isoDate = date.toISOString().slice(0, 10);
---

<article class="post-row">
  <time class="post-date" datetime={isoDate}>{dateLabel}</time>
  <div class="post-body">
    <h3 class="post-title">
      <a href={href(`blog/${id}`)}>{title}</a>
      {draft && <span class="post-draft">draft</span>}
    </h3>
    <p class="post-desc">{description}</p>
    {
      tags.length > 0 && (
        <ul class="tag-row">
          {tags.slice(0, 3).map((t) => (
            <li class="tag">{t}</li>
          ))}
        </ul>
      )
    }
  </div>
</article>

<style>
  .post-row {
    display: grid;
    grid-template-columns: 6.5rem 1fr;
    column-gap: 1.75rem;
    padding-block: 1.75rem;
    border-bottom: 1px solid var(--line);
  }
  .post-row:last-child {
    border-bottom: 0;
  }
  .post-date {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--dim);
    padding-top: 0.45rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .post-body {
    min-width: 0;
  }
  .post-title {
    font-size: var(--step-2);
    font-weight: 500;
    line-height: 1.2;
    margin-bottom: 0.4rem;
  }
  .post-title a {
    color: var(--fg);
  }
  .post-title a:hover {
    color: var(--accent);
  }
  .post-draft {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent2);
    margin-left: 0.5rem;
  }
  .post-desc {
    color: var(--fg-soft);
    line-height: 1.55;
    margin-bottom: 0.75rem;
  }
  @media (max-width: 600px) {
    .post-row {
      grid-template-columns: 1fr;
      padding-block: 1.5rem;
    }
    .post-date {
      padding: 0 0 0.45rem;
    }
  }
</style>
```

- [ ] **Step 4: Build** — `npm run build`. Expected: exits 0. (`GlyphField` is now used only by `index.astro`.)

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/PageHead.astro src/components/PostCard.astro
git commit -m "feat(design): reading-column primitives, plain page head, essayist post row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Projects data module and the home page

**Files:**
- Create: `src/data/projects.ts`
- Modify: `src/pages/projects.astro` (frontmatter only: import data)
- Rewrite: `src/pages/index.astro` (whole file)
- Modify: `src/components/Eyebrow.astro` (drop `num`)
- Delete: `src/components/GlyphField.astro`

**Interfaces:**
- Produces: `src/data/projects.ts` exports `interface ProjectLink { label: string; url: string }`, `interface Project { title; summary; description; highlights: string[]; tech: string[]; links: ProjectLink[] }`, `const projects: Project[]`. Task 8 consumes it.
- `Eyebrow` props become `{}` (slot only).

- [ ] **Step 1: Create `src/data/projects.ts`.** Move the `ProjectLink` and `Project` interfaces and the `projects` array from `src/pages/projects.astro` frontmatter (currently lines 5–62) **verbatim**, adding `export` to each:

```ts
// Project data shared by the home page ("Selected projects") and /projects.
export interface ProjectLink {
  label: string;
  url: string;
}
export interface Project {
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  tech: string[];
  links: ProjectLink[];
}

export const projects: Project[] = [
  // …the two existing entries, unchanged…
];
```
(The two entries are "Monkey Language Interpreter" and "Redux, From Scratch"; copy every field exactly.)

- [ ] **Step 2: Point `projects.astro` at it.** Delete the moved interfaces and array from its frontmatter and add `import { projects } from "../data/projects";`. Run `npm run build`; expected exit 0 and `/projects` unchanged.

- [ ] **Step 3: Simplify `src/components/Eyebrow.astro`** (whole file):

```astro
---
// A small mono uppercase label for page and entry metadata.
---

<span class="eyebrow"><slot /></span>
```

- [ ] **Step 4: Rewrite `src/pages/index.astro`** (whole file). Section headings become labels (Writing, Selected projects, Now, Contact) per the approved mockup; all other copy is verbatim from the current page.

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";
import Eyebrow from "../components/Eyebrow.astro";
import PostCard from "../components/PostCard.astro";
import { projects } from "../data/projects";
import { href } from "../lib/links";
import { sortByDateDesc, visiblePosts } from "../lib/posts";

const all = await getCollection("blog");
const latest = sortByDateDesc(visiblePosts(all, import.meta.env.DEV)).slice(0, 5);

const nowItems = [
  "Building Usage Data solutions at DigitalRoute",
  "Going deep on Generative AI, ML & distributed systems",
  "Learning Go and Rust for efficient, scalable systems",
  "Writing essays and recording Udemy courses",
];
---

<BaseLayout title="Harish Krishnan">
  <div class="column">
    <header class="intro">
      <Eyebrow>Software Engineer · Stockholm · DigitalRoute</Eyebrow>
      <h1>
        Engineering software, and rethinking how it's built
        <span class="accent-em">in the age of AI.</span>
      </h1>
      <p class="intro-deck">
        I care about systems that are fast, correct, and a pleasure to use — and
        about what changes when AI becomes part of how we build them.
      </p>
    </header>

    <section class="page-section" aria-labelledby="writing-h">
      <div class="section-head">
        <h2 id="writing-h">Writing</h2>
        <a href={href("blog")}>All essays →</a>
      </div>
      {
        latest.length > 0 ? (
          <div>
            {latest.map((p) => (
              <PostCard
                id={p.id}
                title={p.data.title}
                description={p.data.description}
                date={p.data.date}
                tags={p.data.tags}
                draft={p.data.draft}
              />
            ))}
          </div>
        ) : (
          <p class="empty-state">First post coming soon.</p>
        )
      }
    </section>

    <section class="page-section" aria-labelledby="projects-h">
      <div class="section-head">
        <h2 id="projects-h">Selected projects</h2>
        <a href={href("projects")}>All projects →</a>
      </div>
      <ul class="entry-list">
        {
          projects.map((project) => (
            <li class="entry">
              <h3 class="entry-title">
                <a href={href("projects")}>{project.title}</a>{" "}
                <span class="entry-meta">{project.tech.join(" · ")}</span>
              </h3>
              <p>{project.summary}</p>
            </li>
          ))
        }
      </ul>
    </section>

    <section class="page-section" aria-labelledby="now-h">
      <div class="section-head">
        <h2 id="now-h">Now</h2>
      </div>
      <ul class="dash-list now-list">
        {nowItems.map((item) => <li>{item}</li>)}
      </ul>
    </section>

    <section class="page-section" aria-labelledby="contact-h">
      <div class="section-head">
        <h2 id="contact-h">Contact</h2>
      </div>
      <p class="contact-blurb">
        Open to conversations about engineering, AI systems, collaboration — or
        just connecting with fellow developers.
      </p>
      <ul class="contact-links">
        <li>
          <a href="mailto:harishkrishnan1993@gmail.com">harishkrishnan1993@gmail.com</a>
        </li>
        <li>
          <a href="https://github.com/harishkrishnan24" target="_blank" rel="noopener noreferrer">github.com/harishkrishnan24</a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/harishkrishnan1993/" target="_blank" rel="noopener noreferrer">linkedin.com/in/harishkrishnan1993</a>
        </li>
        <li>
          <a href="https://x.com/harishkforu" target="_blank" rel="noopener noreferrer">x.com/harishkforu</a>
        </li>
      </ul>
    </section>
  </div>
</BaseLayout>

<style>
  .intro {
    display: grid;
    gap: 1.25rem;
    padding-block: clamp(56px, 10vw, 96px) clamp(40px, 7vw, 72px);
  }
  .intro h1 {
    font-size: var(--step-4);
    font-weight: 400;
    line-height: 1.08;
    letter-spacing: -0.015em;
  }
  .now-list,
  .contact-blurb {
    padding-top: 1rem;
  }
  .contact-blurb {
    color: var(--fg-soft);
  }
  .contact-links {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    padding-top: 0.75rem;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .contact-links a {
    overflow-wrap: anywhere;
  }
  .empty-state {
    color: var(--dim);
    padding-top: 1rem;
  }
</style>
```

- [ ] **Step 5: Delete `GlyphField`**

Run: `command grep -rn "GlyphField" src` — expected: only `src/components/GlyphField.astro` itself.
Then: `git rm src/components/GlyphField.astro`

- [ ] **Step 6: Build and check** — `npm run build`, expected exit 0. Then `npm run dev`, open `/me/` and compare with the approved mockup in light and dark, at desktop and 375px wide.

- [ ] **Step 7: Commit**

```bash
git add -A src/data src/pages/index.astro src/pages/projects.astro src/components
git commit -m "feat(home): essayist home page; shared project data; delete glyph field

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Blog index and post page

**Files:**
- Modify: `src/pages/blog/index.astro`
- Modify: `src/layouts/PostLayout.astro` (tag rows only)

- [ ] **Step 1: `src/pages/blog/index.astro`** — replace everything after the frontmatter with:

```astro
<BaseLayout
  title="Writing"
  description="Essays on software engineering, AI systems, and the craft — by Harish Krishnan."
>
  <PageHead eyebrow="The Writing">Notes on building software.</PageHead>

  <div class="column page-section">
    <p class="intro-deck">
      Essays on architecture, AI systems, and the craft. Self-hosted, no
      tracking, no paywall.
    </p>
    {
      posts.length === 0 ? (
        <p class="empty">No posts yet — first one is coming.</p>
      ) : (
        <div class="post-list">
          {posts.map((p) => (
            <PostCard
              id={p.id}
              title={p.data.title}
              description={p.data.description}
              date={p.data.date}
              tags={p.data.tags}
              draft={p.data.draft}
            />
          ))}
        </div>
      )
    }
  </div>
</BaseLayout>

<style>
  .post-list {
    margin-top: clamp(24px, 4vw, 40px);
    border-top: 1px solid var(--fg);
  }
  .empty {
    color: var(--dim);
    margin-top: clamp(24px, 4vw, 40px);
  }
</style>
```

- [ ] **Step 2: `PostLayout.astro` tags.** The two tag rows (`.header-tags` around line 86, `.footer-tags` around line 139) render `<div class="tag-row …">` with `<span class="tag">`. Change each to `<ul class="tag-row …">` with `<li class="tag">`. Read the style block (from line ~240) and delete any rule that gives `.tag` inside the post a border, padding, or uppercase — the global `.tag` now renders `#tag` text. Keep `.meta-sep` behaviour.

- [ ] **Step 3: Check the post page in both themes** — `npm run dev`, open `/me/blog/the-memory-wall/`. Check: title in Source Serif 4, tags as `#gpu #cuda …`, the diagrams readable in light and dark (they use `--accent2` and `--line-strong`), code blocks readable in both.

- [ ] **Step 4: Build** — `npm run build`, expected exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/pages/blog/index.astro src/layouts/PostLayout.astro
git commit -m "feat(blog): column blog index; #tag text on post pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: About page

**Files:**
- Modify: `src/pages/about.astro` — frontmatter data (lines 1–247) stays except removing the now-unused `Eyebrow` import if unused; template and `<style>` are replaced.

The "at a glance" spec table, the chip grid and the decorative section `h2`s ("What I work with", "Verified credentials", "Where I've worked", "Away from the keyboard (mostly)", "A learning-first mindset", "Always up for a good conversation") are removed; each section keeps its label as the `section-head` `h2`. All paragraph copy is verbatim.

- [ ] **Step 1: Replace the template** (from `<BaseLayout` to the end of the file, including `<style>`) with:

```astro
<BaseLayout
  title="About"
  description="Harish Krishnan — software engineer based in Stockholm. Background, skills, work experience, and the craft."
>
  <PageHead eyebrow="About · Software Engineer · Stockholm">A perpetual student of the craft.</PageHead>

  <div class="column">
    <section class="page-section">
      <p class="intro-deck">
        Software engineer based in Stockholm with experience across startups and
        enterprise. I build applications, teach, and write — and I'm always
        learning what comes next.
      </p>
      <div class="prose about-body">
        <!-- the two existing "about-body" paragraphs, verbatim ("I'm Harish Krishnan, …" and "Currently, I'm focused …") -->
      </div>
    </section>

    <section class="page-section" aria-labelledby="skills-h">
      <div class="section-head"><h2 id="skills-h">Technical skills</h2></div>
      <h3 class="group-label">Languages</h3>
      <ul class="tech-list">
        {languages.map((l) => <li>{l}</li>)}
      </ul>
      <h3 class="group-label">Technologies &amp; frameworks</h3>
      <ul class="tech-list">
        {
          tech.map((t) => (
            <li>
              {t.label}
              {t.learning && <span class="learning"> (learning)</span>}
            </li>
          ))
        }
      </ul>
    </section>

    <section class="page-section" aria-labelledby="certs-h">
      <div class="section-head"><h2 id="certs-h">Certifications</h2></div>
      <p class="section-text">
        My professional certifications are issued and verified on Credly.
        <a
          href="https://www.credly.com/users/harish-krishnan.623b2d03"
          target="_blank"
          rel="noopener noreferrer">View my badges on Credly →</a
        >
      </p>
    </section>

    <section class="page-section" aria-labelledby="work-h">
      <div class="section-head"><h2 id="work-h">Work experience</h2></div>
      <ul class="entry-list">
        {
          jobs.map((job) => (
            <li class="entry">
              <h3 class="entry-title">{job.title}</h3>
              <p class="entry-meta">
                {job.company} · {job.duration} · {job.location}
              </p>
              <p>{job.description}</p>
              <ul class="dash-list">
                {job.bullets.map((b) => (
                  <li>{b}</li>
                ))}
              </ul>
              <ul class="tech-list">
                {job.technologies.map((t) => (
                  <li>{t}</li>
                ))}
              </ul>
            </li>
          ))
        }
      </ul>
    </section>

    <section class="page-section" aria-labelledby="interests-h">
      <div class="section-head"><h2 id="interests-h">Interests &amp; hobbies</h2></div>
      <ul class="dash-list section-text">
        {interests.map((i) => <li>{i}</li>)}
      </ul>
    </section>

    <section class="page-section" aria-labelledby="edu-h">
      <div class="section-head"><h2 id="edu-h">Education &amp; learning</h2></div>
      <div class="prose section-text">
        <!-- the two existing education paragraphs, verbatim, including the Medium and Udemy links -->
      </div>
    </section>

    <section class="page-section" aria-labelledby="philosophy-h">
      <div class="section-head"><h2 id="philosophy-h">Philosophy</h2></div>
      <div class="prose section-text">
        <blockquote>
          With enough time, effort, and curiosity, any skill can be mastered and
          applied effectively.
        </blockquote>
      </div>
    </section>

    <section class="page-section" aria-labelledby="connect-h">
      <div class="section-head"><h2 id="connect-h">Let's connect</h2></div>
      <div class="prose section-text">
        <!-- the two existing connect paragraphs, verbatim -->
        <p><a href={href("")}>Get in touch →</a></p>
      </div>
    </section>
  </div>
</BaseLayout>

<style>
  .about-body,
  .section-text {
    padding-top: 1rem;
  }
  .about-body {
    margin-top: 1.5rem;
  }
  .learning {
    color: var(--accent);
  }
  .entry .tech-list {
    padding-top: 0.25rem;
  }
</style>
```
Replace each `<!-- … verbatim -->` comment with the exact paragraphs from the current file (Background: current lines ~263–278; Education: ~404–431; Connect: ~451–461). Do not edit their wording.

- [ ] **Step 2: Remove unused imports.** If `Eyebrow` is no longer referenced in the file, delete its import. `href` stays (used by "Get in touch").

- [ ] **Step 3: Build and check** — `npm run build` (exit 0); `npm run dev`, open `/me/about/` in both themes and at 375px.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat(about): single-column about page; drop spec table and chip grid

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Projects page

**Files:**
- Modify: `src/pages/projects.astro` — template and `<style>` replaced; frontmatter keeps only imports.

The stat tiles ("2 / 3 / ∞") and the tech chip row (it repeated the `entry-meta` languages) are removed.

- [ ] **Step 1: Replace the file** with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import PageHead from "../components/PageHead.astro";
import { projects } from "../data/projects";
---

<BaseLayout
  title="Projects"
  description="Projects by Harish Krishnan — building interpreters, reverse-engineering libraries, and exploring how systems work under the hood."
>
  <PageHead eyebrow="Projects · Things I've built">Things I build to <span class="accent-em">understand them</span>.</PageHead>

  <div class="column">
    <section class="page-section">
      <p class="intro-deck">
        A small collection of projects where I reverse-engineer the tools I rely
        on — interpreters, state libraries, the machinery underneath. Building
        them is how I learn how they really work.
      </p>
    </section>

    <section class="page-section" aria-labelledby="projects-h">
      <div class="section-head"><h2 id="projects-h">Selected work</h2></div>
      <ul class="entry-list">
        {
          projects.map((project) => (
            <li class="entry">
              <h3 class="entry-title">
                {project.title}{" "}
                <span class="entry-meta">{project.tech.join(" · ")}</span>
              </h3>
              <p class="project-summary">{project.summary}</p>
              <p>{project.description}</p>
              <ul class="dash-list">
                {project.highlights.map((h) => (
                  <li>{h}</li>
                ))}
              </ul>
              <p class="project-links">
                {project.links.map((link) => (
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label} →
                  </a>
                ))}
              </p>
            </li>
          ))
        }
      </ul>
    </section>
  </div>
</BaseLayout>

<style>
  .project-summary {
    font-style: italic;
  }
  .project-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .project-links a {
    overflow-wrap: anywhere;
  }
</style>
```

- [ ] **Step 2: Build and check** — `npm run build` (exit 0); `/me/projects/` in both themes and at 375px.

- [ ] **Step 3: Commit**

```bash
git add src/pages/projects.astro
git commit -m "feat(projects): stacked project entries; drop stat tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Open source and Bookshelf

**Files:**
- Modify: `src/pages/opensource.astro` — data stays; template and `<style>` replaced.
- Modify: `src/pages/bookshelf.astro` — data stays; template and `<style>` replaced.

- [ ] **Step 1: Open source template** — replace from `<BaseLayout` to the end with:

```astro
<BaseLayout
  title="Open Source"
  description="Open source contributions by Harish Krishnan — merged pull requests and repositories across Angular, Qwik, Prisma, Apollo Client, and more."
>
  <PageHead eyebrow="Open Source">Giving back to the community.</PageHead>

  <div class="column">
    <section class="page-section">
      <p class="intro-deck">
        Open source software has been instrumental in my growth as a developer. I
        believe in giving back to the community that has given me so much — here
        are my contributions across the projects I rely on every day.
      </p>
    </section>

    <section class="page-section" aria-labelledby="repos-h">
      <div class="section-head"><h2 id="repos-h">Repositories</h2></div>
      {
        repoGroups.map((group) => (
          <div>
            <h3 class="group-label">{group.label}</h3>
            <ul class="entry-list">
              {group.repos.map((repo) => (
                <li class="entry">
                  <h4 class="entry-title">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer">
                      {repo.name}
                    </a>
                  </h4>
                  <p>{repo.description}</p>
                  <ul class="tech-list">
                    {repo.tags.map((t) => (
                      <li>{t}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))
      }
    </section>

    <section class="page-section" aria-labelledby="contrib-h">
      <div class="section-head"><h2 id="contrib-h">Contributions</h2></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Type</th>
              <th>Contribution</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {
              contributions.map((c) => (
                <tr>
                  <td class="td-project">{c.project}</td>
                  <td>{c.type}</td>
                  <td>{c.contribution}</td>
                  <td>
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      {c.status} →
                    </a>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="page-section" aria-labelledby="collab-h">
      <div class="section-head"><h2 id="collab-h">Collaborate</h2></div>
      <p class="section-text">
        I'm always looking for interesting projects to contribute to and
        passionate developers to collaborate with. Whether you need help with a
        project, want to pair program, or have an idea for a new open source
        initiative, let's connect.
      </p>
      <p class="cta-links">
        <a href="https://github.com/harishkrishnan24" target="_blank" rel="noopener noreferrer">See my GitHub →</a>
        <a href={href("about")}>Get in touch</a>
      </p>
    </section>
  </div>
</BaseLayout>

<style>
  .table-wrap {
    overflow-x: auto;
  }
  .td-project {
    font-weight: 500;
    white-space: nowrap;
  }
  .section-text {
    padding-top: 1rem;
    color: var(--fg-soft);
  }
  .cta-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    padding-top: 0.75rem;
    font-family: var(--font-mono);
    font-size: 13px;
  }
</style>
```
Remove the `Eyebrow` import if no longer referenced.

- [ ] **Step 2: Bookshelf template** — replace from `<BaseLayout` to the end with the code below. The "Currently reading" and "Read" sections share one markup shape; it is written out twice because Astro has no local template functions and a new component for two call sites is not justified.

```astro
<BaseLayout
  title="Bookshelf"
  description={/* keep the existing description string verbatim */}
>
  <PageHead eyebrow="Bookshelf · Papers">My digital library.</PageHead>

  <div class="column">
    <section class="page-section">
      <p class="intro-deck">
        Knowledge is the foundation of innovation. A curated collection of books
        and papers that have shaped my understanding of technology and software —
        and continue to guide the work.
      </p>
    </section>

    <section class="page-section" aria-labelledby="reading-h">
      <div class="section-head"><h2 id="reading-h">Currently reading</h2></div>
      <ul class="entry-list">
        {
          reading.map((book) => (
            <li class="entry book">
              <img
                class="book-cover"
                src={href(`images/books/${book.cover}`)}
                alt={`Cover of ${book.title}`}
                loading="lazy"
                decoding="async"
              />
              <div class="book-text">
                <h3 class="entry-title">{book.title}</h3>
                <p>{book.author}</p>
              </div>
            </li>
          ))
        }
      </ul>
    </section>

    <section class="page-section" aria-labelledby="read-h">
      <div class="section-head"><h2 id="read-h">Read</h2></div>
      <ul class="entry-list">
        {
          read.map((book) => (
            <li class="entry book">
              <img
                class="book-cover"
                src={href(`images/books/${book.cover}`)}
                alt={`Cover of ${book.title}`}
                loading="lazy"
                decoding="async"
              />
              <div class="book-text">
                <h3 class="entry-title">{book.title}</h3>
                <p>{book.author}</p>
              </div>
            </li>
          ))
        }
      </ul>
    </section>

    <section class="page-section" aria-labelledby="papers-h">
      <div class="section-head"><h2 id="papers-h">Papers</h2></div>
      <ul class="entry-list">
        <li class="entry">
          <h3 class="entry-title">
            <a
              href="https://web.stanford.edu/class/cs114/reading-keshav.pdf"
              target="_blank"
              rel="noopener noreferrer">How to Read a Paper</a
            >
          </h3>
          <p>S. Keshav</p>
        </li>
      </ul>
    </section>
  </div>
</BaseLayout>

<style>
  .book {
    grid-template-columns: 56px 1fr;
    align-items: center;
    column-gap: 1.25rem;
  }
  .book-cover {
    width: 56px;
    height: auto;
    max-width: 100%;
    border: 1px solid var(--line);
  }
  .book-text {
    min-width: 0;
    display: grid;
    gap: 0.25rem;
  }
</style>
```
Before replacing, check the current `<BaseLayout …>` opening tag of `bookshelf.astro` and keep its `title`/`description` attributes exactly. Remove the `Eyebrow` import if unused.

- [ ] **Step 3: Build and check** — `npm run build` (exit 0); `/me/opensource/` (table scrolls inside its box at 375px, page does not) and `/me/bookshelf/` (covers show) in both themes.

- [ ] **Step 4: Commit**

```bash
git add src/pages/opensource.astro src/pages/bookshelf.astro
git commit -m "feat(design): column layout for open source and bookshelf

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: OG cards — new dark palette, Source Serif 4, re-measured thresholds

**Files:**
- Modify: `src/lib/og-card.ts`
- Test: `src/lib/og-card.test.ts`
- Modify: `src/pages/og/[...slug].png.ts` (font list)
- Modify: `package.json`, `package-lock.json` (remove `@fontsource/instrument-serif`)

**Measured facts** (Satori 0.29, `embedFont: false`, 1040px column, line-height 1.06, letter-spacing −0.02em; method reproduces the old Instrument Serif figures): Source Serif 4 fits at most 56 chars in 2 lines at 72px; 3-line maxima are 82 @72px, 93 @64px, 110 @56px, 131 @48px.

- [ ] **Step 1: Write the failing tests** — in `src/lib/og-card.test.ts`, replace the whole `describe("titleLayout", …)` block with:

```ts
describe("titleLayout", () => {
  it("uses the largest size for a real post title", () => {
    expect(titleLayout("There's No Magic in Your Database")).toEqual({
      text: "There's No Magic in Your Database",
      fontSize: 72,
    });
  });

  it("steps down at the 56-character boundary", () => {
    expect(titleLayout("a".repeat(56)).fontSize).toBe(72);
    expect(titleLayout("a".repeat(57)).fontSize).toBe(64);
  });

  it("steps down again at the 90-character boundary", () => {
    expect(titleLayout("a".repeat(90)).fontSize).toBe(64);
    expect(titleLayout("a".repeat(91)).fontSize).toBe(56);
  });

  it("steps down to the smallest size past 106 characters", () => {
    expect(titleLayout("a".repeat(106)).fontSize).toBe(56);
    expect(titleLayout("a".repeat(107)).fontSize).toBe(48);
  });

  it("leaves a title at the truncation budget intact", () => {
    const title = "a".repeat(128);
    expect(titleLayout(title).text).toBe(title);
  });

  it("truncates past the budget with an ellipsis", () => {
    const { text } = titleLayout("b".repeat(200));
    expect(text).toHaveLength(129); // at most 128 characters plus the ellipsis
    expect(text.endsWith("…")).toBe(true);
  });
});
```
And in `describe("card palette", …)` replace the last two tests with:
```ts
  it("uses the dark-theme accent green", () => {
    expect(JSON.stringify(ogCard("Probe"))).toContain("#84b8a0");
  });

  it("sets the title in the serif face", () => {
    const json = JSON.stringify(ogCard("Probe"));
    expect(json).toContain("Source Serif 4");
    expect(json).not.toContain("Instrument Serif");
  });
```

- [ ] **Step 2: Run and confirm failure** — `npx vitest run src/lib/og-card.test.ts`. Expected: FAIL on the 56-char boundary, accent `#84b8a0`, and `Source Serif 4`.

- [ ] **Step 3: Implement in `src/lib/og-card.ts`**

Replace the `COLOR` object:
```ts
const COLOR = {
  bg: "#0f1012", // --bg (dark)
  fg: "#ebe8e2", // --fg
  dim: "#8d8a84", // --dim
  line: "#26282d", // --line
  accent: "#84b8a0", // --accent
  accent2: "#d9a55b", // --accent2
} as const;
```
Replace `titleLayout` and its doc comment:
```ts
/**
 * Pick a font size the title fits in, truncating pathological ones.
 *
 * Satori 0.29 ignores `lineClamp`, so overflow has to be prevented here.
 * Measured for Source Serif 4 400 at -0.02em in the 1040px content column
 * (Satori, embedFont: false, counting distinct text baselines). The space
 * between eyebrow and footer allows three lines. 3-line maxima:
 *   72px: 82 chars (2-line max 56) → step down at 56
 *   64px: 93 chars → step down at 90
 *   56px: 110 chars → step down at 106
 *   48px: 131 chars → truncate at 128
 */
export function titleLayout(title: string): { text: string; fontSize: number } {
  if (title.length <= 56) return { text: title, fontSize: 72 };
  if (title.length <= 90) return { text: title, fontSize: 64 };
  if (title.length <= 106) return { text: title, fontSize: 56 };
  return { text: truncate(title, 128), fontSize: 48 };
}
```
Replace both `fontFamily: "Instrument Serif"` occurrences with `fontFamily: "Source Serif 4"`.

- [ ] **Step 4: Run the tests** — `npx vitest run src/lib/og-card.test.ts`. Expected: all pass.

- [ ] **Step 5: Swap the font file** in `src/pages/og/[...slug].png.ts`. Replace the Instrument Serif entry in `FONTS` with:
```ts
  {
    name: "Source Serif 4",
    data: fontData(
      "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff",
    ),
    weight: 400 as const,
    style: "normal" as const,
  },
```

- [ ] **Step 6: Remove the dependency**

Run: `command grep -rn "instrument-serif\|Instrument Serif" src` — expected: no output.
Run: `npm uninstall @fontsource/instrument-serif` (if it fails with a network/TLS error, retry with the sandbox disabled).

- [ ] **Step 7: Build and look at a card** — `npm run build` (exit 0). Open `dist/og/the-memory-wall.png` and `dist/og/rusts-concurrency-rule-doesnt-relax-it-moves.png`: dark background, soft-green accents, serif title on at most 3 lines, nothing clipped.

- [ ] **Step 8: Commit**

```bash
git add src/lib/og-card.ts src/lib/og-card.test.ts "src/pages/og/[...slug].png.ts" package.json package-lock.json
git commit -m "feat(og): Source Serif 4 cards in the new dark palette; re-measure title tiers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Cleanup, CLAUDE.md, full verification

**Files:**
- Modify: `src/styles/global.css` (delete unused rules)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Delete global rules that nothing uses any more.** For each class below, run `command grep -rn "<name>" src --include='*.astro' --include='*.md' --include='*.mdx' --include='*.ts'`; delete its rule(s) from `global.css` **only if** there are zero matches outside `global.css`:
  `.rule`, `.card`, `.divider`, `.section-header`, `.btn`, `.btn-ghost`, `.reveal` (and `@keyframes reveal-in` with its `@supports` block).
  If a class still has users, keep it and list it in the task report.

- [ ] **Step 2: Update `CLAUDE.md`** — exact edits:
  - "Three-theme system: dark (default), `html[data-theme="light"]`, `html[data-theme="crt"]`." → "Two themes: light (default, `:root`) and dark (`html[data-theme="dark"]`). No `prefers-color-scheme` block — light is the deliberate default."
  - Colours bullet: add `--fg-soft` to the semantic names list.
  - Fonts bullet → "**Two faces, three role tokens:** `--font-display` and `--font-serif` = Source Serif 4 (headings and running text); `--font-mono` = JetBrains Mono (dates, tags, labels, code only). Instrument Serif, `--font-sans` and Inter do not exist."
  - Theme boot bullet: replace "causes a flash of the wrong theme" with "causes a flash of light before dark on every navigation".
  - JS-optional bullet: "(nav toggle, copy-link)" → "(nav menu, theme toggle, copy-link)".
  - Components bullet → "`src/components/` — `Nav` (owns the theme toggle), `Footer`, `Eyebrow`, `PostCard`, `PageHead`. `GlyphField`, `CommandDeck`, `HeroVisual`, `MotifHero`, `PageHero`, and the `three` dependency are gone."
  - Add after the components bullet: "`src/data/projects.ts` — project data shared by the home page and `/projects`."
  - Delete the `src/lib/terminal-commands.ts` bullet.
  - `og-card.ts` bullet: "mirrors palette from `tokens.css`" → "mirrors the dark palette from `tokens.css`".

- [ ] **Step 3: Automated checks** (each must print nothing):

```bash
bash -c "comm -23 <(command grep -rhoE 'var\(--[a-z0-9-]+' src | sed 's/var(//' | sort -u) <(command grep -oE '^\s*--[a-z0-9-]+' src/styles/tokens.css | tr -d ' ' | sort -u)"
command grep -rn "GlyphField\|CommandDeck\|terminal-commands\|data-theme=\"crt\"\|Instrument Serif\|instrument-serif\|theme-dot" src package.json
command grep -rnE '#[0-9a-fA-F]{3,6}\b' src/components src/pages src/layouts --include='*.astro'
```
Inspect each match of the last command: the `theme-color` meta in `BaseLayout.astro` is expected; `href="#…"` anchors and HTML entities are false positives; any other colour value is a hardcoded colour to fix.

- [ ] **Step 4: Full suite and build** — run `npm test` and `npm run build`; both must pass. Paste the output into the task report.

- [ ] **Step 5: Visual verification** — `npm run dev`. For each page (`/me/`, `/me/blog/`, `/me/blog/the-memory-wall/`, `/me/about/`, `/me/projects/`, `/me/opensource/`, `/me/bookshelf/`):
  - light and dark: no invisible or low-contrast text; diagrams and code blocks readable;
  - 375px wide: no horizontal page scroll (`document.documentElement.scrollWidth === 375`);
  - JavaScript disabled: content renders, page is light, nav menu opens via `<details>`.
  - Take screenshots of home (light + dark) and one secondary page for the final report.

- [ ] **Step 6: Review the full diff** — `git diff master...HEAD --stat` and read `git diff master...HEAD` for stray debug code or unrelated changes.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css CLAUDE.md
git commit -m "chore(design): drop unused global rules; document the essayist design in CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Test plan summary

| What | How | Where |
|---|---|---|
| Theme cycle, crt fallback | Vitest, written first | Task 1 |
| OG palette, font, title tiers | Vitest, written first; tiers from Satori measurement | Task 10 |
| No dangling tokens | `comm` check | Tasks 2, 11 |
| Removed names gone | `grep` check | Tasks 3, 5, 10, 11 |
| Type check + build | `npm run build` (`astro check && astro build`) | every task |
| Full unit suite | `npm test` | Tasks 3, 11 |
| Layout, contrast, both themes, 375px, no-JS | Dev server visual check | Tasks 5–9, 11 |

## What could break

- A missed `--font-mono` site leaves a paragraph in mono → visual check.
- A component still styled by a deleted global class → build passes but layout is plain; caught in Task 11 step 1 (grep before delete) and the visual pass.
- `--measure` is in `ch`, so it now resolves against the serif instead of mono; `.prose` on post pages already used the serif, so post line length does not change. Check the post page in Task 6.
- Visitors with stored `"crt"` get light; stored `"dark"` keeps dark.

## Rollback

Everything is on `redesign/essayist`; nothing deploys until a merge to `master`. Per task: `git revert <sha>`. Whole redesign after merge: `git revert -m 1 <merge-sha>`.
