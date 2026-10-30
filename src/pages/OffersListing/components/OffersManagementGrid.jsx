import React, { useState } from "react";
import {
  Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight,
  MoreVertical, TrendingUp, TrendingDown, Eye, Plus, Upload, 
  Download, Calendar, BarChart3, Tag, Percent, X, Store, User, Mail, Phone, MapPin, Clock, ShieldCheck, Sliders, EyeOff,
  Loader2, Layers, LayoutGrid, List, Maximize2, Ticket, QrCode, CheckCircle2, AlertCircle, Hash, DollarSign, Check, Shield
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
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Rejection reason prompt input state for verification drawer
  const [rejectionInput, setRejectionInput] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

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
      
      {/* LEFT DATA SECTION PANEL BLOCK CONTAINER */}
      <div className={`${selectedOfferDetail ? "xl:col-span-8" : "xl:col-span-9"} space-y-5 bg-white p-4 sm:p-6 rounded-[24px] border border-slate-200/80 shadow-xs transition-all duration-300`}>
        
        {/* --- DYNAMIC LIFECYCLE FILTER SUB-TABS --- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { label: "All Offers", key: "all", count: pagination.totalItems },
            { label: "Active", key: "active", count: offers.filter(o => o.status === 'active').length },
            { label: "Scheduled", key: "scheduled", count: offers.filter(o => o.status === 'scheduled').length },
            { label: "Expired", key: "expired", count: offers.filter(o => o.status === 'expired').length },
            { label: "Paused", key: "paused", count: offers.filter(o => o.status === 'paused').length }
          ].map((tab, idx) => (
            <button
              key={`${tab.key}-${idx}`}
              onClick={() => handleTabSwitch(tab.key)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.key 
                  ? "bg-indigo-50 text-indigo-600 shadow-2xs border border-indigo-100/60" 
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

        {/* --- INTERACTIVE FILTERS ROW + GRID/TABLE TOGGLE --- */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search offers by title, code..."
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
              {categoriesList.map((c, idx) => <option key={`${c._id || 'cat'}-${idx}`} value={c._id}>{c.label}</option>)}
            </select>

            <select 
              value={selectedMerchant} 
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="">Merchants</option>
              {merchantsList.map((m, idx) => <option key={`${m._id || 'mer'}-${idx}`} value={m._id}>{m.name}</option>)}
            </select>

            <button 
              onClick={handleApplyFilters}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <SlidersHorizontal size={12} /> Apply
            </button>

            <button onClick={handleResetFilters} className="p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer" title="Reset Filters">
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Grid vs Table Layout Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setDisplayMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === "grid" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === "table" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="List Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* =========================================================
            VIEW MODE 1: RESPONSIVE GRID VIEW (PROPORTIONAL CONTAINMENT)
            ========================================================= */}
        {displayMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {offers.length === 0 ? (
              <div className="col-span-full py-16 text-center font-bold text-slate-400 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[24px] text-xs uppercase tracking-wider italic">
                No campaign offers matched your filtered parameters.
              </div>
            ) : (
              offers.map((offer, idx) => (
                <div
                  key={`${offer._id || 'offer'}-${idx}`}
                  onClick={() => onActionTrigger && onActionTrigger("inspect_offer_row", offer)}
                  className={`bg-white rounded-[24px] border transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between ${
                    selectedOfferDetail?._id === offer._id 
                      ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md" 
                      : "border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md"
                  }`}
                >
                  <div>
                    {/* Proportional Containment Banner */}
                    <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-950 flex items-center justify-center p-3 border-b border-slate-900 overflow-hidden">
                      {offer.thumbnail ? (
                        <img
                          src={offer.thumbnail}
                          alt={offer.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Percent size={32} className="text-slate-600" />
                      )}

                      {/* Overlaid Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 bg-indigo-600/90 text-white font-black text-[9px] uppercase tracking-wider rounded-md backdrop-blur-xs shadow-xs">
                          {offer.discount_expression}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs ${
                          offer.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                        }`}>
                          {offer.status}
                        </span>
                      </div>

                      {/* Direct Fullscreen Button */}
                      {offer.thumbnail && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionTrigger && onActionTrigger("open_lightbox", { src: offer.thumbnail, label: `${offer.title} Banner` });
                          }}
                          className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title="Fullscreen Banner"
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="p-4 sm:p-5 space-y-2.5">
                      <div>
                        <h3 className="font-extrabold text-[#0F172A] line-clamp-1 text-sm group-hover:text-indigo-600 transition-colors">
                          {offer.title}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase">
                          CODE: <strong className="text-slate-600">{offer.code}</strong>
                        </p>
                      </div>

                      <div className="space-y-1 text-[11px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Store size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate">Merchant: <strong className="text-slate-700">{offer.merchant_name}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Tag size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate">Type: <strong className="text-purple-600 uppercase">{offer.offer_type_label}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Min: ₹{offer.minimum_purchase_amount}</span>
                        <span className="text-indigo-600 font-bold">{offer.redemptions_count} Redemptions</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Inspect Row */}
                  <div className="px-4 sm:px-5 pb-4 pt-1">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                      <span>{offer.formatted_start} - {offer.formatted_end}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionTrigger && onActionTrigger("inspect_offer_row", offer);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer border border-indigo-100"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* =========================================================
             VIEW MODE 2: TABLE LIST VIEW
             ========================================================= */
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 pb-3">Offer Details</th>
                  <th className="px-4 pb-3">Merchant</th>
                  <th className="px-4 pb-3">Category</th>
                  <th className="px-4 pb-3">Placement</th>
                  <th className="px-4 pb-3">Discount Matrix</th>
                  <th className="px-4 pb-3">Status</th>
                  <th className="w-6 pb-3 text-center">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold">
                {offers.map((offer, idx) => (
                  <tr 
                    key={`${offer._id || 'tbl-offer'}-${idx}`}
                    onClick={() => onActionTrigger && onActionTrigger("inspect_offer_row", offer)}
                    className={`transition-colors border-b border-slate-100 cursor-pointer ${selectedOfferDetail?._id === offer._id ? "bg-indigo-50/40" : "hover:bg-slate-50/60"}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={(e) => {
                            if (offer.thumbnail) {
                              e.stopPropagation();
                              onActionTrigger && onActionTrigger("open_lightbox", { src: offer.thumbnail, label: `${offer.title} Banner` });
                            }
                          }}
                          className={`w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 shadow-inner flex items-center justify-center ${offer.thumbnail ? 'cursor-zoom-in' : ''}`}
                        >
                          {offer.thumbnail ? (
                            <img src={offer.thumbnail} className="w-full h-full object-contain p-1" alt="" />
                          ) : (
                            <Percent size={16} className="text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-[160px]">
                          <p className="font-extrabold text-slate-900 truncate">{offer.title}</p>
                          <p className="text-[9px] font-mono tracking-wide text-slate-400 mt-0.5 uppercase">CODE: {offer.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 truncate max-w-[110px] font-bold text-slate-600">{offer.merchant_name}</td>
                    <td className="px-4 py-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] border border-blue-100/50">{offer.category_label}</span></td>
                    <td className="px-4 py-4 uppercase font-black tracking-tighter text-[9px] text-purple-600">{offer.offer_type_label}</td>
                    <td className="px-4 py-4">
                      <p className="font-extrabold text-slate-900">{offer.discount_expression}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Min. order ₹{offer.minimum_purchase_amount}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                        offer.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {offer.status}
                      </span>
                    </td>
                    
                    <td className="py-4 text-center">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionTrigger && onActionTrigger("inspect_offer_row", offer);
                        }}
                        className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-100 rounded-xl transition shadow-2xs cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
          <p>Page <span className="text-slate-800">{pagination.currentPage}</span> of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={pagination.currentPage <= 1} onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)} className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 transition cursor-pointer shadow-2xs"><ChevronLeft size={14}/></button>
            <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)} className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 transition cursor-pointer shadow-2xs"><ChevronRight size={14}/></button>
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
            
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-400" />
                <h3 className="font-black text-xs uppercase tracking-wider">Offer Compliance Dossier</h3>
              </div>
              <button onClick={onClearDetail} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto pr-2 scrollbar-thin">
              
              {/* --- VERIFICATION & AUDIT ACTIONS BAR --- */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Moderation Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedOfferDetail.approval_status === "approved" ? "bg-emerald-100 text-emerald-800" :
                    selectedOfferDetail.approval_status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedOfferDetail.approval_status || "approved"}
                  </span>
                </div>

                {/* Verifier Attribution Stamp if available */}
                {selectedOfferDetail.approved_by && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shrink-0 text-xs ${
                      selectedOfferDetail.approved_by_model === "Staff" ? "bg-amber-600" : "bg-indigo-600"
                    }`}>
                      <Shield size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {selectedOfferDetail.approved_by?.name || "Admin"} <span className="text-[9px] font-normal text-slate-500">({selectedOfferDetail.approved_by_model || "Admin"})</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {selectedOfferDetail.approval_date ? new Date(selectedOfferDetail.approval_date).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection input field if rejected */}
                {showRejectInput ? (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <textarea
                      rows={2}
                      placeholder="Specify rejection reason..."
                      value={rejectionInput}
                      onChange={(e) => setRejectionInput(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    />
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setShowRejectInput(false)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (!rejectionInput.trim()) return alert("Provide a reason");
                          onActionTrigger && onActionTrigger("review_offer", { 
                            offerId: selectedOfferDetail._id, 
                            status: "rejected", 
                            rejectionReason: rejectionInput.trim() 
                          });
                          setShowRejectInput(false);
                          setRejectionInput("");
                        }}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      onClick={() => onActionTrigger && onActionTrigger("review_offer", { offerId: selectedOfferDetail._id, status: "approved" })}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition border border-rose-200 cursor-pointer"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Proportional Preview Container */}
              <div className="space-y-3">
                <div 
                  onClick={() => {
                    if (selectedOfferDetail.thumbnail) {
                      onActionTrigger && onActionTrigger("open_lightbox", { src: selectedOfferDetail.thumbnail, label: `${selectedOfferDetail.title} Banner` });
                    }
                  }}
                  className={`w-full aspect-[16/10] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-3 relative group ${selectedOfferDetail.thumbnail ? 'cursor-zoom-in' : ''}`}
                >
                  {selectedOfferDetail.thumbnail ? (
                    <>
                      <img src={selectedOfferDetail.thumbnail} className="w-full h-full object-contain" alt="" />
                      <div className="absolute bottom-2.5 right-2.5 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 size={12} />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600"><Percent size={28} /></div>
                  )}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-tight">{selectedOfferDetail.title}</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{selectedOfferDetail.description || "No layout descriptive parameters configured."}</p>
                </div>
              </div>

              {/* Threshold specifications display widgets grid slots */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1"><Sliders size={12} /> Campaign Configurations</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <div className="bg-white p-2.5 border rounded-xl"><span className="text-slate-400 block font-semibold text-[10px] mb-0.5">Discount %</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.discount_percentage ? `${selectedOfferDetail.discount_percentage}%` : "N/A"}</span></div>
                  <div className="bg-white p-2.5 border rounded-xl"><span className="text-slate-400 block font-semibold text-[10px] mb-0.5">Discount Flat</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.discount_value ? `₹${selectedOfferDetail.discount_value}` : "N/A"}</span></div>
                  <div className="bg-white p-2.5 border rounded-xl"><span className="text-slate-400 block font-semibold text-[10px] mb-0.5">Min Basket</span><span className="text-slate-800 text-xs font-black">₹{selectedOfferDetail.minimum_purchase_amount || 0}</span></div>
                  <div className="bg-white p-2.5 border rounded-xl"><span className="text-slate-400 block font-semibold text-[10px] mb-0.5">Redemption Hrs</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.redeem_time_hours || 24} hrs</span></div>
                  <div className="bg-white p-2.5 border rounded-xl"><span className="text-slate-400 block font-semibold text-[10px] mb-0.5">Claim Limit</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.claim_limit || "Unset"}</span></div>
                  <div className="bg-white p-2.5 border rounded-xl"><span className="text-slate-400 block font-semibold text-[10px] mb-0.5">Per User Limit</span><span className="text-slate-800 text-xs font-black">{selectedOfferDetail.per_user_limit || 1}</span></div>
                </div>

                {/* Additional Campaign Rules */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5 text-[10px] font-bold">
                  {selectedOfferDetail.only_for_walk_in_customers && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">Walk-In Customers Only</span>
                  )}
                  {selectedOfferDetail.qr_redemption_required && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md">QR Validation Required</span>
                  )}
                  {selectedOfferDetail.show_to_users_nearby_only && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">Nearby Users Radius</span>
                  )}
                </div>
              </div>

              {/* Merchant Details profile subcard */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 p-3 border-b text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Store size={13} className="text-indigo-600" /> Merchant Partner Profile</div>
                <div className="p-4 space-y-2 text-xs text-slate-600 bg-white font-medium">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-1">
                    {selectedOfferDetail.merchant_id?.store_name || selectedOfferDetail.merchant_id?.name || "Merchant Business Entity"} 
                    {selectedOfferDetail.merchant_id?.isVerified && <ShieldCheck size={14} className="text-emerald-500" />}
                  </div>
                  <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> <span>{selectedOfferDetail.merchant_id?.phone || "N/A"}</span></div>
                  <div className="flex items-center gap-2 truncate"><Mail size={13} className="text-slate-400" /> <span>{selectedOfferDetail.merchant_id?.email || "No email"}</span></div>
                  <div className="flex items-start gap-2 leading-relaxed"><MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> <span className="line-clamp-2">{selectedOfferDetail.merchant_id?.city || "City location not stamped"}</span></div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* --- MOCK PERFORMANCE INSIGHTS OVERVIEW CARD --- */
          <>
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xs space-y-5">
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

            {/* TOP PERFORMANCE RANKING LIST */}
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Top Performing Offers</h4>
                <button className="text-[11px] font-black text-indigo-600 uppercase hover:underline cursor-pointer">View All</button>
              </div>
              <div className="space-y-3">
                {topPerforming.map((top, idx) => (
                  <div key={`${top._id || 'top-offer'}-${idx}`} className="flex items-center justify-between gap-2 p-2 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-black text-slate-400 w-4">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-800 p-0.5">
                        <img src={top.thumbnail || "https://api.dicebear.com/7.x/initials/svg?seed=BB"} className="w-full h-full object-contain" alt="" />
                      </div>
                      <div className="min-w-0"><p className="text-xs font-extrabold text-slate-800 truncate max-w-[120px]">{top.title}</p><p className="text-[9px] font-bold text-slate-400 mt-0.5">{top.redemptions_count?.toLocaleString('en-IN')} redemptions</p></div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 shrink-0">↑ {top.conversionRate || "18.6%"}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default OffersManagementGrid;