import { describe, it, expect } from "vitest";
import { THEMES, nextTheme } from "./theme";

describe("nextTheme", () => {
  it("cycles light → dark → light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("falls back to light for an unknown value, including the retired crt theme", () => {
    expect(nextTheme("crt")).toBe("light");
    expect(nextTheme("solarized")).toBe("light");
  });

  it("exposes exactly the two supported themes, light first", () => {
    expect(THEMES).toEqual(["light", "dark"]);
  });
});
