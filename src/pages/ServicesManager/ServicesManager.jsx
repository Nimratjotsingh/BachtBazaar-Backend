import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Search, Filter,
  RefreshCw, Eye, ArrowLeft, Image as ImageIcon, User, Tag,
  Layers, DollarSign, Briefcase, Award, AlertCircle, Check,
  X, ChevronRight, ExternalLink, Loader2, Sparkles, Building2,
  LayoutGrid, List, Maximize2, Download, Hash, Calendar, Upload, Edit3, Save
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const ServiceVerificationManager = ({ token }) => {
  // --- Core Lifecycle States ---
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // --- Views & Layout Modes ---
  const [view, setView] = useState("list"); // 'list' | 'details'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'

  // --- Filtering & Tabs ---
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // --- Modal / Active Inspection State ---
  const [selectedService, setSelectedService] = useState(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [promoteToCatalog, setPromoteToCatalog] = useState(true);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

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
  // PIPELINE 2: VERIFICATION & EDIT ACTIONS
  // ==========================================
  const handleApprove = async (serviceId, thumbnailFile = null, updatedData = {}) => {
    try {
      setActionLoading(true);

      const formData = new FormData();
      formData.append("action", "approve");
      formData.append("addToMasterCatalog", promoteToCatalog);

      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }
      if (updatedData.name) formData.append("name", updatedData.name);
      if (updatedData.description) formData.append("description", updatedData.description);
      if (updatedData.price) formData.append("price", updatedData.price);

      const res = await accountClient.patch(
        `/admin/services/${serviceId}/verify`,
        formData,
        {
          headers: {
            ...headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.success) {
        const updatedObj = res.data.data || {
          ...selectedService,
          approval_status: "approved",
          is_active: true,
          rejection_reason: null,
          ...(thumbnailFile ? { thumbnail: res.data.thumbnail || selectedService.thumbnail } : {})
        };

        setServices((prev) =>
          prev.map((s) => (s._id === serviceId ? { ...s, ...updatedObj } : s))
        );
        setSelectedService((prev) => ({ ...prev, ...updatedObj }));
        alert("Service successfully approved and updated!");
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
        setSelectedService((prev) => ({
          ...prev,
          approval_status: "rejected",
          is_active: false,
          rejection_reason: rejectionReason.trim(),
        }));
        setRejectionModalOpen(false);
        setRejectionReason("");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  const openServiceDetails = (service) => {
    setSelectedService(service);
    setView("details");
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
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE SERVICE DETAILS VIEW
          ========================================== */}
      {view === "details" && selectedService && (
        <ServiceDetailsView
          service={selectedService}
          promoteToCatalog={promoteToCatalog}
          setPromoteToCatalog={setPromoteToCatalog}
          actionLoading={actionLoading}
          onBack={() => { setView("list"); setSelectedService(null); }}
          onApprove={handleApprove}
          onOpenReject={() => setRejectionModalOpen(true)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: PRIMARY LIST / GRID CATALOG
          ========================================== */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <ShieldCheck className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Service Moderation & Approvals
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Review custom merchant service listings, inspect provider credentials, and maintain marketplace quality standards.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Stats Counters */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
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

          {/* Navigation Filter Tabs, Search & Layout View Toggle */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            {/* Status Tab Chips */}
            <div className="flex p-1 bg-slate-100 rounded-xl gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
              {[
                { id: "pending", label: "Awaiting Review", count: computedMetrics.pending },
                { id: "approved", label: "Approved Listings", count: computedMetrics.approved },
                { id: "rejected", label: "Rejected", count: computedMetrics.rejected },
                { id: "all", label: "Complete History", count: computedMetrics.total },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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

            {/* Search, Category Filter & Layout Switcher */}
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 xl:max-w-2xl">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by service name, merchant, or provider..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex-1 sm:flex-initial">
                  <Filter size={14} className="text-slate-400 shrink-0" />
                  <select
                    className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer max-w-[160px] w-full"
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

                {/* Grid vs Table Layout Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
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
            </div>
          </div>

          {/* =========================================================
              VIEW OPTION A: RESPONSIVE GRID VIEW (PROPORTIONAL CONTAINMENT)
              ========================================================= */}
          {displayMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {loading && services.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
                  <Loader2 className="animate-spin mb-2" size={36} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Loading service moderation feed...
                  </p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="col-span-full text-center py-20 font-bold text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-[28px] text-xs uppercase tracking-wider italic">
                  No services found under the current filter selection.
                </div>
              ) : (
                filteredServices.map((service) => (
                  <div
                    key={service._id}
                    onClick={() => openServiceDetails(service)}
                    className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      {/* Responsive Aspect-Ratio Containment Box */}
                      <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-900 flex items-center justify-center p-3 sm:p-4 border-b border-slate-100 overflow-hidden">
                        {service.thumbnail ? (
                          <img
                            src={service.thumbnail}
                            alt={service.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
                          />
                        ) : (
                          <ImageIcon className="text-slate-600" size={32} />
                        )}

                        {/* Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                          <span
                            className={`px-2 py-0.5 rounded-md shadow-xs text-white font-black text-[9px] uppercase tracking-wider ${
                              service.approval_status === "approved"
                                ? "bg-emerald-600"
                                : service.approval_status === "pending"
                                ? "bg-amber-500"
                                : "bg-rose-600"
                            }`}
                          >
                            {service.approval_status}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900/90 backdrop-blur-xs text-white rounded-md text-[9px] font-black uppercase tracking-wider border border-white/10">
                            ₹{service.price} ({service.pricing_type})
                          </span>
                        </div>

                        {/* Fullscreen Zoom Button */}
                        {service.thumbnail && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage({ src: service.thumbnail, label: `${service.name} - Thumbnail` });
                            }}
                            className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Fullscreen Image"
                          >
                            <Maximize2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Details Body */}
                      <div className="p-4 sm:p-5 space-y-3">
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
                              <strong className="text-slate-800">
                                {service.merchant_id?.businessName || service.merchant_id?.name || "Merchant"}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 truncate">
                            <Tag size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">
                              Category:{" "}
                              <strong className="text-blue-600">
                                {service.category_id?.[0]?.label || "General"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Embedded Provider Preview */}
                        {service.service_provider && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
                            <div 
                              onClick={(e) => {
                                if (service.service_provider.profile_image) {
                                  e.stopPropagation();
                                  setLightboxImage({ 
                                    src: service.service_provider.profile_image, 
                                    label: `${service.service_provider.name} - Profile Photo` 
                                  });
                                }
                              }}
                              className={`w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs ${service.service_provider.profile_image ? 'cursor-zoom-in' : ''}`}
                            >
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
                            <div className="truncate text-[11px] min-w-0">
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

                    {/* Bottom Action Card Row */}
                    <div className="px-4 sm:px-5 pb-4 pt-1">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Eye size={12} /> Inspect details
                        </span>

                        <div className="flex items-center gap-1">
                          {service.approval_status === "pending" ? (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(service._id);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition cursor-pointer disabled:opacity-50"
                                title="Approve"
                              >
                                <Check size={14} strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedService(service);
                                  setRejectionModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer disabled:opacity-50"
                                title="Reject"
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openServiceDetails(service);
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
                            >
                              Review Audit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* =========================================================
                VIEW OPTION B: TABLE LIST LEDGER VIEW (MOBILE RESPONSIVE SCROLL)
                ========================================================= */
            <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Service Particulars</th>
                      <th className="px-6 py-4">Category & Vertical</th>
                      <th className="px-6 py-4">Pricing Model</th>
                      <th className="px-6 py-4">Assigned Specialist</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-24 text-center">
                          <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Service Listings...</p>
                        </td>
                      </tr>
                    ) : filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                          No services found under current filter selection.
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((service) => (
                        <tr 
                          key={service._id} 
                          onClick={() => openServiceDetails(service)}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        >
                          {/* Service Title & Thumbnail */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div 
                                onClick={(e) => {
                                  if (service.thumbnail) {
                                    e.stopPropagation();
                                    setLightboxImage({ src: service.thumbnail, label: `${service.name} - Thumbnail` });
                                  }
                                }}
                                className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 ${service.thumbnail ? 'cursor-zoom-in group/img' : ''}`}
                              >
                                {service.thumbnail ? (
                                  <img src={service.thumbnail} className="w-full h-full object-contain p-1 group-hover/img:scale-110 transition-transform duration-300" alt="" />
                                ) : (
                                  <ImageIcon size={18} className="text-slate-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 truncate max-w-[200px] group-hover:text-blue-600 transition-colors">{service.name}</div>
                                <div className="text-[10px] text-slate-400 font-medium truncate max-w-xs mt-0.5">
                                  Merchant: <strong className="text-slate-700">{service.merchant_id?.businessName || service.merchant_id?.name || "Merchant"}</strong>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800 block text-xs">
                              {service.category_id?.[0]?.label || "General Category"}
                            </span>
                          </td>

                          {/* Price Matrix */}
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 text-xs">
                              ₹{service.price}
                              {service.discounted_price && (
                                <span className="text-emerald-600 text-[10px] ml-1.5 font-bold">₹{service.discounted_price}</span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {service.pricing_type}
                            </span>
                          </td>

                          {/* Provider */}
                          <td className="px-6 py-4">
                            {service.service_provider ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  onClick={(e) => {
                                    if (service.service_provider.profile_image) {
                                      e.stopPropagation();
                                      setLightboxImage({ 
                                        src: service.service_provider.profile_image, 
                                        label: `${service.service_provider.name} - Avatar` 
                                      });
                                    }
                                  }}
                                  className={`w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 overflow-hidden text-[10px] font-bold ${service.service_provider.profile_image ? 'cursor-zoom-in' : ''}`}
                                >
                                  {service.service_provider.profile_image ? (
                                    <img src={service.service_provider.profile_image} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    service.service_provider.name?.charAt(0) || "P"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{service.service_provider.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{service.service_provider.designation || "Technician"}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No specialist assigned</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                service.approval_status === "approved"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : service.approval_status === "pending"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-rose-50 text-rose-600 border-rose-100"
                              }`}
                            >
                              {service.approval_status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {service.approval_status === "pending" ? (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(service._id);
                                    }}
                                    disabled={actionLoading}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                                    title="Approve Listing"
                                  >
                                    <Check size={14} strokeWidth={2.5} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedService(service);
                                      setRejectionModalOpen(true);
                                    }}
                                    disabled={actionLoading}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                                    title="Reject Listing"
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                  </button>
                                </>
                              ) : null}

                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openServiceDetails(service);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
                                title="Inspect Service"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECTION REASON PROMPT MODAL */}
      {/* ========================================================= */}
      {rejectionModalOpen && selectedService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-rose-600" size={18} /> Specify Rejection Reason
            </h3>
            <p className="text-xs text-slate-500">
              Explain why <strong>{selectedService.name}</strong> does not meet marketplace standards. This note is shared with the merchant.
            </p>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Unclear scope of work, missing certification files, or misleading pricing model."
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

      {/* ========================================================= */}
      {/* ROOT LEVEL FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {/* ========================================================= */}
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
// SUB-COMPONENT: SINGLE SERVICE DETAILS AUDIT VIEW
// =========================================================
const ServiceDetailsView = ({
  service,
  promoteToCatalog,
  setPromoteToCatalog,
  actionLoading,
  onBack,
  onApprove,
  onOpenReject,
  onOpenLightbox
}) => {
  // Local edit states for republishing/correcting service info and thumbnail
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(service.name || "");
  const [editDesc, setEditDesc] = useState(service.description || "");
  const [editPrice, setEditPrice] = useState(service.price || 0);
  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(service.thumbnail || "");
  const fileInputRef = useRef(null);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewThumbnailFile(file);
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveAndApprove = () => {
    onApprove(service._id, newThumbnailFile, {
      name: editName.trim(),
      description: editDesc.trim(),
      price: Number(editPrice)
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Service Queue
        </button>

        <div className="flex items-center gap-2">
          {service.approval_status === "pending" ? (
            <>
              <button
                onClick={onOpenReject}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <XCircle size={14} /> Decline
              </button>
              <button
                onClick={() => {
                  if (isEditing) {
                    handleSaveAndApprove();
                  } else {
                    onApprove(service._id, null, {});
                  }
                }}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isEditing ? "Save Edits & Approve" : "Approve & Publish"}
              </button>
            </>
          ) : (
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                service.approval_status === "approved"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-rose-50 text-rose-600 border border-rose-200"
              }`}
            >
              Status: {service.approval_status}
            </span>
          )}
        </div>
      </div>

      {/* Main Inspection Container */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6">
        
        {/* Banner Hero Preview & Thumbnail Uploader */}
        <div className="relative w-full h-64 sm:h-80 bg-slate-900 overflow-hidden flex items-center justify-center p-4 group">
          {thumbnailPreviewUrl ? (
            <img 
              src={thumbnailPreviewUrl} 
              alt={editName || service.name}
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(thumbnailPreviewUrl, `${service.name} - Asset Preview`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-2">
              <ImageIcon size={44} className="text-slate-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Hero Graphic Stamped</p>
            </div>
          )}

          {/* Edit & Replace Thumbnail Button */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleThumbnailChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Upload size={14} /> {newThumbnailFile ? "Thumbnail Staged" : "Replace Thumbnail"}
            </button>

            {thumbnailPreviewUrl && (
              <button
                onClick={() => onOpenLightbox(thumbnailPreviewUrl, `${service.name} - Asset Preview`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
              >
                <Maximize2 size={14} /> Fullscreen
              </button>
            )}
          </div>

          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1 font-black text-xs uppercase tracking-wider rounded-xl shadow-md ${
              service.approval_status === "approved"
                ? "bg-emerald-600 text-white"
                : service.approval_status === "pending"
                ? "bg-amber-500 text-white"
                : "bg-rose-600 text-white"
            }`}>
              {service.approval_status}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Service Details & Content Editing
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <Edit3 size={13} /> {isEditing ? "Lock Fields" : "Quick Edit Text"}
            </button>
          </div>

          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4 p-5 bg-blue-50/40 rounded-2xl border border-blue-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-900 uppercase">Service Title</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-900 uppercase">Base Price (₹)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-900 uppercase">Service Description / Scope</label>
                  <textarea
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 outline-none resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {editName || service.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-black rounded-xl">
                    Merchant: {service.merchant_id?.businessName || service.merchant_id?.name || "Merchant"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl whitespace-pre-line">
                  {editDesc || service.description || "No specific scope of work recorded."}
                </p>
              </div>
            )}
          </div>

          {/* Pricing & Specification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Base Rate</span>
              <p className="text-sm font-black font-mono text-slate-900">₹{editPrice || service.price}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Discounted Rate</span>
              <p className="text-sm font-black font-mono text-emerald-600">
                {service.discounted_price ? `₹${service.discounted_price}` : "None"}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pricing Type</span>
              <p className="text-xs font-bold text-slate-800 uppercase">{service.pricing_type}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Online Availability</span>
              <p className={`text-xs font-bold ${service.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                {service.is_active ? "Live in Catalog" : "Draft / Inactive"}
              </p>
            </div>
          </div>

          {/* Service Provider Credentials Card */}
          {service.service_provider && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Assigned Specialist / Professional Technician
              </span>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div 
                  onClick={() => {
                    if (service.service_provider.profile_image) {
                      onOpenLightbox(service.service_provider.profile_image, `${service.service_provider.name} - Profile Photo`);
                    }
                  }}
                  className={`w-14 h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center ${service.service_provider.profile_image ? 'cursor-zoom-in' : ''}`}
                >
                  {service.service_provider.profile_image ? (
                    <img
                      src={service.service_provider.profile_image}
                      alt={service.service_provider.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <h5 className="font-extrabold text-slate-900 text-sm">
                    {service.service_provider.name}
                  </h5>
                  <p className="text-slate-500 font-medium">
                    {service.service_provider.designation || "Specialist"} • {service.service_provider.experience || 0} Years Experience
                  </p>
                  {service.service_provider.specialisation?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {service.service_provider.specialisation.map((spec, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-md text-[10px] font-bold">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Master Catalog Promotion Toggle */}
          {service.approval_status === "pending" && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
              <input
                type="checkbox"
                id="promote_catalog_toggle_details"
                checked={promoteToCatalog}
                onChange={(e) => setPromoteToCatalog(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="promote_catalog_toggle_details"
                className="text-xs font-bold text-slate-700 cursor-pointer select-none"
              >
                Promote into Master Catalog (allows other merchants to adopt this service listing)
              </label>
            </div>
          )}

          {/* Previously Rejected Reason (If rejected) */}
          {service.rejection_reason && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div>
                <strong className="block font-black uppercase tracking-wider text-[10px]">Previously Declined Reason</strong>
                <p className="mt-0.5 leading-relaxed">{service.rejection_reason}</p>
              </div>
            </div>
          )}
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
          {image.label || "Service Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="service-asset.jpg"
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

// --- STAT TICKER BLOCK ---
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

export default ServiceVerificationManager;