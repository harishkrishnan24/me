// Pure helpers for ordering and filtering blog posts. Kept free of
// `astro:content` imports so they unit-test without an Astro runtime —
// pages pass `getCollection("blog")` results straight in.

export interface PostLike {
  id: string;
  data: {
    date: Date;
    draft: boolean;
  };
}

/** Return a new array sorted newest-first by `data.date` (non-mutating). */
export function sortByDateDesc<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

/**
 * Filter out drafts unless `includeDrafts` is true. Pass
 * `import.meta.env.DEV` so drafts show in `astro dev` but never in the
 * production build.
 */
export function visiblePosts<T extends PostLike>(
  posts: T[],
  includeDrafts: boolean,
): T[] {
  return includeDrafts ? posts : posts.filter((p) => !p.data.draft);
}
