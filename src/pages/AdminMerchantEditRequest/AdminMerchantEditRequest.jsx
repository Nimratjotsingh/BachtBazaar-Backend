import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ShieldCheck, Search, Filter, CheckCircle2, 
  XCircle, Loader2, AlertCircle, X, RefreshCw, 
  Eye, Check, ChevronLeft, ChevronRight, User, Building2, FileText, ArrowUpRight
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminMerchantEditRequests = ({ token }) => {
  // --- Core Lifecycle States ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // --- Pagination States ---
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // --- Filter View States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // 'pending' | 'allowed' | 'rejected' | 'consumed' | 'all'

  // --- Inspection & Review Drawer States ---
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [merchantDetails, setMerchantDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [adminNotesInput, setAdminNotesInput] = useState("");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // =========================================================
  // PIPELINE 1: FETCH EDIT REQUESTS LEDGER
  // =========================================================
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setGlobalError(null);

      const params = {
        page,
        limit: 10,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      const res = await accountClient.get("/admin/merchant-edit-request", {
        headers,
        params,
      });
      console.log(res.data)

      if (res.data.success) {
        setRequests(res.data.data || []);
        setTotalPages(res.data.pages || 1);
        setTotalItems(res.data.total || 0);
      }
    } catch (err) {
      console.error("Fetch Merchant Edit Requests Error:", err);
      setGlobalError("Failed to collect merchant profile edit requests ledger.");
    } finally {
      setLoading(false);
    }
  }, [headers, page, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Reset to page 1 on filter modification
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // =========================================================
  // PIPELINE 2: INSPECT MERCHANT COMPLETE DETAILS
  // =========================================================
  const handleOpenInspection = async (requestItem) => {
    setSelectedRequest(requestItem);
    setAdminNotesInput(requestItem.adminNotes || "");
    setMerchantDetails(null);

    const mId = requestItem.merchantId?._id || requestItem.merchantId;
    if (!mId) return;

    try {
      setDetailsLoading(true);
      const res = await accountClient.get(`/admin/merchants/${mId}/complete-details`, { headers });
      if (res.data.success) {
        setMerchantDetails(res.data.data);
      }
    } catch (err) {
      console.error("Fetch Merchant Complete Details Error:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeInspection = () => {
    setSelectedRequest(null);
    setMerchantDetails(null);
    setAdminNotesInput("");
  };

  // =========================================================
  // PIPELINE 3: REVIEW MUTATION (ALLOW / DECLINE)
  // =========================================================
  const handleReviewAction = async (action) => { // action: "allowed" or "rejected"
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      setGlobalError(null);

      const payload = {
        action,
        adminNotes: adminNotesInput.trim() || undefined,
      };

      const res = await accountClient.patch(
        `/admin/merchant-edit-request/${selectedRequest._id}/review`,
        payload,
        { headers }
      );

      if (res.data.success) {
        closeInspection();
        fetchRequests();
      }
    } catch (err) {
      console.error("Review Edit Request Error:", err);
      alert(err.response?.data?.message || "Failed to process review action.");
    } finally {
      setActionLoading(false);
    }
  };

  // Search filter applied locally for quick testing
  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.toLowerCase();
    return requests.filter(req => {
      const mName = req.merchantId?.name?.toLowerCase() || "";
      const mPhone = req.merchantId?.phone || "";
      const mEmail = req.merchantId?.email?.toLowerCase() || "";
      return mName.includes(term) || mPhone.includes(term) || mEmail.includes(term);
    });
  }, [requests, searchTerm]);

  return (
    <div className="p-8 space-y-6 max-w-[1750px] mx-auto text-slate-800 antialiased bg-slate-50/40 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <ShieldCheck className="text-blue-600 w-7 h-7" />
            Merchant Profile Edit Requests
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">
            Review, allow, or decline merchant profile modification requests and inspect complete business credentials
          </p>
        </div>
        <button 
          onClick={fetchRequests} 
          className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-xl transition cursor-pointer shadow-2xs"
          title="Refresh Ledger"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {globalError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertCircle size={16} /> {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* --- LEFT HAND PANEL: REQUESTS LEDGER TABLE / CARDS --- */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search by merchant name, phone or email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none text-slate-700" 
              />
            </div>
            <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
              <Filter size={13} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="allowed">Allowed (Approved)</option>
                <option value="rejected">Declined</option>
                <option value="consumed">Consumed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-24 text-center text-blue-600 shadow-xs">
              <Loader2 className="animate-spin inline-block mb-2" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Edit Requests Ledger...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-slate-100 p-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                  No edit requests found under current filter parameters.
                </div>
              ) : (
                filteredRequests.map((reqItem) => {
                  const isSelected = selectedRequest?._id === reqItem._id;
                  const merchant = reqItem.merchantId;

                  return (
                    <div 
                      key={reqItem._id} 
                      onClick={() => handleOpenInspection(reqItem)}
                      className={`bg-white rounded-[24px] border p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all cursor-pointer ${
                        isSelected 
                          ? "border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/10" 
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            reqItem.status === "pending"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : reqItem.status === "allowed"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : reqItem.status === "rejected"
                              ? "bg-rose-50 text-rose-600 border-rose-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {reqItem.status}
                          </span>
                          <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 rounded-md px-2 py-0.5 tracking-wider">
                            Target: {reqItem.targetModel}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {new Date(reqItem.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                            <User size={13} className="text-blue-500" />
                            {merchant?.name || "Merchant Owner"}
                            <span className="text-xs font-mono font-bold text-slate-400">({merchant?.phone || "No phone"})</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-mono">
                            Fields proposed: <strong className="text-slate-800">{Object.keys(reqItem.proposedChanges || {}).join(", ")}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end w-full md:w-auto">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInspection(reqItem);
                          }}
                          className={`px-3.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${
                            isSelected 
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                              : "text-blue-600 hover:bg-blue-50 bg-blue-50/50 border-blue-100"
                          }`}
                        >
                          <Eye size={13} /> Inspect & Review
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && totalItems > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Page {page} of {totalPages} ({totalItems} total requests)</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer shadow-2xs transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer shadow-2xs transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- RIGHT HAND PANEL: INSPECTION & REVIEW SIDEBAR --- */}
        <div className="xl:col-span-5 bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm sticky top-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600"/> 
                Request Audit & Merchant Dossier
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedRequest ? "Review proposed changes against merchant records" : "Select an edit request to inspect details"}
              </p>
            </div>
            {selectedRequest && (
              <button 
                type="button"
                onClick={closeInspection} 
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                title="Close Inspection"
              >
                <X size={14}/>
              </button>
            )}
          </div>

          {!selectedRequest ? (
            <div className="py-24 text-center text-slate-400 text-xs font-bold uppercase tracking-wider border-2 border-dashed border-slate-100 rounded-2xl">
              No request selected for audit.
            </div>
          ) : detailsLoading ? (
            <div className="py-24 text-center text-blue-600">
              <Loader2 className="animate-spin inline-block mb-2" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Merchant Dossier...</p>
            </div>
          ) : (
            <div className="space-y-5 text-xs text-slate-700">
              
              {/* Request Status & Metadata */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Request Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    selectedRequest.status === "pending" ? "bg-amber-100 text-amber-700" :
                    selectedRequest.status === "allowed" ? "bg-emerald-100 text-emerald-700" :
                    selectedRequest.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-700"
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Entity</span>
                  <strong className="text-slate-800">{selectedRequest.targetModel}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Submitted On</span>
                  <span className="font-mono text-slate-600">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Proposed Changes Diff Card */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">
                  Proposed Changes (Payload Diff)
                </label>
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl font-mono text-[11px] text-slate-800 max-h-48 overflow-y-auto space-y-1 shadow-inner">
                  {Object.entries(selectedRequest.proposedChanges || {}).map(([key, val]) => (
                    <div key={key} className="flex flex-col border-b border-blue-100/60 pb-1 last:border-0">
                      <span className="text-blue-700 font-bold">{key}:</span>
                      <span className="text-slate-700 break-all pl-2">
                        {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Merchant Complete Details Summary */}
              {merchantDetails && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Merchant Profile Dossier Summary
                  </span>
                  
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 font-medium">
                    <p className="font-extrabold text-slate-900 text-sm">
                      {merchantDetails.merchant?.name || "N/A"}
                    </p>
                    <p className="text-blue-600 font-mono font-bold">Phone: {merchantDetails.merchant?.phone}</p>
                    <p className="text-slate-500">Email: {merchantDetails.merchant?.email || "N/A"}</p>
                    <p className="text-slate-500">City: {merchantDetails.merchant?.city || "N/A"}</p>
                    <p className="text-slate-500">Account Status: <strong className="uppercase text-slate-800">{merchantDetails.merchant?.status}</strong></p>
                  </div>

                  {/* Shops Summary */}
                  {merchantDetails.shops?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Registered Shops ({merchantDetails.shops.length})</span>
                      {merchantDetails.shops.map((shop, i) => (
                        <div key={shop._id || i} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-[11px]">
                          <div>
                            <strong className="text-slate-800 block">{shop.shopName}</strong>
                            <span className="text-slate-400">{shop.city} • {shop.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Review Notes Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Administrative Review Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  placeholder="Provide reason for approval or decline..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800 resize-none shadow-inner"
                />
              </div>

              {/* Action Buttons (Allow / Decline) */}
              {selectedRequest.status === "pending" ? (
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReviewAction("rejected")}
                    className="flex-1 h-11 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReviewAction("allowed")}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Allow Edit
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl text-center text-xs font-bold uppercase tracking-wider">
                  Request has already been {selectedRequest.status}.
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminMerchantEditRequests;