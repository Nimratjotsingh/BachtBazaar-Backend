import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Plus, Edit3, Trash2, Save, Loader2, ArrowLeft,
  Image as ImageIcon, Search, Filter, Eye, Tag, X, Layers,
  Box, RefreshCw, ChevronDown, CheckCircle2,
  DollarSign, Scale, Power, ChevronLeft, ChevronRight, Hash,
  Database, Sparkles, AlertCircle, LayoutGrid, List, Maximize2,
  Download, Droplets, Calendar, Shield
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const LAST_CATEGORY_KEY = "admin_last_suggestion_cat";
const LAST_SUBCATEGORY_KEY = "admin_last_suggestion_subcat";

const ProductSuggestionsManager = ({ token }) => {
  // --- Core Data States ---
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // --- Server Pagination & Metrics ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilteredItems, setTotalFilteredItems] = useState(0);
  const [serverTotalSuggestions, setServerTotalSuggestions] = useState(0);
  const limit = 10; // Fixed page size matching your server controller

  // --- Filters ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // --- Previews & Media ---
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newImagesPreviews, setNewImagesPreviews] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  const getSavedTaxonomy = () => ({
    category_id: localStorage.getItem(LAST_CATEGORY_KEY) || "",
    subcategory_id: localStorage.getItem(LAST_SUBCATEGORY_KEY) || ""
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: getSavedTaxonomy().category_id,
    subcategory_id: getSavedTaxonomy().subcategory_id,
    suggested_price: "",
    unit_size: "",
    weightValue: "",
    weightUnit: "g",
    volumeValue: "",
    volumeUnit: "ml",
    tags: [],
    thumbnailFile: null,
    newImagesFiles: [],
    is_active: true,
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // ==========================================
  // PIPELINE 1: FETCH DATA (SERVER-SIDE PAGINATION)
  // ==========================================
  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit,
        search: searchTerm.trim() || undefined,
        category: filterCategory !== "all" ? filterCategory : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      };

      const [suggestionsRes, catRes, subRes] = await Promise.all([
        accountClient.get("/admin/product-suggestions", { params, headers }),
        accountClient.get("/categories", { headers }),
        accountClient.get("/subcategories", { headers }),
      ]);

      const resData = suggestionsRes.data;
      setSuggestions(resData.data || []);

      // Pull counts from backend response structure
      const overall = resData.totalSuggestions ?? resData.pagination?.totalSuggestions ?? 0;
      const filtered = resData.filteredTotal ?? resData.pagination?.total ?? (resData.data || []).length;
      const pages = resData.pagination?.totalPages || Math.ceil(filtered / limit) || 1;

      setServerTotalSuggestions(overall);
      setTotalFilteredItems(filtered);
      setTotalPages(pages);

      setCategories(catRes.data.categories || catRes.data.data || []);
      setSubCategories(subRes.data.subCategories || subRes.data.data || []);
    } catch (err) {
      console.error("Error fetching suggestions list:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterCategory, filterStatus, headers]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Reset page to 1 whenever filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSuggestions();
  };

  // Subcategory options matching selected category
  const relevantSubCategories = useMemo(() => {
    if (!formData.category_id) return [];
    return subCategories.filter((sub) => {
      const parentId = (sub.categoryId?._id || sub.categoryId || sub.category_id)?.toString();
      return parentId === formData.category_id.toString();
    });
  }, [subCategories, formData.category_id]);

  // ==========================================
  // PIPELINE 2: TAG CHIPS & MEDIA HANDLERS
  // ==========================================
  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const cleanTag = tagInput.trim().toLowerCase().replace(/^#/, "");
      if (cleanTag && !formData.tags.includes(cleanTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, thumbnailFile: file }));
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData((prev) => ({ ...prev, newImagesFiles: files }));
      setNewImagesPreviews(files.map((file) => URL.createObjectURL(file)));
    }
  };

  const removeExistingImage = (indexToRemove) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ==========================================
  // PIPELINE 3: FORM SETUP & ACTIONS
  // ==========================================
  const handleOpenEdit = (item) => {
    setSelectedSuggestion(item);

    const categoryId = item.category_id?.[0]?._id || item.category_id?.[0] || item.category_id || "";
    const subcategoryId = item.subcategory_id?.[0]?._id || item.subcategory_id?.[0] || item.subcategory_id || "";

    setFormData({
      name: item.name || "",
      description: item.description || "",
      category_id: categoryId.toString(),
      subcategory_id: subcategoryId.toString(),
      suggested_price: item.suggested_price ?? "",
      unit_size: item.unit_size || "",
      weightValue: item.weight?.value ?? "",
      weightUnit: item.weight?.unit || "g",
      volumeValue: item.volume?.value ?? "",
      volumeUnit: item.volume?.unit || "ml",
      tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
      thumbnailFile: null,
      newImagesFiles: [],
      is_active: item.is_active ?? true,
    });

    setThumbnailPreview(item.thumbnail || null);
    setExistingImages(Array.isArray(item.images) ? item.images : []);
    setNewImagesPreviews([]);
    setTagInput("");
    setView("form");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Name and description are required.");
      return;
    }

    if (!selectedSuggestion && !formData.thumbnailFile) {
      alert("A master thumbnail image is required.");
      return;
    }

    if (formData.category_id) {
      localStorage.setItem(LAST_CATEGORY_KEY, formData.category_id);
    }
    if (formData.subcategory_id) {
      localStorage.setItem(LAST_SUBCATEGORY_KEY, formData.subcategory_id);
    } else {
      localStorage.removeItem(LAST_SUBCATEGORY_KEY);
    }

    const data = new FormData();
    data.append("name", formData.name.trim());
    data.append("description", formData.description.trim());
    data.append("is_active", String(formData.is_active));

    if (formData.category_id) data.append("category_id", JSON.stringify([formData.category_id]));
    if (formData.subcategory_id) data.append("subcategory_id", JSON.stringify([formData.subcategory_id]));
    if (formData.suggested_price !== "") data.append("suggested_price", formData.suggested_price);
    if (formData.unit_size) data.append("unit_size", formData.unit_size.trim());

    if (formData.tags && formData.tags.length > 0) {
      data.append("tags", JSON.stringify(formData.tags));
    }

    if (formData.weightValue !== "") {
      data.append("weight", JSON.stringify({ value: Number(formData.weightValue), unit: formData.weightUnit }));
    }

    if (formData.volumeValue !== "") {
      data.append("volume", JSON.stringify({ value: Number(formData.volumeValue), unit: formData.volumeUnit }));
    }

    if (formData.thumbnailFile) {
      data.append("thumbnail", formData.thumbnailFile);
    } else if (selectedSuggestion?.thumbnail) {
      data.append("existingThumbnail", selectedSuggestion.thumbnail);
    }

    data.append("existingImages", JSON.stringify(existingImages));
    formData.newImagesFiles.forEach((file) => data.append("images", file));

    try {
      setActionLoading(true);
      if (selectedSuggestion?._id) {
        await accountClient.put(`/admin/product-suggestions/${selectedSuggestion._id}`, data, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      } else {
        await accountClient.post("/admin/product-suggestions", data, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      }

      await fetchSuggestions();
      setView("list");
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
      alert(err.response?.data?.message || "Failed to commit suggestion data.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete master template "${name}"?`)) return;
    try {
      setActionLoading(true);
      await accountClient.delete(`/admin/product-suggestions/${id}`, { headers });
      if (selectedSuggestion?._id === id) {
        setView("list");
        setSelectedSuggestion(null);
      }
      await fetchSuggestions();
    } catch (err) {
      alert(err.response?.data?.message || "Delete request dropped.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await accountClient.patch(`/admin/product-suggestions/${id}/toggle-status`, {}, { headers });
      if (res.data.success) {
        setSuggestions((prev) =>
          prev.map((s) => (s._id === id ? { ...s, is_active: res.data.data.is_active } : s))
        );
        if (selectedSuggestion?._id === id) {
          setSelectedSuggestion((prev) => ({ ...prev, is_active: res.data.data.is_active }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Status toggle update failed.");
    }
  };

  const openSuggestionDetails = async (item) => {
    try {
      const res = await accountClient.get(`/admin/product-suggestions/${item._id}`, { headers });
      if (res.data.success && res.data.data) {
        setSelectedSuggestion(res.data.data);
      } else {
        setSelectedSuggestion(item);
      }
    } catch (err) {
      setSelectedSuggestion(item);
    }
    setView("details");
  };

  const resetForm = () => {
    const saved = getSavedTaxonomy();
    setFormData({
      name: "",
      description: "",
      category_id: saved.category_id,
      subcategory_id: saved.subcategory_id,
      suggested_price: "",
      unit_size: "",
      weightValue: "",
      weightUnit: "g",
      volumeValue: "",
      volumeUnit: "ml",
      tags: [],
      thumbnailFile: null,
      newImagesFiles: [],
      is_active: true,
    });
    setTagInput("");
    setThumbnailPreview(null);
    setExistingImages([]);
    setNewImagesPreviews([]);
    setSelectedSuggestion(null);
  };

  const getPaginationNumbers = () => {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE DETAILS VIEW
          ========================================== */}
      {view === "details" && selectedSuggestion && (
        <SuggestionDetailsView
          suggestion={selectedSuggestion}
          onBack={() => { setView("list"); setSelectedSuggestion(null); }}
          onEdit={() => handleOpenEdit(selectedSuggestion)}
          onDelete={() => handleDelete(selectedSuggestion._id, selectedSuggestion.name)}
          onToggleStatus={() => handleToggleStatus(selectedSuggestion._id)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: FORM / EDITOR VIEW
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
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Suggestions Ledger
          </button>

          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-4 gap-2">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {selectedSuggestion ? "Modify Master Product Suggestion" : "Create Master Product Suggestion"}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Define pre-approved catalog assets for instant merchant adoption</p>
              </div>
              {formData.category_id && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 w-fit">
                  Taxonomy Saved for Next Entry
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Product Title / Name *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Maggi 2-Minute Masala Instant Noodles 280g"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Full Description & Specifications *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide complete item specs, benefits, ingredients, or brand details..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Category Target *
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      value={formData.category_id}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        localStorage.setItem(LAST_CATEGORY_KEY, newCatId);
                        localStorage.removeItem(LAST_SUBCATEGORY_KEY);
                        setFormData({ ...formData, category_id: newCatId, subcategory_id: "" });
                      }}
                    >
                      <option value="">Select Category</option>
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all disabled:opacity-50"
                      value={formData.subcategory_id}
                      onChange={(e) => {
                        const newSubId = e.target.value;
                        localStorage.setItem(LAST_SUBCATEGORY_KEY, newSubId);
                        setFormData({ ...formData, subcategory_id: newSubId });
                      }}
                    >
                      <option value="">None / Universal Subcategory</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Suggested Retail Price (₹)
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800"
                      value={formData.suggested_price}
                      onChange={(e) => setFormData({ ...formData, suggested_price: e.target.value })}
                      placeholder="e.g., 45"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Unit Size Packaging Text
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800"
                    value={formData.unit_size}
                    onChange={(e) => setFormData({ ...formData, unit_size: e.target.value })}
                    placeholder="e.g., Pack of 4, 280g Pouch"
                  />
                </div>
              </div>

              {/* Interactive Tags Multi-Chip Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Suggested Search Tags (Type and press Enter or Comma)
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[90px] space-y-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
                      >
                        <Hash size={12} className="text-blue-500" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer ml-0.5"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tags (e.g. noodles, snack, quick-meal) and hit Enter..."
                    className="w-full bg-transparent border-none text-xs font-semibold outline-none text-slate-700 px-1 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Master Thumbnail Upload {selectedSuggestion ? "(Leave blank to keep existing)" : "*"}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-200 shadow-inner flex items-center justify-center p-2.5 shrink-0 overflow-hidden">
                    {thumbnailPreview ? (
                      <img src={thumbnailPreview} className="w-full h-full object-contain" alt="Thumbnail Preview" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={28} />
                    )}
                  </div>
                  <div className="space-y-2 w-full text-center sm:text-left">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="text-xs font-bold text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-xs hover:file:bg-blue-50 cursor-pointer w-full"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Clean high-resolution photo on clear background recommended.</p>
                  </div>
                </div>
              </div>

              {/* Extra Gallery Photos */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Additional Gallery Photos
                </label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImagesChange}
                    className="text-xs font-bold text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-xs hover:file:bg-blue-50 cursor-pointer w-full"
                  />

                  {existingImages.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Current Images:</span>
                      <div className="flex gap-2 flex-wrap">
                        {existingImages.map((src, i) => (
                          <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 flex items-center justify-center">
                            <img src={src} className="w-full h-full object-contain" alt="" />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(i)}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-rose-600 transition cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newImagesPreviews.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">New Files Staged:</span>
                      <div className="flex gap-2 flex-wrap">
                        {newImagesPreviews.map((src, i) => (
                          <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-blue-200 bg-white p-1 flex items-center justify-center">
                            <img src={src} className="w-full h-full object-contain" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Make template immediately available for auto-approved merchant adoption
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
                {selectedSuggestion ? "Update Master Suggestion" : "Save Master Suggestion"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-VIEW 3: PRIMARY LIST/GRID CATALOG
          ========================================== */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-800 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 pb-5">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Package className="text-blue-600" size={28} /> Product Suggestions Ledger
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs rounded-full shadow-xs">
                  <Database size={13} className="text-blue-600" />
                  <span>{serverTotalSuggestions} Available in Catalog</span>
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Pre-curated catalog repository. Merchants adopting these products bypass moderation queues.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={fetchSuggestions}
                className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={16} strokeWidth={2.5} /> Add Template
              </button>
            </div>
          </div>

          {/* Filter Matrix Toolbar + Grid/Table Toggle */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search catalog by title or #tags... (Press Enter)"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex-1 sm:flex-initial">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    className="bg-transparent text-xs font-bold outline-none py-2 cursor-pointer max-w-[180px] w-full"
                    value={filterCategory}
                    onChange={(e) => handleFilterChange(setFilterCategory, e.target.value)}
                  >
                    <option value="all">All Categories</option>
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
                    onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
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
                  <Loader2 className="animate-spin mx-auto mb-2" size={36} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading catalog page {currentPage}...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="col-span-full py-24 text-center font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[28px]">
                  <Box className="mx-auto mb-3 text-slate-300" size={44} />
                  <p className="text-sm">No master product suggestions matched this query.</p>
                </div>
              ) : (
                suggestions.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => openSuggestionDetails(item)}
                    className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Proportional Containment Box */}
                      <div className="relative w-full aspect-square sm:aspect-[4/3] bg-slate-50 flex items-center justify-center p-3 sm:p-4 border-b border-slate-100 overflow-hidden">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            alt={item.name}
                          />
                        ) : (
                          <ImageIcon size={32} className="text-slate-300" />
                        )}

                        {/* Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none font-black text-[9px] uppercase tracking-wider">
                          <span
                            className={`px-2 py-0.5 rounded-md shadow-xs text-white ${
                              item.is_active ? "bg-emerald-600" : "bg-slate-600"
                            }`}
                          >
                            {item.is_active ? "Active" : "Draft"}
                          </span>
                          {item.suggested_price && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md shadow-xs">
                              ₹{item.suggested_price}
                            </span>
                          )}
                        </div>

                        {/* Fullscreen Zoom Button */}
                        {item.thumbnail && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage({ src: item.thumbnail, label: `${item.name} - Thumbnail` });
                            }}
                            className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Fullscreen Image"
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
                          <div className="flex items-center gap-1.5 truncate">
                            <Scale size={12} className="text-slate-300 shrink-0" />
                            <span className="truncate">
                              Size:{" "}
                              <strong className="text-slate-700">
                                {item.unit_size ||
                                  (item.weight?.value ? `${item.weight.value} ${item.weight.unit}` : null) ||
                                  (item.volume?.value ? `${item.volume.value} ${item.volume.unit}` : null) ||
                                  "Standard"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {item.tags?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap h-5 overflow-hidden pt-0.5">
                            {item.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[9px] text-blue-600 font-bold"
                              >
                                <Tag size={8} /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 sm:px-5 pb-4 pt-1">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
                        <span className="inline-flex items-center gap-1 text-[10px]">
                          <Eye size={12} /> Adopted {item.usage_count || 0} times
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(item._id);
                            }}
                            className={`p-1.5 rounded-xl border transition cursor-pointer ${
                              item.is_active
                                ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                                : "text-slate-400 hover:bg-slate-50 border-slate-200"
                            }`}
                            title="Toggle Active State"
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
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
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
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-5 py-3.5">Product Suggestion</th>
                      <th className="px-5 py-3.5">Category & Taxonomy</th>
                      <th className="px-5 py-3.5">Retail Price & Size</th>
                      <th className="px-5 py-3.5 text-center">Adoptions</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-24 text-center">
                          <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={30} />
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Loading catalog page {currentPage}...</p>
                        </td>
                      </tr>
                    ) : suggestions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic">
                          <Box className="mx-auto mb-2 text-slate-300" size={36} />
                          No master product suggestions matched this query.
                        </td>
                      </tr>
                    ) : (
                      suggestions.map((item) => (
                        <tr 
                          key={item._id} 
                          onClick={() => openSuggestionDetails(item)}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        >
                          {/* Thumbnail & Title */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3.5">
                              <div 
                                onClick={(e) => {
                                  if (item.thumbnail) {
                                    e.stopPropagation();
                                    setLightboxImage({ src: item.thumbnail, label: `${item.name} - Thumbnail` });
                                  }
                                }}
                                className={`w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs ${item.thumbnail ? 'cursor-zoom-in' : ''}`}
                              >
                                {item.thumbnail ? (
                                  <img src={item.thumbnail} className="w-full h-full object-contain" alt="" />
                                ) : (
                                  <ImageIcon size={20} className="text-slate-300" />
                                )}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="font-extrabold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                                  {item.name}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate max-w-sm">
                                  {item.description}
                                </p>
                                {item.tags?.length > 0 && (
                                  <div className="flex gap-1 flex-wrap pt-0.5">
                                    {item.tags.slice(0, 3).map((t, idx) => (
                                      <span key={idx} className="text-[9px] font-bold text-blue-600 bg-blue-50/70 px-1.5 py-0.2 rounded border border-blue-100/60">
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Taxonomy */}
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-800 block text-xs">
                              {item.category_id?.[0]?.label || item.category_id?.[0]?.name || "Uncategorized"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium block">
                              {item.subcategory_id?.[0]?.label || item.subcategory_id?.[0]?.name || "Universal"}
                            </span>
                          </td>

                          {/* Price & Packaging */}
                          <td className="px-5 py-3.5">
                            <div className="font-black text-slate-900 text-xs">
                              {item.suggested_price ? `₹${item.suggested_price}` : "Free / Open"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {item.unit_size || (item.weight?.value ? `${item.weight.value} ${item.weight.unit}` : null) || "Standard"}
                            </div>
                          </td>

                          {/* Usage Count */}
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Eye size={11} className="text-slate-400" /> {item.usage_count || 0}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              item.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {item.is_active ? "Active" : "Disabled"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(item._id);
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
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
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

          {/* Server Pagination Footer */}
          {!loading && totalFilteredItems > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <div>
                Showing{" "}
                <strong className="text-slate-800">
                  {(currentPage - 1) * limit + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-800">
                  {Math.min(currentPage * limit, totalFilteredItems)}
                </strong>{" "}
                of <strong className="text-slate-800">{totalFilteredItems}</strong> entries
                {serverTotalSuggestions > 0 && (
                  <span className="text-slate-400 font-normal ml-1">
                    (filtered from <strong className="text-slate-700">{serverTotalSuggestions}</strong> total templates)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  title="Previous 10"
                >
                  <ChevronLeft size={15} />
                </button>

                {getPaginationNumbers().map((pageNum, idx) =>
                  pageNum === "..." ? (
                    <span key={idx} className="px-1.5 text-slate-400 select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold transition cursor-pointer flex items-center justify-center text-xs ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white shadow-xs shadow-blue-200"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  title="Next 10"
                >
                  <ChevronRight size={15} />
                </button>
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
// SUB-COMPONENT: SINGLE SUGGESTION DETAILS AUDIT VIEW
// =========================================================
const SuggestionDetailsView = ({
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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Suggestions Ledger
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
          {suggestion.thumbnail ? (
            <img 
              src={suggestion.thumbnail} 
              alt={suggestion.name}
              className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(suggestion.thumbnail, `${suggestion.name} - Thumbnail`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <ImageIcon size={44} className="text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Image Uploaded</p>
            </div>
          )}

          {suggestion.thumbnail && (
            <button
              onClick={() => onOpenLightbox(suggestion.thumbnail, `${suggestion.name} - Thumbnail`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1 font-black text-xs uppercase tracking-wider rounded-xl shadow-md ${
              suggestion.is_active ? "bg-emerald-600 text-white" : "bg-slate-600 text-white"
            }`}>
              {suggestion.is_active ? "Live in Catalog" : "Draft Mode"}
            </span>
            {suggestion.suggested_price && (
              <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                ₹{suggestion.suggested_price}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          
          {/* --- CREATOR ATTRIBUTION BANNER --- */}
          {suggestion.created_by && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                  suggestion.created_by_model === "Staff" ? "bg-amber-600" : "bg-blue-600"
                }`}>
                  <Shield size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {suggestion.created_by?.name || "System Administrator"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      suggestion.created_by_model === "Staff" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {suggestion.created_by_model || "Admin"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Template originally created and published by {suggestion.created_by?.email || "authorized personnel"}
                  </p>
                </div>
              </div>
              {suggestion.createdAt && (
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 sm:text-right">
                  <Calendar size={13} /> {new Date(suggestion.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {suggestion.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-black rounded-xl">
                Adopted {suggestion.usage_count || 0} times
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {suggestion.description || "No specifications or details recorded for this master template."}
            </p>
          </div>

          {/* Pricing, Packaging & Physical Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Suggested Price</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {suggestion.suggested_price ? `₹${suggestion.suggested_price}` : "Free / Open"}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Packaging / Size</span>
              <div className="text-base font-black text-slate-800 mt-0.5 truncate">
                {suggestion.unit_size || "Standard"}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Weight Measurement</span>
              <div className="text-base font-black text-slate-800 mt-0.5 truncate">
                {suggestion.weight?.value ? `${suggestion.weight.value} ${suggestion.weight.unit}` : "Unset"}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Volume Measurement</span>
              <div className="text-base font-black text-slate-800 mt-0.5 truncate">
                {suggestion.volume?.value ? `${suggestion.volume.value} ${suggestion.volume.unit}` : "Unset"}
              </div>
            </div>
          </div>

          {/* Taxonomy Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers size={13} /> Parent Category
              </span>
              <p className="text-xs font-bold text-blue-600 truncate">
                {suggestion.category_id?.[0]?.label || suggestion.category_id?.[0]?.name || "General"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Filter size={13} /> Target Subcategory
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

          {/* Associated Search Tags */}
          {suggestion.tags && suggestion.tags.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Associated Search Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl">
                    <Tag size={10} className="text-blue-500" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Gallery Photos */}
          {suggestion.images && suggestion.images.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Attached Gallery Photos</span>
              <div className="flex gap-2.5 flex-wrap">
                {suggestion.images.map((src, i) => (
                  <div 
                    key={i} 
                    onClick={() => onOpenLightbox(src, `${suggestion.name} - Gallery Photo ${i + 1}`)}
                    className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400 transition"
                  >
                    <img src={src} className="w-full h-full object-contain" alt="" />
                  </div>
                ))}
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
          {image.label || "Product Suggestion Asset"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="suggestion-product.jpg"
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

export default ProductSuggestionsManager;