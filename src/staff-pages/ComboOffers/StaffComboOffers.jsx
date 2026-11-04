import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Layers, Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight, 
  Eye, Check, X, Shield, Power, Maximize2, Download, Loader2, AlertCircle, 
  Store, RefreshCw, Tag, Calendar, Package
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const StaffComboOffersManager = ({ token }) => {
  // --- Core Lifecycle States ---
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // --- Pagination States ---
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // --- Filter & Search States ---
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'inactive'
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("ALL"); // 'ALL' | 'approved' | 'pending' | 'rejected'
  const [limit] = useState(10);

  // --- Inspection Drawer & Lightbox States ---
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [detailLoading, setDetailPaneLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // --- Rejection & Disable Prompt Input States ---
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionInput, setRejectionInput] = useState("");
  const [showDisableInput, setShowDisableInput] = useState(false);
  const [disableInput, setDisableInput] = useState("");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // ==========================================
  // PIPELINE 1: FETCH COMBO OFFERS LIST
  // ==========================================
  const fetchComboOffers = useCallback(async () => {
    try {
      setLoading(true);
      setGlobalError(null);

      const res = await accountClient.get("/staff/combo-offers", {
        headers,
        params: {
          page,
          limit,
          status: activeTab !== "all" ? activeTab : undefined,
          approval_status: approvalFilter !== "ALL" ? approvalFilter : undefined,
          search: searchTerm.trim() || undefined,
        },
      });

      if (res.data.success) {
        setCombos(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalItems(res.data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching admin combo offers:", err);
      setGlobalError("Failed to synchronize combo offers ledger.");
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, [headers, page, limit, activeTab, approvalFilter, searchTerm]);

  useEffect(() => {
    fetchComboOffers();
  }, [fetchComboOffers]);

  // Reset to page 1 on filter shifts
  useEffect(() => {
    setPage(1);
  }, [activeTab, approvalFilter, searchTerm]);

  // ==========================================
  // PIPELINE 2: INSPECTION DETAIL LOOKUP
  // ==========================================
  const fetchComboDetails = async (comboId) => {
    if (!comboId) return;
    try {
      setDetailPaneLoading(true);
      const res = await accountClient.get(`/staff/combo-offers/${comboId}`, { headers });
      if (res.data.success) {
        setSelectedCombo(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load combo details:", err);
      const fallback = combos.find((c) => c._id === comboId);
      setSelectedCombo(fallback || null);
    } finally {
      setDetailPaneLoading(false);
    }
  };

  // ==========================================
  // PIPELINE 3: MODERATION & REVIEW ACTIONS
  // ==========================================
  const handleReviewCombo = async (comboId, status, rejectionReason = "") => {
    try {
      const payload = { status };
      if (status === "rejected") {
        payload.rejection_reason = rejectionReason;
      }

      const res = await accountClient.patch(`/staff/combo-offers/${comboId}/review`, payload, { headers });
      if (res.data.success) {
        setSelectedCombo(res.data.data);
        fetchComboOffers();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update combo review status.");
    }
  };

  const handleDisableCombo = async (comboId, pauseReason = "Disabled by admin") => {
    try {
      const res = await accountClient.patch(`/staff/combo-offers/${comboId}/disable`, { pause_reason: pauseReason }, { headers });
      if (res.data.success) {
        setSelectedCombo(res.data.data);
        fetchComboOffers();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to disable combo offer campaign.");
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1750px] mx-auto space-y-6 bg-[#FBFBFE] min-h-screen font-sans text-slate-800">
      
      {/* HEADER & REFRESH ENGINE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 flex items-center gap-3 tracking-tight">
            <Layers className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Combo Offers Moderation Matrix
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Inspect, approve, or moderate merchant-curated combo packages and ad-hoc bundles.
          </p>
        </div>
        <button
          onClick={fetchComboOffers}
          disabled={loading}
          className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer flex items-center justify-center"
          title="Refresh Dataset"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {globalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 flex items-center gap-2.5">
          <AlertCircle size={16} /> {globalError}
        </div>
      )}

      {/* GRID & DRAWER SPLIT LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: TABLE LEDGER & FILTERS */}
        <div className={`${selectedCombo ? "xl:col-span-8" : "xl:col-span-12"} space-y-5 bg-white p-4 sm:p-6 rounded-[24px] border border-slate-200/80 shadow-xs transition-all duration-300`}>
          
          {/* TAB & APPROVAL FILTERS */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {[
                { label: "All Combos", key: "all" },
                { label: "Active", key: "active" },
                { label: "Inactive", key: "inactive" },
              ].map((tab, idx) => (
                <button
                  key={`${tab.key}-${idx}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search combos by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                />
              </div>

              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value="ALL">All Moderation Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm("");
                  setApprovalFilter("ALL");
                  setActiveTab("all");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* TABLE LEDGER */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 pb-3">Combo Name & Items</th>
                  <th className="px-4 pb-3">Merchant Partner</th>
                  <th className="px-4 pb-3">Validity Window</th>
                  <th className="px-4 pb-3 text-center">Moderation</th>
                  <th className="px-4 pb-3 text-center">Status</th>
                  <th className="w-16 pb-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-blue-600">
                      <Loader2 className="animate-spin inline-block mb-2" size={28} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Combo Offers...</p>
                    </td>
                  </tr>
                ) : combos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center font-bold text-slate-400 bg-slate-50/30 italic text-xs uppercase tracking-wider">
                      No combo offers matched your criteria.
                    </td>
                  </tr>
                ) : (
                  combos.map((combo, idx) => (
                    <tr
                      key={`${combo._id || 'combo'}-${idx}`}
                      onClick={() => fetchComboDetails(combo._id)}
                      className={`transition-colors border-b border-slate-100 cursor-pointer ${
                        selectedCombo?._id === combo._id ? "bg-blue-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                            {combo.products?.[0]?.image ? (
                              <img src={combo.products[0].image} className="w-full h-full object-contain" alt="" />
                            ) : (
                              <Package size={18} className="text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[200px]">
                            <p className="font-extrabold text-slate-900 truncate">{combo.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{combo.products?.length || 0} items included</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 truncate max-w-[130px] font-bold text-slate-700">
                        {combo.merchantId?.store_name || combo.merchantId?.name || "Merchant"}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {formatTimestamp(combo.start_date)} - {formatTimestamp(combo.end_date)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          combo.approval_status === "approved" ? "bg-emerald-100 text-emerald-800" :
                          combo.approval_status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {combo.approval_status || "approved"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          combo.is_active ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-100 text-slate-500"
                        }`}>
                          {combo.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchComboDetails(combo._id);
                          }}
                          className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition shadow-2xs cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
            <p>Page <span className="text-slate-800">{page}</span> of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-35 transition cursor-pointer shadow-2xs"><ChevronLeft size={14}/></button>
              <button disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-35 transition cursor-pointer shadow-2xs"><ChevronRight size={14}/></button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: INSPECTION & MODERATION DOSSIER DRAWER */}
        {selectedCombo && (
          <div className="xl:col-span-4 bg-white rounded-[24px] border border-slate-200/80 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 sticky top-6">
            
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-400" />
                <h3 className="font-black text-xs uppercase tracking-wider">Combo Dossier & Moderation</h3>
              </div>
              <button onClick={() => setSelectedCombo(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto pr-2">
              
              {/* MODERATION ACTIONS BAR */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Approval Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedCombo.approval_status === "approved" ? "bg-emerald-100 text-emerald-800" :
                    selectedCombo.approval_status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedCombo.approval_status}
                  </span>
                </div>

                {/* Verifier Attribution Stamp */}
                {selectedCombo.approved_by && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shrink-0 text-xs ${
                      selectedCombo.approved_by_model === "Staff" ? "bg-amber-600" : "bg-blue-600"
                    }`}>
                      <Shield size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {selectedCombo.approved_by?.name || "Admin"} <span className="text-[9px] font-normal text-slate-500">({selectedCombo.approved_by_model})</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {selectedCombo.approval_date ? new Date(selectedCombo.approval_date).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                )}

                {showRejectInput ? (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <textarea
                      rows={2}
                      placeholder="Reason for rejection..."
                      value={rejectionInput}
                      onChange={(e) => setRejectionInput(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowRejectInput(false)} className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer">Cancel</button>
                      <button 
                        onClick={() => {
                          if (!rejectionInput.trim()) return alert("Provide a reason");
                          handleReviewCombo(selectedCombo._id, "rejected", rejectionInput.trim());
                          setShowRejectInput(false);
                          setRejectionInput("");
                        }}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : showDisableInput ? (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <textarea
                      rows={2}
                      placeholder="Reason for disabling..."
                      value={disableInput}
                      onChange={(e) => setDisableInput(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowDisableInput(false)} className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer">Cancel</button>
                      <button 
                        onClick={() => {
                          handleDisableCombo(selectedCombo._id, disableInput.trim() || "Disabled by admin");
                          setShowDisableInput(false);
                          setDisableInput("");
                        }}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Confirm Disable
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/60">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewCombo(selectedCombo._id, "approved")}
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
                    {selectedCombo.is_active && (
                      <button
                        onClick={() => setShowDisableInput(true)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                      >
                        <Power size={13} /> Disable / Pause Combo
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* COMBO DETAILS */}
              <div className="space-y-3">
                <h4 className="text-base font-black text-slate-900 leading-tight">{selectedCombo.name}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{selectedCombo.description}</p>
              </div>

              {/* INCLUDED PRODUCTS LIST */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Included Items ({selectedCombo.products?.length || 0})</span>
                <div className="space-y-2">
                  {selectedCombo.products?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image && (
                          <div 
                            onClick={() => setLightboxImage({ src: item.image, label: item.name })}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-zoom-in"
                          >
                            <img src={item.image} className="w-full h-full object-contain" alt="" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400">Qty: {item.quantity} {item.weight_size ? `• ${item.weight_size}` : ""}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">₹{item.combo_price}</p>
                        <p className="text-[10px] text-slate-400 line-through">₹{item.original_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TERMS & CONDITIONS */}
              <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">Terms & Conditions</span>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedCombo.terms_and_conditions}</p>
              </div>

              {/* MERCHANT PROFILE */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 p-3 border-b text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Store size={13} className="text-blue-600" /> Merchant Partner Profile</div>
                <div className="p-4 space-y-2 text-xs text-slate-600 bg-white font-medium">
                  <div className="font-black text-sm text-slate-900">{selectedCombo.merchantId?.store_name || selectedCombo.merchantId?.name || "Merchant Entity"}</div>
                  <p className="text-slate-500">{selectedCombo.merchantId?.email || "No email"}</p>
                  <p className="text-slate-500">{selectedCombo.merchantId?.phone || "No phone"}</p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-5xl mx-auto">
            <span className="text-white font-black text-xs uppercase tracking-wider bg-black/40 px-3.5 py-2 rounded-xl border border-white/10">{lightboxImage.label}</span>
            <button onClick={() => setLightboxImage(null)} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"><X size={16} /></button>
          </div>
          <div className="w-full h-full flex items-center justify-center p-4 max-w-5xl max-h-[80vh]" onClick={(e) => { if (e.target === e.currentTarget) setLightboxImage(null); }}>
            <img src={lightboxImage.src} alt={lightboxImage.label} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10" />
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffComboOffersManager;