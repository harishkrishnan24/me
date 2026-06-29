# Uniform 3D Page Heroes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give About, Projects, Bookshelf, and Open Source a uniform two-column hero (copy left, themed 3D object right) matching the home page, and refresh the home headline copy.

**Architecture:** Two new components — `PageHero.astro` (the uniform two-column shell) and `MotifHero.astro` (shared three.js scaffolding with a per-page geometry builder). The home `HeroVisual` is untouched; `.grad` moves to global CSS so slotted titles can use it. Home changes are copy-only.

**Tech Stack:** Astro 7 (static), three.js 0.185 (already a dependency), scoped component CSS, design tokens in `src/styles/tokens.css`.

**Testing note:** These are presentational `.astro` components. Per the project's testing rules (`CLAUDE.md`: "Do NOT unit-test presentational `.astro`"), there are **no unit tests**. The gate is `npm run build` (`astro check && astro build`) plus manual visual / JS-off / reduced-motion / mobile checks. `astro check` type-checks the typed component props.

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Create a feature branch** (repo is currently on `master`)

```bash
git checkout -b feat/uniform-3d-heroes
```

- [ ] **Step 2: Confirm clean start**

Run: `git status`
Expected: "On branch feat/uniform-3d-heroes", working tree clean.

---

### Task 1: Promote `.grad` to global CSS

**Files:**
- Modify: `src/styles/global.css` (append the rule)

The gradient span is supplied by parent pages inside `PageHero`'s title slot. Astro scopes slotted content to the parent, so a scoped `.grad` in `PageHero` would not reach it. A single global definition fixes this and de-duplicates the per-page copies.

- [ ] **Step 1: Append `.grad` to `src/styles/global.css`**

```css
/* Gradient text — used by hero titles across pages. */
.grad {
  background: linear-gradient(100deg, var(--violet), var(--teal));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS (no type or build errors). Home's existing scoped `.grad` still works (identical values; harmless overlap).

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "refactor(css): promote .grad to global for slotted hero titles"
```

---

### Task 2: Create `MotifHero.astro` (the 3D visual)

**Files:**
- Create: `src/components/MotifHero.astro`

Mirrors `src/components/HeroVisual.astro`'s proven scaffolding (alpha renderer, ambient+key+rim lights, `ResizeObserver`, pointer parallax, sine float, `IntersectionObserver` pause, reduced-motion static frame). The only per-page difference is which `THREE.Group` is built, selected by the `data-motif` attribute.

- [ ] **Step 1: Write the component**

