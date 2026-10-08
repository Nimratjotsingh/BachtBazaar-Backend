import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft,
  Filter, Layers, ChevronDown, Sparkles, Tags, RefreshCw,
  X, CheckCircle2, ToggleLeft, ToggleRight, AlertCircle, Hash
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const TagSuggestionAdminPage = ({ token }) => {
  // --- Core Lifecycle States ---
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Form States
  const [formData, setFormData] = useState({
    category_id: "",
    subcategory_id: "",
    tags: [],
    is_active: true,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suggRes, catRes, subRes] = await Promise.all([
        accountClient.get("/admin/tag-suggestions", { headers }),
        accountClient.get("/categories", { headers }),
        accountClient.get("/subcategories", { headers }),
      ]);

      setSuggestions(suggRes.data.data || suggRes.data.suggestions || []);
      setCategories(catRes.data.categories || catRes.data || []);
      setSubCategories(subRes.data.subCategories || subRes.data || []);
    } catch (err) {
      console.error("Error loading tag suggestions configuration:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic subcategory options for the form based on chosen category
  const formSubCategoryOptions = useMemo(() => {
    if (!formData.category_id) return subCategories;
    return subCategories.filter(
      (sub) =>
        (typeof sub.categoryId === "object" ? sub.categoryId?._id : sub.categoryId) ===
        formData.category_id
    );
  }, [subCategories, formData.category_id]);

  // Tag token input handlers
  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const cleanTag = tagInput.trim().toLowerCase().replace(/^#/, "");
      if (cleanTag && !formData.tags.includes(cleanTag)) {
        setFormData({ ...formData, tags: [...formData.tags, cleanTag] });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const resetForm = () => {
    setFormData({
      category_id: "",
      subcategory_id: "",
      tags: [],
      is_active: true,
    });
    setTagInput("");
    setSelectedSuggestion(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.category_id && !formData.subcategory_id) {
      alert("Please select at least a Category or a Sub-Category mapping.");
      return;
    }

    if (formData.tags.length === 0) {
      alert("Please include at least one suggested tag.");
      return;
    }

    const payload = {
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      tags: formData.tags,
      is_active: formData.is_active,
    };

    try {
      setLoading(true);
      if (selectedSuggestion?._id) {
        await accountClient.put(`/admin/tag-suggestions/${selectedSuggestion._id}`, payload, { headers });
      } else {
        await accountClient.post("/admin/tag-suggestions", payload, { headers });
      }
      await fetchInitialData();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed to complete");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this tag suggestion rule?")) return;
    try {
      await accountClient.delete(`/admin/tag-suggestions/${id}`, { headers });
      fetchInitialData();
    } catch (err) {
      alert("Delete operation encountered an error");
    }
  };

  const handleToggleStatus = async (suggestion) => {
    try {
      await accountClient.put(
        `/admin/tag-suggestions/${suggestion._id}`,
        { is_active: !suggestion.is_active },
        { headers }
      );
      setSuggestions((prev) =>
        prev.map((s) => (s._id === suggestion._id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Metrics
  const computedMetrics = useMemo(() => {
    const totalTagsSet = new Set();
    suggestions.forEach((item) => item.tags?.forEach((t) => totalTagsSet.add(t)));

    return {
      totalRules: suggestions.length,
      activeRules: suggestions.filter((s) => s.is_active).length,
      uniqueKeywords: totalTagsSet.size,
      combinedRules: suggestions.filter((s) => s.category_id && s.subcategory_id).length,
    };
  }, [suggestions]);

  // Filtering Pipeline
  const filteredData = useMemo(() => {
    return suggestions.filter((item) => {
      const catId = typeof item.category_id === "object" ? item.category_id?._id : item.category_id;
      const subId = typeof item.subcategory_id === "object" ? item.subcategory_id?._id : item.subcategory_id;

      const matchesCategory = filterCategory === "all" || catId === filterCategory;
      const matchesSubCategory = filterSubCategory === "all" || subId === filterSubCategory;
      const matchesStatus =
        filterStatus === "all" || (filterStatus === "active" ? item.is_active : !item.is_active);

      const matchesSearch =
        searchTerm === "" ||
        item.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category_id?.name || item.category_id?.label || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.subcategory_id?.name || item.subcategory_id?.label || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSubCategory && matchesStatus && matchesSearch;
    });
  }, [suggestions, filterCategory, filterSubCategory, filterStatus, searchTerm]);

  // --- FORM VIEW ---
  if (view === "form") {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
        <button
          onClick={() => {
            setView("list");
            resetForm();
          }}
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Suggestion Rules
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">
              {selectedSuggestion ? "Modify Suggestion Rule" : "Create Tag Suggestion Rule"}
            </h2>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition cursor-pointer"
            >
              {formData.is_active ? (
                <>
                  <ToggleRight size={26} className="text-emerald-500" /> Active
                </>
              ) : (
                <>
                  <ToggleLeft size={26} className="text-slate-400" /> Inactive
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Category Scope (Optional)
                </label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">None / Any Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.label || cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Sub-Category Scope (Optional)
                </label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    value={formData.subcategory_id}
                    onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                  >
                    <option value="">None / Any Sub-Category</option>
                    {formSubCategoryOptions.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.label || sub.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2 text-xs text-blue-700">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-blue-500" />
              <span>
                At least one classification (Category or Sub-Category) must be specified. If both are selected, suggestions trigger when both match.
              </span>
            </div>

            {/* Tag Badges & Multi-Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Suggested Tags Array (Press Enter or Comma to add)
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[120px] space-y-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm"
                    >
                      <Hash size={12} className="text-blue-500" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer ml-0.5"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag name and hit Enter..."
                  className="w-full bg-transparent border-none text-xs font-semibold outline-none text-slate-700 px-1 placeholder:text-slate-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Tags are normalized to lowercase automatically (e.g. "electronics", "wireless-audio").
              </p>
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
              Save Tag Suggestion Rule
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LIST / TABLE VIEW ---
  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <Tags className="text-blue-600 w-8 h-8" /> Tag Suggestion Rules
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Auto-populate searchable tag suggestions during product creation based on taxonomy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInitialData}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Dataset"
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
            <Plus size={18} strokeWidth={2.5} /> Add Suggestion Rule
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatTickerBox
          title="Total Mapping Rules"
          val={computedMetrics.totalRules}
          icon={<Tags />}
          theme="bg-blue-50 text-blue-600 border-blue-100"
        />
        <StatTickerBox
          title="Active Rules"
          val={computedMetrics.activeRules}
          icon={<CheckCircle2 />}
          theme="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatTickerBox
          title="Unique Keywords"
          val={computedMetrics.uniqueKeywords}
          icon={<Sparkles />}
          theme="bg-purple-50 text-purple-600 border-purple-100"
        />
        <StatTickerBox
          title="Dual Targetted Rules"
          val={computedMetrics.combinedRules}
          icon={<Layers />}
          theme="bg-cyan-50 text-cyan-600 border-cyan-100"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search rules by tag keyword or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter size={14} className="text-slate-400" />
            <select
              className="bg-transparent text-xs font-bold text-slate-600 outline-none py-2.5 cursor-pointer pr-4"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.label || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Filter */}
          <div className="flex items-center gap-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <select
              className="bg-transparent text-xs font-bold text-slate-600 outline-none py-2.5 cursor-pointer pr-4"
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
            >
              <option value="all">All Sub-Categories</option>
              {subCategories.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.label || s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <select
              className="bg-transparent text-xs font-bold text-slate-600 outline-none py-2.5 cursor-pointer pr-4"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suggestions Table */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Parent Category</th>
                <th className="px-6 py-4">Sub-Category Niche</th>
                <th className="px-6 py-4">Assigned Tag Keywords</th>
                <th className="px-6 py-4 text-center">Rule Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Syncing Tag Suggestion Rules...
                    </p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                  >
                    No matching suggestion rules discovered in directory.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const catLabel = item.category_id?.label || item.category_id?.name;
                  const subLabel = item.subcategory_id?.label || item.subcategory_id?.name;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/40 transition-colors group">
                      {/* Category */}
                      <td className="px-6 py-4">
                        {catLabel ? (
                          <span className="px-2.5 py-1 bg-blue-50/60 text-blue-600 border border-blue-100/40 rounded-lg text-[10px] font-black tracking-wide inline-block">
                            {catLabel}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Any / Universal</span>
                        )}
                      </td>

                      {/* Sub-Category */}
                      <td className="px-6 py-4">
                        {subLabel ? (
                          <span className="px-2.5 py-1 bg-purple-50/60 text-purple-600 border border-purple-100/40 rounded-lg text-[10px] font-black tracking-wide inline-block">
                            {subLabel}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Any / Universal</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {item.tags?.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className="cursor-pointer inline-flex items-center gap-1.5"
                          title="Click to toggle status"
                        >
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                              item.is_active
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-slate-50 text-slate-400 border-slate-200"
                            }`}
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedSuggestion(item);
                            setFormData({
                              category_id:
                                typeof item.category_id === "object"
                                  ? item.category_id?._id || ""
                                  : item.category_id || "",
                              subcategory_id:
                                typeof item.subcategory_id === "object"
                                  ? item.subcategory_id?._id || ""
                                  : item.subcategory_id || "",
                              tags: item.tags || [],
                              is_active: item.is_active ?? true,
                            });
                            setView("form");
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition cursor-pointer mr-1"
                          title="Edit Rule"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Reusable Stat Card matching your SubCategory page aesthetic
const StatTickerBox = ({ title, val, icon, theme }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-xl font-black font-mono text-slate-800 leading-none pt-1">{val}</h3>
    </div>
    <div className={`w-10 h-10 border rounded-xl flex items-center justify-center shadow-inner p-2 ${theme}`}>
      {React.cloneElement(icon, { size: 16, strokeWidth: 2.5 })}
    </div>
  </div>
);

export default TagSuggestionAdminPage;