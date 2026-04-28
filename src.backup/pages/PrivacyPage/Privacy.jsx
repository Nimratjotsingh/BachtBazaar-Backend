import React, { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Edit3,
  Trash2,
  Search,
  Filter,
  ArrowLeft,
  Save,
  Eye,
  Globe,
  Type,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { accountClient, buildAuthHeaders } from "../../lib/api";
import { useMemo } from "react";

const LegalManagementPage = ({token}) => {
  // --- State Management ---
  const [view, setView] = useState("list"); // 'list' or 'editor'
  const [editingDoc, setEditingDoc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- API Actions ---
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/legal",{headers});
      setDocuments(res.data.docs || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateNew = () => {
    setEditingDoc({
      title: "",
      slug: "",
      type: "Policy",
      content: "",
      status: "Draft",
    });
    setView("editor");
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setView("editor");
  };

  const handleSave = async (formData) => {
    try {
      if (formData._id) {
        // Update existing using MongoDB _id
        await accountClient.put(`/legal/${formData._id}`, formData, {headers});
      } else {
        // Create new
        await accountClient.post("/legal", formData, {headers});
      }
      await fetchDocuments();
      setView("list");
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save document. Please check console.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this legal document? This action cannot be undone.")) return;
    try {
      await accountClient.delete(`/legal/${id}`);
      await fetchDocuments();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {view === "list" ? (
        <ListView
          documents={documents}
          onCreate={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      ) : (
        <EditorView
          initialData={editingDoc}
          onSave={handleSave}
          onCancel={() => setView("list")}
        />
      )}
    </div>
  );
};

// --- Sub-Component: Table List View ---
const ListView = ({ documents, onCreate, onEdit, onDelete, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-sky-900 tracking-tight">
            Legal Management
          </h2>
          <p className="text-sky-500 font-medium">
            Manage your platform's Privacy Policy, Terms, and Disclaimers
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-200 transition-all active:scale-95"
        >
          <Plus size={20} /> Create New
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full text-sky-400">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-sky-50/50 border border-sky-100 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sky-50 border-b border-sky-100">
              <th className="px-6 py-4 text-xs font-bold text-sky-900 uppercase tracking-widest">Document</th>
              <th className="px-6 py-4 text-xs font-bold text-sky-900 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-sky-900 uppercase tracking-widest">URL Slug</th>
              <th className="px-6 py-4 text-xs font-bold text-sky-900 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sky-400">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" size={32} />
                    <span className="font-bold text-sm">Loading Documents...</span>
                  </div>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sky-500 font-medium">
                  No legal documents found.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc._id} className="hover:bg-sky-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-100 rounded-lg text-sky-600">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sky-900">{doc.title}</div>
                        <div className="text-[10px] text-sky-400 font-bold uppercase">{doc.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${doc.status === "Published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-sky-500">/legal/{doc.slug}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onEdit(doc)}
                      className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-100 rounded-lg transition mr-2"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(doc._id)}
                      className="p-2 text-sky-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Sub-Component: Policy Editor View ---
const EditorView = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");
    setFormData({ ...formData, title: val, slug });
  };

  const internalOnSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-2 text-sky-600 font-bold hover:text-sky-800 transition disabled:opacity-50"
        >
          <ArrowLeft size={18} /> Back to Documents
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className="flex-1 px-4 py-2 bg-white border border-sky-200 text-sky-700 rounded-xl font-bold text-sm hover:bg-sky-50 transition flex items-center justify-center gap-2"
          >
            <Eye size={18} /> {isPreview ? "Edit Content" : "Live Preview"}
          </button>
          <button
            onClick={internalOnSave}
            disabled={isSaving}
            className="flex-1 px-6 py-2 bg-sky-600 text-white rounded-xl font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-200 transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Policy"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-6 border-b border-sky-50 flex justify-between items-center bg-sky-50/30">
            <span className="text-xs font-black text-sky-900 uppercase tracking-tighter">Content Editor</span>
          </div>
          {isPreview ? (
            <div className="p-8 prose prose-sky max-w-none">
              <h1 className="text-sky-900 font-bold text-3xl mb-4">{formData.title || "Untitled Document"}</h1>
              <div className="whitespace-pre-wrap text-sky-800 leading-relaxed">
                {formData.content || "Start typing your legal content..."}
              </div>
            </div>
          ) : (
            <textarea
              className="flex-1 p-8 focus:outline-none text-sky-900 leading-relaxed text-lg resize-none placeholder-sky-200"
              placeholder="Start typing your policy content here..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-sky-900 uppercase tracking-wider flex items-center gap-2">
              <Globe size={16} className="text-sky-500" /> SEO & Routing
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-sky-400 uppercase">Page Title</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" size={16} />
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    className="w-full pl-10 pr-3 py-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-sky-400 uppercase">Slug / URL</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" size={16} />
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-sky-400 uppercase">Document Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-sm font-bold text-sky-700"
                >
                  <option>Policy</option>
                  <option>Terms</option>
                  <option>EULA</option>
                  <option>Disclaimer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-sky-400 uppercase">Publish Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-sm font-bold text-sky-700"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-sky-900 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex items-center gap-2 text-sky-300 mb-2">
              <AlertCircle size={18} />
              <span className="text-xs font-bold uppercase">Safe Publish</span>
            </div>
            <p className="text-xs text-sky-100 leading-relaxed mb-4">
              {formData.status === "Published" 
                ? "This document is LIVE. Saving changes will update the website immediately."
                : "This is a DRAFT. It will not be visible on the public legal pages until Published."}
            </p>
            <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
              <CheckCircle2 size={14} /> Auto-Sync Enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalManagementPage;