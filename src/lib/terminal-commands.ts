// Pure terminal command runner — no DOM access.
// Consumed by CommandDeck.astro for the backtick terminal overlay.

export interface CommandResult {
  lines: string[];
  route?: string;
  clear?: boolean;
}

// Section alias map: user-typed name → internal route key
const SECTION_MAP: Record<string, string> = {
  home: "",
  "~": "",
  about: "about",
  work: "projects",
  projects: "projects",
  writing: "blog",
  blog: "blog",
  opensource: "opensource",
  "open-source": "opensource",
};

const HELP_TEXT = [
  "available commands:",
  "  help       — this message",
  "  whoami     — identify yourself",
  "  ls         — list site sections",
  "  cd <sec>   — navigate to a section",
  "  theme      — current theme",
  "  social     — social links",
  "  sudo       — nice try",
  "  clear      — clear the terminal",
];

export function runCommand(input: string, currentTheme = "dark"): CommandResult {
  const trimmed = input.trim();
  const promptLine = `harish@dev:~$ ${trimmed}`;

  // Empty input — return only the prompt line
  if (!trimmed) {
    return { lines: [promptLine] };
  }

  const [head, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ");

  switch (head) {
    case "help":
      return { lines: [promptLine, ...HELP_TEXT] };

    case "whoami":
      return {
        lines: [
          promptLine,
          "harish krishnan",
          "software engineer · stockholm",
          "building systems, writing about them",
        ],
      };

    case "ls":
      return {
        lines: [
          promptLine,
          "home/  about/  projects/  writing/  opensource/",
        ],
      };

    case "cd": {
      if (!arg) {
        return { lines: [promptLine, "usage: cd <section>"] };
      }
      const key = arg.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(SECTION_MAP, key)) {
        return { lines: [promptLine], route: SECTION_MAP[key] };
      }
      return { lines: [promptLine, `no such section: ${arg}`] };
    }

    case "theme":
      return {
        lines: [
          promptLine,
          "current theme: " + currentTheme,
          "press T to cycle themes",
        ],
      };

    case "social":
      return {
        lines: [
          promptLine,
          "twitter / x  — @harishkforu",
          "github       — github.com/harishkrishnan24",
          "linkedin     — linkedin.com/in/harishkrishnan1993",
        ],
      };

    case "sudo":
      return { lines: [promptLine, "nice try."] };

    case "clear":
      return { lines: [], clear: true };

    default:
      return {
        lines: [promptLine, `${head}: command not found — try \`help\``],
      };
  }
}
