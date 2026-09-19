import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  Building2,
  MapPin,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Wrench,
  Send,
  Radio,
} from "lucide-react";
import { getComplaint, getTrace, type ComplaintDetail, type PipelineTrace } from "../services/api";

const RECENT_KEY = "civicpulse_recent_submissions";

interface Props {
  initialIdentifier?: string | null;
  onSelectIdentifier?: (id: string) => void;
}

const RESOLUTION_STEPS = [
  {
    key: "Reported",
    title: "1. Complaint Registered",
    desc: "Received & logged in Indore Municipal 311 registry",
    icon: Send,
  },
  {
    key: "Under Review",
    title: "2. AI Triage & Verification",
    desc: "Multimodal AI categorized severity, ward & cluster",
    icon: Sparkles,
  },
  {
    key: "Work Scheduled",
    title: "3. Department Assigned",
    desc: "Work order routed to municipal nodal authority",
    icon: Building2,
  },
  {
    key: "In Progress",
    title: "4. Work In Progress",
    desc: "Field inspection / repair crew active on site",
    icon: Wrench,
  },
  {
    key: "Resolved",
    title: "5. Resolved & Verified",
    desc: "Civic issue restored & published to public ledger",
    icon: CheckCircle2,
  },
];

const STATUS_ORDER = ["Reported", "Under Review", "Work Scheduled", "In Progress", "Resolved"];

