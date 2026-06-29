import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

// The blog collection. Frontmatter is validated against this schema at
// build time — an invalid post fails `astro build`, which is the test
// that "blog management works" (Success Criterion #4).
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
