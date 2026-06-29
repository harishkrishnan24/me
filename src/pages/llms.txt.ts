import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { sortByDateDesc, visiblePosts } from "../lib/posts";
import { href } from "../lib/links";

// Generates /llms.txt — a structured, LLM-friendly map of the site
// following the llmstxt.org convention. Built from content so new
// posts and pages appear automatically. See https://llmstxt.org
export async function GET(context: APIContext) {
  const site = context.site ?? new URL("https://harishkrishnan24.github.io");
  const abs = (path: string) => new URL(href(path), site).href;

  const posts = sortByDateDesc(
    visiblePosts(await getCollection("blog"), false),
  );

  const pages: Array<[string, string, string]> = [
    ["About", "about", "Background, skills, work experience, and certifications."],
    ["Projects", "projects", "Selected software projects and what they explore."],
    ["Open Source", "opensource", "Repositories and community contributions."],
    ["Bookshelf", "bookshelf", "Books and papers currently reading and read."],
  ];

  const lines = [
    "# Harish Krishnan",
    "",
    "> Software engineer in Stockholm. Engineer at DigitalRoute, Udemy instructor, and writer on software engineering, AI systems, and the craft.",
    "",
    "This site is a static Astro build. Content is plain HTML with semantic markup and JSON-LD structured data. The blog is authored as Markdown.",
    "",
    "## Pages",
    ...pages.map(([title, path, desc]) => `- [${title}](${abs(path)}): ${desc}`),
    "",
    "## Writing",
    ...posts.map(
      (p) => `- [${p.data.title}](${abs(`blog/${p.id}/`)}): ${p.data.description}`,
    ),
    "",
    "## Feeds",
    `- [RSS feed](${abs("rss.xml")}): subscribe to new posts.`,
    `- [Sitemap](${abs("sitemap-index.xml")}): all indexed URLs.`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
