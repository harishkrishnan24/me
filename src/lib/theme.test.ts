import { describe, it, expect } from "vitest";
import { THEMES, nextTheme } from "./theme";

describe("nextTheme", () => {
  it("cycles dark → light → crt → dark", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("crt");
    expect(nextTheme("crt")).toBe("dark");
  });

  it("falls back to the first theme for an unknown value", () => {
    expect(nextTheme("solarized")).toBe("dark");
  });

  it("exposes exactly the three supported themes", () => {
    expect(THEMES).toEqual(["dark", "light", "crt"]);
  });
});
