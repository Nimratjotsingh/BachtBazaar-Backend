import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Plus, Edit3, Trash2, Save, Loader2, ArrowLeft,
  Image as ImageIcon, Search, Filter, Eye, Tag, X, Layers,
  Box, Sparkles, Tags, RefreshCw, ChevronDown, CheckCircle2,
  DollarSign, Scale, Droplets, Power, ChevronLeft, ChevronRight, Hash
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const LAST_CATEGORY_KEY = "admin_last_suggestion_cat";
const LAST_SUBCATEGORY_KEY = "admin_last_suggestion_subcat";

const ProductSuggestionsManager = ({ token }) => {
  // --- Core Lifecycle States ---
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Previews & Retained Image State
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newImagesPreviews, setNewImagesPreviews] = useState([]);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // --- Tag Input Field State ---
  const [tagInput, setTagInput] = useState("");

  // --- Form State ---
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
  // PIPELINE 1: INITIAL DATA STREAM
  // ==========================================
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [suggestionsRes, catRes, subRes] = await Promise.all([
        accountClient.get("/admin/product-suggestions", { headers }),
        accountClient.get("/categories", { headers }),
        accountClient.get("/subcategories", { headers }),
      ]);

      setSuggestions(suggestionsRes.data.data || []);
      setCategories(catRes.data.categories || catRes.data.data || []);
      setSubCategories(subRes.data.subCategories || subRes.data.data || []);
    } catch (err) {
      console.error("Error fetching initial product suggestion records:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, itemsPerPage]);

  // Dynamic subcategories based on chosen category
  const relevantSubCategories = useMemo(() => {
    if (!formData.category_id) return [];
    return subCategories.filter((sub) => {
      const parentId = (sub.categoryId?._id || sub.categoryId || sub.category_id)?.toString();
      return parentId === formData.category_id.toString();
    });
  }, [subCategories, formData.category_id]);

  // ==========================================
  // PIPELINE 2: TAG CHIP MANAGEMENT
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

  // ==========================================
  // PIPELINE 3: MEDIA HANDLERS
  // ==========================================
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
  // PIPELINE 4: EDIT TRIGGER & FORM POPULATION
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

  // ==========================================
  // PIPELINE 5: PERSISTENCE & MUTATIONS
  // ==========================================
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

    // Persist last selected category & subcategory to localStorage
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

    if (formData.category_id) {
      data.append("category_id", JSON.stringify([formData.category_id]));
    }
    if (formData.subcategory_id) {
      data.append("subcategory_id", JSON.stringify([formData.subcategory_id]));
    }
    if (formData.suggested_price !== "") {
      data.append("suggested_price", formData.suggested_price);
    }
    if (formData.unit_size) {
      data.append("unit_size", formData.unit_size.trim());
    }

    // Append tags array
    if (formData.tags && formData.tags.length > 0) {
      data.append("tags", JSON.stringify(formData.tags));
    }

    if (formData.weightValue !== "") {
      data.append(
        "weight",
        JSON.stringify({
          value: Number(formData.weightValue),
          unit: formData.weightUnit,
        })
      );
    }

    if (formData.volumeValue !== "") {
      data.append(
        "volume",
        JSON.stringify({
          value: Number(formData.volumeValue),
          unit: formData.volumeUnit,
        })
      );
    }

    if (formData.thumbnailFile) {
      data.append("thumbnail", formData.thumbnailFile);
    } else if (selectedSuggestion && selectedSuggestion.thumbnail) {
      data.append("existingThumbnail", selectedSuggestion.thumbnail);
    }

    data.append("existingImages", JSON.stringify(existingImages));

    formData.newImagesFiles.forEach((file) => {
      data.append("images", file);
    });

    try {
      setLoading(true);
      if (selectedSuggestion?._id) {
        await accountClient.put(
          `/admin/product-suggestions/${selectedSuggestion._id}`,
          data,
          { headers: { ...headers, "Content-Type": "multipart/form-data" } }
        );
      } else {
        await accountClient.post("/admin/product-suggestions", data, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      }

      await fetchInitialData();
      setView("list");
      resetForm();
    } catch (err) {
      console.error("Save product suggestion error:", err);
      alert(err.response?.data?.message || "Operation failed to commit suggestion data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently remove template "${name}" from master suggestions?`)) return;
    try {
      setLoading(true);
      await accountClient.delete(`/admin/product-suggestions/${id}`, { headers });
      await fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || "Delete request dropped.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await accountClient.patch(
        `/admin/product-suggestions/${id}/toggle-status`,
        {},
        { headers }
      );
      if (res.data.success) {
        setSuggestions((prev) =>
          prev.map((s) => (s._id === id ? { ...s, is_active: res.data.data.is_active } : s))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Status toggle update failed.");
    }
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

  // ==========================================
  // DERIVED DATA & PAGINATION
  // ==========================================
  const computedMetrics = useMemo(() => {
    return {
      total: suggestions.length,
      active: suggestions.filter((s) => s.is_active).length,
      adopted: suggestions.reduce((acc, s) => acc + (s.usage_count || 0), 0),
      inactive: suggestions.filter((s) => !s.is_active).length,
    };
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const itemCatId = (item.category_id?.[0]?._id || item.category_id?.[0] || item.category_id)?.toString();
      const matchesCategory = filterCategory === "all" || itemCatId === filterCategory;

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && item.is_active) ||
        (filterStatus === "inactive" && !item.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suggestions, searchTerm, filterCategory, filterStatus]);

  const totalItems = filteredSuggestions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedSuggestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuggestions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSuggestions, currentPage, itemsPerPage]);

  const getPaginationNumbers = () => {
    const delta = 1;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");

    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Suggestion Catalog
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
              {selectedSuggestion ? "Modify Master Product Suggestion" : "Create Master Product Suggestion"}
            </h2>
            {formData.category_id && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                Taxonomy Saved for Next Entry
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Title */}
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

            {/* Description */}
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

            {/* Category & Subcategory (With Auto-Save on change) */}
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
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      localStorage.setItem(LAST_CATEGORY_KEY, newCatId);
                      localStorage.removeItem(LAST_SUBCATEGORY_KEY);
                      setFormData({
                        ...formData,
                        category_id: newCatId,
                        subcategory_id: "",
                      });
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all disabled:opacity-50"
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

            {/* Suggested Pricing & Unit Size */}
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm"
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
              <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} className="w-full h-full object-cover" alt="Thumbnail Preview" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={24} />
                  )}
                </div>
                <div className="space-y-1.5 w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-sm hover:file:bg-blue-50 cursor-pointer w-full"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Clean high-resolution photo on clear background recommended.
                  </p>
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
                  className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-sm hover:file:bg-blue-50 cursor-pointer w-full"
                />

                {existingImages.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Current Images:</span>
                    <div className="flex gap-2 flex-wrap">
                      {existingImages.map((src, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white group">
                          <img src={src} className="w-full h-full object-cover" alt="" />
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
                        <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-blue-200 bg-white">
                          <img src={src} className="w-full h-full object-cover" alt="" />
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
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
              {selectedSuggestion ? "Update Master Suggestion" : "Save Master Suggestion"}
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
            <Package className="text-blue-600 w-8 h-8" /> Product Suggestions Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Curate master product templates. Merchants selecting these items bypass approval queues.
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
            <Plus size={18} strokeWidth={2.5} /> Create Master Suggestion
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox
          title="Total Master Templates"
          val={computedMetrics.total}
          icon={<Package />}
          theme="bg-blue-50 text-blue-600 border-blue-100"
        />
        <StatTickerBox
          title="Active & Approvable"
          val={computedMetrics.active}
          icon={<CheckCircle2 />}
          theme="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatTickerBox
          title="Merchant Store Adoptions"
          val={computedMetrics.adopted}
          icon={<Layers />}
          theme="bg-purple-50 text-purple-600 border-purple-100"
        />
        <StatTickerBox
          title="Inactive / Drafted"
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
            placeholder="Search templates by product title or tags..."
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
              <option value="all">All Category Targets</option>
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
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
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
              Loading Master Suggestion Packages...
            </p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="col-span-full text-center py-16 font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[24px] text-xs uppercase tracking-wider italic">
            No master product templates matched your filtered parameters.
          </div>
        ) : (
          paginatedSuggestions.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-44 bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      alt={item.name}
                    />
                  ) : (
                    <ImageIcon size={28} className="text-slate-300" />
                  )}

                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap font-black text-[9px] uppercase tracking-wider">
                    <span
                      className={`px-2 py-0.5 rounded-md shadow-sm text-white ${
                        item.is_active ? "bg-emerald-600" : "bg-slate-600"
                      }`}
                    >
                      {item.is_active ? "Active" : "Draft"}
                    </span>
                    {item.suggested_price && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md shadow-sm">
                        ₹{item.suggested_price}
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

                  <div className="space-y-1 text-[11px] font-bold text-slate-400">
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
                    <div className="flex items-center gap-1.5">
                      <Scale size={12} className="text-slate-300" />
                      <span>
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
              <div className="px-5 pb-5 pt-1">
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> Adopted {item.usage_count || 0} times
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(item._id)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        item.is_active
                          ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                          : "text-slate-400 hover:bg-slate-50 border-slate-200"
                      }`}
                      title="Toggle Active State"
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

      {/* Pagination Bar */}
      {!loading && totalItems > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Showing{" "}
              <strong className="text-slate-800">
                {(currentPage - 1) * itemsPerPage + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </strong>{" "}
              of <strong className="text-slate-800">{totalItems}</strong> entries
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-slate-400">Cards/page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700 cursor-pointer"
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={24}>24</option>
                <option value={32}>32</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {getPaginationNumbers().map((pageNum, idx) =>
              pageNum === "..." ? (
                <span key={idx} className="px-2 text-slate-400 select-none">
                  ...
                </span>
              ) : (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer flex items-center justify-center ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
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

export default ProductSuggestionsManager;