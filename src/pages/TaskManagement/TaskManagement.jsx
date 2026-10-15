import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  CheckSquare, RefreshCw, Trophy, Target, Award, Layers, Sparkles, Filter, 
  Coins, Tag, Eye, Calendar, Hash, Clock, AlertCircle, Info, ExternalLink
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

const OFFER_TYPES = [
  { value: "ALL", label: "All Offer Types" },
  { value: "BANNER", label: "Banner Offers Only" },
  { value: "CALENDAR", label: "Calendar Offers Only" },
];

const AdminTaskManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [tasks, setTasks] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedTask, setSelectedTask] = useState(null);
  const [inspectingTask, setInspectingTask] = useState(null); // Popup state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    leagueId: "",
    metricType: "PRODUCTS_CREATED",
    offerTypeConstraint: "ALL",
    targetValue: 5,
    pointsReward: 100,
    rewardCoins: 0,
    validityDaysOverride: "",
    startDate: "",
    endDate: "",
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchLeagues();
    fetchTasks();
  }, [selectedLeagueFilter]);

  const fetchLeagues = async () => {
    try {
      const res = await accountClient.get("/league/admin/leagues", { headers });
      const fetchedLeagues = res.data.data || [];
      setLeagues(fetchedLeagues);
      
      if (fetchedLeagues.length > 0 && !formData.leagueId) {
        setFormData((prev) => ({ ...prev, leagueId: fetchedLeagues[0]._id }));
      }
    } catch (err) {
      console.error("Error fetching leagues:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedLeagueFilter !== "all") {
        params.append("leagueId", selectedLeagueFilter);
      }

      const res = await accountClient.get(`/league/admin/tasks?${params.toString()}`, { headers });
      setTasks(res.data.data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
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
        leagueId: formData.leagueId,
        metricType: formData.metricType,
        offerTypeConstraint: formData.offerTypeConstraint,
        targetValue: Number(formData.targetValue),
        pointsReward: Number(formData.pointsReward),
        rewardCoins: Number(formData.rewardCoins || 0),
        validityDaysOverride: formData.validityDaysOverride ? Number(formData.validityDaysOverride) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      if (selectedTask?._id) {
        await accountClient.put(`/league/admin/tasks/${selectedTask._id}`, payload, { headers });
      } else {
        await accountClient.post("/league/admin/tasks", payload, { headers });
      }

      await fetchTasks();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to deactivate task "${title || 'selected'}"?`)) return;
    try {
      await accountClient.delete(`/league/admin/tasks/${id}`, { headers });
      if (inspectingTask?._id === id) {
        setInspectingTask(null);
      }
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const openEditForm = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      leagueId: task.leagueId?._id || task.leagueId || "",
      metricType: task.metricType,
      offerTypeConstraint: task.offerTypeConstraint || "ALL",
      targetValue: task.targetValue,
      pointsReward: task.pointsReward,
      rewardCoins: task.rewardCoins || 0,
      validityDaysOverride: task.validityDaysOverride || "",
      startDate: task.startDate ? task.startDate.split("T")[0] : "",
      endDate: task.endDate ? task.endDate.split("T")[0] : "",
    });
    setInspectingTask(null);
    setView("form");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      leagueId: leagues.length > 0 ? leagues[0]._id : "",
      metricType: "PRODUCTS_CREATED",
      offerTypeConstraint: "ALL",
      targetValue: 5,
      pointsReward: 100,
      rewardCoins: 0,
      validityDaysOverride: "",
      startDate: "",
      endDate: "",
    });
    setSelectedTask(null);
  };

  const filteredData = tasks.filter(
    (task) =>
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.metricType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.leagueId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOfferRelatedMetric =
    formData.metricType === "OFFERS_CREATED" || formData.metricType === "REDEMPTIONS_COMPLETED";

  return (
    <>
      {/* =========================================================
          SUB-VIEW: FORM CREATE / EDIT VIEW
          ========================================================= */}
      {view === "form" ? (
        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 text-slate-700 antialiased font-sans">
          <button
            onClick={() => {
              setView("list");
              resetForm();
            }}
            className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Return to Tasks Index
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
                <CheckSquare size={20} className="text-blue-600" />
                {selectedTask ? "Modify Task Parameters" : "Create Milestone Task"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Configure goal criteria, points yields, and coin rewards.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Task Milestone Title *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Log in 7 Days in a Row, Create 10 Products"
                />
              </div>

              {/* Target League & Metric Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Assigned League Tier *
                  </label>
                  <select
                    required
                    value={formData.leagueId}
                    onChange={(e) => setFormData({ ...formData, leagueId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {leagues.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name} (Tier #{l.tierRank})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Action Metric Type *
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
                <div className="space-y-1.5 p-4 bg-blue-50/50 border border-blue-200/60 rounded-2xl">
                  <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag size={13} /> Target Offer Type Constraint
                  </label>
                  <select
                    value={formData.offerTypeConstraint}
                    onChange={(e) => setFormData({ ...formData, offerTypeConstraint: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {OFFER_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-600/80 font-medium">
                    Restrict task evaluation strictly to Banner or Calendar offers.
                  </p>
                </div>
              )}

              {/* Target Milestone Count & Points Reward */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Target Goal Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder="e.g. 7 for streak, 10 for products"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Points Awarded *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    value={formData.pointsReward}
                    onChange={(e) => setFormData({ ...formData, pointsReward: e.target.value })}
                    placeholder="e.g. 150"
                  />
                </div>
              </div>

              {/* Bachat Coins Reward & Validity Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Coins size={14} /> Reward Bachat Coins
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    value={formData.rewardCoins}
                    onChange={(e) => setFormData({ ...formData, rewardCoins: e.target.value })}
                    placeholder="e.g. 50"
                  />
                  <p className="text-[10px] text-amber-600/80 font-medium">
                    Coins credited to merchant wallet upon completing task.
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
                    placeholder="Default Global Setting (e.g. 30)"
                  />
                  <p className="text-[10px] text-amber-600/80 font-medium">
                    Leave blank to use global admin coin validity setting.
                  </p>
                </div>
              </div>

              {/* Optional Date Window */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Active Window Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Active Window End Date (Optional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Task Description / Helper Instructions
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Give merchants context on how completing this task helps them progress in the league..."
                />
              </div>

              <button
                disabled={loading}
                className="w-full h-13 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Milestone Task
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
                <CheckSquare className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" /> League Tasks & Milestones
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                Configure merchant goals, metric targets, points rewards, and Bachat Coins for each league level
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchTasks}
                className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer shrink-0"
                title="Refresh Tasks"
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
                <Plus size={18} strokeWidth={2.5} /> Add New Task
              </button>
            </div>
          </div>

          {/* Toolbar & Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="relative group w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks by title or metric..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedLeagueFilter}
                onChange={(e) => setSelectedLeagueFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All League Tiers</option>
                {leagues.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} Tier
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table List Ledger */}
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Task Milestone Title</th>
                    <th className="px-6 py-4">Assigned League</th>
                    <th className="px-6 py-4">Target Metric Goal</th>
                    <th className="px-6 py-4">Points Reward</th>
                    <th className="px-6 py-4">Coin Reward</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center">
                        <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Streaming Tasks Directory...
                        </p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                      >
                        No milestone tasks found for selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((task) => (
                      <tr 
                        key={task._id} 
                        onClick={() => setInspectingTask(task)}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 max-w-sm">
                          <div className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {task.description || "No description provided."}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.leagueId ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                              <Trophy size={12} /> {task.leagueId.name}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                                {task.targetValue}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                {task.metricType?.replace(/_/g, " ")}
                              </span>
                            </div>
                            {task.offerTypeConstraint && task.offerTypeConstraint !== "ALL" && (
                              <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md w-fit border border-blue-100">
                                Type: {task.offerTypeConstraint}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-black text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                            +{task.pointsReward} pts
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/60 w-fit">
                            <Coins size={14} />
                            {task.rewardCoins || 0}
                            {task.validityDaysOverride && (
                              <span className="text-[9px] text-amber-500 font-sans font-normal">
                                ({task.validityDaysOverride}d)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(task);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(task._id, task.title);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Deactivate Task"
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
          POPUP MODAL: DETAILED TASK INSPECTION
          ========================================================= */}
      {inspectingTask && (
        <TaskDetailsModal
          task={inspectingTask}
          onClose={() => setInspectingTask(null)}
          onEdit={() => openEditForm(inspectingTask)}
          onDelete={() => handleDelete(inspectingTask._id, inspectingTask.title)}
        />
      )}
    </>
  );
};

// =========================================================
// SUB-COMPONENT: TASK DETAILS INSPECTION POPUP MODAL
// =========================================================
const TaskDetailsModal = ({ task, onClose, onEdit, onDelete }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col justify-between animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <CheckSquare size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Task Milestone Audit</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {task._id}</p>
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
          
          {/* Main Title & Assigned League */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {task.leagueId?.name ? (
                <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <Trophy size={12} /> {task.leagueId.name} Tier
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 italic">Unassigned League</span>
              )}
              {task.offerTypeConstraint && task.offerTypeConstraint !== "ALL" && (
                <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">
                  Target: {task.offerTypeConstraint}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
              {task.title}
            </h2>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Description & Instructions</span>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed font-medium">
              {task.description || "No detailed instructions recorded for this milestone task."}
            </div>
          </div>

          {/* Metric & Target Specs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Goal Target</span>
              <p className="text-base font-black font-mono text-slate-900">{task.targetValue} Units</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Metric Evaluated</span>
              <p className="text-xs font-bold text-slate-700 uppercase">{task.metricType?.replace(/_/g, " ")}</p>
            </div>
          </div>

          {/* Points & Coins Rewards */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                <Sparkles size={12} /> Points Yield
              </span>
              <p className="text-base font-black font-mono text-emerald-700">+{task.pointsReward} pts</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1">
                <Coins size={12} /> Bachat Coins
              </span>
              <p className="text-base font-black font-mono text-amber-700">
                {task.rewardCoins || 0} Coins
                {task.validityDaysOverride && (
                  <span className="text-[9px] font-sans font-normal text-amber-600 ml-1">
                    ({task.validityDaysOverride}d validity)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Active Date Window */}
          {(task.startDate || task.endDate) && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Active Time Window
              </span>
              <p className="text-xs font-semibold text-slate-700">
                {task.startDate ? new Date(task.startDate).toLocaleDateString() : "Immediate"} - {task.endDate ? new Date(task.endDate).toLocaleDateString() : "Ongoing"}
              </p>
            </div>
          )}

          {/* Database Creation Timestamps */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-1">
            <span>Created: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "System Standard"}</span>
            <span className="font-mono">ID: {task._id}</span>
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 size={13} /> Edit Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTaskManagement;