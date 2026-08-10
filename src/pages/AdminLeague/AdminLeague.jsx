import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Edit3, Trash2, Search, Save, Loader2, ArrowLeft, Check, X,
  Trophy, RefreshCw, Image as ImageIcon, Shield, Award, Sparkles, Layers, Coins
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const CYCLE_TYPES = [
  { value: "monthly", label: "Monthly Reset" },
  { value: "quarterly", label: "Quarterly Reset" },
  { value: "yearly", label: "Yearly Reset" },
  { value: "all_time", label: "All-Time Accumulation" },
  { value: "custom", label: "Custom Date Range" },
];

const AdminLeagueManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  // Perks Tag Management Input
  const [perkInput, setPerkInput] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    tierRank: 1,
    minPointsRequired: 0,
    rewardCoins: 0,
    validityDaysOverride: "",
    themeColor: "#3B82F6",
    description: "",
    cycleType: "monthly",
    startDate: "",
    endDate: "",
    perks: [],
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/league/admin/leagues", { headers });
      setLeagues(res.data.data || []);
    } catch (err) {
      console.error("Error fetching leagues:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddPerk = (e) => {
    e.preventDefault();
    if (!perkInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      perks: [...prev.perks, perkInput.trim()],
    }));
    setPerkInput("");
  };

  const handleRemovePerk = (index) => {
    setFormData((prev) => ({
      ...prev,
      perks: prev.perks.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const multipartBody = new FormData();
      multipartBody.append("name", formData.name.trim());
      multipartBody.append("tierRank", Number(formData.tierRank));
      multipartBody.append("minPointsRequired", Number(formData.minPointsRequired));
      multipartBody.append("rewardCoins", Number(formData.rewardCoins));
      
      if (formData.validityDaysOverride) {
        multipartBody.append("validityDaysOverride", Number(formData.validityDaysOverride));
      }
      
      multipartBody.append("themeColor", formData.themeColor);
      multipartBody.append("description", formData.description.trim());
      multipartBody.append("cycleType", formData.cycleType);
      
      if (formData.startDate) multipartBody.append("startDate", formData.startDate);
      if (formData.endDate) multipartBody.append("endDate", formData.endDate);
      if (formData.perks.length > 0) multipartBody.append("perks", formData.perks.join(","));

      if (selectedFile) {
        multipartBody.append("badgeIcon", selectedFile);
      }

      const requestHeaders = {
        ...headers,
        "Content-Type": "multipart/form-data",
      };

      if (selectedLeague?._id) {
        await accountClient.put(`/league/admin/leagues/${selectedLeague._id}`, multipartBody, {
          headers: requestHeaders,
        });
      } else {
        await accountClient.post("/league/admin/leagues", multipartBody, {
          headers: requestHeaders,
        });
      }

      await fetchLeagues();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this league tier?")) return;
    try {
      await accountClient.delete(`/league/admin/leagues/${id}`, { headers });
      fetchLeagues();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      tierRank: leagues.length + 1,
      minPointsRequired: 0,
      rewardCoins: 0,
      validityDaysOverride: "",
      themeColor: "#3B82F6",
      description: "",
      cycleType: "monthly",
      startDate: "",
      endDate: "",
      perks: [],
    });
    setSelectedLeague(null);
    setSelectedFile(null);
    setImagePreview("");
    setPerkInput("");
  };

  const filteredData = leagues.filter(
    (league) =>
      league.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      league.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Leagues Index
        </button>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200/70 shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
            <Trophy size={20} className="text-blue-600" />
            {selectedLeague ? "Modify League Tier" : "Create New League Tier"}
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            {/* League Name & Tier Rank */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  League Tier Name *
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Silver, Gold, Platinum"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Tier Rank Hierarchy Order *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  value={formData.tierRank}
                  onChange={(e) => setFormData({ ...formData, tierRank: e.target.value })}
                  placeholder="1 = Lowest, 2 = Next level..."
                />
              </div>
            </div>

            {/* Points Required & Theme Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Minimum Unlock Points *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  value={formData.minPointsRequired}
                  onChange={(e) => setFormData({ ...formData, minPointsRequired: e.target.value })}
                  placeholder="e.g. 500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  UI Badge Accent Theme Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-12 h-11 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer p-1"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  />
                </div>
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
                  placeholder="e.g. 250"
                />
                <p className="text-[10px] text-amber-600/80 font-medium">
                  Coins rewarded upon reaching or unlocking this league.
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
                  placeholder="Default Global Setting (e.g. 60)"
                />
                <p className="text-[10px] text-amber-600/80 font-medium">
                  Leave blank to use global admin coin validity settings.
                </p>
              </div>
            </div>

            {/* Badge Icon Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                League Badge Graphic Icon
              </label>
              <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div
                  className="w-16 h-16 rounded-2xl border flex items-center justify-center overflow-hidden shadow-inner shrink-0"
                  style={{ backgroundColor: formData.themeColor + "15", borderColor: formData.themeColor + "40" }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Badge Preview" />
                  ) : (
                    <Trophy style={{ color: formData.themeColor }} size={26} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-200 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition shadow-sm cursor-pointer"
                  >
                    Upload Badge Icon File
                  </button>
                  <p className="text-[10px] text-slate-400 font-medium">
                    PNG format carrying high-res transparent background recommended.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Cycle Type & Dates */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Points Reset Timeframe Cycle
              </label>
              <select
                value={formData.cycleType}
                onChange={(e) => setFormData({ ...formData, cycleType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {CYCLE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.cycleType === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Custom Window Start Date
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
                    Custom Window End Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                League Tier Description
              </label>
              <textarea
                rows="3"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-600 resize-none leading-relaxed"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe prerequisites or requirements needed to reach this status level..."
              />
            </div>

            {/* Perks Builder */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Merchant Privileges & Perks
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Priority Support, Featured Store Placement..."
                  value={perkInput}
                  onChange={(e) => setPerkInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddPerk}
                  className="px-4 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition"
                >
                  Add Perk
                </button>
              </div>

              {formData.perks.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.perks.map((perk, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-semibold"
                    >
                      <Sparkles size={12} /> {perk}
                      <button
                        type="button"
                        onClick={() => handleRemovePerk(index)}
                        className="text-blue-400 hover:text-blue-900 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />} Save League Tier
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
            <Trophy className="text-blue-600 w-8 h-8" /> Merchant Gamification Leagues
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure competitive tier ranks, point thresholds, Bachat Coins rewards, and badge graphics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeagues}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm hover:bg-slate-50 cursor-pointer"
            title="Refresh Leagues List"
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
            <Plus size={18} strokeWidth={2.5} /> Create League Tier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm max-w-md">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leagues by tier name..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Leagues Table */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Hierarchy Rank</th>
                <th className="px-6 py-4">League Tier & Badge</th>
                <th className="px-6 py-4">Points Requirement</th>
                <th className="px-6 py-4">Coin Reward</th>
                <th className="px-6 py-4">Cycle Timeframe</th>
                <th className="px-6 py-4">Merchant Perks</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-24 text-center">
                    <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Streaming League Hierarchy...
                    </p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider"
                  >
                    No league tiers configured in system database.
                  </td>
                </tr>
              ) : (
                filteredData.map((league) => (
                  <tr key={league._id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4 font-mono font-black text-slate-400">
                      Tier #{league.tierRank}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden shadow-inner shrink-0"
                          style={{
                            backgroundColor: (league.themeColor || "#3B82F6") + "15",
                            borderColor: (league.themeColor || "#3B82F6") + "40",
                          }}
                        >
                          {league.badgeIcon ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL || ""}${league.badgeIcon}`}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          ) : (
                            <Trophy style={{ color: league.themeColor || "#3B82F6" }} size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{league.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {league.description || "No description specified."}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200/60">
                        {league.minPointsRequired} pts
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/60 w-fit">
                        <Coins size={14} />
                        {league.rewardCoins || 0}
                        {league.validityDaysOverride && (
                          <span className="text-[9px] text-amber-500 font-sans font-normal">
                            ({league.validityDaysOverride}d)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize font-bold text-[10px] px-2.5 py-1 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        {league.cycleType?.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      {league.perks?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {league.perks.map((perk, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                            >
                              {perk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-[10px]">None</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => {
                          setSelectedLeague(league);
                          setImagePreview(
                            league.badgeIcon
                              ? `${import.meta.env.VITE_API_URL || ""}${league.badgeIcon}`
                              : ""
                          );
                          setSelectedFile(null);
                          setFormData({
                            name: league.name,
                            tierRank: league.tierRank,
                            minPointsRequired: league.minPointsRequired,
                            rewardCoins: league.rewardCoins || 0,
                            validityDaysOverride: league.validityDaysOverride || "",
                            themeColor: league.themeColor || "#3B82F6",
                            description: league.description || "",
                            cycleType: league.cycleType || "monthly",
                            startDate: league.startDate ? league.startDate.split("T")[0] : "",
                            endDate: league.endDate ? league.endDate.split("T")[0] : "",
                            perks: league.perks || [],
                          });
                          setView("form");
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                        title="Edit League Tier"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(league._id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="Deactivate League"
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

export default AdminLeagueManagement;