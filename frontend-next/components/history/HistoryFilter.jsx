import { GENERATION_TYPES } from "@/lib/constants";

export default function HistoryFilter({
  generationType,
  onGenerationTypeChange,
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-700">Filter jenis generate</span>
      <select
        value={generationType}
        onChange={(event) => onGenerationTypeChange(event.target.value)}
        className="block w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      >
        <option value="">Semua tipe</option>
        {GENERATION_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </label>
  );
}
