import Link from "next/link";
import LandscapeShowcaseCard from "@/components/home/LandscapeShowcaseCard";
import { mockNextStepPhases } from "@/lib/showcase";

export default function MockNextStepPlanner({ ctaHref, ctaLabel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <LandscapeShowcaseCard eyebrow="Input / File Context" title="Susun roadmap dari PRD yang sudah matang">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Source mode
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>Form Input</Badge>
              <Badge active>Upload PRD .md / .txt</Badge>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Upload PRD context</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                .md / .txt / .pdf. Visual ini hanya mock preview, bukan upload aktif.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Planner prompt</p>
            <p className="mt-3 leading-7 text-slate-300">
              Pecah PRD menjadi milestone development, task prioritas, checklist
              testing, setup backend, setup frontend, dan deployment step.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge active>Mode Normal</Badge>
              <Badge>Agent: Auto</Badge>
            </div>
          </div>
        </div>
      </LandscapeShowcaseCard>

      <LandscapeShowcaseCard eyebrow="Planner Output" title="Roadmap tahap demi tahap yang siap dipakai" tone="dark">
        <div className="grid gap-3 md:grid-cols-3">
          {mockNextStepPhases.map((phase, index) => (
            <div
              key={phase.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/15 text-sm font-semibold text-sky-200">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-white">{phase.title}</p>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-6 text-slate-300">
                {phase.items.map((item) => (
                  <li key={item} className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
            Timeline, testing, deployment
          </span>
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
            Cocok untuk mahasiswa dan tim kecil
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

function Badge({ children, active = false }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "border border-sky-300/60 bg-sky-100 text-sky-800"
          : "border border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}
