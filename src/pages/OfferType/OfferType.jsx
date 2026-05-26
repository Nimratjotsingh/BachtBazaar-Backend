import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Save, Loader2, ArrowLeft, 
  Layers, Search, Check, X, Tag, Image as ImageIcon
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminOfferTypeManagement = ({ token }) => {
  const [offerTypes, setOfferTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom states tracking image upload components
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

  // Local live icon thumbnail previews extractor handler
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

      // Convert layout data structures over to high performance multipart streams
      const multipartBody = new FormData();
      multipartBody.append("label", formData.label.trim());
      multipartBody.append("description", formData.description.trim());
      multipartBody.append("isActive", formData.isActive);

      if (selectedFile) {
        multipartBody.append("icon", selectedFile);
      }

      if (selectedType?._id) {
        // Update existing Admin offer type template configuration
        await accountClient.put(`/offer-types/admin/${selectedType._id}`, multipartBody, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      } else {
        // Create new Admin offer type template requires explicit slug definitions
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

  const filteredData = offerTypes.filter(type => 
    type.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === "form") return (
    <div className="max-w-2xl mx-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => { setView("list"); resetForm(); }} 
        className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition cursor-pointer"
      >
        <ArrowLeft size={18} /> Back to Templates
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-blue-100 shadow-2xl space-y-6">
        <h2 className="text-2xl font-bold text-blue-950">
          {selectedType ? "Modify Global Offer Type" : "Create Global Offer Template"}
        </h2>
        <p className="text-sm text-slate-400 -mt-4">
          Templates created here will be visible read-only to merchants to build campaigns.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Display Label</label>
              <input 
                required 
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700" 
                value={formData.label} 
                onChange={(e) => setFormData({ ...formData, label: e.target.value })} 
                placeholder="e.g., Flat Discount" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">System Value (Slug)</label>
              <input 
                required 
                disabled={!!selectedType} 
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-mono text-xs font-bold text-slate-600" 
                value={formData.value} 
                onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
                placeholder="e.g., flat_discount" 
              />
            </div>
          </div>

          {/* --- NEW: CATEGORY ICON COMPONENT SELECTOR LAYER --- */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block">Category Representation Icon</label>
            <div className="flex items-center gap-4 p-4 bg-blue-50/20 border border-blue-100 rounded-2xl">
              <div className="w-16 h-16 bg-white border border-blue-100 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Selected Master Icon Preview Mapping Frame" />
                ) : (
                  <ImageIcon className="text-blue-200" size={24} />
                )}
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-blue-100 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-50/60 transition shadow-sm cursor-pointer"
                >
                  Upload Category Icon
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">PNG file variants containing transparent asset bounds highly recommended.</p>
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Description</label>
            <textarea 
              rows="3" 
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-sm text-slate-600" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Provide context regarding how this template handles parameters..."
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
            <span className="text-sm font-bold text-blue-900">Available to Merchants</span>
          </div>

          <button 
            disabled={loading} 
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Offer Type
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
            <Layers className="text-blue-500" /> Offer Type Templates
          </h1>
          <p className="text-blue-500">System templates available for global merchant distribution</p>
        </div>
        <button 
          onClick={() => setView("form")} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all cursor-pointer"
        >
          <Plus size={20} /> Add New Template
        </button>
      </div>

      {/* Filter Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={18} />
          <input 
            type="text" 
            placeholder="Search templates by key label or value tag..." 
            className="w-full pl-10 pr-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Content Container */}
      <div className="bg-white rounded-[24px] border border-blue-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-50/50 border-b border-blue-100">
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">Offer Label Name</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">System Key Value</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {loading ? (
              <tr>
                <td colSpan="4" className="py-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-20 text-center text-blue-400 font-bold">
                  No custom configurations built yet.
                </td>
              </tr>
            ) : filteredData.map((type) => (
              <tr key={type._id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 overflow-hidden shrink-0">
                      {type.icon ? (
                        <img src={`${import.meta.env.VITE_API_URL || ""}${type.icon}`} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Tag size={18} />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-blue-950">{type.label}</div>
                      <div className="text-xs text-slate-400 max-w-sm truncate">{type.description || "No description given."}</div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">
                    {type.value}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {type.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <Check size={12} strokeWidth={3} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      <X size={12} strokeWidth={3} /> Paused
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
                    className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition mr-1 cursor-pointer"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(type._id)} 
                    className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Simple visual fallback bindings to resolve dynamic toggle representations inside form renders
const ToggleLeft = ({ size, className }) => <X className={`${className}`} size={size} strokeWidth={3} />;
const ToggleRight = ({ size, className }) => <Check className={`${className}`} size={size} strokeWidth={3} />;

export default AdminOfferTypeManagement;