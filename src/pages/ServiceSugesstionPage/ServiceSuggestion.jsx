import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wrench, Plus, Edit3, Trash2, Save, Loader2, ArrowLeft,
  Image as ImageIcon, Search, Filter, Eye, Tag, X, Layers,
  Box, Sparkles, RefreshCw, ChevronDown, CheckCircle2,
  DollarSign, Power, Clock, Check, AlertCircle
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const ServiceSuggestionsManager = ({ token }) => {
  // --- Core Lifecycle States ---
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Previews & Image State
  const [imagePreview, setImagePreview] = useState(null);

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
    if (!window.confirm(`Permanently remove master service template "${name}"?`)) return;
    try {
      setLoading(true);
      await accountClient.delete(`/admin/service-suggestions/${id}`, { headers });
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

  // ==========================================
  // VIEW: FORM (CREATE / EDIT)
  // ==========================================
  if (view === "form") {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
        <button
          onClick={() => {
            setView("list");
            resetForm();
          }}
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Service Catalog
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
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
              <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Service Preview" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={24} />
                  )}
                </div>
                <div className="space-y-1.5 w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-sm hover:file:bg-blue-50 cursor-pointer w-full"
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
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
              {selectedSuggestion ? "Update Service Template" : "Save Master Service Template"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIST / GALLERY
  // ==========================================
  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <Wrench className="text-blue-600 w-8 h-8" /> Service Suggestions Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Curate standardized service templates. Merchants picking from these suggestions skip pending verification queues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInitialData}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Dataset"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setView("form");
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Create Service Suggestion
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox
          title="Total Service Templates"
          val={computedMetrics.total}
          icon={<Wrench />}
          theme="bg-blue-50 text-blue-600 border-blue-100"
        />
        <StatTickerBox
          title="Active & Auto-Approvable"
          val={computedMetrics.approved}
          icon={<CheckCircle2 />}
          theme="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatTickerBox
          title="Pending Merchant Submissions"
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search service templates by title or scope..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter size={14} className="text-slate-400" />
            <select
              className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer max-w-[180px]"
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

          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Power size={14} className="text-slate-400" />
            <select
              className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer"
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

      {/* Grid of Catalog Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && suggestions.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
            <Loader2 className="animate-spin mb-2" size={36} />
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Loading Master Service Suggestions...
            </p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="col-span-full text-center py-16 font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[24px] text-xs uppercase tracking-wider italic">
            No master service templates matched your filtered parameters.
          </div>
        ) : (
          filteredSuggestions.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-44 bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={item.name}
                    />
                  ) : (
                    <ImageIcon size={32} className="text-slate-300" />
                  )}

                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap font-black text-[9px] uppercase tracking-wider">
                    <span
                      className={`px-2 py-0.5 rounded-md shadow-sm text-white ${
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
                      <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md shadow-sm">
                        Merchant Contributed
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-[#0F172A] line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="space-y-1.5 text-[11px] font-bold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Filter size={12} className="text-slate-300" />
                      <span>
                        Category:{" "}
                        <strong className="text-blue-600">
                          {item.category_id?.[0]?.label ||
                            item.category_id?.[0]?.name ||
                            "General"}
                        </strong>
                      </span>
                    </div>

                    {item.subcategory_id?.[0] && (
                      <div className="flex items-center gap-1.5">
                        <Layers size={12} className="text-slate-300" />
                        <span>
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
              <div className="px-5 pb-5 pt-1">
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-400">
                  <span className="text-[10px] text-slate-400">
                    {item.status === "pending" ? "Awaiting review" : "Master verified"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        item.is_active
                          ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                          : "text-slate-400 hover:bg-slate-50 border-slate-200"
                      }`}
                      title="Toggle Active Availability"
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition cursor-pointer"
                      title="Modify Template"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id, item.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

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

export default ServiceSuggestionsManager;