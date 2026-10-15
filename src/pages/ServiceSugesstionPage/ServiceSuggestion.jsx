import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wrench, Plus, Edit3, Trash2, Save, Loader2, ArrowLeft,
  Image as ImageIcon, Search, Filter, Eye, Tag, X, Layers,
  Box, Sparkles, RefreshCw, ChevronDown, CheckCircle2,
  DollarSign, Power, Clock, Check, AlertCircle, LayoutGrid,
  List, Maximize2, Download, Hash, Calendar, Building2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const ServiceSuggestionsManager = ({ token }) => {
  // --- Core Lifecycle States ---
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Previews & Image State
  const [imagePreview, setImagePreview] = useState(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'approved' | 'pending' | 'rejected'

  // --- Form State ---
  const initialFormState = {
    name: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    imageFile: null,
    is_active: true,
    status: "approved",
  };
  const [formData, setFormData] = useState(initialFormState);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // ==========================================
  // PIPELINE 1: INITIAL DATA STREAM
  // ==========================================
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [suggestionsRes, catRes, subRes] = await Promise.all([
        accountClient.get("/admin/service-suggestions", { headers }),
        accountClient.get("/categories", { headers }),
        accountClient.get("/subcategories", { headers }),
      ]);

      setSuggestions(suggestionsRes.data.suggestions || suggestionsRes.data.data || []);
      setCategories(catRes.data.categories || catRes.data.data || []);
      setSubCategories(subRes.data.subCategories || subRes.data.data || []);
    } catch (err) {
      console.error("Error fetching master service suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ==========================================
  // PIPELINE 2: MEDIA HANDLERS
  // ==========================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ==========================================
  // PIPELINE 3: EDIT TRIGGER & FORM POPULATION
  // ==========================================
  const handleOpenEdit = (item) => {
    setSelectedSuggestion(item);

    const categoryId =
      item.category_id?.[0]?._id ||
      item.category_id?.[0] ||
      item.category_id ||
      "";

    const subcategoryId =
      item.subcategory_id?.[0]?._id ||
      item.subcategory_id?.[0] ||
      item.subcategory_id ||
      "";

    setFormData({
      name: item.name || "",
      description: item.description || "",
      category_id: categoryId.toString(),
      subcategory_id: subcategoryId.toString(),
      imageFile: null,
      is_active: item.is_active ?? true,
      status: item.status || "approved",
    });

    setImagePreview(item.image || null);
    setView("form");
  };

  const openSuggestionDetails = (item) => {
    setSelectedSuggestion(item);
    setView("details");
  };

  // ==========================================
  // PIPELINE 4: PERSISTENCE & MUTATIONS
  // ==========================================
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Name and description are required.");
      return;
    }

    if (!formData.category_id) {
      alert("Please designate a target category.");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name.trim());
    data.append("description", formData.description.trim());
    data.append("is_active", String(formData.is_active));
    data.append("status", formData.status);

    if (formData.category_id) {
      data.append("category_id", JSON.stringify([formData.category_id]));
    }
    if (formData.subcategory_id) {
      data.append("subcategory_id", JSON.stringify([formData.subcategory_id]));
    }

    if (formData.imageFile) {
      data.append("image", formData.imageFile);
    }

    try {
      setLoading(true);
      if (selectedSuggestion?._id) {
        await accountClient.put(
          `/admin/service-suggestions/${selectedSuggestion._id}`,
          data,
          { headers: { ...headers, "Content-Type": "multipart/form-data" } }
        );
      } else {
        await accountClient.post("/admin/service-suggestions", data, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      }

      await fetchInitialData();
      setView("list");
      resetForm();
    } catch (err) {
      console.error("Save service suggestion error:", err);
      alert(err.response?.data?.message || "Operation failed to commit service suggestion.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently remove master service template "${name || 'selected'}"?`)) return;
    try {
      setLoading(true);
      await accountClient.delete(`/admin/service-suggestions/${id}`, { headers });
      if (selectedSuggestion?._id === id) {
        setView("list");
        setSelectedSuggestion(null);
      }
      await fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || "Delete request dropped.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const updatedActiveState = !item.is_active;
      const res = await accountClient.put(
        `/admin/service-suggestions/${item._id}`,
        { is_active: updatedActiveState },
        { headers }
      );
      if (res.data.success) {
        setSuggestions((prev) =>
          prev.map((s) => (s._id === item._id ? { ...s, is_active: updatedActiveState } : s))
        );
        if (selectedSuggestion?._id === item._id) {
          setSelectedSuggestion((prev) => ({ ...prev, is_active: updatedActiveState }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Status toggle update failed.");
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setImagePreview(null);
    setSelectedSuggestion(null);
  };

  // ==========================================
  // DERIVED DATA & FILTERS
  // ==========================================
  const computedMetrics = useMemo(() => {
    return {
      total: suggestions.length,
      approved: suggestions.filter((s) => s.status === "approved" && s.is_active).length,
      pending: suggestions.filter((s) => s.status === "pending").length,
      inactive: suggestions.filter((s) => !s.is_active || s.status === "rejected").length,
    };
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const itemCatId = (item.category_id?.[0]?._id || item.category_id?.[0] || item.category_id)?.toString();
      const matchesCategory = filterCategory === "all" || itemCatId === filterCategory;

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && item.is_active && item.status === "approved") ||
        (filterStatus === "pending" && item.status === "pending") ||
        (filterStatus === "inactive" && (!item.is_active || item.status === "rejected"));

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suggestions, searchTerm, filterCategory, filterStatus]);

  const relevantSubCategories = useMemo(() => {
    if (!formData.category_id) return [];
    return subCategories.filter((sub) => {
      const parentId = (sub.categoryId?._id || sub.categoryId || sub.category_id)?.toString();
      return parentId === formData.category_id.toString();
    });
  }, [subCategories, formData.category_id]);

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE DETAILS AUDIT VIEW
          ========================================== */}
      {view === "details" && selectedSuggestion && (
        <ServiceSuggestionDetailsView
          suggestion={selectedSuggestion}
          onBack={() => { setView("list"); setSelectedSuggestion(null); }}
          onEdit={() => handleOpenEdit(selectedSuggestion)}
          onDelete={() => handleDelete(selectedSuggestion._id, selectedSuggestion.name)}
          onToggleStatus={() => handleToggleStatus(selectedSuggestion)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: FORM (CREATE / EDIT)
          ========================================== */}
      {view === "form" && (
        <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button
            onClick={() => {
              setView("list");
              resetForm();
            }}
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Service Catalog
          </button>

          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
              <Wrench className="text-blue-600 w-5 h-5" />
              {selectedSuggestion ? "Modify Master Service Suggestion" : "Create Master Service Suggestion"}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Service Title / Name *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Split AC Deep Chemical Cleaning & Servicing"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Full Scope of Work & Description *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Define standard inclusions, exclusions, workflow, tools used, and customer expectations..."
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Category Target *
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                          subcategory_id: "",
                        })
                      }
                    >
                      <option value="">Select Service Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.label || cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Subcategory Target (Optional)
                  </label>
                  <div className="relative">
                    <select
                      disabled={!formData.category_id}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all disabled:opacity-50"
                      value={formData.subcategory_id}
                      onChange={(e) =>
                        setFormData({ ...formData, subcategory_id: e.target.value })
                      }
                    >
                      <option value="">None</option>
                      {relevantSubCategories.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.label || sub.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Icon / Image Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Master Service Illustration / Icon
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-slate-200 shadow-inner flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-contain" alt="Service Preview" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={28} />
                    )}
                  </div>
                  <div className="space-y-2 w-full text-center sm:text-left">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="text-xs font-bold text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-xs hover:file:bg-blue-50 cursor-pointer w-full"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">
                      Clean SVG, transparent PNG, or high-definition photo recommended.
                    </p>
                  </div>
                </div>
              </div>

              {/* Approval State Dropdown for Admin */}
              {selectedSuggestion && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Catalog Verification Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="approved">Approved (Live for auto-adoption)</option>
                    <option value="pending">Pending Review</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="is_active_toggle_service"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is_active_toggle_service" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Make master service template active and searchable for merchant listings
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
                {selectedSuggestion ? "Update Service Template" : "Save Master Service Template"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-VIEW 3: PRIMARY LIST/GRID CATALOG
          ========================================== */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <Wrench className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Service Suggestions Catalog
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Curate standardized service templates. Merchants picking from these suggestions skip pending verification queues.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchInitialData}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Dataset"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={18} strokeWidth={2.5} /> Create Service Suggestion
              </button>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox
              title="Total Templates"
              val={computedMetrics.total}
              icon={<Wrench />}
              theme="bg-blue-50 text-blue-600 border-blue-100"
            />
            <StatTickerBox
              title="Active & Approved"
              val={computedMetrics.approved}
              icon={<CheckCircle2 />}
              theme="bg-emerald-50 text-emerald-600 border-emerald-100"
            />
            <StatTickerBox
              title="Pending Submissions"
              val={computedMetrics.pending}
              icon={<Clock />}
              theme="bg-amber-50 text-amber-600 border-amber-100"
            />
            <StatTickerBox
              title="Inactive / Rejected"
              val={computedMetrics.inactive}
              icon={<Box />}
              theme="bg-slate-50 text-slate-600 border-slate-200"
            />
          </div>

          {/* Filter Bar + Grid/Table Toggle */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search service templates by title or scope..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex-1 sm:flex-initial">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer max-w-[180px] w-full"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">All Service Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.label || cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex-1 sm:flex-initial">
                  <Power size={13} className="text-slate-400" />
                  <select
                    className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer w-full"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active & Approved</option>
                    <option value="pending">Pending Review</option>
                    <option value="inactive">Inactive / Draft</option>
                  </select>
                </div>
              </div>
            </div>

            {/* View Toggle */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {loading && suggestions.length === 0 ? (
                <div className="col-span-full py-28 text-center text-blue-600">
                  <Loader2 className="animate-spin mb-2" size={36} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Loading Master Service Suggestions...
                  </p>
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div className="col-span-full text-center py-20 font-bold text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-[28px] text-xs uppercase tracking-wider italic">
                  No master service templates matched your filtered parameters.
                </div>
              ) : (
                filteredSuggestions.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => openSuggestionDetails(item)}
                    className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Responsive Aspect-Ratio Containment Box */}
                      <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-50 flex items-center justify-center p-3 sm:p-4 border-b border-slate-100 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
                            alt={item.name}
                          />
                        ) : (
                          <Wrench size={32} className="text-slate-300" />
                        )}

                        {/* Floating Status Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                          <span
                            className={`px-2 py-0.5 rounded-md shadow-xs text-white font-black text-[9px] uppercase tracking-wider ${
                              item.status === "approved"
                                ? item.is_active
                                  ? "bg-emerald-600"
                                  : "bg-slate-500"
                                : item.status === "pending"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          >
                            {item.status === "approved"
                              ? item.is_active
                                ? "Active"
                                : "Disabled"
                              : item.status}
                          </span>
                          {item.suggested_by && (
                            <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                              Merchant
                            </span>
                          )}
                        </div>

                        {/* Direct Fullscreen Zoom Button */}
                        {item.image && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage({ src: item.image, label: `${item.name} - Service Icon` });
                            }}
                            className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Fullscreen Graphic"
                          >
                            <Maximize2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="p-4 sm:p-5 space-y-2.5">
                        <h3 className="font-extrabold text-[#0F172A] line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="space-y-1 text-[11px] font-bold text-slate-400">
                          <div className="flex items-center gap-1.5 truncate">
                            <Filter size={12} className="text-slate-300 shrink-0" />
                            <span className="truncate">
                              Category:{" "}
                              <strong className="text-blue-600">
                                {item.category_id?.[0]?.label ||
                                  item.category_id?.[0]?.name ||
                                  "General"}
                              </strong>
                            </span>
                          </div>

                          {item.subcategory_id?.[0] && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Layers size={12} className="text-slate-300 shrink-0" />
                              <span className="truncate">
                                Subcategory:{" "}
                                <strong className="text-slate-600">
                                  {item.subcategory_id?.[0]?.label ||
                                    item.subcategory_id?.[0]?.name}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 sm:px-5 pb-4 pt-1">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
                        <span className="text-[10px]">
                          {item.status === "pending" ? "Awaiting review" : "Master verified"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(item);
                            }}
                            className={`p-1.5 rounded-xl border transition cursor-pointer ${
                              item.is_active
                                ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                                : "text-slate-400 hover:bg-slate-50 border-slate-200"
                            }`}
                            title="Toggle Active Availability"
                          >
                            <Power size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition cursor-pointer"
                            title="Modify Template"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item._id, item.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
                            title="Delete Template"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* =========================================================
                VIEW MODE 2: TABLE LIST LEDGER VIEW
                ========================================================= */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Service Template</th>
                      <th className="px-6 py-4">Category & Taxonomy</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-24 text-center">
                          <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Master Service Tree...</p>
                        </td>
                      </tr>
                    ) : filteredSuggestions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                          No matching service templates found under current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredSuggestions.map((item) => (
                        <tr 
                          key={item._id} 
                          onClick={() => openSuggestionDetails(item)}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        >
                          {/* Thumbnail & Title */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div 
                                onClick={(e) => {
                                  if (item.image) {
                                    e.stopPropagation();
                                    setLightboxImage({ src: item.image, label: `${item.name} - Illustration` });
                                  }
                                }}
                                className={`w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 ${item.image ? 'cursor-zoom-in group/img' : ''}`}
                              >
                                {item.image ? (
                                  <img src={item.image} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-300" alt="" />
                                ) : (
                                  <Wrench size={18} className="text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 truncate max-w-[240px] group-hover:text-blue-600 transition-colors">{item.name}</div>
                                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.description}</div>
                              </div>
                            </div>
                          </td>

                          {/* Taxonomy */}
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800 block text-xs">
                              {item.category_id?.[0]?.label || "General Category"}
                            </span>
                            {item.subcategory_id?.[0] && (
                              <span className="text-[11px] text-slate-400 font-medium block">
                                {item.subcategory_id?.[0]?.label || item.subcategory_id?.[0]?.name}
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                item.status === "approved"
                                  ? item.is_active
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                  : item.status === "pending"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-rose-50 text-rose-600 border-rose-100"
                              }`}
                            >
                              {item.status === "approved" ? (item.is_active ? "Active" : "Disabled") : item.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(item);
                                }}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  item.is_active ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100" : "text-slate-400 hover:bg-slate-50 border-slate-200"
                                }`}
                                title="Toggle Active Status"
                              >
                                <Power size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(item);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
                                title="Edit Template"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item._id, item.name);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition cursor-pointer"
                                title="Delete Template"
                              >
                                <Trash2 size={13} />
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
// SUB-COMPONENT: SINGLE SERVICE SUGGESTION DETAILS AUDIT VIEW
// =========================================================
const ServiceSuggestionDetailsView = ({
  suggestion,
  onBack,
  onEdit,
  onDelete,
  onToggleStatus,
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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Service Catalog
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStatus}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl border transition cursor-pointer ${
              suggestion.is_active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Power size={13} /> {suggestion.is_active ? "Active" : "Disabled"}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit Template
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 shadow-xs transition cursor-pointer"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Main Inspection Container */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6">
        
        {/* Banner Hero Preview (Proportional Fit Container) */}
        <div className="relative w-full h-56 sm:h-80 bg-slate-50 overflow-hidden flex items-center justify-center p-4 group border-b border-slate-100">
          {suggestion.image ? (
            <img 
              src={suggestion.image} 
              alt={suggestion.name}
              className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(suggestion.image, `${suggestion.name} - Service Asset`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Wrench size={44} className="text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Image Uploaded</p>
            </div>
          )}

          {suggestion.image && (
            <button
              onClick={() => onOpenLightbox(suggestion.image, `${suggestion.name} - Service Asset`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1 font-black text-xs uppercase tracking-wider rounded-xl shadow-md ${
              suggestion.status === "approved"
                ? suggestion.is_active
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-600 text-white"
                : suggestion.status === "pending"
                ? "bg-amber-500 text-white"
                : "bg-rose-500 text-white"
            }`}>
              {suggestion.status === "approved" ? (suggestion.is_active ? "Live in Catalog" : "Disabled") : suggestion.status}
            </span>
            {suggestion.suggested_by && (
              <span className="px-3 py-1 bg-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                Merchant Contributed
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {suggestion.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-black rounded-xl">
                Template Active: {suggestion.is_active ? "Yes" : "No"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl whitespace-pre-line">
              {suggestion.description || "No specifications or scope details recorded for this master service template."}
            </p>
          </div>

          {/* Taxonomy Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers size={13} /> Target Category
              </span>
              <p className="text-xs font-bold text-blue-600 truncate">
                {suggestion.category_id?.[0]?.label || suggestion.category_id?.[0]?.name || "General"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Filter size={13} /> Subcategory Scope
              </span>
              <p className="text-xs font-bold text-slate-700 truncate">
                {suggestion.subcategory_id?.[0]?.label || suggestion.subcategory_id?.[0]?.name || "Universal"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={suggestion._id}>
                {suggestion._id}
              </p>
            </div>
          </div>
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
          {image.label || "Service Template Asset"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="service-suggestion.jpg"
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

// --- Embedded Presentational Stat Block Presenter ---
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

export default ServiceSuggestionsManager;