```astro
---
// Decorative 3D hero object, themed per page via the `motif` prop. Shares all
// renderer/lighting/motion scaffolding with HeroVisual; only the geometry
// differs. Purely decorative + progressively enhanced — with JS off (or
// reduced-motion) a CSS glow shows behind. three.js loads only where used.
interface Props {
  motif: "constellation" | "blocks" | "books" | "graph";
}
const { motif } = Astro.props;
---

<div class="hero-visual" aria-hidden="true">
  <div class="visual-glow"></div>
  <canvas class="visual-canvas" data-motif={motif}></canvas>
</div>

<style>
  .hero-visual {
    position: relative;
    width: 100%;
    max-width: 480px;
    aspect-ratio: 1 / 1;
    margin-inline: auto;
  }
  .visual-glow {
    position: absolute;
    inset: 12%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(123, 106, 240, 0.26) 0%,
      rgba(72, 190, 166, 0.1) 42%,
      transparent 70%
    );
    filter: blur(8px);
  }
  .visual-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  @media (max-width: 860px) {
    .hero-visual {
      max-width: 300px;
    }
  }
</style>

<script>
  import * as THREE from "three";

  const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-motif]");
  const container = canvas?.parentElement;

  // Palette — hex literals matching tokens.css (three.js can't read CSS vars).
  const VIOLET = 0x7b6af0;
  const TEAL = 0x48bea6;
  const ORANGE = 0xe06b50;
  const CHASSIS = 0x1a1a26;

  function buildConstellation(): THREE.Group {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: VIOLET,
        emissive: VIOLET,
        emissiveIntensity: 0.18,
        metalness: 0.3,
        roughness: 0.4,
      }),
    );
    g.add(core);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: TEAL,
      emissive: TEAL,
      emissiveIntensity: 0.2,
      metalness: 0.2,
      roughness: 0.5,
    });
    const lineMat = new THREE.LineBasicMaterial({
      color: VIOLET,
      transparent: true,
      opacity: 0.25,
    });
    const rings = 3;
    const perRing = 4;
    for (let r = 0; r < rings; r++) {
      const ring = new THREE.Group();
      ring.rotation.x = r * 0.7;
      ring.rotation.y = r * 0.9;
      const radius = 1.1 + r * 0.32;
      for (let i = 0; i < perRing; i++) {
        const a = (i / perRing) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const node = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 16, 16),
          nodeMat,
        );
        node.position.set(x, 0, z);
        ring.add(node);
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(x, 0, z),
        ]);
        ring.add(new THREE.Line(geo, lineMat));
      }
      g.add(ring);
    }
    return g;
  }

  function buildBlocks(): THREE.Group {
    const g = new THREE.Group();
    const faceMat = new THREE.MeshStandardMaterial({
      color: CHASSIS,
      metalness: 0.35,
      roughness: 0.55,
      transparent: true,
      opacity: 0.92,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: VIOLET });
    const cubes: { s: number; p: [number, number, number] }[] = [
      { s: 1.1, p: [0, -0.55, 0] },
      { s: 0.8, p: [0.4, 0.35, 0.2] },
      { s: 0.55, p: [-0.45, 0.6, -0.1] },
    ];
    for (const c of cubes) {
      const geo = new THREE.BoxGeometry(c.s, c.s, c.s);
      const mesh = new THREE.Mesh(geo, faceMat);
      mesh.position.set(...c.p);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      g.add(mesh);
    }
    return g;
  }

  function buildBooks(): THREE.Group {
    const g = new THREE.Group();
    const books: { w: number; h: number; d: number; c: number; rot: number }[] = [
      { w: 2.0, h: 0.3, d: 1.3, c: VIOLET, rot: 0.05 },
      { w: 1.8, h: 0.28, d: 1.2, c: TEAL, rot: -0.06 },
      { w: 1.9, h: 0.32, d: 1.25, c: ORANGE, rot: 0.03 },
    ];
    let y = -0.7;
    for (const b of books) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({
          color: b.c,
          metalness: 0.2,
          roughness: 0.6,
        }),
      );
      mesh.position.y = y;
      mesh.rotation.y = b.rot;
      g.add(mesh);
      y += b.h + 0.07;
    }
    return g;
  }

  function buildGraph(): THREE.Group {
    const g = new THREE.Group();
    const nodes: [number, number, number][] = [
      [0, -1.2, 0],
      [-0.9, -0.3, 0.2],
      [0.9, -0.4, -0.2],
      [-1.3, 0.7, 0],
      [-0.3, 0.7, 0.3],
      [1.0, 0.6, 0.2],
      [0.4, 1.3, -0.1],
    ];
    const edges: [number, number][] = [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
      [2, 5],
      [5, 6],
      [4, 6],
    ];
    const rootMat = new THREE.MeshStandardMaterial({
      color: VIOLET,
      emissive: VIOLET,
      emissiveIntensity: 0.25,
      metalness: 0.3,
      roughness: 0.4,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: TEAL,
      emissive: TEAL,
      emissiveIntensity: 0.2,
      metalness: 0.2,
      roughness: 0.5,
    });
    const lineMat = new THREE.LineBasicMaterial({
      color: VIOLET,
      transparent: true,
      opacity: 0.35,
    });
    nodes.forEach((p, i) => {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(i === 0 ? 0.18 : 0.13, 16, 16),
        i === 0 ? rootMat : nodeMat,
      );
      node.position.set(...p);
      g.add(node);
    });
    for (const [a, b] of edges) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...nodes[a]),
        new THREE.Vector3(...nodes[b]),
      ]);
      g.add(new THREE.Line(geo, lineMat));
    }
    return g;
  }

  if (canvas && container instanceof HTMLElement) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.1, 4.8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xb9b2ff, 1.1);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x48bea6, 0.5);
    rim.position.set(4, -2, 2);
    scene.add(rim);

    let group: THREE.Group;
    switch (canvas.dataset.motif) {
      case "blocks":
        group = buildBlocks();
        break;
      case "books":
        group = buildBooks();
        break;
      case "graph":
        group = buildGraph();
        break;
      default:
        group = buildConstellation();
    }
    group.scale.setScalar(0.92);
    scene.add(group);

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(container);

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    window.addEventListener("pointermove", (e) => {
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    });

    let raf = 0;
    let f = 0;
    function frame() {
      f++;
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      // Same motion language as HeroVisual: gentle oscillation + parallax + float.
      group.rotation.y = Math.sin(f * 0.01) * 0.3 + curX * 0.5;
      group.rotation.x = -0.05 + curY * 0.28;
      group.position.y = Math.sin(f * 0.02) * 0.06;
      renderer.render(scene, camera);
    }

    function loop() {
      frame();
      raf = requestAnimationFrame(loop);
    }

    if (reduce) {
      renderer.render(scene, camera); // static single frame
    } else {
      const io = new IntersectionObserver((entries) => {
        const visible = entries[0]?.isIntersecting;
        if (visible && !raf) loop();
        else if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
      io.observe(container);
    }
  }
</script>
```

