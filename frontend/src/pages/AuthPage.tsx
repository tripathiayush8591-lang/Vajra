import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, UserRole } from "../context/AuthContext";
import {
  Building2,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
  ExternalLink,
  Flame,
  CheckCircle2,
} from "lucide-react";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as UserRole) || "citizen";
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Zonal Officer • Zone 3");
  const [error, setError] = useState<{ title: string; detail?: string; isProviderDisabled?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loginWithEmail, signUpWithEmail, loginWithGoogle, loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, selectedRole, name, selectedRole === "authority" ? designation : undefined);
      } else {
        await loginWithEmail(email, password, selectedRole);
      }
      navigate(selectedRole === "authority" ? "/admin" : "/citizen");
    } catch (err: any) {
      console.error(err);
      const code = err.code || "";
      if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed") {
        setError({
          title: "Email/Password sign-in provider is not enabled in Firebase Console yet.",
          detail: "Enable Email/Password under Firebase Console -> Authentication -> Sign-in method, or use the 1-Tap Demo below!",
          isProviderDisabled: true,
        });
      } else if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setError({
          title: "Invalid credentials.",
          detail: "No user found with this email/password. You can click 'Sign Up' above or use the 1-Tap Demo.",
        });
      } else if (code === "auth/email-already-in-use") {
        setError({
          title: "Email already in use.",
          detail: "This email address is already registered. Please switch to Sign In.",
        });
      } else {
        setError({ title: err.message || "Authentication failed." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle(selectedRole);
      navigate(selectedRole === "authority" ? "/admin" : "/citizen");
    } catch (err: any) {
      console.error("Google Auth error:", err);
      const code = err.code || "";
      if (code === "auth/operation-not-allowed" || code === "auth/configuration-not-found") {
        setError({
          title: "Google Sign-In is not enabled in your Firebase project yet.",
          detail: "In Firebase Console -> Authentication -> Sign-in method -> click 'Google', toggle Enable, select your support email, and save.",
          isProviderDisabled: true,
        });
      } else if (code === "auth/popup-closed-by-user") {
        setError({
          title: "Sign-in popup was closed before completing.",
          detail: "Please try again or use the instant 1-Tap Demo below.",
        });
      } else if (code === "auth/popup-blocked") {
        setError({
          title: "Popup blocked by your browser.",
          detail: "Please allow popups for localhost or use the 1-Tap Demo below.",
        });
      } else {
        setError({
          title: "Google sign-in could not complete.",
          detail: err.message || "Please check your Firebase configuration or use 1-Tap Demo.",
          isProviderDisabled: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = (role: UserRole) => {
    loginDemo(role);
    navigate(role === "authority" ? "/admin" : "/citizen");
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-civic text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-civic" />
          <span>Indore Smart City • Unified Municipal Auth Gateway</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome to CivicPulse AI
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Select your portal role below to sign in or create an account.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="liquid-glass-deep rounded-3xl shadow-card overflow-hidden">
        {/* Role Tabs with Liquid Glass & Crisp White Border */}
        <div className="grid grid-cols-2 p-2.5 liquid-tab-track border-b border-slate-200/80 dark:border-white/10 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedRole("citizen");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              selectedRole === "citizen"
                ? "liquid-tab-item-active-civic"
                : "liquid-tab-item text-slate-700 hover:text-slate-950"
            }`}
          >
            <Users className={`w-4 h-4 ${selectedRole === "citizen" ? "text-white" : "text-blue-600"}`} />
            <span>Citizen Portal</span>
            {selectedRole === "citizen" && (
              <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole("authority");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              selectedRole === "authority"
                ? "liquid-tab-item-active-official"
                : "liquid-tab-item text-slate-700 hover:text-slate-950"
            }`}
          >
            <Building2 className={`w-4 h-4 ${selectedRole === "authority" ? "text-amber-400" : "text-amber-600"}`} />
            <span>Govt Authority</span>
            {selectedRole === "authority" && (
              <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            )}
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Active Role Description */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {selectedRole === "authority" ? "Government Authority Login" : "Citizen Portal Login"}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-xs ${
                    selectedRole === "authority"
                      ? "bg-gradient-to-r from-amber-600 to-rose-600 ring-1 ring-amber-300/50"
                      : "bg-gradient-to-r from-blue-600 to-cyan-600 ring-1 ring-blue-300/50"
                  }`}
                >
                  {selectedRole === "authority" ? "Command Center" : "Grievances"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedRole === "authority"
                  ? "Indore Municipal Corporation • Hotspots Map • Priority Queue • AI Copilot"
                  : "Report issues via Hindi/English voice, photos, and track resolution live"}
              </p>
            </div>

            {/* Sign In vs Sign Up toggle */}
            <div className="flex liquid-tab-track p-1 rounded-xl text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
                  !isSignUp
                    ? "liquid-tab-item-active-light text-slate-900 font-black shadow-sm"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/40"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
                  isSignUp
                    ? "liquid-tab-item-active-light text-slate-900 font-black shadow-sm"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/40"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* 1-Tap Instant Demo Access */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 backdrop-blur-md border border-blue-300/60 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Hackathon Evaluation Access</span>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                1-Click
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDemo(selectedRole)}
              className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border border-blue-300 text-slate-900 rounded-xl p-3.5 text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  {selectedRole === "authority" ? <Flame className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <div className="leading-snug">
                    Enter as {selectedRole === "authority" ? "Demo Official (Er. Ashish Saxena)" : "Demo Citizen (Rahul Verma)"}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    {selectedRole === "authority" ? "Zonal Officer • Zone 3 Palasia" : "Resident • Ward 24 Vijay Nagar"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-civic text-xs font-bold">
                <span>Enter Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* Error / Diagnostic Notice */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-900">{error.title}</div>
                  {error.detail && <div className="mt-1 text-rose-700 leading-relaxed">{error.detail}</div>}
                </div>
              </div>

              {error.isProviderDisabled && (
                <div className="pt-2 border-t border-rose-200/80 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo(selectedRole)}
                    className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs"
                  >
                    👉 Click to Enter with 1-Tap Demo Instead
                  </button>
                  <a
                    href="https://console.firebase.google.com/u/0/project/civicpulse-indore/authentication/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-rose-900 hover:underline font-semibold text-xs ml-auto"
                  >
                    <span>Open Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Real Firebase Credentials Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Or Use Firebase Credentials
              </span>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={selectedRole === "authority" ? "e.g. Er. R. K. Sharma" : "e.g. Ayush Tripathi"}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:border-civic focus:ring-2 focus:ring-civic/20"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}

            {isSignUp && selectedRole === "authority" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Role / Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Ward Engineer - Ward 18 Palasia"
                  className="w-full px-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:border-civic focus:ring-2 focus:ring-civic/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === "authority" ? "officer@indore.gov.in" : "citizen@example.com"}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:border-civic focus:ring-2 focus:ring-civic/20"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:border-civic focus:ring-2 focus:ring-civic/20"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md ${
                selectedRole === "authority"
                  ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                  : "bg-civic hover:bg-civic-hover shadow-blue-600/20"
              } disabled:opacity-50`}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Create Account & Open Portal" : `Sign In as ${selectedRole === "authority" ? "Official" : "Citizen"}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Continue with Google */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
