import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Check, X, Tag, Layers,
  Trophy, Flame, Sparkles, Tags, RefreshCw, ChevronDown
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminOfferTypeManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [offerTypes, setOfferTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom states tracking image upload streams
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this offer type template?")) return;
    try {
      await accountClient.delete(`/offer-types/admin/${id}`, { headers });
      fetchOfferTypes();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({ label: "", value: "", description: "", isActive: true });
    setSelectedType(null);
    setSelectedFile(null);
    setImagePreview("");
  };

  // Dynamic Dashboard Stats Compiler
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

  if (view === "form") return (
    <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
      <button 
        onClick={() => { setView("list"); resetForm(); }} 
        className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> Return to Templates Index
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
          {selectedType ? "Modify Offer Template" : "Build System Template Option"}
        </h2>
        <p className="text-xs text-slate-400 -mt-4 font-semibold">
          Templates built inside this window become instantly available read-only to distributed merchants configurations.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Label Name</label>
              <input 
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800" 
                value={formData.label} 
                onChange={(e) => setFormData({ ...formData, label: e.target.value })} 
                placeholder="e.g., Flat Discount" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Key Value (Slug)</label>
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Category Representation Icon</label>
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
                  Upload Category Icon
                </button>
                <p className="text-[10px] text-slate-400 font-medium">PNG variants carrying alpha transparency backdrops highly recommended.</p>
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

          <div className="flex items-center gap-3 p-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className="text-blue-600 transition cursor-pointer"
            >
              {formData.isActive ? <ToggleRight size={40} className="text-blue-600" /> : <ToggleLeft size={40} className="text-slate-300" />}
            </button>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Available to Merchants distribution pipelines</span>
          </div>

          <button 
            disabled={loading} 
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Template Layer
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
            <Layers className="text-blue-600 w-8 h-8" /> Offer Type Templates
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">System campaign parameters blueprints available for universal distribution layouts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOfferTypes}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Ledger Dataset"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setView("form")} 
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Template
          </button>
        </div>
      </div>

      {/* --- INTEGRATED ANALYTICS STATS MODULE STRIP --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox title="Total Templates" val={computedMetrics.total} icon={<Layers />} theme="bg-blue-50 text-blue-600 border-blue-100" />
        <StatTickerBox title="Live Distributions" val={computedMetrics.active} icon={<Flame />} theme="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <StatTickerBox title="Paused Templates" val={computedMetrics.paused} icon={<Tags />} theme="bg-rose-50 text-rose-600 border-rose-100" />
        <StatTickerBox title="Admin Presets Pool" val={computedMetrics.systemTemplates} icon={<Trophy />} theme="bg-purple-50 text-purple-600 border-purple-100" />
      </div>

      {/* --- SEARCH COMPONENT UTILITY FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm max-w-md">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search templates by key label or value slug..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- TAXONOMY INTERACTIVE DIRECTORY DATA TABLE --- */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
              ) : filteredData.map((type) => (
                <tr key={type._id} className="hover:bg-slate-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                        {type.icon ? (
                          <img src={`${import.meta.env.VITE_API_URL || ""}${type.icon}`} className="w-full h-full object-cover" alt="" />
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
                      onClick={() => {
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
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer mr-1"
                      title="Edit Blueprint Parameters"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(type._id)} 
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition cursor-pointer"
                      title="Purge Template File"
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

// Form dynamic toggle fallback elements representations 
const ToggleLeft = ({ size, className }) => <X className={`${className}`} size={size} strokeWidth={3} />;
const ToggleRight = ({ size, className }) => <Check className={`${className}`} size={size} strokeWidth={3} />;

export default AdminOfferTypeManagement;