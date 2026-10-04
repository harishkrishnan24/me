// Project data shared by the home page ("Selected projects") and /projects.
export interface ProjectLink {
  label: string;
  url: string;
}
export interface Project {
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  tech: string[];
  links: ProjectLink[];
}

export const projects: Project[] = [
  {
    title: "Monkey Language Interpreter",
    summary: "A programming language interpreter built from first principles — twice.",
    description:
      "A full interpreter for the Monkey language, built from scratch following Thorsten Ball's Writing an Interpreter in Go — then re-implemented in Rust to contrast the two languages' approaches to ownership and pattern matching.",
    highlights: [
      "Hand-written lexer and Pratt parser",
      "Tree-walking evaluator with closures and higher-order functions",
      "Interactive REPL",
      "Implemented in both Go and Rust",
    ],
    tech: ["Go", "Rust"],
    links: [
      {
        label: "interpreter (Go)",
        url: "https://github.com/harishkrishnan24/interpreter",
      },
      {
        label: "monkey-interpreter (Rust)",
        url: "https://github.com/Code-With-HK/monkey-interpreter-rust",
      },
    ],
  },
  {
    title: "Redux, From Scratch",
    summary: "Reverse-engineering Redux's core to learn how predictable state really works.",
    description:
      "A from-scratch reimplementation of Redux's core, reverse-engineered from the library to understand exactly how its predictable state container is wired together.",
    highlights: [
      "createStore with dispatch / subscribe / getState",
      "Reducer composition",
      "Middleware via applyMiddleware",
      "Action dispatch and listener flow",
    ],
    tech: ["JavaScript"],
    links: [
      {
        label: "redux-from-scratch",
        url: "https://github.com/elclassicoder/redux-from-scratch",
      },
    ],
  },
];
