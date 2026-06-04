import Link from "next/link";
import LandscapeShowcaseCard from "@/components/home/LandscapeShowcaseCard";
import { mockResultCards, resultPreviewSections } from "@/lib/showcase";

export default function MockResultPreview({ ctaHref, ctaLabel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <LandscapeShowcaseCard eyebrow="Result: PRD Enterprise" title="Document sections dan visual output" tone="dark">
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Document Sections
            </p>
            <div className="mt-3 grid gap-2">
              {["Problem Statement", "Functional Requirements", "API Design", "Development Notes"].map((item) => (
                <div key={item} className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Visual Output
            </p>
            <div className="mt-3 grid gap-2">
              {resultPreviewSections.map((section) => (
                <div key={section.title} className="rounded-xl border border-white/8 bg-black/15 px-3 py-3">
                  <p className="text-sm font-semibold text-white">{section.title}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-300">{section.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LandscapeShowcaseCard>

      <LandscapeShowcaseCard eyebrow="Result Variants" title="PRD, Next Step, dan Coding Prompt saling terhubung">
        <div className="grid gap-3">
          {mockResultCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">{card.caption}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            Download Markdown
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            Copy Section
          </span>
          <Link
            href={ctaHref}
            className="ml-auto inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700"
          >
            {ctaLabel}
          </Link>
        </div>
      </LandscapeShowcaseCard>
    </div>
  );
}
