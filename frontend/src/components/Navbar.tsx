import { NavLink, useNavigate } from "react-router-dom";
import { Activity, Building2, MapPinned, RadioTower, LogOut, ShieldCheck, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { getSystem, setOffline } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [llmMode, setLlmMode] = useState("fallback");
  const [offline, setOfflineState] = useState(false);
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getSystem()
      .then((r) => {
        setLlmMode(r.data.llm_mode);
        setOfflineState(r.data.offline_mode);
      })
      .catch(() => {});
  }, []);

  const toggle = async () => {
    const next = !offline;
    setOfflineState(next);
    try {
      const r = await setOffline(next);
      setLlmMode(r.data.llm_mode);
    } catch {}
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-150 ${
      isActive
        ? role === "authority"
          ? "liquid-tab-item-active-official"
          : "liquid-tab-item-active-civic"
        : "liquid-tab-item text-slate-600 hover:text-slate-900"
    }`;

  return (
    <nav className="liquid-glass sticky top-0 z-50 border-b border-white/80 dark:border-[#161b24] px-4 md:px-6 h-16 flex items-center justify-between gap-3">
      {/* Brand & Badge */}
      <div className="flex items-center gap-2.5">
        <div
          onClick={() => navigate(role === "authority" ? "/admin" : role === "citizen" ? "/citizen" : "/login")}
          className="cursor-pointer flex items-center gap-2.5"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
              role === "authority"
                ? "bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 dark:bg-black dark:border dark:border-[#1e2430] shadow-amber-500/20 ring-1 ring-amber-400/40 dark:ring-0"
                : "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 dark:bg-black dark:border dark:border-[#1e2430] shadow-blue-500/30 ring-1 ring-blue-300/50 dark:ring-0"
            }`}
          >
            {role === "authority" ? (
              <Building2 className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-base md:text-lg text-slate-900 dark:text-white tracking-tight">CivicPulse</span>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-xs ${
                  role === "authority"
                    ? "bg-gradient-to-r from-amber-600 to-rose-600 dark:bg-[#1a120b] dark:text-amber-400 dark:border dark:border-amber-500/30"
                    : role === "citizen"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 dark:bg-[#071324] dark:text-sky-400 dark:border dark:border-sky-500/30"
                    : "bg-slate-700"
                }`}
              >
                {role === "authority" ? "OFFICIAL" : role === "citizen" ? "CITIZEN" : "GATEWAY"}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-[#6c7a8e] font-medium leading-tight">Indore Municipal Corporation</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Navigation Tabs with Pill Capsule */}
      <div className="hidden sm:flex items-center gap-1 p-1 liquid-tab-track rounded-full">
        {role === "citizen" && (
          <>
            <NavLink to="/citizen" className={link} end>
              <MapPinned className="w-3.5 h-3.5" /> <span>Report &amp; Track</span>
            </NavLink>
            <NavLink to="/pipeline" className={link}>
              <RadioTower className="w-3.5 h-3.5" /> <span>Live AI Track</span>
            </NavLink>
          </>
        )}

        {role === "authority" && (
          <>
            <NavLink to="/admin" className={link} end>
              <Activity className="w-3.5 h-3.5" /> <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/analysis" className={link}>
              <ClipboardList className="w-3.5 h-3.5" /> <span>Analysis</span>
            </NavLink>
            <NavLink to="/pipeline" className={link}>
              <RadioTower className="w-3.5 h-3.5" /> <span>AI Trace</span>
            </NavLink>
          </>
        )}
      </div>

      {/* Right side status chips & profile */}
      <div className="flex items-center gap-2 text-xs">
        <div
          className={`hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold border border-slate-200/80 dark:border-white/10 backdrop-blur-md transition-all shadow-xs ${
            llmMode === "gemini"
              ? "bg-white/95 text-emerald-700 dark:bg-white/[0.08] dark:text-[#34d399]"
              : "bg-white/95 text-amber-700 dark:bg-white/[0.08] dark:text-amber-400"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${llmMode === "gemini" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"}`} />
          <span>{llmMode === "gemini" ? "Gemini 2.0" : "Offline Fallback"}</span>
        </div>

        {role === "authority" && (
          <button
            onClick={toggle}
            title="Airplane mode: forces deterministic offline pipeline execution"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border border-slate-200/80 dark:border-white/10 transition-all duration-150 shadow-xs ${
              offline
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                : "bg-white/90 text-slate-800 dark:bg-white/10 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>✈ Offline</span>
            {offline && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
            <div className="hidden lg:flex flex-col text-right">
              <span className="font-bold text-slate-800 leading-tight text-xs">{user.displayName}</span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[140px]">
                {user.designation || (role === "authority" ? "Municipal Official" : user.email)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out / Switch Role"
              className="flex items-center gap-1 liquid-tab-item hover:bg-rose-500/10 hover:text-rose-700 hover:border-rose-300 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
          >
            Sign In
          </button>
        )}

        {/* Theme Changing Night Mode Button in Navbar Corner */}
        <ThemeToggle />
      </div>
    </nav>
  );
}
