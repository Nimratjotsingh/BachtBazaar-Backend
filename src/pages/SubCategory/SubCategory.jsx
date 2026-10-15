import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Filter, Layers, ChevronDown,
  Box, Sparkles, Tags, RefreshCw, Eye, LayoutGrid, List,
  Calendar, Hash, Maximize2, Download, X, ExternalLink,
  FolderTree, Info, CheckCircle2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const SubCategoryPage = ({ token }) => {
  // --- Core Lifecycle States ---
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Form State
  const [formData, setFormData] = useState({ 
    value: "", 
    label: "", 
    description: "", 
    categoryId: "", 
    image: null,
    type: "none" 
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [subRes, catRes] = await Promise.all([
        accountClient.get("/subcategories", { headers }),
        accountClient.get("/categories", { headers })
      ]);
      setSubCategories(subRes.data.subCategories || subRes.data.data || []);
      setCategories(catRes.data.categories || catRes.data.data || []);
    } catch (err) {
      console.error("Error loading initial configuration datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("value", formData.value.toLowerCase().trim());
    data.append("label", formData.label.trim());
    data.append("description", formData.description.trim());
    data.append("categoryId", formData.categoryId);
    data.append("type", formData.type); 
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      if (selectedSub?._id) {
        await accountClient.put(`/subcategories/${selectedSub._id}`, data, { headers });
      } else {
        await accountClient.post("/subcategories", data, { headers });
      }
      await fetchInitialData();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed to complete");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ value: "", label: "", description: "", categoryId: "", image: null, type: "none" });
    setImagePreview(null);
    setSelectedSub(null);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Move sub-category "${name || 'selected'}" permanently to trash?`)) return;
    try {
      await accountClient.delete(`/subcategories/${id}`, { headers });
      if (selectedSub?._id === id) {
        setView("list");
        setSelectedSub(null);
      }
      fetchInitialData();
    } catch (err) {
      alert("Delete operation encountered an error");
    }
  };

  const openSubDetails = (sub) => {
    setSelectedSub(sub);
    setView("details");
  };

  const openSubEdit = (sub) => {
    setSelectedSub(sub);
    setImagePreview(sub.image ? `${sub.image}` : null);
    setFormData({ 
      label: sub.label, 
      value: sub.value, 
      description: sub.description || "", 
      categoryId: sub.categoryId?._id || sub.categoryId || "",
      type: sub.type || "none",
      image: null
    });
    setView("form");
  };

  // Dynamic Dashboard Stats
  const computedMetrics = useMemo(() => {
    return {
      total: subCategories.length,
      productType: subCategories.filter(s => s.type === 'product').length,
      serviceType: subCategories.filter(s => s.type === 'service').length,
      generalType: subCategories.filter(s => !s.type || s.type === 'none').length
    };
  }, [subCategories]);

  // Combined Search & Category Filters
  const filteredData = subCategories.filter(item => {
    const matchesSearch = item.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.value?.toLowerCase().includes(searchTerm.toLowerCase());
    const itemCatId = (item.categoryId?._id || item.categoryId)?.toString();
    const matchesCategory = filterCategory === "all" || itemCatId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE DETAILS VIEW
          ========================================== */}
      {view === "details" && selectedSub && (
        <SubCategoryDetailsView
          subCategory={selectedSub}
          onBack={() => { setView("list"); setSelectedSub(null); }}
          onEdit={() => openSubEdit(selectedSub)}
          onDelete={() => handleDelete(selectedSub._id, selectedSub.label)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: FORM CREATE / EDIT VIEW
          ========================================== */}
      {view === "form" && (
        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button 
            onClick={() => { setView("list"); resetForm(); }} 
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Niches Registry
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {selectedSub ? "Modify Sub-Category Details" : "Create Sub-Category Branch"}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Map micro niche segments under platform parent categories.</p>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Parent Category Scope *</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    >
                      <option value="">Select Parent Category</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label || cat.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sub-Category Type</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="none">None (General Segment)</option>
                      <option value="product">Product (Physical Inventory)</option>
                      <option value="service">Service (Labor/Task Mapping)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Niche Display Label *</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="e.g., Smart Phones" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Value Key (Slug) *</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="e.g., smart_phones" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Description / Scope Metrics</label>
                <textarea rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none resize-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 leading-relaxed" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe specific branch rules or scope bounds..." />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sub-Category Representative Image</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
                    {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-300" size={24} />}
                  </div>
                  <div className="space-y-1.5 w-full text-center sm:text-left">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-xs hover:file:bg-blue-50 cursor-pointer w-full" />
                    <p className="text-[10px] text-slate-400 font-medium">Standard square-scaled bounding artwork assets recommended.</p>
                  </div>
                </div>
              </div>

              <button 
                disabled={loading} 
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Sub-Category Configuration
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
                <Layers className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Sub-Classification Branches
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage second-level relational niches and target micro product spaces</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={fetchInitialData}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Ledger Dataset"
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
                <Plus size={18} strokeWidth={2.5} /> Add Sub-Category
              </button>
            </div>
          </div>

          {/* Stat Tickers */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox title="Total Sub-Categories" val={computedMetrics.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerBox title="Physical Goods (Product)" val={computedMetrics.productType} icon={<Box />} theme="bg-purple-50 text-purple-600 border-purple-100" />
            <StatTickerBox title="Labor Utilities (Service)" val={computedMetrics.serviceType} icon={<Sparkles />} theme="bg-cyan-50 text-cyan-600 border-cyan-100" />
            <StatTickerBox title="General Branches" val={computedMetrics.generalType} icon={<Tags />} theme="bg-slate-50 text-slate-600 border-slate-200" />
          </div>

          {/* Search, Filter & Layout Toggle Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search running niches by title or slug..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl w-full sm:w-auto">
                <Filter size={14} className="text-slate-400" />
                <select 
                  className="bg-transparent text-xs font-bold text-slate-600 outline-none py-2 cursor-pointer pr-3 w-full sm:w-auto"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">All Parent Categories</option>
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label || cat.name}</option>)}
                </select>
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
              VIEW OPTION A: RESPONSIVE GRID VIEW
              ========================================================= */}
          {displayMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {loading && subCategories.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
                  <Loader2 className="animate-spin mb-2" size={36} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Loading Sub-Category Branches...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-bold text-xs uppercase tracking-wider italic">
                  No matching sub-classification metrics logs discovered in system directory.
                </div>
              ) : (
                filteredData.map((sub) => (
                  <div
                    key={sub._id}
                    onClick={() => openSubDetails(sub)}
                    className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Responsive Image Aspect Box */}
                      <div className="relative w-full aspect-video bg-slate-100 border-b border-slate-100 overflow-hidden">
                        {sub.image ? (
                          <img 
                            src={sub.image} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            alt={sub.label} 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                            <ImageIcon size={36} />
                          </div>
                        )}

                        {/* Overlaid Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 pointer-events-none">
                          <span className="px-2 py-0.5 bg-blue-600/90 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-md backdrop-blur-xs truncate max-w-[150px]">
                            {sub.categoryId?.label || "General Category"}
                          </span>
                          <span className={`px-2 py-0.5 bg-white/95 backdrop-blur-xs font-black text-[9px] uppercase tracking-wider rounded-md border ${
                            sub.type === 'product' ? 'text-purple-600 border-purple-200' :
                            sub.type === 'service' ? 'text-cyan-600 border-cyan-200' : 'text-slate-600 border-slate-200'
                          }`}>
                            {sub.type || 'none'}
                          </span>
                        </div>

                        {/* Direct Fullscreen Button */}
                        {sub.image && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage({ src: sub.image, label: `${sub.label} - Sub-Category Image` });
                            }}
                            className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Fullscreen Image"
                          >
                            <Maximize2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                            {sub.label}
                          </h3>
                          <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase shrink-0">
                            {sub.value}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 h-8">
                          {sub.description || "No specific branch rules or scope bounds provided."}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Card Footer Actions */}
                    <div className="px-5 pb-4 pt-1">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Eye size={12} /> Inspect details
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubEdit(sub);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition cursor-pointer"
                            title="Edit Subcategory"
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
                            title="Delete Subcategory"
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
                VIEW OPTION B: TABLE LIST LEDGER VIEW
                ========================================================= */
            <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Sub-Category Niche</th>
                      <th className="px-6 py-4">Branch Type</th>
                      <th className="px-6 py-4">Mapped Parent Grouping</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-24 text-center">
                          <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Subcategories Tree...</p>
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                          No matching sub-classification metrics logs discovered.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((sub) => (
                        <tr 
                          key={sub._id} 
                          onClick={() => openSubDetails(sub)}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div 
                                onClick={(e) => {
                                  if (sub.image) {
                                    e.stopPropagation();
                                    setLightboxImage({ src: sub.image, label: `${sub.label} - Sub-Category Image` });
                                  }
                                }}
                                className={`w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 ${sub.image ? 'cursor-zoom-in group/img' : ''}`}
                              >
                                {sub.image ? (
                                  <img src={sub.image} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt="" />
                                ) : (
                                  <ImageIcon size={18} className="text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 truncate max-w-[200px] group-hover:text-blue-600 transition-colors">{sub.label}</div>
                                <div className="text-[9px] font-bold text-slate-400 font-mono tracking-wide uppercase mt-0.5">Slug: {sub.value}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                              sub.type === 'product' ? 'bg-purple-50 text-purple-600 border-purple-100/60' :
                              sub.type === 'service' ? 'bg-cyan-50 text-cyan-600 border-cyan-100/60' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {sub.type || 'none'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black tracking-wide">
                              {sub.categoryId?.label || "Uncategorized"}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openSubEdit(sub);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer mr-1"
                              title="Edit Subcategory"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(sub._id, sub.label);
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <Trash2 size={15} />
                            </button>
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
// SUB-COMPONENT: SINGLE SUB-CATEGORY DETAILS VIEW
// =========================================================
const SubCategoryDetailsView = ({ 
  subCategory, 
  onBack, 
  onEdit, 
  onDelete, 
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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Sub-Classification Registry
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit Subcategory
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
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6">
        
        {/* Banner Hero Image */}
        <div className="relative w-full h-64 sm:h-72 bg-slate-900 overflow-hidden flex items-center justify-center group">
          {subCategory.image ? (
            <img 
              src={subCategory.image} 
              alt={subCategory.label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(subCategory.image, `${subCategory.label} - Sub-Category Graphic`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 gap-2">
              <ImageIcon size={44} className="text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Hero Graphic Uploaded</p>
            </div>
          )}

          {subCategory.image && (
            <button
              onClick={() => onOpenLightbox(subCategory.image, `${subCategory.label} - Sub-Category Graphic`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              {subCategory.categoryId?.label || "General Category"}
            </span>
            <span className={`px-3 py-1 bg-white/95 backdrop-blur-xs font-black text-xs uppercase tracking-wider rounded-xl shadow-md border ${
              subCategory.type === 'product' ? 'text-purple-600 border-purple-200' :
              subCategory.type === 'service' ? 'text-cyan-600 border-cyan-200' : 'text-slate-600 border-slate-200'
            }`}>
              {subCategory.type || 'none'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {subCategory.label}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Slug: {subCategory.value}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {subCategory.description || "No specific branch parameters or scope descriptions have been recorded for this niche."}
            </p>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={subCategory._id}>
                {subCategory._id}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FolderTree size={13} /> Parent Category
              </span>
              <p className="text-xs font-bold text-blue-600 truncate">
                {subCategory.categoryId?.label || subCategory.categoryId?.name || "Uncategorized"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} /> Recorded Date
              </span>
              <p className="text-xs font-bold text-slate-800">
                {subCategory.createdAt ? new Date(subCategory.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "System Core Node"}
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
        <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-md bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
          {image.label || "Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="subcategory-asset.jpg"
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

      {/* Scaled Center Image */}
      <div 
        className="w-full h-full flex items-center justify-center p-4 max-w-5xl max-h-[85vh]"
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

export default SubCategoryPage;