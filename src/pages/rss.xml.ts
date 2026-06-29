import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { sortByDateDesc, visiblePosts } from "../lib/posts";
import { href } from "../lib/links";

export async function GET(context: APIContext) {
  const all = await getCollection("blog");
  // Never include drafts in the public feed, regardless of dev/prod.
  const posts = sortByDateDesc(visiblePosts(all, false));

  return rss({
    title: "Harish Krishnan — Writing",
    description:
      "Essays on software engineering, AI systems, and the craft, by Harish Krishnan.",
    site: context.site ?? "https://harishkrishnan24.github.io",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: href(`blog/${post.id}/`),
      categories: post.data.tags,
    })),
  });
}
