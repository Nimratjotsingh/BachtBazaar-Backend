import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  ChevronRight, ArrowLeft, Save, Loader2, X, ChevronDown,
  Layers, Tags, ShieldCheck, Box, RefreshCw, Eye, Sparkles, HelpCircle
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const CategoryManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list', 'category-form', 'subcategory-list'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Explicit Form Attributes mapping the updated model schema
  const [formData, setFormData] = useState({ value: "", label: "", description: "", image: null, type: "none" });
  const [imagePreview, setImagePreview] = useState(null);
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/categories", { headers });
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error("Failed to gather categories framework tree:", err);
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

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("value", formData.value.toLowerCase().trim());
    data.append("label", formData.label.trim());
    data.append("description", formData.description.trim());
    data.append("type", formData.type); 
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      if (selectedCategory?._id) {
        await accountClient.put(`/categories/${selectedCategory._id}`, data, { headers });
      } else {
        await accountClient.post("/categories", data, { headers });
      }
      await fetchCategories();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ value: "", label: "", description: "", image: null, type: "none" });
    setImagePreview(null);
    setSelectedCategory(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Move this classification grouping permanently to trash?")) return;
    try {
      await accountClient.delete(`/categories/${id}`, { headers });
      fetchCategories();
    } catch (err) {
      alert("Delete mapping operation failed");
    }
  };

  // Compute stats based on current live state distributions
  const computedStats = useMemo(() => {
    return {
      total: categories.length,
      productType: categories.filter(c => c.type === 'product').length,
      serviceType: categories.filter(c => c.type === 'service').length,
      generalType: categories.filter(c => !c.type || c.type === 'none').length
    };
  }, [categories]);

  const filteredCategories = categories.filter(cat => 
    cat.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.value?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render Component Deciders
  if (view === "category-form") return (
    <CategoryForm 
      formData={formData} 
      setFormData={setFormData} 
      onSave={handleSaveCategory} 
      onCancel={() => { setView("list"); resetForm(); }}
      imagePreview={imagePreview}
      handleImageChange={handleImageChange}
      loading={loading}
    />
  );

  if (view === "subcategory-list") return (
    <SubcategoryManager 
      category={selectedCategory} 
      onBack={() => { setView("list"); setSelectedCategory(null); }} 
      headers={headers}
    />
  );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      
      {/* --- WORKSPACE BREADCRUMB HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <Layers className="text-blue-600 w-8 h-8" /> Classification Architecture
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure system verticals, structural layouts, and deep subcategories parameters</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCategories}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Ledger Dataset"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setView("category-form")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Category
          </button>
        </div>
      </div>

      {/* --- INTEGRATED STATIC ANALYTICS RUNNING INDEX BAR --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox title="Total Categories" val={computedStats.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
        <StatTickerBox title="Physical Goods (Product)" val={computedStats.productType} icon={<Box />} theme="bg-purple-50 text-purple-600 border-purple-100" />
        <StatTickerBox title="Labor/Tasks (Service)" val={computedStats.serviceType} icon={<Sparkles />} theme="bg-cyan-50 text-cyan-600 border-cyan-100" />
        <StatTickerBox title="General Overviews" val={computedStats.generalType} icon={<Tags />} theme="bg-slate-50 text-slate-600 border-slate-200" />
      </div>

      {/* --- MULTI-AXIS SYSTEM UTILITY CONTROL BAR --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm max-w-md">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Filter taxonomy by name tags or values..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- PRIMARY TAXONOMY CARD GRID LIST --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && categories.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-28 text-blue-600">
            <Loader2 className="animate-spin mb-2" size={40} />
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Streaming Classification Buckets...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-bold text-xs uppercase tracking-wider italic">
            No categorization parameters resolved matching lookups string criteria.
          </div>
        ) : filteredCategories.map((cat) => (
          <div key={cat._id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 relative flex flex-col justify-between">
            <div>
              <div className="h-44 bg-slate-50 relative border-b border-slate-100 overflow-hidden">
                {cat.image ? (
                  <img src={`${cat.image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200 shadow-inner">
                    <ImageIcon size={44} />
                  </div>
                )}
                {/* Taxonomy Attribute Chip Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 bg-white border font-black text-[9px] uppercase tracking-wider rounded-xl shadow-sm ${
                    cat.type === 'product' ? 'text-purple-600 border-purple-100' :
                    cat.type === 'service' ? 'text-cyan-600 border-cyan-100' : 'text-slate-500 border-slate-100'
                  }`}>
                    {cat.type || 'none'}
                  </span>
                </div>
              </div>
              
              <div className="p-6 space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg font-black text-[#0F172A] tracking-tight truncate group-hover:text-blue-600 transition-colors">{cat.label}</h3>
                  <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0 border border-slate-200/40">
                    {cat.value}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 h-8">{cat.description || "No descriptions payload configured."}</p>
              </div>
            </div>

            {/* Core Interaction Buttons Deck */}
            <div className="px-6 pb-6 pt-2">
              <div className="flex items-center gap-2 border-t border-slate-50 pt-4">
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setView("subcategory-list");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50/60 text-blue-600 hover:bg-blue-100/80 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border border-blue-100/40 shadow-sm"
                >
                  Subcategories <ChevronRight size={14} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setImagePreview(cat.image ? `${cat.image}` : null);
                    setFormData({ 
                      value: cat.value, 
                      label: cat.label, 
                      description: cat.description || "",
                      type: cat.type || "none"
                    });
                    setView("category-form");
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer"
                  title="Modify Meta Parameters"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(cat._id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition cursor-pointer"
                  title="Purge Field Bucket"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =========================================================
// WIDGET LAYER SUB-COMPONENT: CATEGORY FORM DESK
// =========================================================
const CategoryForm = ({ formData, setFormData, onSave, onCancel, imagePreview, handleImageChange, loading }) => (
  <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
    <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer">
      <ArrowLeft size={16} strokeWidth={2.5} /> Return to Grid Registry
    </button>
    
    <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
      <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">Category Meta Details</h2>
      
      <form onSubmit={onSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Label Name</label>
            <input 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
              value={formData.label}
              onChange={(e) => setFormData({...formData, label: e.target.value})}
              placeholder="e.g., Electronics & Gadgets"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Key Value (Slug)</label>
            <input 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600"
              value={formData.value}
              onChange={(e) => setFormData({...formData, value: e.target.value})}
              placeholder="e.g., electronics_gadgets"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Operational Taxonomy Type</label>
          <div className="relative">
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 appearance-none cursor-pointer"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="none">None (General Overview)</option>
              <option value="product">Product (Physical Inventory)</option>
              <option value="service">Service (Professional/Labor Task)</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Supplemental Description</label>
          <textarea 
            rows="3"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Provide architectural context regarding which product types or sub-groups roll up into this namespace..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Category Representation Image File</label>
          <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-300" size={24} />}
            </div>
            <div className="space-y-1.5">
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-sm hover:file:bg-blue-50 cursor-pointer w-full" />
              <p className="text-[10px] text-slate-400 font-medium">PNG or JPEG variants sizing below 2MB bounds recommended.</p>
            </div>
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Classification Layer
        </button>
      </form>
    </div>
  </div>
);

// =========================================================
// WIDGET LAYER SUB-COMPONENT: SUBCATEGORY NESTING DECK
// =========================================================
const SubcategoryManager = ({ category, onBack, headers }) => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSub, setNewSub] = useState({ label: "", value: "" });

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get(`/categories/${category._id}/subcategories`, { headers });
      setSubs(res.data.subcategories || []);
    } catch (err) { 
      console.error("Sub-level query mismatch error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleAddSub = async (e) => {
    e.preventDefault();
    try {
      await accountClient.post(`/subcategories`, { 
        label: newSub.label.trim(), 
        value: newSub.value.toLowerCase().trim(), 
        categoryId: category._id 
      }, { headers });
      
      setNewSub({ label: "", value: "" });
      await fetchSubs();
    } catch (err) { 
      alert("Failed to inject nested subcategory"); 
    }
  };

  const handleDeleteSub = async (subId) => {
    if (!window.confirm("Purge this nested segment permanently?")) return;
    try {
      await accountClient.delete(`/subcategories/${subId}`, { headers });
      await fetchSubs();
    } catch (err) {
      alert("Purge sequence fail");
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 text-slate-700 antialiased font-sans max-w-[1500px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer">
        <ArrowLeft size={16} strokeWidth={2.5} /> Return to Parent Collection
      </button>

      <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        
        {/* Left Grid Half: Inject Control Pad */}
        <form onSubmit={handleAddSub} className="md:col-span-4 p-8 space-y-4 bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Quick Inject Subcategory</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Append a leaf node grouping under <span className="text-blue-600 font-bold">{category.label}</span></p>
          </div>
          
          <div className="space-y-3 pt-2">
            <input 
              placeholder="Subcategory Display Label (e.g., iPhones)" 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
              value={newSub.label}
              onChange={(e) => setNewSub({...newSub, label: e.target.value})}
              required
            />
            <input 
              placeholder="System Value Slug (e.g., iphones_list)" 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500/20"
              value={newSub.value}
              onChange={(e) => setNewSub({...newSub, value: e.target.value})}
              required
            />
            <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-sm cursor-pointer">
              Add Subcategory
            </button>
          </div>
        </form>

        {/* Right Grid Half: Extant Active Leaf Tree */}
        <div className="md:col-span-8 p-8 space-y-4 bg-white">
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Nesting Branches Ledger ({subs.length})</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active relational branches currently distributed under parent bounds</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin text-blue-500 inline-block" size={24} /></div>
            ) : subs.length === 0 ? (
              <div className="col-span-full py-10 text-center font-bold text-slate-400 italic bg-slate-50 border border-dashed rounded-xl text-xs uppercase tracking-wider">No sub-vertical parameters cataloged here.</div>
            ) : subs.map(s => (
              <div key={s._id} className="flex justify-between items-center px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl group hover:border-slate-300 transition-colors">
                <div className="min-w-0 pr-2">
                  <div className="font-extrabold text-slate-800 text-sm truncate">{s.label}</div>
                  <div className="text-[9px] text-slate-400 font-bold font-mono tracking-wider uppercase mt-0.5">Slug: {s.value}</div>
                </div>
                <button 
                  onClick={() => handleDeleteSub(s._id)}
                  type="button"
                  className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
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

export default CategoryManagement;