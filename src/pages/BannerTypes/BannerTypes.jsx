import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Loader2, Save, Trash2, Edit2, Plus, AlertCircle, Eye, EyeOff, 
  Upload, Image as ImageIcon, LayoutGrid, List, Maximize2, Download, 
  X, ArrowLeft, Hash, Calendar, Check, Layers, RefreshCw
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

export default function BannerTypesDashboard({ token }) {
  // --- CORE STATE ENGINE ---
  const [bannerTypes, setBannerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Views & Layout Modes
  const [view, setView] = useState("list"); // 'list' | 'details'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedBannerType, setSelectedBannerType] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Modal, Edit, & Upload state trackers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  
  // Root-Level Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }
  
  const fileInputRef = useRef(null);

  // Dedicated Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- API INTERACTION LIFECYCLES ---
  const fetchBannerTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await accountClient.get('/banner-types', { headers });
      
      if (res.data.success) {
        setBannerTypes(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load banner layout configurations:", err);
      setError(err.response?.data?.message || 'Failed to query layout database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannerTypes();
  }, [headers]);

  // --- INTERACTION MUTATIONS HANDLERS ---
  const handleOpenModal = (item = null) => {
    setSelectedFile(null);
    if (item) {
      setEditingItem(item);
      setImagePreview(item.img || "");
      setFormData({
        name: item.name,
        description: item.description || '',
        isActive: item.isActive
      });
    } else {
      setEditingItem(null);
      setImagePreview("");
      setFormData({ name: '', description: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedFile(null);
    setImagePreview("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const submissionPayload = new FormData();
    submissionPayload.append("name", formData.name.trim());
    submissionPayload.append("description", formData.description.trim());
    submissionPayload.append("isActive", formData.isActive);
    
    if (selectedFile) {
      submissionPayload.append("img", selectedFile);
    }

    try {
      const requestConfig = {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      };

      if (editingItem) {
        await accountClient.put(`/banner-types/${editingItem._id}`, submissionPayload, requestConfig);
      } else {
        await accountClient.post('/banner-types', submissionPayload, requestConfig);
      }

      await fetchBannerTypes();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Transmission validation fault context.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete layout "${name || 'selected'}"?`)) return;
    
    try {
      const res = await accountClient.delete(`/banner-types/${id}`, { headers });
      if (res.data.success) {
        setBannerTypes(prev => prev.filter(item => item._id !== id));
        if (selectedBannerType?._id === id) {
          setView("list");
          setSelectedBannerType(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete operation execution fault.');
    }
  };

  const openBannerTypeDetails = (item) => {
    setSelectedBannerType(item);
    setView("details");
  };

  const filteredBannerTypes = useMemo(() => {
    return bannerTypes.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bannerTypes, searchTerm]);

  return (
    <>
      {/* =========================================================
          SUB-VIEW 1: SINGLE BANNER TYPE DETAILS AUDIT VIEW
          ========================================================= */}
      {view === "details" && selectedBannerType && (
        <BannerTypeDetailsView
          bannerType={selectedBannerType}
          onBack={() => { setView("list"); setSelectedBannerType(null); }}
          onEdit={() => {
            setView("list");
            handleOpenModal(selectedBannerType);
          }}
          onDelete={() => handleDelete(selectedBannerType._id, selectedBannerType.name)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* =========================================================
          SUB-VIEW 2: PRIMARY CATALOG
          ========================================================= */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 max-w-[1400px] mx-auto text-slate-800 antialiased min-h-screen">
          
          {/* Top Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                <Layers className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> Banner Types
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                Manage administrative display aspect sizes, visual placements, and advertising specifications
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchBannerTypes}
                className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh List"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={() => handleOpenModal()}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-100 transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={16} strokeWidth={2.5} /> Add New Layout
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2 shadow-xs">
              <AlertCircle size={16} /> <strong>Error:</strong> {error}
            </div>
          )}

          {/* Search Toolbar & Layout Switcher */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search layouts by name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
              />
            </div>

            {/* Grid vs Table Layout Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setDisplayMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === "grid" 
                    ? "bg-white text-blue-600 shadow-xs" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === "table" 
                    ? "bg-white text-blue-600 shadow-xs" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="List Table View"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Main List System */}
          {loading ? (
            <div className="h-72 flex flex-col items-center justify-center text-blue-600 gap-2">
              <Loader2 className="animate-spin" size={36} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading layout templates...</p>
            </div>
          ) : filteredBannerTypes.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-[28px] p-16 text-center text-slate-400 max-w-xl mx-auto bg-white text-xs font-bold uppercase tracking-wider">
              No banner types mapped to collection schemas yet. Click the add button to deploy a layout framework.
            </div>
          ) : displayMode === "grid" ? (
            /* =========================================================
                VIEW OPTION A: RESPONSIVE GRID VIEW (PROPORTIONAL CONTAINMENT)
                ========================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredBannerTypes.map((item) => (
                <div
                  key={item._id}
                  onClick={() => openBannerTypeDetails(item)}
                  className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Proportional Containment Preview Box */}
                    <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-950 flex items-center justify-center p-3 border-b border-slate-900 overflow-hidden">
                      {item.img ? (
                        <img 
                          src={item.img} 
                          alt={item.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs" 
                        />
                      ) : (
                        <ImageIcon size={36} className="text-slate-700" />
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2.5 right-2.5 pointer-events-none">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${
                          item.isActive ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
                        }`}>
                          {item.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>

                      {/* Fullscreen Button */}
                      {item.img && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage({ src: item.img, label: `${item.name} - Mockup Frame` });
                          }}
                          className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title="Fullscreen View"
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="p-4 sm:p-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-[#0F172A] text-sm truncate group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase shrink-0">
                          {item.slug || "NO-SLUG"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                        {item.description || "No layout description parameters declared."}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Actions Row */}
                  <div className="px-4 sm:px-5 pb-4 pt-1">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Eye size={12} /> Inspect details
                      </span>

                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(item);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Schema"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item._id, item.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Preset"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* =========================================================
                VIEW OPTION B: TABLE LIST VIEW
                ========================================================= */
            <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4 pl-6">Layout Identity</th>
                      <th className="p-4">Reference Frame</th>
                      <th className="p-4">Description Annotation</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 pr-6 text-right">Actions Matrix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                    {filteredBannerTypes.map((item) => (
                      <tr 
                        key={item._id} 
                        onClick={() => openBannerTypeDetails(item)}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="p-4 pl-6">
                          <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase">{item.slug}</div>
                        </td>
                        <td className="p-4">
                          <div 
                            onClick={(e) => {
                              if (item.img) {
                                e.stopPropagation();
                                setLightboxImage({ src: item.img, label: `${item.name} - Reference Frame` });
                              }
                            }}
                            className={`w-14 h-9 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center p-0.5 overflow-hidden shadow-2xs shrink-0 ${item.img ? 'cursor-zoom-in group/img' : ''}`}
                          >
                            {item.img ? (
                              <img src={item.img} alt={item.name} className="w-full h-full object-contain group-hover/img:scale-105 transition-transform" />
                            ) : (
                              <ImageIcon size={14} className="text-slate-600" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs truncate">
                          {item.description || "—"}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            item.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {item.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer mr-1"
                            title="Edit Schema"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item._id, item.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete Preset"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay Configuration Dialog Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {editingItem ? 'Modify Banner Preset Layout' : 'Configure Banner Type Schema'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Control layout parameters and mockup artwork</p>
              </div>
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Configuration Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleInputChange}
                  placeholder="e.g., Category Banner Row"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-semibold text-xs text-slate-800 transition"
                />
              </div>

              {/* MULTIPART MEDIA UPLOADER */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mockup Frame Asset</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50"
                >
                  {imagePreview ? (
                    <div className="relative w-full aspect-[16/10] flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden p-2">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl text-white text-xs font-bold">
                        Change Image
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-blue-500" size={24} />
                      <span className="text-xs font-bold text-slate-700">Upload Vector Preview File</span>
                      <span className="text-[10px] text-slate-400">Supports PNG, JPG, WebP formats</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Structure Description</label>
                <textarea 
                  name="description" 
                  rows="3" 
                  value={formData.description} 
                  onChange={handleInputChange}
                  placeholder="Provide context regarding where this layout asset renders downstream..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-xs font-semibold text-slate-700 resize-none transition"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900">Visibility Status</span>
                  <p className="text-[10px] text-slate-400">Expose layout choice instantly across admin flows</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${formData.isActive ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                </button>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-100 transition cursor-pointer disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  {submitting ? 'Saving...' : editingItem ? 'Save Updates' : 'Publish Layout'}
                </button>
              </div>
            </form>
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
}

// =========================================================
// SUB-COMPONENT: SINGLE BANNER TYPE DETAILS AUDIT VIEW
// =========================================================
const BannerTypeDetailsView = ({
  bannerType,
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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Banner Types Index
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit2 size={13} /> Edit Layout
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 shadow-xs transition cursor-pointer"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Main Inspection Container */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6">
        
        {/* Banner Hero Preview (Proportional Fit Container) */}
        <div className="relative w-full aspect-[16/9] sm:h-72 bg-slate-950 overflow-hidden flex items-center justify-center p-4 group">
          {bannerType.img ? (
            <img 
              src={bannerType.img} 
              alt={bannerType.name}
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(bannerType.img, `${bannerType.name} - Mockup Frame`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-2">
              <ImageIcon size={44} className="text-slate-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Vector Frame Linked</p>
            </div>
          )}

          {bannerType.img && (
            <button
              onClick={() => onOpenLightbox(bannerType.img, `${bannerType.name} - Mockup Frame`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4">
            {bannerType.isActive ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                <Check size={12} strokeWidth={3} /> Active Configuration
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 text-slate-200 font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                Disabled
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {bannerType.name}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Slug: {bannerType.slug || "NO-SLUG"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {bannerType.description || "No specific architectural annotations or layout boundary notes recorded."}
            </p>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={bannerType._id}>
                {bannerType._id}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} /> Status State
              </span>
              <p className={`text-xs font-bold ${bannerType.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                {bannerType.isActive ? "Live in Distribution" : "Disabled Preset"}
              </p>
            </div>
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
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-5xl mx-auto">
        <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-[200px] sm:max-w-md bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
          {image.label || "Mockup Frame Asset"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="banner-type-frame.png"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Graphic"
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