import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  RefreshCw, Eye, EyeOff, QrCode, Image as ImageIcon, Sparkles, Layers,
  CheckCircle2, Upload, LayoutGrid, List, Maximize2, Download,
  Hash, Calendar, Sliders, Box, Tag
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminQrTemplateManagement = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    qrBoxPositionX: 50,
    qrBoxPositionY: 50,
    qrBoxWidth: 200,
    qrBoxHeight: 200,
    showShopName: true,
    showLogo: true,
    isDefault: false,
    isActive: true,
  });

  const [templateImageFile, setTemplateImageFile] = useState(null);
  const [previewThumbnailFile, setPreviewThumbnailFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);

      const res = await accountClient.get(`/admin/qr-templates?${params.toString()}`, { headers });
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error("Error fetching QR templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "template") {
      setTemplateImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewThumbnailFile(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedTemplate && !templateImageFile) {
      alert("Please upload a template background image.");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("category", formData.category);
      data.append("qrBoxPositionX", Number(formData.qrBoxPositionX) || 50);
      data.append("qrBoxPositionY", Number(formData.qrBoxPositionY) || 50);
      data.append("qrBoxWidth", Number(formData.qrBoxWidth) || 200);
      data.append("qrBoxHeight", Number(formData.qrBoxHeight) || 200);
      data.append("showShopName", formData.showShopName);
      data.append("showLogo", formData.showLogo);
      data.append("isDefault", formData.isDefault);
      data.append("isActive", formData.isActive);

      if (templateImageFile) {
        data.append("templateImage", templateImageFile);
      }
      if (previewThumbnailFile) {
        data.append("previewThumbnail", previewThumbnailFile);
      }

      const multipartHeaders = {
        ...headers,
        "Content-Type": "multipart/form-data",
      };

      if (selectedTemplate?._id) {
        await accountClient.patch(`/admin/qr-templates/${selectedTemplate._id}`, data, {
          headers: multipartHeaders,
        });
      } else {
        await accountClient.post("/admin/qr-templates", data, {
          headers: multipartHeaders,
        });
      }

      await fetchTemplates();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save QR background template");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await accountClient.patch(
        `/admin/qr-templates/${id}`,
        { isActive: !currentStatus },
        { headers }
      );
      if (res.data.success) {
        setTemplates((prev) =>
          prev.map((item) =>
            item._id === id ? { ...item, isActive: res.data.data.isActive } : item
          )
        );
        if (selectedTemplate?._id === id) {
          setSelectedTemplate((prev) => ({ ...prev, isActive: res.data.data.isActive }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle active status");
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Permanently delete QR template "${title || 'selected'}"?`)) return;
    try {
      await accountClient.delete(`/admin/qr-templates/${id}`, { headers });
      if (selectedTemplate?._id === id) {
        setView("list");
        setSelectedTemplate(null);
      }
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const openTemplateDetails = (tpl) => {
    setSelectedTemplate(tpl);
    setView("details");
  };

  const openTemplateEdit = (tpl) => {
    setSelectedTemplate(tpl);
    setFormData({
      title: tpl.title || "",
      description: tpl.description || "",
      category: tpl.category || "GENERAL",
      qrBoxPositionX: tpl.qrPlacementConfig?.qrBoxPositionX ?? 50,
      qrBoxPositionY: tpl.qrPlacementConfig?.qrBoxPositionY ?? 50,
      qrBoxWidth: tpl.qrPlacementConfig?.qrBoxWidth ?? 200,
      qrBoxHeight: tpl.qrPlacementConfig?.qrBoxHeight ?? 200,
      showShopName: tpl.qrPlacementConfig?.showShopName ?? true,
      showLogo: tpl.qrPlacementConfig?.showLogo ?? true,
      isDefault: tpl.isDefault ?? false,
      isActive: tpl.isActive ?? true,
    });
    setImagePreviewUrl(tpl.templateImageUrl || "");
    setTemplateImageFile(null);
    setPreviewThumbnailFile(null);
    setView("form");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "GENERAL",
      qrBoxPositionX: 50,
      qrBoxPositionY: 50,
      qrBoxWidth: 200,
      qrBoxHeight: 200,
      showShopName: true,
      showLogo: true,
      isDefault: false,
      isActive: true,
    });
    setTemplateImageFile(null);
    setPreviewThumbnailFile(null);
    setImagePreviewUrl("");
    setSelectedTemplate(null);
  };

  const computedMetrics = useMemo(() => {
    return {
      total: templates.length,
      active: templates.filter((t) => t.isActive).length,
      defaults: templates.filter((t) => t.isDefault).length,
      banners: templates.filter((t) => t.category === "STAND_BANNER").length,
    };
  }, [templates]);

  const filteredData = templates.filter(
    (t) =>
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* =========================================================
          SUB-VIEW 1: SINGLE TEMPLATE DETAILS AUDIT VIEW
          ========================================================= */}
      {view === "details" && selectedTemplate && (
        <QrTemplateDetailsView
          template={selectedTemplate}
          onBack={() => { setView("list"); setSelectedTemplate(null); }}
          onEdit={() => openTemplateEdit(selectedTemplate)}
          onDelete={() => handleDelete(selectedTemplate._id, selectedTemplate.title)}
          onToggleActive={() => handleToggleActive(selectedTemplate._id, selectedTemplate.isActive)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      )}

      {/* =========================================================
          SUB-VIEW 2: FORM CREATE / EDIT VIEW
          ========================================================= */}
      {view === "form" && (
        <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button
            onClick={() => {
              setView("list");
              resetForm();
            }}
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to QR Templates Directory
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="text-blue-600 w-5 h-5" />
                {selectedTemplate ? "Modify QR Standee Template" : "Build QR Background Template"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Configure printable canvas artwork, pixel placement matrices, and shop brand coordinates.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Template Name *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Premium Festive Standee Frame"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Description / Merchant Notes
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide instructions or layout recommendations for merchant printing..."
                />
              </div>

              {/* Image Upload Area */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-blue-900 uppercase tracking-wider">
                  <Upload size={16} className="text-blue-600" /> Template Background Artwork *
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-blue-200 bg-white rounded-xl p-4 text-center relative hover:bg-slate-50 transition cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "template")}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <ImageIcon className="w-6 h-6 text-blue-500" />
                      <span className="text-xs font-bold text-slate-700">
                        {templateImageFile ? templateImageFile.name : "Select Full Artwork (PNG/JPG)"}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">Max recommended: 5MB</span>
                    </div>
                  </div>

                  {imagePreviewUrl ? (
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden h-28">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-white/60 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-semibold italic">
                      No artwork chosen yet
                    </div>
                  )}
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Design Category Format
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="GENERAL">General Standard</option>
                  <option value="STAND_BANNER">Standee Banner (Vertical Rollup)</option>
                  <option value="TABLE_TOP">Table Top Tent Card</option>
                  <option value="STICKER">Counter Sticker</option>
                  <option value="FESTIVE">Festive Edition</option>
                </select>
              </div>

              {/* QR Placement Box Coordinates */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  QR Code Canvas Coordinate Placement (Pixels)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">X Position</label>
                    <input
                      type="number"
                      value={formData.qrBoxPositionX}
                      onChange={(e) => setFormData({ ...formData, qrBoxPositionX: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Y Position</label>
                    <input
                      type="number"
                      value={formData.qrBoxPositionY}
                      onChange={(e) => setFormData({ ...formData, qrBoxPositionY: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Width</label>
                    <input
                      type="number"
                      value={formData.qrBoxWidth}
                      onChange={(e) => setFormData({ ...formData, qrBoxWidth: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Height</label>
                    <input
                      type="number"
                      value={formData.qrBoxHeight}
                      onChange={(e) => setFormData({ ...formData, qrBoxHeight: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Branding and Default Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="showShopName_toggle"
                    checked={formData.showShopName}
                    onChange={(e) => setFormData({ ...formData, showShopName: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="showShopName_toggle" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Render Store Name Label
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="showLogo_toggle"
                    checked={formData.showLogo}
                    onChange={(e) => setFormData({ ...formData, showLogo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="showLogo_toggle" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Render Store Brand Logo
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="isDefault_toggle"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isDefault_toggle" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Set as Category Default
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="isActive_toggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isActive_toggle" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Make Live to Merchants
                  </label>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save QR Template
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-VIEW 3: PRIMARY LIST / GRID DIRECTORY
          ========================================================= */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Workspace Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <QrCode className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> QR Standee Backgrounds
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                Configure, upload, and organize printable QR standee background templates for merchants
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchTemplates}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Templates"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={18} strokeWidth={2.5} /> Add New Template
              </button>
            </div>
          </div>

          {/* Analytics Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox
              title="Total Templates"
              val={computedMetrics.total}
              icon={<Layers />}
              theme="bg-blue-50 text-blue-600 border-blue-100"
            />
            <StatTickerBox
              title="Live Published"
              val={computedMetrics.active}
              icon={<Eye />}
              theme="bg-emerald-50 text-emerald-600 border-emerald-100"
            />
            <StatTickerBox
              title="Category Defaults"
              val={computedMetrics.defaults}
              icon={<CheckCircle2 />}
              theme="bg-amber-50 text-amber-600 border-amber-100"
            />
            <StatTickerBox
              title="Standee Banners"
              val={computedMetrics.banners}
              icon={<Sparkles />}
              theme="bg-purple-50 text-purple-600 border-purple-100"
            />
          </div>

          {/* Search, Filter & Layout Switcher Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search templates by title or notes..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="GENERAL">General</option>
                <option value="STAND_BANNER">Standee Banner</option>
                <option value="TABLE_TOP">Table Top</option>
                <option value="STICKER">Sticker</option>
                <option value="FESTIVE">Festive Edition</option>
              </select>
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

          {/* =========================================================
              VIEW MODE 1: RESPONSIVE GRID VIEW (PROPORTIONAL FIT)
              ========================================================= */}
          {displayMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {loading && templates.length === 0 ? (
                <div className="col-span-full py-28 text-center text-blue-600">
                  <Loader2 className="animate-spin mx-auto mb-2" size={36} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading standee canvases...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="col-span-full py-20 text-center font-bold text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-[28px] text-xs uppercase tracking-wider italic">
                  No QR templates found matching the active query or filter criteria.
                </div>
              ) : (
                filteredData.map((tpl) => {
                  const displayImg = tpl.previewThumbnailUrl || tpl.templateImageUrl;
                  return (
                    <div
                      key={tpl._id}
                      onClick={() => openTemplateDetails(tpl)}
                      className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Proportional Standee Frame Box */}
                        <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] bg-slate-950 flex items-center justify-center p-3 border-b border-slate-900 overflow-hidden">
                          {displayImg ? (
                            <img
                              src={displayImg}
                              alt={tpl.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <QrCode size={36} className="text-slate-700" />
                          )}

                          {/* Floating Badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none font-black text-[9px] uppercase tracking-wider">
                            <span className={`px-2 py-0.5 rounded-md text-white shadow-xs ${
                              tpl.isActive ? "bg-emerald-600" : "bg-slate-700"
                            }`}>
                              {tpl.isActive ? "Live" : "Draft"}
                            </span>

                            {tpl.isDefault && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md shadow-xs">
                                Default
                              </span>
                            )}
                          </div>

                          {/* Fullscreen Trigger */}
                          {displayImg && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({ src: tpl.templateImageUrl || displayImg, label: `${tpl.title} - Standee Artwork` });
                              }}
                              className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Fullscreen Standee"
                            >
                              <Maximize2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="p-4 sm:p-5 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-[#0F172A] text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {tpl.title}
                            </h3>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase shrink-0">
                              {tpl.category}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {tpl.description || "No layout description notes provided."}
                          </p>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                            <span>Pos: {tpl.qrPlacementConfig?.qrBoxPositionX || 0}, {tpl.qrPlacementConfig?.qrBoxPositionY || 0}</span>
                            <span>{tpl.qrPlacementConfig?.qrBoxWidth || 200}x{tpl.qrPlacementConfig?.qrBoxHeight || 200} px</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
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
                                handleToggleActive(tpl._id, tpl.isActive);
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                tpl.isActive ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100" : "text-slate-400 hover:bg-slate-50 border-slate-200"
                              }`}
                              title="Toggle Visibility"
                            >
                              {tpl.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTemplateEdit(tpl);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit Template"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(tpl._id, tpl.title);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Template"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* =========================================================
                VIEW MODE 2: TABLE LIST LEDGER VIEW
                ========================================================= */
            <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Preview</th>
                      <th className="px-6 py-4">Template Details</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">QR Box Config</th>
                      <th className="px-6 py-4 text-center">Default</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredData.map((tpl) => {
                      const displayImg = tpl.previewThumbnailUrl || tpl.templateImageUrl;
                      return (
                        <tr 
                          key={tpl._id} 
                          onClick={() => openTemplateDetails(tpl)}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div 
                              onClick={(e) => {
                                if (tpl.templateImageUrl || displayImg) {
                                  e.stopPropagation();
                                  setLightboxImage({ src: tpl.templateImageUrl || displayImg, label: `${tpl.title} - Artwork` });
                                }
                              }}
                              className={`w-12 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-1 shrink-0 ${displayImg ? 'cursor-zoom-in group/img' : ''}`}
                            >
                              {displayImg ? (
                                <img
                                  src={displayImg}
                                  alt={tpl.title}
                                  className="w-full h-full object-contain group-hover/img:scale-105 transition-transform"
                                />
                              ) : (
                                <QrCode size={16} className="text-slate-600" />
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 max-w-xs">
                            <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {tpl.title}
                            </div>
                            <div className="text-[11px] font-medium text-slate-400 line-clamp-1 mt-0.5">
                              {tpl.description || "No description provided."}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="capitalize font-bold text-[10px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                              {tpl.category}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            <span>
                              X:{tpl.qrPlacementConfig?.qrBoxPositionX || 0} Y:{tpl.qrPlacementConfig?.qrBoxPositionY || 0}
                            </span>
                            <br />
                            <span className="text-[10px] text-slate-400">
                              {tpl.qrPlacementConfig?.qrBoxWidth || 200}x{tpl.qrPlacementConfig?.qrBoxHeight || 200} px
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            {tpl.isDefault ? (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-xl border bg-amber-50 text-amber-600 border-amber-100">
                                Default
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px] font-bold">—</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActive(tpl._id, tpl.isActive);
                              }}
                              className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border cursor-pointer ${
                                tpl.isActive
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {tpl.isActive ? (
                                <>
                                  <Eye size={12} strokeWidth={2.5} /> Published
                                </>
                              ) : (
                                <>
                                  <EyeOff size={12} strokeWidth={2.5} /> Draft
                                </>
                              )}
                            </button>
                          </td>

                          <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTemplateEdit(tpl);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              title="Edit Template"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(tpl._id, tpl.title);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Delete Template"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
// SUB-COMPONENT: SINGLE QR TEMPLATE DETAILS AUDIT VIEW
// =========================================================
const QrTemplateDetailsView = ({
  template,
  onBack,
  onEdit,
  onDelete,
  onToggleActive,
  onOpenLightbox
}) => {
  const displayImg = template.templateImageUrl || template.previewThumbnailUrl;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to QR Templates
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl border transition cursor-pointer ${
              template.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {template.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
            {template.isActive ? "Published" : "Draft"}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit Template
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
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6">
        
        {/* Banner Hero Preview (Proportional Fit Container) */}
        <div className="relative w-full aspect-[16/10] sm:aspect-video bg-slate-950 overflow-hidden flex items-center justify-center p-4 group">
          {displayImg ? (
            <img 
              src={displayImg} 
              alt={template.title}
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => onOpenLightbox(displayImg, `${template.title} - Standee Artwork`)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-2">
              <QrCode size={44} className="text-slate-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Standee Canvas Stamped</p>
            </div>
          )}

          {displayImg && (
            <button
              onClick={() => onOpenLightbox(displayImg, `${template.title} - Standee Artwork`)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md text-xs font-bold transition cursor-pointer shadow-lg"
            >
              <Maximize2 size={14} /> Open Fullscreen
            </button>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1 font-black text-xs uppercase tracking-wider rounded-xl shadow-md ${
              template.isActive ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200"
            }`}>
              {template.isActive ? "Live in App" : "Draft"}
            </span>
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              {template.category}
            </span>
            {template.isDefault && (
              <span className="px-3 py-1 bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
                Default
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {template.title}
              </h2>
              <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                Format: {template.category}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
              {template.description || "No specific merchant printing recommendations or notes recorded."}
            </p>
          </div>

          {/* QR Box Coordinates Specifications Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Canvas Placement Coordinates
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Position X</span>
                <p className="text-sm font-black font-mono text-slate-900">{template.qrPlacementConfig?.qrBoxPositionX || 0} px</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Position Y</span>
                <p className="text-sm font-black font-mono text-slate-900">{template.qrPlacementConfig?.qrBoxPositionY || 0} px</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Width</span>
                <p className="text-sm font-black font-mono text-slate-900">{template.qrPlacementConfig?.qrBoxWidth || 200} px</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Height</span>
                <p className="text-sm font-black font-mono text-slate-900">{template.qrPlacementConfig?.qrBoxHeight || 200} px</p>
              </div>
            </div>
          </div>

          {/* Branding Visibility Flags */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Dynamic Merchant Brand Elements
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Store Name Typography</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  template.qrPlacementConfig?.showShopName ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-600"
                }`}>
                  {template.qrPlacementConfig?.showShopName ? "Active" : "Hidden"}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Store Brand Logo</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  template.qrPlacementConfig?.showLogo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-600"
                }`}>
                  {template.qrPlacementConfig?.showLogo ? "Active" : "Hidden"}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} /> Object ID
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={template._id}>
                {template._id}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} /> Created Timestamp
              </span>
              <p className="text-xs font-bold text-slate-800">
                {template.createdAt ? new Date(template.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "System Core Template"}
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
          {image.label || "QR Template Graphic"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="qr-standee-template.png"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Full Artwork"
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
        className="w-full h-full flex items-center justify-center p-2 sm:p-4 max-w-[95vw] sm:max-w-5xl max-h-[85vh]"
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

// --- Embedded Presentational Stat Block Presenter ---
const StatTickerBox = ({ title, val, icon, theme }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between">
    <div className="space-y-0.5 sm:space-y-1">
      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-lg sm:text-xl font-black font-mono text-slate-800 leading-none pt-0.5 sm:pt-1">{val}</h3>
    </div>
    <div className={`w-8 h-8 sm:w-10 sm:h-10 border rounded-xl flex items-center justify-center p-1.5 sm:p-2 shrink-0 ${theme}`}>
      {React.cloneElement(icon, { size: 16, strokeWidth: 2.5 })}
    </div>
  </div>
);

export default AdminQrTemplateManagement;