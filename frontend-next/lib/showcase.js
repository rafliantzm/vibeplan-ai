export const showcaseTabs = [
  {
    id: "prd",
    label: "Generate PRD",
    title: "Generate PRD enterprise dari ide mentah",
    description:
      "Ubah brief project menjadi dokumen kerja berisi problem statement, user journey, ERD, data dictionary, dan API design.",
    ctaLabel: "Buka Generator",
    ctaHref: "/generate",
  },
  {
    id: "next-step",
    label: "Next Step Planner",
    title: "Pecah PRD menjadi roadmap implementasi",
    description:
      "Susun tahapan development, prioritas task, checklist testing, dan deployment plan tanpa kehilangan konteks produk.",
    ctaLabel: "Buat Next Step Planner",
    ctaHref: "/generate",
  },
  {
    id: "coding-prompt",
    label: "Coding Prompt",
    title: "Siapkan prompt coding siap pakai untuk agent",
    description:
      "Bangun prompt implementasi yang jelas untuk Codex, Claude, atau Cursor berdasarkan roadmap dan requirement yang sudah matang.",
    ctaLabel: "Generate Coding Prompt",
    ctaHref: "/generate",
  },
  {
    id: "history",
    label: "History",
    title: "Semua hasil generate tersimpan dan bisa dibuka kembali",
    description:
      "Lihat ulang dokumen yang sudah pernah dibuat, unduh markdown, atau hapus item yang sudah tidak dipakai.",
    ctaLabel: "Lihat History",
    ctaHref: "/history",
  },
  {
    id: "result",
    label: "Result Preview",
    title: "Preview hasil akhir yang siap dibaca tim dan developer",
    description:
      "Result viewer menampilkan section penting seperti API Design, Data Dictionary, Mermaid diagram, dan export Markdown.",
    ctaLabel: "Lihat Result Flow",
    ctaHref: "/history",
  },
];

export const heroBadges = [
  "PRD Enterprise",
  "User Journey",
  "ERD",
  "Data Dictionary",
  "Next Step",
  "Coding Prompt",
];

export const quickFeatures = [
  {
    label: "Output Utama",
    title: "PRD, Next Step, Coding Prompt",
    description:
      "Tiga output inti untuk membantu planning, breakdown development, dan prompt coding siap agent.",
    chip: "3 output utama",
  },
  {
    label: "Penyimpanan",
    title: "MongoDB + History Detail",
    description:
      "Semua hasil generate tersimpan, bisa dibuka lagi, ditinjau ulang, lalu diunduh sebagai Markdown.",
    chip: "persistent storage",
  },
  {
    label: "Dukungan",
    title: "Admin, Token Request, Live Chat",
    description:
      "Lapisan operasional untuk mengelola user, bantuan, token, dan konfigurasi AI secara lebih realistis.",
    chip: "support layer",
  },
];

export const workflowSteps = [
  {
    title: "Input Idea",
    description: "Pengguna menulis ide project, target user, dan masalah utama.",
  },
  {
    title: "Laravel API",
    description: "Backend memvalidasi input lalu menyusun prompt sesuai tipe generate.",
  },
  {
    title: "AI Provider",
    description: "Provider aktif memproses brief menjadi dokumen planning yang terstruktur.",
  },
  {
    title: "MongoDB",
    description: "Hasil disimpan agar bisa dibuka lagi di history, result, dan admin review.",
  },
  {
    title: "Result Viewer",
    description: "Dokumen ditampilkan dengan preview section, diagram, dan metadata penting.",
  },
  {
    title: "Download Markdown",
    description: "User menyalin, mengunduh, atau memakai hasil tersebut untuk coding agent.",
  },
];

export const outputHighlights = [
  "PRD Enterprise",
  "Problem Statement",
  "User Journey",
  "Data Model & ERD",
  "Data Dictionary",
  "API Design",
  "Next Step Planner",
  "Coding Prompt",
  "Markdown Export",
];

