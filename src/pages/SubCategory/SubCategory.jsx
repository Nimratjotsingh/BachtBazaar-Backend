import React, { useState, useEffect,useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  Save, Loader2, ArrowLeft, Filter, Layers
} from "lucide-react";
import { accountClient,buildAuthHeaders } from "../../lib/api";

const SubCategoryPage = ({token}) => {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]); // For the parent category dropdown
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const [formData, setFormData] = useState({ 
    value: "", 
    label: "", 
    description: "", 
    categoryId: "", 
    image: null 
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [subRes, catRes] = await Promise.all([
        accountClient.get("/subcategories",{headers}),
        accountClient.get("/categories",{headers})
      ]);
      setSubCategories(subRes.data.subCategories || []);
      setCategories(catRes.data.categories || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("value", formData.value);
    data.append("label", formData.label);
    data.append("description", formData.description);
    data.append("categoryId", formData.categoryId);
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      if (selectedSub?._id) {
        await accountClient.put(`/subcategories/${selectedSub._id}`, data,{headers});
      } else {
        await accountClient.post("/subcategories", data,{headers});
      }
      fetchInitialData();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ value: "", label: "", description: "", categoryId: "", image: null });
    setImagePreview(null);
    setSelectedSub(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Soft delete this sub-category?")) return;
    try {
      await accountClient.delete(`/subcategories/${id}`,{headers});
      fetchInitialData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  // Filter Logic
  const filteredData = subCategories.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.categoryId?._id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (view === "form") return (
    <div className="max-w-3xl mx-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => { setView("list"); resetForm(); }} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition">
        <ArrowLeft size={18} /> Back to Sub-Categories
      </button>

      <div className="bg-white p-8 rounded-[32px] border border-blue-100 shadow-2xl space-y-6">
        <h2 className="text-2xl font-bold text-blue-950">{selectedSub ? "Edit" : "Create"} Sub-Category</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Parent Category</label>
            <select 
              required
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.categoryId}
              onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
            >
              <option value="">Select a Category</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Sub-Category Label</label>
              <input required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="e.g. Smart Phones" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Sub-Category Value</label>
              <input required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="e.g. smart-phones" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Description</label>
            <textarea rows="3" className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none resize-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Sub-Category Image</label>
            <div className="flex items-center gap-6 p-4 bg-blue-50/30 border border-dashed border-blue-200 rounded-2xl">
              <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-blue-100 shadow-inner">
                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon className="text-blue-200" />}
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
            </div>
          </div>

          <button disabled={loading} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Sub-Category
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
            <Layers className="text-blue-500" /> Sub-Categories
          </h1>
          <p className="text-blue-500">Manage second-level product niches</p>
        </div>
        <button onClick={() => setView("form")} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">
          <Plus size={20} /> Add Sub-Category
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={18} />
          <input 
            type="text" 
            placeholder="Search sub-categories..." 
            className="w-full pl-10 pr-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3 bg-blue-50/50 border border-blue-100 rounded-xl">
          <Filter size={16} className="text-blue-400" />
          <select 
            className="bg-transparent text-sm font-bold text-blue-600 outline-none py-2"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Parent Categories</option>
            {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-[24px] border border-blue-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-50/50 border-b border-blue-100">
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">Sub-Category</th>
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest">Parent Category</th>
    
              <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {loading ? (
              <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan="4" className="py-20 text-center text-blue-400 font-bold">No sub-categories found.</td></tr>
            ) : filteredData.map((sub) => (
              <tr key={sub._id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center overflow-hidden">
                      {sub.image ? <img src={sub.image} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-blue-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-blue-950">{sub.label}</div>
                      <div className="text-[10px] text-blue-400 font-black uppercase tracking-tighter">{sub.value}</div>
                    </div>
                  </div>
                </td>
                {/* <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[11px] font-bold">
                    {sub.categoryId?.label || "Unassigned"}
                  </span>
                </td> */}
                <td className="px-6 py-4 text-sm font-mono text-slate-400">/{sub.value}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => {
                      setSelectedSub(sub);
                      setFormData({ 
                        label: sub.label, 
                        value: sub.value, 
                        description: sub.description || "", 
                        categoryId: sub.categoryId?._id || "" 
                      });
                      setView("form");
                    }}
                    className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition mr-1"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(sub._id)} className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
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

export default SubCategoryPage;