// import { useEffect, useMemo, useState } from "react";
// import { adminClient, buildAuthHeaders } from "../lib/api";

// function MerchantsPage({ token }) {
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const [items, setItems] = useState([]);
//   const [totalPages, setTotalPages] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [feedback, setFeedback] = useState("");

//   const headers = useMemo(() => buildAuthHeaders(token), [token]);

//   const loadMerchants = async () => {
//     setLoading(true);
//     setFeedback("");
//     try {
//       const response = await adminClient.get("/merchants", {
//         headers,
//         params: { page, limit: 10, search }
//       });
//       setItems(response.data.merchants || []);
//       setTotalPages(response.data.pages || 1);
//     } catch (requestError) {
//       setFeedback(requestError.response?.data?.message || "Failed to load merchants");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadMerchants();
//   }, [page]);

//   const runAction = async (actionFn) => {
//     setFeedback("");
//     try {
//       await actionFn();
//       await loadMerchants();
//     } catch (requestError) {
//       setFeedback(requestError.response?.data?.message || "Action failed");
//     }
//   };

//   const submitSearch = async (event) => {
//     event.preventDefault();
//     setPage(1);
//     await loadMerchants();
//   };

//   const resetSearch = async () => {
//     setSearch("");
//     setPage(1);
//     await loadMerchants();
//   };

//   const editMerchant = async (merchant) => {
//     const name = window.prompt("Name", merchant.name || "");
//     if (name === null) return;
//     const gender = window.prompt("Gender (male/female/other)", merchant.gender || "") || undefined;
//     const city = window.prompt("City", merchant.city || "") || undefined;
//     const email = window.prompt("Email", merchant.email || "") || undefined;
//     await runAction(() => adminClient.put(`/merchants/${merchant._id}`, { name, gender, city, email }, { headers }));
//   };

//   return (
//     <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-6">
//       <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
//         <div>
//           <h1 className="font-display text-2xl font-bold text-slate-900">Merchants Management</h1>
//           <p className="text-sm text-slate-600">Manage merchant verification, status, and permissions.</p>
//         </div>
//       </div>

//       <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={submitSearch}>
//         <input
//           className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           placeholder="Search by name, phone, or email"
//         />
//         <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">Search</button>
//         <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={resetSearch}>Reset</button>
//       </form>

//       {/* <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
//         <p className="text-sm font-semibold text-amber-900">Create Merchant is currently disabled.</p>
//       </div> */}

//       {feedback && <p className="mb-4 text-sm font-semibold text-blue-700">{feedback}</p>}

