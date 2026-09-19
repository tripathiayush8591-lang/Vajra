import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, ChevronRight } from "lucide-react";
import { getTrace, type PipelineTrace } from "../services/api";

const STAGE_DESC: Record<number, string> = {
  1: "Capture & validate citizen input across channels",
  2: "Multimodal AI extraction: language, category, severity, location",
  3: "Connect: embeddings, duplicates, temporal surge, cluster label",
  4: "Locate: ward mapping, density, hotspot detection, GeoJSON",
  5: "Explainable equity-weighted priority score (0–100)",
  6: "Act: department routing, alerts, report, citizen tracking",
};

export default function PipelineViewer({ submissionId }: { submissionId: string | null }) {
  const [trace, setTrace] = useState<PipelineTrace | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await getTrace(submissionId);
        if (alive) {
          setTrace(r.data);
          if (r.data.status === "running") setTimeout(poll, 300);
        }
      } catch {
        if (alive) setTimeout(poll, 500);
      }
    };
    poll();
    return () => {
      alive = false;
    };
  }, [submissionId]);

  const copyRecord = () => {
    if (!trace?.record) return;
    navigator.clipboard.writeText(JSON.stringify(trace.record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!submissionId) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-civic flex items-center justify-center mx-auto border border-blue-200">
          <ChevronRight className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-900 text-base">No Submission Selected</h3>
        <p className="text-slate-500 text-xs md:text-sm max-w-md mx-auto">
          Submit a new complaint from the <b>Report</b> page or select a recent run above to watch the live 39-agent execution trace.
        </p>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm shadow-card flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-civic" />
        <span>Fetching pipeline execution telemetry…</span>
      </div>
    );
  }

  const stages = trace.stages || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Stages Column */}
      <div className="lg:col-span-3 space-y-4">
        {/* Status header banner */}
        <div className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex-wrap">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
              trace.status === "done"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : trace.status === "failed"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {trace.status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{trace.status}</span>
          </span>

          {trace.result?.tracking_code && (
            <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              Tracking: <b className="text-slate-900 font-mono">{trace.result.tracking_code}</b>
            </div>
          )}

          {trace.result?.priority_score !== undefined && (
            <div className="text-xs text-slate-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
              Priority: <b className="text-amber-800 font-bold">{trace.result.priority_score}/100</b>
            </div>
          )}

          {(trace.result?.department || (trace.record as any)?.stage6_act?.department) && (
            <div className="text-xs text-slate-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 ml-auto">
              Routed: <b className="text-blue-800 font-bold">{trace.result?.department || (trace.record as any)?.stage6_act?.department}</b>
            </div>
          )}
        </div>

        {/* Stage cards */}
        {stages.map((s) => (
          <div key={s.stage} className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50/90 border-b border-slate-200">
              <span className="w-6 h-6 rounded-full bg-civic text-white text-xs font-black flex items-center justify-center shrink-0">
                {s.stage}
              </span>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 text-sm mr-2">{s.name}</span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">{STAGE_DESC[s.stage]}</span>
              </div>
              <span className="ml-auto text-xs font-mono font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                {s.ms.toFixed(0)}ms
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {s.agents.map((a) => (
                <div
                  key={a.agent}
                  className="flex items-center gap-2.5 text-xs bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 rounded-xl px-3 py-2.5 transition-colors group"
                  title={a.summary}
                >
                  {a.status === "ok" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-slate-800 group-hover:text-civic transition-colors">
                    {a.agent}
                  </span>
                  <span className="text-slate-500 truncate ml-auto text-[11px] max-w-[140px] text-right font-medium">
                    {a.summary}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Shared Record Inspector Column */}
      <div className="lg:col-span-2">
        <div className="card-base bg-white dark:bg-[#0b0d11] text-slate-900 dark:text-slate-200 rounded-2xl shadow-card border border-slate-200 dark:border-[#1e2430] p-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Shared Record Document
              </div>
              <div className="text-[11px] text-slate-500">Zero-collision immutable JSON</div>
            </div>
            <button
              onClick={copyRecord}
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            >
              {copied ? "✓ Copied" : "Copy JSON"}
            </button>
          </div>

          <pre className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400 font-mono overflow-auto max-h-[70vh] bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(trace.record || {}).filter(([k]) => k !== "trace")
              ),
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
