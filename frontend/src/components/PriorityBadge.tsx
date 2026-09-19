export default function PriorityBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color =
    score >= 80
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : score >= 60
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : score >= 40
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
  const cls = size === "lg" ? "text-xl px-3.5 py-1.5 font-black" : size === "sm" ? "text-xs px-2 py-0.5 font-bold" : "text-sm px-2.5 py-1 font-bold";
  return (
    <span className={`inline-flex items-center rounded-lg border shadow-xs ${color} ${cls}`}>
      <span>{score.toFixed(0)}</span>
      <span className="text-[0.65em] opacity-70 ml-0.5 font-semibold">/100</span>
    </span>
  );
}
