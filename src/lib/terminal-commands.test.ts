import { describe, it, expect } from "vitest";
import { runCommand } from "./terminal-commands";

describe("runCommand", () => {
  it("echoes the prompt line first", () => {
    expect(runCommand("whoami").lines[0]).toBe("harish@dev:~$ whoami");
  });

  it("lists commands for help", () => {
    expect(runCommand("help").lines.join("\n")).toContain("available commands:");
  });

  it("routes cd to a known section", () => {
    expect(runCommand("cd about").route).toBe("about");
    expect(runCommand("cd work").route).toBe("projects");
  });

  it("reports an unknown section without routing", () => {
    const r = runCommand("cd nowhere");
    expect(r.route).toBeUndefined();
    expect(r.lines.join("\n")).toContain("no such section: nowhere");
  });

  it("flags clear rather than emitting lines", () => {
    expect(runCommand("clear").clear).toBe(true);
  });

  it("reports unknown commands", () => {
    expect(runCommand("frobnicate").lines.join("\n")).toContain("command not found");
  });

  it("ignores surrounding whitespace and empty input", () => {
    expect(runCommand("   ").lines).toEqual(["harish@dev:~$ "]);
  });
});