export const academicValuePoints = [
  "Problem solving: ide mentah diterjemahkan menjadi dokumen kerja yang lebih jelas.",
  "AI integration: mendemonstrasikan penggunaan provider AI secara nyata di aplikasi web.",
  "Technical implementation: frontend Next.js, backend Laravel, dan MongoDB terhubung end-to-end.",
  "Documentation ready: hasil, history, README, dan flow presentasi mudah dijelaskan saat UTS.",
];

export const whyVibePlan = [
  {
    title: "Bahasa hasil lebih terstruktur",
    description:
      "Output tidak berhenti di ide umum, tetapi diarahkan menjadi section-section yang bisa langsung dipakai.",
  },
  {
    title: "Sinkron dengan workflow coding agent",
    description:
      "Next Step Planner dan Coding Prompt menjaga konteks agar implementasi tidak melompat-lompat.",
  },
  {
    title: "Ada layer admin dan support",
    description:
      "Admin Dashboard, Token Request, Live Chat, dan AI Settings membuat sistem lebih realistis sebagai web app.",
  },
];

export const mockPrdSections = [
  "Executive Summary",
  "Problem Statement",
  "User Journey",
  "Data Model & ERD",
  "API Design",
  "Data Dictionary",
];

export const mockNextStepPhases = [
  {
    title: "Phase 1 - Setup Inti",
    items: ["Auth, database, dan struktur project", "Environment AI provider", "Result viewer dasar"],
  },
  {
    title: "Phase 2 - Fitur AI",
    items: ["Generate PRD", "Generate Next Step Planner", "Generate Coding Prompt"],
  },
  {
    title: "Phase 3 - Operasional",
    items: ["History dan download markdown", "Token request", "Testing dan deployment"],
  },
];

export const mockCodingPromptMeta = [
  "Target files: ResultViewer, GenerateController, showcase renderer",
  "Acceptance criteria: mermaid lebih ringkas, data dictionary enterprise, API cards rapi",
  "Testing: build frontend, cek result page, validasi tidak ada overflow",
];

export const mockHistoryItems = [
  {
    title: "Payment Routing Service",
    time: "Hari ini, 13:40",
    type: "PRD Enterprise",
  },
  {
    title: "EduGuide AI Planner",
    time: "Kemarin, 21:15",
    type: "Next Step Planner",
  },
  {
    title: "Renderer Improvement Prompt",
    time: "Kemarin, 21:27",
    type: "Coding Prompt",
  },
];

export const mockResultCards = [
  {
    title: "Result PRD",
    caption: "API Design, Data Dictionary, ERD, dan User Journey tampil sebagai dokumen kerja.",
  },
  {
    title: "Result Next Step",
    caption: "Roadmap disusun per fase dengan prioritas task, checklist, dan handoff ke coding agent.",
  },
  {
    title: "Result Coding Prompt",
    caption: "Prompt implementasi lengkap dengan target files, rules, dan acceptance criteria.",
  },
];

export const adminShowcase = [
  {
    title: "AI Settings",
    description: "Kelola provider, model aktif, validasi API key, dan fallback model.",
  },
  {
    title: "Token Request",
    description: "Admin memproses permintaan reset token dari user secara terkontrol.",
  },
  {
    title: "Live Chat Support",
    description: "Percakapan user dan guest masuk ke inbox admin untuk dibalas langsung.",
  },
  {
    title: "User Management",
    description: "Pantau user, role, status, password reset, dan kebijakan token dari satu panel.",
  },
];

export const resultPreviewSections = [
  {
    title: "API Design",
    detail: "POST /api/v1/payments, GET /api/v1/payments/{id}, webhook callback, admin provider config.",
  },
  {
    title: "Data Dictionary",
    detail: "MERCHANTS, PAYMENTS, PROVIDERS, ROUTING_RULES, PAYMENT_EVENTS, WEBHOOK_LOGS.",
  },
  {
    title: "Mermaid Diagram",
    detail: "ERD dan flow sistem divisualisasikan agar developer lebih cepat memahami relasi data.",
  },
];
