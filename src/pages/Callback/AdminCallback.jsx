import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PhoneCall, Search, Filter, RefreshCw, CheckCircle2, Clock,
  Eye, Check, X, AlertCircle, Loader2, ArrowLeft, User,
  Store, Calendar, Mail, Phone, MessageSquare, FileText,
  Save, Hash
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const CallbackAdminPage = ({ token }) => {
  // --- Core Lifecycle States ---
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details'
  const [selectedCallback, setSelectedCallback] = useState(null);

  // --- Filtering & Tab States ---
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'resolved'
  const [requesterTypeFilter, setRequesterTypeFilter] = useState("all"); // 'all' | 'USER' | 'MERCHANT'
  const [searchTerm, setSearchTerm] = useState("");

  // --- Resolution Notes State for Details View ---
  const [resolutionNotes, setResolutionNotes] = useState("");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // ==========================================
  // PIPELINE 1: INITIAL DATA FETCH
  // ==========================================
  const fetchCallbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/admin/callback", {
        headers,
        params: { limit: 100 },
      });

      setCallbacks(res.data.data || res.data.callbacks || []);
    } catch (err) {
      console.error("Error fetching callback requests:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchCallbacks();
  }, [fetchCallbacks]);

  // ==========================================
  // PIPELINE 2: STATUS MUTATIONS
  // ==========================================
  const handleUpdateStatus = async (id, targetStatus, notes = "") => {
    try {
      setActionLoading(true);
      const payload = {
        status: targetStatus,
        adminNotes: notes,
      };

      const res = await accountClient.patch(`/admin/callback/${id}/status`, payload, {
        headers,
      });

      if (res.data.success) {
        setCallbacks((prev) =>
          prev.map((item) => (item._id === id ? res.data.data : item))
        );
        if (selectedCallback?._id === id) {
          setSelectedCallback(res.data.data);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update callback status.");
    } finally {
      setActionLoading(false);
    }
  };

  const openCallbackDetails = (item) => {
    setSelectedCallback(item);
    setResolutionNotes(item.adminNotes || "");
    setView("details");
  };

  // ==========================================
  // DERIVED DATA & ANALYTICS
  // ==========================================
  const computedMetrics = useMemo(() => {
    return {
      total: callbacks.length,
      pending: callbacks.filter((c) => c.status === "pending").length,
      resolved: callbacks.filter((c) => c.status === "resolved").length,
      merchants: callbacks.filter((c) => c.requesterType === "MERCHANT").length,
    };
  }, [callbacks]);

  const filteredCallbacks = useMemo(() => {
    return callbacks.filter((item) => {
      const matchesTab = activeTab === "all" || item.status === activeTab;
      const matchesType =
        requesterTypeFilter === "all" || item.requesterType === requesterTypeFilter;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        item.contactName?.toLowerCase().includes(searchLower) ||
        item.contactPhone?.toLowerCase().includes(searchLower) ||
        item.topic?.toLowerCase().includes(searchLower) ||
        item.message?.toLowerCase().includes(searchLower);

      return matchesTab && matchesType && matchesSearch;
    });
  }, [callbacks, activeTab, requesterTypeFilter, searchTerm]);

  return (
    <>
      {/* =========================================================
          SUB-VIEW 1: SINGLE CALLBACK DETAILS AUDIT VIEW
          ========================================================= */}
      {view === "details" && selectedCallback ? (
        <CallbackDetailsView
          callback={selectedCallback}
          resolutionNotes={resolutionNotes}
          setResolutionNotes={setResolutionNotes}
          actionLoading={actionLoading}
          onBack={() => { setView("list"); setSelectedCallback(null); }}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : (
        /* =========================================================
            SUB-VIEW 2: PRIMARY DIRECTORY VIEW (STRICT LIST TABLE)
            ========================================================= */
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <PhoneCall className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Support Callback Inquiries
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                Manage callback requests lodged by platform merchants and consumers.
              </p>
            </div>
            <button
              onClick={fetchCallbacks}
              className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer"
              title="Refresh Feed"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox
              title="Total Requests"
              val={computedMetrics.total}
              icon={<PhoneCall />}
              theme="bg-blue-50 text-blue-600 border-blue-100"
            />
            <StatTickerBox
              title="Pending Attention"
              val={computedMetrics.pending}
              icon={<Clock />}
              theme="bg-amber-50 text-amber-600 border-amber-100"
            />
            <StatTickerBox
              title="Resolved Cases"
              val={computedMetrics.resolved}
              icon={<CheckCircle2 />}
              theme="bg-emerald-50 text-emerald-600 border-emerald-100"
            />
            <StatTickerBox
              title="Merchant Requests"
              val={computedMetrics.merchants}
              icon={<Store />}
              theme="bg-purple-50 text-purple-600 border-purple-100"
            />
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            {/* Status Tab Chips */}
            <div className="flex p-1 bg-slate-100 rounded-xl gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
              {[
                { id: "all", label: "All Inquiries", count: computedMetrics.total },
                { id: "pending", label: "Pending", count: computedMetrics.pending },
                { id: "resolved", label: "Resolved", count: computedMetrics.resolved },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white text-blue-600 shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 xl:max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by contact name, phone, or inquiry topic..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select
                  className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer pr-2 w-full sm:w-auto"
                  value={requesterTypeFilter}
                  onChange={(e) => setRequesterTypeFilter(e.target.value)}
                >
                  <option value="all">All Channels</option>
                  <option value="USER">User App Only</option>
                  <option value="MERCHANT">Merchant Portal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Feed */}
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Requester Channel</th>
                    <th className="px-6 py-4">Contact Details</th>
                    <th className="px-6 py-4">Topic & Note</th>
                    <th className="px-6 py-4">Preferred Window</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center">
                        <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Syncing Callback Stream...
                        </p>
                      </td>
                    </tr>
                  ) : filteredCallbacks.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                      >
                        No callback tickets matching the current filtering parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredCallbacks.map((item) => (
                      <tr 
                        key={item._id} 
                        onClick={() => openCallbackDetails(item)}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      >
                        {/* Requester Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                              item.requesterType === "MERCHANT"
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {item.requesterType === "MERCHANT" ? (
                              <Store size={12} />
                            ) : (
                              <User size={12} />
                            )}
                            {item.requesterType}
                          </span>
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-[#0F172A] text-xs">
                              {item.contactName}
                            </p>
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                              <Phone size={11} className="text-slate-400" />
                              <a
                                href={`tel:${item.contactPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-blue-600 transition-colors font-mono"
                              >
                                {item.contactPhone}
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Topic & Message */}
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-extrabold text-slate-800 line-clamp-1">{item.topic}</p>
                          {item.message ? (
                            <p className="text-slate-400 text-[11px] font-medium line-clamp-1 mt-0.5">
                              {item.message}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No extra details provided</span>
                          )}
                        </td>

                        {/* Preferred Call Time */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                          {item.preferredCallTime ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
                              <Clock size={11} className="text-slate-400" />
                              {item.preferredCallTime}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">As soon as possible</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                              item.status === "resolved"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCallbackDetails(item);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition cursor-pointer"
                              title="Inspect Request"
                            >
                              <Eye size={15} />
                            </button>

                            {item.status === "pending" ? (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(item._id, "resolved");
                                }}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                                title="Mark Resolved"
                              >
                                <Check size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(item._id, "pending");
                                }}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                                title="Re-open Ticket"
                              >
                                <Clock size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// =========================================================
// SUB-COMPONENT: SINGLE CALLBACK DETAILS AUDIT VIEW
// =========================================================
const CallbackDetailsView = ({
  callback,
  resolutionNotes,
  setResolutionNotes,
  actionLoading,
  onBack,
  onUpdateStatus
}) => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Callback Inquiries
        </button>

        <div className="flex items-center gap-2">
          {callback.status === "pending" ? (
            <button
              disabled={actionLoading}
              onClick={() => onUpdateStatus(callback._id, "resolved", resolutionNotes)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Mark As Resolved
            </button>
          ) : (
            <button
              disabled={actionLoading}
              onClick={() => onUpdateStatus(callback._id, "pending", resolutionNotes)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
              Re-open As Pending
            </button>
          )}
        </div>
      </div>

      {/* Main Inspection Container */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
              callback.requesterType === "MERCHANT"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {callback.requesterType === "MERCHANT" ? <Store size={14} /> : <User size={14} />}
              {callback.requesterType} Request
            </span>

            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
              callback.status === "resolved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {callback.status}
            </span>
          </div>

          <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
            <Calendar size={13} />
            <span>Lodged on {new Date(callback.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Requester Name
            </span>
            <p className="font-extrabold text-slate-900 text-sm">
              {callback.contactName}
            </p>
            <div className="flex items-center gap-1.5 text-blue-600 font-mono text-xs font-bold pt-1">
              <Phone size={13} />
              <a href={`tel:${callback.contactPhone}`} className="hover:underline">
                {callback.contactPhone}
              </a>
            </div>
            {callback.contactEmail && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium pt-0.5">
                <Mail size={13} />
                <span>{callback.contactEmail}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Preferred Call Schedule
            </span>
            <p className="font-extrabold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
              <Clock size={15} className="text-slate-400" />
              {callback.preferredCallTime || "As soon as possible"}
            </p>
            <p className="text-[10px] text-slate-400 font-mono pt-3">
              ID: {callback._id}
            </p>
          </div>
        </div>

        {/* Inquiry Topic & Message */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Inquiry Topic
          </span>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-extrabold text-slate-900">
            {callback.topic}
          </div>
        </div>

        {callback.message && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Message / Description Notes
            </span>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
              {callback.message}
            </div>
          </div>
        )}

        {/* Administrative Resolution Notes Input */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Internal Administrative Resolution Notes
          </label>
          <textarea
            rows={3}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Log internal follow-up discussion, resolution outcome, or customer feedback..."
            className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
          />
        </div>

        {/* Footer Save Action */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onUpdateStatus(callback._id, callback.status, resolutionNotes)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Notes
          </button>
        </div>

      </div>
    </div>
  );
};

// Reusable Metric Box
const StatTickerBox = ({ title, val, icon, theme }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between">
    <div className="space-y-0.5 sm:space-y-1">
      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-lg sm:text-xl font-black font-mono text-slate-800 leading-none pt-0.5 sm:pt-1">{val}</h3>
    </div>
    <div className={`w-8 h-8 sm:w-10 sm:h-10 border rounded-xl flex items-center justify-center shadow-inner p-1.5 sm:p-2 shrink-0 ${theme}`}>
      {React.cloneElement(icon, { size: 16, strokeWidth: 2.5 })}
    </div>
  </div>
);

export default CallbackAdminPage;