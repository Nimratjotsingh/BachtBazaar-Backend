import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  ChevronRight, ArrowLeft, Save, Loader2, X, ChevronDown,
  Layers, Tags, ShieldCheck, Box, RefreshCw, Eye, Sparkles, 
  HelpCircle, Calendar, Hash, Maximize2, Download, ExternalLink,
  FolderTree, Info, CheckCircle2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const CategoryManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'category-form' | 'subcategory-list'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Explicit Form Attributes
  const [formData, setFormData] = useState({ value: "", label: "", description: "", image: null, type: "none" });
  const [imagePreview, setImagePreview] = useState(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/categories", { headers });
      setCategories(res.data.categories || res.data.data || []);
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
      alert(err.response?.data?.message || "Operation failed to commit category.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ value: "", label: "", description: "", image: null, type: "none" });
    setImagePreview(null);
    setSelectedCategory(null);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently remove category "${name || 'selected'}" and prune taxonomy bindings?`)) return;
    try {
      await accountClient.delete(`/categories/${id}`, { headers });
      if (selectedCategory?._id === id) {
        setView("list");
        setSelectedCategory(null);
      }
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Delete mapping operation failed");
    }
  };

  const openCategoryDetails = (cat) => {
    setSelectedCategory(cat);
    setView("details");
  };

  const openCategoryEdit = (cat) => {
    setSelectedCategory(cat);
    setImagePreview(cat.image ? `${cat.image}` : null);
    setFormData({ 
      value: cat.value, 
      label: cat.label, 
      description: cat.description || "",
      type: cat.type || "none",
      image: null
    });
    setView("category-form");
  };

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

  return (
    <>
      {/* --- SUB-VIEW ROUTING CONTAINER --- */}
      {view === "details" && selectedCategory && (
        <CategoryDetailsView 
          category={selectedCategory}
          onBack={() => { setView("list"); setSelectedCategory(null); }}
          onEdit={() => openCategoryEdit(selectedCategory)}
          onDelete={() => handleDelete(selectedCategory._id, selectedCategory.label)}
          onOpenSubcategories={() => setView("subcategory-list")}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
          headers={headers}
        />
      )}

      {view === "category-form" && (
        <CategoryForm 
          formData={formData} 
          setFormData={setFormData} 
          onSave={handleSaveCategory} 
          onCancel={() => { setView("list"); resetForm(); }}
          imagePreview={imagePreview}
          handleImageChange={handleImageChange}
          loading={loading}
          isEditing={Boolean(selectedCategory?._id)}
        />
      )}

      {view === "subcategory-list" && selectedCategory && (
        <SubcategoryManager 
          category={selectedCategory} 
          onBack={() => setView(selectedCategory ? "details" : "list")} 
          headers={headers}
        />
      )}

      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <Layers className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Classification Architecture
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Configure platform taxonomy, category branches, and service/product vertical bindings.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={fetchCategories}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Ledger Dataset"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={() => {
                  resetForm();
                  setView("category-form");
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={18} strokeWidth={2.5} /> Add New Category
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox title="Total Categories" val={computedStats.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerBox title="Physical Goods (Product)" val={computedStats.productType} icon={<Box />} theme="bg-purple-50 text-purple-600 border-purple-100" />
            <StatTickerBox title="Labor/Tasks (Service)" val={computedStats.serviceType} icon={<Sparkles />} theme="bg-cyan-50 text-cyan-600 border-cyan-100" />
            <StatTickerBox title="General Overviews" val={computedStats.generalType} icon={<Tags />} theme="bg-slate-50 text-slate-600 border-slate-200" />
          </div>

          {/* Search bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
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

          {/* Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {loading && categories.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-28 text-blue-600">
                <Loader2 className="animate-spin mb-2" size={40} />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Streaming Classification Tree...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-bold text-xs uppercase tracking-wider italic">
                No categorization parameters resolved matching lookups string criteria.
              </div>
            ) : filteredCategories.map((cat) => (
              <div 
                key={cat._id} 
                onClick={() => openCategoryDetails(cat)}
                className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative w-full aspect-video bg-slate-100 border-b border-slate-100 overflow-hidden">
                    {cat.image ? (
                      <img 
                        src={`${cat.image}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        alt={cat.label} 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                        <ImageIcon size={40} />
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className={`px-2.5 py-1 bg-white/95 backdrop-blur-xs font-black text-[9px] uppercase tracking-wider rounded-xl shadow-xs border ${
                        cat.type === 'product' ? 'text-purple-600 border-purple-200' :
                        cat.type === 'service' ? 'text-cyan-600 border-cyan-200' : 'text-slate-600 border-slate-200'
                      }`}>
                        {cat.type || 'none'}
                      </span>
                    </div>

                    {cat.image && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: cat.image, label: `${cat.label} - Category Banner` });
                        }}
                        className="absolute bottom-3 right-3 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        title="Fullscreen Image"
                      >
                        <Maximize2 size={13} />
                      </button>
                    )}
                  </div>
                  
                  <div className="p-5 space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="text-base font-black text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                        {cat.label}
                      </h3>
                      <span className="font-mono text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0 border border-slate-200">
                        {cat.value}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 h-8">
                      {cat.description || "No supplemental descriptions configured for this node."}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1">
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(cat);
                        setView("subcategory-list");
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50/70 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border border-blue-100"
                    >
                      Subcategories <ChevronRight size={13} strokeWidth={2.5} />
                    </button>
                    
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryEdit(cat);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer"
                      title="Edit Category Meta"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(cat._id, cat.label);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
