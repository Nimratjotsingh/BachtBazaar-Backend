import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Filter, Layers, ChevronDown,
  Box, Sparkles, Tags, RefreshCw, Eye, FolderOpen, Tag,
  AlignLeft, AlertCircle, FileText
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api.js";

const SubOfferTypePage = ({ token }) => {
  // --- Core State Variables ---
  const [view, setView] = useState("list"); // Views: "list" | "editor"
  const [parentCategories, setParentCategories] = useState([]);
  const [subOffers, setSubOffers] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom states tracking image upload components
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

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
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to commit system sub-type entry.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sub-category permanently? This can break live offers linked to it.")) return;
    try {
      setLoading(true);
      await accountClient.delete(`/subOfferType/${id}`, { headers });
      await fetchSubOffers(selectedParentId);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.message || "Delete procedure was aborted.");
    } finally {
      setLoading(false);
    }
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

  if (view === "editor") return (
    <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
      <button 
        onClick={() => { setView("list"); resetForm(); }} 
        className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> Return to Niches Registry
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
        <div>
          <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
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
              <Tag size={12} /> Sub-Category Label Name
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
            <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                ) : (
                  <ImageIcon className="text-slate-300" size={22} />
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-200 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition shadow-sm cursor-pointer"
                >
                  Select Icon Asset
                </button>
                <p className="text-[10px] text-slate-400 font-medium">PNG or JPEG format with a square aspect layout ratio preferred.</p>
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
              onClick={() => setView("list")}
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
  );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      
      {/* --- WORKSPACE BREADCRUMB HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <Layers className="text-blue-600 w-8 h-8" /> Sub-Offer Classifications
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure child-tier segment entries assigned to Master Categories</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-sm"
        >
          <Plus size={18} strokeWidth={2.5} /> Create Sub-Type
        </button>
      </div>

      {/* --- INTEGRATED ANALYTICS STATS MODULE INDEX STRIP --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox title="Total Scope Niches" val={computedMetrics.totalInParent} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
        <StatTickerBox title="Active Segments" val={computedMetrics.activeCount} icon={<Box />} theme="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <StatTickerBox title="Disabled Registry" val={computedMetrics.disabledCount} icon={<Tags />} theme="bg-rose-50 text-rose-600 border-rose-100" />
        <StatTickerBox title="Graphical Asset Links" val={computedMetrics.hasGraphics} icon={<Sparkles />} theme="bg-purple-50 text-purple-600 border-purple-100" />
      </div>

      {/* --- SELECT DRAG DROP SELECTOR DECK UTILITY FILTERS --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <FolderOpen size={15} className="text-slate-400" />
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="bg-transparent text-xs font-black text-slate-600 outline-none py-2.5 cursor-pointer pr-4"
          >
            {parentCategories?.map(parent => (
              <option key={parent._id} value={parent._id}>
                {parent.label || parent.value}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Filter sub-categories by keywords descriptors or values unique IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* --- TAXONOMY INTERACTIVE DIRECTORY DATA TABLE --- */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
              ) : filteredSubOffers.map((sub) => (
                <tr key={sub._id} className="hover:bg-slate-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                        {sub.icon ? (
                          <img src={`${import.meta.env.VITE_API_URL || ""}${sub.icon}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
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
                      onClick={() => handleEdit(sub)}
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

export default SubOfferTypePage;