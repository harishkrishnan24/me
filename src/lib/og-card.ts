// Build-time Open Graph card for a blog post. Pure: returns a Satori
// element tree as plain `{ type, props }` objects — Satori accepts these
// directly, so the project needs no JSX runtime. Kept free of `satori`
// and `astro:content` imports so it unit-tests without either.

/** Open Graph's 1.91:1 convention. LinkedIn, X, and Slack all expect it. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const PADDING = 80;

// Satori reads neither CSS custom properties nor oklch(), so the palette
// is translated to sRGB hex here. These are the computed equivalents of
// the dark-theme tokens in src/styles/tokens.css — update both.
// An oklch() string passed to Satori renders BLACK, silently.
const COLOR = {
  bg: "#0f1012", // --bg (dark)
  fg: "#ebe8e2", // --fg
  dim: "#8d8a84", // --dim
  line: "#26282d", // --line
  accent: "#84b8a0", // --accent
  accent2: "#d9a55b", // --accent2
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
      el("span", { color: COLOR.accent }, "~/"),
      el("span", { color: COLOR.fg }, "harish"),
      el("span", { color: COLOR.dim }, ".dev"),
    ],
  );

  const headline = el("div", { display: "flex", flexDirection: "column" }, [
    el(
      "div",
      {
        fontSize,
        fontFamily: "Source Serif 4",
        fontWeight: 400,
        color: COLOR.fg,
        lineHeight: 1.06,
        letterSpacing: "-0.02em",
      },
      text,
    ),
    el("div", {
      marginTop: 36,
      width: 220,
      height: 5,
      backgroundImage: `linear-gradient(90deg, ${COLOR.accent} 0%, ${COLOR.accent2} 100%)`,
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
          color: COLOR.accent,
          border: `1px solid ${COLOR.line}`,
          borderRadius: 0,
          padding: "8px 14px",
        },
        "WRITING",
      ),
      el(
        "div",
        { marginLeft: 22, fontSize: 22, color: COLOR.dim },
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
      fontFamily: "Source Serif 4",
    },
    [eyebrow, headline, footer],
  );
}
