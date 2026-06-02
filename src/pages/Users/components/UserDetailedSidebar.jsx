import React, { useState } from "react";
import {
  X, Calendar, Clock, Hourglass, Eye, MousePointer, Gift, Award, 
  Layers, Ticket, CheckCircle2, MapPin, Send, Ban, UserPlus, 
  FileText, ArrowUpRight, ShieldAlert, Zap
} from "lucide-react";

const UserDetailsSidebar = ({ userData, onClose, onActionTrigger }) => {
  const [activeSubTab, setActiveSubTab] = useState("Overview");

  // Fallback fallback metrics block adhering strictly to the image_eff9ac.png UI framework
  const user = userData || {
    name: "Rohit Kumar",
    phone: "+91 98765 43210",
    email: "rohitkumar@gmail.com",
    userId: "U125487",
    status: "Active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohit",
    metrics: {
      joinedOn: "12 May, 2024",
      lastActive: "18 Jun, 2024 10:30 AM",
      totalAppUsage: "24h 36m",
      offersViewed: 128,
      offersClicked: 45,
      redemptions: 12,
      rewardsClaimed: 8,
      scratchCardsUsed: 15,
      couponsUsed: 6,
      profileCompletion: 90,
      location: "Mumbai, Maharashtra"
    }
  };

  return (
    <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col antialiased font-sans text-slate-700 shadow-2xl animate-in slide-in-from-right duration-300">
      
      {/* --- SIDEBAR HEADER PANEL --- */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-600 rounded-full" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">User Details</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* --- SCROLLABLE CONTENT BODY INSIDE SPEC --- */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-thin">
        
        {/* Profile Card Header Badge Layout */}
        <div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md shrink-0">
            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight truncate">{user.name}</h3>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/50 rounded-full text-[10px] font-black uppercase tracking-wide">
                {user.status}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-700">{user.phone}</p>
            <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">User ID : <span className="font-mono text-slate-600 font-bold">{user.userId}</span></p>
          </div>
        </div>

        {/* --- INNER HORIZONTAL NAVIGATION SCROLL BAR --- */}
        <div className="flex border-b border-slate-100 text-xs font-bold text-slate-400">
          {["Overview", "Activity", "History", "Logs"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex-1 text-center pb-2.5 relative transition-colors uppercase tracking-wider cursor-pointer ${
                activeSubTab === tab ? "text-indigo-600 font-black" : "hover:text-slate-700"
              }`}
            >
              {tab}
              {activeSubTab === tab && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* --- SUB-TAB PROFILE WORKSPACE PANELS --- */}
        {activeSubTab === "Overview" ? (
          <div className="space-y-3.5 text-xs">
            <MetricRow icon={<Calendar />} label="Joined On" val={user.metrics.joinedOn} />
            <MetricRow icon={<Clock />} label="Last Active" val={user.metrics.lastActive} />
            <MetricRow icon={<Hourglass />} label="Total App Usage" val={user.metrics.totalAppUsage} />
            <MetricRow icon={<Eye />} label="Offers Viewed" val={user.metrics.offersViewed} isMono />
            <MetricRow icon={<MousePointer />} label="Offers Clicked" val={user.metrics.offersClicked} isMono />
            <MetricRow icon={<Gift />} label="Redemptions" val={user.metrics.redemptions} isMono />
            <MetricRow icon={<Award />} label="Rewards Claimed" val={user.metrics.rewardsClaimed} isMono />
            <MetricRow icon={<Layers />} label="Scratch Cards Used" val={user.metrics.scratchCardsUsed} isMono />
            <MetricRow icon={<Ticket />} label="Coupons Used" val={user.metrics.couponsUsed} isMono />
            
            {/* Completion Matrix Row */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <div className="flex items-center gap-2.5 text-slate-400 font-medium">
                <CheckCircle2 size={15} />
                <span>Profile Completion</span>
              </div>
              <div className="flex items-center gap-3 w-1/2 justify-end">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${user.metrics.profileCompletion}%` }} />
                </div>
                <span className="font-extrabold text-slate-800 font-mono text-right shrink-0">{user.metrics.profileCompletion}%</span>
              </div>
            </div>

            <MetricRow icon={<MapPin />} label="Location" val={user.metrics.location} />
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed">
            {activeSubTab} stream is currently idle.
          </div>
        )}

        {/* --- ACTIONS TRIGGER MATRIX --- */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Actions</h4>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <button 
              onClick={() => onActionTrigger && onActionTrigger("send_notification", user)}
              className="flex items-center gap-2 p-3 bg-blue-50/50 text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-50 transition-all cursor-pointer"
            >
              <Send size={14} className="shrink-0" /> <span>Send Notification</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("block_user", user)}
              className="flex items-center gap-2 p-3 bg-rose-50/40 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
            >
              <Ban size={14} className="shrink-0" /> <span>Block User</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("add_segment", user)}
              className="flex items-center gap-2 p-3 bg-purple-50/40 text-purple-600 border border-purple-100 rounded-xl hover:bg-purple-50 transition-all cursor-pointer"
            >
              <UserPlus size={14} className="shrink-0" /> <span>Add to Segment</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("view_logs", user)}
              className="flex items-center gap-2 p-3 bg-emerald-50/40 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <FileText size={14} className="shrink-0" /> <span>View Activity Logs</span>
            </button>
          </div>
        </div>

        {/* --- QUICK SEGMENT PILLS DECK --- */}
        <div className="space-y-3.5 pt-1">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Quick Segment</h4>
            <button className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">View All</button>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50/70 text-emerald-700 border border-emerald-100 rounded-xl">
              <Zap size={12} /> New Users
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50/70 text-blue-700 border border-blue-100 rounded-xl">
              <Clock size={12} /> High Value Users
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50/70 text-rose-700 border border-rose-100 rounded-xl">
              <ShieldAlert size={12} /> Inactive 7+ Days
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50/70 text-indigo-700 border border-indigo-100 rounded-xl">
              <ArrowUpRight size={12} /> Frequent Users
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-xl">
              <Ticket size={12} /> High Redeemers
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

// Sub-render asset for key-value row configuration bindings
const MetricRow = ({ icon, label, val, isMono }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50/80">
    <div className="flex items-center gap-2.5 text-slate-400 font-medium">
      {React.cloneElement(icon, { size: 15 })}
      <span>{label}</span>
    </div>
    <span className={`text-slate-800 text-right font-extrabold ${isMono ? "font-mono text-xs" : "font-semibold"}`}>
      {val !== undefined && val !== null ? val.toLocaleString() : "—"}
    </span>
  </div>
);

export default UserDetailsSidebar;