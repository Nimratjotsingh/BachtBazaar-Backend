import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Bell, FileText, Plus, Users, Store, Gift, CreditCard, 
  UsersRound, Info, AlertTriangle, ChevronRight, RefreshCw,
  Layout, ShieldCheck, UserCheck, CheckCircle, Smartphone, MousePointer2,
  Zap, Trophy, Flame, Loader2, AlertCircle
} from 'lucide-react';
import { accountClient, buildAuthHeaders } from '../../../lib/api';

const MerchantStats = ({ token }) => {
  // --- State Configuration Management ---
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("Never");
  const [searchPhone, setSearchPhone] = useState("");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Fetch Analytical Pipeline Pipeline Aggregations ---
  const fetchMerchantIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await accountClient.get("/analytics/merchant-intelligence", { headers });

      console.log(res)
      
      if (res.data.success) {
        setStatsData(res.data.data);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error("Failed to compile dashboard metrics:", err);
      setError("Failed to synchronize merchant intelligence charts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantIntelligence();
  }, []);

  const handlePhoneSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    // Redirects directly to the filter parameter criteria inside your main page layout list grid
    window.location.search = `?search=${encodeURIComponent(searchPhone.trim())}`;
  };

  if (loading && !statsData) {
    return (
      <div className="w-full bg-[#F8FAFC] min-h-[400px] flex flex-col items-center justify-center p-12 text-indigo-600">
        <Loader2 className="animate-spin mb-3 w-8 h-8" />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Compiling Analytics Architecture...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] p-1 space-y-6 font-sans text-slate-800">
      
      {/* --- TOP CONTROL HEADER BAR --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <form onSubmit={handlePhoneSearchSubmit} className="relative w-full md:w-1/3 group">
          <Search className="absolute left-3 top-2.5 text-slate-400 size-4" />
          <input 
            type="text" 
            placeholder="Search merchant by phone number..." 
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium transition-all"
          />
          <button type="submit" className="hidden" />
        </form>

        {/* <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer">
              <FileText size={16} /> Export Report
            </button>
            <button onClick={() => window.location.href = "/admin/offerOfferType"} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition cursor-pointer">
              <Plus size={18} /> Configure Categories
            </button>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 hidden sm:flex">
            <div className="text-right">
              <p className="text-sm font-black leading-none text-slate-900">Owner</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Super Admin</p>
            </div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-9 h-9 rounded-full bg-slate-100 border shadow-sm" alt="" />
          </div>
        </div> */}
      </header>

      {/* --- DASHBOARD SUB-HEADER BREADCRUMBS --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Merchant Intelligence & Analysis</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Complete overview of merchant journey, engagement, performance and issues.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
          <span className="p-1 bg-slate-50 text-slate-400 rounded cursor-pointer hover:text-blue-600 transition" onClick={fetchMerchantIntelligence}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </span>
          <span className="font-mono text-[11px] text-slate-500">Sync frame (Live: {lastUpdated})</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* --- MASTER SUMMARY GRID WRAPPER --- */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN METRICS STACK */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* Top 5 Central Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            <MetricCard title="Total Merchants" val={statsData?.summary?.total} trend={statsData?.trends?.total} icon={<Users />} color="blue" />
            <MetricCard title="Active Partners" val={statsData?.summary?.active} trend={statsData?.trends?.active} icon={<Store />} color="green" />
            <MetricCard title="Verified Shops" val={statsData?.summary?.verified} trend={statsData?.trends?.verified} icon={<Gift />} color="purple" />
            <MetricCard title="Total Backlog Pool" val={statsData?.summary?.pending} trend={statsData?.trends?.pending} icon={<CreditCard />} color="orange" />
            <MetricCard title="Banned Restrictions" val={statsData?.summary?.banned} trend={statsData?.trends?.banned} icon={<UsersRound />} color="red" isNegative />
          </div>

          {/* Funnel Visualization Grid Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="flex justify-between mb-6">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">Merchant Registration Funnel <Info size={14} className="text-slate-300"/></h3>
                <button className="text-[10px] text-blue-600 font-black uppercase tracking-wider hover:underline cursor-pointer">Configuration metrics</button>
              </div>
              <div className="flex justify-between items-start gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {statsData?.funnel?.map((step, idx) => (
                  <FunnelStep 
                    key={idx}
                    label={step.stage} 
                    val={step.count} 
                    pct={idx > 0 ? `${step.conversion}%` : "100%"} 
                    drop={step.dropOffCount > 0 ? `${step.dropOffCount} (${step.dropOffRate}%)` : null}
                    icon={idx % 2 === 0 ? <Users size={13}/> : <UserCheck size={13}/>}
                    color={idx === 0 ? "bg-blue-600" : idx === 3 ? "bg-emerald-500" : "bg-indigo-500"} 
                  />
                ))}
              </div>
            </div>

            {/* Drop-off Problem Insight Boxes */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between mb-4">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Drop-off Snapshots</h3>
                <button className="text-[10px] text-blue-600 font-black uppercase tracking-wider hover:underline cursor-pointer">View All</button>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {statsData?.dropOffAnalysis?.map((item, idx) => (
                  <InsightBox key={idx} label={item.stage} val={item.count} color={idx > 2 ? "orange" : "red"} />
                ))}
              </div>
            </div>
          </div>

          {/* Lower Third Aggregations Blocks Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Category Split progress weight lines */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-4">Top Business Verticals</h3>
              <div className="space-y-3.5 pt-1">
                {statsData?.categories?.map((cat, i) => (
                  <div key={i} className="space-y-1 text-[11px] font-bold">
                    <div className="flex justify-between text-slate-600">
                      <span className="truncate max-w-[130px]">{cat.name}</span>
                      <span className="font-mono text-slate-400 font-medium">{cat.share}% <span className="text-slate-800 font-extrabold pl-1">{cat.count}</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${cat.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Verification Completion parameters metrics ratios */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-4">Verification Audit Mix</h3>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Unverified</p>
                  <p className="text-base font-black font-mono text-slate-800 mt-1">{statsData?.verificationMix?.unverified} <span className="text-[10px] font-bold text-blue-500 block sm:inline font-sans">{statsData?.verificationMix?.unverifiedPct}%</span></p>
                </div>
                <div className="bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Verified Account</p>
                  <p className="text-base font-black font-mono text-slate-800 mt-1">{statsData?.verificationMix?.verified} <span className="text-[10px] font-bold text-emerald-500 block sm:inline font-sans">{statsData?.verificationMix?.verifiedPct}%</span></p>
                </div>
              </div>
            </div>

            {/* Feature Usage rate lists blocks */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-3 flex justify-between items-center">Feature Usage <span className="text-blue-600 text-[10px] cursor-pointer hover:underline">View All</span></h3>
              <div className="space-y-3 pt-1">
                <FeatureRow label="Banners Configured" val={statsData?.features?.hasBanner} pct={statsData?.features?.hasBannerPct} color="bg-emerald-500" />
                <FeatureRow label="Logo Brand Upload" val={statsData?.features?.hasLogo} pct={statsData?.features?.hasLogoPct} color="bg-indigo-500" />
                <FeatureRow label="Linked Shops" val={statsData?.features?.hasShop} pct={statsData?.features?.hasShopPct} color="bg-cyan-500" />
              </div>
            </div>

            {/* App updates and alerts trackers */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">Critical Operations Flags</h3>
              <div className="space-y-2 flex-1 flex flex-col justify-around">
                <AlertItem label="High document validation rejections index" type="Critical" />
                <AlertItem label="Unverified merchant accounts backlog items" type="Warning" />
                <button onClick={() => window.location.reload()} className="w-full mt-1 py-2 border border-blue-200 hover:bg-blue-50/40 rounded-xl text-[10px] text-blue-600 font-black uppercase tracking-wider transition cursor-pointer">Force Diagnostics Re-Run</button>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR WIDGET PANELS COLUMNS --- */}
        <div className="w-full lg:w-80 space-y-6 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
            
            {/* Active vs Banned Ring Progress Donut parameters layout mapping */}
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Active Distribution Ratio</h4>
              <div className="flex justify-center py-2 relative">
                <div className="size-32 rounded-full border-[14px] border-red-500 border-l-green-500 flex flex-col items-center justify-center bg-white shadow-inner">
                  <span className="text-xl font-black font-mono text-slate-800">{statsData?.summary?.total?.toLocaleString('en-IN')}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Total Registered</span>
                </div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1 mt-3">
                <div className="flex items-center gap-1.5"><div className="size-2 bg-green-500 rounded-full"></div> Active: {statsData?.summary?.active}</div>
                <div className="flex items-center gap-1.5"><div className="size-2 bg-red-500 rounded-full"></div> Banned: {statsData?.summary?.banned}</div>
              </div>
            </div>

            {/* Inactivity parameters analytics checklist */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Dormancy Snapshots</h4>
              <div className="space-y-2.5 text-[11px] font-bold">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <span className="text-slate-500 font-semibold">Total Pending Verification</span>
                  <span className="font-mono text-slate-800 font-black">{statsData?.summary?.pending}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <span className="text-slate-500 font-semibold">Total Restricted Blacklist</span>
                  <span className="font-mono text-slate-800 font-black">{statsData?.summary?.banned}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

/* --- SUBCOMPONENTS STRUCTURAL MAPPING FOR CLEAN RENDER CYCLES --- */

const MetricCard = ({ title, val, trend, icon, color, isNegative }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100/60',
    green: 'bg-green-50 text-green-600 border-green-100/60',
    purple: 'bg-purple-50 text-purple-600 border-purple-100/60',
    orange: 'bg-orange-50 text-orange-600 border-orange-100/60',
    red: 'bg-red-50 text-red-600 border-red-100/60'
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start gap-2">
        <div className={`p-2 rounded-lg border ${colors[color]}`}>{icon}</div>
        <div className="text-right min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate" title={title}>{title}</p>
          <div className="flex items-center justify-end gap-1 mt-1.5 flex-wrap">
            <span className="text-base font-black font-mono text-slate-800">{val?.toLocaleString('en-IN') || 0}</span>
            <span className={`text-[9px] font-black ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>{trend || "0%"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FunnelStep = ({ label, val, icon, color, drop, pct }) => (
  <div className="flex flex-col items-center flex-1 relative group min-w-[80px]">
    <div className={`size-8 rounded-xl ${color} text-white flex items-center justify-center mb-2 z-10 shadow-sm`}>{icon}</div>
    <p className="text-[9px] font-black text-slate-400 uppercase text-center leading-tight h-5 mb-1 truncate w-full" title={label}>{label}</p>
    <p className="text-xs font-black font-mono text-slate-800">{val?.toLocaleString('en-IN') || 0}</p>
    {pct && <p className="text-[10px] text-emerald-500 font-black font-mono mt-0.5">{pct}</p>}
    {drop && (
      <div className="mt-3 text-center p-1 bg-slate-50 border border-slate-100 rounded-md w-full">
        <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider leading-none mb-0.5">Exit</p>
        <p className="text-[9px] text-rose-500 font-bold tracking-tighter whitespace-nowrap">{drop}</p>
      </div>
    )}
  </div>
);

const InsightBox = ({ label, val, color }) => (
  <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col justify-between">
    <AlertTriangle size={12} className={color === 'red' ? 'text-rose-400' : 'text-amber-400'} />
    <p className="text-base font-black font-mono text-slate-800 mt-2">{val?.toLocaleString('en-IN') || 0}</p>
    <p className="text-[9px] leading-tight text-slate-400 font-bold uppercase tracking-wide mt-1 line-clamp-2" title={label}>{label}</p>
  </div>
);

const FeatureRow = ({ label, val, pct, color }) => (
  <div className="flex items-center justify-between text-[11px] font-bold gap-2">
    <div className="text-slate-500 font-semibold truncate max-w-[110px]">{label}</div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-mono text-slate-800 font-black">{val?.toLocaleString('en-IN') || 0}</span>
      <div className="w-10 h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden hidden sm:block">
        <div className={`h-full ${color}`} style={{width: `${pct}%`}}></div>
      </div>
      <span className="font-mono text-slate-400 text-[10px] w-8 text-right">{pct}%</span>
    </div>
  </div>
);

const AlertItem = ({ label, type }) => (
  <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-50/80 pb-2 last:border-0 last:pb-0 gap-3">
    <div className="flex items-center gap-1.5 min-w-0">
      <AlertTriangle size={12} className={type === 'Critical' ? 'text-rose-400' : 'text-amber-400'} strokeWidth={2.5} className="shrink-0" />
      <span className="font-semibold text-slate-600 truncate" title={label}>{label}</span>
    </div>
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 border ${type === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{type}</span>
  </div>
);

export default MerchantStats;