import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Check, X, Tag, Layers,
  Trophy, Flame, Sparkles, Tags, RefreshCw, ChevronDown,
  LayoutGrid, List, Eye, Maximize2, Download, Hash, Calendar,
  ShieldCheck, Info, CheckCircle2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminOfferTypeManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [offerTypes, setOfferTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom states tracking image upload streams
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }
  
  const [formData, setFormData] = useState({
    label: "",
    value: "",
    description: "",
    isActive: true
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchOfferTypes();
  }, []);

  const fetchOfferTypes = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/offer-types/admin", { headers });
      setOfferTypes(res.data.data || []);
    } catch (err) {
      console.error("Error fetching offer types:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const multipartBody = new FormData();
      multipartBody.append("label", formData.label.trim());
      multipartBody.append("description", formData.description.trim());
      multipartBody.append("isActive", formData.isActive);

      if (selectedFile) {
        multipartBody.append("icon", selectedFile);
      }

      if (selectedType?._id) {
        await accountClient.put(`/offer-types/admin/${selectedType._id}`, multipartBody, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      } else {
        multipartBody.append("value", formData.value.toLowerCase().trim());
        await accountClient.post("/offer-types/admin", multipartBody, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      }
      
      await fetchOfferTypes();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Permanently remove offer template "${label || 'selected'}"?`)) return;
    try {
      await accountClient.delete(`/offer-types/admin/${id}`, { headers });
      if (selectedType?._id === id) {
        setView("list");
        setSelectedType(null);
      }
      fetchOfferTypes();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const openTypeDetails = (type) => {
    setSelectedType(type);
    setView("details");
  };

  const openTypeEdit = (type) => {
    setSelectedType(type);
    setImagePreview(type.icon ? `${import.meta.env.VITE_API_URL || ""}${type.icon}` : "");
    setSelectedFile(null);
    setFormData({ 
      label: type.label, 
      value: type.value, 
      description: type.description || "",
      isActive: type.isActive
    });
    setView("form");
  };

  const resetForm = () => {
    setFormData({ label: "", value: "", description: "", isActive: true });
    setSelectedType(null);
    setSelectedFile(null);
    setImagePreview("");
  };

  // Dynamic Dashboard Stats
  const computedMetrics = useMemo(() => {
    return {
      total: offerTypes.length,
      active: offerTypes.filter(t => t.isActive).length,
      paused: offerTypes.filter(t => !t.isActive).length,
      systemTemplates: offerTypes.filter(t => t.created_by_type === 'admin').length
    };
  }, [offerTypes]);

  const filteredData = offerTypes.filter(type => 
    type.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.value?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE DETAILS VIEW
          ========================================== */}
      {view === "details" && selectedType && (
        <OfferTypeDetailsView
          type={selectedType}
          onBack={() => { setView("list"); setSelectedType(null); }}
          onEdit={() => openTypeEdit(selectedType)}
          onDelete={() => handleDelete(selectedType._id, selectedType.label)}
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
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Templates Index
          </button>

          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] uppercase tracking-tight">
                {selectedType ? "Modify Offer Template" : "Build System Template Option"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Templates built here become instantly available across merchant promotional setup workflows.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Label Name *</label>
                  <input 
                    required 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800" 
                    value={formData.label} 
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })} 
                    placeholder="e.g., Flat Discount" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Key Value (Slug) *</label>
                  <input 
                    required 
                    disabled={!!selectedType} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all disabled:opacity-60" 
                    value={formData.value} 
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
                    placeholder="e.g., flat_discount" 
                  />
                </div>
              </div>

              {/* Icon Upload Box (Responsive Mobile Layout) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Category Representation Icon</label>
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
                      Upload Template Icon
                    </button>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      PNG formats carrying alpha transparency backdrops recommended. Scaled to fit without stretching.
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Functional Description</label>
                <textarea 
                  rows="3" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed" 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Describe logic context parameters handling thresholds built into this template variant..." 
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="isActive_toggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isActive_toggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Available in live merchant campaign distribution pipelines
                </label>
              </div>

              <button 
                disabled={loading} 
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Template Layer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-VIEW 3: PRIMARY LIST / GRID CATALOG
          ========================================== */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <Layers className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Offer Type Templates
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">System campaign blueprint rules available for universal distribution layouts</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={fetchOfferTypes}
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
                <Plus size={18} strokeWidth={2.5} /> Add New Template
              </button>
            </div>
          </div>

          {/* Stat Tickers */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox title="Total Templates" val={computedMetrics.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerBox title="Live Distributions" val={computedMetrics.active} icon={<Flame />} theme="bg-emerald-50 text-emerald-600 border-emerald-100" />
            <StatTickerBox title="Paused Templates" val={computedMetrics.paused} icon={<Tags />} theme="bg-rose-50 text-rose-600 border-rose-100" />
            <StatTickerBox title="Admin Presets Pool" val={computedMetrics.systemTemplates} icon={<Trophy />} theme="bg-purple-50 text-purple-600 border-purple-100" />
          </div>

          {/* Search & Layout View Toggle Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search templates by label or slug value..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              {loading && offerTypes.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
                  <Loader2 className="animate-spin mb-2" size={36} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Streaming Template Blueprints...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-bold text-xs uppercase tracking-wider italic">
                  No template assets cataloged matching query string.
                </div>
              ) : (
                filteredData.map((type) => {
                  const iconUrl = type.icon ? `${import.meta.env.VITE_API_URL || ""}${type.icon}` : null;
                  return (
                    <div
                      key={type._id}
                      onClick={() => openTypeDetails(type)}
                      className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Responsive Containment Box with Proportional Scaling */}
                        <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 overflow-hidden">
                          {iconUrl ? (
                            <img 
                              src={iconUrl} 
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 drop-shadow-xs" 
                              alt={type.label} 
                            />
                          ) : (
                            <Tag size={36} className="text-slate-300" />
                          )}

                          {/* Overlaid Status Badge */}
                          <div className="absolute top-2.5 right-2.5 pointer-events-none">
                            {type.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-white/95 px-2.5 py-1 rounded-xl border border-emerald-100 shadow-2xs">
                                <Check size={10} strokeWidth={3} /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-white/95 px-2.5 py-1 rounded-xl border border-amber-100 shadow-2xs">
                                <X size={10} strokeWidth={3} /> Paused
                              </span>
                            )}
                          </div>

                          {/* Fullscreen Button */}
                          {iconUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({ src: iconUrl, label: `${type.label} - Template Icon` });
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
                              {type.label}
                            </h3>
                            <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase shrink-0">
                              {type.value}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 h-8">
                            {type.description || "No layout description parameters declared."}
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
                                openTypeEdit(type);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition cursor-pointer"
                              title="Edit Blueprint Parameters"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(type._id, type.label);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition cursor-pointer"
                              title="Purge Template File"
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
                VIEW OPTION B: TABLE LIST LEDGER VIEW (MOBILE HORIZONTAL SCROLL)
                ========================================================= */
            <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Offer Label Name</th>
                      <th className="px-6 py-4">System Key Value</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-24 text-center">
                          <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Streaming Blueprints Tree...</p>
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                          No template assets cataloged inside database collection matching query string.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((type) => {
                        const iconUrl = type.icon ? `${import.meta.env.VITE_API_URL || ""}${type.icon}` : null;
                        return (
                          <tr 
                            key={type._id} 
                            onClick={() => openTypeDetails(type)}
                            className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                <div 
                                  onClick={(e) => {
                                    if (iconUrl) {
                                      e.stopPropagation();
                                      setLightboxImage({ src: iconUrl, label: `${type.label} - Template Icon` });
                                    }
                                  }}
                                  className={`w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 ${iconUrl ? 'cursor-zoom-in group/img' : ''}`}
                                >
                                  {iconUrl ? (
                                    <img src={iconUrl} className="w-full h-full object-contain p-1.5 group-hover/img:scale-110 transition-transform duration-300" alt="" />
                                  ) : (
                                    <Tag size={16} className="text-slate-300" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate max-w-[240px] group-hover:text-blue-600 transition-colors">{type.label}</div>
                                  <div className="text-[9px] font-medium text-slate-400 line-clamp-1 mt-0.5">{type.description || "No layout description parameters declared."}</div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold border border-slate-200/40">
                                {type.value}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              {type.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100/50">
                                  <Check size={10} strokeWidth={3} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100/50">
                                  <X size={10} strokeWidth={3} /> Paused
                                </span>
                              )}
                            </td>
                            
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTypeEdit(type);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer mr-1"
                                title="Edit Blueprint Parameters"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(type._id, type.label);
                                }} 
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition cursor-pointer"
                                title="Purge Template File"
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
// SUB-COMPONENT: SINGLE OFFER TYPE DETAILS VIEW
// =========================================================
const OfferTypeDetailsView = ({ 
  type, 
  onBack, 
  onEdit, 
  onDelete, 
  onOpenLightbox 
}) => {
  const iconUrl = type.icon ? `${import.meta.env.VITE_API_URL || ""}${type.icon}` : null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Templates Index
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit Blueprint
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
              alt={type.label}
              className="w-full h-full max-w-[200px] object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(iconUrl, `${type.label} - Template Icon`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 gap-2">
              <Tag size={44} className="text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Vector Icon Stamped</p>
            </div>
          )}

          {iconUrl && (
            <button
              onClick={() => onOpenLightbox(iconUrl, `${type.label} - Template Icon`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4">
            {type.isActive ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                <Check size={12} strokeWidth={3} /> Active Distribution
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                <X size={12} strokeWidth={3} /> Paused
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {type.label}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Slug: {type.value}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {type.description || "No specific functional threshold parameters or guidelines recorded for this blueprint."}
            </p>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={type._id}>
                {type._id}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={13} /> Origin Type
              </span>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {type.created_by_type || "System Administrator"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} /> Registered Date
              </span>
              <p className="text-xs font-bold text-slate-800">
                {type.createdAt ? new Date(type.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "System Core Blueprint"}
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
          {image.label || "Template Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="template-icon.png"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Asset"
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
  <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between">
    <div className="space-y-0.5 sm:space-y-1">
      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-lg sm:text-xl font-black font-mono text-slate-800 leading-none pt-0.5 sm:pt-1">{val}</h3>
    </div>
    <div className={`w-8 h-8 sm:w-10 sm:h-10 border rounded-xl flex items-center justify-center shadow-inner p-1.5 sm:p-2 shrink-0 ${theme}`}>
      {React.cloneElement(icon, { size: 16, strokeWidth: 2.5 })}
    </div>
  </div>
);

export default AdminOfferTypeManagement;