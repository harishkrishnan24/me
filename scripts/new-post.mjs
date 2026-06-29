#!/usr/bin/env node
// Scaffold a new blog post: `npm run new:post "My Post Title"`.
// Creates src/content/blog/<slug>.md with valid frontmatter so the
// only manual step is writing the body.
import { writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BLOG_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "content",
  "blog",
);

/** Convert a title to a URL-safe slug. Throws if nothing usable remains. */
export function slugify(title) {
  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error(`Title "${title}" produces an empty slug.`);
  }
  return slug;
}

/** ISO date (YYYY-MM-DD) for frontmatter. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

function frontmatter(title, slug) {
  return `---
title: "${title.replace(/"/g, '\\"')}"
description: ""
date: ${today()}
tags: []
draft: true
---

Write your post here. Delete this line and start with a paragraph.

## A section

Some prose. Inline \`code\` and a [link](https://example.com).

\`\`\`ts
// Fenced code blocks are syntax-highlighted via Shiki.
const slug = "${slug}";
\`\`\`
`;
}

async function main() {
  const title = process.argv.slice(2).join(" ").trim();
  if (!title) {
    console.error('Usage: npm run new:post "My Post Title"');
    process.exit(1);
  }
  const slug = slugify(title);
  const file = join(BLOG_DIR, `${slug}.md`);

  await mkdir(BLOG_DIR, { recursive: true });
  try {
    await access(file);
    console.error(`✗ Post already exists: ${file}`);
    process.exit(1);
  } catch {
    // does not exist — good
  }
  await writeFile(file, frontmatter(title, slug), "utf8");
  console.log(`✓ Created ${file}`);
  console.log(`  Edit it, set draft: false, then commit to publish.`);
}

// Only run when invoked directly (so tests can import slugify safely).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
