import React, { useState, useEffect,useMemo } from "react";
import { 
  Plus, Edit3, Trash2, Search, Image as ImageIcon, 
  ChevronRight, ArrowLeft, Save, Loader2, X 
} from "lucide-react";
import { accountClient,buildAuthHeaders } from "../../lib/api"; // Your axios instance

const CategoryManagement = ({token}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list', 'category-form', 'subcategory-list'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ value: "", label: "", description: "", image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const headers = useMemo(() => buildAuthHeaders(token), [token]);
  console.log(headers)

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/categories",{headers});
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error(err);
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

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("value", formData.value);
    data.append("label", formData.label);
    data.append("description", formData.description);
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      if (selectedCategory?._id) {
        await accountClient.put(`/categories/${selectedCategory._id}`, data,{headers});
      } else {
        await accountClient.post("/categories", data, {headers});
      }
      fetchCategories();
      setView("list");
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ value: "", label: "", description: "", image: null });
    setImagePreview(null);
    setSelectedCategory(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Move this category to trash?")) return;
    try {
      await accountClient.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert("Delete failed");
    }
  };

  // Render Logic
  if (view === "category-form") return (
    <CategoryForm 
      formData={formData} 
      setFormData={setFormData} 
      onSave={handleSaveCategory} 
      onCancel={() => { setView("list"); resetForm(); }}
      imagePreview={imagePreview}
      handleImageChange={handleImageChange}
      loading={loading}
    />
  );

  if (view === "subcategory-list") return (
    <SubcategoryManager 
      category={selectedCategory} 
      onBack={() => { setView("list"); setSelectedCategory(null); }} 
    />
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950">Categories</h1>
          <p className="text-blue-500">Manage top-level product groupings</p>
        </div>
        <button 
          onClick={() => setView("category-form")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all"
        >
          <Plus size={20} /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-20 text-blue-400">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : categories.map((cat) => (
          <div key={cat._id} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <div className="h-40 bg-blue-50 relative overflow-hidden">
              {cat.image ? (
                <img src={`${cat.image}`} className="w-full h-full object-cover" alt={cat.label} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-200">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-blue-900">{cat.label}</h3>
                <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded-md uppercase tracking-tighter">
                  {cat.value}
                </span>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mb-6">{cat.description || "No description provided."}</p>
              
              <div className="flex items-center gap-2 border-t border-blue-50 pt-4">
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setView("subcategory-list");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                >
                  Subcategories <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setFormData({ value: cat.value, label: cat.label, description: cat.description });
                    setView("category-form");
                  }}
                  className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(cat._id)}
                  className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Category Form Component ---
const CategoryForm = ({ formData, setFormData, onSave, onCancel, imagePreview, handleImageChange, loading }) => (
  <div className="max-w-2xl mx-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition">
      <ArrowLeft size={18} /> Back to List
    </button>
    
    <div className="bg-white p-8 rounded-[32px] border border-blue-100 shadow-xl space-y-6">
      <h2 className="text-2xl font-bold text-blue-950">Category Details</h2>
      <form onSubmit={onSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Label (Display Name)</label>
            <input 
              required
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.label}
              onChange={(e) => setFormData({...formData, label: e.target.value})}
              placeholder="Electronics"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Value (Slug/ID)</label>
            <input 
              required
              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.value}
              onChange={(e) => setFormData({...formData, value: e.target.value})}
              placeholder="electronics"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Description</label>
          <textarea 
            rows="3"
            className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Category Image</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center overflow-hidden">
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon className="text-blue-200" />}
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Category
        </button>
      </form>
    </div>
  </div>
);

// --- Subcategory Manager Component ---
const SubcategoryManager = ({ category, onBack }) => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSub, setNewSub] = useState({ label: "", value: "" });

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get(`/categories/${category._id}/subcategories`);
      setSubs(res.data.subcategories || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddSub = async (e) => {
    e.preventDefault();
    try {
      // Assuming your backend has a /subcategories endpoint
      await accountClient.post(`/subcategories`, { ...newSub, categoryId: category._id });
      setNewSub({ label: "", value: "" });
      fetchSubs();
    } catch (err) { alert("Failed to add subcategory"); }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition">
        <ArrowLeft size={18} /> Back to Categories
      </button>

      <div className="bg-white rounded-[32px] border border-blue-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-blue-50 bg-blue-50/20">
          <h2 className="text-2xl font-bold text-blue-950">Manage Subcategories for {category.label}</h2>
        </div>

        <div className="p-8 grid md:grid-cols-3 gap-8">
          <form onSubmit={handleAddSub} className="space-y-4">
            <h3 className="font-bold text-blue-900">Quick Add Subcategory</h3>
            <input 
              placeholder="Sub-label (e.g. Smart Phones)" 
              className="w-full px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-lg outline-none"
              value={newSub.label}
              onChange={(e) => setNewSub({...newSub, label: e.target.value})}
              required
            />
            <input 
              placeholder="Sub-value (e.g. smart-phones)" 
              className="w-full px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-lg outline-none"
              value={newSub.value}
              onChange={(e) => setNewSub({...newSub, value: e.target.value})}
              required
            />
            <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
              Add Subcategory
            </button>
          </form>

          <div className="md:col-span-2 space-y-4">
            <h3 className="font-bold text-blue-900">Existing Subcategories ({subs.length})</h3>
            <div className="grid grid-cols-2 gap-3">
              {loading ? <Loader2 className="animate-spin text-blue-400" /> : subs.map(s => (
                <div key={s._id} className="flex justify-between items-center px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl group">
                  <div>
                    <div className="font-bold text-blue-900 text-sm">{s.label}</div>
                    <div className="text-[10px] text-blue-400 font-bold uppercase">{s.value}</div>
                  </div>
                  <button className="text-blue-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;