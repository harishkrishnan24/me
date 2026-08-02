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
  bg: "#0a0a0c", // --bg
  fg: "#edeae3", // --fg
  dim: "#8b8880", // --dim
  line: "rgba(237, 234, 227, 0.13)", // --line
  accent: "#7bd77f", // --accent  oklch(0.80 0.15 145)
  accent2: "#f2b036", // --accent2 oklch(0.80 0.15 78)
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
 * Measured for Instrument Serif 400 at -0.02em in the 1040px content column:
 * roughly 45/50/58 characters per line at 72/64/56px. The space between
 * eyebrow and footer allows three lines. The character budget is a coarse
 * proxy for a proportional font — a guard against absurd titles, not a
 * layout mechanism.
 *
 * Thresholds derived by binary-searching the 3→4 line transition:
 *   72px: 3-line max = 129 chars → step down at 90 (2-line natural fill)
 *   64px: 3-line max = 141 chars → step down at 140 (3-line max fill)
 *   56px: 3-line max = 164 chars → truncate at 160 (buffer before overflow)
 */
export function titleLayout(title: string): { text: string; fontSize: number } {
  if (title.length <= 90) return { text: title, fontSize: 72 };
  if (title.length <= 140) return { text: title, fontSize: 64 };
  return { text: truncate(title, 160), fontSize: 56 };
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
        fontFamily: "Instrument Serif",
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
      fontFamily: "Instrument Serif",
    },
    [eyebrow, headline, footer],
  );
}