//       <div className="overflow-x-auto rounded-xl border border-slate-200">
//         <table className="min-w-[940px] w-full text-sm">
//           <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
//             <tr>
//               <th className="px-3 py-3">Name</th>
//               <th className="px-3 py-3">Phone</th>
//               <th className="px-3 py-3">Email</th>
//               <th className="px-3 py-3">Role</th>
//               <th className="px-3 py-3">Status</th>
//               <th className="px-3 py-3">Verified</th>
//               <th className="px-3 py-3">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading && (
//               <tr>
//                 <td className="px-3 py-4" colSpan="7">Loading merchants...</td>
//               </tr>
//             )}
//             {!loading && items.length === 0 && (
//               <tr>
//                 <td className="px-3 py-4" colSpan="7">No merchants found.</td>
//               </tr>
//             )}
//             {!loading &&
//               items.map((merchant) => (
//                 <tr key={merchant._id} className="border-t border-slate-100">
//                   <td className="px-3 py-3">{merchant.name || "-"}</td>
//                   <td className="px-3 py-3">{merchant.phone || "-"}</td>
//                   <td className="px-3 py-3">{merchant.email || "-"}</td>
//                   <td className="px-3 py-3">{merchant.role || "merchant"}</td>
//                   <td className="px-3 py-3">{merchant.status || "active"}</td>
//                   <td className="px-3 py-3">{merchant.isVerified ? "Yes" : "No"}</td>
//                   <td className="px-3 py-3">
//                     <div className="flex flex-wrap gap-2">
//                       <button
//                         type="button"
//                         className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
//                         onClick={() => editMerchant(merchant)}
//                       >
//                         Edit
//                       </button>
//                       <button
//                         type="button"
//                         className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
//                         onClick={() =>
//                           runAction(() =>
//                             adminClient.put(
//                               `/merchants/${merchant._id}/status`,
//                               { status: merchant.status === "banned" ? "active" : "banned" },
//                               { headers }
//                             )
//                           )
//                         }
//                       >
//                         {merchant.status === "banned" ? "Unban" : "Ban"}
//                       </button>
//                       <button
//                         type="button"
//                         className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
//                         onClick={() =>
//                           runAction(() =>
//                             adminClient.put(
//                               `/merchants/${merchant._id}/verify`,
//                               { isVerified: !merchant.isVerified },
//                               { headers }
//                             )
//                           )
//                         }
//                       >
//                         {merchant.isVerified ? "Unverify" : "Verify"}
//                       </button>
//                       <button
//                         type="button"
//                         className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
//                         onClick={() => {
//                           const role = window.prompt("Role (merchant/super_admin)", merchant.role || "merchant");
//                           if (!role) return;
//                           runAction(() => adminClient.put(`/merchants/${merchant._id}/role`, { role }, { headers }));
//                         }}
//                       >
//                         Role
//                       </button>
//                       <button
//                         type="button"
//                         className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
//                         onClick={() => {
//                           if (!window.confirm("Delete this merchant?")) return;
//                           runAction(() => adminClient.delete(`/merchants/${merchant._id}`, { headers }));
//                         }}
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
//         <button
//           type="button"
//           className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
//           disabled={page <= 1}
//           onClick={() => setPage((current) => current - 1)}
//         >
//           Previous
//         </button>
//         <span className="text-sm font-semibold text-slate-600">Page {page} of {totalPages}</span>
//         <button
//           type="button"
//           className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
//           disabled={page >= totalPages}
//           onClick={() => setPage((current) => current + 1)}
//         >
//           Next
//         </button>
//       </div>
//     </section>
//   );
// }

// export default MerchantsPage;

