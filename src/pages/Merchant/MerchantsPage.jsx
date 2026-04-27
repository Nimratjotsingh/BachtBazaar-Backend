import React, { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../../lib/api";
import { 
  Search, 
  UserKeyIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Mail, 
  Phone, 
  RotateCcw, 
  X,
  Store,
  FileBadge,
  MapPin,
  Clock,
  Loader2
} from "lucide-react";
import MerchantStats from "./component/Stats";
import MerchantListTable from "./component/MerchantsData";

function MerchantsPage({ token }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [editingMerchant, setEditingMerchant] = useState(null);
  
  // NEW STATES for detailed data
  const [fullMerchantData, setFullMerchantData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadMerchants = async () => {
    setLoading(true);
    setFeedback("");
    try {
      const response = await adminClient.get("/merchants", {
        headers,
        params: { page, limit: 10, search }
      });
      setItems(response.data.merchants || []);
      setTotalPages(response.data.pages || 1);
    } catch (requestError) {
      setFeedback(requestError.response?.data?.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  };

  // NEW FUNCTION: Fetch all associated merchant data
  const fetchMerchantDetails = async (merchant) => {
    setEditingMerchant(merchant);
    setLoadingDetails(true);
    setFullMerchantData(null);
    try {
      // Calling the API we created: GET /merchants/:id
      const response = await adminClient.get(`/merchants/${merchant._id}`, { headers });
      setFullMerchantData(response.data.data);
    } catch (err) {
      setFeedback("Could not load merchant documents");
    } finally {
      setLoadingDetails(false);
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
      // Keep panel open but refresh details if necessary
      if (editingMerchant) {
          const res = await adminClient.get(`/merchants/${editingMerchant._id}`, { headers });
          setFullMerchantData(res.data.data);
      }
    } catch (requestError) {
      setFeedback(requestError.response?.data?.message || "Action failed");
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
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
                    <td className="px-6 py-4 cursor-pointer" onClick={() => fetchMerchantDetails(merchant)}>
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
                        <button onClick={() => fetchMerchantDetails(merchant)} className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition" title="View Full Details">
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

      {/* --- Detailed Admin Panel (Slide Over) --- */}
      {editingMerchant && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-sky-900/40 backdrop-blur-sm" onClick={() => setEditingMerchant(null)} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            
            {/* Panel Header */}
            <div className="sticky top-0 bg-white z-10 border-b border-sky-50 p-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-sky-900 uppercase">Merchant Insights</h2>
              <button onClick={() => setEditingMerchant(null)} className="p-2 hover:bg-sky-50 rounded-full text-sky-300 transition">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 flex-1 space-y-8">
              {/* Profile Header */}
              <div className="flex items-center gap-5 p-6 bg-sky-50 rounded-[32px] border border-sky-100">
                <div className="w-20 h-20 rounded-[24px] bg-sky-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                  {editingMerchant.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-sky-900">{editingMerchant.name}</h3>
                  <p className="text-xs text-sky-400 font-mono tracking-tighter mb-2">{editingMerchant._id}</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-white px-2 py-1 rounded-md text-sky-600 border border-sky-100 uppercase">{editingMerchant.role}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase border ${editingMerchant.status === 'banned' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {editingMerchant.status}
                    </span>
                  </div>
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-sky-300">
                  <Loader2 className="animate-spin" size={40} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Loading Detailed Records...</p>
                </div>
              ) : fullMerchantData ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  
                  {/* Shop Details */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                        <Store size={14}/> Shop Information
                    </h4>
                    {fullMerchantData.shop ? (
                        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-3 shadow-sm">
                            <h5 className="font-bold text-sky-900 text-lg">{fullMerchantData.shop.shopName}</h5>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                    <p className="text-sky-400 font-bold uppercase text-[9px]">Category</p>
                                    <p className="text-sky-800 font-semibold">{fullMerchantData.shop.categoryId?.label || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sky-400 font-bold uppercase text-[9px]">City</p>
                                    <p className="text-sky-800 font-semibold">{fullMerchantData.shop.city || "N/A"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 pt-2 border-t border-sky-50">
                                <MapPin size={14} className="text-sky-300 mt-0.5" />
                                <p className="text-xs text-sky-600 leading-relaxed">{fullMerchantData.shop.address || "No address provided"}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                            <p className="text-xs text-slate-400 font-medium italic">No shop profile created yet.</p>
                        </div>
                    )}
                  </section>

                  {/* KYC Documents */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                        <FileBadge size={14}/> Document Verification
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${fullMerchantData.documents.personal ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            <span className="text-[9px] font-black uppercase opacity-60">Personal KYC</span>
                            <span className="text-xs font-bold">{fullMerchantData.documents.personal ? "AADHAAR & PAN UPLOADED" : "MISSING"}</span>
                        </div>
                        <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${fullMerchantData.documents.business ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            <span className="text-[9px] font-black uppercase opacity-60">Business KYC</span>
                            <span className="text-xs font-bold">{fullMerchantData.documents.business ? "GST & PAN UPLOADED" : "MISSING"}</span>
                        </div>
                    </div>
                  </section>

                  {/* Admin Controls */}
                  <section className="space-y-4 pt-4 border-t border-sky-50">
                    <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Administrative Actions</h4>
                    
                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={() => runAction(() => adminClient.put(`/merchants/${editingMerchant._id}/verify`, { isVerified: !editingMerchant.isVerified }, { headers }))}
                            className={`flex items-center justify-between p-4 rounded-xl border transition ${editingMerchant.isVerified ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-green-100 bg-green-50 text-green-700 font-bold'}`}
                        >
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={20} />
                                <span>{editingMerchant.isVerified ? "Revoke Verification" : "Verify Merchant"}</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => runAction(() => adminClient.put(`/merchants/${editingMerchant._id}/status`, { status: editingMerchant.status === "banned" ? "active" : "banned" }, { headers }))}
                            className={`flex items-center justify-between p-4 rounded-xl border transition ${editingMerchant.status === 'banned' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-red-100 bg-red-50 text-red-700 font-bold'}`}
                        >
                            <div className="flex items-center gap-3">
                                <ShieldAlert size={20} />
                                <span>{editingMerchant.status === "banned" ? "Unban Account" : "Ban Account"}</span>
                            </div>
                        </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl">
                        <label className="text-[9px] font-black text-sky-400 uppercase mb-3 block tracking-widest">System Role Privilege</label>
                        <div className="flex gap-2">
                            {['merchant', 'super_admin'].map(role => (
                                <button
                                    key={role}
                                    onClick={() => runAction(() => adminClient.put(`/merchants/${editingMerchant._id}/role`, { role }, { headers }))}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition ${editingMerchant.role === role ? 'bg-sky-600 text-white shadow-inner' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
                                >
                                    {role.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
            
            <div className="p-8 border-t border-sky-50">
               <button onClick={() => setEditingMerchant(null)} className="w-full py-4 bg-sky-50 text-sky-600 rounded-2xl font-bold hover:bg-sky-100 transition shadow-sm">Close Insights</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MerchantsPage;