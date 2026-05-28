import Image from "next/image";
import Link from "next/link";

const PRODUCT_ITEMS = [
  { label: "Tentang VibePlan AI", href: "/" },
  { label: "PRD Generator", href: "/generate" },
  { label: "Next Step Planner", href: "/generate" },
  { label: "Coding Prompt Generator", href: "/generate" },
];

const HELP_ITEMS = [
  { label: "Hubungi Admin", href: "/admin" },
  { label: "Syarat dan Ketentuan" },
  { label: "Kebijakan Privasi" },
];

const SECURITY_ITEMS = [
  "Akun Aman",
  "Riwayat Tertata",
  "Data Project Lebih Rapi",
];

export default function Footer() {
  return (
    <footer className="relative mt-10 w-full overflow-hidden border-t border-slate-200/70 bg-gradient-to-b from-white via-slate-50 to-sky-50/50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-10 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-violet-200/35 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative w-full rounded-[2.5rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-8 lg:p-10">
          <div className="w-full rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(15,23,42,0.04),_rgba(14,165,233,0.07),_rgba(99,102,241,0.08))] p-5 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
              <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
                <div className="flex items-center justify-center gap-3 lg:justify-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] border border-white/80 bg-white shadow-sm shadow-slate-900/10 md:h-16 md:w-16">
                    <Image
                      src="/brand/vibeplan-logo.png"
                      alt="VibePlan AI Logo"
                      width={52}
                      height={52}
                      className="h-10 w-10 object-contain md:h-12 md:w-12"
                    />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-700 sm:text-base">
                    VibePlan AI
                  </p>
                </div>
                <h2 className="mt-4 max-w-[260px] text-center text-sm font-medium leading-6 text-slate-600 sm:max-w-none sm:text-left sm:text-2xl sm:font-bold sm:leading-tight sm:text-slate-950 md:text-3xl lg:mt-3">
                  <span className="sm:hidden">
                    AI workspace untuk PRD, roadmap, dan prompt coding.
                  </span>
                  <span className="hidden sm:inline">
                    AI workspace untuk menyusun PRD, roadmap, dan prompt coding dengan lebih terarah.
                  </span>
                </h2>
              </div>

              <div className="mx-auto w-full max-w-sm rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-sm shadow-slate-900/5 lg:mx-0 lg:max-w-none">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Workflow AI
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  Mulai dari PRD sampai coding prompt
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Bangun alur kerja project dengan lebih rapi, terstruktur, dan nyaman dipakai dari tahap ide sampai implementasi.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
            <FooterColumn
              title="VibePlan AI"
              description="Platform AI untuk membantu pemula menyusun PRD, langkah pengembangan, dan prompt coding."
            >
              <FooterList items={PRODUCT_ITEMS} />
            </FooterColumn>

            <FooterColumn
              title="Bantuan dan Panduan"
              description="Akses bantuan utama dan informasi penting penggunaan platform dalam satu area."
            >
              <FooterList items={HELP_ITEMS} />
            </FooterColumn>

            <FooterColumn
              title="Keamanan dan Privasi"
              description="VibePlan AI menjaga pengalaman kerja tetap aman, tertata, dan nyaman digunakan."
            >
              <div className="grid gap-3">
                {SECURITY_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item}</p>
                  </div>
                ))}
              </div>
            </FooterColumn>

            <FooterColumn
              title="Tim Developer J3R Design"
              description="Tim kreatif di balik identitas visual, polishing UI, dan product experience VibePlan AI."
            >
              <a
                href="https://www.instagram.com/j3r_design/"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                  <Image
                    src="/brand/j3r-logo.png"
                    alt="J3R Design Logo"
                    width={44}
                    height={44}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-950 transition group-hover:text-sky-700">
                    J3R Design
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Visual identity, UI polishing, dan product experience.
                  </p>
                </div>
              </a>
            </FooterColumn>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <p>&copy; 2026 VibePlan AI. All rights reserved.</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                MVP Workspace
              </p>
            </div>
            <p className="font-medium text-slate-600">Built with care by J3R Design</p>
          </div>
        </section>
      </div>
    </footer>
  );
}

function FooterColumn({ title, description, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase tracking-[0.28em] text-slate-950">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-600">{description}</p>
      <div>{children}</div>
    </section>
  );
}

function FooterList({ items }) {
  return (
    <nav aria-label="Footer links">
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <Link
                href={item.href}
                className="group flex items-center gap-2 text-sm text-slate-600 transition hover:translate-x-1 hover:text-slate-950"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 transition group-hover:bg-sky-500" />
                <span>{item.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                className="group flex items-center gap-2 text-left text-sm text-slate-600 transition hover:translate-x-1 hover:text-slate-950"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 transition group-hover:bg-sky-500" />
                <span>{item.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