- [ ] **Step 2: Build (type-check the props + script)**

Run: `npm run build`
Expected: PASS. (The component isn't rendered anywhere yet, but `astro check` compiles it.)

- [ ] **Step 3: Commit**

```bash
git add src/components/MotifHero.astro
git commit -m "feat(hero): add MotifHero 3D component with four per-page motifs"
```

---

### Task 3: Create `PageHero.astro` (the uniform shell)

**Files:**
- Create: `src/components/PageHero.astro`

Single source of truth for the two-column hero shared by the four secondary pages. Typography (`.hero-title`, `.hero-deck`) intentionally mirrors the home hero for uniformity.

- [ ] **Step 1: Write the component**

```astro
---
import Eyebrow from "./Eyebrow.astro";
import MotifHero from "./MotifHero.astro";

interface Props {
  eyebrow: string;
  accent?: "violet" | "orange" | "teal";
  motif: "constellation" | "blocks" | "books" | "graph";
}
const { eyebrow, accent = "violet", motif } = Astro.props;
---

<section class="page-hero">
  <div class="wrap page-hero-inner">
    <div class="page-hero-copy">
      <slot name="lead" />
      <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
      <h1 class="hero-title"><slot /></h1>
      <p class="hero-deck"><slot name="deck" /></p>
    </div>
    <MotifHero motif={motif} />
  </div>
</section>

<style>
  .page-hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.82fr);
    gap: clamp(24px, 5vw, 72px);
    align-items: center;
    min-height: min(68vh, 560px);
    padding-block: clamp(28px, 5vw, 56px);
  }
  .page-hero-copy {
    max-width: 600px;
  }
  .hero-title {
    font-size: clamp(38px, 5vw, 66px);
    font-weight: 800;
    line-height: 1.04;
    letter-spacing: -0.035em;
    text-wrap: balance;
    margin-block: 22px 22px;
  }
  .hero-deck {
    font-size: var(--step-1);
    font-style: italic;
    color: var(--text-muted);
    line-height: 1.6;
    max-width: 34em;
    margin-bottom: 0;
  }
  @media (max-width: 860px) {
    .page-hero-inner {
      grid-template-columns: 1fr;
      min-height: 0;
      gap: 16px;
      padding-block: 24px 8px;
    }
  }
</style>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/PageHero.astro
git commit -m "feat(hero): add uniform two-column PageHero shell"
```

---

### Task 4: Convert Projects hero

**Files:**
- Modify: `src/pages/projects.astro` (hero markup ~line 71, import, scoped CSS ~lines 130-160)

- [ ] **Step 1: Add the import** at the top frontmatter (after the existing `Eyebrow` import)

```astro
import PageHero from "../components/PageHero.astro";
```

- [ ] **Step 2: Replace the hero `<section>`**

Replace:

```astro
  <!-- HERO -->
  <section class="wrap hero">
    <Eyebrow accent="violet">Projects · Things I've built</Eyebrow>
    <h1 class="hero-title">Things I build to<br /><span class="grad">understand them</span>.</h1>
    <p class="hero-deck">
      A small collection of projects where I reverse-engineer the tools I rely
      on — interpreters, state libraries, the machinery underneath. Building
      them is how I learn how they really work.
    </p>
  </section>
```

With:

```astro
  <!-- HERO -->
  <PageHero eyebrow="Projects · Things I've built" accent="violet" motif="blocks">
    Things I build to<br /><span class="grad">understand them</span>.
    <Fragment slot="deck">
      A small collection of projects where I reverse-engineer the tools I rely
      on — interpreters, state libraries, the machinery underneath. Building
      them is how I learn how they really work.
    </Fragment>
  </PageHero>
```

- [ ] **Step 3: Remove the now-unused scoped CSS** — delete the `.hero`, `.hero-title`, `.grad`, and `.hero-deck` blocks from the `<style>` section (the `/* HERO */` group). Leave all other styles untouched.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Visual check**

Run: `npm run dev`, open `/me/projects`. Expected: two-column hero, title with gradient on "understand them", wireframe blocks rotating on the right.

- [ ] **Step 6: Commit**

```bash
git add src/pages/projects.astro
git commit -m "feat(projects): adopt uniform 3D PageHero (blocks motif)"
```

---

### Task 5: Convert Bookshelf hero

**Files:**
- Modify: `src/pages/bookshelf.astro` (hero markup ~line 38, import, scoped CSS ~lines 125-140)

- [ ] **Step 1: Add the import** (after the existing `Eyebrow` import)

```astro
import PageHero from "../components/PageHero.astro";
```

- [ ] **Step 2: Replace the hero `<section>`**

Replace:

```astro
  <!-- HERO -->
  <section class="wrap hero">
    <Eyebrow accent="violet">Bookshelf · Papers</Eyebrow>
    <h1 class="hero-title">My digital library.</h1>
    <p class="hero-deck">
      Knowledge is the foundation of innovation. A curated collection of books
      and papers that have shaped my understanding of technology and software —
      and continue to guide the work.
    </p>
  </section>
```

With:

```astro
  <!-- HERO -->
  <PageHero eyebrow="Bookshelf · Papers" accent="violet" motif="books">
    My digital library.
    <Fragment slot="deck">
      Knowledge is the foundation of innovation. A curated collection of books
      and papers that have shaped my understanding of technology and software —
      and continue to guide the work.
    </Fragment>
  </PageHero>
```

- [ ] **Step 3: Remove the now-unused scoped CSS** — delete the `.hero`, `.hero-title`, and `.hero-deck` blocks from the `<style>` section. Leave all other styles untouched.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Visual check**

Open `/me/bookshelf`. Expected: two-column hero, stacked 3D books drifting on the right.

- [ ] **Step 6: Commit**

```bash
git add src/pages/bookshelf.astro
git commit -m "feat(bookshelf): adopt uniform 3D PageHero (books motif)"
```

---

### Task 6: Convert Open Source hero

**Files:**
- Modify: `src/pages/opensource.astro` (hero markup ~line 210, import, scoped CSS ~lines 333-348)

- [ ] **Step 1: Add the import** (after the existing `Eyebrow` import)

```astro
import PageHero from "../components/PageHero.astro";
```

- [ ] **Step 2: Replace the hero `<section>`**

Replace:

```astro
  <!-- HERO -->
  <section class="wrap hero">
    <Eyebrow accent="violet">Open Source</Eyebrow>
    <h1 class="hero-title">Giving back to the community.</h1>
    <p class="hero-deck">
      Open source software has been instrumental in my growth as a developer. I
      believe in giving back to the community that has given me so much — here
      are my contributions across the projects I rely on every day.
    </p>
  </section>
```

With:

```astro
  <!-- HERO -->
  <PageHero eyebrow="Open Source" accent="violet" motif="graph">
    Giving back to the community.
    <Fragment slot="deck">
      Open source software has been instrumental in my growth as a developer. I
      believe in giving back to the community that has given me so much — here
      are my contributions across the projects I rely on every day.
    </Fragment>
  </PageHero>
```

- [ ] **Step 3: Remove the now-unused scoped CSS** — delete the `.hero`, `.hero-title`, and `.hero-deck` blocks from the `<style>` section. Leave all other styles untouched.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Visual check**

Open `/me/opensource`. Expected: two-column hero, branching node graph on the right.

- [ ] **Step 6: Commit**

```bash
git add src/pages/opensource.astro
git commit -m "feat(opensource): adopt uniform 3D PageHero (graph motif)"
```

---

### Task 7: Convert About hero (keep the profile photo)

**Files:**
- Modify: `src/pages/about.astro` (hero markup ~line 256, import, scoped CSS ~lines 466-499)

About is special: it has a profile photo. The photo goes into `PageHero`'s `lead` slot (above the eyebrow); the constellation motif goes on the right. The `.avatar` CSS stays (it styles slotted content, which keeps About's scope).

