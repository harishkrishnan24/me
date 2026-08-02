// Build-time Open Graph card for a blog post. Pure: returns a Satori
// element tree as plain `{ type, props }` objects — Satori accepts these
// directly, so the project needs no JSX runtime. Kept free of `satori`
// and `astro:content` imports so it unit-tests without either.

/** Open Graph's 1.91:1 convention. LinkedIn, X, and Slack all expect it. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const PADDING = 80;

// Satori cannot resolve CSS custom properties, so the palette is derived from
// src/styles/tokens.css and mirrored here. Two alpha values (violetLine,
// violetGlow) are deliberate card-scale overrides — see their per-line comments.
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
      backgroundImage: `radial-gradient(900px 500px at 12% 0%, ${COLOR.violetGlow}, rgba(123, 106, 240, 0) 70%)`,
      fontFamily: "Inter",
    },
    [eyebrow, headline, footer],
  );
}
