import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Save, Loader2, ArrowLeft, 
  Image as ImageIcon, Search, Filter, Eye, Tag, X, Layers
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminTemplateImageManagement = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [offerTypes, setOfferTypes] = useState([]); // New state for admin-configured offer types
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterOfferType, setFilterOfferType] = useState("all"); // New filter state
  const [filterRatio, setFilterRatio] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    subcategory_id: "",
    offertype_id: "", // Added parameter configuration
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
      // Fetch data streams including offer types collection
      const [templateRes, catRes, subRes, typeRes] = await Promise.all([
        accountClient.get("/templates/admin", { headers }),
        accountClient.get("/categories", { headers }),
        accountClient.get("/subcategories", { headers }),
        accountClient.get("/offer-types/admin", { headers }) // Pulls admin templates
      ]);
      
      setTemplates(templateRes.data.data || []);
      setCategories(catRes.data.categories || []);
      setSubCategories(subRes.data.subCategories || []);
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
    data.append("name", formData.name);
    data.append("category_id", formData.category_id || "none");
    data.append("subcategory_id", formData.subcategory_id || "none");
    data.append("offertype_id", formData.offertype_id || "none"); // Append target option
    data.append("theme_style", formData.theme_style);
    data.append("aspect_ratio", formData.aspect_ratio);
    data.append("tags", formData.tags);
    data.append("isActive", formData.isActive);
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      if (selectedTemplate?._id) {
        await accountClient.put(`/templates/admin/${selectedTemplate._id}`, data, { headers });
      } else {
        await accountClient.post("/templates/admin", data, { headers });
      }
      fetchInitialData();
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

  // Expanded multi-filter layer matrix search computations
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          template.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || template.category_id?._id === filterCategory;
    const matchesOfferType = filterOfferType === "all" || template.offertype_id?._id === filterOfferType;
    const matchesRatio = filterRatio === "all" || template.aspect_ratio === filterRatio;

    return matchesSearch && matchesCategory && matchesOfferType && matchesRatio;
  });

  const relevantSubCategories = subCategories.filter(
    sub => sub.categoryId?._id === formData.category_id
  );

  if (view === "form") return (
    <div className="max-w-3xl mx-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => { setView("list"); resetForm(); }} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition">
        <ArrowLeft size={18} /> Back to Catalog Gallery
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-blue-100 shadow-2xl space-y-6">
        <h2 className="text-2xl font-bold text-blue-950">
          {selectedTemplate ? "Modify Template Asset" : "Load New Graphic Template"}
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Template Name Identifier</label>
            <input 
              required 
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              placeholder="e.g., Summer Splash Banner Background" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Target Offer Type Mechanic (Optional)</label>
            <select 
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.offertype_id}
              onChange={(e) => setFormData({ ...formData, offertype_id: e.target.value })}
            >
              <option value="">None (Universal Mechanic Background)</option>
              {offerTypes.map(type => <option key={type._id} value={type._id}>{type.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Target Parent Category (Optional)</label>
              <select 
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value, subcategory_id: "" })}
              >
                <option value="">None (Global General Background)</option>
                {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Target Subcategory (Optional)</label>
              <select 
                disabled={!formData.category_id}
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                value={formData.subcategory_id}
                onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
              >
                <option value="">None</option>
                {relevantSubCategories.map(sub => <option key={sub._id} value={sub._id}>{sub.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Theme Vibe Style</label>
              <input 
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.theme_style} 
                onChange={(e) => setFormData({ ...formData, theme_style: e.target.value })} 
                placeholder="e.g., minimalist, neon, festive" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Structural Aspect Ratio Layout</label>
              <select 
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.aspect_ratio}
                onChange={(e) => setFormData({ ...formData, aspect_ratio: e.target.value })}
              >
                <option value="1:1">1:1 (Square - Feed / Card Tile)</option>
                <option value="16:9">16:9 (Horizontal Banner Layout)</option>
                <option value="9:16">9:16 (Vertical Story / Full Frame)</option>
                <option value="custom">Custom Format Size</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Search Metadata Tags (Comma Separated)</label>
            <input 
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.tags} 
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })} 
              placeholder="e.g., diwali, sale, bright, coupon" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Background Canvas Image Upload</label>
            <div className="flex items-center gap-6 p-4 bg-blue-50/30 border border-dashed border-blue-200 rounded-2xl">
              <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-blue-100 shadow-inner">
                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="preview" /> : <ImageIcon className="text-blue-200" size={28} />}
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
            </div>
          </div>

          <button disabled={loading} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Template Configuration
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2">
            <ImageIcon className="text-blue-500" /> Background Canvas Catalog
          </h1>
          <p className="text-blue-500">Curate structural template backdrops used by merchants for dynamic designs</p>
        </div>
        <button onClick={() => setView("form")} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">
          <Plus size={20} /> Load New Template
        </button>
      </div>

      {/* Grid Multi-Filter Selection Header Matrix Row */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={18} />
          <input 
            type="text" 
            placeholder="Search canvas names or metadata tags..." 
            className="w-full pl-10 pr-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap gap-4">
          <div className="flex items-center gap-2 px-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <Layers size={16} className="text-blue-400" />
            <select className="bg-transparent text-sm font-bold text-blue-600 outline-none py-2 cursor-pointer max-w-[180px]" value={filterOfferType} onChange={(e) => setFilterOfferType(e.target.value)}>
              <option value="all">All Offer Mechanics</option>
              {offerTypes.map(type => <option key={type._id} value={type._id}>{type.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <Filter size={16} className="text-blue-400" />
            <select className="bg-transparent text-sm font-bold text-blue-600 outline-none py-2 cursor-pointer max-w-[180px]" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Category Targets</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <Filter size={16} className="text-blue-400" />
            <select className="bg-transparent text-sm font-bold text-blue-600 outline-none py-2 cursor-pointer" value={filterRatio} onChange={(e) => setFilterRatio(e.target.value)}>
              <option value="all">All Ratios</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Horizontal)</option>
              <option value="9:16">9:16 (Vertical)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visual Canvas Layout Display Stream */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-20 text-blue-400">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-20 text-blue-400 font-bold bg-white rounded-3xl border border-blue-50 shadow-sm">
            No image canvas layout blocks matched your filtered metrics.
          </div>
        ) : filteredTemplates.map((template) => (
          <div key={template._id} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between">
            <div className="h-48 bg-slate-900 relative overflow-hidden flex items-center justify-center">
              {template.url ? (
                <img src={`${window.location.origin}${template.url}`} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" alt={template.name} />
              ) : (
                <ImageIcon size={32} className="text-slate-700" />
              )}
              
              <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md shadow-sm uppercase tracking-wider">
                  {template.aspect_ratio}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-200 text-[9px] font-black rounded-md shadow-sm uppercase tracking-wider">
                  {template.theme_style}
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <h3 className="font-bold text-blue-950 line-clamp-1 text-sm mb-1">{template.name}</h3>
                
                {/* Visual Label indicators for Linked Properties */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Layers size={11} className="text-slate-300" />
                    Mechanic: <span className="font-bold text-indigo-600">{template.offertype_id?.label || "Universal Pattern"}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Filter size={11} className="text-slate-300" />
                    Bound to: <span className="font-bold text-blue-600">{template.category_id?.label || "Global Catalog"}</span>
                  </div>
                </div>
              </div>

              {template.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap overflow-hidden h-5">
                  {template.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] text-blue-600 font-bold">
                      <Tag size={8} /> {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-blue-50 pt-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Eye size={12} /> Used {template.use_count} times
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setSelectedTemplate(template);
                      setFormData({
                        name: template.name,
                        category_id: template.category_id?._id || "",
                        subcategory_id: template.subcategory_id?._id || "",
                        offertype_id: template.offertype_id?._id || "", // Load values on form edit request
                        theme_style: template.theme_style,
                        aspect_ratio: template.aspect_ratio,
                        tags: template.tags.join(", "),
                        isActive: template.isActive
                      });
                      setImagePreview(template.url);
                      setView("form");
                    }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    onClick={() => handleDelete(template._id)}
                    className="p-1.5 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
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

export default AdminTemplateImageManagement;