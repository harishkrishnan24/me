// Theme cycling. `nextTheme` is pure so it can be tested without a DOM;
// `applyTheme` is the only part that touches the document.

export const THEMES = ["dark", "light", "crt"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "hk-theme";

/** Next theme in the cycle. Unknown input restarts at the first theme. */
export function nextTheme(current: string): Theme {
  const i = THEMES.indexOf(current as Theme);
  return i === -1 ? THEMES[0] : THEMES[(i + 1) % THEMES.length];
}

/** Apply to the document, persist, and notify listeners (the glyph canvas). */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}
