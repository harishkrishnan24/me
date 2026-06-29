// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Deployed to GitHub Pages as a project site: harishkrishnan24.github.io/me
// `base` MUST be honored by every internal link/asset (use BASE_URL helpers,
// never hardcode "/"), or production 404s.
export default defineConfig({
  site: "https://harishkrishnan24.github.io",
  base: "/me",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      // Themed to the dark editorial palette; tuned further in global styles.
      theme: "github-dark",
      wrap: true,
    },
  },
});
