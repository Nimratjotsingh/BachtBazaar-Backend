import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  FileText, RefreshCw, Eye, EyeOff, Video, Star, ThumbsUp, ThumbsDown,
  Tag, Filter, BookOpen, Layers, ExternalLink
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const CATEGORIES = [
  { value: "getting-started", label: "Getting Started" },
  { value: "account-settings", label: "Account Settings" },
  { value: "redemptions-and-claims", label: "Redemptions & Claims" },
  { value: "merchant-onboarding", label: "Merchant Onboarding" },
  { value: "payments-and-payouts", label: "Payments & Payouts" },
  { value: "troubleshooting", label: "Troubleshooting" },
];

const AdminHelpArticleManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter States
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    summary: "",
    content: "",
    category: "getting-started",
    targetAudience: "all",
    tagsInput: "",
    videoUrl: "",
    videoDuration: "",
    isFeatured: false,
    isPublished: true,
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchArticles();
  }, [selectedAudience, selectedCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedAudience !== "all") params.append("targetAudience", selectedAudience);
      if (selectedCategory !== "all") params.append("category", selectedCategory);

      const res = await accountClient.get(`/help-articles/admin/all?${params.toString()}`, { headers });
      setArticles(res.data.data || []);
    } catch (err) {
      console.error("Error fetching help articles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        summary: formData.summary.trim(),
        content: formData.content.trim(),
        category: formData.category,
        targetAudience: formData.targetAudience,
        tags: formData.tagsInput ? formData.tagsInput.split(",").map((t) => t.trim()) : [],
        videoUrl: formData.videoUrl.trim(),
        videoDuration: formData.videoDuration.trim(),
        isFeatured: formData.isFeatured,
        isPublished: formData.isPublished,
      };

      if (selectedArticle?._id) {
        await accountClient.put(`/help-articles/admin/${selectedArticle._id}`, payload, { headers });
      } else {
        await accountClient.post("/help-articles/admin", payload, { headers });
      }

      await fetchArticles();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const res = await accountClient.patch(`/help-articles/admin/${id}/toggle-publish`, {}, { headers });
      if (res.data.success) {
        setArticles((prev) =>
          prev.map((art) =>
            art._id === id ? { ...art, isPublished: res.data.data.isPublished } : art
          )
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle publish status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this help article?")) return;
    try {
      await accountClient.delete(`/help-articles/admin/${id}`, { headers });
      fetchArticles();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      summary: "",
      content: "",
      category: "getting-started",
      targetAudience: "all",
      tagsInput: "",
      videoUrl: "",
      videoDuration: "",
      isFeatured: false,
      isPublished: true,
    });
    setSelectedArticle(null);
  };

  // Dynamic Dashboard Stats
  const computedMetrics = useMemo(() => {
    return {
      total: articles.length,
      published: articles.filter((a) => a.isPublished).length,
      featured: articles.filter((a) => a.isFeatured).length,
      totalViews: articles.reduce((acc, a) => acc + (a.views || 0), 0),
    };
  }, [articles]);

  const filteredData = articles.filter((art) =>
    art.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    art.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    art.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (view === "form")
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
        <button
          onClick={() => {
            setView("list");
            resetForm();
          }}
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Articles Index
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
            {selectedArticle ? "Modify Help Article" : "Compose New Help Guide"}
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Article Title *
              </label>
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Complete Guide to In-Store QR Redemption"
              />
            </div>

            {/* Custom Slug Override */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Custom URL Slug (Optional - Auto generated if empty)
              </label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. guide-to-qr-redemption"
              />
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Short Excerpt / Summary
              </label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief 1-2 sentence overview shown on help cards..."
              />
            </div>

            {/* Article Content */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Full Article Content (HTML or Text) *
              </label>
              <textarea
                required
                rows="8"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700 leading-relaxed"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write article explanation or HTML structured guide steps here..."
              />
            </div>

            {/* Video Tutorial Section */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-blue-900 uppercase tracking-wider">
                <Video size={16} className="text-blue-600" /> Embedded Video Tutorial (Optional)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Video URL
                  </label>
                  <input
                    type="url"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Duration
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={formData.videoDuration}
                    onChange={(e) => setFormData({ ...formData, videoDuration: e.target.value })}
                    placeholder="e.g. 3:45"
                  />
                </div>
              </div>
            </div>

            {/* Category & Audience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Category Classification
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Target Audience Scope
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All (Users & Merchants)</option>
                  <option value="users">App Users Only</option>
                  <option value="merchants">Merchants Only</option>
                </select>
              </div>
            </div>

            {/* Search Tags */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Search Tags (Comma Separated)
              </label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700"
                value={formData.tagsInput}
                onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                placeholder="qr, redemption, claims, walk-in"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <Star size={14} className="text-amber-500 fill-amber-500" /> Feature on Help Homepage
                </span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                  className="text-blue-600 cursor-pointer"
                >
                  {formData.isPublished ? (
                    <ToggleRight size={38} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-300" />
                  )}
                </button>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Publish Article Immediately
                </span>
              </label>
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Help Article
            </button>
          </form>
        </div>
      </div>
    );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <BookOpen className="text-blue-600 w-8 h-8" /> Help Center Articles
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Publish knowledge base guides, tutorials, and step-by-step documentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchArticles}
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
            <Plus size={18} strokeWidth={2.5} /> Add New Article
          </button>
        </div>
      </div>

      {/* Analytics Tickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox title="Total Articles" val={computedMetrics.total} icon={<FileText />} theme="bg-blue-50 text-blue-600 border-blue-100" />
        <StatTickerBox title="Published Guides" val={computedMetrics.published} icon={<Eye />} theme="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <StatTickerBox title="Featured Articles" val={computedMetrics.featured} icon={<Star />} theme="bg-amber-50 text-amber-600 border-amber-100" />
        <StatTickerBox title="Total Reader Views" val={computedMetrics.totalViews} icon={<BookOpen />} theme="bg-purple-50 text-purple-600 border-purple-100" />
      </div>

      {/* Search & Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative group w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search articles by title, summary or tags..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedAudience}
            onChange={(e) => setSelectedAudience(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="all">All Audiences</option>
            <option value="users">App Users Only</option>
            <option value="merchants">Merchants Only</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Article Title & Overview</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Audience</th>
                <th className="px-6 py-4">Engagement Metrics</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Streaming Articles...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                    No help articles found matching query or filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((art) => (
                  <tr key={art._id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4 max-w-md">
                      <div className="flex items-center gap-2">
                        {art.isFeatured && (
                          <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" title="Featured Article" />
                        )}
                        <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {art.title}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                        {art.summary || "No summary excerpt declared."}
                      </div>

                      {/* Tag list */}
                      {art.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {art.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize font-bold text-[10px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                        {art.category?.replace(/-/g, " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`capitalize text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                          art.targetAudience === "users"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : art.targetAudience === "merchants"
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {art.targetAudience}
                      </span>
                    </td>

                    {/* Metrics */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
                        <span title="Views" className="flex items-center gap-1">
                          <Eye size={12} className="text-slate-400" /> {art.views || 0}
                        </span>
                        <span title="Helpful Votes" className="flex items-center gap-1 text-emerald-600">
                          <ThumbsUp size={12} /> {art.helpfulVotes || 0}
                        </span>
                        <span title="Unhelpful Votes" className="flex items-center gap-1 text-rose-500">
                          <ThumbsDown size={12} /> {art.unhelpfulVotes || 0}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(art._id)}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border cursor-pointer ${
                          art.isPublished
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {art.isPublished ? (
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
                          setSelectedArticle(art);
                          setFormData({
                            title: art.title,
                            slug: art.slug || "",
                            summary: art.summary || "",
                            content: art.content,
                            category: art.category,
                            targetAudience: art.targetAudience,
                            tagsInput: art.tags ? art.tags.join(", ") : "",
                            videoUrl: art.videoUrl || "",
                            videoDuration: art.videoDuration || "",
                            isFeatured: art.isFeatured,
                            isPublished: art.isPublished,
                          });
                          setView("form");
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(art._id)}
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

export default AdminHelpArticleManagement;