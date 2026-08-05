import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  CheckSquare, RefreshCw, Trophy, Target, Award, Layers, Sparkles, Filter
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const METRIC_TYPES = [
  { value: "PRODUCTS_CREATED", label: "Products Created Target" },
  { value: "SERVICES_CREATED", label: "Services Created Target" },
  { value: "OFFERS_CREATED", label: "Offers Created Target" },
  { value: "CLAIMS_HANDLED", label: "Claims Handled Target" },
  { value: "REDEMPTIONS_COMPLETED", label: "Redemptions Completed Target" },
  { value: "STORE_VIEWS", label: "Store Views Target" },
];

const AdminTaskManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [tasks, setTasks] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    leagueId: "",
    metricType: "PRODUCTS_CREATED",
    targetValue: 5,
    pointsReward: 100,
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
      
      // Default initial form league selection
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
        targetValue: Number(formData.targetValue),
        pointsReward: Number(formData.pointsReward),
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this task?")) return;
    try {
      await accountClient.delete(`/league/admin/tasks/${id}`, { headers });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      leagueId: leagues.length > 0 ? leagues[0]._id : "",
      metricType: "PRODUCTS_CREATED",
      targetValue: 5,
      pointsReward: 100,
      startDate: "",
      endDate: "",
    });
    setSelectedTask(null);
  };

  const filteredData = tasks.filter(
    (task) =>
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.metricType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === "form")
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-700 antialiased font-sans">
        <button
          onClick={() => {
            setView("list");
            resetForm();
          }}
          className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 text-sm transition cursor-pointer"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Tasks Index
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
            <CheckSquare size={20} className="text-blue-600" />
            {selectedTask ? "Modify Task Parameters" : "Create Milestone Task"}
          </h2>

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
                placeholder="e.g. Create 10 Products, Complete 5 Offer Redemptions"
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
                  placeholder="e.g. 10"
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
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save Milestone Task
            </button>
          </form>
        </div>
      </div>
    );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <CheckSquare className="text-blue-600 w-8 h-8" /> League Tasks & Milestones
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure merchant goals, metric targets, and points rewards for each league level
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Tasks"
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
            <Plus size={18} strokeWidth={2.5} /> Add New Task
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative group w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tasks by title or metric..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400" />
          <select
            value={selectedLeagueFilter}
            onChange={(e) => setSelectedLeagueFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
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

      {/* Table */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Task Milestone Title</th>
                <th className="px-6 py-4">Assigned League</th>
                <th className="px-6 py-4">Target Metric Goal</th>
                <th className="px-6 py-4">Points Reward</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Streaming Tasks Directory...
                    </p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                  >
                    No milestone tasks found for selected filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4 max-w-sm">
                      <div className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                          {task.targetValue}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {task.metricType?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-black text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                        +{task.pointsReward} pts
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setFormData({
                            title: task.title,
                            description: task.description || "",
                            leagueId: task.leagueId?._id || task.leagueId || "",
                            metricType: task.metricType,
                            targetValue: task.targetValue,
                            pointsReward: task.pointsReward,
                            startDate: task.startDate ? task.startDate.split("T")[0] : "",
                            endDate: task.endDate ? task.endDate.split("T")[0] : "",
                          });
                          setView("form");
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(task._id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="Deactivate Task"
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

export default AdminTaskManagement;