import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Store, Gift, IndianRupee, AlertCircle, Info, 
  ChevronDown, Plus, Bell, Search, Download, RefreshCw, 
  Loader2
} from 'lucide-react';
import { adminClient, buildAuthHeaders } from '../../lib/api.js';

const Dashboard = ({ token }) => {
  // --- Core State Variables ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchPhone, setSearchPhone] = useState("");
  
  const [metrics, setMetrics] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    subscribedMerchants: 0,
    revenue: 0,
    inactiveMerchants: 0,
    trends: { total: "+0%", active: "+0%", sub: "+0%", rev: "+0%", inactive: "↓0%" }
  });
  
  const [funnelData, setFunnelData] = useState({
    registered: 0,
    loggedIn: 0,
    shopVerified: 0,
    subTaken: 0
  });

  const [problemInsights, setProblemInsights] = useState({
    loggedInInactive: 0,
    verificationLeft: 0,
    noOffersCreated: 0
  });

  const [liveActivities, setLiveActivities] = useState([]);
  const [systemLoad, setSystemLoad] = useState({ reqPerSec: 0, concurrent: 0, serverLoad: 0, memory: 0, history: [] });
  const [systemStatus, setSystemStatus] = useState({ server: "Operational", database: "Operational", api: "Operational", payment: "Operational" });
  const [topCategory, setTopCategory] = useState("Loading...");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Fetch Core Analytical Performance Aggregations ---
  const fetchDashboardData = async () => {
    try {
      setError(null);

      // Execute dashboard query channels simultaneously to eliminate network request chaining bottlenecks
      const [analyticsRes, activitiesRes, loadRes] = await Promise.all([
        adminClient.get("/dashboard/analytics-summary", { headers }),
        adminClient.get("/dashboard/live-activities", { headers }),
        adminClient.get("/dashboard/system-load", { headers })
      ]);

     

      if (analyticsRes.data.success) {
        const { summary, journeyFunnel, problems, insights } = analyticsRes.data.data;
        setMetrics(summary);
        setFunnelData(journeyFunnel);
        setProblemInsights(problems);
        setTopCategory(insights.topCategory || "Food & Beverages");
      }

      if (activitiesRes.data.success) {
        setLiveActivities(activitiesRes.data.activities || []);
      }

      if (loadRes.data.success) {
        setSystemLoad(loadRes.data.loadMetrics);
        setSystemStatus(loadRes.data.statusMap);
      }

    } catch (err) {
      console.error("Dashboard Data Synchronization Failure:", err);
      setError("Failed to stream real-time workspace analytics. Please verify your admin connection payload authorization.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Establish a background pooling intervals strategy to keep layout counters perfectly fresh
    const analyticsInterval = setInterval(fetchDashboardData, 30000); // 30 Seconds Refresh
    return () => clearInterval(analyticsInterval);
  }, []);

  // --- Keyboard Shortcut handler (Ctrl + K Focus) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('merchantSearchInput')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Export Document Generator Triggers ---
  const handleExportCSVReport = async () => {
    try {
      const response = await adminClient.get("/dashboard/export-report", { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BachatBazarr_PlatformReport_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export compiled system analytics file sheets layout structure.");
    }
  };

  // --- Interactive Funnel Math Layout Properties ---
  const calculatedFunnelDropOffs = useMemo(() => {
    const computePercentageDrop = (current, previous) => {
      if (!previous || previous === 0) return "0 (0%)";
      const dropCount = previous - current;
      const dropPercent = ((dropCount / previous) * 100).toFixed(1);
      return `${dropCount.toLocaleString('en-IN')} (${dropPercent}%)`;
    };

    return {
      loggedInDrop: computePercentageDrop(funnelData.loggedIn, funnelData.registered),
      verifiedDrop: computePercentageDrop(funnelData.shopVerified, funnelData.loggedIn),
      subDrop: computePercentageDrop(funnelData.subTaken, funnelData.shopVerified)
    };
  }, [funnelData]);

  // Handle dynamic text lookup redirects matching string nodes
  const handleSearchRedirect = (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    window.location.href = `/admin/merchants?search=${encodeURIComponent(searchPhone.trim())}`;
  };

  if (loading && metrics.totalMerchants === 0) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-indigo-600">
        <Loader2 className="animate-spin mb-3" size={40} />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Loading Control Deck Variables...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 min-h-screen font-sans text-slate-700 animate-in fade-in duration-300">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 gap-4">
        <form onSubmit={handleSearchRedirect} className="relative w-full xl:w-96 group">
          <Search className="absolute left-3 top-2.5 text-slate-400 size-5 group-focus-within:text-blue-500 transition-colors" />
          <input 
            id="merchantSearchInput"
            type="text" 
            placeholder="Search merchant by phone number..." 
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="w-full pl-10 pr-24 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
          <kbd className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border shadow-inner pointer-events-none select-none">Ctrl + K</kbd>
        </form>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => { setLoading(true); fetchDashboardData(); }} 
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-lg shadow-sm hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Live Engine Tickers"
          >
            <RefreshCw size={16} />
          </button>
          
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 shadow-sm">
            <span>Live Sync window tracking active</span>
          </div>

          <button 
            onClick={handleExportCSVReport}
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer shadow-sm text-slate-700 transition"
          >
            <Download size={16} /> Export Report
          </button>

          <div className="relative p-2 bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm hover:text-slate-800 transition cursor-pointer">
            <Bell size={16} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-pulse">3</span>
          </div>

          <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-black leading-tight text-slate-900">Owner Terminal</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</p>
            </div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 shadow-inner" alt="Admin Account Profile Image" />
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* --- TOP METRICS CARDS LAYER --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Merchants', val: metrics.totalMerchants.toLocaleString('en-IN'), trend: metrics.trends.total, color: 'text-blue-600', icon: <Users size={18}/>, bg: 'bg-blue-50', lineClass: 'border-blue-400' },
          { label: 'Active Merchants', val: metrics.activeMerchants.toLocaleString('en-IN'), trend: metrics.trends.active, color: 'text-emerald-600', icon: <Store size={18}/>, bg: 'bg-emerald-50', lineClass: 'border-emerald-400' },
          { label: 'Subscribed Merchants', val: metrics.subscribedMerchants.toLocaleString('en-IN'), trend: metrics.trends.sub, color: 'text-purple-600', icon: <Gift size={18}/>, bg: 'bg-purple-50', lineClass: 'border-purple-400' },
          { label: 'Revenue (Merchants)', val: `₹${metrics.revenue.toLocaleString('en-IN')}`, trend: metrics.trends.rev, color: 'text-orange-600', icon: <IndianRupee size={18}/>, bg: 'bg-orange-50', lineClass: 'border-orange-400' },
          { label: 'Inactive Merchants', val: metrics.inactiveMerchants.toLocaleString('en-IN'), trend: metrics.trends.inactive, color: 'text-rose-600', icon: <Users size={18}/>, bg: 'bg-rose-50', lineClass: 'border-rose-400' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`${card.bg} ${card.color} p-2.5 rounded-xl border border-transparent shadow-sm`}>{card.icon}</div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1.5">{card.label}</p>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">{card.val}</span>
                  <span className={`text-[10px] font-black tracking-wide ${card.trend.includes('↓') || card.trend.includes('-') ? 'text-rose-600' : card.color}`}>{card.trend}</span>
                </div>
              </div>
            </div>
            <div className="h-6 w-full bg-slate-50/50 rounded mt-3 flex items-end overflow-hidden border border-slate-100/60 shadow-inner">
               <div className={`w-full h-[40%] border-b-2 ${card.lineClass} border-dashed opacity-50`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MIDDLE ROW: FUNNEL & INSIGHTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Merchant Journey Funnel */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase flex items-center gap-2">Merchant Journey Funnel <Info size={14} className="text-slate-300"/></h3>
          </div>
          <div className="flex justify-between relative px-2">
            {[
              { label: 'Registered', val: funnelData.registered.toLocaleString('en-IN'), drop: calculatedFunnelDropOffs.loggedInDrop },
              { label: 'Logged In', val: funnelData.loggedIn.toLocaleString('en-IN'), drop: calculatedFunnelDropOffs.verifiedDrop },
              { label: 'Shop Verified', val: funnelData.shopVerified.toLocaleString('en-IN'), drop: calculatedFunnelDropOffs.subDrop },
              { label: 'Sub Taken', val: funnelData.subTaken.toLocaleString('en-IN'), drop: 'End of Journey Node' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center z-10 w-1/4">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-2 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tight truncate w-full px-0.5">{step.label}</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{step.val}</p>
                {i < 3 ? (
                  <>
                    <p className="text-[9px] font-black text-rose-500 mt-3 uppercase tracking-tighter">Drop-off</p>
                    <p className="text-[9px] font-black text-rose-600 truncate w-full bg-rose-50/50 px-1 py-0.5 rounded border border-rose-100/40">{step.drop}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[9px] font-black text-emerald-500 mt-3 uppercase tracking-tighter">Conversion</p>
                    <p className="text-[9px] font-black text-emerald-600 truncate w-full bg-emerald-50/50 px-1 py-0.5 rounded border border-emerald-100/40">Success Step</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Drop-off & Problem Insights */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">Operational Risk Metrics</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Logged in but remain inactive', val: problemInsights.loggedInInactive.toLocaleString('en-IN'), color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { label: 'Shop registration step left', val: problemInsights.verificationLeft.toLocaleString('en-IN'), color: 'text-rose-600 bg-rose-50 border-rose-100' },
              { label: 'Zero running offers created', val: problemInsights.noOffersCreated.toLocaleString('en-IN'), color: 'text-purple-600 bg-purple-50 border-purple-100' },
            ].map((item, i) => (
              <div key={i} className={`p-3 rounded-xl border flex flex-col justify-between shadow-inner ${item.color}`}>
                <div className="mb-2"><AlertCircle size={14} className="opacity-70" /></div>
                <div>
                  <p className="text-lg font-black tracking-tight">{item.val}</p>
                  <p className="text-[10px] leading-tight font-semibold mt-1 opacity-80">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Channel */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">Live Platform Actions</h3>
          </div>
          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[160px] pr-1">
            {liveActivities.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Listening for system event webhooks...</p>
            ) : liveActivities.map((activity, i) => (
              <div key={i} className="flex gap-2.5 text-xs border-b border-slate-50 pb-2 last:border-0 last:pb-0 animate-in fade-in slide-in-from-bottom-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activity.type === 'register' ? 'bg-blue-500' : activity.type === 'offer' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate leading-snug">{activity.text}</p>
                  <p className="text-slate-400 text-[10px] truncate">{activity.meta}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap italic">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- LOWER ROW: SYSTEM HEALTH DIAGNOSTICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* System Health Section */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
             <div className="relative size-32 mb-4">
                <div className="absolute inset-0 rounded-full border-[10px] border-emerald-500 border-t-transparent flex items-center justify-center rotate-45">
                    <div className="text-center -rotate-45">
                        <p className="text-2xl font-black text-slate-800">99.2%</p>
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-0.5">Healthy</p>
                    </div>
                </div>
             </div>
             <p className="font-extrabold text-slate-900 text-sm tracking-wide uppercase mt-1">Telemetry Framework Health</p>
             <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-4 mt-3 border-t border-slate-50 pt-3">
                <div className="flex justify-between text-xs font-semibold"><span className="text-slate-400">User App Gateway</span> <span className="text-emerald-600">Active</span></div>
                <div className="flex justify-between text-xs font-semibold"><span className="text-slate-400">Merchant API Server</span> <span className="text-emerald-600">Active</span></div>
             </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
             <div className="flex justify-between items-center mb-3">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">Core Server Computing Load</h3>
                <RefreshCw size={14} className="text-slate-300 animate-spin" style={{ animationDuration: '6s' }}/>
             </div>
             <div className="grid grid-cols-4 gap-1.5 text-center mb-4">
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Req/Sec</p><p className="font-black text-slate-800 text-xs mt-0.5">{systemLoad.reqPerSec}</p></div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Concurrent</p><p className="font-black text-slate-800 text-xs mt-0.5">{systemLoad.concurrent}</p></div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">CPU Run</p><p className={`font-black text-xs mt-0.5 ${systemLoad.serverLoad > 80 ? 'text-rose-600' : 'text-orange-500'}`}>{systemLoad.serverLoad}%</p></div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">RAM Array</p><p className="font-black text-slate-800 text-xs mt-0.5">{systemLoad.memory}%</p></div>
             </div>
             <div className="h-24 bg-slate-50/70 rounded-xl flex items-end p-2.5 gap-1.5 border border-slate-100 shadow-inner">
                {systemLoad.history.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-300 italic">Compiling graph streams...</div>
                ) : systemLoad.history.map((h, i) => (
                  <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-md transition-all duration-500 ${h > 75 ? 'bg-orange-400' : 'bg-indigo-500/80'}`}></div>
                ))}
             </div>
          </div>
        </div>

        {/* Dynamic Contextual Insights Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-blue-900 to-blue-950 text-white p-5 rounded-xl shadow-xl relative overflow-hidden flex flex-col justify-between border border-blue-950">
            <div className="relative z-10">
              <div className="bg-white/10 border border-white/10 w-8 h-8 rounded-full flex items-center justify-center mb-3 shadow-md">
                <Info size={15} className="text-blue-400" />
              </div>
              <h3 className="font-black text-base tracking-tight mb-1">Dynamic Conversion Insight</h3>
              <p className="text-xs text-blue-200/90 leading-relaxed font-medium mb-4">
                Redemption checks indicate peak transactional visibility scaling happens between <span className="text-white font-bold bg-white/10 px-1 py-0.5 rounded">6:00 PM - 9:00 PM</span>. Allocating calendar caps onto holiday frames drops attrition levels by 21.4%.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
             <h3 className="font-extrabold text-slate-900 text-xs tracking-wide uppercase mb-3.5 border-b border-slate-50 pb-2">Platform Microservice Matrix</h3>
             <div className="space-y-3">
                {[
                  { name: 'Core API Router cluster', status: systemStatus.server },
                  { name: 'MongoDB Cloud Primary Replica', status: systemStatus.database },
                  { name: 'Merchant Asset Delivery Network', status: systemStatus.api },
                  { name: 'Secure Payment Ledger Gateway', status: systemStatus.payment },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 font-medium">{s.name}</span>
                    <span className={`flex items-center gap-1.5 ${s.status === 'Operational' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {s.status} <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'Operational' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></div>
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* --- MICRO INSIGHTS FOOTER SUMMARY BAR --- */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: 'Highest Platform Attrition Step', val: 'Verification Funnel Block', icon: '🚨' },
          { label: 'Active Merchant Deployment Cap', val: '74.6% Live Campaigns', icon: '🎯' },
          { label: 'Peak Hourly Conversion Acceleration', val: '6:00 PM - 9:00 PM Window', icon: '⏱️' },
          { label: 'Top Transacting Inventory Category', val: topCategory, icon: '⚡' },
          { label: 'Sign-up Conversion Deadlock Range', val: '45% Delayed Campaign Deployment', icon: '📈' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
            <span className="text-xl flex-shrink-0 bg-slate-50 p-1.5 rounded-lg border border-slate-100/50 shadow-inner">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-[9px] leading-none text-slate-400 font-black uppercase tracking-wider mb-1 truncate">{item.label}</p>
              <p className="text-xs font-black text-slate-800 truncate leading-snug">{item.val}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;