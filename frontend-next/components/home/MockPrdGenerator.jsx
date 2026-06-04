import Link from "next/link";
import LandscapeShowcaseCard from "@/components/home/LandscapeShowcaseCard";
import { mockPrdSections } from "@/lib/showcase";

export default function MockPrdGenerator({ ctaHref, ctaLabel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <LandscapeShowcaseCard eyebrow="Form Input" title="Brief project untuk PRD" badge="Landscape Mock">
        <div className="grid gap-3">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Project idea</p>
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 leading-7 text-slate-300">
              Buatkan PRD enterprise untuk Payment Routing Service yang memilih
              provider terbaik berdasarkan biaya, success rate, metode pembayaran,
              dan status provider.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Target user" value="Merchant, finance ops, backend engineer" />
            <Field label="Tech stack" value="Next.js, Laravel, MongoDB" />
            <Field label="Skill level" value="Beginner to intermediate" />
            <Field label="Output" value="PRD Enterprise" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400"
            >
              Generate PRD
            </button>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Groq / OpenRouter / Gemini
            </span>
          </div>
        </div>
      </LandscapeShowcaseCard>

      <LandscapeShowcaseCard eyebrow="Output Preview" title="Dokumen PRD yang profesional" badge="Markdown + Mermaid" tone="dark">
        <div className="grid gap-3 sm:grid-cols-2">
          {mockPrdSections.map((section) => (
            <div
              key={section}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            >
              <p className="text-sm font-semibold text-white">{section}</p>
              <p className="mt-2 text-xs leading-6 text-slate-300">
                Ringkas, terstruktur, dan siap dipakai tim untuk memahami sistem.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
            Siap disimpan ke history
          </span>
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
            Siap diunduh ke Markdown
          </span>
          <Link
            href={ctaHref}
            className="ml-auto inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            {ctaLabel}
          </Link>
        </div>
      </LandscapeShowcaseCard>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}
