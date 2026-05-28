export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
