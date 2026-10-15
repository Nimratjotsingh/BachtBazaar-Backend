import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Filter, Layers, ChevronDown,
  Box, Sparkles, Tags, RefreshCw, Eye, FolderOpen, Tag,
  AlignLeft, AlertCircle, FileText, LayoutGrid, List,
  Calendar, Hash, Maximize2, Download, X, Check, CheckCircle2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api.js";

const SubOfferTypePage = ({ token }) => {
  // --- Core State Variables ---
  const [view, setView] = useState("list"); // Views: "list" | "details" | "editor"
  const [displayMode, setDisplayMode] = useState("grid"); // "grid" | "table"
  const [parentCategories, setParentCategories] = useState([]);
  const [subOffers, setSubOffers] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedSubOffer, setSelectedSubOffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom states tracking image upload components
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // Editor State Workspace
  const [formData, setFormData] = useState({
    _id: null,
    offertype_id: "", 
    label: "",
    description: "",
    isActive: true
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Core API: Fetch from /offer-types/admin ---
  const fetchParentCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await accountClient.get("/offer-types/admin", { headers });
      
      const categories = res.data.data || res.data.offerTypes || res.data || [];
      setParentCategories(categories);
      
      if (categories.length > 0 && !selectedParentId) {
        setSelectedParentId(categories[0]._id);
      }
    } catch (err) {
      console.error("Fetch parents error:", err);
      setError("Failed to stream category data structural snapshots from endpoint.");
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Sub-Offers for Selected Parent ---
  const fetchSubOffers = async (parentId) => {
    if (!parentId) return;
    try {
      setLoading(true);
      const res = await accountClient.get(`/subOfferType/${parentId}`, { headers });
      if (res.data.success) {
        setSubOffers(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch sub-offers error:", err);
      setError("Failed to sync sub-offer entries for this category.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentCategories();
  }, []);

  useEffect(() => {
    if (selectedParentId) {
      fetchSubOffers(selectedParentId);
    }
  }, [selectedParentId]);

  // --- Local Preview Handler ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // --- View Actions ---
  const handleCreateNew = () => {
    setSelectedFile(null);
    setImagePreview("");
    setFormData({
      _id: null,
      offertype_id: selectedParentId, 
      label: "",
      description: "",
      isActive: true
    });
    setError(null);
    setView("editor");
  };

  const handleEdit = (subOffer) => {
    setSelectedFile(null);
    setImagePreview(subOffer.icon ? `${import.meta.env.VITE_API_URL || ""}${subOffer.icon}` : "");
    setFormData({
      _id: subOffer._id,
      offertype_id: subOffer.offertype_id, 
      label: subOffer.label,
      description: subOffer.description || "",
      isActive: subOffer.isActive
    });
    setError(null);
    setView("editor");
  };

  const openSubOfferDetails = (subOffer) => {
    setSelectedSubOffer(subOffer);
    setView("details");
  };

  // --- Save Submit (Multipart Form Payload Packager) ---
  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!formData.offertype_id || !formData.label.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const multipartBody = new FormData();
    multipartBody.append("label", formData.label.trim());
    multipartBody.append("description", formData.description.trim());
    
    if (selectedFile) {
      multipartBody.append("icon", selectedFile);
    }

    try {
      if (formData._id) {
        multipartBody.append("isActive", formData.isActive);
        await accountClient.put(`/subOfferType/${formData._id}`, multipartBody, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      } else {
        multipartBody.append("offertype_id", formData.offertype_id);
        await accountClient.post("/subOfferType", multipartBody, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      }

      await fetchSubOffers(selectedParentId);
      setView("list");
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to commit system sub-type entry.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (id, label) => {
    if (!window.confirm(`Are you sure you want to delete sub-offer "${label || 'selected'}" permanently?`)) return;
    try {
      setLoading(true);
      await accountClient.delete(`/subOfferType/${id}`, { headers });
      if (selectedSubOffer?._id === id) {
        setView("list");
        setSelectedSubOffer(null);
      }
      await fetchSubOffers(selectedParentId);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.message || "Delete procedure was aborted.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setImagePreview("");
    setSelectedSubOffer(null);
    setFormData({
      _id: null,
      offertype_id: selectedParentId,
      label: "",
      description: "",
      isActive: true
    });
  };

  // Dynamic Metrics Summary Compiler Loop
  const computedMetrics = useMemo(() => {
    return {
      totalInParent: subOffers.length,
      activeCount: subOffers.filter(s => s.isActive).length,
      disabledCount: subOffers.filter(s => !s.isActive).length,
      hasGraphics: subOffers.filter(s => s.icon).length
    };
  }, [subOffers]);

  const filteredSubOffers = subOffers.filter(sub =>
    sub.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedParentCategoryObject = useMemo(() => {
    return parentCategories.find(p => p._id === selectedParentId);
  }, [parentCategories, selectedParentId]);

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE DETAILS VIEW
          ========================================== */}
      {view === "details" && selectedSubOffer && (
        <SubOfferTypeDetailsView
          subOffer={selectedSubOffer}
          parentCategory={selectedParentCategoryObject}
          onBack={() => { setView("list"); setSelectedSubOffer(null); }}
          onEdit={() => handleEdit(selectedSubOffer)}
          onDelete={() => handleDelete(selectedSubOffer._id, selectedSubOffer.label)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: FORM / EDITOR VIEW
          ========================================== */}
      {view === "editor" && (
        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button 
            onClick={() => { setView("list"); resetForm(); }} 
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Niches Registry
          </button>

          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#0F172A] uppercase tracking-tight">
                {formData._id ? "Modify Sub-Type Parameters" : "Initialize New Sub-Category"}
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Configure clean data layout parameters below.</p>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-2.5">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* Parent Dropdown Field Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FolderOpen size={12} /> Target Parent Offer Type
                </label>
                <div className="relative">
                  <select
                    disabled={!!formData._id} 
                    value={formData.offertype_id} 
                    onChange={(e) => setFormData({ ...formData, offertype_id: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all disabled:opacity-60"
                  >
                    {parentCategories.map(p => (
                      <option key={p._id} value={p._id}>{p.label || p.value}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                </div>
              </div>

              {/* Label Input Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Tag size={12} /> Sub-Category Label Name *
                </label>
                <input
                  required
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Premium Dining, Micro-breweries, Footwear Accessories..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                />
              </div>

              {/* Custom Icon Binary Selector Grid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ImageIcon size={12} /> Display Icon Graphic
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2.5 overflow-hidden shadow-inner shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-contain" alt="Icon Preview" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={28} />
                    )}
                  </div>
                  <div className="space-y-2 w-full text-center sm:text-left">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-slate-200 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition shadow-xs cursor-pointer"
                    >
                      Select Icon Asset
                    </button>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      PNG or JPEG format with a square aspect layout ratio preferred. Fits without clipping.
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Description Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <AlignLeft size={12} /> Context Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional conceptual overview notes detailing bounds..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
                />
              </div>

              {/* Active Running State Toggles */}
              {formData._id && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-xs font-black text-slate-700 uppercase block">Availability Status</span>
                    <span className="text-[11px] text-slate-400 font-medium">Controls visibility within product drop selections.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className="text-blue-600 transition cursor-pointer"
                  >
                    {formData.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">Disabled</span>
                    )}
                  </button>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setView("list"); resetForm(); }}
                  disabled={submitting}
                  className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} strokeWidth={2.5} />}
                  {formData._id ? "Commit Updates" : "Save Entry"}
                </button>
              </div>
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
                <Layers className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Sub-Offer Classifications
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Configure child-tier segment entries assigned to Master Categories</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => fetchSubOffers(selectedParentId)}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Ledger Dataset"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={handleCreateNew}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={18} strokeWidth={2.5} /> Create Sub-Type
              </button>
            </div>
          </div>

          {/* Stat Tickers */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox title="Total Scope Niches" val={computedMetrics.totalInParent} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerBox title="Active Segments" val={computedMetrics.activeCount} icon={<Box />} theme="bg-emerald-50 text-emerald-600 border-emerald-100" />
            <StatTickerBox title="Disabled Registry" val={computedMetrics.disabledCount} icon={<Tags />} theme="bg-rose-50 text-rose-600 border-rose-100" />
            <StatTickerBox title="Graphical Assets" val={computedMetrics.hasGraphics} icon={<Sparkles />} theme="bg-purple-50 text-purple-600 border-purple-100" />
          </div>

          {/* Search, Filter & Layout View Toggle Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              <div className="flex items-center gap-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl w-full sm:w-auto focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <FolderOpen size={15} className="text-slate-400" />
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-600 outline-none py-2 cursor-pointer pr-3 w-full sm:w-auto"
                >
                  {parentCategories?.map(parent => (
                    <option key={parent._id} value={parent._id}>
                      {parent.label || parent.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter sub-categories by label or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Grid vs Table Layout Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto">
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
              VIEW OPTION A: RESPONSIVE GRID VIEW (PROPORTIONAL FIT)
              ========================================================= */}
          {displayMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {loading && subOffers.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
                  <Loader2 className="animate-spin mb-2" size={36} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Streaming Schema Records...</p>
                </div>
              ) : filteredSubOffers.length === 0 ? (
                <div className="col-span-full py-20 text-center font-bold text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-2xl italic text-xs uppercase tracking-wider">
                  No matching sub-offer types found under this selection structure.
                </div>
              ) : (
                filteredSubOffers.map((sub) => {
                  const iconUrl = sub.icon ? `${import.meta.env.VITE_API_URL || ""}${sub.icon}` : null;
                  return (
                    <div
                      key={sub._id}
                      onClick={() => openSubOfferDetails(sub)}
                      className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Proportional Containment Box */}
                        <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 overflow-hidden">
                          {iconUrl ? (
                            <img 
                              src={iconUrl} 
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 drop-shadow-xs" 
                              alt={sub.label} 
                            />
                          ) : (
                            <FileText size={36} className="text-slate-300" />
                          )}

                          {/* Overlaid Status Badge */}
                          <div className="absolute top-2.5 right-2.5 pointer-events-none">
                            {sub.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-white/95 px-2.5 py-1 rounded-xl border border-emerald-100 shadow-2xs">
                                <Check size={10} strokeWidth={3} /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-white/95 px-2.5 py-1 rounded-xl border border-rose-100 shadow-2xs">
                                <X size={10} strokeWidth={3} /> Disabled
                              </span>
                            )}
                          </div>

                          {/* Direct Fullscreen Zoom Button */}
                          {iconUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({ src: iconUrl, label: `${sub.label} - Sub-Offer Icon` });
                              }}
                              className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Fullscreen Icon"
                            >
                              <Maximize2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="p-4 sm:p-5 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                              {sub.label}
                            </h3>
                            <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase shrink-0">
                              {sub.value || sub._id?.slice(-6)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 h-8">
                            {sub.description || "No specific sub-tier description parameters declared."}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="px-4 sm:px-5 pb-4 pt-1">
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Eye size={12} /> Inspect details
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(sub);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition cursor-pointer"
                              title="Edit Sub-Offer"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(sub._id, sub.label);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition cursor-pointer"
                              title="Delete Sub-Offer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* =========================================================
                VIEW OPTION B: TABLE LIST VIEW
                ========================================================= */
            <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Sub-Offer Segment</th>
                      <th className="px-6 py-4">Value Route Code</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-24 text-center">
                          <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Schema Records...</p>
                        </td>
                      </tr>
                    ) : filteredSubOffers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                          No matching sub-offer types found under this selection structure.
                        </td>
                      </tr>
                    ) : (
                      filteredSubOffers.map((sub) => {
                        const iconUrl = sub.icon ? `${import.meta.env.VITE_API_URL || ""}${sub.icon}` : null;
                        return (
                          <tr 
                            key={sub._id} 
                            onClick={() => openSubOfferDetails(sub)}
                            className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                <div 
                                  onClick={(e) => {
                                    if (iconUrl) {
                                      e.stopPropagation();
                                      setLightboxImage({ src: iconUrl, label: `${sub.label} - Sub-Offer Icon` });
                                    }
                                  }}
                                  className={`w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 ${iconUrl ? 'cursor-zoom-in group/img' : ''}`}
                                >
                                  {iconUrl ? (
                                    <img src={iconUrl} className="w-full h-full object-contain p-1.5 group-hover/img:scale-110 transition-transform duration-300" alt="" />
                                  ) : (
                                    <FileText size={16} className="text-slate-300" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate max-w-[240px] group-hover:text-blue-600 transition-colors">{sub.label}</div>
                                  {sub.description && <div className="text-[10px] text-slate-400 font-medium truncate max-w-xs mt-0.5">{sub.description}</div>}
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold border border-slate-200/40">
                                {sub.value || sub._id}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-center">
                              {sub.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100/50">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100/50">
                                  Disabled
                                </span>
                              )}
                            </td>
                            
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(sub);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer mr-1"
                                title="Edit Meta Elements"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(sub._id, sub.label);
                                }} 
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition cursor-pointer"
                                title="Purge Document Branch"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
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
// SUB-COMPONENT: SINGLE SUB-OFFER DETAILS AUDIT VIEW
// =========================================================
const SubOfferTypeDetailsView = ({ 
  subOffer, 
  parentCategory,
  onBack, 
  onEdit, 
  onDelete, 
  onOpenLightbox 
}) => {
  const iconUrl = subOffer.icon ? `${import.meta.env.VITE_API_URL || ""}${subOffer.icon}` : null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Niches Index
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit Sub-Type
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
        <div className="relative w-full h-52 sm:h-72 bg-slate-900 overflow-hidden flex items-center justify-center p-6 group">
          {iconUrl ? (
            <img 
              src={iconUrl} 
              alt={subOffer.label}
              className="w-full h-full max-w-[200px] object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(iconUrl, `${subOffer.label} - Sub-Offer Graphic`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 gap-2">
              <FileText size={44} className="text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Vector Icon Stamped</p>
            </div>
          )}

          {iconUrl && (
            <button
              onClick={() => onOpenLightbox(iconUrl, `${subOffer.label} - Sub-Offer Graphic`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              {parentCategory?.label || parentCategory?.value || "Parent Category"}
            </span>
            <span className={`px-3 py-1 font-black text-xs uppercase tracking-wider rounded-xl shadow-md ${
              subOffer.isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}>
              {subOffer.isActive ? "Active Distribution" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {subOffer.label}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Code: {subOffer.value || subOffer._id}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {subOffer.description || "No specific sub-tier description parameters or operational guidelines recorded for this sub-offer."}
            </p>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={subOffer._id}>
                {subOffer._id}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FolderOpen size={13} /> Parent Category ID
              </span>
              <p className="text-xs font-mono font-bold text-blue-600 truncate" title={subOffer.offertype_id}>
                {subOffer.offertype_id || "Unset"}
              </p>
            </div> */}

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} /> Recorded Date
              </span>
              <p className="text-xs font-bold text-slate-800">
                {subOffer.createdAt ? new Date(subOffer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "System Core Sub-Node"}
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
          {image.label || "Sub-Offer Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="sub-offer-icon.png"
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

export default SubOfferTypePage;