export default function LoadingState({ title = "Memuat data...", description }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <div>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
