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
  Info,
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Tag
} from 'lucide-react';
import { accountClient, buildAuthHeaders } from '../../lib/api.js';

const OfferReviewsManager = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);

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
  const [previewImage, setPreviewImage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        setSelectedReview(null);
      }
    } catch (err) {
      alert(`Update failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUpdating(false);
    }
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

  if (loading && reviews.length === 0) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-indigo-600">
        <Loader2 className="animate-spin mb-3" size={40} />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Streaming Offer Creation Reviews...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 min-h-screen font-sans text-slate-700 animate-in fade-in duration-300">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 gap-4">
        <div className="relative w-full xl:w-96 group">
          <Search className="absolute left-3 top-2.5 text-slate-400 size-5 group-focus-within:text-blue-500 transition-colors" />
          <input 
            id="reviewSearchInput"
            type="text" 
            placeholder="Search reviews by description or merchant..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-24 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
          <kbd className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border shadow-inner pointer-events-none select-none">Ctrl + K</kbd>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => { setLoading(true); fetchReviews(); }} 
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-lg shadow-sm hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Feedback Feed"
          >
            <RefreshCw size={16} />
          </button>
          
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer shadow-sm text-slate-700 transition"
          >
            <Download size={16} /> Export Feedback
          </button>

          <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-black leading-tight text-slate-900">Owner Terminal</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</p>
            </div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 shadow-inner" alt="Admin Profile" />
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2.5 shadow-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* --- TOP METRICS CARDS LAYER --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Submitted', val: metrics.total.toLocaleString('en-IN'), trend: '100% logged', color: 'text-blue-600', icon: <MessageSquare size={18}/>, bg: 'bg-blue-50', lineClass: 'border-blue-400' },
          { label: 'Unread Feedback', val: metrics.unread.toLocaleString('en-IN'), trend: `${metrics.unread} action items`, color: 'text-amber-600', icon: <Clock size={18}/>, bg: 'bg-amber-50', lineClass: 'border-amber-400' },
          { label: 'Audited & Resolved', val: metrics.reviewed.toLocaleString('en-IN'), trend: 'Complete', color: 'text-emerald-600', icon: <CheckCircle size={18}/>, bg: 'bg-emerald-50', lineClass: 'border-emerald-400' },
          { label: 'Mean Experience Score', val: `${metrics.avgScore} / 5`, trend: 'Satisfaction', color: 'text-purple-600', icon: <Star size={18}/>, bg: 'bg-purple-50', lineClass: 'border-purple-400' },
          { label: 'Visual Bug Reports', val: metrics.withImages.toLocaleString('en-IN'), trend: 'Attachments', color: 'text-rose-600', icon: <ImageIcon size={18}/>, bg: 'bg-rose-50', lineClass: 'border-rose-400' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`${card.bg} ${card.color} p-2.5 rounded-xl border border-transparent shadow-sm`}>{card.icon}</div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1.5">{card.label}</p>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">{card.val}</span>
                  <span className={`text-[10px] font-black tracking-wide ${card.color}`}>{card.trend}</span>
                </div>
              </div>
            </div>
            <div className="h-6 w-full bg-slate-50/50 rounded mt-3 flex items-end overflow-hidden border border-slate-100/60 shadow-inner">
              <div className={`w-full h-[40%] border-b-2 ${card.lineClass} border-dashed opacity-50`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MIDDLE ROW: FILTERS & CONTROL PANEL --- */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider">
            <Filter size={14} className="text-slate-400" />
            <span>Audit Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Triage States</option>
            <option value="unread">Unread / Pending</option>
            <option value="reviewed">Audited & Reviewed</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Rating Levels</option>
            <option value="5">5 Stars (Excellent)</option>
            <option value="4">4 Stars (Good)</option>
            <option value="3">3 Stars (Average)</option>
            <option value="2">2 Stars (Poor)</option>
            <option value="1">1 Star (Critical Issues)</option>
          </select>

          {(statusFilter || ratingFilter || searchQuery) && (
            <button
              onClick={() => { setStatusFilter(""); setRatingFilter(""); setSearchQuery(""); setCurrentPage(1); }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs font-extrabold text-slate-400">
          Showing <span className="text-slate-900">{reviews.length}</span> of {totalCount} records
        </div>
      </div>

      {/* --- REVIEWS DATA TABLE --- */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
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
                  <td colSpan="6" className="text-center py-12 text-slate-400 text-xs font-bold italic">
                    No offer creation feedback matches your current parameters.
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => (
                  <tr key={rev._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Merchant Details */}
                    <td className="px-5 py-4 align-top">
                      <div className="font-extrabold text-slate-900 text-xs">{rev.merchantId?.name || "Merchant Owner"}</div>
                      <div className="text-[11px] font-bold text-blue-600 mt-0.5">{rev.merchantId?.phone || "N/A"}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{rev.merchantId?.email || ""}</div>
                    </td>

                    {/* Offer Campaign Snapshot */}
                    <td className="px-5 py-4 align-top">
                      <div className="font-extrabold text-slate-800 text-xs line-clamp-1">{rev.offerId?.title || "Campaign Asset"}</div>
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

                    {/* Uploaded Evidence / Screenshots */}
                    <td className="px-5 py-4 align-top">
                      {rev.images && rev.images.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {rev.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(img)}
                              className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden shadow-inner hover:opacity-80 transition cursor-pointer"
                            >
                              <img src={img} alt="Attachment" className="w-full h-full object-cover" />
                            </button>
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
                        onClick={() => {
                          setSelectedReview(rev);
                          setAdminNoteInput(rev.adminNotes || "");
                        }}
                        className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer border border-blue-100 shadow-sm"
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

        {/* Table Pagination Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- AUDIT / REVIEW RESOLUTION MODAL --- */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase flex items-center gap-2">
                Merchant Feedback Audit
              </h3>
              <button 
                onClick={() => setSelectedReview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400">Target Merchant Profile</p>
                <p className="text-xs font-black text-slate-900 mt-0.5">
                  {selectedReview.merchantId?.name} ({selectedReview.merchantId?.phone})
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  Offer: {selectedReview.offerId?.title || "Campaign Reference"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Full Merchant Review Statement</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700 leading-relaxed max-h-36 overflow-y-auto">
                  {selectedReview.description}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Internal Administrative Resolution Note
                </label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Document resolution steps, system actions, or phone call details..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateReview(selectedReview._id, "reviewed", adminNoteInput)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Mark Audited
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateReview(selectedReview._id, "archived", adminNoteInput)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Archive
                </button>
              </div>

              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleUpdateReview(selectedReview._id, selectedReview.status, adminNoteInput)}
                className="px-3 py-2 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SCREENSHOT LIGHTBOX MODAL --- */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 transition"
            >
              <X size={24} />
            </button>
            <img src={previewImage} alt="Attachment Full View" className="rounded-xl object-contain max-h-[80vh] w-auto shadow-2xl" />
          </div>
        </div>
      )}

      {/* --- MICRO INSIGHTS FOOTER SUMMARY BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: 'Feedback Sentiment Index', val: `${metrics.avgScore}/5 Experience Index`, icon: '🎯' },
          { label: 'Primary Feedback Trigger', val: 'Post-Campaign Creation Screen', icon: '⚡' },
          { label: 'Unresolved Workflow Friction', val: `${metrics.unread} Items in Queue`, icon: '🚨' },
          { label: 'Audit Resolution Velocity', val: `${metrics.reviewed} Reviewed Entries`, icon: '⏱️' },
          { label: 'Diagnostic Attachments', val: `${metrics.withImages} Incident Screenshots`, icon: '📷' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
            <span className="text-xl flex-shrink-0 bg-slate-50 p-1.5 rounded-lg border border-slate-100/50 shadow-inner">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-[9px] leading-none text-slate-400 font-black uppercase tracking-wider mb-1 truncate">{item.label}</p>
              <p className="text-xs font-black text-slate-800 truncate leading-snug">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default OfferReviewsManager;