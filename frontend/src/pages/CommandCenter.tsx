import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Flame, MapPin, MessageSquare, TrendingUp, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import HotspotMap, { scoreColor } from "../components/HotspotMap";
import PriorityBadge from "../components/PriorityBadge";
import HotspotDrawer from "../components/HotspotDrawer";
import CopilotDrawer from "../components/CopilotDrawer";
import { getAnalytics, getHotspots, getComplaints, type Hotspot, type ComplaintItem } from "../services/api";

const PIE_COLORS = ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0EA5E9", "#64748B"];

export default function CommandCenter() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [copilot, setCopilot] = useState(false);
  const [vectorMode, setVectorMode] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    getHotspots().then((r) => setHotspots(r.data.hotspots)).catch(() => {});
    getComplaints({ page_size: 200 }).then((r) => setComplaints(r.complaints || [])).catch(() => {});
    getAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const filteredHotspots = useMemo(
    () => (categoryFilter === "All" ? hotspots : hotspots.filter((h) => h.category === categoryFilter)),
    [hotspots, categoryFilter]
  );

  const filteredComplaints = useMemo(
    () => (categoryFilter === "All" ? complaints : complaints.filter((c) => c.category === categoryFilter)),
    [complaints, categoryFilter]
  );

  const kpis = [
    { icon: MapPin, label: "LOCATIONS ASSESSED", value: analytics?.total_complaints ?? "—", change: "+12% this wk", color: "text-blue-700 dark:text-[#38bdf8]", bg: "bg-blue-50 dark:bg-[#081827] border-blue-100 dark:border-sky-500/20" },
    { icon: Flame, label: "ACTIVE HOTSPOTS", value: analytics?.active_hotspots ?? "—", change: "4 Wards active", color: "text-amber-700 dark:text-[#fbbf24]", bg: "bg-amber-50 dark:bg-[#201505] border-amber-100 dark:border-amber-500/20" },
    { icon: AlertTriangle, label: "CRITICAL HOTSPOTS", value: analytics?.critical_count ?? "0", change: "Immediate Action", color: "text-rose-700 dark:text-[#fb7185]", bg: "bg-rose-50 dark:bg-[#260a12] border-rose-100 dark:border-rose-500/20" },
    { icon: TrendingUp, label: "SURGE CLUSTERS", value: analytics?.surging_hotspots ?? "—", change: "⚡ +200% 48h", color: "text-orange-700 dark:text-[#fb923c]", bg: "bg-orange-50 dark:bg-[#220d04] border-orange-100 dark:border-orange-500/20" },
    { icon: Wrench, label: "RESOLUTION RATE", value: analytics ? `${Math.round(analytics.resolution_rate * 100)}%` : "—", change: "On Target", color: "text-emerald-700 dark:text-[#34d399]", bg: "bg-emerald-50 dark:bg-[#062016] border-emerald-100 dark:border-emerald-500/20" },
  ];

  const categories = useMemo(() => {
    const set = new Set<string>();
    hotspots.forEach((h) => set.add(h.category));
    complaints.forEach((c) => set.add(c.category));
    return ["All", ...Array.from(set)];
  }, [hotspots, complaints]);

  const getCategoryStyle = (cat: string, isSelected: boolean) => {
    const l = cat.toLowerCase();
    if (l === "all") {
      return {
        btn: isSelected
          ? "liquid-tab-item-active-civic"
          : "liquid-tab-item text-slate-700 dark:text-[#8b98a9] hover:text-blue-600 dark:hover:text-white",
        badge: isSelected ? "bg-white/25 text-white" : "bg-blue-500/15 text-blue-700 dark:text-sky-400 font-bold",
      };
    }
    if (l.includes("sanitat") || l.includes("waste")) {
      return {
        btn: isSelected
          ? "liquid-tab-active-emerald"
          : "liquid-tab-item text-slate-700 dark:text-[#8b98a9] hover:text-emerald-700 dark:hover:text-emerald-400",
        badge: isSelected ? "bg-white/25 text-white" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold",
      };
    }
    if (l.includes("road") || l.includes("traffic")) {
      return {
        btn: isSelected
          ? "liquid-tab-active-amber"
          : "liquid-tab-item text-slate-700 dark:text-[#8b98a9] hover:text-amber-700 dark:hover:text-amber-400",
        badge: isSelected ? "bg-white/25 text-white" : "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold",
      };
    }
    if (l.includes("water")) {
      return {
        btn: isSelected
          ? "liquid-tab-active-cyan"
          : "liquid-tab-item text-slate-700 dark:text-[#8b98a9] hover:text-cyan-700 dark:hover:text-cyan-400",
        badge: isSelected ? "bg-white/25 text-white" : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 font-bold",
      };
    }
    return {
      btn: isSelected
        ? "liquid-tab-active-rose"
        : "liquid-tab-item text-slate-700 dark:text-[#8b98a9] hover:text-rose-700 dark:hover:text-rose-400",
      badge: isSelected ? "bg-white/25 text-white" : "bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold",
    };
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header matching Reference: "Assessment Dashboard" */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Assessment <span className="text-blue-600 dark:text-[#38bdf8]">Dashboard</span>
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-[#7f8e9d] font-semibold mt-1">
            Aggregate indices, distributions and hotspots for the active municipal dataset
          </p>

          {/* Reference Dataset Tag Pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-white/[0.08] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-blue-700 dark:text-[#38bdf8] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-[#38bdf8] animate-pulse" />
              Indore Municipal Grievance Survey (live) • {analytics?.total_complaints ?? 76} loc
              <button type="button" className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white ml-1 font-bold leading-none cursor-pointer">×</button>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-white/[0.08] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-[#8b98a9] shadow-xs">
              IMC_WardWise_Prioritization_Data • 8 zones
              <button type="button" className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white ml-1 font-bold leading-none cursor-pointer">×</button>
            </span>
          </div>
        </div>

        <button
          onClick={() => setCopilot(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 dark:bg-[#052e16] dark:hover:bg-[#083a1d] dark:text-[#34d399] dark:border dark:border-[#10b981]/50 text-white rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 dark:shadow-none transition-all duration-150"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MessageSquare className="w-4 h-4" />
          <span>Ask Civic Copilot</span>
        </button>
      </div>

      {/* KPI Cards styled like reference project */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="card-base rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5">
            <div className={`text-2xl md:text-3xl font-black leading-tight ${k.color}`}>
              {k.value}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7d8b9e] mt-1.5 truncate">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Map & Priority Queue Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {/* Controls bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Interactive Category Pills with Liquid Glass & Vivid Colors */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 max-w-full liquid-tab-track rounded-full">
              {categories.map((c) => {
                const count =
                  c === "All"
                    ? complaints.length
                    : complaints.filter((item) => item.category === c).length;
                const isSelected = categoryFilter === c;
                const style = getCategoryStyle(c, isSelected);
                return (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${style.btn}`}
                  >
                    <span>{c.split(" & ")[0]}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${style.badge}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Layer switches */}
              <button
                type="button"
                onClick={() => setShowHotspots(!showHotspots)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showHotspots
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400 shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 opacity-60"
                }`}
                title="Toggle Hotspot Clusters"
              >
                <span>🔥 Hotspots</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold">
                  {filteredHotspots.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowComplaints(!showComplaints)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showComplaints
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-400 shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 opacity-60"
                }`}
                title="Toggle All Problem Locations"
              >
                <span>📍 Problem Locations</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-800 dark:text-sky-300 font-extrabold">
                  {filteredComplaints.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVectorMode(!vectorMode)}
                className="text-xs font-semibold liquid-tab-item text-slate-700 dark:text-slate-300 rounded-full px-3 py-1.5 hover:bg-white/95 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all cursor-pointer"
                title="Toggle offline vector map (no tiles needed)"
              >
                {vectorMode ? "🗺 Online OSM" : "📴 Vector Mode"}
              </button>
            </div>
          </div>

          <HotspotMap
            hotspots={filteredHotspots}
            complaints={filteredComplaints}
            onSelect={setSelected}
            showHotspots={showHotspots}
            showComplaints={showComplaints}
            vectorMode={vectorMode}
          />
        </div>

        {/* Priority Queue Sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Prioritized Hotspot Queue</h2>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-md">
              {filteredHotspots.length} Clusters
            </span>
          </div>

          {filteredHotspots.length === 0 && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center text-sm text-slate-500">
              No active hotspots matching selected filter.
            </div>
          )}

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredHotspots.map((h, i) => {
              const isSelected = selected?.id === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => setSelected(h)}
                  className={`w-full text-left card-base p-4 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "border-sky-500 ring-2 ring-sky-500/30 bg-blue-50/80 dark:bg-[#0f141d]"
                      : "hover:border-[#2a3547]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">
                        {h.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#7d8b9e] mt-1">
                        0{i + 1} &nbsp;dominant: <span className="font-medium text-slate-700 dark:text-[#94a3b8]">{h.category.split(" & ")[0]}</span> • <span className="text-rose-500 dark:text-[#fb7185] font-semibold">{h.avg_severity >= 3.5 ? "High Severity" : "Moderate"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-400 dark:text-[#64748b]">
                          {h.ward.name}
                        </span>
                        {h.status === "Under Intervention" && (
                          <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 px-1.5 py-0.2 rounded-md">
                            Intervention
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-rose-500 dark:text-[#fb7185]">
                        {h.priority_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Analytics Row Matching Reference Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chart 1: Pollution / Issue Classification Donut */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Classification</h3>
              <span className="text-[10px] text-slate-500 dark:text-[#7d8b9e]">severity bands</span>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={analytics.by_category.slice(0, 4)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#f43f5e" />
                  <Cell fill="#0ea5e9" />
                </Pie>
                <RTooltip contentStyle={{ backgroundColor: "#0b0d11", borderRadius: "8px", color: "#fff", border: "1px solid #1e2430", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-around text-[10px] text-slate-500 dark:text-[#8b98a9] mt-2 pt-2 border-t border-slate-200 dark:border-[#19202c]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Mod</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> High</span>
            </div>
          </div>

          {/* Chart 2: Priority Distribution Bar Chart */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Priority Distribution</h3>
              <span className="text-[10px] text-slate-500 dark:text-[#7d8b9e]">locations per band</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={analytics.by_category.slice(0, 5)} margin={{ left: -20, right: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#7d8b9e" }} tickFormatter={(d: string) => d.slice(0, 5)} />
                <YAxis tick={{ fontSize: 10, fill: "#7d8b9e" }} />
                <RTooltip contentStyle={{ backgroundColor: "#0b0d11", borderRadius: "8px", color: "#fff", border: "1px solid #1e2430", fontSize: "12px" }} />
                <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Exceedances / Top Wards Horizontal Bar Chart */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Reports by Ward</h3>
              <span className="text-[10px] text-slate-500 dark:text-[#7d8b9e]">volume above limit</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={analytics.by_ward.slice(0, 5)} layout="vertical" margin={{ left: -10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#7d8b9e" }} />
                <RTooltip contentStyle={{ backgroundColor: "#0b0d11", borderRadius: "8px", color: "#fff", border: "1px solid #1e2430", fontSize: "12px" }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: 14-Day Grievance Trend */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">14-Day Grievance Trend</h3>
              <span className="text-[10px] text-slate-500 dark:text-[#7d8b9e]">daily telemetry</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={analytics.timeline} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="areaCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#7d8b9e" }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#7d8b9e" }} />
                <RTooltip contentStyle={{ backgroundColor: "#0b0d11", borderRadius: "8px", color: "#fff", border: "1px solid #1e2430", fontSize: "12px" }} />
                <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#areaCyan)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selected && <HotspotDrawer hotspot={selected} onClose={() => setSelected(null)} />}
      {copilot && <CopilotDrawer onClose={() => setCopilot(false)} />}
    </div>
  );
}
