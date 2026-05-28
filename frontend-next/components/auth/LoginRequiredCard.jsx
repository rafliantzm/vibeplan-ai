"use client";

export default function LoginRequiredCard({
  title = "Login Diperlukan",
  message = "Silakan login terlebih dahulu untuk menggunakan fitur generate AI.",
  actionLabel = "Login Sekarang",
  onAction,
}) {
  return (
    <div className="rounded-[2rem] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm sm:p-8">
      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
        Akses Pengguna
      </span>
      <h3 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
        {message}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onAction}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
