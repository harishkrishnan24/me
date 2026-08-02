// One Open Graph card per published post, rendered at build time into
// dist/og/<slug>.png. Static output means there is no server to generate
// these on demand, so they must be real files.
import type { APIRoute, InferGetStaticPropsType } from "astro";
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
    name: "Instrument Serif",
    data: fontData(
      "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff",
    ),
    weight: 400 as const,
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

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props }) => {
  const svg = await satori(ogCard(props.title), {
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
