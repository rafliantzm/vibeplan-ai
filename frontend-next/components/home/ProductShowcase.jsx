import FeaturePreviewTabs from "@/components/home/FeaturePreviewTabs";

export default function ProductShowcase() {
  return (
    <section className="grid gap-6 rounded-[2.5rem] border border-white/70 bg-white/72 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur sm:p-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          Product Showcase
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Explore VibePlan AI Workflow
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          Preview homepage ini tidak memanggil API asli. Semua panel di bawah memakai
          mock data agar alur PRD, Next Step Planner, Coding Prompt, History, dan
          Result bisa dipahami dengan cepat oleh pengguna baru.
        </p>
      </div>

      <FeaturePreviewTabs />
    </section>
  );
}
