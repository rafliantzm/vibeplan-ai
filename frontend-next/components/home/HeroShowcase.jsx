import Link from "next/link";
import FloatingBadges from "@/components/home/FloatingBadges";
import RevealOnScroll from "@/components/home/RevealOnScroll";

const previewRows = [
  {
    label: "PRD Generator",
    value: "Executive Summary, Problem Statement, ERD, Data Dictionary",
  },
  {
    label: "Next Step Planner",
    value: "Milestone, setup stack, testing checklist, deployment plan",
  },
  {
    label: "Coding Prompt",
    value: "Prompt siap tempel untuk Codex, Claude, dan Cursor",
  },
];

export default function HeroShowcase() {
  return (
    <section className="grid gap-7 rounded-[2.75rem] border border-white/70 bg-white/78 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur sm:p-8 xl:p-10">
      <div className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          AI Planning Workspace
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
          Rencanakan project AI kamu dari ide mentah menjadi PRD, roadmap
          development, dan coding prompt siap pakai.
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
          VibePlan AI membantu mahasiswa dan developer membuat Product
          Requirement Document, Next Step Planner, dan Coding Prompt dengan
          bantuan AI, lalu menyimpan hasilnya ke MongoDB agar bisa dibuka
          kembali, ditinjau ulang, dan diunduh sebagai Markdown.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/generate"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700"
          >
            Mulai Generate
          </Link>
          <Link
            href="/history"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
          >
            Lihat History
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <RevealOnScroll delay={60}>
          <Metric label="Output utama" value="PRD, Next Step, Coding Prompt" />
        </RevealOnScroll>
        <RevealOnScroll delay={120}>
          <Metric label="Penyimpanan" value="MongoDB + history detail" />
        </RevealOnScroll>
        <RevealOnScroll delay={180}>
          <Metric label="Dukungan" value="Admin, token request, live chat" />
        </RevealOnScroll>
      </div>

      <RevealOnScroll delay={220} className="relative min-w-0">
        <FloatingBadges />
        <div className="home-float home-float-1 home-glow-panel max-h-[34rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-4 text-white shadow-2xl shadow-slate-900/20">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              Workspace Preview
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="home-shimmer rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                Brief Project
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Buat aplikasi AI untuk membantu pemula coding menyusun PRD, roadmap,
                dan coding prompt dari satu form yang mudah dipahami.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <MiniPanel
                  title="AI Flow"
                  text="Input idea -> Laravel API -> AI Provider -> MongoDB"
                />
                <MiniPanel
                  title="Output"
                  text="Result viewer, history, dan Markdown export."
                />
              </div>
            </div>

            <div className="grid gap-3">
              {previewRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {row.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function MiniPanel({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-xs leading-6 text-slate-200">{text}</p>
    </div>
  );
}
