import { useState } from "react";
import { Megaphone, Search, Clock, CheckCircle2, AlertCircle, Sparkles, Mic, FileText, ShieldCheck, ArrowRight } from "lucide-react";
import SubmissionModal from "../components/SubmissionModal";
import { trackCode } from "../services/api";

export default function CitizenPortal({ onSubmitted }: { onSubmitted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const track = async (queryCode?: string) => {
    const target = (queryCode ?? code).trim();
    if (!target) return;
    setSearching(true);
    setSearchError(false);
    try {
      const r = await trackCode(target);
      if (r) {
        setResult(r);
        setSearchError(false);
      } else {
        setResult(null);
        setSearchError(true);
      }
    } catch {
      setResult(null);
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  const STEPS = ["Reported", "Under Review", "Work Scheduled", "Resolved"];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
      {/* Official Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-civic text-xs font-semibold shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-civic" />
          <span>Indore Smart City • 311 Citizen Intelligence Platform</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Your voice shapes the city.
        </h1>
        <p className="text-slate-600 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Speak in Hindi, Hinglish, or English. Gemini Multimodal AI extracts the issue,
          clusters nearby demand hotspots, and prioritizes municipal action.
        </p>
      </div>

      {/* Main Action Button */}
      <div className="relative group">
        <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl blur-lg opacity-35 group-hover:opacity-60 transition duration-300 animate-pulse" />
        <button
          onClick={() => setOpen(true)}
          className="relative w-full flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-3xl p-6 md:p-7 shadow-xl shadow-blue-500/25 transition-all duration-200 transform group-hover:-translate-y-0.5 border border-white/20"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner border border-white/30">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <div className="text-lg md:text-xl font-black">Report a civic issue</div>
              <div className="text-xs md:text-sm text-blue-100 font-medium mt-0.5">
                Takes 30 seconds • Voice notes, photos, or text in Hindi, Hinglish, or English
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3.5 py-2 rounded-xl text-xs font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/30 shadow-xs">
            <span>Start Report</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Track Complaint Section with Liquid Glass */}
      <div className="liquid-glass-deep rounded-3xl shadow-card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-civic" />
            <h2 className="text-base font-bold text-slate-900">Track your grievance</h2>
          </div>
          <button
            onClick={() => {
              setCode("CP-IND-4091");
              track("CP-IND-4091");
            }}
            className="text-xs text-civic font-semibold hover:underline"
          >
            Fill Sample Code
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && track()}
              placeholder="Enter tracking code (e.g. CP-IND-4091)"
              className="w-full pl-9 pr-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:border-civic focus:ring-2 focus:ring-civic/20"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <button
            onClick={() => track()}
            disabled={searching}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 text-sm font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {searching ? "Searching…" : "Track"}
          </button>
        </div>

        {/* Tracking Result Card with Liquid Glass */}
        {result && (
          <div className="mt-4 liquid-glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/60 pb-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">Tracking Code</span>
                <div className="text-base font-extrabold text-slate-900 font-mono">{result.tracking_code}</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-extrabold shadow-xs">
                {result.status}
              </span>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-bold mb-1">Standardized AI Summary</div>
              <p className="text-sm font-medium text-slate-800 bg-white/80 p-3 rounded-xl border border-slate-200/70 shadow-xs">
                {result.summary}
              </p>
            </div>

            {/* Visual Stepper */}
            <div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Resolution Progress</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {STEPS.map((step, sIdx) => {
                  const currentIdx = STEPS.indexOf(result.status);
                  const isDone = currentIdx >= sIdx;
                  const isCurrent = currentIdx === sIdx;
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                          isDone
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20"
                            : "bg-slate-200/80 text-slate-500"
                        } ${isCurrent ? "ring-4 ring-emerald-200 shadow-sm" : ""}`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : sIdx + 1}
                      </div>
                      <span className={`text-[11px] font-bold ${isDone ? "text-slate-900" : "text-slate-400"}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {result.timeline && result.timeline.length > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t border-white/60 text-slate-500">
                {result.timeline.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <b className="text-slate-700">{t.status}</b> — <span>{t.at}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {searchError && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No complaint found matching "{code}". Please verify your tracking code.</span>
          </div>
        )}
      </div>

      {/* Platform Guarantees */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div className="liquid-glass rounded-2xl p-4 shadow-card hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">6 Stages</div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">Sequential AI Pipeline</div>
          <div className="text-[11px] text-slate-500 mt-1">&lt; 3.0s total processing time</div>
        </div>
        <div className="liquid-glass rounded-2xl p-4 shadow-card hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">39 Agents</div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">Deterministic &amp; LLM</div>
          <div className="text-[11px] text-slate-500 mt-1">Zero-collision shared record</div>
        </div>
        <div className="liquid-glass rounded-2xl p-4 shadow-card hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500">0–100 Score</div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">Equity-Weighted Priority</div>
          <div className="text-[11px] text-slate-500 mt-1">Demographic fairness built-in</div>
        </div>
      </div>

      {open && (
        <SubmissionModal
          onClose={() => setOpen(false)}
          onSubmitted={onSubmitted}
        />
      )}
    </div>
  );
}