// SUB-COMPONENT: CATEGORY DETAILS AUDIT VIEW
// =========================================================
const CategoryDetailsView = ({ 
  category, 
  onBack, 
  onEdit, 
  onDelete, 
  onOpenSubcategories, 
  onOpenLightbox,
  headers 
}) => {
  const [subcategories, setSubcategories] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    const fetchSubBranches = async () => {
      try {
        setSubLoading(true);
        const res = await accountClient.get(`/categories/${category._id}/subcategories`, { headers });
        setSubcategories(res.data.subcategories || []);
      } catch (err) {
        console.error("Failed to load subcategory branches:", err);
      } finally {
        setSubLoading(false);
      }
    };
    if (category?._id) fetchSubBranches();
  }, [category._id, headers]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Taxonomy Catalog
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit Category
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
        
        {/* Banner Hero */}
        <div className="relative w-full h-64 sm:h-80 bg-slate-900 overflow-hidden flex items-center justify-center group">
          {category.image ? (
            <img 
              src={category.image} 
              alt={category.label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(category.image, `${category.label} - Category Banner`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 gap-2">
              <ImageIcon size={48} className="text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Hero Graphic Stamped</p>
            </div>
          )}

          {category.image && (
            <button
              onClick={() => onOpenLightbox(category.image, `${category.label} - Category Banner`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 bg-white/95 backdrop-blur-xs font-black text-xs uppercase tracking-wider rounded-xl shadow-md border ${
              category.type === 'product' ? 'text-purple-600 border-purple-200' :
              category.type === 'service' ? 'text-cyan-600 border-cyan-200' : 'text-slate-600 border-slate-200'
            }`}>
              {category.type || 'none'} Vertical
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {category.label}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Slug: {category.value}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {category.description || "No supplemental architectural context has been provided for this category."}
            </p>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={category._id}>
                {category._id}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} /> Registered Date
              </span>
              <p className="text-xs font-bold text-slate-800">
                {category.createdAt ? new Date(category.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "System Core Default"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FolderTree size={13} /> Subcategory Branches
              </span>
              <p className="text-xs font-bold text-blue-600">
                {subcategories.length} Nested Segments
              </p>
            </div>
          </div>

          {/* Subcategory Branch Ledger Preview */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <FolderTree size={16} className="text-blue-600" /> Attached Subcategories ({subcategories.length})
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Leaf groupings nested directly beneath this category node.</p>
              </div>

              <button
                onClick={onOpenSubcategories}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                Manage Branches <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subLoading ? (
                <div className="col-span-full py-8 text-center text-blue-600">
                  <Loader2 className="animate-spin inline-block mb-1" size={24} />
                  <p className="text-xs font-bold text-slate-400">Loading sub-branches...</p>
                </div>
              ) : subcategories.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider">
                  No subcategory branches established under this root.
                </div>
              ) : (
                subcategories.map((sub) => (
                  <div key={sub._id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                    <p className="font-extrabold text-slate-800 text-xs truncate">{sub.label}</p>
                    <p className="font-mono text-[10px] text-slate-400 uppercase">Slug: {sub.value}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: CATEGORY FORM DESK
// =========================================================
const CategoryForm = ({ formData, setFormData, onSave, onCancel, imagePreview, handleImageChange, loading, isEditing }) => (
  <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
    <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer">
      <ArrowLeft size={16} strokeWidth={2.5} /> Return to Taxonomy Catalog
    </button>
    
    <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
          {isEditing ? "Modify Classification Meta" : "Create Classification Layer"}
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Register namespacing, verticals, and graphic branding.</p>
      </div>
      
      <form onSubmit={onSave} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Label Name *</label>
            <input 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
              value={formData.label}
              onChange={(e) => setFormData({...formData, label: e.target.value})}
              placeholder="e.g., Electronics & Gadgets"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Key Value (Slug) *</label>
            <input 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700"
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700 appearance-none cursor-pointer"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="none">None (General Overview)</option>
              <option value="product">Product (Physical Inventory Goods)</option>
              <option value="service">Service (Labor/Professional Task)</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Supplemental Description</label>
          <textarea 
            rows="3"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700 resize-none leading-relaxed"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Provide architectural context regarding which product types or sub-groups roll up into this namespace..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Category Representation Image File</label>
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" alt="" />
              ) : (
                <ImageIcon className="text-slate-300" size={24} />
              )}
            </div>
            <div className="space-y-1.5 w-full text-center sm:text-left">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="text-xs font-bold text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-white file:text-blue-600 file:border file:border-blue-100 file:shadow-xs hover:file:bg-blue-50 cursor-pointer w-full" 
              />
              <p className="text-[10px] text-slate-400 font-medium">PNG or JPEG variants recommended. Click image anywhere in app for fullscreen inspect.</p>
            </div>
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
          {isEditing ? "Update Classification Layer" : "Save Classification Layer"}
        </button>
      </form>
    </div>
  </div>
);

// =========================================================
// SUB-COMPONENT: SUBCATEGORY NESTING DECK
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
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-700 antialiased font-sans max-w-[1500px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer">
        <ArrowLeft size={16} strokeWidth={2.5} /> Return to {category.label}
      </button>

      <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        
        {/* Left: Quick Add Form */}
        <form onSubmit={handleAddSub} className="md:col-span-4 p-6 sm:p-8 space-y-4 bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Inject Subcategory</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Append a leaf node grouping under <span className="text-blue-600 font-bold">{category.label}</span></p>
          </div>
          
          <div className="space-y-3 pt-2">
            <input 
              placeholder="Display Label (e.g., Apple iPhones)" 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
              value={newSub.label}
              onChange={(e) => setNewSub({...newSub, label: e.target.value})}
              required
            />
            <input 
              placeholder="Value Slug (e.g., apple_iphones)" 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500/20"
              value={newSub.value}
              onChange={(e) => setNewSub({...newSub, value: e.target.value})}
              required
            />
            <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-xs cursor-pointer">
              Add Subcategory Branch
            </button>
          </div>
        </form>

        {/* Right: Branch Ledger */}
        <div className="md:col-span-8 p-6 sm:p-8 space-y-4 bg-white">
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Subcategory Branches ({subs.length})</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Active relational branches currently distributed under parent category.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full py-12 text-center"><Loader2 className="animate-spin text-blue-500 inline-block" size={28} /></div>
            ) : subs.length === 0 ? (
              <div className="col-span-full py-12 text-center font-bold text-slate-400 italic bg-slate-50 border border-dashed rounded-2xl text-xs uppercase tracking-wider">
                No sub-vertical parameters cataloged here yet.
              </div>
            ) : subs.map(s => (
              <div key={s._id} className="flex justify-between items-center px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl group hover:border-slate-300 transition-colors">
                <div className="min-w-0 pr-2">
                  <div className="font-extrabold text-slate-800 text-xs truncate">{s.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">Slug: {s.value}</div>
                </div>
                <button 
                  onClick={() => handleDeleteSub(s._id)}
                  type="button"
                  className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Delete Branch"
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

// =========================================================
// SUB-COMPONENT: FULLSCREEN IMAGE LIGHTBOX MODAL
// =========================================================
const ImageLightboxModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Lightbox Controls Top Toolbar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-6xl mx-auto">
        <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-md bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
          {image.label || "Category Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="category-asset.jpg"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Full Resolution Graphic"
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
        className="w-full h-full flex items-center justify-center p-4 max-w-6xl max-h-[85vh]"
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

export default CategoryManagement;