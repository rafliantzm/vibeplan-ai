"use client";

export default function TokenLimitCard({
  badge = "Kuota AI",
  helperText = "",
  title,
  body,
  suggestions = [],
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  tertiaryActionLabel = "Tutup",
  onTertiaryAction,
  isLoading = false,
  loadingLabel = "Memproses...",
}) {
  return (
    <div className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {badge}
        </span>
        {helperText ? (
          <p className="text-sm font-medium text-amber-700">{helperText}</p>
        ) : null}
      </div>

      <h3 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
        {body}
      </p>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Saran tindakan</p>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
          {suggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {primaryActionLabel ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isLoading}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? loadingLabel : primaryActionLabel}
          </button>
        ) : null}
        {secondaryActionLabel ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onTertiaryAction}
          className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          {tertiaryActionLabel}
        </button>
      </div>
    </div>
  );
}
