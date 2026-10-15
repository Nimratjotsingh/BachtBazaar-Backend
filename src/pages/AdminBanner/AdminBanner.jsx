import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Edit2, Trash2, Calendar, Sliders, CheckCircle, 
  XCircle, Globe, MapPin, Eye, Loader2, Upload, AlertCircle, X, 
  Image, RefreshCw, Type, LayoutGrid, List, Maximize2, Download,
  ArrowLeft, ExternalLink, Hash, Check, Clock, Link as LinkIcon
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminBannersDashboard = ({ token }) => {
  // --- Core Lifecycle States ---
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // --- Views & Layout Modes ---
  const [view, setView] = useState("list"); // 'list' | 'details'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedBanner, setSelectedBanner] = useState(null);

  // --- Search and Presentation Filters ---
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  // --- Form & Operational Panel States ---
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // Consolidated Form Schema
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    is_text_shown: true,
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

      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
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
    setImagePreview(banner.image);
    setImageFile(null);
    setFormData({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      is_text_shown: banner.is_text_shown ?? true,
      click_action_type: banner.click_action_type || "none",
      target_destination: banner.target_destination || "",
      sort_order: banner.sort_order || 0,
      start_date: banner.start_date ? banner.start_date.substring(0, 10) : "",
      end_date: banner.end_date ? banner.end_date.substring(0, 10) : "",
      target_city: banner.target_city || "all",
      is_active: banner.is_active ?? true
    });
    // Scroll editor into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTrigger = async (id) => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete this promotional asset?")) return;
    try {
      setLoading(true);
      const res = await accountClient.delete(`/adminbanners/delete/${id}`, { headers });
      if (res.data.success) {
        if (selectedBannerId === id) resetFormState();
        if (selectedBanner?._id === id) {
          setView("list");
          setSelectedBanner(null);
        }
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
      is_text_shown: true,
      click_action_type: "none",
      target_destination: "",
      sort_order: 0,
      start_date: "",
      end_date: "",
      target_city: "all",
      is_active: true
    });
  };

  const openBannerDetails = (banner) => {
    setSelectedBanner(banner);
    setView("details");
  };

  // --- Front-end Data Filtering Logic ---
  const filteredBanners = useMemo(() => {
    return banners.filter(banner => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        banner.title?.toLowerCase().includes(searchLower) || 
        (banner.subtitle && banner.subtitle.toLowerCase().includes(searchLower));
      const matchesCity = 
        cityFilter === "all" || 
        banner.target_city?.toLowerCase() === cityFilter.toLowerCase();
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
    <>
      {/* =========================================================
          SUB-VIEW 1: SINGLE BANNER DETAILS AUDIT VIEW
          ========================================================= */}
      {view === "details" && selectedBanner && (
        <BannerDetailsView
          banner={selectedBanner}
          formatTimestamp={formatTimestamp}
          onBack={() => { setView("list"); setSelectedBanner(null); }}
          onEdit={() => {
            setView("list");
            handleEditTrigger(selectedBanner);
          }}
          onDelete={() => handleDeleteTrigger(selectedBanner._id)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* =========================================================
          SUB-VIEW 2: PRIMARY DASHBOARD (GRID/TABLE + EDITOR PANEL)
          ========================================================= */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 max-w-[1750px] mx-auto text-slate-800 antialiased min-h-screen bg-slate-50/40">
          
          {/* Top Title Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200/80 pb-5 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-2.5 tracking-tight">
                <Image className="text-indigo-600 w-7 h-7 sm:w-8 sm:h-8" /> Promotional Canvas Operations
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                Configure app layout headers, geographic target carousels, text overlays, and engagement action links
              </p>
            </div>
            <button 
              onClick={fetchBanners}
              className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {globalError && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2 shadow-xs">
              <AlertCircle size={16} /> {globalError}
            </div>
          )}

          {/* Workspace Dashboard Layout splits */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* =========================================================
                LEFT COLUMN: SEARCH, FILTERS & CARDS DIRECTORY LEDGER (7/12)
                ========================================================= */}
            <div className="xl:col-span-7 space-y-4">
              
              {/* Quick Query Toolbar + Grid/Table Toggle */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search banner headers..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 focus:bg-white transition-all" 
                    />
                  </div>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="all">Global (All Cities)</option>
                    {uniqueCitiesList.filter(c => c !== "all").map(city => (
                      <option key={city} value={city}>City: {city.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Grid vs Table Layout Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setDisplayMode("grid")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      displayMode === "grid" 
                        ? "bg-white text-indigo-600 shadow-xs" 
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
                        ? "bg-white text-indigo-600 shadow-xs" 
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="List Table View"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>

              {/* Directory Core Stream renderer */}
              {loading ? (
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-24 text-center text-indigo-600 shadow-xs">
                  <Loader2 className="animate-spin inline-block mb-2" size={32} />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Graphics Collections...</p>
                </div>
              ) : filteredBanners.length === 0 ? (
                <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 p-20 text-center text-slate-400 italic font-medium text-xs uppercase tracking-wider">
                  No active graphic banners found matching workspace tracking criteria parameters.
                </div>
              ) : displayMode === "grid" ? (
                /* =========================================================
                    VIEW OPTION A: RESPONSIVE GRID VIEW (PROPORTIONAL CONTAINMENT)
                    ========================================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBanners.map((banner) => (
                    <div 
                      key={banner._id} 
                      onClick={() => openBannerDetails(banner)}
                      className={`bg-white rounded-[24px] border shadow-xs overflow-hidden flex flex-col justify-between group hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer ${
                        selectedBannerId === banner._id ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md" : "border-slate-200/80"
                      }`}
                    >
                      <div>
                        {/* Proportional Containment Banner Box */}
                        <div className="relative w-full aspect-[16/9] bg-slate-950 flex items-center justify-center p-2.5 border-b border-slate-900 overflow-hidden">
                          {banner.image ? (
                            <img 
                              src={banner.image} 
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                              alt="Banner Asset" 
                            />
                          ) : (
                            <Image size={32} className="text-slate-700" />
                          )}

                          {/* Overlaid Live Typography Preview if enabled */}
                          {banner.is_text_shown && (banner.title || banner.subtitle) && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3.5 flex flex-col justify-end pointer-events-none text-white">
                              <span className="font-black text-xs line-clamp-1 drop-shadow-sm">{banner.title}</span>
                              {banner.subtitle && <span className="text-[10px] text-slate-200 line-clamp-1 drop-shadow-sm">{banner.subtitle}</span>}
                            </div>
                          )}

                          {/* Floating Top Badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none font-black text-[9px] uppercase tracking-wider">
                            <span className={`px-2 py-0.5 rounded-md shadow-xs text-white ${
                              banner.is_active ? "bg-emerald-600" : "bg-slate-700"
                            }`}>
                              {banner.is_active ? "Live" : "Disabled"}
                            </span>

                            <span className="px-2 py-0.5 bg-indigo-600/90 text-white rounded-md backdrop-blur-xs shadow-xs">
                              {banner.target_city?.toUpperCase()}
                            </span>
                          </div>

                          {/* Direct Fullscreen Zoom Trigger */}
                          {banner.image && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({ src: banner.image, label: `${banner.title} - Header Graphic` });
                              }}
                              className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Fullscreen Banner"
                            >
                              <Maximize2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-extrabold text-[#0F172A] text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {banner.title}
                            </h4>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase shrink-0">
                              Slot: {banner.sort_order}
                            </span>
                          </div>
                          {banner.subtitle && (
                            <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{banner.subtitle}</p>
                          )}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> {formatTimestamp(banner.start_date)} - {formatTimestamp(banner.end_date)}
                            </span>
                            <span className="text-indigo-600 uppercase">
                              {banner.click_action_type || "None"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions Row */}
                      <div className="px-4 pb-4 pt-1">
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Eye size={12} /> Inspect details
                          </span>

                          <div className="flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTrigger(banner);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Edit Banner"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTrigger(banner._id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Banner"
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
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-5 py-3.5">Banner Graphic</th>
                          <th className="px-5 py-3.5">Scope & Slot</th>
                          <th className="px-5 py-3.5">Action Target</th>
                          <th className="px-5 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {filteredBanners.map((banner) => (
                          <tr 
                            key={banner._id} 
                            onClick={() => openBannerDetails(banner)}
                            className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div 
                                  onClick={(e) => {
                                    if (banner.image) {
                                      e.stopPropagation();
                                      setLightboxImage({ src: banner.image, label: `${banner.title} - Header Graphic` });
                                    }
                                  }}
                                  className={`w-14 h-9 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-2xs ${banner.image ? 'cursor-zoom-in group/img' : ''}`}
                                >
                                  {banner.image ? (
                                    <img src={banner.image} className="w-full h-full object-contain group-hover/img:scale-105 transition-transform" alt="" />
                                  ) : (
                                    <Image size={14} className="text-slate-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 truncate max-w-[180px] group-hover:text-indigo-600 transition-colors">{banner.title}</p>
                                  <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{banner.subtitle || "No subtitle"}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <MapPin size={10} /> {banner.target_city?.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">Slot: {banner.sort_order}</span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-800 block text-xs uppercase">{banner.click_action_type || "None"}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px] block font-mono">{banner.target_destination || "Static"}</span>
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                banner.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                {banner.is_active ? "Live" : "Disabled"}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTrigger(banner);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer mr-1"
                                title="Edit Banner"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTrigger(banner._id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Banner"
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

            {/* =========================================================
                RIGHT COLUMN: MANAGEMENT & DIRECT EDIT/CREATE CONSOLE CANVAS (5/12)
                ========================================================= */}
            <div className="xl:col-span-5 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-[24px] shadow-xs sticky top-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                <div>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={15} className="text-indigo-600"/> {isEditing ? "Modify Campaign Layout" : "Publish Interactive Header"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Provide specifications coordinates for public interfaces rendering grids</p>
                </div>
                {isEditing && (
                  <button onClick={resetFormState} className="p-1.5 bg-slate-50 text-slate-400 hover:text-slate-700 border rounded-lg transition cursor-pointer" title="Cancel Edit">
                    <X size={14}/>
                  </button>
                )}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
                {/* Graphic Media Asset Dropzone file selector */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide text-[10px]">Promotional Header Graphic Artwork</label>
                  <div className="relative group border border-slate-200 rounded-2xl overflow-hidden aspect-[16/9] bg-slate-950 flex flex-col items-center justify-center transition hover:bg-slate-900 shadow-inner p-2">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-contain" alt="Selected thumbnail draft" />
                        
                        {/* Live overlay preview inside editor when is_text_shown is true */}
                        {formData.is_text_shown && (formData.title || formData.subtitle) && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 flex flex-col justify-end pointer-events-none text-white">
                            <span className="font-black text-xs line-clamp-1 drop-shadow">{formData.title || "Headline Title"}</span>
                            {formData.subtitle && <span className="text-[10px] text-slate-200 line-clamp-1 drop-shadow">{formData.subtitle}</span>}
                          </div>
                        )}

                        <label className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all z-10">
                          <Upload size={18} className="mb-1"/> Replace Layout Image
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer w-full h-full p-4 text-center">
                        <Upload size={24} className="mb-1 text-indigo-500" />
                        <span className="font-extrabold text-slate-200 block">Click to map asset image target</span>
                        <span className="text-[10px] font-medium text-slate-400 mt-0.5">Supports high-res widescreen PNG, JPEG file sets</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" required={!isEditing} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Title Inputs parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Headline Banner Title</label>
                    <input 
                      type="text" 
                      name="title" 
                      required 
                      value={formData.title} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Bathinda Monsoon Extravaganza" 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-slate-800 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subtitle Caption Text</label>
                    <input 
                      type="text" 
                      name="subtitle" 
                      value={formData.subtitle} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Flat 40% drops across premium stores" 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-slate-800 text-xs" 
                    />
                  </div>
                </div>

                {/* Typography Overlay Toggle Field */}
                <div className="flex items-center justify-between p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60">
                  <div className="flex items-center gap-2">
                    <Type size={16} className="text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">Render Text Overlay</span>
                      <p className="text-[10px] text-slate-400 font-medium">Uncheck if the banner graphic already has embedded typography</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    id="is_text_shown" 
                    name="is_text_shown" 
                    checked={formData.is_text_shown} 
                    onChange={handleInputChange} 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer shrink-0" 
                  />
                </div>

                {/* Target Navigation click event configuration actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50/60 p-3.5 border rounded-2xl border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">Click Action Target</label>
                    <select name="click_action_type" value={formData.click_action_type} onChange={handleInputChange} className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold outline-none cursor-pointer text-xs">
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
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-800 text-xs disabled:opacity-40" 
                    />
                  </div>
                </div>

                {/* Chronology calendars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Start Date</label>
                    <input type="date" name="start_date" required value={formData.start_date} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign End Expiration</label>
                    <input type="date" name="end_date" required value={formData.end_date} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 text-xs" />
                  </div>
                </div>

                {/* Geographics placement properties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target City Limits Scope</label>
                    <input type="text" name="target_city" value={formData.target_city} onChange={handleInputChange} placeholder="e.g., Bathinda or 'all'" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none lowercase font-bold text-slate-700 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Carousel Sort Queue Position</label>
                    <input type="number" name="sort_order" min="0" value={formData.sort_order} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 font-mono text-xs" />
                  </div>
                </div>

                {/* Visibility checkbox */}
                <div className="flex items-center gap-2 p-1 pt-2 border-t border-slate-50">
                  <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer" />
                  <label htmlFor="is_active" className="text-xs font-extrabold text-slate-700 select-none cursor-pointer">Activate changes instantly across client app streams</label>
                </div>

                {/* Submit trigger */}
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={14}/> : isEditing ? <CheckCircle size={14}/> : <Plus size={14} strokeWidth={2.5}/>}
                    {submitting ? "Processing..." : isEditing ? "Save Adjustments" : "Deploy Live Banner"}
                  </button>
                </div>
              </form>

            </div>

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
// SUB-COMPONENT: SINGLE BANNER DETAILS AUDIT VIEW
// =========================================================
const BannerDetailsView = ({
  banner,
  formatTimestamp,
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
          className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Banners Registry
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit2 size={13} /> Edit Banner
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
        <div className="relative w-full aspect-[16/9] bg-slate-950 overflow-hidden flex items-center justify-center p-4 group">
          {banner.image ? (
            <img 
              src={banner.image} 
              alt={banner.title}
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(banner.image, `${banner.title} - Header Graphic`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-2">
              <Image size={44} className="text-slate-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Image Asset Linked</p>
            </div>
          )}

          {/* Overlaid Typography Preview */}
          {banner.is_text_shown && (banner.title || banner.subtitle) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-6 flex flex-col justify-end pointer-events-none text-white">
              <h3 className="font-black text-lg sm:text-2xl drop-shadow-md">{banner.title}</h3>
              {banner.subtitle && <p className="text-xs sm:text-sm text-slate-200 drop-shadow-md mt-1">{banner.subtitle}</p>}
            </div>
          )}

          {banner.image && (
            <button
              onClick={() => onOpenLightbox(banner.image, `${banner.title} - Header Graphic`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg z-10"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1 font-black text-xs uppercase tracking-wider rounded-xl shadow-md ${
              banner.is_active ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200"
            }`}>
              {banner.is_active ? "Live in App" : "Disabled"}
            </span>
            <span className="px-3 py-1 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              City: {banner.target_city?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {banner.title}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Queue Sort Order: {banner.sort_order}
              </span>
            </div>
            {banner.subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
                {banner.subtitle}
              </p>
            )}
          </div>

          {/* Technical Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <LinkIcon size={13} /> Click Action Type
              </span>
              <p className="text-xs font-bold text-indigo-600 uppercase">
                {banner.click_action_type || "None (Static)"}
              </p>
              {banner.target_destination && (
                <p className="text-[10px] font-mono text-slate-400 truncate" title={banner.target_destination}>
                  {banner.target_destination}
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Type size={13} /> Text Overlay
              </span>
              <p className="text-xs font-bold text-slate-800">
                {banner.is_text_shown ? "Rendered Over Graphic" : "Disabled / Flat Graphic"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Banner ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={banner._id}>
                {banner._id}
              </p>
            </div>
          </div>

          {/* Temporal Window Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-indigo-600" />
              <span className="font-bold text-slate-700">Display Timeline:</span>
              <span className="text-slate-500 font-semibold">{formatTimestamp(banner.start_date)} to {formatTimestamp(banner.end_date)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Created: {formatTimestamp(banner.createdAt)}
            </span>
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
          {image.label || "Banner Graphic Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="banner-graphic.jpg"
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

export default AdminBannersDashboard;