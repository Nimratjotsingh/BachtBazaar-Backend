import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  
  Eye,
  X,

  LayoutGrid,
  List,
  Maximize2,
  ArrowLeft,

  Calendar,

  Save
} from 'lucide-react';
import { accountClient, buildAuthHeaders } from '../../lib/api.js';

const OfferReviewsManager = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Views & Layout Modes
  const [view, setView] = useState("list"); // 'list' | 'details'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspection & modal states
  const [selectedReview, setSelectedReview] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Root-Level Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Aggregate metrics computed for summary deck
  const metrics = useMemo(() => {
    const total = totalCount;
    const unread = reviews.filter((r) => r.status === 'unread').length;
    const reviewed = reviews.filter((r) => r.status === 'reviewed').length;
    const withImages = reviews.filter((r) => r.images && r.images.length > 0).length;
    const avgScore = reviews.length
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "5.0";

    return { total, unread, reviewed, withImages, avgScore };
  }, [reviews, totalCount]);

  // Fetch offer reviews stream
  const fetchReviews = useCallback(async () => {
    try {
      setError(null);
      const params = {
        page: currentPage,
        limit: 10,
      };

      if (statusFilter) params.status = statusFilter;
      if (ratingFilter) params.rating = ratingFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await accountClient.get("/offer-reviews/admin", {
        headers,
        params,
      });

      if (response.data.success) {
        setReviews(response.data.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      } else {
        throw new Error(response.data.message || "Failed to parse reviews payload.");
      }
    } catch (err) {
      console.error("Offer Review Streaming Exception:", err);
      setError("Unable to sync merchant offer reviews. Verify administrative token scopes.");
    } finally {
      setLoading(false);
    }
  }, [headers, currentPage, statusFilter, ratingFilter, searchQuery]);

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(fetchReviews, 30000);
    return () => clearInterval(interval);
  }, [fetchReviews]);

  // Keyboard shortcut (Ctrl + K focus search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('reviewSearchInput')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update status & notes handler
  const handleUpdateReview = async (reviewId, newStatus, notes) => {
    try {
      setIsUpdating(true);
      const response = await accountClient.patch(
        `/offer-reviews/admin/${reviewId}/status`,
        { status: newStatus, adminNotes: notes },
        { headers }
      );

      if (response.data.success) {
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? response.data.data : r))
        );
        if (selectedReview && selectedReview._id === reviewId) {
          setSelectedReview(response.data.data);
        }
      }
    } catch (err) {
      alert(`Update failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const openReviewDetails = (review) => {
    setSelectedReview(review);
    setAdminNoteInput(review.adminNotes || "");
    setView("details");
  };

  // CSV Export for feedback audit
  const handleExportCSV = () => {
    if (!reviews.length) return;
    const csvRows = [
      ["Review ID", "Merchant Name", "Merchant Phone", "Offer Title", "Rating", "Status", "Description", "Date"],
      ...reviews.map((r) => [
        r._id,
        `"${r.merchantId?.name || ''}"`,
        r.merchantId?.phone || '',
        `"${r.offerId?.title || ''}"`,
        r.rating,
        r.status,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        new Date(r.createdAt).toISOString()
      ])
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `BachatBazarr_OfferReviews_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE REVIEW DETAILS VIEW
          ========================================== */}
      {view === "details" && selectedReview && (
        <ReviewDetailsView
          review={selectedReview}
          adminNoteInput={adminNoteInput}
          setAdminNoteInput={setAdminNoteInput}
          isUpdating={isUpdating}
          onBack={() => { setView("list"); setSelectedReview(null); }}
          onUpdateStatus={handleUpdateReview}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: PRIMARY REVIEWS CATALOG
          ========================================== */}
      {view === "list" && (
        <div className="flex-1 bg-[#F8FAFC] p-4 sm:p-8 min-h-screen font-sans text-slate-700 animate-in fade-in duration-300 max-w-[1700px] mx-auto space-y-6">
          
          {/* Header */}
          <header className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
                <MessageSquare className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Offer Creation Reviews
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Audit merchant campaign feedback, triage post-creation bugs, and manage merchant experience scores.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => { setLoading(true); fetchReviews(); }} 
                className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl shadow-xs hover:bg-slate-50 transition cursor-pointer"
                title="Refresh Feedback Feed"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync Active</span>
              </div>

              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-50 cursor-pointer shadow-xs text-slate-700 transition"
              >
                <Download size={15} /> Export CSV
              </button>
            </div>
          </header>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2.5 shadow-xs">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-5">
            {[
              { label: 'Total Submitted', val: metrics.total.toLocaleString('en-IN'), trend: '100% logged', color: 'text-blue-600', icon: <MessageSquare size={18}/>, bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Unread Feedback', val: metrics.unread.toLocaleString('en-IN'), trend: `${metrics.unread} pending`, color: 'text-amber-600', icon: <Clock size={18}/>, bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Audited & Resolved', val: metrics.reviewed.toLocaleString('en-IN'), trend: 'Complete', color: 'text-emerald-600', icon: <CheckCircle size={18}/>, bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Mean Experience', val: `${metrics.avgScore} / 5`, trend: 'Satisfaction', color: 'text-purple-600', icon: <Star size={18}/>, bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'Visual Bug Reports', val: metrics.withImages.toLocaleString('en-IN'), trend: 'Screenshots', color: 'text-rose-600', icon: <ImageIcon size={18}/>, bg: 'bg-rose-50', border: 'border-rose-100' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <h3 className="text-lg sm:text-xl font-black font-mono text-slate-800 leading-none pt-0.5 sm:pt-1">{card.val}</h3>
                  <span className={`text-[10px] font-bold ${card.color}`}>{card.trend}</span>
                </div>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 border rounded-xl flex items-center justify-center shadow-inner p-1.5 sm:p-2 shrink-0 ${card.bg} ${card.color} ${card.border}`}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar & Layout Switcher */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  id="reviewSearchInput"
                  type="text" 
                  placeholder="Search reviews by description or merchant..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                />
                <kbd className="absolute right-2.5 top-2 text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border pointer-events-none select-none hidden sm:inline-block">Ctrl + K</kbd>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex-1 sm:flex-initial">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer w-full"
                  >
                    <option value="">All Triage States</option>
                    <option value="unread">Unread / Pending</option>
                    <option value="reviewed">Audited & Reviewed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex-1 sm:flex-initial">
                  <Star size={13} className="text-slate-400" />
                  <select
                    value={ratingFilter}
                    onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer w-full"
                  >
                    <option value="">All Rating Levels</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grid vs Table Layout Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end md:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setDisplayMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === "grid" 
                    ? "bg-white text-blue-600 shadow-xs" 
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
                    ? "bg-white text-blue-600 shadow-xs" 
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {loading && reviews.length === 0 ? (
                <div className="col-span-full py-28 text-center text-blue-600">
                  <Loader2 className="animate-spin mx-auto mb-2" size={36} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Streaming feedback ledger...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="col-span-full py-24 text-center font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[28px]">
                  <MessageSquare className="mx-auto mb-3 text-slate-300" size={44} />
                  <p className="text-sm">No offer reviews matched current criteria.</p>
                </div>
              ) : (
                reviews.map((rev) => {
                  const hasImage = rev.images && rev.images.length > 0;
                  const firstImage = hasImage ? rev.images[0] : null;

                  return (
                    <div
                      key={rev._id}
                      onClick={() => openReviewDetails(rev)}
                      className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Evidence Photo Aspect Box */}
                        <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-950 flex items-center justify-center p-3 sm:p-4 border-b border-slate-800 overflow-hidden">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              alt="Review Screenshot"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-600 gap-1.5">
                              <MessageSquare size={32} />
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Text Feedback Only</span>
                            </div>
                          )}

                          {/* Floating Rating Pill */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-xl shadow-2xs">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span className="text-xs font-black text-slate-900">{rev.rating}.0</span>
                          </div>

                          {/* Status Pill */}
                          <div className="absolute top-2.5 right-2.5 pointer-events-none">
                            {rev.status === 'unread' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                <Clock size={10} /> Unread
                              </span>
                            )}
                            {rev.status === 'reviewed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <CheckCircle size={10} /> Audited
                              </span>
                            )}
                            {rev.status === 'archived' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                                <Archive size={10} /> Archived
                              </span>
                            )}
                          </div>

                          {/* Fullscreen Trigger */}
                          {firstImage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({ src: firstImage, label: `${rev.merchantId?.name || 'Review'} - Evidence Photo` });
                              }}
                              className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Fullscreen Screenshot"
                            >
                              <Maximize2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-4 sm:p-5 space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-extrabold text-[#0F172A] text-sm truncate group-hover:text-blue-600 transition-colors">
                                {rev.merchantId?.name || "Merchant Partner"}
                              </h3>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-blue-600 font-bold mt-0.5">
                              {rev.merchantId?.phone || "No phone listed"}
                            </p>
                          </div>

                          {/* Offer Title */}
                          <div className="text-[11px] font-bold text-slate-700 truncate bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                            Offer: <span className="text-slate-900 font-extrabold">{rev.offerId?.title || "Campaign Reference"}</span>
                          </div>

                          {/* Review Statement */}
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-3 leading-relaxed">
                            "{rev.description || "No comment provided."}"
                          </p>

                          {/* Admin Resolution Note if present */}
                          {rev.adminNotes && (
                            <div className="text-[10px] bg-indigo-50/70 border border-indigo-100 text-indigo-900 px-2.5 py-1.5 rounded-xl font-medium leading-relaxed">
                              <span className="font-black uppercase text-[9px] text-indigo-600 block mb-0.5">Admin Note:</span>
                              {rev.adminNotes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="px-4 sm:px-5 pb-4 pt-1">
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Eye size={12} /> Inspect details
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReviewDetails(rev);
                            }}
                            className="px-3 py-1.5 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-xl transition cursor-pointer border border-blue-100 shadow-2xs"
                          >
                            Audit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* =========================================================
                VIEW MODE 2: TABLE LIST VIEW
                ========================================================= */
            <div className="bg-white border border-slate-200/80 rounded-[24px] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 min-w-[900px]">
                  <thead className="bg-slate-50/70 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5">Merchant Account</th>
                      <th className="px-5 py-3.5">Associated Offer</th>
                      <th className="px-5 py-3.5">Rating & Review</th>
                      <th className="px-5 py-3.5">Attachments</th>
                      <th className="px-5 py-3.5">Audit Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-16 text-slate-400 text-xs font-bold italic">
                          No offer creation feedback matches your current parameters.
                        </td>
                      </tr>
                    ) : (
                      reviews.map((rev) => (
                        <tr 
                          key={rev._id} 
                          onClick={() => openReviewDetails(rev)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        >
                          {/* Merchant Details */}
                          <td className="px-5 py-4 align-top">
                            <div className="font-extrabold text-slate-900 text-xs">{rev.merchantId?.name || "Merchant Owner"}</div>
                            <div className="text-[11px] font-bold text-blue-600 mt-0.5">{rev.merchantId?.phone || "N/A"}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{rev.merchantId?.email || ""}</div>
                          </td>

                          {/* Offer Campaign Snapshot */}
                          <td className="px-5 py-4 align-top">
                            <div className="font-extrabold text-slate-800 text-xs line-clamp-1">{rev.offerId?.title || "Campaign Reference"}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {rev.offerId?.display_type || "Standard"}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 font-mono">
                                ID: {rev.offerId?._id ? rev.offerId._id.slice(-6) : "N/A"}
                              </span>
                            </div>
                          </td>

                          {/* Rating & Description */}
                          <td className="px-5 py-4 align-top max-w-sm">
                            <div className="flex items-center gap-1 mb-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={12}
                                  className={s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                                />
                              ))}
                              <span className="text-[11px] font-black text-slate-800 ml-1.5">{rev.rating}.0</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed line-clamp-2 mt-1">{rev.description}</p>
                            {rev.adminNotes && (
                              <div className="mt-2 text-[10px] bg-indigo-50/60 border border-indigo-100 text-indigo-900 px-2 py-1 rounded-md font-semibold">
                                <span className="font-black uppercase text-[9px] text-indigo-500 mr-1">Note:</span>
                                {rev.adminNotes}
                              </div>
                            )}
                          </td>

                          {/* Uploaded Evidence */}
                          <td className="px-5 py-4 align-top">
                            {rev.images && rev.images.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {rev.images.map((img, idx) => (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxImage({ src: img, label: `${rev.merchantId?.name || 'Review'} - Evidence Photo ${idx + 1}` });
                                    }}
                                    className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-900 overflow-hidden p-0.5 cursor-zoom-in hover:opacity-80 transition shrink-0"
                                  >
                                    <img src={img} alt="Attachment" className="w-full h-full object-contain" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-bold italic">No Media</span>
                            )}
                          </td>

                          {/* Status Pill */}
                          <td className="px-5 py-4 align-top">
                            {rev.status === 'unread' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={10} /> Unread
                              </span>
                            )}
                            {rev.status === 'reviewed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle size={10} /> Audited
                              </span>
                            )}
                            {rev.status === 'archived' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                <Archive size={10} /> Archived
                              </span>
                            )}
                            <p className="text-[10px] font-semibold text-slate-400 mt-1">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </p>
                          </td>

                          {/* Action Button */}
                          <td className="px-5 py-4 align-top text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReviewDetails(rev);
                              }}
                              className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer border border-blue-100 shadow-2xs"
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table Pagination Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer shadow-2xs transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer shadow-2xs transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ROOT LEVEL FULLSCREEN IMAGE LIGHTBOX MODAL --- */}
      {lightboxImage && (
        <ImageLightboxModal 
          image={lightboxImage} 
          onClose={() => setLightboxImage(null)} 
        />
      )}
    </>
  );
};

// =========================================================
// SUB-COMPONENT: SINGLE REVIEW AUDIT DETAILS VIEW
// =========================================================
const ReviewDetailsView = ({
  review,
  adminNoteInput,
  setAdminNoteInput,
  isUpdating,
  onBack,
  onUpdateStatus,
  onOpenLightbox
}) => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Feedback Feed
        </button>

        <div className="flex items-center gap-2">
          {review.status === 'unread' && (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase">
              Awaiting Audit
            </span>
          )}
          {review.status === 'reviewed' && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase">
              Audited & Resolved
            </span>
          )}
          {review.status === 'archived' && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Main Inspection Container */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6 p-6 sm:p-8">
        
        {/* Rating Header & Submission Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={20}
                  className={s <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                />
              ))}
            </div>
            <span className="text-xl font-black text-slate-900 ml-1">{review.rating}.0</span>
          </div>

          <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
            <Calendar size={13} />
            <span>Logged on {new Date(review.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Target Profile and Campaign Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Originating Merchant
            </span>
            <p className="font-extrabold text-slate-900 text-sm">
              {review.merchantId?.name || "Merchant Owner"}
            </p>
            <p className="text-xs font-mono font-bold text-blue-600">
              {review.merchantId?.phone || "No phone listed"}
            </p>
            <p className="text-xs text-slate-400">
              {review.merchantId?.email || "No email listed"}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Linked Offer Campaign
            </span>
            <p className="font-extrabold text-slate-900 text-sm truncate">
              {review.offerId?.title || "Campaign Reference"}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Display Type: <strong className="text-slate-700 uppercase">{review.offerId?.display_type || "Standard"}</strong>
            </p>
            <p className="text-xs font-mono text-slate-400">
              ID: {review.offerId?._id || "N/A"}
            </p>
          </div>
        </div>

        {/* Review Text Statement */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Merchant Review & Experience Statement
          </span>
          <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
            "{review.description || "No comment provided."}"
          </div>
        </div>

        {/* Uploaded Evidence Screenshots Gallery (Edge-to-Edge Containment) */}
        {review.images && review.images.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Attached Incident & Evidence Screenshots ({review.images.length})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {review.images.map((imgSrc, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenLightbox(imgSrc, `${review.merchantId?.name || 'Review'} - Evidence Photo ${idx + 1}`)}
                  className="relative aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 p-2 flex items-center justify-center cursor-pointer group shadow-2xs"
                >
                  <img
                    src={imgSrc}
                    alt={`Screenshot ${idx + 1}`}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={16} className="text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Administrative Resolution Note Field */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Internal Administrative Resolution Notes
          </label>
          <textarea
            rows={3}
            value={adminNoteInput}
            onChange={(e) => setAdminNoteInput(e.target.value)}
            placeholder="Document remediation steps, customer outreach details, or bug fixes..."
            className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
          />
        </div>

        {/* Bottom Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(review._id, "reviewed", adminNoteInput)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle size={14} /> Mark Audited
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(review._id, "archived", adminNoteInput)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Archive size={14} /> Archive
            </button>
          </div>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(review._id, review.status, adminNoteInput)}
            className="px-4 py-2.5 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Notes
          </button>
        </div>

      </div>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: FULLSCREEN IMAGE LIGHTBOX MODAL
// =========================================================
const ImageLightboxModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Lightbox Controls Top Toolbar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-5xl mx-auto">
        <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-[200px] sm:max-w-md bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
          {image.label || "Review Evidence Screenshot"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="review-attachment.jpg"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Graphic"
          >
            <Download size={16} />
          </a>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Close Fullscreen View"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scaled Center Image Fitted for Handheld & Desktop Screens */}
      <div 
        className="w-full h-full flex items-center justify-center p-2 sm:p-4 max-w-[95vw] sm:max-w-5xl max-h-[80vh]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={image.src}
          alt={image.label}
          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none animate-in zoom-in-95 duration-200"
        />
      </div>
    </div>
  );
};

export default OfferReviewsManager;