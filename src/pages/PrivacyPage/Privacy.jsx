import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, FileText, Edit3, Trash2, Search, ArrowLeft, Save, Eye, Globe, Type,
  Link as LinkIcon, AlertCircle, CheckCircle2, Loader2, Bold, Italic, Underline,
  Heading1, Heading2, List, ListOrdered, Quote, Code, Sparkles
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const LegalManagementPage = ({ token }) => {
  const [view, setView] = useState("list"); 
  const [editingDoc, setEditingDoc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await accountClient.get("/legal", { headers });
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
        await accountClient.put(`/legal/${formData._id}`, formData, { headers });
      } else {
        await accountClient.post("/legal", formData, { headers });
      }
      await fetchDocuments();
      setView("list");
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save document.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this legal document?")) return;
    try {
      await accountClient.delete(`/legal/${id}`, { headers });
      await fetchDocuments();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
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
          <h2 className="text-3xl font-extrabold text-sky-950 tracking-tight">Legal Management</h2>
          <p className="text-slate-500 font-medium text-sm">Manage your platform's Privacy Policy, Terms, and Disclaimers</p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={20} /> Create New Template
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative text-slate-400">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents by title descriptors or unique slugs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none text-slate-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Document</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Target Endpoint Link</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-16 text-center">
                  <Loader2 className="animate-spin mx-auto text-sky-600 w-8 h-8 mb-2" />
                  <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">Syncing Documents...</span>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-16 text-center text-slate-400 font-medium">No legal documents found.</td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shadow-sm"><FileText size={18} /></div>
                      <div>
                        <div className="font-bold text-blue-950 text-sm">{doc.title}</div>
                        <div className="text-[10px] text-sky-600 font-black uppercase mt-0.5 tracking-wider">{doc.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${doc.status === "Published" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">http://bachatbazaar.tech/legal/{doc.slug}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onEdit(doc)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 border border-transparent hover:border-sky-100 rounded-xl transition mr-1.5 cursor-pointer shadow-sm bg-white">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => onDelete(doc._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition cursor-pointer shadow-sm bg-white">
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
  );
};

const EditorView = ({ initialData = { title: "", slug: "", status: "Draft", content: "" }, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);

  // Expanded to support structural formats like MS Word
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    // insertOrderedList: false,
    // insertUnorderedList: false,
    // h1: false,
    // h2: false,
    // blockquote: false,
  });

  const editorRef = useRef(null);

  // -------------------------------
  // UPDATE ACTIVE TOOLBAR STATES (MS Word Style)
  // -------------------------------
  const updateToolbarState = () => {
    if (!editorRef.current) return;

    // Check if block format matches a specific tag
    const isBlockActive = (tag) => {
      try {
        return document.queryCommandValue("formatBlock") === tag;
      } catch (e) {
        return false;
      }
    };

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      // insertOrderedList: document.queryCommandState("insertOrderedList"),
      // insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      // h1: isBlockActive("h1"),
      // h2: isBlockActive("h2"),
      blockquote: isBlockActive("blockquote"),
    });
  };

  // -------------------------------
  // EXECUTE COMMAND (With Toggle Mechanics)
  // -------------------------------
  const executeCommand = (command, value = null) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    // MS Word Logic for block structures: 
    // If user clicks "Heading 1" while already in an H1, revert it back to a normal paragraph.
    if (command === "formatBlock") {
      const currentBlock = document.queryCommandValue("formatBlock");
      // Strip brackets if browser returns them with brackets (e.g., "<h1>" vs "h1")
      const cleanCurrent = currentBlock.replace(/[<>]/g, "").toLowerCase();
      const cleanTarget = value.replace(/[<>]/g, "").toLowerCase();

      if (cleanCurrent === cleanTarget) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand(command, false, value);
      }
    } else {
      // Standard inline commands (Bold, Italic, Underline) toggle natively via execCommand
      document.execCommand(command, false, value);
    }

    // Instantly sync the UI state changes
    updateToolbarState();

    setFormData((prev) => ({
      ...prev,
      content: editorRef.current.innerHTML,
    }));
  };

  // -------------------------------
  // HANDLE INPUT
  // -------------------------------
  const handleInput = () => {
    if (!editorRef.current) return;

    setFormData((prev) => ({
      ...prev,
      content: editorRef.current.innerHTML,
    }));

    updateToolbarState();
  };

  // -------------------------------
  // TITLE CHANGE
  // -------------------------------
  const handleTitleChange = (e) => {
    const val = e.target.value;

    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

    setFormData({
      ...formData,
      title: val,
      slug,
    });
  };

  // -------------------------------
  // SAVE
  // -------------------------------
  const internalOnSave = async () => {
    setIsSaving(true);
    if (onSave) await onSave(formData);
    setIsSaving(false);
  };

  // -------------------------------
  // INITIAL CONTENT
  // -------------------------------
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialData.content || "";
    }
  }, [initialData.content]);

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-blue-950 transition disabled:opacity-50 cursor-pointer text-sm"
        >
          <ArrowLeft size={16} />
          Discard & Return
        </button>

        <button
          onClick={internalOnSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? "Saving..." : "Commit Document"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* EDITOR */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[650px]">

          {/* TOOLBAR */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-1 items-center">

            {/* <ToolbarButton
              active={activeFormats.h1}
              icon={<Heading1 size={15} />}
              label="Heading 1"
              onClick={() => executeCommand("formatBlock", "<h1>")}
            />

            <ToolbarButton
              active={activeFormats.h2}
              icon={<Heading2 size={15} />}
              label="Heading 2"
              onClick={() => executeCommand("formatBlock", "<h2>")}
            /> */}

            <div className="w-px h-5 bg-slate-200 mx-1.5" />

            <ToolbarButton
              active={activeFormats.bold}
              icon={<Bold size={15} />}
              label="Bold"
              onClick={() => executeCommand("bold")}
            />

            <ToolbarButton
              active={activeFormats.italic}
              icon={<Italic size={15} />}
              label="Italic"
              onClick={() => executeCommand("italic")}
            />

            <ToolbarButton
              active={activeFormats.underline}
              icon={<Underline size={15} />}
              label="Underline"
              onClick={() => executeCommand("underline")}
            />

            <div className="w-px h-5 bg-slate-200 mx-1.5" />

            {/* <ToolbarButton
              active={activeFormats.insertUnorderedList}
              icon={<List size={15} />}
              label="Bullet List"
              onClick={() => executeCommand("insertUnorderedList")}
            />

            <ToolbarButton
              active={activeFormats.insertOrderedList}
              icon={<ListOrdered size={15} />}
              label="Number List"
              onClick={() => executeCommand("insertOrderedList")}
            /> */}

            <div className="w-px h-5 bg-slate-200 mx-1.5" />

            {/* <ToolbarButton
              active={activeFormats.blockquote}
              icon={<Quote size={15} />}
              label="Quote"
              onClick={() => executeCommand("formatBlock", "<blockquote>")}
            /> */}
          </div>

          {/* EDITOR CANVAS */}
          <div className="flex flex-col flex-1 bg-white">
            <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/30 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Rich Text Editor
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyUp={updateToolbarState}
              onMouseUp={updateToolbarState}
              className="flex-1 w-full p-8 focus:outline-none text-slate-800 leading-relaxed min-h-[500px] max-h-[600px] overflow-y-auto font-sans prose prose-slate max-w-none"
              style={{
                lineHeight: "1.8",
              }}
            />
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl space-y-5">
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-50">
              <Globe size={15} className="text-blue-500" />
              Metadata
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono text-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// -----------------------------------
// TOOLBAR BUTTON
// -----------------------------------
const ToolbarButton = ({ icon, label, onClick, active }) => (
  <button
    type="button"
    title={label}
    // Crucial: prevents button click from stealing text selection focus!
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`
      p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer border shadow-sm active:scale-95
      ${
        active
          ? "bg-blue-600 text-white border-blue-600 scale-[1.02]"
          : "bg-white text-slate-600 border-slate-100 hover:bg-slate-200 hover:text-blue-950"
      }
    `}
  >
    {icon}
  </button>
);

// --- Sub-Component: Toolbar Button ---
// const ToolbarButton = ({ icon, label, onClick }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     title={label}
//     className="p-2 hover:bg-slate-200 text-slate-600 hover:text-blue-950 rounded-lg transition-all flex items-center justify-center cursor-pointer bg-white border border-slate-100 shadow-sm hover:shadow active:scale-95"
//   >
//     {icon}
//   </button>
// );

export default LegalManagementPage;