import { heroBadges } from "@/lib/showcase";

const POSITIONS = [
  "left-0 top-8 sm:left-3",
  "right-2 top-0",
  "left-10 top-[7.5rem] sm:left-16",
  "right-10 top-28",
  "left-6 bottom-[5.5rem]",
  "right-2 bottom-10 sm:right-6",
];

export default function FloatingBadges() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block">
      {heroBadges.map((badge, index) => (
        <div
          key={badge}
          className={`home-float home-float-${(index % 3) + 1} absolute ${POSITIONS[index]} rounded-full border border-sky-200/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-slate-700 shadow-lg shadow-sky-900/10 backdrop-blur`}
        >
          {badge}
        </div>
      ))}
    </div>
  );
}
