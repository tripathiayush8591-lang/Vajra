import { useEffect, useState } from "react";
import { X, Zap, Play, FileText, Wrench, IndianRupee } from "lucide-react";
import { whatIf, createAction, MEDIA_BASE_URL, type Hotspot } from "../services/api";
import PriorityBadge from "./PriorityBadge";

const COMPONENT_LABELS: Record<string, [string, number]> = {
  severity: ["Severity", 25],
  frequency: ["Frequency", 20],
  population: ["Population (equity)", 15],
  recency: ["Recency / surge", 15],
  concentration: ["Concentration", 15],
  trust_discount: ["Trust discount", 0],
};

export default function HotspotDrawer({ hotspot, onClose }: { hotspot: Hotspot; onClose: () => void }) {
  const [resolved, setResolved] = useState(0);
  const [hyp, setHyp] = useState<number | null>(null);
  const [acted, setActed] = useState(false);

  useEffect(() => {
    setResolved(0);
    setHyp(null);
    setActed(false);
  }, [hotspot.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (resolved > 0) whatIf(hotspot.id, resolved).then((r) => setHyp(r.hypothetical_score));
      else setHyp(null);
    }, 150);
    return () => clearTimeout(t);
  }, [resolved, hotspot.id]);

  const dispatch = async () => {
    await createAction(hotspot.id, "BUDGET_ALLOCATED", 250000);
    setActed(true);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md liquid-glass-deep shadow-drawer z-[60] overflow-y-auto border-l border-white/80 animate-in slide-in-from-right duration-200">
      {/* Sticky Header */}
      <div className="sticky top-0 liquid-glass border-b border-white/80 px-6 py-4 flex items-start justify-between gap-3 z-10">
        <div>
          <div className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 uppercase tracking-wider">Demand Hotspot Dossier</div>
          <h2 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">{hotspot.title}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {hotspot.ward.name} • {hotspot.ward.zone} • <span className="font-bold text-slate-800">{hotspot.category}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Score & Surge header */}
        <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Composite Priority</div>
            <PriorityBadge score={hotspot.priority_score} size="lg" />
          </div>
          {hotspot.temporal?.accelerating && (
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Surge +{hotspot.temporal.trend_pct}% in 48h</span>
            </div>
          )}
        </div>

        {/* Explainability Narrative */}
        <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4 space-y-1">
          <div className="text-xs font-bold text-civic uppercase tracking-wider flex items-center gap-1.5">
            <span>Explainable AI Rationale</span>
          </div>
          <p className="text-xs md:text-sm text-slate-800 font-medium leading-relaxed">
            {hotspot.evidence}
          </p>
        </div>

        {/* Score breakdown bars */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score Breakdown Formula</span>
            <span className="text-[11px] font-semibold text-slate-400">Sum: 0–100 Max</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(COMPONENT_LABELS).map(([k, [label, max]]) => {
              const v = hotspot.components?.[k] ?? 0;
              const pct = max > 0 ? Math.max(0, (v / max) * 100) : Math.min(100, -v * 10);
              const isDiscount = v < 0;

              return (
                <div key={k}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">{label}</span>
                    <span className={`font-mono text-xs ${isDiscount ? "text-rose-600 font-bold" : "text-slate-900 font-bold"}`}>
                      {v > 0 ? "+" : ""}{v}{max > 0 ? ` / ${max}` : ""}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isDiscount ? "bg-rose-500" : "bg-civic"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio voices */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-civic" />
            <span>Citizen Voices In This Hotspot</span>
          </div>
          {hotspot.sample_audio_ref ? (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <audio controls src={`${MEDIA_BASE_URL}/${hotspot.sample_audio_ref}`} className="w-full h-8" />
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-medium italic">
              Clustered from {hotspot.complaint_count} citizen reports across Hindi voice notes, photos, and web text.
            </p>
          )}
        </div>

        {/* Counterfactual what-if simulation slider */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Interactive What-If Simulation
            </span>
            {hyp !== null && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Score drops {hotspot.priority_score.toFixed(0)} → {hyp.toFixed(0)}
              </span>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={hotspot.complaint_count}
            value={resolved}
            onChange={(e) => setResolved(+e.target.value)}
            className="w-full accent-civic cursor-pointer"
          />
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>Simulate resolving: <b>{resolved} complaints</b></span>
            <span className="font-extrabold text-slate-900">
              {hyp !== null ? `Hypothetical: ${hyp.toFixed(0)}/100` : `Current: ${hotspot.priority_score.toFixed(0)}/100`}
            </span>
          </div>
        </div>

        {/* Dispatch action button */}
        <div className="space-y-2">
          <button
            onClick={dispatch}
            disabled={acted}
            className="w-full flex items-center justify-center gap-2 bg-civic hover:bg-civic-hover text-white rounded-xl py-3.5 px-4 text-sm font-bold shadow-md shadow-blue-600/20 disabled:opacity-60 transition-all duration-150"
          >
            {acted ? <FileText className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
            <span>{acted ? "Dispatched to Ward Engineer" : "Dispatch Repair Crew + ₹2.5L Budget"}</span>
          </button>
          {acted && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
              <IndianRupee className="w-4 h-4" />
              <span>₹2,50,000 Emergency Budget Allocated • Action Logged to Audit Trail</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
