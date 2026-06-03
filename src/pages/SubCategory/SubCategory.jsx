import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Filter, Layers, ChevronDown,
  Box, Sparkles, Tags, RefreshCw, Eye
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const SubCategoryPage = ({ token }) => {
  // --- Core Lifecycle States ---
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Explicit Form Attributes
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
      setSubCategories(subRes.data.subCategories || []);
      setCategories(catRes.data.categories || []);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Move this sub-classification permanently to trash?")) return;
    try {
      await accountClient.delete(`/subcategories/${id}`, { headers });
      fetchInitialData();
    } catch (err) {
      alert("Delete operation encountered an error");
    }
  };

  // Dynamic Dashboard Stats Compiler Loop
  const computedMetrics = useMemo(() => {
    return {
      total: subCategories.length,
      productType: subCategories.filter(s => s.type === 'product').length,
      serviceType: subCategories.filter(s => s.type === 'service').length,
      generalType: subCategories.filter(s => !s.type || s.type === 'none').length
    };
  }, [subCategories]);

  // Combined Searching/Filtering Pipeline Processing
  const filteredData = subCategories.filter(item => {
    const matchesSearch = item.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.value?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.categoryId?._id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (view === "form") return (
    <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
      <button 
        onClick={() => { setView("list"); resetForm(); }} 
        className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> Return to Niches Registry
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
          {selectedSub ? "Modify Sub-Category Details" : "Create Sub-Category Branch"}
        </h2>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Parent Category Scope</label>
              <div className="relative">
                <select 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                >
                  <option value="">Select Parent Category</option>
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Niche Display Label</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="e.g., Smart Phones" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Value Key (Slug)</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="e.g., smart_phones" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Description / Scope Metrics</label>
            <textarea rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none resize-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 leading-relaxed" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe specific branch rules or scope bounds..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sub-Category Representative Image</label>
            <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-300" size={24} />}
              </div>
              <div className="space-y-1.5">
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-sm hover:file:bg-blue-50 cursor-pointer w-full" />
                <p className="text-[10px] text-slate-400 font-medium">Standard square-scaled bounding artwork assets recommended.</p>
              </div>
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Sub-Category configuration
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
            <Layers className="text-blue-600 w-8 h-8" /> Sub-Classification Branches
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage second-level relational niches and target micro product spaces</p>
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
            <Plus size={18} strokeWidth={2.5} /> Add Sub-Category
          </button>
        </div>
      </div>

      {/* --- INTEGRATED ANALYTICS STATS MODULE INDEX STRIP --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox title="Total Sub-Categories" val={computedMetrics.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
        <StatTickerBox title="Physical Inventory (Product)" val={computedMetrics.productType} icon={<Box />} theme="bg-purple-50 text-purple-600 border-purple-100" />
        <StatTickerBox title="Labor Utilities (Service)" val={computedMetrics.serviceType} icon={<Sparkles />} theme="bg-cyan-50 text-cyan-600 border-cyan-100" />
        <StatTickerBox title="General Branches" val={computedMetrics.generalType} icon={<Tags />} theme="bg-slate-50 text-slate-600 border-slate-200" />
      </div>

      {/* --- COMPREHENSIVE FILTER ENGINE TOOLBAR PANEL --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search running niches by display title strings or value tags..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl group focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Filter size={15} className="text-slate-400" />
          <select 
            className="bg-transparent text-xs font-black text-slate-600 outline-none py-2.5 cursor-pointer pr-4"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Parent Categories</option>
            {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
          </select>
        </div>
      </div>

      {/* --- TAXONOMY INTERACTIVE DIRECTORY DATA TABLE --- */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Sub-Category Niche Title</th>
                <th className="px-6 py-4">Branch Layout Type</th>
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
                    No matching sub-classification metrics logs discovered in system directory.
                  </td>
                </tr>
              ) : filteredData.map((sub) => (
                <tr key={sub._id} className="hover:bg-slate-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                        {sub.image ? (
                          <img src={sub.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
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
                      sub.type === 'product' ? 'bg-purple-50 text-purple-600 border-purple-100/50' :
                      sub.type === 'service' ? 'bg-cyan-50 text-cyan-600 border-cyan-100/50' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {sub.type || 'none'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-blue-50/60 text-blue-600 border border-blue-100/40 rounded-lg text-[10px] font-black tracking-wide">
                      {sub.categoryId?.label || "Uncategorized Template"}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => {
                        setSelectedSub(sub);
                        setImagePreview(sub.image || null);
                        setFormData({ 
                          label: sub.label, 
                          value: sub.value, 
                          description: sub.description || "", 
                          categoryId: sub.categoryId?._id || "",
                          type: sub.type || "none" 
                        });
                        setView("form");
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer mr-1"
                      title="Edit Meta Elements"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sub._id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition cursor-pointer"
                      title="Purge Document Branch"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

export default SubCategoryPage;