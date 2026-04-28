import React from 'react';
import { 
  Search, Bell, FileText, Plus, Users, Store, Gift, CreditCard, 
  UsersRound, Info, AlertTriangle, ChevronRight, Phone, RefreshCw,
  Layout, ShieldCheck, UserCheck, CheckCircle, Smartphone, MousePointer2,
  Image as ImageIcon, Zap, Trophy, Flame
} from 'lucide-react';

const MerchantStats = () => {
  return (
    <div className="bg-[#F8FAFC] min-h-screen p-6 font-sans text-slate-800">
      {/* --- TOP HEADER --- */}
      <header className="flex justify-between items-center mb-8">
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-2.5 text-slate-400 size-4" />
          <input 
            type="text" 
            placeholder="Search merchant by phone number..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
          />
          <kbd className="absolute right-3 top-2.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border">Ctrl + K</kbd>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative mr-2">
            <Bell className="text-slate-500 size-5 cursor-pointer" />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">18</span>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium">
            <FileText size={16} /> Export Report
          </button>
          <button className="flex items-center gap-2 bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm">
            <Plus size={18} /> Create New
          </button>
          <div className="flex items-center gap-3 pl-4">
            <div className="text-right">
              <p className="text-sm font-bold leading-none">Owner</p>
              <p className="text-[10px] text-slate-400">Super Admin</p>
            </div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-9 h-9 rounded-full bg-slate-200" alt="Avatar" />
          </div>
        </div>
      </header>

      {/* --- PAGE TITLE & DATE --- */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Merchant Intelligence & Analysis</h1>
          <p className="text-xs text-slate-500 mt-1">Complete overview of merchant journey, engagement, performance and issues.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-600">
          <span className="bg-slate-100 p-1 rounded"><RefreshCw size={12}/></span>
          18 May, 2024 - 18 Jun, 2024
          <ChevronRight size={14} className="rotate-90" />
        </div>
      </div>

      <div className="flex gap-6">
        {/* LEFT COLUMN (MAIN CONTENT) */}
        <div className="flex-1 space-y-6">
          
          {/* Top 5 Metrics Cards */}
          <div className="grid grid-cols-5 gap-4">
            <MetricCard title="Total Merchants" val="24,568" trend="+ 12.4%" icon={<Users className="text-blue-600"/>} color="blue" />
            <MetricCard title="Active Merchants" val="8,765" trend="+ 8.7%" icon={<Store className="text-green-600"/>} color="green" />
            <MetricCard title="Subscribed Merchants" val="6,432" trend="+ 10.3%" icon={<Gift className="text-purple-600"/>} color="purple" />
            <MetricCard title="Revenue from Merchants" val="₹12,45,678" trend="+ 18.6%" icon={<CreditCard className="text-orange-600"/>} color="orange" />
            <MetricCard title="Inactive Merchants" val="15,803" trend="↓ 16.1%" icon={<UsersRound className="text-red-600"/>} color="red" />
          </div>

          {/* Funnel Section & Problem Insights */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-7 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2">Merchant Journey Funnel <Info size={14} className="text-slate-300"/></h3>
                <button className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">View Full Funnel</button>
              </div>
              <div className="flex justify-between items-start">
                <FunnelStep label="Registered" val="24,568" icon={<Users size={14}/>} color="bg-blue-500" />
                <FunnelStep label="Logged In" val="18,765" icon={<Smartphone size={14}/>} color="bg-blue-400" drop="5,803 (23.6%)" pct="76.4%" />
                <FunnelStep label="Personal Verified" val="14,324" icon={<UserCheck size={14}/>} color="bg-green-500" drop="4,441 (23.7%)" pct="76.3%" />
                <FunnelStep label="Shop Verified" val="11,278" icon={<ShieldCheck size={14}/>} color="bg-orange-400" drop="3,046 (21.4%)" pct="78.6%" />
                <FunnelStep label="Profile Completed" val="8,965" icon={<Layout size={14}/>} color="bg-purple-500" drop="2,313 (20.5%)" pct="79.5%" />
                <FunnelStep label="Subscription Taken" val="6,432" icon={<CreditCard size={14}/>} color="bg-red-400" drop="2,533 (28.2%)" pct="71.8%" />
                <FunnelStep label="First Offer Created" val="5,231" icon={<Zap size={14}/>} color="bg-emerald-400" drop="1,201 (18.7%)" pct="81.3%" />
                <FunnelStep label="Active Usage" val="5,231" icon={<CheckCircle size={14}/>} color="bg-green-400" />
              </div>
            </div>

            <div className="col-span-5 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between mb-4">
                <h3 className="text-sm font-bold">Drop-off & Problem Insights</h3>
                <button className="text-[11px] text-blue-600 font-bold uppercase">View All</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <InsightBox label="Logged in but inactive" val="9,456" />
                <InsightBox label="Personal verification left" val="4,441" />
                <InsightBox label="Shop verification left" val="3,046" />
                <InsightBox label="No offers created" val="6,523" />
                <InsightBox label="No offers in last 7 days" val="5,231" color="orange" />
                <InsightBox label="No daily reward offers" val="7,831" color="orange" />
              </div>
            </div>
          </div>

          {/* Third Row: Profile Distribution / Sub Analytics / Categories / Usage */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-4">Profile Completion Distribution</h3>
              <div className="flex items-center gap-4">
                <div className="size-20 rounded-full border-[10px] border-blue-500 border-t-blue-100 border-r-blue-300 flex items-center justify-center text-[10px] font-bold">24,568<br/>Total</div>
                <div className="space-y-1 text-[9px] font-medium text-slate-500">
                  <div className="flex items-center gap-1"><div className="size-1.5 bg-blue-400 rounded-full"></div> 0-25% : 4,289 (17.5%)</div>
                  <div className="flex items-center gap-1"><div className="size-1.5 bg-blue-600 rounded-full"></div> 25-50% : 6,123 (24.9%)</div>
                  <div className="flex items-center gap-1"><div className="size-1.5 bg-green-500 rounded-full"></div> 50-75% : 7,456 (30.4%)</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-4">Subscription Analytics</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded text-center">
                  <p className="text-[10px] text-slate-400">Not Subscribed</p>
                  <p className="text-sm font-bold">2,533 <span className="text-[9px] text-blue-500">23.6%</span></p>
                </div>
                <div className="bg-slate-50 p-2 rounded text-center">
                  <p className="text-[10px] text-slate-400">Subscribed</p>
                  <p className="text-sm font-bold">6,432 <span className="text-[9px] text-green-500">52.4%</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-4">Top Redemption Offers</h3>
              <div className="space-y-2">
                 <div className="flex justify-between text-[10px] border-b pb-1">
                   <span className="font-bold">Category</span><span className="font-bold">Redemptions</span>
                 </div>
                 <div className="flex justify-between text-[10px] items-center">
                   <span className="flex items-center gap-1"><Store size={10} /> Food & Bev</span>
                   <div className="flex items-center gap-2">12,456 <div className="w-8 h-1 bg-blue-500 rounded"></div></div>
                 </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-2">Avg. App Usage Time</h3>
              <div className="h-20 bg-slate-50 rounded-lg flex items-end justify-between px-2 py-1">
                {[40, 60, 45, 80, 55, 70].map((h, i) => <div key={i} style={{height: `${h}%`}} className="w-2 bg-purple-400 rounded-t-sm"></div>)}
              </div>
              <p className="text-[10px] text-center mt-2 text-slate-400">02 Jun - 28.4 Minutes</p>
            </div>
          </div>

          {/* Bottom Grid: Feature Usage / Key Features / Banner / Alerts */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-3 flex justify-between">Feature Usage <span className="text-blue-600 text-[10px]">View All</span></h3>
              <div className="space-y-3">
                <FeatureRow label="Offer Creation" val="6,231" pct="85.6%" color="bg-emerald-500" />
                <FeatureRow label="Daily Rewards" val="5,432" pct="74.6%" color="bg-emerald-500" />
                <FeatureRow label="Main Offers" val="4,987" pct="68.4%" color="bg-emerald-400" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-3">Merchants Not Using Features</h3>
              <div className="space-y-3">
                <FeatureIssueRow label="Not Using Progress Bar" val="5,342" pct="21.7%" />
                <FeatureIssueRow label="Not Creating Progress Bar" val="7,652" pct="31.1%" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-3">Banner & Update Tracker</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-red-50 p-2 rounded">
                  <div className="text-[10px]"><p className="font-bold">Not Uploading Banner</p><p className="text-red-500">4,128 (16.8%)</p></div>
                  <button className="text-[9px] bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">Remind</button>
                </div>
                <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
                  <div className="text-[10px]"><p className="font-bold">Not Updated App</p><p className="text-purple-500">3,229 (13.2%)</p></div>
                  <button className="text-[9px] bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">Popup</button>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-[13px] font-bold mb-3">Critical Alerts</h3>
              <div className="space-y-2">
                <AlertItem label="High drop-off after shop verification" type="Critical" />
                <AlertItem label="Large number of merchants inactive" type="Warning" />
                <AlertItem label="Merchants not creating offers" type="Warning" />
                <button className="w-full mt-2 py-1.5 border border-blue-200 rounded text-[10px] text-blue-600 font-bold">View All Alerts</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (QUICK PROFILE & STATS) */}
        <div className="w-80 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Merchant Quick Profile</h3>
              <span className="text-slate-400">×</span>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter merchant phone number" className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-xs" />
              <button className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold">Search</button>
            </div>
            
            <div className="mt-6">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3">Quick Stats</h4>
              <div className="space-y-3">
                <SideStat label="Daily Open Merchants" val="5,231" pct="21.3%" color="bg-green-500" />
                <SideStat label="Avg. App Usage Time" val="28.4 min" color="bg-blue-500" />
                <SideStat label="Merchants Not Opening App" val="15,803" pct="64.4%" color="bg-red-500" />
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3">Active vs Inactive</h4>
              <div className="flex justify-center py-4 relative">
                <div className="size-32 rounded-full border-[14px] border-red-500 border-l-green-500 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">24,568</span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
              </div>
              <div className="flex justify-between text-[11px] px-2">
                <div className="flex items-center gap-1"><div className="size-2 bg-green-500 rounded-full"></div> Active: 8,765</div>
                <div className="flex items-center gap-1"><div className="size-2 bg-red-500 rounded-full"></div> Inactive: 15,803</div>
              </div>
            </div>

            <div className="mt-8 border-t pt-6">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3">Uninstall & Churn</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] bg-slate-50 p-2 rounded">
                  <span>Logged in then Uninstalled</span>
                  <span className="font-bold">2,876 <span className="text-blue-500 font-normal">(11.7%)</span></span>
                </div>
                <div className="flex justify-between items-center text-[11px] bg-slate-50 p-2 rounded">
                  <span>Fully Verified but Inactive</span>
                  <span className="font-bold">1,987 <span className="text-blue-500 font-normal">(8.1%)</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- SUBCOMPONENTS FOR CLEANER CODE --- */

const MetricCard = ({ title, val, trend, icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{title}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-base font-bold">{val}</span>
            <span className={`text-[9px] font-bold ${trend.includes('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
          </div>
        </div>
      </div>
      <div className="h-6 w-full opacity-30 mt-1">
         <svg viewBox="0 0 100 20" className="w-full h-full"><path d="M0 15 Q 20 5, 40 15 T 80 10 T 100 15" fill="none" stroke="currentColor" strokeWidth="2" className={colors[color].split(' ')[1]}/></svg>
      </div>
    </div>
  );
};

const FunnelStep = ({ label, val, icon, color, drop, pct }) => (
  <div className="flex flex-col items-center flex-1 relative group">
    <div className={`size-8 rounded-full ${color} text-white flex items-center justify-center mb-2 z-10`}>{icon}</div>
    <p className="text-[9px] font-bold text-slate-400 uppercase text-center leading-tight h-5 mb-1">{label}</p>
    <p className="text-xs font-bold">{val}</p>
    {pct && <p className="text-[10px] text-green-500 font-bold mt-1">{pct}</p>}
    {drop && (
      <div className="mt-4 text-center">
        <p className="text-[8px] text-red-400 font-bold uppercase">Drop-off</p>
        <p className="text-[9px] text-red-500 font-bold whitespace-nowrap">{drop}</p>
      </div>
    )}
  </div>
);

const InsightBox = ({ label, val, color = 'red' }) => (
  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
    <AlertTriangle size={12} className={color === 'red' ? 'text-red-400' : 'text-orange-400'} />
    <p className="text-sm font-bold mt-1">{val}</p>
    <p className="text-[9px] leading-tight text-slate-500 font-medium">{label}</p>
  </div>
);

const FeatureRow = ({ label, val, pct, color }) => (
  <div className="flex items-center justify-between">
    <div className="text-[10px] text-slate-600">{label}</div>
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold">{val}</span>
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{width: pct}}></div>
      </div>
      <span className="text-[10px] font-bold text-slate-400 w-8">{pct}</span>
    </div>
  </div>
);

const FeatureIssueRow = ({ label, val, pct }) => (
  <div className="flex justify-between items-center text-[10px]">
    <div className="flex items-center gap-2">
      <div className="size-6 bg-blue-50 rounded flex items-center justify-center text-blue-400"><MousePointer2 size={10}/></div>
      <span className="font-medium text-slate-500">{label}</span>
    </div>
    <span className="font-bold">{val} <span className="text-red-400 font-normal">({pct})</span></span>
  </div>
);

const AlertItem = ({ label, type }) => (
  <div className="flex justify-between items-center text-[10px] border-b border-slate-50 pb-2 last:border-0">
    <div className="flex items-center gap-2">
      <AlertTriangle size={12} className={type === 'Critical' ? 'text-red-400' : 'text-orange-400'} />
      <span className="font-medium text-slate-600 line-clamp-1">{label}</span>
    </div>
    <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase ${type === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{type}</span>
  </div>
);

const SideStat = ({ label, val, pct, color }) => (
  <div className="flex items-center justify-between text-xs">
    <div className="flex items-center gap-2">
      <div className={`size-1.5 rounded-full ${color}`}></div>
      <span className="text-slate-500 text-[11px]">{label}</span>
    </div>
    <span className="font-bold text-[11px]">{val} {pct && <span className="text-slate-400 font-normal">({pct})</span>}</span>
  </div>
);

export default MerchantStats;