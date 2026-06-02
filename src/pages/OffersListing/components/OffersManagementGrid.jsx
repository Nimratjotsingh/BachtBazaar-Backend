import React, { useState, useMemo } from "react";
import {
  Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight,
  MoreVertical, TrendingUp, TrendingDown, Eye, Plus, Upload, 
  Download, Calendar, BarChart3, Tag, Percent
} from "lucide-react";

const OffersManagementGrid = ({ 
  offers = [], 
  topPerforming = [], 
  performanceOverview = {},
  categoriesList = [],
  merchantsList = [],
  offerTypesList = [],
  pagination = { currentPage: 1, totalPages: 1, totalItems: 0 },
  onPageChange,
  onFilterChange,
  onActionTrigger
}) => {
  // --- Active Filter and Tab Management ---
  const [activeTab, setActiveTab] = useState("all"); // all, active, scheduled, expired, draft
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Filter Sync Notification Mechanism ---
  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        tab: activeTab,
        search,
        category: selectedCategory,
        merchant: selectedMerchant,
        status: selectedStatus,
        type: selectedType,
        limit: itemsPerPage
      });
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedMerchant("");
    setSelectedStatus("");
    setSelectedType("");
    if (onFilterChange) {
      onFilterChange({ tab: activeTab, search: "", category: "", merchant: "", status: "", type: "", limit: itemsPerPage });
    }
  };

  const handleTabSwitch = (tabValue) => {
    setActiveTab(tabValue);
    if (onFilterChange) {
      onFilterChange({
        tab: tabValue, search, category: selectedCategory, merchant: selectedMerchant, status: selectedStatus, type: selectedType, limit: itemsPerPage
      });
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start antialiased font-sans text-slate-700 bg-transparent">
      
      {/* =========================================================
          LEFT DIVISION: COMPREHENSIVE OFFERS FILTER DECK & TABLE (9 Cols)
         ========================================================= */}
      <div className="xl:col-span-9 space-y-5 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
        
        {/* --- DYNAMIC LIFECYCLE FILTER SUB-TABS --- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { label: "All Offers", key: "all", count: pagination.totalItems },
            { label: "Active", key: "active", count: offers.filter(o => o.status === 'active').length },
            { label: "Scheduled", key: "scheduled", count: offers.filter(o => o.status === 'scheduled').length },
            { label: "Expired", key: "expired", count: offers.filter(o => o.status === 'expired').length },
            { label: "Draft", key: "draft", count: offers.filter(o => o.status === 'draft').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabSwitch(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.key 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/40" 
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
                activeTab === tab.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* --- MULTI-AXIS INTERACTIVE CONTROL INTERCEPT BAR --- */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search offers by name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            />
          </div>

          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">All Categories</option>
            {categoriesList.map(c => <option key={c._id} value={c._id}>{c.label}</option>)}
          </select>

          <select 
            value={selectedMerchant} 
            onChange={(e) => setSelectedMerchant(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">All Merchants</option>
            {merchantsList.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>

          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="draft">Draft</option>
          </select>

          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">All Offer Types</option>
            {offerTypesList.map(t => <option key={t._id} value={t._id}>{t.label}</option>)}
          </select>

          <button 
            onClick={handleApplyFilters}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-100 cursor-pointer"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>

          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {/* --- REAL-TIME OFFERS REGISTRATION DATA TABLE --- */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="w-6 pb-3"><input type="checkbox" className="rounded" /></th>
                <th className="px-4 pb-3">Offer Details</th>
                <th className="px-4 pb-3">Merchant</th>
                <th className="px-4 pb-3">Category</th>
                <th className="px-4 pb-3">Offer Type</th>
                <th className="px-4 pb-3">Discount / Value</th>
                <th className="px-4 pb-3">Status</th>
                <th className="px-4 pb-3">Redemptions</th>
                <th className="w-6 pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-14 text-center font-bold text-slate-400 italic">No offers match the current dynamic pipeline filters.</td>
                </tr>
              ) : offers.map((offer) => (
                <tr key={offer._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4"><input type="checkbox" className="rounded" /></td>
                  
                  {/* Title & Badge Meta */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 shadow-inner">
                        <img src={offer.thumbnail || "https://api.dicebear.com/7.x/initials/svg?seed=BB"} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 max-w-[180px]">
                        <p className="font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{offer.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tight uppercase mt-0.5">Code: {offer.code || "N/A"}</p>
                      </div>
                    </div>
                  </td>

                  {/* Merchant Stack */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-indigo-600 shadow-sm border">
                        {offer.merchant_name?.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700 truncate max-w-[110px]">{offer.merchant_name}</span>
                    </div>
                  </td>

                  {/* Category Pill */}
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 bg-blue-50/70 text-blue-600 border border-blue-100/50 rounded-lg font-bold tracking-wide text-[10px]">
                      {offer.category_label}
                    </span>
                  </td>

                  {/* Offer Type Custom Stamp */}
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-purple-100/40">
                      {offer.offer_type_label}
                    </span>
                  </td>

                  {/* Numerical Metric Values */}
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-extrabold text-slate-900">{offer.discount_expression || "Flat Offer"}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">Min. order ₹{offer.minimum_purchase_amount}</p>
                    </div>
                  </td>

                  {/* Operational Running Status */}
                  <td className="px-4 py-4">
                    <div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                        offer.status === 'active' ? 'text-emerald-600' :
                        offer.status === 'scheduled' ? 'text-indigo-600' :
                        offer.status === 'expired' ? 'text-rose-500' : 'text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          offer.status === 'active' ? 'bg-emerald-500' :
                          offer.status === 'scheduled' ? 'bg-indigo-500' :
                          offer.status === 'expired' ? 'bg-rose-500' : 'bg-slate-400'
                        }`} />
                        {offer.status}
                      </span>
                      <p className="text-[9px] font-medium text-slate-400 tracking-tighter mt-0.5">
                        {offer.status === 'active' ? `Exp: ${offer.formatted_end}` :
                         offer.status === 'scheduled' ? `Start: ${offer.formatted_start}` : `Ended: ${offer.formatted_end}`}
                      </p>
                    </div>
                  </td>

                  {/* Redemptions Dynamic Counters */}
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{offer.redemptions_count?.toLocaleString('en-IN') || 0}</p>
                      {offer.redemption_trend && (
                        <p className="text-[9px] font-bold text-emerald-600 flex items-center mt-0.5">↑ {offer.redemption_trend}</p>
                      )}
                    </div>
                  </td>

                  {/* Context Options Dot Triggers */}
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => onActionTrigger && onActionTrigger("open_options", offer)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))
              }
            </tbody>
          </table>
        </div>

        {/* --- ADVANCED PAGINATION COMPONENT FOOTER --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
          <p>Showing <span className="text-slate-800 font-bold">1 to {offers.length}</span> of <span className="text-slate-800 font-bold">{pagination.totalItems.toLocaleString('en-IN')}</span> offers</p>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button 
                disabled={pagination.currentPage <= 1}
                onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-sm shadow-indigo-100">{pagination.currentPage}</span>
              
              <button 
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); handleApplyFilters(); }}
              className="px-2 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold outline-none cursor-pointer"
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT DIVISION: PERFORMANCE ANALYTICS & QUICK ACTIONS (3 Cols)
         ========================================================= */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* --- PERFORMANCE CARD WIDGET --- */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-5">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Offers Performance</h4>
            <button className="text-[11px] font-black text-indigo-600 uppercase hover:underline cursor-pointer">View All</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Redemption Rate", val: performanceOverview.redemptionRate || "0%", trend: "↑ 3.2%", theme: "text-emerald-600 bg-emerald-50" },
              { label: "Conversion Rate", val: performanceOverview.conversionRate || "0%", trend: "↑ 2.1%", theme: "text-emerald-600 bg-emerald-50" },
              { label: "Avg. Discount", val: performanceOverview.avgDiscount || "0%", trend: "↑ 1.8%", theme: "text-emerald-600 bg-emerald-50" },
              { label: "ROI", val: performanceOverview.roi || "0x", trend: "↑ 0.6x", theme: "text-emerald-600 bg-emerald-50" },
            ].map((idx, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 leading-tight truncate">{idx.label}</p>
                <p className="text-base font-black text-slate-800 mt-1">{idx.val}</p>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-1.5 inline-block ${idx.theme}`}>{idx.trend}</span>
              </div>
            ))}
          </div>

          {/* --- SPARKLINE GRAPH SCHEMATIC FRAME --- */}
          <div className="pt-2">
            <div className="h-24 bg-gradient-to-t from-indigo-50/30 to-white border border-slate-100 shadow-inner rounded-xl flex items-end p-2 relative overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,80 Q20,30 40,60 T80,20 T100,40 L100,100 L0,100 Z" fill="url(#sparkGradient)" opacity="0.15" />
                <path d="M0,80 Q20,30 40,60 T80,20 T100,40" fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#fff"/></linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between w-full text-[8px] font-bold text-slate-400 px-1 z-10"><span>19 May</span><span>02 Jun</span><span>16 Jun</span></div>
            </div>
          </div>
        </div>

        {/* --- TOP LEADERBOARD LIST --- */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Top Performing Offers</h4>
            <button className="text-[11px] font-black text-indigo-600 uppercase hover:underline cursor-pointer">View All</button>
          </div>

          <div className="space-y-3">
            {topPerforming.map((top, idx) => (
              <div key={top._id || idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-black text-slate-400 w-4">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0 border">
                    <img src={top.thumbnail || "https://api.dicebear.com/7.x/initials/svg?seed=BB"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate max-w-[120px]">{top.title}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{top.redemptions?.toLocaleString('en-IN')} redemptions</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 shrink-0">↑ {top.conversionRate || "18.6%"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- INTERACTIVE ACTION TRIGGER BLOCK PANEL --- */}
        {/* <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-3.5">
          <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Quick Actions</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wider">
            <button 
              onClick={() => onActionTrigger && onActionTrigger("create_offer")}
              className="flex flex-col items-start gap-2 p-3 text-indigo-600 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50/40 shadow-sm transition-all text-left cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Create Offer</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("bulk_upload")}
              className="flex flex-col items-start gap-2 p-3 text-emerald-600 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50/40 shadow-sm transition-all text-left cursor-pointer"
            >
              <Upload size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Bulk Upload</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("offer_templates")}
              className="flex flex-col items-start gap-2 p-3 text-purple-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50/40 shadow-sm transition-all text-left cursor-pointer"
            >
              <Tag size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Offer Templates</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("schedule_offer")}
              className="flex flex-col items-start gap-2 p-3 text-orange-600 bg-white border border-orange-200 rounded-xl hover:bg-orange-50/40 shadow-sm transition-all text-left cursor-pointer"
            >
              <Calendar size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Schedule Offer</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("import_offers")}
              className="flex flex-col items-start gap-2 p-3 text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50/40 shadow-sm transition-all text-left cursor-pointer col-span-1"
            >
              <Download size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Import Offers</span>
            </button>
            <button 
              onClick={() => onActionTrigger && onActionTrigger("offer_analytics")}
              className="flex flex-col items-start gap-2 p-3 text-rose-600 bg-rose-50/40 border border-rose-100 rounded-xl hover:bg-rose-50 shadow-sm transition-all text-left cursor-pointer col-span-1"
            >
              <BarChart3 size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Offer Analytics</span>
            </button>
          </div>
        </div> */}

      </div>
    </div>
  );
};

export default OffersManagementGrid;