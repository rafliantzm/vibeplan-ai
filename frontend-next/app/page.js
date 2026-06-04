import Link from "next/link";
import HeroShowcase from "@/components/home/HeroShowcase";
import ProductShowcase from "@/components/home/ProductShowcase";
import RevealOnScroll from "@/components/home/RevealOnScroll";
import {
  academicValuePoints,
  adminShowcase,
  outputHighlights,
  quickFeatures,
  whyVibePlan,
  workflowSteps,
} from "@/lib/showcase";

export default function Home() {
  return (
    <div className="home-showcase grid gap-8 lg:gap-10">
      <HeroShowcase />

      <section className="grid gap-4 md:grid-cols-3">
        {quickFeatures.map((feature) => (
          <RevealOnScroll
            key={feature.title}
            delay={80}
            className="group rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-lg shadow-slate-900/5 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                  {feature.label}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">{feature.title}</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 transition group-hover:border-sky-200 group-hover:text-sky-700">
                {feature.chip}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {feature.description}
            </p>
          </RevealOnScroll>
        ))}
      </section>

      <ProductShowcase />

      <section className="grid gap-6 rounded-[2.5rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <RevealOnScroll className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            AI Workflow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Dari ide project ke hasil yang siap dipakai tim
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Workflow VibePlan AI dibuat sederhana untuk orang awam, tetapi cukup
            lengkap untuk kebutuhan technical planning yang nyata.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-4 py-4"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        <div className="grid gap-4">
          <RevealOnScroll
            className="home-glow-panel home-system-panel rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-slate-900/15"
            delay={140}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                Alur Sistem
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                Landscape Flow
              </span>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {["Frontend Next.js", "Laravel API", "AI Provider"].map((node, index) => (
                    <div
                      key={node}
                      className="home-system-node rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-center text-sm font-semibold text-white"
                      style={{ animationDelay: `${index * 0.45}s` }}
                    >
                      {node}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 overflow-hidden text-[11px] uppercase tracking-[0.15em] text-sky-200/80">
                  <span className="home-flow-chip rounded-full border border-white/10 bg-white/5 px-3 py-1">Validate brief</span>
                  <span className="text-white/40">-&gt;</span>
                  <span className="home-flow-chip rounded-full border border-white/10 bg-white/5 px-3 py-1" style={{ animationDelay: "0.5s" }}>Generate output</span>
                  <span className="text-white/40">-&gt;</span>
                  <span className="home-flow-chip rounded-full border border-white/10 bg-white/5 px-3 py-1" style={{ animationDelay: "1s" }}>Save to MongoDB</span>
                </div>
              </div>
              <div className="home-system-caption rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-200">
                Backend memvalidasi input, meneruskan prompt ke provider AI aktif,
                menyimpan hasil ke MongoDB, lalu mengembalikan result ke viewer agar
                bisa dibaca, diunduh, atau dipakai lagi.
              </div>
            </div>
          </RevealOnScroll>

          <div className="grid gap-4 md:grid-cols-2">
            <RevealOnScroll
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5"
              delay={200}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fitur Pendukung
              </p>
              <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-600">
                <li>History dan Result Detail</li>
                <li>Download Markdown</li>
                <li>Profile dan Token Request</li>
                <li>Live Chat Support</li>
              </ul>
            </RevealOnScroll>
            <RevealOnScroll
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5"
              delay={260}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Layer Admin
              </p>
              <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-600">
                {adminShowcase.map((item) => (
                  <li key={item.title}>{item.title}</li>
                ))}
              </ul>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      <section className="home-output-section grid gap-6 rounded-[2.5rem] border border-white/70 bg-white/78 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <RevealOnScroll className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Output Preview
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Hasil yang tidak berhenti di satu dokumen saja
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            VibePlan AI menunjukkan seluruh rantai output mulai dari planning,
            breakdown task, sampai prompt implementasi yang siap dipakai coding agent.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {outputHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5"
              >
                {item}
              </span>
            ))}
          </div>
        </RevealOnScroll>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PreviewCard
            title="PRD Generator"
            detail="Membuat dokumen awal yang menjelaskan masalah, solusi, ERD, API, dan kebutuhan sistem."
            index={0}
          />
          <PreviewCard
            title="Next Step Planner"
            detail="Mengubah PRD menjadi tahap development, checklist, dan prioritas implementasi."
            index={1}
          />
          <PreviewCard
            title="Coding Prompt Generator"
            detail="Menyusun prompt implementasi yang lebih aman, fokus, dan siap dipakai agent."
            index={2}
          />
          <PreviewCard
            title="Result + History"
            detail="Semua hasil dapat dibuka lagi, diunduh, atau dipakai sebagai konteks pekerjaan berikutnya."
            index={3}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <RevealOnScroll className="rounded-[2.25rem] border border-slate-200 bg-white/88 p-6 shadow-lg shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Why VibePlan AI
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Kenapa cocok untuk mahasiswa dan developer pemula
          </h2>
          <div className="mt-5 grid gap-4">
            {whyVibePlan.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        <RevealOnScroll
          className="rounded-[2.25rem] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-lg shadow-slate-900/5"
          delay={120}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Academic Value
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Relevan untuk presentasi, demo, dan penilaian UTS
          </h2>
          <div className="mt-5 grid gap-3">
            {academicValuePoints.map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/80 bg-white/85 p-4 shadow-sm shadow-slate-900/5"
              >
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <RevealOnScroll className="home-cta-panel rounded-[2.75rem] border border-slate-200 bg-slate-900 px-6 py-8 text-white shadow-2xl shadow-slate-900/15 sm:px-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
              Ready to Explore
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Mulai dari ide sederhana, lalu bangun dokumen yang lebih siap dipakai.
            </h2>
            <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">
              Gunakan homepage ini sebagai gambaran produk, lalu lanjutkan ke halaman
              generate untuk mencoba alur nyata VibePlan AI.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/generate"
              className="home-cta-button inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Mulai Generate
            </Link>
            <Link
              href="/history"
              className="home-cta-button home-cta-button-secondary inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Lihat History
            </Link>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
}

function PreviewCard({ title, detail, index = 0 }) {
  return (
    <article
      className="home-output-card rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5"
      style={{ animationDelay: `${index * 0.35}s` }}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p>
    </article>
  );
}