export default function CitizenComplaintTracker({ initialIdentifier, onSelectIdentifier }: Props) {
  const [recentRuns, setRecentRuns] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [trace, setTrace] = useState<PipelineTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Load recent submissions on mount
  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      setRecentRuns(stored);
      const chosen = initialIdentifier || stored[0] || "CP-IND-6988";
      setActiveCode(chosen);
    } catch {
      setActiveCode(initialIdentifier || "CP-IND-6988");
    }
  }, [initialIdentifier]);

  // Fetch complaint details whenever activeCode changes
  useEffect(() => {
    if (!activeCode) return;
    let isCancelled = false;
    setLoading(true);
    setErrorMsg(null);

    const fetchData = async () => {
      try {
        // Try fetching complaint by tracking code or submission ID
        const comp = await getComplaint(activeCode).catch(() => null);
        if (isCancelled) return;

        if (comp) {
          setComplaint(comp);
          // If we have a submission ID, fetch telemetry quietly in background
          if (comp.submission_id) {
            getTrace(comp.submission_id)
              .then((res) => !isCancelled && setTrace(res.data))
              .catch(() => {});
          }
        } else {
          // If complaint not yet in DB or only in trace, try pipeline trace
          const tr = await getTrace(activeCode).catch(() => null);
          if (isCancelled) return;

          if (tr?.data) {
            setTrace(tr.data);
            const rec = tr.data.record as any;
            const pseudoComplaint: ComplaintDetail = {
              id: tr.data.result?.complaint_id || 0,
              tracking_code: tr.data.result?.tracking_code || (rec?.stage6_act?.tracking_code) || activeCode,
              submission_id: tr.data.submission_id,
              category: rec?.stage2_understand?.category || "Civic Issue",
              subcategory: rec?.stage2_understand?.subcategory || null,
              summary: rec?.stage2_understand?.transcript || rec?.stage1_input?.raw_text || "Civic complaint logged.",
              raw_text: rec?.stage1_input?.raw_text || "",
              severity: rec?.stage2_understand?.severity || 3,
              urgency: rec?.stage2_understand?.urgency || "Medium",
              ward: rec?.stage4_locate?.ward_name || "Indore Central",
              status: tr.data.status === "done" ? "Work Scheduled" : "Reported",
              department: tr.data.result?.department || (rec?.stage6_act?.department) || "Municipal Corporation",
              channel: rec?.channel || "text",
              lat: rec?.stage1_input?.lat || 22.7196,
              lng: rec?.stage1_input?.lng || 75.8577,
              created_at: tr.data.record?.received_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              timeline: [
                {
                  status: "Reported",
                  at: tr.data.record?.received_at || new Date().toISOString(),
                  notes: "Complaint received and verified by AI engine.",
                  by: "CivicPulse AI",
                },
                {
                  status: "Work Scheduled",
                  at: new Date().toISOString(),
                  notes: `Routed to ${tr.data.result?.department || rec?.stage6_act?.department || "Department"} for field dispatch.`,
                  by: "Auto-Router Agent",
                },
              ],
            };
            setComplaint(pseudoComplaint);
          } else {
            setErrorMsg(`No complaint found matching "${activeCode}". Please check your code.`);
            setComplaint(null);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg(`Unable to load complaint details: ${err.message || "Network error"}`);
          setComplaint(null);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [activeCode]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) return;
    setActiveCode(clean);
    if (onSelectIdentifier) onSelectIdentifier(clean);
  };

  const handleSelectRecent = (id: string) => {
    setActiveCode(id);
    setSearchInput("");
    if (onSelectIdentifier) onSelectIdentifier(id);
  };

  const copyTrackingCode = () => {
    if (!complaint?.tracking_code) return;
    navigator.clipboard.writeText(complaint.tracking_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine current step index in resolution
  const currentStatusIndex = complaint
    ? Math.max(0, STATUS_ORDER.indexOf(complaint.status))
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
      case "In Progress":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-300 dark:border-purple-800";
      case "Work Scheduled":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300 dark:border-blue-800";
      case "Under Review":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800";
      case "Rejected":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300 dark:border-rose-800";
      default:
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-300 dark:border-sky-800";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Search & Recent Grievances Bar */}
      <div className="liquid-glass-deep rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-sky-500/20 dark:text-sky-400 flex items-center justify-center font-black">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Track Grievance Progress</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Check official live updates, assigned department, and resolution timeline
              </p>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="CP-IND-xxxx or SUB-xxxx"
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/30 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Track
            </button>
          </form>
        </div>

        {/* Recent Submissions Switcher */}
        {recentRuns.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-500" />
              Your Recent Reports:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentRuns.map((id) => (
                <button
                  key={id}
                  onClick={() => handleSelectRecent(id)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeCode === id
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/10"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="liquid-glass rounded-3xl p-10 text-center space-y-3 shadow-sm border border-slate-200/80 dark:border-white/10">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Fetching latest grievance status &amp; municipal updates…
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && errorMsg && (
        <div className="liquid-glass rounded-3xl p-6 text-center space-y-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
          <p className="text-sm font-bold">{errorMsg}</p>
          <p className="text-xs text-rose-600/80">
            Please make sure you entered a valid tracking code like <b>CP-IND-6988</b> or submission ID like <b>SUB-20260906-xxxx</b>.
          </p>
        </div>
      )}

      {/* Main Clean Citizen Tracker Content */}
      {!loading && complaint && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Header Card: Code, Status & Department */}
          <div className="liquid-glass-deep rounded-3xl p-6 shadow-card border border-white/80 dark:border-white/10 relative overflow-hidden">
            {/* Top row: Tracking Code & Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Complaint Reference Code
                  </span>
                  <button
                    onClick={copyTrackingCode}
                    className="text-[11px] flex items-center gap-1 font-semibold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    title="Copy tracking code"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {complaint.tracking_code}
                  </span>
                  {complaint.submission_id && (
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                      {complaint.submission_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs flex items-center gap-1.5 ${getStatusBadge(
                    complaint.status
                  )}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span>{complaint.status}</span>
                </span>
              </div>
            </div>

            {/* Quick Meta Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-sky-500/20 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Routed Department
                  </span>
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {complaint.department || "Municipal Corporation"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Location &amp; Ward
                  </span>
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {complaint.ward || "Indore Municipal Area"} {complaint.zone ? `(${complaint.zone})` : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Reported On
                  </span>
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {new Date(complaint.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Stage Visual Resolution Stepper */}
          <div className="liquid-glass-deep rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Resolution Journey
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Step-by-step verified execution from citizen report to on-ground resolution
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/40 px-3 py-1 rounded-full border border-blue-200/60 dark:border-sky-800">
                Step {Math.min(currentStatusIndex + 1, 5)} of 5
              </span>
            </div>

            {/* Stepper track */}
            <div className="relative">
              {/* Connected Line */}
              <div className="hidden md:block absolute top-6 left-8 right-8 h-1 bg-slate-200 dark:bg-white/10 -z-0">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (currentStatusIndex / (RESOLUTION_STEPS.length - 1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Steps items */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
                {RESOLUTION_STEPS.map((step, idx) => {
                  const isDone = currentStatusIndex > idx || (idx === 4 && complaint.status === "Resolved");
                  const isCurrent = currentStatusIndex === idx && complaint.status !== "Resolved";
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.key}
                      className={`flex md:flex-col items-center md:items-center gap-3 md:text-center p-3 md:p-2 rounded-2xl transition-all ${
                        isCurrent
                          ? "bg-blue-50/80 dark:bg-sky-950/30 border border-blue-200 dark:border-sky-500/30 shadow-xs"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shrink-0 ${
                          isDone
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-400/20 animate-pulse"
                            : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/5"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-6 h-6" /> : <StepIcon className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 md:w-full">
                        <div
                          className={`text-xs font-bold leading-tight ${
                            isDone
                              ? "text-emerald-700 dark:text-emerald-400"
                              : isCurrent
                              ? "text-blue-700 dark:text-sky-300 font-black"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {step.title}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug hidden md:block">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Two-Column Info: Grievance Summary & Official Updates Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Complaint Summary & Category */}
            <div className="liquid-glass-deep rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Grievance Overview</h3>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 uppercase">
                  {complaint.channel} Ingest
                </span>
              </div>

              {/* Category Pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-sky-300 border border-blue-200/60 dark:border-blue-900">
                  {complaint.category}
                </span>
                {complaint.subcategory && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                    {complaint.subcategory}
                  </span>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                  Urgency: {complaint.urgency || "Medium"}
                </span>
              </div>

              {/* Standardized Summary */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Issue Description
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-white/70 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/5">
                  {complaint.summary}
                </p>
              </div>

              {complaint.raw_text && complaint.raw_text !== complaint.summary && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Original Citizen Transcript
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{complaint.raw_text}"</p>
                </div>
              )}
            </div>

            {/* Right: Official Updates & Action Log */}
            <div className="liquid-glass-deep rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Municipal Status Updates</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">Live Audit Log</span>
              </div>

              {/* Timeline entries */}
              <div className="space-y-3">
                {complaint.timeline && complaint.timeline.length > 0 ? (
                  complaint.timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-sky-400 mt-1 shrink-0 ring-2 ring-blue-200 dark:ring-sky-900" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-extrabold text-slate-900 dark:text-white">{item.status}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(item.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} •{" "}
                            {new Date(item.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-normal">
                            {item.notes}
                          </p>
                        )}
                        {item.by && (
                          <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <span>Updated by:</span>
                            <span className="text-slate-600 dark:text-slate-300 font-bold">{item.by}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 p-4 text-center">
                    No status updates recorded yet. Official teams are processing your complaint.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Technical Diagnostics Toggle (Out of the way by default) */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Technical AI Execution Telemetry (For Engineers &amp; Auditing)</span>
              </div>
              {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnicalDetails && trace && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono space-y-4 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span>Pipeline Run: {trace.submission_id}</span>
                  <span className="text-emerald-400 font-bold">Status: {trace.status}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {trace.stages?.map((st) => (
                    <div key={st.stage} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>
                          Stage {st.stage}: {st.name}
                        </span>
                        <span className="text-slate-400">{st.ms.toFixed(0)}ms</span>
                      </div>
                      <div className="mt-1 text-slate-400 text-[10px]">
                        {st.agents?.length || 0} agents executed ({st.agents?.map((a) => a.agent).slice(0, 3).join(", ")}...)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
