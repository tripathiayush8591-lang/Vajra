import { useState } from "react";
import { MessageSquare, Send, X, Bot, ClipboardList } from "lucide-react";
import { copilotChat } from "../services/api";

const QUICK = [
  "What are the top 3 critical issues right now?",
  "Which ward needs budget first?",
  "Summarize the sewage situation near Palasia.",
];

export default function CopilotDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "**CivicPulse Copilot** online. I'm grounded on live hotspot data — ask me anything about wards, priorities, or budgets." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const r = await copilotChat(q);
      setMessages((m) => [...m, { role: "ai", text: r.answer }]);
      setDraft(r.draft_work_order);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Backend unreachable — is it running on :8000?" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md liquid-glass-deep shadow-drawer z-[60] border-l border-white/80 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-black text-sm leading-tight">CivicPulse AI Copilot</h2>
            <p className="text-[11px] text-blue-100">Grounded on Live Indore Grievance DB</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-blue-500/30">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-md shadow-blue-500/20"
                  : "liquid-glass text-slate-800 rounded-tl-xs shadow-xs"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {draft && (
          <div className="border border-emerald-300/80 bg-emerald-500/10 backdrop-blur-md rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs uppercase tracking-wider">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>AI Synthesized Work Order</span>
            </div>
            <div className="text-xs text-slate-800 space-y-1 bg-white/90 p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
              <div><b className="text-slate-900">Target Area:</b> {draft.title}</div>
              <div><b className="text-slate-900">Ward:</b> {draft.ward} • <b className="text-slate-900">Timeline:</b> {draft.timeline}</div>
              <div><b className="text-slate-900">Equipment:</b> {draft.equipment_hint}</div>
              <div><b className="text-slate-900">Estimated Budget:</b> <span className="font-extrabold text-emerald-700">₹{draft.budget_estimate_inr?.toLocaleString("en-IN")}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/80 p-4 space-y-3 liquid-tab-track">
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-[11px] font-bold liquid-tab-item text-slate-700 hover:text-blue-600 hover:border-blue-300 px-3.5 py-1.5 rounded-full transition-all shadow-xs"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Ask about hotspots, budgets, wards…"
            className="flex-1 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white/90 shadow-inner"
          />
          <button
            onClick={() => ask(input)}
            disabled={busy || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-4 text-xs font-bold disabled:opacity-50 transition-all shadow-md shadow-blue-500/25"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
