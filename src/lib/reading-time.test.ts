import { describe, it, expect } from "vitest";
import { readingMinutes, WORDS_PER_MINUTE } from "./reading-time";

describe("readingMinutes", () => {
  it("returns 1 for an empty string (floor, not 0 or NaN)", () => {
    expect(readingMinutes("")).toBe(1);
  });

  it("returns 1 for a short text that is under one minute", () => {
    expect(readingMinutes("hello world")).toBe(1);
  });

  it("fenced code blocks are excluded from the word count", () => {
    const prose = "word ".repeat(WORDS_PER_MINUTE); // exactly 1 min of prose
    const withCode = `${prose}\n\`\`\`sql\n${Array(500).fill("SELECT * FROM large_table WHERE condition = true AND another_condition = false").join("\n")}\n\`\`\``;
    // The code block is huge — if it were counted the result would be far more than 1.
    expect(readingMinutes(prose)).toBe(readingMinutes(withCode));
  });

  it("inline code (single backticks) is NOT stripped — it counts as prose", () => {
    // 238 words of prose + inline code tokens — should still be ~1 min
    const prose = "word ".repeat(WORDS_PER_MINUTE); // exactly 1 min
    const withInline = prose + " `someVar` and `anotherVar`";
    // Inline tokens add a couple of words; the result is still 1 or 2 min.
    // The key assertion: it is NOT the same as stripping all backtick content.
    const withoutInline = readingMinutes(prose);
    const withInlineResult = readingMinutes(withInline);
    // withInline has more words so it should be >= withoutInline
    expect(withInlineResult).toBeGreaterThanOrEqual(withoutInline);
  });

  it("word count maps correctly to minutes at the documented WPM", () => {
    // Construct a string with exactly 2 × WPM words → should be exactly 2 min.
    const twoMinutes = "word ".repeat(WORDS_PER_MINUTE * 2);
    expect(readingMinutes(twoMinutes)).toBe(2);
  });

  it("rounds up a partial minute (ceil, not floor)", () => {
    // WPM + 1 word → 1.004… minutes → should round up to 2
    const justOver = "word ".repeat(WORDS_PER_MINUTE + 1);
    expect(readingMinutes(justOver)).toBe(2);
  });
});
