import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  RefreshCw, Eye, EyeOff, QrCode, Image as ImageIcon, Sparkles, Layers,
  CheckCircle2, Upload
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminQrTemplateManagement = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle active status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this QR template?")) return;
    try {
      await accountClient.delete(`/admin/qr-templates/${id}`, { headers });
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
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

  if (view === "form") {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
        <button
          onClick={() => {
            setView("list");
            resetForm();
          }}
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to QR Templates Directory
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="text-blue-600 w-5 h-5" />
            {selectedTemplate ? "Modify QR Standee Template" : "Build QR Background Template"}
          </h2>

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
                    <span className="text-[9px] font-bold text-slate-400">Max size: 5MB</span>
                  </div>
                </div>

                {imagePreviewUrl ? (
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-16 h-20 object-contain rounded bg-slate-50 border border-slate-100"
                    />
                    <span className="text-xs font-bold text-slate-600">Selected Frame Preview</span>
                  </div>
                ) : (
                  <div className="p-4 bg-white/60 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-semibold italic">
                    No image chosen yet
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
                <option value="GENERAL">General</option>
                <option value="STAND_BANNER">Standee Banner</option>
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

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                  className="text-blue-600 cursor-pointer"
                >
                  {formData.isDefault ? (
                    <ToggleRight size={38} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-300" />
                  )}
                </button>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Set as Default Template
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className="text-blue-600 cursor-pointer"
                >
                  {formData.isActive ? (
                    <ToggleRight size={38} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-300" />
                  )}
                </button>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Publish to Merchants
                </span>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Save size={16} strokeWidth={2.5} />
              )}{" "}
              Save QR Template
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <QrCode className="text-blue-600 w-8 h-8" /> QR Standee Backgrounds
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure, upload, and organize printable QR standee background templates for merchants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTemplates}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setView("form");
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all cursor-pointer text-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Template
          </button>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
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
          title="Default Category Picks"
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

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative group w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search templates by title or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="GENERAL">General</option>
            <option value="STAND_BANNER">Standee Banner</option>
            <option value="TABLE_TOP">Table Top</option>
            <option value="STICKER">Sticker</option>
            <option value="FESTIVE">Festive Edition</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Preview</th>
                <th className="px-6 py-4">Template Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">QR Box Configuration</th>
                <th className="px-6 py-4">Default</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-24 text-center">
                    <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Loading QR Templates...
                    </p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                  >
                    No QR templates found matching the active query or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((tpl) => (
                  <tr key={tpl._id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        <img
                          src={tpl.previewThumbnailUrl || tpl.templateImageUrl}
                          alt={tpl.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {tpl.title}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
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
                        X:{tpl.qrPlacementConfig?.qrBoxPositionX || 0} Y:
                        {tpl.qrPlacementConfig?.qrBoxPositionY || 0}
                      </span>
                      <br />
                      <span className="text-[10px] text-slate-400">
                        {tpl.qrPlacementConfig?.qrBoxWidth}x{tpl.qrPlacementConfig?.qrBoxHeight} px
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {tpl.isDefault ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border bg-amber-50 text-amber-600 border-amber-100">
                          Default
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px] font-bold">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(tpl._id, tpl.isActive)}
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
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          setFormData({
                            title: tpl.title,
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
                          setImagePreviewUrl(tpl.templateImageUrl);
                          setView("form");
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl._id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatTickerBox = ({ title, val, icon, theme }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-xl font-black font-mono text-slate-800 leading-none pt-1">{val}</h3>
    </div>
    <div className={`w-10 h-10 border rounded-xl flex items-center justify-center p-2 ${theme}`}>
      {React.cloneElement(icon, { size: 16, strokeWidth: 2.5 })}
    </div>
  </div>
);

const ToggleLeft = ({ size, className }) => <X className={`${className}`} size={size} strokeWidth={3} />;
const ToggleRight = ({ size, className }) => <Check className={`${className}`} size={size} strokeWidth={3} />;

export default AdminQrTemplateManagement;