import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PhoneCall, Search, Filter, RefreshCw, CheckCircle2, Clock,
  Eye, Check, X, AlertCircle, Loader2, ArrowLeft, User,
  Store, Calendar, Mail, Phone, MessageSquare, FileText
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const CallbackAdminPage = ({ token }) => {
  // --- Core Lifecycle States ---
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // --- Filtering & Tab States ---
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'resolved'
  const [requesterTypeFilter, setRequesterTypeFilter] = useState("all"); // 'all' | 'USER' | 'MERCHANT'
  const [searchTerm, setSearchTerm] = useState("");

  // --- Inspection & Resolution Modal States ---
  const [selectedCallback, setSelectedCallback] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // ==========================================
  // PIPELINE 1: INITIAL DATA FETCH
  // ==========================================
  const fetchCallbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/admin/callbacks", {
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

      const res = await accountClient.patch(`/admin/callbacks/${id}/status`, payload, {
        headers,
      });

      if (res.data.success) {
        setCallbacks((prev) =>
          prev.map((item) => (item._id === id ? res.data.data : item))
        );
        setIsResolveModalOpen(false);
        setSelectedCallback(null);
        setResolutionNotes("");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update callback status.");
    } finally {
      setActionLoading(false);
    }
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
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <PhoneCall className="text-blue-600 w-8 h-8" /> Support Callback Inquiries
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage callback requests lodged by platform merchants and consumers.
          </p>
        </div>
        <button
          onClick={fetchCallbacks}
          className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
          title="Refresh Feed"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Status Tab Chips */}
        <div className="flex p-1 bg-slate-100 rounded-xl gap-1 overflow-x-auto text-xs font-bold">
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
                  ? "bg-white text-blue-600 shadow-sm font-black"
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
              className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer pr-2"
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
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Requester Channel</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4">Topic & Note</th>
                <th className="px-6 py-4">Preferred Window</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
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
                  <tr key={item._id} className="hover:bg-slate-50/40 transition-colors group">
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
                            className="hover:text-blue-600 transition-colors"
                          >
                            {item.contactPhone}
                          </a>
                        </div>
                        {item.contactEmail && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                            <Mail size={11} className="text-slate-400" />
                            <span className="truncate max-w-[180px]">{item.contactEmail}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Topic & Message */}
                    <td className="px-6 py-4 max-w-sm">
                      <p className="font-extrabold text-slate-800 line-clamp-1">{item.topic}</p>
                      {item.message ? (
                        <p className="text-slate-400 text-[11px] font-medium line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No extra details provided</span>
                      )}
                    </td>

                    {/* Preferred Call Time */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                      {item.preferredCallTime ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md">
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedCallback(item);
                            setResolutionNotes(item.adminNotes || "");
                            setIsResolveModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer"
                          title="Inspect Request"
                        >
                          <Eye size={16} />
                        </button>

                        {item.status === "pending" ? (
                          <button
                            onClick={() => {
                              setSelectedCallback(item);
                              setResolutionNotes("");
                              setIsResolveModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition cursor-pointer"
                            title="Mark Resolved"
                          >
                            <Check size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(item._id, "pending")}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-xl transition cursor-pointer"
                            title="Re-open Ticket"
                          >
                            <Clock size={16} />
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

      {/* ========================================================= */}
      {/* INSPECTION / RESOLVE MODAL */}
      {/* ========================================================= */}
      {isResolveModalOpen && selectedCallback && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                    selectedCallback.status === "resolved"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}
                >
                  {selectedCallback.status}
                </span>
                <h3 className="text-xl font-black text-[#0F172A] mt-2">
                  Callback Inquiry
                </h3>
                <p className="text-xs text-slate-400">
                  Lodge Timestamp: {new Date(selectedCallback.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Requester Identity
                </span>
                <strong className="text-slate-800 text-sm block mt-0.5">
                  {selectedCallback.contactName}
                </strong>
                <span className="text-slate-500 font-mono text-[11px] block">
                  {selectedCallback.contactPhone}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Channel & Schedule
                </span>
                <strong className="text-slate-800 text-sm block mt-0.5">
                  {selectedCallback.requesterType}
                </strong>
                <span className="text-slate-500 text-[11px] block">
                  {selectedCallback.preferredCallTime || "Immediate priority"}
                </span>
              </div>
            </div>

            {/* Topic & Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Inquiry Topic
              </span>
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-slate-800">
                {selectedCallback.topic}
              </div>
            </div>

            {selectedCallback.message && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Message Description
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedCallback.message}
                </div>
              </div>
            )}

            {/* Admin Resolution Notes Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Administrative Resolution Notes
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800 transition-all"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Log internal follow-up discussion, resolution outcome, or customer feedback..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-5 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              {selectedCallback.status === "pending" ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    handleUpdateStatus(selectedCallback._id, "resolved", resolutionNotes)
                  }
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Mark Ticket As Resolved
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    handleUpdateStatus(selectedCallback._id, "pending", resolutionNotes)
                  }
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Clock size={16} />
                  )}
                  Re-open As Pending
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Metric Box
const StatTickerBox = ({ title, val, icon, theme }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-xl font-black font-mono text-slate-800 leading-none pt-1">{val}</h3>
    </div>
    <div className={`w-10 h-10 border rounded-xl flex items-center justify-center shadow-inner p-2 ${theme}`}>
      {React.cloneElement(icon, { size: 16, strokeWidth: 2.5 })}
    </div>
  </div>
);

export default CallbackAdminPage;