import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
  FileText,
  Wrench,
  ShieldCheck,
  Send,
  Sparkles,
  Phone,
  Calendar,
  Layers,
  Check,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  getComplaints,
  updateComplaintStatus,
  type ComplaintItem,
  type ComplaintDetail,
  getComplaint,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const STATUS_FILTERS = ["All", "Reported", "Under Review", "Work Scheduled", "In Progress", "Resolved"];

export default function ComplaintsAnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "severity">("newest");

  // Selected complaint for details/update drawer
  const [activeComplaintId, setActiveComplaintId] = useState<number | null>(null);
  const [activeDetail, setActiveDetail] = useState<ComplaintDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Status update form state inside drawer
  const [newStatus, setNewStatus] = useState<string>("In Progress");
  const [officerNotes, setOfficerNotes] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  // Load complaints
  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await getComplaints({
        category: selectedCategory === "All" ? undefined : selectedCategory,
        status: selectedStatus === "All" ? undefined : selectedStatus,
        search: search.trim() ? search.trim() : undefined,
        page_size: 100,
      });
      setComplaints(res.complaints || []);
      setTotal(res.total || (res.complaints || []).length);
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComplaints();
  };

  // Open complaint drawer
  const handleOpenDetail = async (id: number) => {
    setActiveComplaintId(id);
    setLoadingDetail(true);
    setUpdateSuccessMsg(null);
    try {
      const detail = await getComplaint(id);
      setActiveDetail(detail);
      setNewStatus(detail.status);
      setOfficerNotes("");
    } catch (err) {
      console.error("Failed to fetch complaint detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setActiveComplaintId(null);
    setActiveDetail(null);
    setUpdateSuccessMsg(null);
  };

  // Submit status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetail) return;
    setUpdatingStatus(true);
    setUpdateSuccessMsg(null);

    const officerName = user?.displayName
      ? `${user.displayName} (${user.designation || "Municipal Officer"})`
      : "Zonal Officer • Zone 3";

    try {
      await updateComplaintStatus(activeDetail.id, newStatus, officerNotes, officerName);
      setUpdateSuccessMsg(`Status successfully updated to "${newStatus}"!`);

      // Refresh both the detail view and the main table
      const refreshed = await getComplaint(activeDetail.id);
      setActiveDetail(refreshed);
      setComplaints((prev) =>
        prev.map((c) => (c.id === refreshed.id ? { ...c, status: refreshed.status, updated_at: refreshed.updated_at } : c))
      );
      setOfficerNotes("");
      setTimeout(() => setUpdateSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(`Error updating status: ${err.message || "Failed"}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set(complaints.map((c) => c.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [complaints]);

  // Sort complaints
  const sortedComplaints = useMemo(() => {
    const list = [...complaints];
    if (sortOrder === "severity") {
      return list.sort((a, b) => b.severity - a.severity);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [complaints, sortOrder]);

  // Status badge styling helper
  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Resolved":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "In Progress":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
      case "Work Scheduled":
        return "bg-blue-500/15 text-blue-700 dark:text-sky-400 border-blue-500/30";
      case "Under Review":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "Rejected":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    }
  };

  // Severity color indicator
  const getSeverityBadge = (score: number) => {
    if (score >= 5) return "bg-rose-600 text-white";
    if (score >= 4) return "bg-orange-500 text-white";
    if (score >= 3) return "bg-amber-500 text-white";
    return "bg-blue-500 text-white";
  };

  // Metric counts
  const countByStatus = (st: string) => complaints.filter((c) => c.status === st).length;

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Grievance <span className="text-blue-600 dark:text-sky-400">Analysis &amp; Management</span>
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">
            Official municipal registry • Review complaints, investigate evidence, and update resolution status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadComplaints()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="liquid-glass rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Ingested
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{total}</div>
          <div className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold mt-0.5">Across all 85 Wards</div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Under Review
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {countByStatus("Reported") + countByStatus("Under Review")}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Pending triage</div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">
            Scheduled / Assigned
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {countByStatus("Work Scheduled")}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Department routed</div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            In Progress
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {countByStatus("In Progress")}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">On-site execution</div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-white/10 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Resolved
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {countByStatus("Resolved")}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Action verified</div>
        </div>
      </div>

      {/* Toolbar: Search, Status Pills & Category Filter */}
      <div className="liquid-glass-deep rounded-3xl p-4 shadow-sm border border-slate-200/80 dark:border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedStatus === st
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10"
                }`}
              >
                {st} {st !== "All" && `(${complaints.filter((c) => c.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Search bar & Sort */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, issue, phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/30 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 dark:text-white"
              />
            </form>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/30 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="dark:bg-slate-900">
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === "newest" ? "severity" : "newest")}
              title="Toggle sort order"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Complaints Table */}
      <div className="liquid-glass-deep rounded-3xl shadow-card border border-slate-200/80 dark:border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading complaints registry…</p>
          </div>
        ) : sortedComplaints.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No complaints matched the criteria</p>
            <p className="text-xs text-slate-500">Try clearing your filters or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tracking Code</th>
                  <th className="py-3.5 px-4">Citizen Summary</th>
                  <th className="py-3.5 px-4">Category &amp; Dept</th>
                  <th className="py-3.5 px-4">Ward</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Reported</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {sortedComplaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleOpenDetail(c.id)}
                    className="hover:bg-blue-50/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                          {c.tracking_code}
                        </span>
                        <span className="text-[9px] font-sans px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 uppercase">
                          {c.channel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs sm:max-w-sm truncate font-medium text-slate-700 dark:text-slate-200">
                      {c.summary}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{c.category}</div>
                      <div className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold">{c.department}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {c.ward || "—"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${getSeverityBadge(
                            c.severity
                          )}`}
                        >
                          {c.severity}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {c.urgency}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border shadow-2xs ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(c.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 bg-blue-50 dark:bg-white/5 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint Detail & Status Update Drawer */}
      {activeComplaintId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div
            className="w-full max-w-xl bg-white dark:bg-[#0c1017] h-full shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complaint Dossier</span>
                  {activeDetail && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(
                        activeDetail.status
                      )}`}
                    >
                      {activeDetail.status}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {activeDetail?.tracking_code || "Loading…"}
                </h2>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loadingDetail || !activeDetail ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">Loading grievance details…</p>
                </div>
              ) : (
                <>
                  {/* Status Update Form (Top Priority for Official) */}
                  <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-sky-950/20 border border-blue-200/70 dark:border-sky-500/30 space-y-4">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Update Resolution Status
                      </h3>
                    </div>

                    <form onSubmit={handleUpdateStatus} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Select New Status:
                        </label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full p-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="Reported">Reported (Logged)</option>
                          <option value="Under Review">Under Review (Triaged)</option>
                          <option value="Work Scheduled">Work Scheduled (Assigned)</option>
                          <option value="In Progress">In Progress (Active On Site)</option>
                          <option value="Resolved">Resolved (Work Done)</option>
                          <option value="Rejected">Rejected (Not Actionable)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Officer Action Remarks / Work Notes:
                        </label>
                        <textarea
                          rows={3}
                          value={officerNotes}
                          onChange={(e) => setOfficerNotes(e.target.value)}
                          placeholder="e.g. Field inspection completed. Repair crew dispatched to replace damaged transformer."
                          className="w-full p-2.5 rounded-xl text-xs font-medium border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Updating as: <b>{user?.displayName || "Municipal Officer"}</b>
                        </span>
                        <button
                          type="submit"
                          disabled={updatingStatus}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {updatingStatus ? "Saving…" : "Update Status"}
                        </button>
                      </div>
                    </form>

                    {updateSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{updateSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary & Citizen Words */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issue Description</div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {activeDetail.summary}
                    </div>

                    {activeDetail.raw_text && activeDetail.raw_text !== activeDetail.summary && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-400">Raw Citizen Ingest ({activeDetail.channel}):</span>
                        <p className="text-xs italic text-slate-500 mt-0.5">"{activeDetail.raw_text}"</p>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                      <div className="font-bold text-slate-900 dark:text-white">{activeDetail.category}</div>
                      {activeDetail.subcategory && (
                        <div className="text-[11px] text-slate-500">{activeDetail.subcategory}</div>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                      <div className="font-bold text-blue-600 dark:text-sky-400">{activeDetail.department}</div>
                      <div className="text-[11px] text-slate-500">Auto-routed</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Location &amp; Ward</span>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {activeDetail.ward || "Indore Area"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {activeDetail.lat.toFixed(4)}, {activeDetail.lng.toFixed(4)}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Severity &amp; Urgency</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${getSeverityBadge(
                            activeDetail.severity
                          )}`}
                        >
                          {activeDetail.severity}
                        </span>
                        <span className="text-slate-900 dark:text-white">{activeDetail.urgency}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Submitted: {new Date(activeDetail.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Status History & Audit Log */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Status History &amp; Audit Log
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {activeDetail.timeline?.length || 0} events
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeDetail.timeline?.map((ev, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{ev.status}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(ev.at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {ev.notes && <p className="text-slate-600 dark:text-slate-300">{ev.notes}</p>}
                          {ev.by && (
                            <div className="text-[10px] text-slate-400">
                              By: <span className="font-semibold text-slate-500">{ev.by}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technical Pipeline Link */}
                  {activeDetail.submission_id && (
                    <div className="pt-2">
                      <button
                        onClick={() => navigate(`/pipeline?submission=${activeDetail.submission_id}`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Inspect Raw 6-Stage AI Execution Trace</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
