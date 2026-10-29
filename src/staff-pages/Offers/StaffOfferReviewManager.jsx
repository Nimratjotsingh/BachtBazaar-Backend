import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check, X, Search, Filter, Layers, Inbox, AlertCircle,
  Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, Info,
  RotateCcw, Eye, Store, Calendar, MapPin, Percent, DollarSign,
  Image as ImageIcon, Upload, Sparkles, RefreshCw, CheckCircle2,
  XCircle, Clock, ShieldAlert, Edit3
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminOfferReviewDashboard = ({ token }) => {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' (Pending Review) | 'all' (Master Catalog)
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customImageFilter, setCustomImageFilter] = useState("all"); // 'all' | 'custom' | 'template'

  // Detailed Offer Inspection Modal State
  const [inspectedOffer, setInspectedOffer] = useState(null);

  // Rejection Dialogue State
  const [rejectingOffer, setRejectingOffer] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Admin Thumbnail Replace Modal State
  const [editingThumbnailOffer, setEditingThumbnailOffer] = useState(null);
  const [replacementImageFile, setReplacementImageFile] = useState(null);
  const [replacementImagePreview, setReplacementImagePreview] = useState(null);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // =========================================================
  // PIPELINE 1: FETCH DATA
  // =========================================================
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
      };

      if (activeTab === "queue") {
        params.status = "pending";
      } else if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      if (customImageFilter === "custom") params.isCustomImage = "true";
      if (customImageFilter === "template") params.isCustomImage = "false";

      const res = await accountClient.get("/staff/offers/review-queue", {
        params,
        headers,
      });

      if (res.data.success) {
        setOffers(res.data.data || []);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error("Error loading offer review queue:", err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, statusFilter, customImageFilter, searchTerm, headers]);

  useEffect(() => {
    setPage(1);
    fetchOffers();
  }, [activeTab, statusFilter, customImageFilter]);

  useEffect(() => {
    fetchOffers();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOffers();
  };

  // =========================================================
  // PIPELINE 2: REVIEW DECISION (APPROVE / REJECT / REVERT)
  // =========================================================
  const handleReviewAction = async (offerId, targetStatus, reason = "") => {
    if (targetStatus === "rejected" && !reason.trim()) {
      alert("A clear rejection feedback reason is required.");
      return;
    }

    try {
      setSubmittingAction(true);

      const payload = {
        status: targetStatus,
        rejection_reason: reason.trim() || undefined,
      };

      const res = await accountClient.patch(`/staff/offers/${offerId}/review`, payload, {
        headers,
      });

      if (res.data.success) {
        // Update item in local list
        setOffers((prev) =>
          prev.map((o) => (o._id === offerId ? { ...o, ...res.data.data } : o))
        );

        if (inspectedOffer && inspectedOffer._id === offerId) {
          setInspectedOffer(res.data.data);
        }

        setRejectingOffer(null);
        setRejectionReason("");

        if (activeTab === "queue") {
          fetchOffers();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to commit offer review decision.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // =========================================================
  // PIPELINE 3: ADMIN THUMBNAIL OVERWRITE
  // =========================================================
  const handleThumbnailFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplacementImageFile(file);
      setReplacementImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveThumbnail = async (e) => {
    e.preventDefault();
    if (!editingThumbnailOffer || !replacementImageFile) return;

    try {
      setSubmittingAction(true);
      const data = new FormData();
      data.append("thumbnail", replacementImageFile);
      data.append("isCustomImage", "false"); // Marked as admin-verified/overridden

      const res = await accountClient.patch(
        `/staff/offers/${editingThumbnailOffer._id}/thumbnail`,
        data,
        {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data.success) {
        setOffers((prev) =>
          prev.map((o) =>
            o._id === editingThumbnailOffer._id
              ? { ...o, thumbnail: res.data.data.thumbnail, isCustomImage: false }
              : o
          )
        );

        if (inspectedOffer && inspectedOffer._id === editingThumbnailOffer._id) {
          setInspectedOffer((prev) => ({
            ...prev,
            thumbnail: res.data.data.thumbnail,
            isCustomImage: false,
          }));
        }

        setEditingThumbnailOffer(null);
        setReplacementImageFile(null);
        setReplacementImagePreview(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update offer graphic artwork.");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto text-slate-800 antialiased font-sans bg-[#F8FAFC] min-h-screen">
      {/* Upper Brand Info Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="text-blue-600" size={32} /> Promotional Offers Review Console
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Moderate custom campaign artwork, audit deal discounts, and verify merchant promotions
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOffers}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Offer Feed"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/60">
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "queue"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Review Pipeline
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Master Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Filter Matrix Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search offers by title, tags, or merchant description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
          {/* Custom Artwork Filter */}
          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <ImageIcon size={14} className="text-slate-400 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer pr-2"
              value={customImageFilter}
              onChange={(e) => setCustomImageFilter(e.target.value)}
            >
              <option value="all">All Image Sources</option>
              <option value="custom">Custom Merchant Uploads</option>
              <option value="template">Standard Template Graphic</option>
            </select>
          </div>

          {/* Status Filter (Only in Master Catalog) */}
          {activeTab === "all" && (
            <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer pr-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Verification Statuses</option>
                <option value="approved">Approved & Active</option>
                <option value="pending">Pending Moderation</option>
                <option value="rejected">Rejected / Blocked</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Ledger Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Promotional Campaign Particulars</th>
                <th className="px-6 py-4">Originating Merchant</th>
                <th className="px-6 py-4">Discount Structure</th>
                <th className="px-6 py-4">Artwork Origin</th>
                <th className="px-6 py-4 text-center">Verification Status</th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Syncing Promotional Pipeline...
                    </p>
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic">
                    <Inbox className="mx-auto mb-2 text-slate-300" size={36} />
                    No promotional campaign entities matched the active criteria.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer._id} className="hover:bg-slate-50/40 transition-colors group">
                    {/* Title & Artwork Thumbnail */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 group/thumb">
                          {offer.thumbnail ? (
                            <img src={offer.thumbnail} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={20} className="text-slate-300" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingThumbnailOffer(offer);
                              setReplacementImagePreview(offer.thumbnail);
                              setReplacementImageFile(null);
                            }}
                            className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-all cursor-pointer"
                            title="Replace Artwork Image"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => setInspectedOffer(offer)}
                            className="font-extrabold text-slate-900 text-xs hover:text-blue-600 text-left line-clamp-1 transition-colors cursor-pointer"
                          >
                            {offer.title}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {offer.display_type}
                            </span>
                            {offer.tags?.length > 0 && (
                              <span className="text-[10px] text-blue-600 font-bold">
                                #{offer.tags[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Merchant Details */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800 text-xs line-clamp-1">
                          {offer.merchant_id?.businessName || offer.merchant_id?.name || "Merchant"}
                        </p>
                        <p className="text-slate-400 text-[11px] font-mono">
                          {offer.merchant_id?.phone || "No phone registered"}
                        </p>
                      </div>
                    </td>

                    {/* Discount Value */}
                    <td className="px-6 py-4">
                      {offer.discount_percentage ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-black inline-flex items-center gap-1">
                          <Percent size={12} /> {offer.discount_percentage}% OFF
                        </span>
                      ) : offer.discount_value ? (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-black inline-flex items-center gap-1">
                          <DollarSign size={12} /> ₹{offer.discount_value} FLAT
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Free/Custom Deal</span>
                      )}
                    </td>

                    {/* Artwork Origin Indicator */}
                    <td className="px-6 py-4">
                      {offer.isCustomImage ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                          <ShieldAlert size={12} className="text-purple-500" /> Custom Upload
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
                          <Sparkles size={12} className="text-slate-400" /> Standard Template
                        </span>
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                          offer.approval_status === "approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : offer.approval_status === "pending"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-red-50 text-red-600 border-red-100"
                        }`}
                      >
                        {offer.approval_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectedOffer(offer)}
                          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition bg-white cursor-pointer shadow-xs"
                          title="View Full Offer Specification"
                        >
                          <Eye size={15} />
                        </button>

                        {offer.approval_status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => handleReviewAction(offer._id, "approved")}
                              className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:text-white hover:bg-emerald-600 border border-slate-200 hover:border-emerald-600 rounded-xl transition bg-white cursor-pointer shadow-xs disabled:opacity-50"
                              title="Approve & Publish Live"
                            >
                              <Check size={16} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => {
                                setRejectingOffer(offer);
                                setRejectionReason("");
                              }}
                              className="w-9 h-9 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-600 border border-slate-200 hover:border-red-600 rounded-xl transition bg-white cursor-pointer shadow-xs disabled:opacity-50"
                              title="Decline Offer"
                            >
                              <X size={16} strokeWidth={2.5} />
                            </button>
                          </>
                        ) : offer.approval_status === "approved" ? (
                          <button
                            type="button"
                            disabled={submittingAction}
                            onClick={() => handleReviewAction(offer._id, "pending")}
                            className="px-3 py-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-600 border border-slate-200 hover:border-amber-500 hover:bg-amber-50 rounded-xl transition bg-white cursor-pointer shadow-xs disabled:opacity-50"
                            title="Revert to Pending Review"
                          >
                            <RotateCcw size={12} strokeWidth={2.5} /> Unverify
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-xs cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-xs cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. INSPECTION MODAL DRAWER */}
      {/* ========================================================= */}
      {inspectedOffer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col justify-between animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-8 py-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    inspectedOffer.approval_status === "approved"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : inspectedOffer.approval_status === "pending"
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}
                >
                  {inspectedOffer.approval_status}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ID: {inspectedOffer._id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOffer(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Artwork Preview Card */}
                <div className="md:col-span-5 space-y-3">
                  <div className="w-full h-64 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                    {inspectedOffer.thumbnail ? (
                      <img
                        src={inspectedOffer.thumbnail}
                        alt="Offer Artwork"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <ImageIcon size={48} className="text-slate-300" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingThumbnailOffer(inspectedOffer);
                      setReplacementImagePreview(inspectedOffer.thumbnail);
                      setReplacementImageFile(null);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Edit3 size={14} /> Replace Artwork File
                  </button>
                </div>

                {/* Offer Details */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                      {inspectedOffer.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                      {inspectedOffer.description || "No promotional description provided."}
                    </p>
                  </div>

                  {/* Financial Highlights */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-black text-blue-600 uppercase block">
                        Discount Value
                      </span>
                      <strong className="text-slate-900 text-base block mt-0.5">
                        {inspectedOffer.discount_percentage
                          ? `${inspectedOffer.discount_percentage}% OFF`
                          : inspectedOffer.discount_value
                          ? `₹${inspectedOffer.discount_value} OFF`
                          : "Non-numeric"}
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">
                        Minimum Cart Value
                      </span>
                      <strong className="text-slate-900 text-base block mt-0.5">
                        ₹{inspectedOffer.minimum_purchase_amount || 0}
                      </strong>
                    </div>
                  </div>

                  {/* Merchant Info */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                      <Store size={12} /> Merchant Profile
                    </span>
                    <strong className="text-slate-800 text-xs block">
                      {inspectedOffer.merchant_id?.businessName ||
                        inspectedOffer.merchant_id?.name ||
                        "Independent Store"}
                    </strong>
                    <span className="text-slate-400 text-[11px] font-mono block">
                      {inspectedOffer.merchant_id?.email} • {inspectedOffer.merchant_id?.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timing, Geolocation, & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                    <Calendar size={12} /> Campaign Validity Window
                  </span>
                  <div className="font-bold text-slate-700">
                    {inspectedOffer.start_date
                      ? new Date(inspectedOffer.start_date).toLocaleDateString()
                      : "Open"}{" "}
                    -{" "}
                    {inspectedOffer.end_date
                      ? new Date(inspectedOffer.end_date).toLocaleDateString()
                      : "Indefinite"}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                    <MapPin size={12} /> Geolocation Coordinates
                  </span>
                  <div className="font-mono text-slate-700 font-bold">
                    Lat: {inspectedOffer.location?.coordinates?.[1] || "N/A"}, Lng:{" "}
                    {inspectedOffer.location?.coordinates?.[0] || "N/A"}
                  </div>
                </div>
              </div>

              {/* Rejection Notice (if rejected) */}
              {inspectedOffer.rejection_reason && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <strong className="block font-black uppercase tracking-wider text-[10px]">
                      Reason Declined
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{inspectedOffer.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-8 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectedOffer(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Drawer
              </button>

              <div className="flex items-center gap-3">
                {inspectedOffer.approval_status === "approved" ? (
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleReviewAction(inspectedOffer._id, "pending")}
                    className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} /> Revert To Pending
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => {
                        setRejectingOffer(inspectedOffer);
                        setRejectionReason("");
                      }}
                      className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    >
                      <X size={15} /> Decline Offer
                    </button>
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handleReviewAction(inspectedOffer._id, "approved")}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-100"
                    >
                      {submittingAction ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                      Authorize & Publish
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REJECTION FEEDBACK MODAL */}
      {/* ========================================================= */}
      {rejectingOffer && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <MessageSquare size={22} />
              <h3 className="text-lg font-black tracking-tight">Decline Promotional Offer</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium -mt-2">
              Explain why <strong>{rejectingOffer.title}</strong> fails platform guidelines. This feedback is sent directly to the merchant.
            </p>

            <textarea
              rows="4"
              className="w-full text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 resize-none font-medium text-slate-700 transition-all"
              placeholder="e.g., The custom image contains misleading pricing or low-resolution raster text..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRejectingOffer(null);
                  setRejectionReason("");
                }}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={submittingAction || !rejectionReason.trim()}
                onClick={() => handleReviewAction(rejectingOffer._id, "rejected", rejectionReason)}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-100"
              >
                {submittingAction ? <Loader2 className="animate-spin" size={14} /> : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ADMIN ARTWORK OVERWRITE MODAL */}
      {/* ========================================================= */}
      {editingThumbnailOffer && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-blue-600">
              <ImageIcon size={22} />
              <h3 className="text-lg font-black tracking-tight">Replace Offer Artwork</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium -mt-2">
              Overwrite low-quality or non-compliant merchant artwork for{" "}
              <strong>{editingThumbnailOffer.title}</strong>.
            </p>

            <form onSubmit={handleSaveThumbnail} className="space-y-4">
              <div className="w-full h-44 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                {replacementImagePreview ? (
                  <img
                    src={replacementImagePreview}
                    alt="Replacement Preview"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <ImageIcon size={32} className="text-slate-300" />
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileSelect}
                className="text-xs font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer w-full"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingThumbnailOffer(null);
                    setReplacementImageFile(null);
                    setReplacementImagePreview(null);
                  }}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !replacementImageFile}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-100"
                >
                  {submittingAction ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  Commit & Overwrite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOfferReviewDashboard;