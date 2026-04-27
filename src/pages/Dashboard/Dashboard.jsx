import React from 'react';
import { 
  Users, Store, Gift, IndianRupee, AlertCircle, Info, 
  ChevronDown, Plus, Bell, Search, Download, RefreshCw 
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="flex-1 bg-slate-50 p-6 min-h-screen font-sans text-slate-700">
      
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400 size-5" />
          <input 
            type="text" 
            placeholder="Search merchant by phone number..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <kbd className="absolute right-3 top-2.5 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border">Ctrl + K</kbd>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium">
            <span className="text-slate-500">18 May, 2024 - 18 Jun, 2024</span>
            <ChevronDown size={16} />
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Download size={16} /> Export Report
          </button>
          <div className="relative">
            <Bell className="text-slate-500 cursor-pointer" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">18</span>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={18} /> Create New
          </button>
          <div className="flex items-center gap-3 ml-2">
            <div className="text-right">
              <p className="text-sm font-bold leading-tight">Owner</p>
              <p className="text-[10px] text-slate-400">Super Admin</p>
            </div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-10 h-10 rounded-full border border-slate-200" alt="Admin" />
          </div>
        </div>
      </header>

      {/* --- TOP METRICS CARDS --- */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Merchants', val: '24,568', trend: '+ 12.4%', color: 'text-blue-600', icon: <Users size={20}/>, bg: 'bg-blue-50' },
          { label: 'Active Merchants', val: '8,765', trend: '+ 8.7%', color: 'text-green-600', icon: <Store size={20}/>, bg: 'bg-green-50' },
          { label: 'Subscribed Merchants', val: '6,432', trend: '+ 10.3%', color: 'text-purple-600', icon: <Gift size={20}/>, bg: 'bg-purple-50' },
          { label: 'Revenue (Merchants)', val: '₹12,45,678', trend: '+ 18.6%', color: 'text-orange-600', icon: <IndianRupee size={20}/>, bg: 'bg-orange-50' },
          { label: 'Inactive Merchants', val: '15,803', trend: '↓ 16.1%', color: 'text-red-600', icon: <Users size={20}/>, bg: 'bg-red-50' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className={`${card.bg} ${card.color} p-2 rounded-lg`}>{card.icon}</div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-lg font-bold tracking-tight">{card.val}</span>
                  <span className={`text-[10px] font-bold ${card.color}`}>{card.trend}</span>
                </div>
              </div>
            </div>
            <div className="h-10 w-full bg-slate-50 rounded mt-2 opacity-50 flex items-end overflow-hidden">
               {/* Simplified Sparkline Placeholder */}
               <div className="w-full h-[60%] border-b-2 border-blue-400 border-dashed"></div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MIDDLE ROW: FUNNEL & INSIGHTS --- */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        
        {/* Merchant Journey Funnel */}
        <div className="col-span-5 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2">Merchant Journey Funnel <Info size={14} className="text-slate-300"/></h3>
            <button className="text-xs text-blue-600 font-semibold">View Full Funnel</button>
          </div>
          <div className="flex justify-between relative">
            {/* Visual connector line would go here */}
            {[
              { label: 'Registered', val: '24,568', drop: '5,803 (23.6%)' },
              { label: 'Logged In', val: '18,765', drop: '4,441 (23.7%)' },
              { label: 'Shop Verified', val: '11,278', drop: '3,046 (21.4%)' },
              { label: 'Sub Taken', val: '6,432', drop: '2,533 (28.2%)' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center z-10">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{step.label}</p>
                <p className="text-sm font-bold">{step.val}</p>
                <p className="text-[9px] text-red-500 mt-4">Drop-off</p>
                <p className="text-[9px] font-bold text-red-500">{step.drop}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Drop-off & Problem Insights */}
        <div className="col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Drop-off & Problem Insights</h3>
            <button className="text-xs text-blue-600 font-semibold">View All</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Logged in but inactive', val: '9,456', icon: <AlertCircle className="text-red-400" size={14}/> },
              { label: 'Shop verification left', val: '3,046', icon: <AlertCircle className="text-red-400" size={14}/> },
              { label: 'No offers created', val: '6,523', icon: <AlertCircle className="text-red-400" size={14}/> },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="mb-1">{item.icon}</div>
                <p className="text-lg font-bold">{item.val}</p>
                <p className="text-[9px] leading-tight text-slate-500 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity */}
        <div className="col-span-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Live Activity</h3>
            <button className="text-xs text-blue-600 font-semibold">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { text: 'New merchant registered', sub: "Domino's Pizza", time: '2 min ago', dot: 'bg-blue-400' },
              { text: 'Offer created', sub: 'Pizza Hub', time: '5 min ago', dot: 'bg-green-400' },
              { text: 'Offer redeemed', sub: 'Rahul Sharma', time: '7 min ago', dot: 'bg-purple-400' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${activity.dot}`}></div>
                <div className="flex-1">
                  <p className="font-bold">{activity.text}</p>
                  <p className="text-slate-400 text-[10px]">{activity.sub}</p>
                </div>
                <span className="text-[10px] text-slate-400 italic">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- LOWER ROW: SYSTEM STATUS & INSIGHTS --- */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* System Health Section */}
        <div className="col-span-8 grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
             <div className="relative size-32 mb-4">
                {/* Visual Donut Chart Placeholder */}
                <div className="absolute inset-0 rounded-full border-8 border-green-500 border-t-transparent flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-2xl font-bold">98.6%</p>
                        <p className="text-[10px] text-green-500 font-bold">Excellent</p>
                    </div>
                </div>
             </div>
             <p className="font-bold mb-4">System Health (Overall)</p>
             <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full px-4">
                <div className="flex justify-between text-xs"><span className="text-slate-500">User App</span> <span className="text-green-500 font-bold">Operational</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Merchant App</span> <span className="text-green-500 font-bold">Operational</span></div>
             </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">System Load Monitor</h3>
                <RefreshCw size={14} className="text-slate-400"/>
             </div>
             <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="text-center"><p className="text-[10px] text-slate-400">Req/Sec</p><p className="font-bold">1,245</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-400">Concurrent</p><p className="font-bold">8,452</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-400">Server Load</p><p className="font-bold text-orange-500">62%</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-400">Memory</p><p className="font-bold">68%</p></div>
             </div>
             <div className="h-24 bg-slate-50 rounded flex items-end p-2 gap-1">
                {/* Pseudo-bar chart */}
                {[40, 70, 45, 90, 65, 80, 30, 50].map((h, i) => (
                    <div key={i} style={{height: `${h}%`}} className="flex-1 bg-purple-200 rounded-t"></div>
                ))}
             </div>
          </div>
        </div>

        {/* Evening Insight & Status Column */}
        <div className="col-span-4 space-y-4">
          <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                <Info size={16} />
              </div>
              <h3 className="font-bold text-lg mb-1">Evening Insight</h3>
              <p className="text-sm opacity-90 leading-relaxed mb-4">
                Evening redemptions increased by <span className="font-bold">28%</span> compared to yesterday.
              </p>
              <button className="text-xs font-bold border-b border-white">View Detailed Analytics →</button>
            </div>
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
             <h3 className="font-bold mb-4 text-sm">System Status</h3>
             <div className="space-y-3">
                {['Server Status', 'Database', 'API Services', 'Payment Gateway'].map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">{s}</span>
                        <span className="flex items-center gap-2 text-green-500 font-bold">
                            Operational <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </span>
                    </div>
                ))}
             </div>
          </div>
        </div>

      </div>

      {/* --- MICRO INSIGHTS BAR --- */}
      <div className="mt-6 grid grid-cols-5 gap-4">
        {[
            { label: 'Most drop-off after shop verification', val: '21.4% drop-off', icon: '🏆' },
            { label: 'Daily reward feature usage is low', val: 'Only 74.6% offered', icon: '🔥' },
            { label: 'Evening time (6PM - 9PM) has highest redemptions', val: '+28% more', icon: '📈' },
            { label: 'Top Category Today', val: 'Food & Beverages', icon: '⭐' },
            { label: 'Merchants not creating offers after signup', val: '45% merchants', icon: '📊' },
        ].map((item, i) => (
            <div key={i} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                    <p className="text-[10px] leading-tight text-slate-400 font-bold uppercase">{item.label}</p>
                    <p className="text-xs font-bold text-slate-800">{item.val}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;