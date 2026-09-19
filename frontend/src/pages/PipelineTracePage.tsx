import { useState, useEffect } from "react";
import { RadioTower, Search, Sparkles, ClipboardList, Layers } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PipelineViewer from "../components/PipelineViewer";
import CitizenComplaintTracker from "../components/CitizenComplaintTracker";
import { useAuth } from "../context/AuthContext";

const RECENT_KEY = "civicpulse_recent_submissions";

export default function PipelineTracePage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("submission") || searchParams.get("code");

  const [input, setInput] = useState("");
  const recent: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  const [activeId, setActiveId] = useState<string | null>(queryParam || recent[0] || null);

  useEffect(() => {
    if (queryParam) {
      setActiveId(queryParam);
    }
  }, [queryParam]);

  const select = (id: string) => {
    setActiveId(id);
    setInput("");
  };

  // If citizen, render the clean, simple progress tracker requested by user
  if (role === "citizen") {
    return (
      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        <CitizenComplaintTracker
          initialIdentifier={activeId}
          onSelectIdentifier={(id) => setActiveId(id)}
        />
      </div>
    );
  }

  // Official / Authority view
  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
            <RadioTower className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Execution Telemetry
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Official Diagnostics
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Glass-box execution across all 6 stages and 39 deterministic &amp; LLM agents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/analysis")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer mr-2"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Go to Complaints Analysis</span>
          </button>

          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && select(input.trim())}
              placeholder="Search SUB-2026-…"
              className="border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold w-48 sm:w-60 focus:border-civic focus:ring-2 focus:ring-civic/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          </div>
          <button
            onClick={() => input.trim() && select(input.trim())}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            Load
          </button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap liquid-tab-track rounded-2xl px-4 py-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-white">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>Recent Telemetry Runs:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recent.slice(0, 8).map((id) => (
              <button
                key={id}
                onClick={() => select(id)}
                className={`text-xs font-mono px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  activeId === id
                    ? "liquid-tab-item-active-civic font-bold shadow-md"
                    : "liquid-tab-item text-slate-700 dark:text-slate-300 hover:text-blue-700"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      <PipelineViewer submissionId={activeId} />
    </div>
  );
}

