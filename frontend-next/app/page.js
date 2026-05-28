import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-8">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          MVP Workspace
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Rencanakan project AI kamu dari PRD sampai file Markdown yang siap dipakai.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
          VibePlan AI menghubungkan Next.js frontend ke Laravel REST API agar kamu
          bisa membuat PRD, Next Step Planner, dan Coding Prompt, lalu menyimpan
          hasilnya ke MongoDB untuk dibuka kembali atau diunduh sebagai
          {" "}
          <code className="rounded bg-slate-100 px-2 py-1 text-slate-700">.md</code>.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/generate"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Mulai generate
          </Link>
          <Link
            href="/history"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Lihat history
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          title="Generate"
          description="Kirim brief project ke Laravel API untuk menghasilkan PRD, Next Step Planner, atau Coding Prompt."
          href="/generate"
          cta="Buka generator"
        />
        <FeatureCard
          title="History"
          description="Baca ulang hasil yang sudah tersimpan di MongoDB, buka detail result, unduh Markdown, atau hapus history."
          href="/history"
          cta="Buka history"
        />
        <FeatureCard
          title="About Team"
          description="Siapkan halaman identitas tim untuk kebutuhan presentasi, demo, dan pelaporan akademik."
          href="/about-team"
          cta="Lihat tim"
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, description, href, cta }) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        {cta}
      </Link>
    </article>
  );
}
