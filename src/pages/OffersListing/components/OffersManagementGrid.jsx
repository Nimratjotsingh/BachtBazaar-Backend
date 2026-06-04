import React, { useState } from "react";
import {
  Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight,
  MoreVertical, TrendingUp, TrendingDown, Eye, Plus, Upload, 
  Download, Calendar, BarChart3, Tag, Percent, X, Store, User, Mail, Phone, MapPin, Clock, ShieldCheck, Sliders, EyeOff,
  Loader2,
  Layers
} from "lucide-react";

const OffersManagementGrid = ({ 
  offers = [], 
  topPerforming = [], 
  performanceOverview = {},
  categoriesList = [],
  merchantsList = [],
  offerTypesList = [],
  pagination = { currentPage: 1, totalPages: 1, totalItems: 0 },
  selectedOfferDetail = null, 
  detailLoading = false,
  onClearDetail,
  onPageChange,
  onFilterChange,
  onActionTrigger
}) => {
  const [activeTab, setActiveTab] = useState("all"); 
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const formatTimestamp = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start antialiased font-sans text-slate-700 bg-transparent">
      
      {/* LEFT DATA SECTION PANEL BLOCK CONTAINER */}
      <div className={`${selectedOfferDetail ? "xl:col-span-8" : "xl:col-span-9"} space-y-5 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm transition-all duration-300`}>
        
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
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${activeTab === tab.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* --- INTERACTIVE FILTERS REBALANCING ROW BAR --- */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search offers by name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            />
          </div>

          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Categories</option>
            {categoriesList.map(c => <option key={c._id} value={c._id}>{c.label}</option>)}
          </select>

          <select 
            value={selectedMerchant} 
            onChange={(e) => setSelectedMerchant(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Merchants</option>
            {merchantsList.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>

          <button 
            onClick={handleApplyFilters}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <SlidersHorizontal size={12} /> Apply
          </button>

          <button onClick={handleResetFilters} className="p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* --- LIVE TABLE RENDER SPACE --- */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="w-6 pb-3"><input type="checkbox" className="rounded" /></th>
                <th className="px-4 pb-3">Offer Details</th>
                <th className="px-4 pb-3">Merchant</th>
                <th className="px-4 pb-3">Category</th>
                <th className="px-4 pb-3">Placement</th>
                <th className="px-4 pb-3">Discount Matrix</th>
                <th className="px-4 pb-3">Status</th>
                <th className="w-6 pb-3 text-center">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {offers.map((offer) => (
                <tr 
                  key={offer._id} 
                  className={`transition-colors border-b border-slate-100 ${selectedOfferDetail?._id === offer._id ? "bg-slate-50/80" : "hover:bg-slate-50/40"}`}
                >
                  <td className="py-4"><input type="checkbox" className="rounded" /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border overflow-hidden shrink-0 shadow-inner">
                        <img src={offer.thumbnail || "https://api.dicebear.com/7.x/initials/svg?seed=BB"} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 max-w-[140px]">
                        <p className="font-extrabold text-slate-900 truncate">{offer.title}</p>
                        <p className="text-[9px] font-mono tracking-wide text-slate-400 mt-0.5 uppercase">CODE: {offer.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 truncate max-w-[100px] font-bold text-slate-600">{offer.merchant_name}</td>
                  <td className="px-4 py-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] border border-blue-100/50">{offer.category_label}</span></td>
                  <td className="px-4 py-4 uppercase font-black tracking-tighter text-[9px] text-purple-500">{offer.offer_type_label}</td>
                  <td className="px-4 py-4">
                    <p className="font-extrabold text-slate-900">{offer.discount_expression}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Min. order ₹{offer.minimum_purchase_amount}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                      offer.status === 'active' ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                      {offer.status}
                    </span>
                  </td>
                  
                  {/* --- INTERACTION SWITCH HOOK POINT: EVENT ROOT MOVE TO EYE BUTTON ONLY --- */}
                  <td className="py-4 text-center">
                    <button 
                      type="button"
                      onClick={() => onActionTrigger && onActionTrigger("inspect_offer_row", offer)}
                      className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-100 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer interface block row links */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
          <p>Page <span className="text-slate-800">{pagination.currentPage}</span> of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={pagination.currentPage <= 1} onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)} className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 transition cursor-pointer"><ChevronLeft size={14}/></button>
            <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)} className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 transition cursor-pointer"><ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT DIVISION: SPLIT SCREEN PERFORMANCE OR DRILL DOWN SYSTEM DRAWER
         ========================================================= */}
      <div className={`${selectedOfferDetail ? "xl:col-span-4" : "xl:col-span-3"} space-y-6 transition-all duration-300`}>
        
        {/* --- DYNAMIC CONDITIONAL: LIVE DRILL DOWN AUDIT PANEL DRAWER --- */}
        {detailLoading ? (
          <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center shadow-xl h-[400px] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-8 h-8 mb-2" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Syncing Corporate Asset Bundles...</p>
          </div>
        ) : selectedOfferDetail ? (
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 sticky top-6">
            
            <div className="p-4.5 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-400" />
                <h3 className="font-black text-xs uppercase tracking-wider">Inspection Desk Panel</h3>
              </div>
              <button onClick={onClearDetail} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto pr-2 scrollbar-thin">
              <div className="space-y-3">
                <div className="w-full h-36 bg-slate-100 border rounded-2xl overflow-hidden shadow-inner">
                  {selectedOfferDetail.thumbnail ? (
                    <img src={selectedOfferDetail.thumbnail} className="w-full h-full object-cover" alt="" />
                  ) : <div className="w-full h-full flex items-center justify-center text-slate-300"><Percent size={28} /></div>}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-tight">{selectedOfferDetail.title}</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{selectedOfferDetail.description || "No layout descriptive parameters configured."}</p>
                </div>
              </div>

              {/* Threshold specifications display widgets grid slots */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1"><Sliders size={12} /> Campaign Configurations</div>
                <div className="grid grid-cols-2 gap-2.5 text-[11px] font-bold">
                  <div className="bg-white p-2 border rounded-xl"><span className="text-slate-400 block font-semibold mb-0.5">Discount %</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.discount_percentage ? `${selectedOfferDetail.discount_percentage}%` : "N/A"}</span></div>
                  <div className="bg-white p-2 border rounded-xl"><span className="text-slate-400 block font-semibold mb-0.5">Flat Value</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.discount_value ? `₹${selectedOfferDetail.discount_value}` : "N/A"}</span></div>
                  <div className="bg-white p-2 border rounded-xl"><span className="text-slate-400 block font-semibold mb-0.5">Min Basket</span><span className="text-slate-800 text-xs font-black">₹{selectedOfferDetail.minimum_purchase_amount || 0}</span></div>
                  <div className="bg-white p-2 border rounded-xl"><span className="text-indigo-600 block mt-0.5 truncate uppercase text-[9px] font-black">{selectedOfferDetail.display_type}</span></div>
                </div>
              </div>

              {/* Merchant Details profile subcard file block container updates */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-3 border-b text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Store size={13} className="text-indigo-600" /> Corporate Merchant profile</div>
                <div className="p-4 space-y-2.5 text-xs text-slate-600 bg-white font-medium">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-1">{selectedOfferDetail.merchant_id?.store_name || "Merchant Business Entity"} {selectedOfferDetail.merchant_id?.is_verified && <ShieldCheck size={14} className="text-emerald-500" />}</div>
                  <div className="flex items-center gap-2"><User size={13} className="text-slate-400" /> <span>Owner: {selectedOfferDetail.merchant_id?.owner_name || "N/A"}</span></div>
                  <div className="flex items-center gap-2 truncate"><Mail size={13} className="text-slate-400" /> <span>{selectedOfferDetail.merchant_id?.email}</span></div>
                  <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> <span>{selectedOfferDetail.merchant_id?.contact_phone}</span></div>
                  <div className="flex items-start gap-2 leading-relaxed"><MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> <span className="line-clamp-2">{selectedOfferDetail.merchant_id?.address || "Primary Residence location not stamped."}</span></div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* --- MOCK PERFORMANCE INSIGHTS OVERVIEW CARD STANDALONE (DEFAULT IN CASE OF NO COMPONENT DRILLDOWN SELECTED) --- */
          <>
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

            {/* --- TOP PERFORMANCE ACCUMULATION RANKING LIST --- */}
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
                      <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0 border"><img src={top.thumbnail || "https://api.dicebear.com/7.x/initials/svg?seed=BB"} className="w-full h-full object-cover" alt="" /></div>
                      <div className="min-w-0"><p className="text-xs font-extrabold text-slate-800 truncate max-w-[120px]">{top.title}</p><p className="text-[9px] font-bold text-slate-400 mt-0.5">{top.redemptions_count?.toLocaleString('en-IN')} redemptions</p></div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 shrink-0">↑ {top.conversionRate || "18.6%"}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- UNIVERSAL QUICK ACTIONS SELECTION TERMINAL --- */}
        {/* <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wider">
            <button onClick={() => onActionTrigger && onActionTrigger("create_offer")} className="flex flex-col items-start gap-2 p-3 text-indigo-600 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50/40 shadow-sm transition-all text-left cursor-pointer"><Plus size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Create Offer</span></button>
            <button onClick={() => onActionTrigger && onActionTrigger("bulk_upload")} className="flex flex-col items-start gap-2 p-3 text-emerald-600 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50/40 shadow-sm transition-all text-left cursor-pointer"><Upload size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Bulk Upload</span></button>
            <button onClick={() => onActionTrigger && onActionTrigger("offer_templates")} className="flex flex-col items-start gap-2 p-3 text-purple-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50/40 shadow-sm transition-all text-left cursor-pointer"><Tag size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Templates</span></button>
            <button onClick={() => onActionTrigger && onActionTrigger("schedule_offer")} className="flex flex-col items-start gap-2 p-3 text-orange-600 bg-white border border-orange-200 rounded-xl hover:bg-orange-50/40 shadow-sm transition-all text-left cursor-pointer"><Calendar size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Schedule</span></button>
          </div>
        </div> */}

      </div>
    </div>
  );
};

export default OffersManagementGrid;