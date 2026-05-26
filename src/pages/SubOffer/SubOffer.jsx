import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Save,
  Loader2,
  FolderOpen,
  Tag,
  AlignLeft,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  FileText,
  Image as ImageIcon
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
      
      // Handle both wrapped objects or flat raw payload returns dynamically
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
    // If an icon exists on the server, display it as the baseline preview string
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

    // Instantiate native multiform boundary objects to allow Multer streaming transfers
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

  const filteredSubOffers = subOffers.filter(sub =>
    sub.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 text-slate-800 antialiased font-sans min-h-screen bg-[#F8FAFC]">
      {view === "list" ? (
        <div className="space-y-6 animate-in fade-in duration-400">
          
          {/* --- TOP HEADER NAVIGATION PANEL --- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Sub-Offer Classifications
              </h2>
              <p className="text-slate-500 font-medium text-sm mt-0.5">Configure child-tier segment entries assigned to Master Categories.</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
            >
              <Plus size={16} /> Create Sub-Type
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-2.5">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* --- SELECT DRAG DROP SELECTOR DECK --- */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-3 border border-slate-100 p-2.5 rounded-xl bg-slate-50/50">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FolderOpen size={18} /></div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none mb-1">Scope Category</label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer w-full"
                >
                  {parentCategories?.map(parent => (
                    <option key={parent._id} value={parent._id}>
                      {parent.label || parent.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2 relative text-slate-400">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input
                type="text"
                placeholder="Filter sub-categories by keywords descriptors or values..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* --- DATAGRID TABLE LIST VIEW --- */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/60">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub-Offer Segment</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value Route</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-indigo-600 w-8 h-8 mb-2" />
                      <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">Syncing Schema Records...</span>
                    </td>
                  </tr>
                ) : filteredSubOffers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-16 text-center text-slate-400 font-bold uppercase text-xs tracking-wider italic">No matching sub-offer types found under this selection structure.</td>
                  </tr>
                ) : (
                  filteredSubOffers.map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 text-slate-500 rounded-xl border group-hover:bg-white transition-colors overflow-hidden w-9 h-9 flex items-center justify-center">
                            {sub.icon ? (
                              <img src={`${import.meta.env.VITE_API_URL || ""}${sub.icon}`} className="w-full h-full object-cover rounded-lg" alt="" />
                            ) : (
                              <FileText size={16} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{sub.label}</div>
                            {sub.description && <div className="text-xs text-slate-400 font-medium truncate max-w-xs">{sub.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-xs font-mono font-bold text-slate-500">{sub.value}</td>
                      <td className="px-8 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${sub.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          {sub.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(sub)} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm cursor-pointer mr-2">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(sub._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* --- EDITOR INTERACTIVE CONTENT WORKSPACE --- */
        <form onSubmit={handleSaveSubmit} className="max-w-2xl mx-auto bg-white border border-slate-200/80 rounded-[32px] shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-400">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {formData._id ? "Modify Sub-Type Parameters" : "Initialize New Sub-Category"}
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Enforce clean alphanumeric data boundaries below.</p>
            </div>
            <button
              type="button"
              onClick={() => setView("list")}
              disabled={submitting}
              className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl transition hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-2.5">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Parent Dropdown Field Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FolderOpen size={12} /> Target Parent Offer Type
              </label>
              <select
                disabled={!!formData._id} 
                value={formData.offertype_id} 
                onChange={(e) => setFormData({ ...formData, offertype_id: e.target.value })} 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
              >
                {parentCategories.map(p => (
                  <option key={p._id} value={p._id}>{p.label || p.value}</option>
                ))}
              </select>
            </div>

            {/* Label Input Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag size={12} /> Sub-Category Label Name
              </label>
              <input
                required
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Premium Dining, Micro-breweries, Footwear Accessories..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Custom Icon Binary Selector Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon size={12} /> Display Icon Graphic
              </label>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Icon Preview" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={24} />
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm cursor-pointer"
                  >
                    Select Icon Asset
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">PNG or JPEG format with a square aspect layout ratio preferred.</p>
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AlignLeft size={12} /> Context Description
              </label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional conceptual overview notes detailing bounds..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition"
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
                  className="text-indigo-600 transition cursor-pointer"
                >
                  {formData.isActive ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-slate-300" />}
                </button>
              </div>
            )}
          </div>

          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/40 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setView("list")}
              disabled={submitting}
              className="px-5 h-11 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              {formData._id ? "Commit Updates" : "Save Entry"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SubOfferTypePage;