- [ ] **Step 1: Add the import** (after the existing `Eyebrow` import)

```astro
import PageHero from "../components/PageHero.astro";
```

- [ ] **Step 2: Replace the hero `<section>`**

Replace:

```astro
  <!-- HERO -->
  <section class="wrap hero">
    <img
      class="avatar"
      src={href("images/profile.jpg")}
      alt="Harish Krishnan"
      width="120"
      height="120"
    />
    <div class="hero-body">
      <Eyebrow accent="violet">About · Software Engineer · Stockholm</Eyebrow>
      <h1 class="hero-title">A perpetual student of the craft.</h1>
      <p class="hero-deck">
        Software engineer based in Stockholm with experience across startups and
        enterprise. I build applications, teach, and write — and I'm always
        learning what comes next.
      </p>
    </div>
  </section>
```

With:

```astro
  <!-- HERO -->
  <PageHero
    eyebrow="About · Software Engineer · Stockholm"
    accent="violet"
    motif="constellation"
  >
    <img
      class="avatar"
      slot="lead"
      src={href("images/profile.jpg")}
      alt="Harish Krishnan"
      width="120"
      height="120"
    />
    A perpetual student of the craft.
    <Fragment slot="deck">
      Software engineer based in Stockholm with experience across startups and
      enterprise. I build applications, teach, and write — and I'm always
      learning what comes next.
    </Fragment>
  </PageHero>
```

