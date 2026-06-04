import Link from "next/link";
import LandscapeShowcaseCard from "@/components/home/LandscapeShowcaseCard";
import { mockHistoryItems } from "@/lib/showcase";

export default function MockHistoryPanel({ ctaHref, ctaLabel }) {
  return (
    <div className="grid gap-4">
      <LandscapeShowcaseCard eyebrow="History" title="Hasil generate tersimpan dalam satu timeline">
        <div className="grid gap-3">
          {mockHistoryItems.map((item) => (
            <div
              key={`${item.title}-${item.type}`}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white">
                    {item.type}
                  </span>
                  <span className="text-xs text-slate-500">{item.time}</span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <ActionChip>Open</ActionChip>
                <ActionChip>Download</ActionChip>
                <ActionChip tone="danger">Delete</ActionChip>
              </div>
            </div>
          ))}
        </div>
      </LandscapeShowcaseCard>

      <LandscapeShowcaseCard eyebrow="Workflow History" title="Buka ulang, cek detail, lalu lanjutkan ke result" tone="dark">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard label="Open" detail="Masuk ke halaman result detail sesuai item history." />
          <InfoCard label="Download" detail="Unduh hasil sebagai file Markdown siap arsip." />
          <InfoCard label="Delete" detail="Hapus dokumen yang sudah tidak diperlukan." />
        </div>
        <div className="mt-4 flex">
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            {ctaLabel}
          </Link>
        </div>
      </LandscapeShowcaseCard>
    </div>
  );
}

function ActionChip({ children, tone = "default" }) {
  return (
    <span
      className={`rounded-full px-3 py-1 font-medium ${
        tone === "danger"
          ? "border border-rose-200 bg-rose-50 text-rose-700"
          : "border border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

function InfoCard({ label, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-2 text-xs leading-6 text-slate-300">{detail}</p>
    </div>
  );
}
