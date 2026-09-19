import { useState } from "react";
import { Mic, Camera, Type, Send, CheckCircle2, Loader2, X } from "lucide-react";
import { submitComplaint } from "../services/api";

const WARDS = [
  { id: 1, name: "Ward 3 — Palasia" },
  { id: 2, name: "Ward 5 — Rajwada" },
  { id: 3, name: "Ward 18 — Bhawarkuan" },
  { id: 4, name: "Ward 24 — Vijay Nagar" },
  { id: 5, name: "Ward 33 — Sudama Nagar" },
  { id: 6, name: "Ward 44 — Annapurna Road" },
  { id: 7, name: "Ward 56 — Scheme 78" },
  { id: 8, name: "Ward 71 — Nipania" },
];

// Pre-baked demo clips (Hindi/Hinglish) — deterministic voice flow for the live demo.
const DEMO_CLIPS = [
  { label: "🎤 Sewage overflow — Palasia", text: "Palasia square ke paas do din se naali ka paani sadak par beh raha hai aur bahut badboo aa rahi hai" },
  { label: "🎤 Pothole — Vijay Nagar", text: "Vijay Nagar mein bade pothole sadak mein hain, bike slide ho gayi, bahut khatarnak hai" },
  { label: "🎤 Streetlight — Rajwada", text: "Rajwada ke paas street light pichle hafte se nahi jal rahi, raat ko poora andhera rehta hai" },
];

type Mode = "text" | "voice" | "photo";

export default function SubmissionModal({
  onClose,
  onSubmitted,
  initialText = "",
  initialMode = "text",
}: {
  onClose: () => void;
  onSubmitted: (id: string) => void;
  initialText?: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState(initialText);
  const [ward, setWard] = useState(4);
  const [phone, setPhone] = useState("9826012345");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  const submit = async (payloadText?: string) => {
    setBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("channel", mode);
      form.append("text", payloadText ?? text);
      // Simulated geolocation = center of selected ward
      const centers: Record<number, [number, number]> = {
        1: [22.7533, 75.8937], 2: [22.7196, 75.8577], 3: [22.7248, 75.8839], 4: [22.7585, 75.8934],
        5: [22.7103, 75.8699], 6: [22.7041, 75.8613], 7: [22.7396, 75.9088], 8: [22.7716, 75.9076],
      };
      const [lat, lng] = centers[ward];
      form.append("lat", String(lat + (Math.random() - 0.5) * 0.002));
      form.append("lng", String(lng + (Math.random() - 0.5) * 0.002));
      form.append("ward_id", String(ward));
      form.append("phone", phone);
      const r = await submitComplaint(form);
      setDone(r.data.submission_id);
      onSubmitted(r.data.submission_id);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Submission failed — is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="liquid-glass-deep rounded-3xl shadow-2xl border border-white/90 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-6 py-4 flex items-center justify-between shadow-xs">
          <div>
            <h2 className="font-extrabold text-lg leading-tight">File a Citizen Grievance</h2>
            <p className="text-xs text-blue-100 mt-0.5">Indore Municipal Corporation • Instant Multimodal AI Triage</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-300 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">Complaint Logged Successfully</h3>
              <p className="text-sm text-slate-600 mt-1">
                Submission <b className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">{done}</b> has been received and routed into the 6-stage AI pipeline.
              </p>
            </div>
            <div className="flex gap-2.5 justify-center pt-2">
              <a
                href="/pipeline"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                Watch live pipeline trace
              </a>
              <button
                onClick={onClose}
                className="liquid-tab-item text-slate-700 hover:text-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Input mode selector with Liquid Glass & Vivid Accents */}
            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-[#8b98a9] uppercase tracking-wider mb-2">
                Reporting Method
              </label>
              <div className="grid grid-cols-3 gap-2.5 p-1.5 liquid-tab-track rounded-2xl">
                {([
                  ["text", Type, "Text", "liquid-tab-item-active-civic"],
                  ["voice", Mic, "Voice Note", "liquid-tab-active-rose"],
                  ["photo", Camera, "Photo Evidence", "liquid-tab-active-emerald"],
                ] as const).map(([m, Icon, label, activeClass]) => {
                  const isAct = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isAct
                          ? activeClass
                          : "liquid-tab-item text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isAct ? "text-white drop-shadow-sm" : "text-slate-500"}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Mode */}
            {mode === "voice" && (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Pre-recorded Citizen Voice Notes</span>
                  <span className="text-[11px] text-blue-600 font-semibold">Hindi / Hinglish</span>
                </div>
                <div className="space-y-1.5">
                  {DEMO_CLIPS.map((c) => {
                    const isSel = text === c.text;
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => { setText(c.text); setMode("voice"); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isSel
                            ? "border-civic bg-white text-civic shadow-xs font-semibold"
                            : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{c.label}</span>
                          {isSel && (
                            <div className="flex items-center gap-0.5 ml-2 h-3">
                              <span className="w-0.5 h-3 bg-civic animate-pulse" />
                              <span className="w-0.5 h-2 bg-civic animate-pulse" />
                              <span className="w-0.5 h-3.5 bg-civic animate-pulse" />
                              <span className="w-0.5 h-1.5 bg-civic animate-pulse" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {text && (
                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">Transcript: </span>
                    <span className="italic font-normal">"{text}"</span>
                  </div>
                )}
              </div>
            )}

            {/* Photo Mode */}
            {mode === "photo" && (
              <label className="block border-2 border-dashed border-slate-300 hover:border-civic rounded-xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all">
                <Camera className="w-7 h-7 mx-auto text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-700 block">
                  {photoName ?? "Upload Damage Photo (PNG, JPG)"}
                </span>
                <span className="text-[11px] text-slate-400">Simulates multimodal photo verification</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
            )}

            {/* Text description */}
            {(mode === "text" || mode === "photo") && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Issue Description
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Describe what happened, where, and how severe it is (Hindi or English)…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-civic focus:ring-2 focus:ring-civic/20 transition-all"
                />
              </div>
            )}

            {/* Location & phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Ward
                </label>
                <select
                  value={ward}
                  onChange={(e) => setWard(+e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {WARDS.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone (Masked)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9826012345"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>
            </div>

            {err && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                {err}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={() => submit()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-civic hover:bg-civic-hover text-white rounded-xl py-3.5 font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{busy ? "Processing through 6-Stage AI Pipeline…" : "Submit Grievance to AI Engine"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
