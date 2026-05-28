import { GENERATION_TYPES } from "@/lib/constants";

export default function GenerationTypeSelector({ value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {GENERATION_TYPES.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-3xl border p-4 text-left transition ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p
              className={`mt-2 text-sm leading-6 ${
                isActive ? "text-slate-200" : "text-slate-500"
              }`}
            >
              {item.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
