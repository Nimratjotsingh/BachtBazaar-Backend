import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Plus, X, Search, Layers, Inbox, Loader2, ChevronLeft, 
  ChevronRight, MessageSquare, Tag, Info, ToggleLeft, ToggleRight, Edit2, Trash2
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminQuickTemplatesDashboard = ({ token }) => {
  // Navigation & Core States
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtering & Pagination Grid Control States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'disabled'

  // Form Management Modal Overlay States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ title: "", messageContent: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Memoize validation headers payload
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Synchronous Core Fetch Pipeline
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const activeOnlyParam = statusFilter === "active" ? "true" : statusFilter === "disabled" ? "false" : undefined;
      
      const response = await accountClient.get("/quick-offer-routes", {
        params: { 
          page, 
          limit: 10,
          search: searchTerm.trim() || undefined,
          activeOnly: activeOnlyParam
        },
        headers
      });

      // Match the BachatBazarr paginated payload layouts
      setTemplates(response.data.data || response.data.templates || []);
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      console.error("BachatBazarr Quick Template Fetch Exception:", err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm, headers]);

  // Sync execution triggers: reset page index on structural parameter change shifts
  useEffect(() => {
    setPage(1);
    fetchData();
  }, [statusFilter]); // Re-fetches instantly whenever dropdown selection mutates

  useEffect(() => {
    fetchData();
  }, [page]);

  // Handles text search form submission executions cleanly
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // Open Modal logic for clean Create or Update contexts
  const handleOpenModal = (template = null) => {
    setFormError("");
    if (template) {
      setEditingTemplate(template);
      setFormData({ title: template.title, messageContent: template.messageContent });
    } else {
      setEditingTemplate(null);
      setFormData({ title: "", messageContent: "" });
    }
    setIsModalOpen(true);
  };

  // Process Add / Edit Operations Pipeline
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.messageContent.trim()) {
      setFormError("All text definition entry fields are required.");
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingTemplate) {
        // Enforces structural lookups on your backend PUT route
        await accountClient.put(`/quick-offer-routes/${editingTemplate._id}`, formData, { headers });
      } else {
        // Hits your create endpoint passing raw payload parameters
        await accountClient.post("/quick-offer-routes", formData, { headers });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Internal data sync submission failure.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Activation State (Status Engine Switch)
  const handleStatusToggle = async (id, currentStatus) => {
    try {
      await accountClient.put(`/quick-offer-routes/${id}`, { 
        isActive: !currentStatus 
      }, { headers });
      
      fetchData(); // Dynamically re-renders matching configuration grid row
    } catch (err) {
      alert(err.response?.data?.message || "Internal state modification processing failure.");
    }
  };

  // Hard Wipe Entry Block
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to completely delete this preset template index?")) return;
    try {
      await accountClient.delete(`/quick-offer-routes/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to clear the specific resource record.");
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 antialiased">
      
      {/* Upper Brand Info Layout Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-solid border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="text-blue-600" size={32} /> Presets & Bidding Templates
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Configure preset quick offer snippets for merchants processing client requests</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 rounded-xl shadow-sm transition text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} /> Create Presets
        </button>
      </div>

      {/* Interactive Search Matrix Filters Container */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-solid border-slate-200/60">
        <div className="relative md:col-span-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search responses by title or context text string parameters..." 
            className="w-full pl-11 pr-4 h-12 bg-white border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative md:col-span-4 bg-white border border-solid border-slate-200 rounded-xl px-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <Info size={16} className="text-slate-400" />
          <select 
            className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none h-full cursor-pointer py-3"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Deployment Profiles</option>
            <option value="active">Active System Presets</option>
            <option value="disabled">Deactivated Presets Only</option>
          </select>
        </div>
        <button type="submit" className="md:col-span-2 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer">
          Filter View
        </button>
      </form>

      {/* Primary Component Data Ledger Grid Table */}
      <div className="bg-white rounded-2xl border border-solid border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-solid border-slate-100 text-slate-400">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest w-[25%]">Template Identifier</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest w-[45%]">Canned Message Context</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest w-[15%]">Deployment Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-right w-[15%]">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solid divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500" size={36} />
                    <p className="text-xs font-bold text-slate-400 mt-3 tracking-wider uppercase">Loading preset indexes...</p>
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-24 text-center">
                    <Inbox className="mx-auto mb-3 text-slate-300" size={44} /> 
                    <p className="text-sm font-bold text-slate-400">No preset data models matched current lookup criteria.</p>
                  </td>
                </tr>
              ) : templates.map((template) => (
                <tr key={template._id} className={`hover:bg-slate-50/40 transition-colors ${!template.isActive && "bg-slate-50/20"}`}>
                  
                  {/* Template Title Particulars mapping */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-solid border-slate-200/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <MessageSquare size={16} className="text-blue-500" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm tracking-tight">{template.title}</div>
                        <div className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-slate-100 text-slate-400 px-1 py-0.2 rounded uppercase">
                          <Tag size={8} /> RFQ PRESET
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Message Context Block */}
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 max-w-sm truncate">
                    "{template.messageContent}"
                  </td>

                  {/* Operational Status Toggles */}
                  <td className="px-6 py-4">
                    {template.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-solid border-emerald-200/50 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-solid border-slate-200 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Disabled
                      </span>
                    )}
                  </td>

                  {/* Action Engine Buttons Control Bar */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStatusToggle(template._id, template.isActive)}
                        className={`w-9 h-9 flex items-center justify-center border border-solid border-slate-200 rounded-xl transition-all bg-white cursor-pointer shadow-sm ${
                          template.isActive ? "text-green-600 hover:bg-green-50 hover:border-green-400" : "text-slate-400 hover:bg-slate-50"
                        }`}
                        title={template.isActive ? "Disable Snippet" : "Deploy Snippet"}
                      >
                        {template.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => handleOpenModal(template)}
                        className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-900 border border-solid border-slate-200 hover:border-slate-900 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                        title="Edit Definition Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template._id)}
                        className="w-9 h-9 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 border border-solid border-slate-200 hover:border-red-500 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                        title="Purge Template Entity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid Controller Pagination Footers */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-solid border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-sm cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-solid border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-sm cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* CREATE & EDIT MODAL STRUCTURE (MATCHES PRODUCT OVERLAY LOOK) */}
      {isModalOpen && (
        <div className="fixed inset-0 mountaineer z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-solid border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-blue-600">
                <MessageSquare size={22} />
                <h3 className="text-lg font-black tracking-tight">
                  {editingTemplate ? "Edit Template Blueprint" : "Build Preset Field"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 font-medium -mt-2">
              Add descriptive shortcuts so merchants can generate replies immediately without manual fields entry blocks.
            </p>

            {formError && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider p-3 rounded-xl border border-solid border-red-200">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Template Title Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g., Free Area Delivery, Bulk Multi-pack Sale"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-sm px-4 py-2.5 bg-slate-50/50 border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Preset Text Content Definition
                </label>
                <textarea
                  rows="4"
                  maxLength={300}
                  placeholder="Type the response phrase merchants can click to embed..."
                  value={formData.messageContent}
                  onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                  className="w-full text-sm px-4 py-3 bg-slate-50/50 border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-slate-700 transition-all"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] font-bold font-mono text-slate-300">{formData.messageContent.length}/300 Characters Max</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer border border-solid border-slate-200/40 uppercase tracking-wider"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title.trim() || !formData.messageContent.trim()}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuickTemplatesDashboard;