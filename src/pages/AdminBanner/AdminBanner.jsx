import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Edit2, Trash2, Calendar, Sliders, CheckCircle, 
  XCircle, Globe, MapPin, Eye, Loader2, Upload, AlertCircle, X, Image, RefreshCw
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api"; // Your Axios instance setup

const  AdminBannersDashboard = ({ token }) => {
  // --- Core Lifecycle States ---
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // --- Search and Presentation Filters ---
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  // --- Form & Operational Panel States ---
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Consolidated Form Schema
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    click_action_type: "none",
    target_destination: "",
    sort_order: 0,
    start_date: "",
    end_date: "",
    target_city: "all",
    is_active: true
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // =========================================================
  // PIPELINE 1: SYNC REGISTRY STREAMS FROM BACKEND
  // =========================================================
  const fetchBanners = async () => {
    try {
      setLoading(true);
      setGlobalError(null);
      const res = await accountClient.get("/adminbanners/admin-list", { headers });
      if (res.data.success) {
        setBanners(res.data.data || []);
      }
    } catch (err) {
      console.error("Banner listing load fault:", err);
      setGlobalError("Failed to collect system banner matrix arrays.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [token]);

  // =========================================================
  // PIPELINE 2: MUTATION OPS (CREATE / UPDATE / DELETE)
  // =========================================================
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setGlobalError(null);

      // Banners use multipart payload encodings due to file uploads
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (imageFile) data.append("image", imageFile);

      let response;
      if (isEditing) {
        response = await accountClient.put(`/adminbanners/update/${selectedBannerId}`, data, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      } else {
        response = await accountClient.post("/adminbanners/create", data, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
        console.log(response)
      }

      if (response.data.success) {
        resetFormState();
        fetchBanners();
      }
    } catch (err) {
      console.error("Banner mutation intercept processing error:", err);
      setGlobalError(err.response?.data?.message || "Failed to commit layout transaction updates.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTrigger = (banner) => {
    setIsEditing(true);
    setSelectedBannerId(banner._id);
    setImagePreview(banner.image); // Displays original database image path route string
    setImageFile(null);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      click_action_type: banner.click_action_type || "none",
      target_destination: banner.target_destination || "",
      sort_order: banner.sort_order || 0,
      start_date: banner.start_date ? banner.start_date.substring(0, 10) : "",
      end_date: banner.end_date ? banner.end_date.substring(0, 10) : "",
      target_city: banner.target_city || "all",
      is_active: banner.is_active ?? true
    });
  };

  const handleDeleteTrigger = async (id) => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete this promotional asset?")) return;
    try {
      setLoading(true);
      const res = await accountClient.delete(`/adminbanners/delete/${id}`, { headers });
      if (res.data.success) {
        if (selectedBannerId === id) resetFormState();
        fetchBanners();
      }
    } catch (err) {
      console.error("Purge failure transaction endpoint error:", err);
      setGlobalError("Failed to strip target banner record from database registries.");
      setLoading(false);
    }
  };

  const resetFormState = () => {
    setIsEditing(false);
    setSelectedBannerId(null);
    setImagePreview(null);
    setImageFile(null);
    setFormData({
      title: "",
      subtitle: "",
      click_action_type: "none",
      target_destination: "",
      sort_order: 0,
      start_date: "",
      end_date: "",
      target_city: "all",
      is_active: true
    });
  };

  // --- Front-end Data Filtering Logic Arrays ---
  const filteredBanners = useMemo(() => {
    return banners.filter(banner => {
      const matchesSearch = banner.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (banner.subtitle && banner.subtitle.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCity = cityFilter === "all" || banner.target_city.toLowerCase() === cityFilter.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [banners, searchTerm, cityFilter]);

  const uniqueCitiesList = useMemo(() => {
    return ["all", ...new Set(banners.map(b => b.target_city).filter(Boolean))];
  }, [banners]);

  const formatTimestamp = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-[1750px] mx-auto text-slate-800 antialiased min-h-screen bg-slate-50/40">
      
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <Image className="text-indigo-600 w-7 h-7" /> Promotional Canvas Operations
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Configure app layout headers, geographic target carousels, and engagement action links</p>
        </div>
        <button 
          onClick={fetchBanners}
          className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition shadow-sm cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {globalError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertCircle size={16} /> {globalError}
        </div>
      )}

      {/* Workspace Dashboard Layout splits */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================
            LEFT COLUMN: FULL SEARCH ENGINE & CARDS DIRECTORY LEDGER (7/12)
            ========================================================= */}
        <div className="xl:col-span-7 space-y-4">
          
          {/* Quick Query Toolbar Filtering Rows */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search banner headers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/10 outline-none"
              />
            </div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
            >
              <option value="all">Global (All Cities)</option>
              {uniqueCitiesList.filter(c => c !== "all").map(city => (
                <option key={city} value={city}>City: {city.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Directory Core Stream renderer */}
          {loading ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-24 text-center text-indigo-600 shadow-xs">
              <Loader2 className="animate-spin inline-block mb-2" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Graphics Collections...</p>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="bg-white rounded-[24px] border-2 border-dashed p-20 text-center text-slate-400 italic font-medium">
              No active graphic banners found matching workspace tracking criteria parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredBanners.map((banner) => (
                <div 
                  key={banner._id} 
                  className={`bg-white rounded-[24px] border p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                    selectedBannerId === banner._id ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-100"
                  }`}
                >
                  {/* Thumbnail & Description block metadata */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-28 h-16 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-inner">
                      <img src={banner.image} className="w-full h-full object-cover" alt="Banner canvas asset representation" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                          banner.is_active 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}>
                          {banner.is_active ? <CheckCircle size={10}/> : <XCircle size={10}/>}
                          {banner.is_active ? "Live" : "Disabled"}
                        </span>
                        <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-2 py-0.5 tracking-wider flex items-center gap-0.5">
                          <MapPin size={10}/> {banner.target_city.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">Slot: {banner.sort_order}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm truncate leading-snug">{banner.title}</h4>
                      {banner.subtitle && <p className="text-xs text-slate-400 font-medium truncate leading-none">{banner.subtitle}</p>}
                      <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 pt-0.5">
                        <Calendar size={11}/> Running window: {formatTimestamp(banner.start_date)} - {formatTimestamp(banner.end_date)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Buttons deck row triggers */}
                  <div className="flex items-center gap-1.5 md:self-center self-end border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                    <button 
                      onClick={() => handleEditTrigger(banner)}
                      className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl transition cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTrigger(banner._id)}
                      className="p-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-100 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================
            RIGHT COLUMN: MANAGEMENT & DIRECT EDIT/CREATE CONSOLE CANVAS (5/12)
            ========================================================= */}
        <div className="xl:col-span-5 bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm sticky top-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3 shrink-0">
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <Sliders size={15} className="text-indigo-600"/> {isEditing ? "Modify Campaign Layout" : "Publish Interactive Header"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Provide specifications coordinates for public interfaces rendering grids</p>
            </div>
            {isEditing && (
              <button onClick={resetFormState} className="p-1.5 bg-slate-50 text-slate-400 hover:text-slate-700 border rounded-lg transition cursor-pointer">
                <X size={14}/>
              </button>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            {/* Graphic Media Asset Dropzone file selector */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-500 uppercase tracking-wide text-[10px]">Promotional Header Graphic Artwork</label>
              <div className="relative group border border-slate-200 rounded-2xl overflow-hidden h-36 bg-slate-50 flex flex-col items-center justify-center transition hover:bg-slate-100/50 shadow-inner">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Selected thumbnail draft parameters" />
                    <label className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all">
                      <Upload size={18} className="mb-1"/> Replace Layout Image
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer w-full h-full p-4 text-center">
                    <Upload size={24} className="mb-1 text-indigo-500" />
                    <span className="font-extrabold text-slate-700 block">Click to map asset image target</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">Supports high-res widescreen PNG, JPEG file sets</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" required={!isEditing} />
                  </label>
                )}
              </div>
            </div>

            {/* Title Inputs parameters strings mapping slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Headline Banner Title</label>
                <input type="text" name="title" required value={formData.title} onChange={handleInputChange} placeholder="e.g., Bathinda Monsoon Extravaganza" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-slate-800" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subtitle Caption Text</label>
                <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="e.g., Flat 40% drops across premium catalogs stores" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-slate-800" />
              </div>
            </div>

            {/* Target Navigation click event configuration actions matrix parameters slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-3.5 border rounded-2xl border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">Click Action Target</label>
                <select name="click_action_type" value={formData.click_action_type} onChange={handleInputChange} className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold outline-none cursor-pointer">
                  <option value="none">None (Static Banner)</option>
                  <option value="offer">Link to Target Offer ID</option>
                  <option value="shop">Link to Target Store ID</option>
                  <option value="external_url">Link to External URL Path</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">Destination Argument</label>
                <input 
                  type="text" 
                  name="target_destination" 
                  disabled={formData.click_action_type === "none"}
                  value={formData.target_destination} 
                  onChange={handleInputChange} 
                  placeholder={formData.click_action_type === "external_url" ? "https://example.com/promo" : "66509f6e0b4d4a..."} 
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-800 disabled:opacity-40" 
                />
              </div>
            </div>

            {/* Chronology calendars date limits coordinates fields mapping logs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Start Date</label>
                <input type="date" name="start_date" required value={formData.start_date} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign End Expiration</label>
                <input type="date" name="end_date" required value={formData.end_date} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700" />
              </div>
            </div>

            {/* Geographics placement properties arrays logs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target City Limits Scope</label>
                <input type="text" name="target_city" value={formData.target_city} onChange={handleInputChange} placeholder="e.g., Bathinda or 'all'" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none lowercase font-bold text-slate-700" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Carousel Sort Queue Position</label>
                <input type="number" name="sort_order" min="0" value={formData.sort_order} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 font-mono" />
              </div>
            </div>

            {/* Visibility checkbox activation node controller */}
            <div className="flex items-center gap-2 p-1 pt-2 border-t border-slate-50">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
              <label htmlFor="is_active" className="text-xs font-extrabold text-slate-700 select-none cursor-pointer">Activate changes instantly across client app streams catalogs</label>
            </div>

            {/* Submit execution block footer trigger */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="animate-spin" size={14}/> : isEditing ? <CheckCircle size={14}/> : <Plus size={14} strokeWidth={2.5}/>}
                {submitting ? "Processing Request parameters..." : isEditing ? "Save Configuration Adjustments" : "Deploy Live Canvas Banner"}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};

export default AdminBannersDashboard;