import React, { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../lib/api";
import { 
  Search, 
  UserKeyIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight,
  UserPlus,
  Mail,
  Phone,
  RotateCcw,
  X
} from "lucide-react";

function MerchantsPage({ token }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [editingMerchant, setEditingMerchant] = useState(null);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadMerchants = async () => {
    setLoading(true);
    setFeedback("");
    try {
      const response = await adminClient.get("/merchants", {
        headers,
        params: { page, limit: 10, search }
      });
      console.log(response.data)
      setItems(response.data.merchants || []);
      setTotalPages(response.data.pages || 1);
    } catch (requestError) {
      setFeedback(requestError.response?.data?.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, [page]);

  const runAction = async (actionFn) => {
    setFeedback("");
    try {
      await actionFn();
      await loadMerchants();
      setEditingMerchant(null); // Close panel if open
    } catch (requestError) {
      setFeedback(requestError.response?.data?.message || "Action failed");
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadMerchants();
  };

  const resetSearch = () => {
    setSearch("");
    setPage(1);
    loadMerchants();
  };

  return (
    <div className="space-y-6 relative overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-sky-900 tracking-tight">Merchant Directory</h1>
          <p className="text-sky-500 font-medium">Manage access, verification, and roles for all platform sellers.</p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col md:flex-row gap-4">
        <form onSubmit={submitSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
          />
        </form>
        <div className="flex gap-2">
          <button onClick={loadMerchants} className="p-2.5 bg-white border border-sky-100 text-sky-600 rounded-xl hover:bg-sky-50 transition">
            <RotateCcw size={20} />
          </button>
          <button onClick={submitSearch} className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-200 transition">
            Search
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-sky-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert size={14} className="text-sky-400" /> {feedback}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sky-50/50 border-b border-sky-100">
                <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase tracking-widest">Merchant</th>
                <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-sky-400 font-bold uppercase tracking-widest animate-pulse">Fetching Data...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-sky-400 italic">No merchants found matching your criteria.</td></tr>
              ) : (
                items.map((merchant) => (
                  <tr key={merchant._id} className="hover:bg-sky-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold border border-sky-200">
                          {merchant.name ? merchant.name.charAt(0) : "M"}
                        </div>
                        <div>
                          <p className="font-bold text-sky-900">{merchant.name || "Unnamed Merchant"}</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${merchant.isVerified ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {merchant.isVerified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-sky-600 text-xs"><Mail size={12}/> {merchant.email || "-"}</div>
                      <div className="flex items-center gap-2 text-sky-400 text-xs"><Phone size={12}/> {merchant.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-1 rounded uppercase tracking-tighter">
                        {merchant.role || "merchant"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${merchant.status === 'banned' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-sky-100 text-sky-700 border-sky-200'}`}>
                        {merchant.status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingMerchant(merchant)} className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition" title="Quick Edit">
                          <UserKeyIcon size={18} />
                        </button>
                        <button 
                          onClick={() => runAction(() => adminClient.delete(`/merchants/${merchant._id}`, { headers }))}
                          className="p-2 text-sky-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-sky-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-sky-100">
          <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg bg-white border border-sky-200 text-sky-600 disabled:opacity-40 hover:bg-sky-100 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg bg-white border border-sky-200 text-sky-600 disabled:opacity-40 hover:bg-sky-100 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* --- Quick Edit Panel (Slide Over) --- */}
      {editingMerchant && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-sky-900/40 backdrop-blur-sm" onClick={() => setEditingMerchant(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-sky-900 uppercase">Manage Merchant</h2>
              <button onClick={() => setEditingMerchant(null)} className="p-2 hover:bg-sky-50 rounded-full text-sky-300 transition">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-sky-50 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-sky-600 flex items-center justify-center text-white text-2xl font-black">
                  {editingMerchant.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sky-900">{editingMerchant.name}</h3>
                  <p className="text-xs text-sky-500 font-mono">{editingMerchant._id}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-sky-50">
                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Administrative Actions</h4>
                
                {/* Verification Toggle */}
                <button 
                  onClick={() => runAction(() => adminClient.put(`/merchants/${editingMerchant._id}/verify`, { isVerified: !editingMerchant.isVerified }, { headers }))}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${editingMerchant.isVerified ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-green-100 bg-green-50 text-green-700 font-bold'}`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <span>{editingMerchant.isVerified ? "Revoke Verification" : "Verify Merchant"}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>

                {/* Ban Toggle */}
                <button 
                  onClick={() => runAction(() => adminClient.put(`/merchants/${editingMerchant._id}/status`, { status: editingMerchant.status === "banned" ? "active" : "banned" }, { headers }))}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${editingMerchant.status === 'banned' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-red-100 bg-red-50 text-red-700 font-bold'}`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert size={20} />
                    <span>{editingMerchant.status === "banned" ? "Unban Account" : "Ban Account"}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>

                {/* Role Toggle */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">System Role</label>
                  <div className="flex gap-2">
                    {['merchant', 'super_admin'].map(role => (
                      <button
                        key={role}
                        onClick={() => runAction(() => adminClient.put(`/merchants/${editingMerchant._id}/role`, { role }, { headers }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${editingMerchant.role === role ? 'bg-sky-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
                      >
                        {role.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-8 left-8 right-8">
               <button onClick={() => setEditingMerchant(null)} className="w-full py-4 text-sky-400 font-bold hover:text-sky-600 transition">Close Panel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MerchantsPage;