import React, { useState } from "react";
import {
  Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight,
  MoreVertical, Eye, Plus, Upload, Tag, Percent, X, Store, User, Mail, 
  Phone, MapPin, Clock, ShieldCheck, Sliders, EyeOff, Loader2, Info,
  Calendar,
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
  selectedOfferDetail = null, // Injected real-time detail state populated from parent API
  detailLoading = false,
  onClearDetail,
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

  // Floating Inspection Modal Controller State
  const [isPopupOpen, setIsPopupOpen] = useState(false);

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

  const formatTimestamp = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  // --- Eyeball Action Interceptor Click Hook ---
  const handleEyeballClick = (offerId) => {
    if (onActionTrigger) {
      onActionTrigger("inspect_offer_row", { _id: offerId });
    }
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    if (onClearDetail) onClearDetail();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start antialiased font-sans text-slate-700 bg-transparent relative">
      
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
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${activeTab === tab.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
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

        {/* --- LIVE ORIGINAL SOURCE DESIGN HIGH FIDELITY TABLE --- */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50/40 border-b border-blue-100 text-xs font-bold text-blue-950 uppercase tracking-wider">
                <th className="px-6 py-4">Promotional Campaign</th>
                <th className="px-6 py-4">Merchant Partner</th>
                <th className="px-6 py-4">Layout Type</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 text-xs">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-14 text-center font-bold text-slate-400 italic bg-white">
                    No offers match the current dynamic pipeline filters.
                  </td>
                </tr>
              ) : offers.map((offer) => (
                <tr key={offer._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                        {offer.thumbnail ? (
                          <img src={offer.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="" />
                        ) : (
                          <Percent className="text-slate-400 w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-blue-950 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{offer.title}</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                          <Clock size={12} /> Live: {formatTimestamp(offer.start_date)} - {formatTimestamp(offer.end_date)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <Store size={13} className="text-slate-400" /> {offer.merchant_id?.name || offer.merchant_name || "Unknown Business"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{offer.merchant_id?.email || "N/A"}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      offer.display_type === 'calendar' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-cyan-600 bg-cyan-50 border-cyan-100'
                    }`}>
                      {offer.display_type || offer.offer_type_label}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button 
                      type="button"
                      onClick={() => handleEyeballClick(offer._id)}
                      className="p-2 text-blue-600 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
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
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{top.redemptions_count?.toLocaleString('en-IN') || top.redemptions?.toLocaleString('en-IN')} redemptions</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 shrink-0">↑ {top.conversionRate || "18.6%"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- UNIVERSAL QUICK ACTIONS SELECTION TERMINAL --- */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wider">
            <button onClick={() => onActionTrigger && onActionTrigger("create_offer")} className="flex flex-col items-start gap-2 p-3 text-indigo-600 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50/40 shadow-sm transition-all text-left cursor-pointer"><Plus size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Create Offer</span></button>
            <button onClick={() => onActionTrigger && onActionTrigger("bulk_upload")} className="flex flex-col items-start gap-2 p-3 text-emerald-600 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50/40 shadow-sm transition-all text-left cursor-pointer"><Upload size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Bulk Upload</span></button>
            <button onClick={() => onActionTrigger && onActionTrigger("offer_templates")} className="flex flex-col items-start gap-2 p-3 text-purple-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50/40 shadow-sm transition-all text-left cursor-pointer"><Tag size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Templates</span></button>
            <button onClick={() => onActionTrigger && onActionTrigger("schedule_offer")} className="flex flex-col items-start gap-2 p-3 text-orange-600 bg-white border border-orange-200 rounded-xl hover:bg-orange-50/40 shadow-sm transition-all text-left cursor-pointer"><Calendar size={16} strokeWidth={2.5} /> <span className="text-[10px] font-black mt-2">Schedule</span></button>
          </div>
        </div>
      </div>

      {/* =========================================================
          DYNAMIC FLOATING MODAL OVERLAY: EYEBELL POPUP DETAILS
          ========================================================= */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-slate-200 p-0 max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Top Navigation Header bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-400" />
                <h3 className="font-black text-xs uppercase tracking-wider">Campaign Inspection Hub</h3>
              </div>
              <button 
                type="button" 
                onClick={handleClosePopup}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dynamic Content Panel Section Loader switcher */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {detailLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-indigo-600">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Syncing Corporate Asset Bundles...</p>
                </div>
              ) : selectedOfferDetail ? (
                <div className="space-y-5 animate-in fade-in duration-300">
                  
                  {/* Section 1: Thumbnail Media Preview asset */}
                  <div className="space-y-2.5">
                    <div className="w-full h-44 bg-slate-100 border rounded-2xl overflow-hidden shadow-inner">
                      {selectedOfferDetail.thumbnail ? (
                        <img src={selectedOfferDetail.thumbnail} className="w-full h-full object-cover" alt="" />
                      ) : <div className="w-full h-full flex items-center justify-center text-slate-300"><Percent size={32} /></div>}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 leading-tight">{selectedOfferDetail.title}</h4>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">{selectedOfferDetail.description || "No layout descriptions fields registered."}</p>
                    </div>
                  </div>

                  {/* Section 2: Financial Threshold matrices parameters */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                    <div className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5"><Sliders size={13} /> Metric Configurations Values</div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                      <div className="bg-white p-2.5 border rounded-xl shadow-xs"><span className="text-slate-400 block font-semibold mb-0.5">Discount Value %</span><span className="text-slate-800 font-mono text-sm font-black">{selectedOfferDetail.discount_percentage ? `${selectedOfferDetail.discount_percentage}%` : "—"}</span></div>
                      <div className="bg-white p-2.5 border rounded-xl shadow-xs"><span className="text-slate-400 block font-semibold mb-0.5">Flat Deduction Value</span><span className="text-slate-800 font-mono text-sm font-black">{selectedOfferDetail.discount_value ? `₹${selectedOfferDetail.discount_value}` : "—"}</span></div>
                      <div className="bg-white p-2.5 border rounded-xl shadow-xs"><span className="text-slate-400 block font-semibold mb-0.5">Minimum Spending limit</span><span className="text-slate-800 font-mono text-sm font-black">₹{selectedOfferDetail.minimum_purchase_amount || 0}</span></div>
                      <div className="bg-white p-2.5 border rounded-xl shadow-xs"><span className="text-indigo-600 font-black block text-[10px] uppercase mt-0.5">{selectedOfferDetail.display_type}</span></div>
                    </div>
                  </div>

                  {/* Section 3: Relational Parent Merchant Credentials Card */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-2.5 border-b text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1"><Store size={12} className="text-indigo-600" /> Merchant Enterprise Profile</div>
                    <div className="p-4 space-y-2 text-xs font-medium text-slate-600 bg-white">
                      <div className="font-black text-sm text-slate-900 flex items-center gap-1">{selectedOfferDetail.merchant_id?.store_name || selectedOfferDetail.merchant_id?.name} {selectedOfferDetail.merchant_id?.is_verified && <ShieldCheck size={14} className="text-emerald-500 inline" />}</div>
                      <div className="flex items-center gap-2"><User size={13} className="text-slate-400" /> <span>Account Operator: {selectedOfferDetail.merchant_id?.owner_name || "N/A"}</span></div>
                      <div className="flex items-center gap-2 truncate"><Mail size={13} className="text-slate-400" /> <span>{selectedOfferDetail.merchant_id?.email}</span></div>
                      <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> <span>{selectedOfferDetail.merchant_id?.contact_phone || selectedOfferDetail.merchant_id?.phone}</span></div>
                      <div className="flex items-start gap-2 leading-relaxed"><MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> <span className="line-clamp-2">{selectedOfferDetail.merchant_id?.address}</span></div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 font-medium flex items-center justify-center gap-1.5"><Info size={14}/> Profile synchronization failed.</div>
              )}
            </div>

            {/* Bottom Actions Dismiss Bar */}
            <div className="px-6 py-4 border-t bg-slate-50 flex shrink-0">
              <button 
                type="button" 
                onClick={handleClosePopup}
                className="w-full h-11 bg-white border border-slate-200 hover:bg-slate-100 font-black text-slate-800 text-xs uppercase tracking-widest rounded-xl transition shadow-xs cursor-pointer"
              >
                Dismiss Analytics Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default OffersManagementGrid;