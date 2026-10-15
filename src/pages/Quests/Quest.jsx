import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  CheckSquare, RefreshCw, Target, Calendar, Coins, Filter, Clock, AlertCircle, 
  Tag, Eye, Hash, Sparkles, Info
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const METRIC_TYPES = [
  { value: "PRODUCTS_CREATED", label: "Products Created Target" },
  { value: "SERVICES_CREATED", label: "Services Created Target" },
  { value: "OFFERS_CREATED", label: "Offers Created Target" },
  { value: "CLAIMS_HANDLED", label: "Claims Handled Target" },
  { value: "REDEMPTIONS_COMPLETED", label: "Redemptions Completed Target" },
  { value: "LOGIN_STREAK", label: "Consecutive Daily Login Streak Target" },
  { value: "TOTAL_LOGINS", label: "Total Accumulated Logins Target" },
  { value: "STORE_VIEWS", label: "Store Views Target" },
];

const TIMEFRAME_TYPES = [
  { value: "DAILY", label: "Daily Quest (Resets Every Midnight)" },
  { value: "WEEKLY", label: "Weekly Quest (Resets Every Monday)" },
  { value: "MONTHLY", label: "Monthly Quest (Resets 1st of Month)" },
  { value: "CUSTOM", label: "Custom Fixed Date Range" },
];

const OFFER_TYPES = [
  { value: "ALL", label: "All Offer Types (Banner & Calendar)" },
  { value: "BANNER", label: "Banner Offers Only" },
  { value: "CALENDAR", label: "Calendar Offers Only" },
];

const AdminQuestManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [inspectingQuest, setInspectingQuest] = useState(null); // Popup state
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    metricType: "PRODUCTS_CREATED",
    offerTypeConstraint: "ALL",
    targetValue: 5,
    rewardCoins: 50,
    validityDaysOverride: "",
    timeframeType: "DAILY",
    startDate: "",
    endDate: "",
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/admin/quests", { headers });
      setQuests(res.data.data || []);
    } catch (err) {
      console.error("Error fetching quests:", err);
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
        description: formData.description.trim(),
        metricType: formData.metricType,
        offerTypeConstraint: formData.offerTypeConstraint,
        targetValue: Number(formData.targetValue),
        rewardCoins: Number(formData.rewardCoins),
        validityDaysOverride: formData.validityDaysOverride ? Number(formData.validityDaysOverride) : null,
        timeframeType: formData.timeframeType,
        startDate: formData.timeframeType === "CUSTOM" && formData.startDate ? formData.startDate : null,
        endDate: formData.timeframeType === "CUSTOM" && formData.endDate ? formData.endDate : null,
      };

      if (selectedQuest?._id) {
        await accountClient.put(`/admin/quests/${selectedQuest._id}`, payload, { headers });
      } else {
        await accountClient.post("/admin/quests", payload, { headers });
      }

      await fetchQuests();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to deactivate quest "${title || 'selected'}"?`)) return;
    try {
      await accountClient.delete(`/admin/quests/${id}`, { headers });
      if (inspectingQuest?._id === id) {
        setInspectingQuest(null);
      }
      fetchQuests();
    } catch (err) {
      alert(err.response?.data?.message || "Deactivation failed");
    }
  };

  const openEditForm = (quest) => {
    setSelectedQuest(quest);
    setFormData({
      title: quest.title,
      description: quest.description || "",
      metricType: quest.metricType,
      offerTypeConstraint: quest.offerTypeConstraint || "ALL",
      targetValue: quest.targetValue,
      rewardCoins: quest.rewardCoins,
      validityDaysOverride: quest.validityDaysOverride || "",
      timeframeType: quest.timeframeType,
      startDate: quest.startDate ? quest.startDate.split("T")[0] : "",
      endDate: quest.endDate ? quest.endDate.split("T")[0] : "",
    });
    setInspectingQuest(null);
    setView("form");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      metricType: "PRODUCTS_CREATED",
      offerTypeConstraint: "ALL",
      targetValue: 5,
      rewardCoins: 50,
      validityDaysOverride: "",
      timeframeType: "DAILY",
      startDate: "",
      endDate: "",
    });
    setSelectedQuest(null);
  };

  const filteredData = quests.filter((quest) => {
    const matchesSearch =
      quest.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quest.metricType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTimeframe =
      timeframeFilter === "all" || quest.timeframeType === timeframeFilter;

    return matchesSearch && matchesTimeframe;
  });

  const isOfferRelatedMetric =
    formData.metricType === "OFFERS_CREATED" || formData.metricType === "REDEMPTIONS_COMPLETED";

  return (
    <>
      {/* =========================================================
          SUB-VIEW: FORM CREATE / EDIT VIEW
          ========================================================= */}
      {view === "form" ? (
        <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button
            onClick={() => {
              setView("list");
              resetForm();
            }}
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Quests Directory
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
                <Clock size={20} className="text-amber-500" />
                {selectedQuest ? "Modify Time-Bound Quest" : "Create Time-Bound Quest"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Configure time-window rules, target metrics, and direct Bachat Coin payouts.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Quest Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Quest Title *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 3-Day Login Streak Challenge, Weekend Redemption Rush"
                />
              </div>

              {/* Timeframe Type & Metric Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Timeframe Cycle *
                  </label>
                  <select
                    required
                    value={formData.timeframeType}
                    onChange={(e) => setFormData({ ...formData, timeframeType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {TIMEFRAME_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Action Metric Goal *
                  </label>
                  <select
                    required
                    value={formData.metricType}
                    onChange={(e) => setFormData({ ...formData, metricType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {METRIC_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Offer Type Selector */}
              {isOfferRelatedMetric && (
                <div className="space-y-1.5 p-4 bg-amber-50/40 border border-amber-200/60 rounded-2xl">
                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag size={13} /> Target Offer Type Constraint
                  </label>
                  <select
                    value={formData.offerTypeConstraint}
                    onChange={(e) => setFormData({ ...formData, offerTypeConstraint: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    {OFFER_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-600/80 font-medium">
                    Restrict quest evaluation strictly to Banner or Calendar offers.
                  </p>
                </div>
              )}

              {/* Target Value Count */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Target Milestone Requirement *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder="e.g. 3 for a 3-day streak or 5 products"
                />
              </div>

              {/* Bachat Coins Reward Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Coins size={14} /> Reward Bachat Coins *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    value={formData.rewardCoins}
                    onChange={(e) => setFormData({ ...formData, rewardCoins: e.target.value })}
                    placeholder="e.g. 100"
                  />
                  <p className="text-[10px] text-amber-600/80 font-medium">
                    Direct coin payout upon completion in the active timeframe.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">
                    Coin Expiry (Days) Override
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    value={formData.validityDaysOverride}
                    onChange={(e) => setFormData({ ...formData, validityDaysOverride: e.target.value })}
                    placeholder="Default Global Setting (e.g. 15)"
                  />
                  <p className="text-[10px] text-amber-600/80 font-medium">
                    Leave blank to use default global promotional coin settings.
                  </p>
                </div>
              </div>

              {/* Custom Timeframe Date Range */}
              {formData.timeframeType === "CUSTOM" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/40 rounded-2xl border border-blue-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                      Active Start Date
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                      Active End Date
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Quest Description
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly explain what merchants need to do before the timer resets..."
                />
              </div>

              <button
                disabled={loading}
                className="w-full h-13 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all cursor-pointer mt-4 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Time-Bound Quest
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* =========================================================
            PRIMARY DIRECTORY VIEW (STRICT LIST TABLE)
            ========================================================= */
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
                <Clock className="text-amber-500 w-7 h-7 sm:w-8 sm:h-8" /> Time-Bound Bachat Coin Quests
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                Configure daily, weekly, or custom quests that reward Bachat Coins independently without affecting league points
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchQuests}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Quests"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 shadow-md transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={18} strokeWidth={2.5} /> Create New Quest
              </button>
            </div>
          </div>

          {/* Toolbar & Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="relative group w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quests by title or metric..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Timeframes</option>
                <option value="DAILY">Daily Quests</option>
                <option value="WEEKLY">Weekly Quests</option>
                <option value="MONTHLY">Monthly Quests</option>
                <option value="CUSTOM">Custom Date Quests</option>
              </select>
            </div>
          </div>

          {/* Table List Ledger */}
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Quest Title</th>
                    <th className="px-6 py-4">Timeframe Cycle</th>
                    <th className="px-6 py-4">Target Requirement</th>
                    <th className="px-6 py-4">Coin Reward</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-24 text-center">
                        <Loader2 className="animate-spin text-amber-500 inline-block mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Streaming Active Quests...
                        </p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                      >
                        No quests configured for selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((quest) => (
                      <tr 
                        key={quest._id} 
                        onClick={() => setInspectingQuest(quest)}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 max-w-sm">
                          <div className="font-extrabold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">
                            {quest.title}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {quest.description || "No description provided."}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
                            <Clock size={12} /> {quest.timeframeType}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                                {quest.targetValue}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                {quest.metricType?.replace(/_/g, " ")}
                              </span>
                            </div>
                            {quest.offerTypeConstraint && quest.offerTypeConstraint !== "ALL" && (
                              <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md w-fit border border-amber-200/60">
                                Type: {quest.offerTypeConstraint}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/60 w-fit">
                            <Coins size={14} />
                            +{quest.rewardCoins}
                            {quest.validityDaysOverride && (
                              <span className="text-[9px] text-amber-500 font-sans font-normal">
                                ({quest.validityDaysOverride}d validity)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(quest);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                            title="Edit Quest"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(quest._id, quest.title);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Deactivate Quest"
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

      {/* =========================================================
          POPUP MODAL: DETAILED QUEST INSPECTION
          ========================================================= */}
      {inspectingQuest && (
        <QuestDetailsModal
          quest={inspectingQuest}
          onClose={() => setInspectingQuest(null)}
          onEdit={() => openEditForm(inspectingQuest)}
          onDelete={() => handleDelete(inspectingQuest._id, inspectingQuest.title)}
        />
      )}
    </>
  );
};

// =========================================================
// SUB-COMPONENT: QUEST DETAILS INSPECTION POPUP MODAL
// =========================================================
const QuestDetailsModal = ({ quest, onClose, onEdit, onDelete }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col justify-between animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Clock size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Quest Inspection Dossier</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {quest._id}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-slate-800 text-xs">
          
          {/* Main Title & Timeframe */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
                <Clock size={12} /> {quest.timeframeType} Cycle
              </span>
              {quest.offerTypeConstraint && quest.offerTypeConstraint !== "ALL" && (
                <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                  Target: {quest.offerTypeConstraint}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
              {quest.title}
            </h2>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Instructions & Rules</span>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed font-medium">
              {quest.description || "No specific promotional guidelines or helper instructions recorded."}
            </div>
          </div>

          {/* Metric & Target Specs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Goal Target</span>
              <p className="text-base font-black font-mono text-slate-900">{quest.targetValue} Units</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Metric Evaluated</span>
              <p className="text-xs font-bold text-slate-700 uppercase">{quest.metricType?.replace(/_/g, " ")}</p>
            </div>
          </div>

          {/* Bachat Coins Reward Card */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1">
              <Coins size={13} /> Direct Bachat Coin Payout
            </span>
            <div className="flex items-baseline justify-between pt-0.5">
              <p className="text-xl font-black font-mono text-amber-700">+{quest.rewardCoins} Coins</p>
              <span className="text-[10px] font-bold text-amber-700">
                {quest.validityDaysOverride ? `${quest.validityDaysOverride} Days Validity` : "Default Global Validity"}
              </span>
            </div>
          </div>

          {/* Custom Date Window (if applicable) */}
          {quest.timeframeType === "CUSTOM" && (quest.startDate || quest.endDate) && (
            <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Custom Active Window
              </span>
              <p className="text-xs font-semibold text-slate-700">
                {quest.startDate ? new Date(quest.startDate).toLocaleDateString() : "Immediate"} - {quest.endDate ? new Date(quest.endDate).toLocaleDateString() : "Ongoing"}
              </p>
            </div>
          )}

          {/* Timestamps & Database Identifiers */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-1">
            <span>Created: {quest.createdAt ? new Date(quest.createdAt).toLocaleDateString() : "System Standard"}</span>
            <span className="font-mono">ID: {quest._id}</span>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 size={13} /> Deactivate
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 size={13} /> Edit Quest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuestManagement;