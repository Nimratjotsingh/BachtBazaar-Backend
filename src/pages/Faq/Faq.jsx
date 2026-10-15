import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  HelpCircle, RefreshCw, Eye, EyeOff, Video, PlayCircle, BookOpen, 
  MessageSquare, ExternalLink, Calendar, Hash, Users, Layers, AlertCircle
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminFaqManagement = ({ token }) => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'details' | 'form'
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    videoUrl: "",
    videoDuration: "",
    category: "general",
    targetAudience: "all",
    order: 0,
    is_published: true,
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchFaqs();
  }, [selectedAudience, selectedCategory]);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedAudience !== "all") params.append("targetAudience", selectedAudience);
      if (selectedCategory !== "all") params.append("category", selectedCategory);

      const res = await accountClient.get(`/faqs/admin/all?${params.toString()}`, { headers });
      setFaqs(res.data.data || []);
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        videoUrl: formData.videoUrl.trim(),
        videoDuration: formData.videoDuration.trim(),
        category: formData.category,
        targetAudience: formData.targetAudience,
        order: Number(formData.order) || 0,
        is_published: formData.is_published,
      };

      if (selectedFaq?._id) {
        await accountClient.put(`/faqs/admin/${selectedFaq._id}`, payload, { headers });
      } else {
        await accountClient.post("/faqs/admin", payload, { headers });
      }

      await fetchFaqs();
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
      const res = await accountClient.patch(`/faqs/admin/${id}/toggle-publish`, {}, { headers });
      if (res.data.success) {
        setFaqs((prev) =>
          prev.map((faq) =>
            faq._id === id ? { ...faq, is_published: res.data.data.is_published } : faq
          )
        );
        if (selectedFaq?._id === id) {
          setSelectedFaq((prev) => ({ ...prev, is_published: res.data.data.is_published }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle publish status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this FAQ item?")) return;
    try {
      await accountClient.delete(`/faqs/admin/${id}`, { headers });
      if (selectedFaq?._id === id) {
        setView("list");
        setSelectedFaq(null);
      }
      fetchFaqs();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const openFaqDetails = (faq) => {
    setSelectedFaq(faq);
    setView("details");
  };

  const openFaqEdit = (faq) => {
    setSelectedFaq(faq);
    setFormData({
      question: faq.question || "",
      answer: faq.answer || "",
      videoUrl: faq.videoUrl || "",
      videoDuration: faq.videoDuration || "",
      category: faq.category || "general",
      targetAudience: faq.targetAudience || "all",
      order: faq.order || 0,
      is_published: faq.is_published ?? true,
    });
    setView("form");
  };

  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
      videoUrl: "",
      videoDuration: "",
      category: "general",
      targetAudience: "all",
      order: 0,
      is_published: true,
    });
    setSelectedFaq(null);
  };

  const computedMetrics = useMemo(() => {
    return {
      total: faqs.length,
      published: faqs.filter((f) => f.is_published).length,
      withVideos: faqs.filter((f) => f.videoUrl && f.videoUrl.trim() !== "").length,
      users: faqs.filter((f) => f.targetAudience === "users" || f.targetAudience === "all").length,
    };
  }, [faqs]);

  const filteredData = faqs.filter((faq) =>
    faq.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* =========================================================
          SUB-VIEW 1: SINGLE FAQ DETAILS AUDIT VIEW
          ========================================================= */}
      {view === "details" && selectedFaq && (
        <FaqDetailsView
          faq={selectedFaq}
          onBack={() => { setView("list"); setSelectedFaq(null); }}
          onEdit={() => openFaqEdit(selectedFaq)}
          onDelete={() => handleDelete(selectedFaq._id)}
          onTogglePublish={() => handleTogglePublish(selectedFaq._id)}
        />
      )}

      {/* =========================================================
          SUB-VIEW 2: FORM CREATE / EDIT VIEW
          ========================================================= */}
      {view === "form" && (
        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button
            onClick={() => {
              setView("list");
              resetForm();
            }}
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to FAQs Directory
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
                {selectedFaq ? "Modify FAQ Record" : "Build FAQ Knowledge Base Item"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Curate guided knowledge-base entries and step-by-step resolution answers.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Question */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Question Query *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How do I redeem an offer in-store?"
                />
              </div>

              {/* Answer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Detailed Answer Content *
                </label>
                <textarea
                  required
                  rows="4"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a step-by-step resolution or answer for the user..."
                />
              </div>

              {/* VIDEO TUTORIAL LINK SECTION */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-blue-900 uppercase tracking-wider">
                  <Video size={16} className="text-blue-600" /> Attached Video Tutorial Link (Optional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Video URL (YouTube, Vimeo, MP4)
                    </label>
                    <input
                      type="url"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Video Duration
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 font-mono"
                      value={formData.videoDuration}
                      onChange={(e) => setFormData({ ...formData, videoDuration: e.target.value })}
                      placeholder="e.g. 2:15"
                    />
                  </div>
                </div>
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Category Tag
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="general">General</option>
                    <option value="account">Account</option>
                    <option value="merchants">Merchants</option>
                    <option value="offers">Offers</option>
                    <option value="payments">Payments</option>
                    <option value="orders">Orders</option>
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

              {/* Order & Published Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Display Sorting Order Index
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="is_published_toggle"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_published_toggle" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Publish Item Immediately to Client Apps
                  </label>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save FAQ Document
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-VIEW 3: PRIMARY LIST VIEW
          ========================================================= */}
      {view === "list" && (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Workspace Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <HelpCircle className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> FAQ Knowledge Base
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Configure, organize, and publish FAQs and video guides for app customers and merchants
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchFaqs}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh List"
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
                <Plus size={18} strokeWidth={2.5} /> Add New FAQ
              </button>
            </div>
          </div>

          {/* Analytics Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            <StatTickerBox title="Total Questions" val={computedMetrics.total} icon={<HelpCircle />} theme="bg-blue-50 text-blue-600 border-blue-100" />
            <StatTickerBox title="Live Published" val={computedMetrics.published} icon={<Eye />} theme="bg-emerald-50 text-emerald-600 border-emerald-100" />
            <StatTickerBox title="Video Tutorials" val={computedMetrics.withVideos} icon={<Video />} theme="bg-rose-50 text-rose-600 border-rose-100" />
            <StatTickerBox title="App Users Scope" val={computedMetrics.users} icon={<BookOpen />} theme="bg-purple-50 text-purple-600 border-purple-100" />
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search questions or answers..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <select
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="all">All Audiences</option>
                <option value="users">App Users Only</option>
                <option value="merchants">Merchants Only</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="account">Account</option>
                <option value="merchants">Merchants</option>
                <option value="offers">Offers</option>
                <option value="payments">Payments</option>
                <option value="orders">Orders</option>
              </select>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Order</th>
                    <th className="px-6 py-4">Question & Answer Context</th>
                    <th className="px-6 py-4">Video Link</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Audience</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-24 text-center">
                        <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loading FAQs...</p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                        No FAQ records found matching the active query or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((faq) => (
                      <tr 
                        key={faq._id} 
                        onClick={() => openFaqDetails(faq)}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono font-black text-slate-400">
                          #{faq.order || 0}
                        </td>

                        <td className="px-6 py-4 max-w-md">
                          <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {faq.question}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                            {faq.answer}
                          </div>
                        </td>

                        {/* Video Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {faq.videoUrl ? (
                            <a
                              href={faq.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-[10px] font-bold transition-colors"
                            >
                              <PlayCircle size={12} strokeWidth={2.5} /> Watch
                              {faq.videoDuration && (
                                <span className="opacity-75 font-mono">({faq.videoDuration})</span>
                              )}
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">No Video</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="capitalize font-bold text-[10px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                            {faq.category}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`capitalize text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                              faq.targetAudience === "users"
                                ? "bg-blue-50 text-blue-600 border-blue-100"
                                : faq.targetAudience === "merchants"
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            }`}
                          >
                            {faq.targetAudience}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePublish(faq._id);
                            }}
                            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border cursor-pointer ${
                              faq.is_published
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {faq.is_published ? (
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
                              openFaqEdit(faq);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit FAQ"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(faq._id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete FAQ"
                          >
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
        </div>
      )}
    </>
  );
};

// =========================================================
// SUB-COMPONENT: SINGLE FAQ DETAILS AUDIT VIEW
// =========================================================
const FaqDetailsView = ({
  faq,
  onBack,
  onEdit,
  onDelete,
  onTogglePublish
}) => {
  // Helper to extract embedded YouTube/Vimeo URLs if provided
  const getEmbedUrl = (url) => {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch")) {
        const videoId = new URL(url).searchParams.get("v");
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  const embedUrl = getEmbedUrl(faq.videoUrl);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300 text-slate-800 antialiased font-sans">
      
      {/* Return Ribbon & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer w-fit"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to FAQs Directory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePublish}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl border transition cursor-pointer ${
              faq.is_published
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {faq.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
            {faq.is_published ? "Published" : "Draft"}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 size={14} /> Edit FAQ
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
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden space-y-6 p-6 sm:p-8">
        
        {/* Header Tags & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
              Order Index #{faq.order || 0}
            </span>
            <span className={`capitalize text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border ${
              faq.targetAudience === "users"
                ? "bg-blue-50 text-blue-600 border-blue-100"
                : faq.targetAudience === "merchants"
                ? "bg-purple-50 text-purple-600 border-purple-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
            }`}>
              Scope: {faq.targetAudience}
            </span>
            <span className="capitalize text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/70">
              Category: {faq.category}
            </span>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
            faq.is_published
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {faq.is_published ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
            {faq.is_published ? "Live in App" : "Unpublished Draft"}
          </span>
        </div>

        {/* Question */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            User Question Query
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            {faq.question}
          </h2>
        </div>

        {/* Answer Content */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Full Answer Content & Resolution
          </span>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
            {faq.answer}
          </div>
        </div>

        {/* Video Tutorial Embed / Link Section */}
        {faq.videoUrl && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Video size={13} className="text-blue-600" /> Attached Video Tutorial
              </span>
              <a
                href={faq.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                Open in external tab <ExternalLink size={12} />
              </a>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
              {embedUrl && (embedUrl.includes("youtube.com") || embedUrl.includes("vimeo.com")) ? (
                <iframe
                  src={embedUrl}
                  title="FAQ Video Tutorial"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3 p-4 text-center">
                  <PlayCircle size={44} className="text-red-500" />
                  <div>
                    <p className="font-extrabold text-sm">{faq.videoUrl}</p>
                    {faq.videoDuration && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Duration: {faq.videoDuration}</p>
                    )}
                  </div>
                  <a
                    href={faq.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-100 transition"
                  >
                    Play Video Stream
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Hash size={13} /> Object ID
            </span>
            <p className="text-xs font-mono font-bold text-slate-800 truncate" title={faq._id}>
              {faq._id}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={13} /> Created Date
            </span>
            <p className="text-xs font-bold text-slate-800">
              {faq.createdAt ? new Date(faq.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "System Core Record"}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={13} /> Last Updated
            </span>
            <p className="text-xs font-bold text-slate-800">
              {faq.updatedAt ? new Date(faq.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not updated"}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Embedded Stat Ticker Presenter ---
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

export default AdminFaqManagement;