import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Save, Loader2, ArrowLeft, 
  Image as ImageIcon, Search, Filter, Eye, Tag, X, Layers,
  Box, Sparkles, Tags, RefreshCw, ChevronDown
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminTemplateImageManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [offerTypes, setOfferTypes] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
      categoriesListMap(catRes.data.categories || []);
      setSubCategories(subRes.data.subCategories || []);
      setOfferTypes(typeRes.data.data || []);
    } catch (err) {
      console.error("Error fetching initial dashboard asset records:", err);
    } finally {
      setLoading(false);
    }
  };

  // Safe wrapper fallback binder for categories lookups array formats
  const categoriesListMap = (dataPool) => {
    setCategories(dataPool);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to pull this asset template from the merchant catalog?")) return;
    try {
      await accountClient.delete(`/templates/admin/${id}`, { headers });
      fetchInitialData();
    } catch (err) {
      alert("Delete transaction dropped.");
    }
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
    const matchesCategory = filterCategory === "all" || template.category_id?._id === filterCategory;
    const matchesOfferType = filterOfferType === "all" || template.offertype_id?._id === filterOfferType;
    const matchesRatio = filterRatio === "all" || template.aspect_ratio === filterRatio;

    return matchesSearch && matchesCategory && matchesOfferType && matchesRatio;
  });

  const relevantSubCategories = subCategories.filter(
    sub => sub.categoryId?._id === formData.category_id
  );

  if (view === "form") return (
    <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
      <button 
        onClick={() => { setView("list"); resetForm(); }} 
        className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> Return to Canvas Gallery
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
          {selectedTemplate ? "Modify Template Asset" : "Load New Graphic Template"}
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Template Name Identifier</label>
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
                {offerTypes.map(type => <option key={type._id} value={type._id}>{type.label}</option>)}
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
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
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
                  {relevantSubCategories.map(sub => <option key={sub._id} value={sub._id}>{sub.label}</option>)}
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Background Canvas Image Upload</label>
            <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-300" size={24} />}
              </div>
              <div className="space-y-1.5">
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-sm hover:file:bg-blue-50 cursor-pointer w-full" />
                <p className="text-[10px] text-slate-400 font-medium">PNG backgrounds featuring translucent layers highly compatible.</p>
              </div>
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Template Configuration
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      
      {/* --- WORKSPACE BREADCRUMB HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <ImageIcon className="text-blue-600 w-8 h-8" /> Background Canvas Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Curate structural template backdrops used by merchants for dynamic campaign designs</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchInitialData}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Ledger Dataset"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setView("form")} 
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Load New Template
          </button>
        </div>
      </div>

      {/* --- INTEGRATED ANALYTICS METRIC TICKER STRIP --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox title="Total Backgrounds Cataloged" val={computedMetrics.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
        <StatTickerBox title="Square Dimensions (1:1)" val={computedMetrics.square} icon={<Box />} theme="bg-purple-50 text-purple-600 border-purple-100" />
        <StatTickerBox title="Horizontal Banners (16:9)" val={computedMetrics.banner} icon={<Tags />} theme="bg-cyan-50 text-cyan-600 border-cyan-100" />
        <StatTickerBox title="Full Frame Stories (9:16)" val={computedMetrics.story} icon={<Sparkles />} theme="bg-slate-50 text-slate-600 border-slate-200" />
      </div>

      {/* --- SEARCH FILTER ARCHITECTURE INTERACTIVE COMPONENT LAYER --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search canvas files by identity headlines or metadata tags..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap gap-3 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Layers size={14} className="text-slate-400" />
            <select className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer max-w-[160px]" value={filterOfferType} onChange={(e) => setFilterOfferType(e.target.value)}>
              <option value="all">All Offer Mechanics</option>
              {offerTypes.map(type => <option key={type._id} value={type._id}>{type.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter size={14} className="text-slate-400" />
            <select className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer max-w-[160px]" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Category Targets</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter size={14} className="text-slate-400" />
            <select className="bg-transparent text-xs font-bold outline-none py-2.5 cursor-pointer" value={filterRatio} onChange={(e) => setFilterRatio(e.target.value)}>
              <option value="all">All Ratios</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Horizontal)</option>
              <option value="9:16">9:16 (Vertical)</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- CANVAS CATALOG VISUAL GALLERY RENDER STREAM --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && templates.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-blue-600">
            <Loader2 className="animate-spin mb-2" size={36} />
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Loading Canvas Catalog File Packages...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-16 font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[24px] text-xs uppercase tracking-wider italic">
            No image canvas elements matched your requested filtered metrics parameters.
          </div>
        ) : filteredTemplates.map((template) => (
          <div key={template._id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-50 shadow-inner">
                {template.url ? (
                  <img src={template.url} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" alt="" />
                ) : (
                  <ImageIcon size={28} className="text-slate-700" />
                )}
                
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap font-black text-[9px] uppercase tracking-wider">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md shadow-sm">
                    {template.aspect_ratio}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded-md shadow-sm">
                    {template.theme_style}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="font-extrabold text-[#0F172A] line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">{template.name}</h3>
                
                <div className="space-y-1 text-[11px] font-bold text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-slate-300" />
                    <span>Mechanic: <strong className="text-indigo-600">{template.offertype_id?.label || "Universal Template"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} className="text-slate-300" />
                    <span>Bound to: <strong className="text-blue-600">{template.category_id?.label || "Global Catalog"}</strong></span>
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

            {/* Bottom Actions Row Trigger Segment */}
            <div className="px-5 pb-5 pt-1">
              <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} /> Used {template.use_count || 0} times
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setSelectedTemplate(template);
                      setFormData({
                        name: template.name,
                        category_id: template.category_id?._id || "",
                        subcategory_id: template.subcategory_id?._id || "",
                        offertype_id: template.offertype_id?._id || "", 
                        theme_style: template.theme_style,
                        aspect_ratio: template.aspect_ratio,
                        tags: template.tags?.join(", ") || "",
                        isActive: template.isActive
                      });
                      setImagePreview(template.url);
                      setView("form");
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition cursor-pointer"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    onClick={() => handleDelete(template._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Embedded Presentational Stat Block Presenter ---
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

export default AdminTemplateImageManagement;