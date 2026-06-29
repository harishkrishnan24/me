// Base-aware link resolution. The site deploys under base "/me" on
// GitHub Pages, so every internal href MUST be prefixed with BASE_URL.
// Centralizing it here means no component ever hardcodes "/".

const base = import.meta.env.BASE_URL; // "/me" in prod, "/" in some contexts

/** Resolve an internal path against the deploy base, collapsing slashes. */
export function href(path: string): string {
  return `${base}/${path}`.replace(/\/{2,}/g, "/");
}

/** True if `pathname` (from Astro.url) matches the given internal path. */
export function isActive(pathname: string, path: string): boolean {
  const a = href(path).replace(/\/$/, "");
  const b = pathname.replace(/\/$/, "");
  return a === b;
}

export interface NavLink {
  label: string;
  /** Internal path (resolved via href) or absolute external URL. */
  path: string;
  external?: boolean;
}

// Bookshelf is intentionally not in the primary nav — it's reachable from
// the footer. The primary nav foregrounds Projects, Writing, and Open Source.
export const navLinks: NavLink[] = [
  { label: "Home", path: "" },
  { label: "About", path: "about" },
  { label: "Projects", path: "projects" },
  { label: "Writing", path: "blog" },
  { label: "Open Source", path: "opensource" },
  {
    label: "Udemy",
    path: "https://www.udemy.com/user/harish-krishnan-5/",
    external: true,
  },
];
