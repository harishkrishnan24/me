import { describe, it, expect } from "vitest";
import { sortByDateDesc, visiblePosts, type PostLike } from "./posts";

const make = (id: string, date: string, draft = false): PostLike => ({
  id,
  data: { date: new Date(date), draft },
});

describe("sortByDateDesc", () => {
  it("orders posts newest-first", () => {
    const out = sortByDateDesc([
      make("old", "2024-01-01"),
      make("new", "2026-06-01"),
      make("mid", "2025-03-15"),
    ]);
    expect(out.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const input = [make("a", "2024-01-01"), make("b", "2026-01-01")];
    const snapshot = input.map((p) => p.id);
    sortByDateDesc(input);
    expect(input.map((p) => p.id)).toEqual(snapshot);
  });
});

describe("visiblePosts", () => {
  const posts = [
    make("published", "2025-01-01", false),
    make("draft", "2026-01-01", true),
  ];

  it("hides drafts when includeDrafts is false (production)", () => {
    const out = visiblePosts(posts, false);
    expect(out.map((p) => p.id)).toEqual(["published"]);
  });

  it("includes drafts when includeDrafts is true (dev)", () => {
    const out = visiblePosts(posts, true);
    expect(out.map((p) => p.id).sort()).toEqual(["draft", "published"]);
  });
});
