import Link from "next/link";
import LandscapeShowcaseCard from "@/components/home/LandscapeShowcaseCard";
import { mockCodingPromptMeta } from "@/lib/showcase";

export default function MockCodingPromptGenerator({ ctaHref, ctaLabel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <LandscapeShowcaseCard eyebrow="Input Requirement" title="Generate prompt coding dengan konteks yang jelas">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Feature request</p>
            <p className="mt-3 leading-7 text-slate-300">
              Update PRD Result Renderer agar Mermaid ERD tampil compact dan Data
              Dictionary menjadi table enterprise yang rapi di browser.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Stack selector
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Next.js", "Laravel", "MongoDB", "Tailwind"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">
              Optional context upload: roadmap .md / feature spec .txt. Hanya mock
              visual untuk homepage.
            </div>
          </div>
        </div>
      </LandscapeShowcaseCard>

      <LandscapeShowcaseCard eyebrow="Prompt Output" title="Output siap tempel ke Codex, Claude, atau Cursor" tone="dark">
        <div className="home-shimmer overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
          <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            coding-prompt.md
          </div>
          <div className="space-y-3 px-4 py-4 text-sm leading-7 text-slate-200">
            <p>
              Perbaiki renderer result agar ERD, Data Dictionary, dan API cards lebih
              enterprise tanpa merusak history, download markdown, atau layout admin.
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              {mockCodingPromptMeta.map((item) => (
                <div key={item} className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-xs leading-6 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-100">
            Safety constraint included
          </span>
          <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-100">
            Acceptance criteria ready
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
