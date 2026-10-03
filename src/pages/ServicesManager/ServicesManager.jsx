import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Search, Filter,
  RefreshCw, Eye, ArrowLeft, Image as ImageIcon, User, Tag,
  Layers, DollarSign, Briefcase, Award, AlertCircle, Check,
  X, ChevronRight, ExternalLink, Loader2, Sparkles, Building2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const ServiceVerificationManager = ({ token }) => {
  // --- Core Lifecycle States ---
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // --- Filtering & Tabs ---
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // --- Modal / Active Inspection State ---
  const [selectedService, setSelectedService] = useState(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [promoteToCatalog, setPromoteToCatalog] = useState(true);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // ==========================================
  // PIPELINE 1: FETCH DATA
  // ==========================================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [servicesRes, catRes] = await Promise.all([
        accountClient.get("/admin/services", {
          headers,
          params: { limit: 100 },
        }),
        accountClient.get("/categories", { headers }),
      ]);

      setServices(servicesRes.data.services || servicesRes.data.data || []);
      setCategories(catRes.data.categories || catRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch merchant services for moderation:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==========================================
  // PIPELINE 2: VERIFICATION ACTIONS
  // ==========================================
  const handleApprove = async (serviceId) => {
    try {
      setActionLoading(true);
      const res = await accountClient.patch(
        `/admin/services/${serviceId}/verify`,
        {
          action: "approve",
          addToMasterCatalog: promoteToCatalog,
        },
        { headers }
      );

      if (res.data.success) {
        setServices((prev) =>
          prev.map((s) =>
            s._id === serviceId
              ? { ...s, approval_status: "approved", is_active: true, rejection_reason: null }
              : s
          )
        );
        setSelectedService(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve service listing.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a valid reason explaining why this service was rejected.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await accountClient.patch(
        `/admin/services/${selectedService._id}/verify`,
        {
          action: "reject",
          rejection_reason: rejectionReason.trim(),
        },
        { headers }
      );

      if (res.data.success) {
        setServices((prev) =>
          prev.map((s) =>
            s._id === selectedService._id
              ? {
                  ...s,
                  approval_status: "rejected",
                  is_active: false,
                  rejection_reason: rejectionReason.trim(),
                }
              : s
          )
        );
        setRejectionModalOpen(false);
        setRejectionReason("");
        setSelectedService(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // DERIVED METRICS & FILTERED DATA
  // ==========================================
  const computedMetrics = useMemo(() => {
    return {
      total: services.length,
      pending: services.filter((s) => s.approval_status === "pending").length,
      approved: services.filter((s) => s.approval_status === "approved").length,
      rejected: services.filter((s) => s.approval_status === "rejected").length,
    };
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((item) => {
      const matchesTab =
        activeTab === "all" || item.approval_status === activeTab;

      const matchesSearch =
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.merchant_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.merchant_id?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.service_provider?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const itemCatId = (
        item.category_id?.[0]?._id ||
        item.category_id?.[0] ||
        item.category_id
      )?.toString();

      const matchesCategory =
        filterCategory === "all" || itemCatId === filterCategory;

      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [services, activeTab, searchTerm, filterCategory]);

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <ShieldCheck className="text-blue-600 w-8 h-8" /> Service Moderation & Approvals
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review custom merchant service listings, inspect provider credentials, and maintain marketplace quality standards.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
          title="Refresh Queue"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox
          title="Pending Queue"
          val={computedMetrics.pending}
          icon={<Clock />}
          theme="bg-amber-50 text-amber-600 border-amber-100"
        />
        <StatTickerBox
          title="Approved Services"
          val={computedMetrics.approved}
          icon={<CheckCircle2 />}
          theme="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatTickerBox
          title="Rejected Submissions"
          val={computedMetrics.rejected}
          icon={<XCircle />}
          theme="bg-rose-50 text-rose-600 border-rose-100"
        />
        <StatTickerBox
          title="Total Processed"
          val={computedMetrics.total}
          icon={<Layers />}
          theme="bg-blue-50 text-blue-600 border-blue-100"
        />
      </div>

      {/* Navigation Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Status Tab Chips */}
        <div className="flex p-1 bg-slate-100 rounded-xl gap-1 overflow-x-auto text-xs font-bold">
          {[
            { id: "pending", label: "Awaiting Review", count: computedMetrics.pending },
            { id: "approved", label: "Approved Listings", count: computedMetrics.approved },
            { id: "rejected", label: "Rejected", count: computedMetrics.rejected },
            { id: "all", label: "Complete History", count: computedMetrics.total },
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

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 xl:max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by service name, merchant, or provider..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer max-w-[160px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.label || c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Service Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && services.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
            <Loader2 className="animate-spin mb-2" size={36} />
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Loading service moderation feed...
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="col-span-full text-center py-16 font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[24px] text-xs uppercase tracking-wider italic">
            No services found under the current filter selection.
          </div>
        ) : (
          filteredServices.map((service) => (
            <div
              key={service._id}
              className="bg-white rounded-[24px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all duration-300"
            >
              <div>
                {/* Image Banner */}
                <div className="h-44 bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                  {service.thumbnail ? (
                    <img
                      src={service.thumbnail}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <ImageIcon className="text-slate-300" size={32} />
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md shadow-sm text-white font-black text-[9px] uppercase tracking-wider ${
                        service.approval_status === "approved"
                          ? "bg-emerald-600"
                          : service.approval_status === "pending"
                          ? "bg-amber-500"
                          : "bg-rose-600"
                      }`}
                    >
                      {service.approval_status}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white rounded-md text-[9px] font-black uppercase tracking-wider">
                      ₹{service.price} ({service.pricing_type})
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-[#0F172A] text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                      {service.description}
                    </p>
                  </div>

                  {/* Merchant & Category Strip */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        Merchant:{" "}
                        <strong className="text-slate-700">
                          {service.merchant_id?.businessName || service.merchant_id?.name || "Merchant"}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Tag size={13} className="text-slate-400 shrink-0" />
                      <span>
                        Category:{" "}
                        <strong className="text-blue-600">
                          {service.category_id?.[0]?.label || "General"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Embedded Provider Preview */}
                  {service.service_provider && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                        {service.service_provider.profile_image ? (
                          <img
                            src={service.service_provider.profile_image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={14} />
                        )}
                      </div>
                      <div className="truncate text-[11px]">
                        <p className="font-extrabold text-slate-800 leading-tight truncate">
                          {service.service_provider.name}
                        </p>
                        <p className="text-slate-400 text-[10px] leading-tight truncate">
                          {service.service_provider.designation || "Assigned Specialist"} • {service.service_provider.experience || 0} yrs exp
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejection Note if Present */}
                  {service.rejection_reason && (
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-700 text-[11px] flex gap-2 items-start">
                      <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                      <p className="line-clamp-2">
                        <strong>Reason:</strong> {service.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => setSelectedService(service)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye size={14} /> Inspect & Verify
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================= */}
      {/* INSPECTION MODAL */}
      {/* ========================================================= */}
      {selectedService && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-white font-black text-[9px] uppercase tracking-wider ${
                    selectedService.approval_status === "approved"
                      ? "bg-emerald-600"
                      : selectedService.approval_status === "pending"
                      ? "bg-amber-500"
                      : "bg-rose-600"
                  }`}
                >
                  {selectedService.approval_status}
                </span>
                <h2 className="text-xl font-black text-[#0F172A] mt-2">
                  {selectedService.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Submitted by {selectedService.merchant_id?.businessName || selectedService.merchant_id?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scope & Pricing */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Service Scope & Pricing
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                {selectedService.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Base Price</span>
                  <strong className="text-slate-800 text-sm font-mono">₹{selectedService.price}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Discounted</span>
                  <strong className="text-slate-800 text-sm font-mono">
                    {selectedService.discounted_price ? `₹${selectedService.discounted_price}` : "None"}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Pricing Type</span>
                  <strong className="text-slate-800 text-xs uppercase">{selectedService.pricing_type}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Active Online</span>
                  <strong className={selectedService.is_active ? "text-emerald-600" : "text-slate-400"}>
                    {selectedService.is_active ? "Active" : "Inactive"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Service Provider Credentials Card */}
            {selectedService.service_provider && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Assigned Service Specialist / Technician
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedService.service_provider.profile_image ? (
                      <img
                        src={selectedService.service_provider.profile_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    <h5 className="font-extrabold text-slate-800 text-sm">
                      {selectedService.service_provider.name}
                    </h5>
                    <p className="text-slate-500 font-medium">
                      {selectedService.service_provider.designation || "Service Provider"} •{" "}
                      {selectedService.service_provider.experience || 0} Years Experience
                    </p>
                    {selectedService.service_provider.specialisation?.length > 0 && (
                      <div className="flex gap-1 flex-wrap pt-1">
                        {selectedService.service_provider.specialisation.map((spec, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Master Catalog Promotion Checkbox */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
              <input
                type="checkbox"
                id="promote_catalog_toggle"
                checked={promoteToCatalog}
                onChange={(e) => setPromoteToCatalog(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="promote_catalog_toggle"
                className="text-xs font-bold text-slate-700 cursor-pointer select-none"
              >
                Promote into Master Catalog (allows other merchants to adopt this service)
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectionModalOpen(true)}
                className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <XCircle size={16} /> Reject Listing
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleApprove(selectedService._id)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Approve & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECTION REASON PROMPT MODAL */}
      {/* ========================================================= */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-rose-600" size={18} /> Specify Rejection Reason
            </h3>
            <p className="text-xs text-slate-500">
              Explain why this service does not meet marketplace guidelines. This note is shared with the merchant.
            </p>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Unclear scope of work, incomplete pricing unit, or invalid technician credentials."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white text-slate-800"
            />

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-md shadow-rose-100 disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Lightweight Reusable Metric Card ---
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

export default ServiceVerificationManager;