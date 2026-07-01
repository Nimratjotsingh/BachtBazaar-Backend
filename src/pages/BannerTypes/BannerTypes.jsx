import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Save, Trash2, Edit2, Plus, AlertCircle, Eye, EyeOff, Upload, Image as ImageIcon } from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

export default function BannerTypesDashboard({ token }) {
  // --- CORE STATE ENGINE ---
  const [bannerTypes, setBannerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal, Edit, & Upload state trackers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  
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
        setBannerTypes(res.data.data);
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
    // Build local canvas reference preview string asset paths instantly
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Instantiate modern multipart FormData envelope payloads
    const submissionPayload = new FormData();
    submissionPayload.append("name", formData.name);
    submissionPayload.append("description", formData.description);
    submissionPayload.append("isActive", formData.isActive);
    
    if (selectedFile) {
      submissionPayload.append("img", selectedFile); // Maps explicitly onto your Multer disk layer setup keys
    }

    try {
      let res;
      // Inject standard multipart multi-stream headers definition alongside auth tokens
      const requestConfig = {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      };

      if (editingItem) {
        res = await accountClient.put(`/banner-types/${editingItem._id}`, submissionPayload, requestConfig);
      } else {
        res = await accountClient.post('/banner-types', submissionPayload, requestConfig);
      }

      if (res.data.success) {
        await fetchBannerTypes();
        handleCloseModal();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Transmission validation fault context.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this banner configuration type?')) return;
    
    try {
      const res = await accountClient.delete(`/banner-types/${id}`, { headers });
      if (res.data.success) {
        setBannerTypes(prev => prev.filter(item => item._id !== id));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete operation execution fault.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto text-slate-800 antialiased">
      
      {/* Top Header Row Panel Layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2 tracking-tight">
            Banner Types
          </h1>
          <p className="text-blue-500 text-sm mt-0.5">Manage administrative display aspect sizes and advertising placements</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer"
        >
          <Plus size={16} /> Add New Layout
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {/* Main Grid View List System */}
      {loading ? (
        <div className="h-72 flex items-center justify-center text-blue-400">
          <Loader2 className="animate-spin" size={40} />
        </div>
      ) : bannerTypes.length === 0 ? (
        <div className="border-2 border-dashed border-blue-100 rounded-[32px] p-12 text-center text-slate-400 max-w-xl mx-auto">
          No banners types mapped to collection schemas yet. Click the add button to deploy a layout row framework.
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-blue-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-blue-50/40 border-b border-blue-50 text-[10px] font-black uppercase text-blue-400 tracking-wider">
                  <th className="p-4 pl-6">Layout Identity</th>
                  <th className="p-4">Reference Image</th>
                  <th className="p-4">Description Annotation</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50/50 text-blue-950">
                {bannerTypes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs font-mono text-blue-500 mt-0.5">{item.slug}</div>
                    </td>
                    <td className="p-4">
                      {item.img ? (
                        <img src={item.img} alt={item.name} className="w-16 h-10 object-cover rounded-xl border border-blue-50" />
                      ) : (
                        <div className="w-16 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                          <ImageIcon size={14} />
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">
                      {item.description || "—"}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full 
                        ${item.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {item.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                        {item.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-1.5">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Edit Schema"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Delete Preset"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overlay Configuration Dialog Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] border border-blue-100 shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="p-6 bg-blue-50/20 border-b border-blue-50">
              <h3 className="text-lg font-extrabold text-blue-950">
                {editingItem ? 'Modify Banner Preset Layout' : 'Configure Banner Type Schema'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Control operational attributes safely</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Configuration Name *</label>
                <input 
                  type="text" name="name" required value={formData.name} onChange={handleInputChange}
                  placeholder="e.g., Category Banner Row"
                  className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-blue-950"
                />
              </div>

              {/* INTERACTIVE MULTIPART MEDIA UPLOADER BOX */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Mockup Frame Creative Asset</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-100 hover:border-blue-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-blue-50/10"
                >
                  {imagePreview ? (
                    <div className="relative w-full h-24 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl text-white text-xs font-bold">
                        Change Image
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-blue-500" size={24} />
                      <span className="text-xs font-bold text-blue-950">Upload Vector Preview File</span>
                      <span className="text-[10px] text-slate-400">Supports PNG, JPG, WebP layouts</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Structure Description</label>
                <textarea 
                  name="description" rows="3" value={formData.description} onChange={handleInputChange}
                  placeholder="Provide context regarding where this layout asset renders down stream..."
                  className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-blue-50 pt-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-blue-950">Visibility Status</span>
                  <p className="text-[11px] text-slate-400">Expose layout choices instantly to merchants</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${formData.isActive ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                  <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t border-blue-50 pt-4 mt-2">
                <button 
                  type="button" onClick={handleCloseModal} disabled={submitting}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-100 transition cursor-pointer disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {submitting ? 'Saving...' : editingItem ? 'Save Updates' : 'Publish Layout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}