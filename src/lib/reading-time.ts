// Pure reading-time helper. No Astro imports, no DOM — safe to unit-test.

/**
 * Average adult reading speed for technical prose.
 * 238 wpm is the figure reported by Brysbaert et al. (2019,
 * "How many words do we read per minute?") for non-fiction reading.
 * It is lower than the 250-265 cited for fiction because technical text
 * requires more re-reading and parsing.
 */
export const WORDS_PER_MINUTE = 238;

/**
 * Estimate reading time for a Markdown string in whole minutes.
 *
 * Fenced code blocks (```...```) are stripped before counting because
 * readers skim or skip them; including them inflates estimates noticeably
 * for posts that contain large SQL or config snippets.
 * Inline code (`backtick`) is left in: it reads as prose and its removal
 * would require tracking context across tokens.
 *
 * Returns a minimum of 1 even for empty input.
 */
export function readingMinutes(markdown: string): number {
  // Strip fenced code blocks (``` ... ```) — non-greedy, dotAll so newlines match.
  const stripped = markdown.replace(/```[\s\S]*?```/g, "");
  const wordCount = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
