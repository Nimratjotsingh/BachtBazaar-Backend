import React, { useState, useEffect, useMemo } from "react";
import {
  Users, UserCheck, UserMinus, UserPlus, Clock, ArrowUpRight, ArrowDownRight,
  RefreshCw, Smartphone, LogIn, UserCircle, Eye, Gift, CheckCircle,
  Search, Filter, ShieldAlert, Zap, AlertCircle, Loader2, X
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../../lib/api";
import UserDetailsSidebar from "./UserDetailedSidebar"; // Import the sidebar component

const UserIntelligenceDashboard = ({ token }) => {
  // --- Core State Management ---
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("Never");

  // Selection states tracking the side slide-out user details inspection panel
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Fetch Dynamic Intelligence Metrics Pipeline ---
  const fetchDashboardIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await accountClient.get("/analytics/user-intelligence", { headers });
      
      if (res.data.success) {
        setDashboardData(res.data.data);
        console.log(res.data.data)
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error("Dashboard calculation retrieval error:", err);
      setError("Failed to fetch running user behavior logs from database tables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardIntelligence();
  }, []);

  // --- Drill Down Profile Lookups Trigger ---
  const handleOpenUserProfile = async (userId) => {
    if (!userId) return;
    try {
      setDetailLoading(true);
      const res = await accountClient.get(`/analytics/user-profile/${userId}`, { headers });
      if (res.data.success) {
        setSelectedUser(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load targeted user profile details:", err);
      alert("Failed to resolve absolute profile track indicators for this user record node.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-indigo-600">
        <Loader2 className="animate-spin mb-3 w-10 h-10" />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Compiling Real-Time Schema Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#334155] p-8 font-sans antialiased space-y-6 max-w-[1800px] mx-auto relative">
      
      {/* --- MASTER LAYOUT DYNAMIC COLUMN RESPONSIVENESS GRID SPLIT --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Main Control Panel Dashboard Workspace */}
        <div className={`${selectedUser ? "xl:col-span-8" : "xl:col-span-12"} space-y-6 transition-all duration-300`}>
          
          {/* --- DASHBOARD HEADER PANEL --- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">User Intelligence & Control Panel</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Complete overview of user behavior, engagement & performance</p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Data
              </span>
              <span className="text-xs text-slate-400 font-semibold">Last updated: {lastUpdated}</span>
              <button 
                onClick={fetchDashboardIntelligence} 
                disabled={loading}
                className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-2.5">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* --- GRID MODULE 1: SUMMARY METRIC CARD STATS TICKERS --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            <StatTickerCard title="Total Users" val={dashboardData?.summary?.totalUsers} trend={dashboardData?.trends?.total} icon={<Users size={22} />} bg="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerCard title="Active Users (Daily)" val={dashboardData?.summary?.dailyActive} trend={dashboardData?.trends?.active} icon={<UserCheck size={22} />} bg="bg-emerald-50 text-emerald-600 border-emerald-100" />
            <StatTickerCard title="Inactive Users" val={dashboardData?.summary?.inactiveUsers} trend={dashboardData?.trends?.inactive} icon={<UserMinus size={22} />} bg="bg-orange-50 text-orange-600 border-orange-100" isNegative />
            <StatTickerCard title="New Users (7 Days)" val={dashboardData?.summary?.newUsers7Days} trend={dashboardData?.trends?.newUsers} icon={<UserPlus size={22} />} bg="bg-purple-50 text-purple-600 border-purple-100" />
            <StatTickerCard title="Avg. App Usage Time" val={dashboardData?.summary?.avgUsageTime} trend={dashboardData?.trends?.usage} icon={<Clock size={22} />} bg="bg-sky-50 text-sky-600 border-sky-100" isString />
          </div>

          {/* --- GRID MODULE 2: RECURSIVE FUNNEL PROGRESSION LOGIC --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">User Funnel</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View Full Report</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4 items-start relative pt-2">
                {dashboardData?.funnel?.map((step, idx) => (
                  <FunnelNode 
                    key={idx} 
                    step={step} 
                    isLast={idx === dashboardData.funnel.length - 1} 
                    onNodeClick={() => step.sampleUserId && handleOpenUserProfile(step.sampleUserId)}
                  />
                ))}
              </div>
            </div>

            {/* Drop-off Category Breakdown Checklist */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">Drop-off Analysis</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-around">
                {dashboardData?.dropOffAnalysis?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs font-semibold">
                    <span className="text-slate-500">{item.stage}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-800 font-extrabold">{item.count?.toLocaleString('en-IN')}</span>
                      <span className="text-rose-600 font-black px-2 py-0.5 bg-rose-50 rounded border border-rose-100 w-14 text-center">{item.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- GRID MODULE 3: DEMOGRAPHICS SHARE & INTERACTION GRAPHS --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Real-time Status Engagement Indicators */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">User Engagement</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-4">
                {dashboardData?.engagement?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-bold p-1">
                    <span className="text-slate-500 font-semibold">{item.label}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-6 flex items-center">
                        <svg viewBox="0 0 50 20" className="w-full h-full">
                          <path d={item.isPositive ? "M0,15 Q15,5 30,12 T50,3" : "M0,3 Q15,15 30,8 T50,18"} fill="none" stroke={item.isPositive ? "#10B981" : "#EF4444"} strokeWidth="2" />
                        </svg>
                      </div>
                      <span className="font-extrabold text-slate-800 font-mono w-16 text-right">{item.value}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] w-12 justify-end ${item.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.isPositive ? "↑" : "↓"} {item.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Analytics Donut Radial Frame */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">User Behavior Analytics</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="flex items-center gap-4 py-1">
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563EB" strokeWidth="4" strokeDasharray={`${dashboardData?.behavior?.distribution?.afternoon || 25} 100`} strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray={`${dashboardData?.behavior?.distribution?.evening || 25} 100`} strokeDashoffset={`-${dashboardData?.behavior?.distribution?.afternoon}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`${dashboardData?.behavior?.distribution?.night || 12} 100`} strokeDashoffset={`-${(dashboardData?.behavior?.distribution?.afternoon || 0) + (dashboardData?.behavior?.distribution?.evening || 0)}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full m-3.5 shadow-sm text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Avg. Sessions</span>
                    <span className="text-base font-black text-slate-800 font-mono mt-1">{dashboardData?.behavior?.avgSessions}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E2E8F0]" /><span>Morning</span></div><span className="font-mono text-slate-800">{dashboardData?.behavior?.distribution?.morning}%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2563EB]" /><span>Afternoon</span></div><span className="font-mono text-slate-800">{dashboardData?.behavior?.distribution?.afternoon}%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /><span>Evening</span></div><span className="font-mono text-slate-800">{dashboardData?.behavior?.distribution?.evening}%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981]" /><span>Night</span></div><span className="font-mono text-slate-800">{dashboardData?.behavior?.distribution?.night}%</span></div>
                </div>
              </div>
              <div className="border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-400 grid grid-cols-2 gap-2">
                <div>Most Active: <span className="text-slate-700 block font-extrabold mt-0.5">{dashboardData?.behavior?.peakTime}</span></div>
                <div>Avg. Duration: <span className="text-slate-700 block font-extrabold mt-0.5 font-mono">{dashboardData?.behavior?.avgDuration}</span></div>
              </div>
            </div>

            {/* User Demographics Shares Progression Columns */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">User Demographics</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-3.5">
                {dashboardData?.categories?.map((cat, i) => (
                  <div key={i} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-slate-600">
                      <span className="truncate max-w-[130px]">{cat.name}</span>
                      <span className="font-mono text-slate-400 font-medium">{cat.share}% <span className="text-slate-800 font-extrabold pl-1">{cat.count?.toLocaleString('en-IN')}</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${cat.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* --- GRID MODULE 4: FIELD REGISTRATIONS & SYSTEM OVERVIEW TILES --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
            
            {/* Field Completion Progress Weights */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Form Field Usage</h4>
                <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-3 text-[11px] font-bold">
                {dashboardData?.features?.map((feat, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-600 font-semibold">{feat.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400">{feat.rate}%</span>
                      <span className="text-slate-800 font-extrabold">{feat.users?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Onboarding Funnel Progress Indicators */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Conversion Analytics</h4>
                <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-3.5 pt-1">
                {dashboardData?.conversions?.map((conv, i) => (
                  <div key={i} className="flex items-center gap-3 text-[11px] font-bold">
                    <div className="w-14 text-slate-400 font-semibold truncate">{conv.stage}</div>
                    <div className="flex-1 h-3 bg-slate-50 border border-slate-100 rounded-md relative overflow-hidden">
                      <div className="h-full bg-blue-500/80 rounded-sm" style={{ width: `${conv.rate}%` }} />
                      <span className="absolute inset-y-0 right-2 flex items-center text-[9px] font-mono text-slate-600 font-black">{conv.rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata Complete Ratios */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Profile Completion</h4>
                <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="flex items-center gap-4 h-full pb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-black text-[10px] text-indigo-700 shadow-inner">
                  75% - 99%
                </div>
                <div className="flex-1 space-y-1 text-[9px] font-bold text-slate-400">
                  <div className="flex justify-between"><span>100% Complete</span><span className="text-slate-700">{dashboardData?.profileMix?.full}%</span></div>
                  <div className="flex justify-between text-indigo-600 font-extrabold"><span>75% - 99%</span><span>{dashboardData?.profileMix?.high}%</span></div>
                  <div className="flex justify-between"><span>50% - 74%</span><span className="text-slate-700">{dashboardData?.profileMix?.mid}%</span></div>
                  <div className="flex justify-between"><span>0% - 49%</span><span className="text-slate-700">{dashboardData?.profileMix?.low}%</span></div>
                </div>
              </div>
            </div>

            {/* Retention and Dormancy Trackers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Churn & Uninstall</h4>
                <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-2.5 text-[11px] font-bold">
                {dashboardData?.churn?.map((item, i) => (
                  <div key={i} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-slate-500 block leading-tight font-semibold">{item.type}</span>
                      <span className="text-xs font-black font-mono text-slate-800 block mt-0.5">{item.count?.toLocaleString('en-IN')}</span>
                    </div>
                    <span className={`text-[10px] font-black ${item.isIncrease ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {item.isIncrease ? '↑' : '↓'} {item.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications Clicking Ratios */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Notification Impact</h4>
                <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-2 font-mono text-[10px] font-bold">
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Sent</span>
                  <span className="text-slate-800 font-black text-xs block mt-0.5">{dashboardData?.notifications?.sent?.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-blue-50/50 p-1.5 rounded-xl border border-blue-100/50">
                  <span className="text-[9px] font-sans font-bold text-blue-500 block uppercase">Clicked (CTR)</span>
                  <span className="text-blue-700 font-black text-xs block mt-0.5">{dashboardData?.notifications?.ctr}%</span>
                </div>
                <div className="bg-emerald-50/50 p-1.5 rounded-xl border border-emerald-100/50">
                  <span className="text-[9px] font-sans font-bold text-emerald-500 block uppercase">Converted</span>
                  <span className="text-emerald-700 font-black text-xs block mt-0.5">{dashboardData?.notifications?.conversionRate}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* --- GRID MODULE 5: SECURITY ALERT CHANNELS & INSIGHT LOGS --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* System Verification Shares */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">Rewards & Security Verification</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Verified Accounts</p>
                  <p className="text-base font-black font-mono text-slate-800 mt-0.5">{dashboardData?.rewards?.users?.toLocaleString('en-IN')}</p>
                  <span className="text-[10px] font-black text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded mt-1.5 inline-block">{dashboardData?.rewards?.usersShare}%</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Names Filled</p>
                  <p className="text-base font-black font-mono text-slate-800 mt-0.5">{dashboardData?.rewards?.scratchUsed?.toLocaleString('en-IN')}</p>
                  <span className="text-[10px] font-black text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded mt-1.5 inline-block">{dashboardData?.rewards?.scratchShare}%</span>
                </div>
              </div>
            </div>

            {/* Banned Administrative Flags */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider flex items-center gap-1.5"><ShieldAlert size={16} className="text-rose-500" /> Alerts & Risk</h3>
                <button className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-2 text-xs font-bold">
                {dashboardData?.alerts?.map((alert, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                    <span className="text-slate-600 font-semibold">{alert.type}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-800 font-extrabold">{alert.count?.toLocaleString('en-IN')}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border text-center w-14 ${
                        alert.risk === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        alert.risk === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>{alert.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamically Populated Overview Insights */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider flex items-center gap-1.5"><Zap size={16} className="text-amber-500" /> Micro Insights</h3>
              </div>
              <div className="space-y-2 text-[11px] font-semibold text-slate-600 leading-relaxed flex-1 flex flex-col justify-around pt-1">
                {dashboardData?.insights?.map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span dangerouslySetInnerHTML={{ __html: text }} />
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* =========================================================
            SLIDEOUT SIDEBAR DETAIL COMPONENT MOUNT POINT
           ========================================================= */}
        {selectedUser && (
          <div className="xl:col-span-4 h-[calc(100vh-4rem)] sticky top-8 animate-in fade-in duration-300">
            {detailLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 w-8 h-8 mb-2" />
                <p className="text-slate-400 text-xs font-semibold">Syncing profile metadata indicators...</p>
              </div>
            ) : (
              <UserDetailsSidebar 
                userData={selectedUser} 
                onClose={() => setSelectedUser(null)}
                onActionTrigger={(action, user) => console.log(`Triggered administrative user operation: ${action}`, user)}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// --- Stat Ticker Presentational Sub-Component ---
const StatTickerCard = ({ title, val, trend, icon, bg, isNegative, Richmond, isString }) => {
  const isPositive = trend?.isPositive !== false;
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
          {isString ? val : val?.toLocaleString('en-IN') || 0}
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <span className={`font-black flex items-center gap-0.5 ${isNegative ? 'text-rose-500' : isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive && !isNegative ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend?.value || "0%"}
          </span>
          <span>vs last period</span>
        </div>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${bg}`}>{icon}</div>
    </div>
  );
};

// --- Funnel Node Presentational Sub-Component ---
const FunnelNode = ({ step, isLast, onNodeClick }) => (
  <div className="flex flex-col items-center text-center relative group min-w-[95px] flex-1">
    <button 
      onClick={onNodeClick}
      type="button"
      className="w-11 h-11 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl flex items-center justify-center shadow-inner hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {step.stage === "Installed" && <Smartphone size={18} />}
      {step.stage === "Opened App" && <LogIn size={18} />}
      {step.stage === "Signed Up" && <UserCircle size={18} />}
      {step.stage === "Profile Completed" && <UserCircle size={18} />}
      {step.stage === "Viewed Offer" && <Eye size={18} />}
      {step.stage === "First Redemption" && <Gift size={18} />}
      {step.stage === "Active User" && <CheckCircle size={18} />}
    </button>
    
    <div className="mt-3 space-y-0.5">
      <p className="text-[10px] font-black text-slate-800 leading-tight">{step.stage}</p>
      <p className="text-xs font-black font-mono text-slate-600">{step.count?.toLocaleString('en-IN')}</p>
      <p className="text-[10px] font-bold font-mono text-slate-400">{step.conversion}%</p>
    </div>

    {step.dropOffRate > 0 && (
      <div className="mt-2.5 px-2 py-0.5 bg-rose-50 border border-rose-100 rounded text-[9px] font-black text-rose-500 font-mono">
        Drop-off {step.dropOffRate}%
      </div>
    )}

    {!isLast && (
      <div className="hidden md:block absolute top-5 -right-4 w-8 h-[1px] bg-slate-200 z-0" />
    )}
  </div>
);

export default UserIntelligenceDashboard;