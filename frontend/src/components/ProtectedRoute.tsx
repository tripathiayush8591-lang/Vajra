import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth, UserRole } from "../context/AuthContext";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-civic border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Verifying civic authorization...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 text-center shadow-card space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">Restricted Authority Area</h2>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
              This portal requires <b>Government Authority</b> credentials. You are currently logged in as a <b>{user.role === "citizen" ? "Citizen" : user.role}</b>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/citizen"
              className="inline-flex items-center justify-center gap-2 w-full bg-civic hover:bg-civic-hover text-white rounded-xl py-2.5 text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Citizen Portal</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-semibold transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Switch to Authority Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
