export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

export const GENERATION_TYPES = [
  {
    value: "prd",
    label: "PRD Generator",
    description:
      "Buat Product Requirements Document lengkap dengan alur, arsitektur, dan ERD.",
  },
  {
    value: "next-step",
    label: "Next Step Planner",
    description:
      "Uraikan langkah kerja setelah PRD selesai agar implementasi lebih terarah.",
  },
  {
    value: "coding-prompt",
    label: "Coding Prompt Generator",
    description:
      "Hasilkan prompt siap pakai untuk Codex, Copilot, Claude Code, dan tools sejenis.",
  },
];

export const AGENT_OPTIONS = [
  {
    value: "codex",
    label: "Codex",
    description:
      "Cocok untuk implementasi full-stack terstruktur, multi-file, dan task-by-task coding.",
  },
  {
    value: "claude_code",
    label: "Claude Code",
    description:
      "Cocok untuk memahami codebase, debugging, refactor, dan workflow terminal/IDE agentic.",
  },
  {
    value: "github_copilot",
    label: "GitHub Copilot",
    description:
      "Cocok untuk workflow VS Code/GitHub, issue-to-PR, autocomplete, dan agent mode.",
  },
  {
    value: "antigravity",
    label: "Antigravity",
    description:
      "Cocok untuk workflow agentic, task decomposition, dan alur berbasis skills/MCP.",
  },
  {
    value: "manual_beginner",
    label: "Manual Beginner Guide",
    description:
      "Cocok jika ingin roadmap yang lebih manual tanpa bergantung pada coding agent penuh.",
  },
];

export const GENERATION_LABELS = GENERATION_TYPES.reduce((accumulator, item) => {
  accumulator[item.value] = item.label;
  return accumulator;
}, {});

export const DEFAULT_FORM = {
  project_name: "",
  project_idea: "",
  target_user: "",
  main_problem: "",
  app_type: "Web Application",
  tech_stack: "Next.js, Laravel, MongoDB",
  skill_level: "Beginner",
  initial_prd: "",
};
