import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, UserCheck, Briefcase, Calendar, 
  Loader2, AlertCircle, RefreshCw, Sparkles, CheckCircle2 
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api"; // or your staff api client

const StaffDashboard = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // =========================================================
  // PIPELINE: FETCH STAFF PROFILE & DASHBOARD METRICS
  // =========================================================
  const fetchStaffProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await accountClient.get("/staff/profile", { headers });
      if (res.data.success) {
        setProfileData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load staff profile:", err);
      setError(err.response?.data?.message || "Failed to load staff dashboard profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffProfile();
  }, [token]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-indigo-600 gap-3">
        <Loader2 className="animate-spin" size={36} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Staff Workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-xs font-bold text-rose-600 flex items-center gap-2 max-w-xl mx-auto my-12">
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  const staff = profileData?.staff;
  const roleName = profileData?.dashboardAccess?.role?.replace("_", " ").toUpperCase() || "STAFF MEMBER";
  const permissions = profileData?.dashboardAccess?.permissions || [];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto text-slate-800 antialiased font-sans animate-in fade-in duration-300">
      
      {/* =========================================================
          DECORATIVE WELCOME HERO BANNER
         ========================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-[32px] p-8 sm:p-12 text-white shadow-xl border border-indigo-700/50">
        {/* Abstract decorative background glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-black uppercase tracking-widest text-indigo-200">
              <Sparkles size={13} className="text-amber-400 animate-pulse" /> Staff Operations Portal
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-blue-200 underline decoration-indigo-400/40">{staff?.name || "Staff Member"}</span>! ✨
            </h1>
            
            <p className="text-indigo-200 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
              You are signed in as <strong className="text-white font-bold">{roleName}</strong>. Review assigned queue items, moderate merchant workflows, and assist platform users efficiently.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md border border-indigo-400/30">
              {staff?.name?.charAt(0).toUpperCase() || "S"}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold text-white">{staff?.email}</p>
              <p className="text-[10px] font-mono text-indigo-300">Phone: {staff?.phone}</p>
              <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase rounded-md border border-emerald-500/30">
                ● Status: Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          METRICS / SUMMARY GRID
         ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Role Overview */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Briefcase size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Assigned Clearance Role</span>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{roleName}</h3>
          </div>
          <p className="text-xs text-slate-500">Authorized to perform moderation and operational oversight actions.</p>
        </div>

        {/* Card 2: Permissions Badge Matrix */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Permissions</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {permissions.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Standard access scope</span>
              ) : (
                permissions.map((perm, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase tracking-wider">
                    {perm}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Session Intelligence */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Account Created On</span>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              {staff?.createdAt ? new Date(staff.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
            </h3>
          </div>
          <p className="text-xs text-slate-500">Internal credentials verified and secured via JWT.</p>
        </div>

      </div>

    </div>
  );
};

export default StaffDashboard;