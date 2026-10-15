import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Filter, Layers, ChevronDown,
  Box, Sparkles, Tags, RefreshCw, Eye, Maximize2, Download,
  X, Check, Hash, Calendar, Tag, CheckCircle2, ShieldCheck
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminTemplateImageManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [offerTypes, setOfferTypes] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterOfferType, setFilterOfferType] = useState("all"); 
  const [filterRatio, setFilterRatio] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    subcategory_id: "",
    offertype_id: "", 
    theme_style: "general",
    aspect_ratio: "1:1",
    tags: "",
    image: null,
    isActive: true
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [templateRes, catRes, subRes, typeRes] = await Promise.all([
        accountClient.get("/templates/admin", { headers }),
        accountClient.get("/categories", { headers }),
        accountClient.get("/subcategories", { headers }),
        accountClient.get("/offer-types/admin", { headers }) 
      ]);
      
      setTemplates(templateRes.data.data || []);
      setCategories(catRes.data.categories || catRes.data.data || []);
      setSubCategories(subRes.data.subCategories || subRes.data.data || []);
      setOfferTypes(typeRes.data.data || []);
    } catch (err) {
      console.error("Error fetching initial dashboard asset records:", err);
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
    data.append("name", formData.name.trim());
    data.append("category_id", formData.category_id || "none");
    data.append("subcategory_id", formData.subcategory_id || "none");
    data.append("offertype_id", formData.offertype_id || "none"); 
    data.append("theme_style", formData.theme_style.toLowerCase().trim());
    data.append("aspect_ratio", formData.aspect_ratio);
    data.append("tags", formData.tags.trim());
    data.append("isActive", formData.isActive);
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      if (selectedTemplate?._id) {
        await accountClient.put(`/templates/admin/${selectedTemplate._id}`, data, { headers });
      } else {
        await accountClient.post("/templates/admin", data, { headers });
      }
      await fetchInitialData();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed to execute save parameters.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to pull template "${name || 'selected'}" from the catalog?`)) return;
    try {
      await accountClient.delete(`/templates/admin/${id}`, { headers });
      if (selectedTemplate?._id === id) {
        setView("list");
        setSelectedTemplate(null);
      }
      fetchInitialData();
    } catch (err) {
      alert("Delete transaction dropped.");
    }
  };

  const openTemplateDetails = (template) => {
    setSelectedTemplate(template);
    setView("details");
  };

  const openTemplateEdit = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      category_id: template.category_id?._id || template.category_id || "",
      subcategory_id: template.subcategory_id?._id || template.subcategory_id || "",
      offertype_id: template.offertype_id?._id || template.offertype_id || "", 
      theme_style: template.theme_style || "general",
      aspect_ratio: template.aspect_ratio || "1:1",
      tags: Array.isArray(template.tags) ? template.tags.join(", ") : (template.tags || ""),
      isActive: template.isActive ?? true,
      image: null
    });
    setImagePreview(template.url || null);
    setView("form");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category_id: "",
      subcategory_id: "",
      offertype_id: "",
      theme_style: "general",
      aspect_ratio: "1:1",
      tags: "",
      image: null,
      isActive: true
    });
    setImagePreview(null);
    setSelectedTemplate(null);
  };

  // Dynamic Metrics Summary Compiler Loop
  const computedMetrics = useMemo(() => {
    return {
      total: templates.length,
      square: templates.filter(t => t.aspect_ratio === '1:1').length,
      banner: templates.filter(t => t.aspect_ratio === '16:9').length,
      story: templates.filter(t => t.aspect_ratio === '9:16').length
    };
  }, [templates]);

  // Expanded multi-filter layer matrix search computations
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          template.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const itemCatId = (template.category_id?._id || template.category_id)?.toString();
    const itemTypeId = (template.offertype_id?._id || template.offertype_id)?.toString();
    
    const matchesCategory = filterCategory === "all" || itemCatId === filterCategory;
    const matchesOfferType = filterOfferType === "all" || itemTypeId === filterOfferType;
    const matchesRatio = filterRatio === "all" || template.aspect_ratio === filterRatio;

    return matchesSearch && matchesCategory && matchesOfferType && matchesRatio;
  });

  const relevantSubCategories = subCategories.filter(
    sub => (sub.categoryId?._id || sub.categoryId)?.toString() === formData.category_id
  );

  return (
    <>
      {/* ==========================================
          SUB-VIEW 1: SINGLE DETAILS AUDIT VIEW
          ========================================== */}
      {view === "details" && selectedTemplate && (
        <TemplateDetailsView
          template={selectedTemplate}
          onBack={() => { setView("list"); setSelectedTemplate(null); }}
          onEdit={() => openTemplateEdit(selectedTemplate)}
          onDelete={() => handleDelete(selectedTemplate._id, selectedTemplate.name)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* ==========================================
          SUB-VIEW 2: FORM / EDITOR VIEW
          ========================================== */}
      {view === "form" && (
        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button 
            onClick={() => { setView("list"); resetForm(); }} 
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Canvas Gallery
          </button>

          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] uppercase tracking-tight">
                {selectedTemplate ? "Modify Template Asset" : "Load New Graphic Template"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Curate standardized graphic backdrops for merchant campaign designs.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Template Name Identifier *</label>
                <input 
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g., Summer Splash Banner Background" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Offer Type Mechanic (Optional)</label>
                <div className="relative">
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    value={formData.offertype_id}
                    onChange={(e) => setFormData({ ...formData, offertype_id: e.target.value })}
                  >
                    <option value="">None (Universal Mechanic Background)</option>
                    {offerTypes.map(type => <option key={type._id} value={type._id}>{type.label || type.value}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Parent Category (Optional)</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value, subcategory_id: "" })}
                    >
                      <option value="">None (Global General Background)</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label || cat.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Subcategory (Optional)</label>
                  <div className="relative">
                    <select 
                      disabled={!formData.category_id}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all disabled:opacity-50"
                      value={formData.subcategory_id}
                      onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                    >
                      <option value="">None</option>
                      {relevantSubCategories.map(sub => <option key={sub._id} value={sub._id}>{sub.label || sub.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Theme Vibe Style</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800" 
                    value={formData.theme_style} 
                    onChange={(e) => setFormData({ ...formData, theme_style: e.target.value })} 
                    placeholder="e.g., minimalist, neon, festive" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Structural Aspect Ratio Layout</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      value={formData.aspect_ratio}
                      onChange={(e) => setFormData({ ...formData, aspect_ratio: e.target.value })}
                    >
                      <option value="1:1">1:1 (Square - Feed / Card Tile)</option>
                      <option value="16:9">16:9 (Horizontal Banner Layout)</option>
                      <option value="9:16">9:16 (Vertical Story / Full Frame)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Search Metadata Tags (Comma Separated)</label>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800" 
                  value={formData.tags} 
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })} 
                  placeholder="e.g., diwali, sale, bright, coupon" 
                />
              </div>

              {/* Background Canvas Upload (Responsive Mobile Layout) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Background Canvas Image Upload</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                    ) : (
                      <ImageIcon className="text-slate-600" size={28} />
                    )}
                  </div>
                  <div className="space-y-2 w-full text-center sm:text-left">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="text-xs font-bold text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-xs hover:file:bg-blue-50 cursor-pointer w-full" 
                    />
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      High resolution PNG or JPEG formats. Image will scale proportionally without stretching.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="template_active_toggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="template_active_toggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Make available in active merchant creation pipelines
                </label>
              </div>

              <button 
                disabled={loading} 
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Template Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-VIEW 3: PRIMARY GALLERY CATALOG
          ========================================== */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <ImageIcon className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Background Canvas Catalog
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Curate structural template backdrops used by merchants for dynamic campaign designs</p>
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
                <Plus size={18} strokeWidth={2.5} /> Load New Template
              </button>
            </div>
          </div>

          {/* Metric Tickers */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox title="Total Cataloged" val={computedMetrics.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerBox title="Square Dimensions (1:1)" val={computedMetrics.square} icon={<Box />} theme="bg-purple-50 text-purple-600 border-purple-100" />
            <StatTickerBox title="Horizontal Banners (16:9)" val={computedMetrics.banner} icon={<Tags />} theme="bg-cyan-50 text-cyan-600 border-cyan-100" />
            <StatTickerBox title="Full Frame Stories (9:16)" val={computedMetrics.story} icon={<Sparkles />} theme="bg-slate-50 text-slate-600 border-slate-200" />
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search canvas files by identity headlines or metadata tags..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 text-xs font-bold text-slate-600">
              <div className="flex-1 sm:flex-initial flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Layers size={14} className="text-slate-400 shrink-0" />
                <select 
                  className="w-full sm:w-auto bg-transparent text-xs font-bold outline-none py-2 cursor-pointer max-w-[160px]" 
                  value={filterOfferType} 
                  onChange={(e) => setFilterOfferType(e.target.value)}
                >
                  <option value="all">All Offer Mechanics</option>
                  {offerTypes.map(type => <option key={type._id} value={type._id}>{type.label || type.value}</option>)}
                </select>
              </div>

              <div className="flex-1 sm:flex-initial flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select 
                  className="w-full sm:w-auto bg-transparent text-xs font-bold outline-none py-2 cursor-pointer max-w-[160px]" 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">All Category Targets</option>
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label || cat.name}</option>)}
                </select>
              </div>

              <div className="flex-1 sm:flex-initial flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select 
                  className="w-full sm:w-auto bg-transparent text-xs font-bold outline-none py-2 cursor-pointer" 
                  value={filterRatio} 
                  onChange={(e) => setFilterRatio(e.target.value)}
                >
                  <option value="all">All Ratios</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Horizontal)</option>
                  <option value="9:16">9:16 (Vertical)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Catalog Visual Grid (Proportional Edge-To-Edge Containment) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {loading && templates.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
                <Loader2 className="animate-spin mb-2" size={36} />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Loading Canvas Catalog File Packages...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-16 font-bold text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-[24px] text-xs uppercase tracking-wider italic">
                No image canvas elements matched your requested filtered metrics parameters.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div 
                  key={template._id} 
                  onClick={() => openTemplateDetails(template)}
                  className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Responsive Aspect-Ratio Containment Box */}
                    <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-950 flex items-center justify-center p-3 sm:p-4 border-b border-slate-800 overflow-hidden">
                      {template.url ? (
                        <img 
                          src={template.url} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                          alt={template.name} 
                        />
                      ) : (
                        <ImageIcon size={32} className="text-slate-700" />
                      )}
                      
                      {/* Floating Badges */}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap font-black text-[9px] uppercase tracking-wider pointer-events-none">
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md shadow-xs">
                          {template.aspect_ratio}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800/90 text-slate-200 rounded-md shadow-xs backdrop-blur-xs">
                          {template.theme_style || "General"}
                        </span>
                      </div>

                      {/* Direct Fullscreen Zoom Button */}
                      {template.url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage({ src: template.url, label: `${template.name} - Backdrop Graphic` });
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
                        {template.name}
                      </h3>
                      
                      <div className="space-y-1 text-[11px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Layers size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate">Mechanic: <strong className="text-indigo-600">{template.offertype_id?.label || "Universal"}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Filter size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate">Bound to: <strong className="text-blue-600">{template.category_id?.label || "Global"}</strong></span>
                        </div>
                      </div>

                      {template.tags?.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap h-5 overflow-hidden pt-0.5">
                          {template.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[9px] text-blue-600 font-bold">
                              <Tag size={8} /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="px-4 sm:px-5 pb-4 pt-1">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
                      <span className="inline-flex items-center gap-1 text-[10px]">
                        <Eye size={12} /> Used {template.use_count || 0} times
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTemplateEdit(template);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template._id, template.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition cursor-pointer"
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
// SUB-COMPONENT: SINGLE TEMPLATE DETAILS AUDIT VIEW
// =========================================================
const TemplateDetailsView = ({ 
  template, 
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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Canvas Gallery
        </button>

        <div className="flex items-center gap-2">
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
        <div className="relative w-full h-56 sm:h-80 bg-slate-950 overflow-hidden flex items-center justify-center p-4 group">
          {template.url ? (
            <img 
              src={template.url} 
              alt={template.name}
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(template.url, `${template.name} - Backdrop Graphic`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-2">
              <ImageIcon size={44} className="text-slate-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Image File Linked</p>
            </div>
          )}

          {template.url && (
            <button
              onClick={() => onOpenLightbox(template.url, `${template.name} - Backdrop Graphic`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              Ratio: {template.aspect_ratio}
            </span>
            <span className="px-3 py-1 bg-slate-800 text-slate-200 font-black text-xs uppercase tracking-wider rounded-xl shadow-md border border-slate-700">
              Style: {template.theme_style || "General"}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {template.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black rounded-xl uppercase">
                <Check size={12} strokeWidth={3} /> {template.isActive ? "Active in Production" : "Disabled"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              Template adopted by merchant partners <strong className="text-slate-800">{template.use_count || 0} times</strong> across promotional campaigns.
            </p>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers size={13} /> Offer Mechanic Target
              </span>
              <p className="text-xs font-bold text-indigo-600 truncate">
                {template.offertype_id?.label || "Universal Mechanic"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Filter size={13} /> Category Scope
              </span>
              <p className="text-xs font-bold text-blue-600 truncate">
                {template.category_id?.label || "Global Catalog"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={template._id}>
                {template._id}
              </p>
            </div>
          </div>

          {/* Tag Chips */}
          {template.tags && template.tags.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Associated Search Tags</span>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl">
                    <Tag size={10} className="text-blue-500" /> {tag}
                  </span>
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
          {image.label || "Canvas Template Asset"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="template-canvas.jpg"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Full Graphic"
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

export default AdminTemplateImageManagement;