export default function LandscapeShowcaseCard({
  eyebrow,
  title,
  badge,
  children,
  tone = "light",
  className = "",
}) {
  const toneClass =
    tone === "dark"
      ? "border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl shadow-slate-900/15"
      : "border-slate-200 bg-white/90 text-slate-900 shadow-lg shadow-slate-900/5";

  return (
    <section
      className={`home-landscape-shell rounded-[1.75rem] border p-5 ${toneClass} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone === "dark" ? "text-sky-200/80" : "text-sky-600"}`}>
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        </div>
        {badge ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tone === "dark"
              ? "border border-white/10 bg-white/5 text-slate-200"
              : "bg-slate-100 text-slate-600"
          }`}>
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
