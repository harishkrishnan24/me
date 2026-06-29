import { describe, it, expect } from "vitest";
import { slugify } from "./new-post.mjs";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("My First Post")).toBe("my-first-post");
  });

  it("strips punctuation and symbols", () => {
    expect(slugify("Why I Left Medium (For Good!)")).toBe(
      "why-i-left-medium-for-good",
    );
  });

  it("collapses repeated separators and trims edges", () => {
    expect(slugify("  Astro   &&  You  ")).toBe("astro-you");
  });

  it("keeps numbers", () => {
    expect(slugify("Top 10 Tips for 2026")).toBe("top-10-tips-for-2026");
  });

  it("throws on empty/symbol-only titles", () => {
    expect(() => slugify("!!!")).toThrow();
    expect(() => slugify("")).toThrow();
  });
});
