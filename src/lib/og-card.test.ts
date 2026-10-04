import { describe, it, expect } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, ogCard, titleLayout } from "./og-card";

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
  });

  it("pins the dimensions BaseLayout advertises", () => {
    // BaseLayout.astro hardcodes og:image:width=1200 and og:image:height=630 in meta tags.
    expect([CARD_WIDTH, CARD_HEIGHT]).toEqual([1200, 630]);
  });

  it("truncates a pathological title inside the tree", () => {
    expect(flatten(ogCard("c".repeat(300)))).toContain("…");
  });
});

describe("card palette", () => {
  it("uses sRGB hex, never oklch — Satori renders oklch as black", () => {
    const json = JSON.stringify(ogCard("Probe"));
    expect(json).not.toMatch(/oklch/i);
  });

  it("uses the dark-theme accent green", () => {
    expect(JSON.stringify(ogCard("Probe"))).toContain("#84b8a0");
  });

  it("sets the title in the serif face", () => {
    const json = JSON.stringify(ogCard("Probe"));
    expect(json).toContain("Source Serif 4");
    expect(json).not.toContain("Instrument Serif");
  });
});
