import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Save, Loader2, ArrowLeft, 
  Layers, Search, Check, X, Tag
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api"; // Your Axios instance setup

const AdminOfferTypeManagement = ({ token }) => {
  const [offerTypes, setOfferTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    label: "",
    value: "",
    description: "",
    isActive: true
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchOfferTypes();
  }, []);

  const fetchOfferTypes = async () => {
    try {
      setLoading(true);
      // Calls the dedicated Admin endpoint to get only this Admin's types
      const res = await accountClient.get("/offer-types/admin", { headers });
      setOfferTypes(res.data.data || []);
    } catch (err) {
      console.error("Error fetching offer types:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedType?._id) {
        // Update existing Admin offer type
        await accountClient.put(`/offer-types/admin/${selectedType._id}`, formData, { headers });
      } else {
        // Create new Admin offer type template
        await accountClient.post("/offer-types/admin", formData, { headers });
      }
      fetchOfferTypes();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this offer type template?")) return;
    try {
      await accountClient.delete(`/offer-types/admin/${id}`, { headers });
      fetchOfferTypes();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({ label: "", value: "", description: "", isActive: true });
    setSelectedType(null);
  };

  // Filter local state list by search term
  const filteredData = offerTypes.filter(type => 
    type.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === "form") return (
    <div className="max-w-2xl mx-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => { setView("list"); resetForm(); }} 
        className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition"
      >
        <ArrowLeft size={18} /> Back to Templates
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-blue-100 shadow-2xl space-y-6">
        <h2 className="text-2xl font-bold text-blue-950">
          {selectedType ? "Modify Global Offer Type" : "Create Global Offer Template"}
        </h2>
        <p className="text-sm text-slate-400 -mt-4">
          Templates created here will be visible read-only to merchants to build campaigns.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Display Label</label>
              <input 
                required 
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.label} 
                onChange={(e) => setFormData({ ...formData, label: e.target.value })} 
                placeholder="e.g., Flat Discount" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">System Value (Slug)</label>
              <input 
                required 
                disabled={!!selectedType} // Block value editing on updates to protect schema match rules
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" 
                value={formData.value} 
                onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
                placeholder="e.g., flat_discount" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Description</label>
            <textarea 
              rows="3" 
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Provide context regarding how this template handles parameters..."
            />
          </div>

          <div className="flex items-center gap-3 p-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${formData.isActive ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
            <span className="text-sm font-bold text-blue-900">Available to Merchants</span>
          </div>

          <button 
            disabled={loading} 
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Offer Type
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2">
            <Layers className="text-blue-500" /> Offer Type Templates
          </h1>
          <p className="text-blue-500">System templates available for global merchant distribution</p>
        </div>
        <button 
          onClick={() => setView("form")} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all"
        >
          <Plus size={20} /> Add New Template
        </button>
      </div>

      {/* Filter Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={18} />
          <input 
            type="text" 
            placeholder="Search templates by key label or value tag..." 
            className="w-full pl-10 pr-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Content Container */}
      <div className="bg-white rounded-[24px] border border-blue-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-50/50 border-b border-blue-100">
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">Offer Label Name</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">System Key Value</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {loading ? (
              <tr>
                <td colSpan="4" className="py-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-20 text-center text-blue-400 font-bold">
                  No custom configurations built yet.
                </td>
              </tr>
            ) : filteredData.map((type) => (
              <tr key={type._id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                      <Tag size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-blue-950">{type.label}</div>
                      <div className="text-xs text-slate-400 max-w-sm truncate">{type.description || "No description given."}</div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {type.value}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {type.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <Check size={12} strokeWidth={3} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      <X size={12} strokeWidth={3} /> Paused
                    </span>
                  )}
                </td>
                
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => {
                      setSelectedType(type);
                      setFormData({ 
                        label: type.label, 
                        value: type.value, 
                        description: type.description || "",
                        isActive: type.isActive
                      });
                      setView("form");
                    }}
                    className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition mr-1"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(type._id)} 
                    className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOfferTypeManagement;