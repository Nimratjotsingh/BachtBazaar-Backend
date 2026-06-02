import React, { useState } from 'react';
import { 
  Tag, 
  Gift, 
  Flame, 
  TicketCheck, 
  Calendar, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2
} from 'lucide-react';

const OffersStatsHeader = ({ stats, loading, dateRange, setDateRange }) => {
  // --- Local UI Layout Managers ---
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Dynamic trend badge sub-render component
  const TrendBadge = ({ trendData }) => {
    if (!trendData) return null;
    const { value, isPositive } = trendData;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <ArrowUpRight size={14} strokeWidth={2.5} /> : <ArrowDownRight size={14} strokeWidth={2.5} />}
        {value}
      </span>
    );
  };

  // Safe fallback wrapper for data nodes to gracefully handle initial rendering delays
  const currentStats = stats || {
    totalOffers: 0,
    activeOffers: 0,
    hotOffers: 0,
    offersRedeemed: 0,
    trends: {
      total: { value: "0%", isPositive: true },
      active: { value: "0%", isPositive: true },
      hot: { value: "0%", isPositive: true },
      redeemed: { value: "0%", isPositive: true }
    }
  };

  return (
    <div className="w-full space-y-6 antialiased font-sans text-slate-800 bg-[#FBFBFE]">
      
      {/* --- DASHBOARD BREADCRUMB HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Offers Management</h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1">
            <span>Home</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#6366F1]">Offers</span>
          </div>
        </div>

        {/* --- DYNAMIC DATE SELECTION DROPDOWN --- */}
        <div className="relative">
          <button
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm text-xs font-bold text-slate-600 transition-all cursor-pointer"
          >
            <Calendar size={15} className="text-slate-400" />
            <span>
              {dateRange?.label || "Select Range"} ({new Date(dateRange?.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(dateRange?.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDateDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl py-1 z-50 text-xs font-bold text-slate-600 animate-in fade-in slide-in-from-top-2 duration-150">
              {[
                { label: "Today Only", start: "2026-05-30", end: "2026-05-30" },
                { label: "Last 7 Days", start: "2026-05-23", end: "2026-05-30" },
                { label: "Last 30 Days", start: "2026-04-30", end: "2026-05-30" },
                { label: "Historical 2024 Frame", start: "2024-05-18", end: "2024-06-18" }
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (setDateRange) {
                      setDateRange({ label: opt.label, startDate: opt.start, endDate: opt.end });
                    }
                    setIsDateDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors block cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- STATISTICAL DATAGRID LAYER CARD BLOCKS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        
        {/* Card 1: Total Offers */}
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#EFF6FF] text-[#2563EB] rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-blue-50">
              <Tag size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Offers</p>
              {loading ? (
                <Loader2 className="animate-spin text-slate-300 mt-1" size={18} />
              ) : (
                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {currentStats.totalOffers.toLocaleString('en-IN')}
                </h3>
              )}
              <p className="text-[10px] font-semibold text-slate-400 mt-1">vs last 30 days</p>
            </div>
          </div>
          <div className="self-center">
            {!loading && <TrendBadge trendData={currentStats.trends?.total} />}
          </div>
        </div>

        {/* Card 2: Active Offers */}
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ECFDF5] text-[#059669] rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-emerald-50">
              <Gift size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Offers</p>
              {loading ? (
                <Loader2 className="animate-spin text-slate-300 mt-1" size={18} />
              ) : (
                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {currentStats.activeOffers.toLocaleString('en-IN')}
                </h3>
              )}
              <p className="text-[10px] font-semibold text-slate-400 mt-1">vs last 30 days</p>
            </div>
          </div>
          <div className="self-center">
            {!loading && <TrendBadge trendData={currentStats.trends?.active} />}
          </div>
        </div>

        {/* Card 3: Hot Offers */}
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F5F3FF] text-[#7C3AED] rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-purple-50">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Hot Offers</p>
              {loading ? (
                <Loader2 className="animate-spin text-slate-300 mt-1" size={18} />
              ) : (
                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {currentStats.hotOffers.toLocaleString('en-IN')}
                </h3>
              )}
              <p className="text-[10px] font-semibold text-slate-400 mt-1">vs last 30 days</p>
            </div>
          </div>
          <div className="self-center">
            {!loading && <TrendBadge trendData={currentStats.trends?.hot} />}
          </div>
        </div>

        {/* Card 4: Offers Redeemed */}
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFF7ED] text-[#EA580C] rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-orange-50">
              <TicketCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Offers Redeemed</p>
              {loading ? (
                <Loader2 className="animate-spin text-slate-300 mt-1" size={18} />
              ) : (
                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {currentStats.offersRedeemed.toLocaleString('en-IN')}
                </h3>
              )}
              <p className="text-[10px] font-semibold text-slate-400 mt-1">vs last 30 days</p>
            </div>
          </div>
          <div className="self-center">
            {!loading && <TrendBadge trendData={currentStats.trends?.redeemed} />}
          </div>
        </div>

        {/* Card 5: Grid Layout Spacer Placeholder Box */}
        <div className="hidden xl:block bg-gradient-to-br from-slate-50/40 to-slate-100/20 border border-dashed border-slate-200 rounded-[20px] shadow-sm relative overflow-hidden" />

      </div>
    </div>
  );
};

export default OffersStatsHeader;