- [ ] **Step 3: Remove the now-unused scoped CSS** — delete the `.hero`, `.hero-body`, `.hero-title`, and `.hero-deck` blocks (including the `.hero` rule inside the `@media (max-width: ...)` block near line 659). **Keep `.avatar`.** Leave all other styles untouched.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Visual check**

Open `/me/about`. Expected: round profile photo at the top of the left column, eyebrow + title + deck below it, constellation motif on the right.

- [ ] **Step 6: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat(about): adopt uniform 3D PageHero (constellation), keep avatar"
```

---

### Task 8: Refresh the home headline copy

**Files:**
- Modify: `src/pages/index.astro` (hero `<h1>` ~line 27, deck `<p>` ~line 32)

Copy only — no structural or 3D change to Home.

- [ ] **Step 1: Replace the headline**

Replace:

```astro
        <h1 class="hero-title">
          Engineering software where agents are <span class="grad"
            >first-class citizens</span
          >.
        </h1>
```

With:

```astro
        <h1 class="hero-title">
          Engineering software, and rethinking how it's built in <span
            class="grad">the age of AI</span
          >.
        </h1>
```

- [ ] **Step 2: Replace the deck** (drop the repeated "first-class citizen" phrasing)

Replace:

```astro
        <p class="hero-deck">
          Engineer at DigitalRoute, course instructor, and writer. I care about
          systems that are fast, correct, and a pleasure to use — and lately,
          about what it takes to build software where AI is a first-class
          citizen.
        </p>
```

With:

```astro
        <p class="hero-deck">
          Engineer at DigitalRoute, course instructor, and writer. I care about
          systems that are fast, correct, and a pleasure to use — and about what
          changes when AI becomes part of how we build them.
        </p>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual check**

Open `/me/` (home). Expected: new headline with gradient on "the age of AI"; deck no longer says "first-class citizen"; PC+terminal hero unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "copy(home): reframe headline around 'the age of AI'"
```

---

### Task 9: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: PASS with no warnings about unused CSS or type errors.

- [ ] **Step 2: Visual sweep (dev)** — for `/me/about`, `/me/projects`, `/me/bookshelf`, `/me/opensource`: confirm each hero is two-column, the correct motif renders and animates, and pointer parallax responds. Confirm Home is unchanged except copy.

- [ ] **Step 3: JS-off check** — in the browser, disable JavaScript and reload one secondary page. Expected: hero copy renders, the CSS glow shows behind the empty canvas, layout doesn't break.

- [ ] **Step 4: Reduced-motion check** — enable "Reduce motion" at the OS level (or emulate in devtools) and reload. Expected: the 3D shows a single static frame, no animation.

- [ ] **Step 5: Mobile check** — narrow the viewport below 860px. Expected: each hero collapses to a single column, the 3D scales to max-width 300px.

- [ ] **Step 6: Diff review**

Run: `git diff master --stat`
Expected: only the planned files changed (2 new components, `global.css`, 4 pages, `index.astro`, plus the spec/plan docs).

---

## Self-Review

**Spec coverage:** All spec sections map to tasks — `.grad` global (Task 1), `MotifHero` (Task 2), `PageHero` incl. `lead` slot (Task 3), the four page conversions with correct motifs (Tasks 4–7), home copy (Task 8), test plan (Task 9). ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code; every page's exact title/deck text is inlined. ✅

**Type consistency:** The `motif` union `"constellation" | "blocks" | "books" | "graph"` is identical in `MotifHero` (Task 2) and `PageHero` (Task 3); the `switch` cases match the union; each page passes a member of it. ✅
