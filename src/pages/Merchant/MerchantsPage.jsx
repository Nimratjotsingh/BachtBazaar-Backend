import React, { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../../lib/api";
import { 
  Search, ShieldCheck, ShieldAlert, Trash2, ChevronLeft, ChevronRight, 
  Mail, Phone, RotateCcw, X, Store, FileBadge, MapPin, Loader2, 
  ExternalLink, CheckCircle2, AlertCircle, Eye, Hash, Calendar, 
  Building2, UserCircle, Ban, Filter, Utensils, Shirt, Smartphone, 
  Heart, Home, ShoppingBag, MoreVertical, Plus
} from "lucide-react";
import MerchantStats from "./component/Stats";

// --- Helper: Convert Buffer to Base64 ---
const getImageUrl = (imageObj) => {
  if (!imageObj || !imageObj.data || !imageObj.data.data) return null;
  const base64String = btoa(
    new Uint8Array(imageObj.data.data).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );
  return `data:${imageObj.contentType};base64,${base64String}`;
};

// --- Sub-Component: Image Display ---
const DataImage = ({ imageObj, label }) => {
  const src = getImageUrl(imageObj);
  if (!src) return null;

  return (
    <div className="space-y-2 group w-full animate-in fade-in duration-300">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
        <img src={src} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={() => {
              const win = window.open();
              win.document.write(`<title>${label}</title><body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center;"><img src="${src}" style="max-width:100%; max-height:100vh; box-shadow: 0 0 50px rgba(0,0,0,0.5);"></body>`);
            }}
            className="p-2 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform shadow-xl cursor-pointer"
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{label}</p>
    </div>
  );
};

// --- Sub-Component: Info Pill ---
const InfoField = ({ label, value, icon: Icon }) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
    {Icon && <Icon size={16} className="text-slate-400 mt-0.5" />}
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800 break-all">{value || "N/A"}</p>
    </div>
  </div>
);

function MerchantsPage({ token }) {
  // --- Core Lifecycle States ---
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  
  // Tab-based Filters State
  const [activeTab, setActiveTab] = useState("all"); // all, active, inactive, pending
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Sidebar Focus Drawer States
  const [editingMerchant, setEditingMerchant] = useState(null);
  const [fullData, setFullData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Rejection Modal State Managers
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Fetch Main Table Ledger Listings ---
  const loadMerchants = async () => {
    setLoading(true);
    try {
      // Map frontend statusTab values onto backend filter expectations safely
      let statusParam = undefined;
      if (activeTab === "active") statusParam = "verified";
      if (activeTab === "inactive") statusParam = "unverified";
      if (activeTab === "pending") statusParam = "pending";

      const response = await adminClient.get("/merchants", {
        headers, 
        params: { 
          page, 
          limit: 10, 
          search,
          status: statusParam,
          plan: selectedPlan || undefined,
          city: selectedCity || undefined
        }
      });
      setItems(response.data.merchants || []);
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      setFeedback("Failed to sync records.");
    } finally { setLoading(false); }
  };

  // --- Drill Down Detailed Inspection Fetcher ---
  const fetchMerchantAudit = async (merchant) => {
    setEditingMerchant(merchant);
    setLoadingDetails(true);
    setFullData(null);
    try {
      const response = await adminClient.get(`/merchants/${merchant._id}`, { headers });
      setFullData(response.data.data);
    } catch (err) {
      setFeedback("Could not retrieve document package.");
    } finally { setLoadingDetails(false); }
  };

  const updateStatus = async (endpoint, payload) => {
    try {
      await adminClient.put(`/merchants/${editingMerchant._id}/${endpoint}`, payload, { headers });
      await loadMerchants();
      const res = await adminClient.get(`/merchants/${editingMerchant._id}`, { headers });
      setFullData(res.data.data);
      setEditingMerchant(res.data.data.profile);
    } catch (err) {
      setFeedback("Update failed.");
    }
  };

  const handleRejectClickToggle = () => {
    if (editingMerchant.status === "rejected") {
      updateStatus('reject', { status: 'unverified' });
    } else {
      setRejectReasonInput("");
      setIsRejectModalOpen(true);
    }
  };

  const handleConfirmRejectionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await adminClient.put(`/merchants/${editingMerchant._id}/reject`, { 
        status: 'rejected',
        rejectedReason: rejectReasonInput 
      }, { headers });
      
      await loadMerchants();
      const res = await adminClient.get(`/merchants/${editingMerchant._id}`, { headers });
      setFullData(res.data.data);
      setEditingMerchant(res.data.data.profile);
      setIsRejectModalOpen(false);
    } catch (err) {
      setFeedback("Failed to log verification rejection parameters.");
    } finally {
      setSubmittingAction(false);
    }
  };

  useEffect(() => { loadMerchants(); }, [page, activeTab, selectedPlan, selectedCity]);

  // Helper mapping component to append category representations matching the screenshot design
  const getCategoryStyles = (categoryName) => {
    switch (categoryName) {
      case "Food & Beverages": return { icon: <Utensils size={13} />, color: "text-blue-600 bg-blue-50 border-blue-100/50" };
      case "Fashion": return { icon: <Shirt size={13} />, color: "text-purple-600 bg-purple-50 border-purple-100/50" };
      case "Electronics": return { icon: <Smartphone size={13} />, color: "text-cyan-600 bg-cyan-50 border-cyan-100/50" };
      case "Beauty & Health": return { icon: <Heart size={13} />, color: "text-pink-600 bg-pink-50 border-pink-100/50" };
      case "Home & Living": return { icon: <Home size={13} />, color: "text-orange-600 bg-orange-50 border-orange-100/50" };
      default: return { icon: <ShoppingBag size={13} />, color: "text-slate-600 bg-slate-50 border-slate-200/60" };
    }
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto space-y-6 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans">
      
      {/* --- MASTER TOP HEADER CARDS WIDGET --- */}
      <MerchantStats />

      {/* --- CRITICAL SPLIT ACTION MULTI-COLUMN DESIGN DESK --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* --- LEFT HAND COMPREHENSIVE DIRECTORY TABLE (9 COLS) --- */}
        <div className="xl:col-span-9 space-y-5 bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm">
          
          {/* --- DYNAMIC FILTER SUB-TABS --- */}
          <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 pb-3 text-sm font-bold text-slate-400">
            {[
              { label: "All Merchants", key: "all" },
              { label: "Active Verified", key: "active" },
              { label: "Inactive Unverified", key: "inactive" },
              { label: "Pending Approval", key: "pending" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`pb-3 relative uppercase tracking-wider transition-colors cursor-pointer ${activeTab === tab.key ? "text-blue-600 font-black" : "hover:text-slate-700"}`}
              >
                {tab.label}
                {activeTab === tab.key && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* --- MULTI-AXIS INTERACTIVE CONTROL BAR --- */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search merchant by corporate title, phone, email..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadMerchants()}
              />
            </div>

            <select 
              value={selectedPlan} 
              onChange={(e) => { setSelectedPlan(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="">All Membership Plans</option>
              <option value="Premium">Premium tier</option>
              <option value="Standard">Standard tier</option>
              <option value="Basic">Basic tier</option>
            </select>

            <select 
              value={selectedCity} 
              onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="">All Stamped Cities</option>
              <option value="Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bangalore">Bangalore</option>
            </select>

            <button onClick={loadMerchants} className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition shadow-md cursor-pointer">
              Filter
            </button>
            <button onClick={() => { setSearch(""); setSelectedPlan(""); setSelectedCity(""); setPage(1); loadMerchants(); }} className="p-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer">
              <RotateCcw size={16} />
            </button>
          </div>

          {feedback && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <ShieldAlert size={16} /> {feedback}
            </div>
          )}

          {/* --- REAL-TIME LEDGER DATA DATA TABLE GRID --- */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="w-6 pb-3"><input type="checkbox" className="rounded" /></th>
                  <th className="px-4 pb-3">Merchant Partner details</th>
                  <th className="px-4 pb-3">Contact Nodes</th>
                  <th className="px-4 pb-3">Core Category</th>
                  <th className="px-4 pb-3">Account Status</th>
                  <th className="w-6 pb-3 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-24 text-center">
                      <Loader2 className="animate-spin inline-block text-blue-500 mb-2" size={32} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Ledger Streams...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center font-bold text-slate-400 italic">No partners resolved matching active dynamic filter metrics.</td>
                  </tr>
                ) : (
                  items.map((m) => {
                    const profileImg = getImageUrl(m.profileImage);
                    const catDecor = getCategoryStyles(m.business_type || "Food & Beverages");
                    return (
                      <tr key={m._id} className={`hover:bg-slate-50/60 transition-colors group ${m.isBlocked ? 'opacity-50' : ''}`}>
                        <td className="py-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-md overflow-hidden shrink-0">
                              {profileImg ? <img src={profileImg} alt="" className="w-full h-full object-cover" /> : m.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-slate-900 truncate max-w-[140px] group-hover:text-blue-600 transition-colors">{m.name}</p>
                                {m.isBlocked && <Ban size={12} className="text-red-500 shrink-0" />}
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 font-mono mt-0.5 uppercase tracking-tighter">UID: {m._id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-500">
                          <p className="text-slate-800 font-bold flex items-center gap-1"><Phone size={11} className="text-slate-300"/>{m.phone}</p>
                          <p className="flex items-center gap-1 mt-0.5"><Mail size={11} className="text-slate-300"/>{m.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider ${catDecor.color}`}>
                            {catDecor.icon} {m.business_type || "Food & Beverages"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            m.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            m.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${m.status === 'verified' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {m.status || 'unverified'}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <button onClick={() => fetchMerchantAudit(m)} className="p-2 bg-slate-50 border border-slate-100 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50/50 group-hover:border-blue-100 rounded-xl transition shadow-sm cursor-pointer">
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* --- INTERACTIVE PAGINATION FRAME CONTROLS --- */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-xs font-bold text-slate-400">
            <p>Showing identities <span className="text-slate-800 font-black">{((page - 1) * 10) + 1} - {page * items.length}</span></p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 shadow-sm transition cursor-pointer"><ChevronLeft size={16}/></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 shadow-sm transition cursor-pointer"><ChevronRight size={16}/></button>
            </div>
          </div>
        </div>

        {/* --- RIGHT HAND SIDE WIDGETS COLUMN SIDEBAR AREA (3 COLS) --- */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Static View Blueprint Dashboard Profile Mapping */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center p-1.5 shrink-0">
                <div className="w-full h-full bg-red-600 rounded-lg flex items-center justify-center text-white font-black text-lg italic">D</div>
              </div>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-100">Live Partner</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">Workspace Inspector Overview</h2>
            <p className="text-xs text-slate-400 mt-1 font-bold">Select any profile row audit ticket to focus parameters metrics dynamically.</p>
            <div className="space-y-2.5 pt-5 text-slate-600 border-t border-slate-50 mt-4">
              <div className="flex items-center gap-2.5 text-xs font-medium"><Phone size={13} className="text-slate-400" /><span>Select a merchant to review</span></div>
              <div className="flex items-center gap-2.5 text-xs font-medium"><Mail size={13} className="text-slate-400" /><span>Contact variables stream mapping</span></div>
              <div className="flex items-start gap-2.5 text-xs font-medium leading-relaxed"><MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /><span>Storefront validation registry addresses links</span></div>
            </div>
          </div>

          {/* Graphical Mock Statistics Dashboard Performance Indices */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Performance Metrics</h3>
              <button className="text-blue-600 text-[10px] font-black uppercase tracking-wide hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Gross Revenue" val="₹2,45,678" trend="+ 18.3%" />
              <StatBox label="Redemptions" val="1,245" trend="+ 16.7%" />
              <StatBox label="Campaigns Built" val="12" trend="+ 9.1%" />
              <StatBox label="CTR Index" val="12.3%" trend="+ 4.2%" />
            </div>
            {/* Native SVG Sparkline Path Mapping Graphic */}
            <div className="h-24 bg-gradient-to-t from-purple-50/20 to-white border border-slate-100 rounded-xl flex items-end p-2 relative overflow-hidden mt-2">
              <svg viewBox="0 0 400 100" className="w-full h-full absolute inset-0">
                <path d="M0 80 Q 50 85, 100 70 T 200 75 T 300 40 T 400 60" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
                <circle cx="300" cy="40" r="4" fill="#8B5CF6" />
              </svg>
              <div className="absolute top-2 right-4 bg-slate-800 text-white px-2 py-1 rounded-lg text-[9px] font-mono font-bold">₹18,750</div>
              <div className="flex justify-between w-full text-[8px] font-black text-slate-400 px-1 z-10"><span>19 May</span><span>02 Jun</span><span>16 Jun</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================
          AUDIT TERMINAL DRAWER PANEL OVERLAY (TRIGGERED UPON GRID CLICK)
         ========================================================= */}
      {editingMerchant && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setEditingMerchant(null)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-500">
            
            <div className="sticky top-0 bg-white/90 backdrop-blur z-20 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900 uppercase">Audit Terminal Control Center</h2>
                  {editingMerchant.isBlocked && <span className="bg-red-600 text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-full">RESTRICTED</span>}
                </div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest mt-0.5">METADATA OBJECT FILE ID: {editingMerchant._id}</p>
              </div>
              <button onClick={() => setEditingMerchant(null)} className="p-2 hover:bg-slate-100 rounded-full transition cursor-pointer text-slate-400 hover:text-slate-800"><X size={22}/></button>
            </div>

            <div className="p-8 space-y-10 flex-1">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-40 gap-3 text-indigo-500">
                  <Loader2 className="animate-spin" size={40} />
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Decoding Encryption Bundles...</p>
                </div>
              ) : fullData && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-400">
                  
                  {/* Row Section 1: Profiles Credentials Allocation Mapping */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider"><UserCircle size={16}/><span>Personal Owner Profile</span></div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col items-center mb-2">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                            {getImageUrl(fullData.profile?.profileImage) ? (
                              <img src={getImageUrl(fullData.profile.profileImage)} className="w-full h-full object-cover" alt="" />
                            ) : <UserCircle size={80} className="text-slate-200" />}
                          </div>
                        </div>
                        <InfoField label="Full Operator Name" value={fullData.profile?.name} icon={UserCircle} />
                        <InfoField label="Primary Contact Phone" value={fullData.profile?.phone} icon={Phone} />
                        <InfoField label="System Auth Role" value={fullData.profile?.role} icon={ShieldCheck} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider"><Building2 size={16}/><span>Storefront Profile Mapping</span></div>
                      {fullData.shop ? (
                        <div className="grid grid-cols-1 gap-3">
                          <InfoField label="Registered Shop Label" value={fullData.shop.shopName} icon={Store} />
                          <InfoField label="Assigned Scope Node" value={fullData.shop.categoryId?.label} icon={Hash} />
                          <InfoField label="Store City Bounds" value={fullData.shop.city} icon={MapPin} />
                          <InfoField label="Verifiable Corporate Address" value={fullData.shop.address} icon={MapPin} />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50 border border-dashed rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-wider min-h-[160px]">No Corporate Shop Link Document Stamped</div>
                      )}
                    </div>
                  </section>

                  {/* Row Section 2: Storefront Media Assortment Headers */}
                  {fullData.shop && (getImageUrl(fullData.shop.banner) || getImageUrl(fullData.shop.logo)) && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-pink-600 font-bold text-xs uppercase tracking-wider"><Eye size={16}/><span>Store Graphics Branding assets</span></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {getImageUrl(fullData.shop.banner) && <DataImage imageObj={fullData.shop.banner} label="Promotional Core Banner" />}
                        {getImageUrl(fullData.shop.logo) && <div className="max-w-xs"><DataImage imageObj={fullData.shop.logo} label="Corporate Vector Logo" /></div>}
                      </div>
                    </section>
                  )}

                  {/* Row Section 3: Identity Compliance Documentation File Packs */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider"><FileBadge size={16}/><span>KYC Personal Identification</span></div>
                    {fullData.documents?.personal && (getImageUrl(fullData.documents.personal.aadharImage) || getImageUrl(fullData.documents.personal.panImage)) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {getImageUrl(fullData.documents.personal.aadharImage) && <DataImage imageObj={fullData.documents.personal.aadharImage} label="National Identification Document" />}
                        {getImageUrl(fullData.documents.personal.panImage) && <DataImage imageObj={fullData.documents.personal.panImage} label="Income Tax PAN Card" />}
                      </div>
                    ) : (
                      <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 font-bold text-center text-[10px] uppercase tracking-wider">KYC identification card arrays missing or unsubmitted.</div>
                    )}
                  </section>

                  {/* Row Section 4: Corporate Business Compliance Operations Registration Certs */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider"><FileBadge size={16}/><span>Corporate Compliance Documentation</span></div>
                    {fullData.documents?.business && (
                      getImageUrl(fullData.documents.business.gstImage) || getImageUrl(fullData.documents.business.panImage) || 
                      getImageUrl(fullData.documents.business.tradeLicenseImage) || getImageUrl(fullData.documents.business.shopRegistrationImage)
                    ) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
                        {getImageUrl(fullData.documents.business.gstImage) && <DataImage imageObj={fullData.documents.business.gstImage} label="GSTIN Registration Invoice" />}
                        {getImageUrl(fullData.documents.business.panImage) && <DataImage imageObj={fullData.documents.business.panImage} label="Business PAN Mapping" />}
                        {getImageUrl(fullData.documents.business.tradeLicenseImage) && <DataImage imageObj={fullData.documents.business.tradeLicenseImage} label="Municipal Trade License" />}
                        {getImageUrl(fullData.documents.business.shopRegistrationImage) && <DataImage imageObj={fullData.documents.business.shopRegistrationImage} label="Commercial Shop Act Certificate" />}
                      </div>
                    ) : (
                      <div className="p-6 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 font-bold text-center text-[10px] uppercase tracking-wider">No formal validation business documentation packages submitted.</div>
                    )}
                  </section>

                  {/* Administrative Final Decision Matrix Console block */}
                  <section className="bg-slate-900 rounded-[32px] p-8 space-y-6 shadow-xl border border-white/5">
                    <div>
                      <h4 className="text-white text-base font-black uppercase tracking-tight">Administrative Enforcement Terminal</h4>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Commit immutable account status overrides below</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button 
                        onClick={() => updateStatus('verify', { isVerified: !editingMerchant.isVerified })}
                        className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${editingMerchant.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}
                      >
                        <ShieldCheck size={14} /> {editingMerchant.status === 'verified' ? 'Verified Status Active' : 'Approve & Verify'}
                      </button>

                      <button 
                        onClick={handleRejectClickToggle}
                        className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${editingMerchant.status === 'rejected' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                      >
                        <AlertCircle size={14} /> {editingMerchant.status === 'rejected' ? 'Revoke Rejection' : 'Reject Application'}
                      </button>

                      <button 
                        onClick={() => updateStatus('block', { isBlocked: !editingMerchant.isBlocked })}
                        className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${editingMerchant.isBlocked ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white'}`}
                      >
                        <Ban size={14} /> {editingMerchant.isBlocked ? 'Lift Permanent Ban' : 'Enforce Account Ban'}
                      </button>
                    </div>
                  </section>

                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50/80">
              <button onClick={() => setEditingMerchant(null)} className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-sm cursor-pointer">
                Dismiss Inspector Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECTION MODAL JUSTIFICATION DISCLOSURE OVERLAY --- */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <form 
            onSubmit={handleConfirmRejectionSubmit}
            className="bg-white p-6 rounded-[2rem] max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-slate-100"
          >
            <div className="flex items-start gap-3 text-amber-500">
              <div className="p-2 bg-amber-50 rounded-xl"><AlertCircle size={22} /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Reject Registration Application</h3>
                <p className="text-xs text-slate-400 mt-0.5">State the specific compliance parameter causing documentation verification to fail.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rejection Justification Notes</label>
              <textarea
                required
                rows="3"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="e.g., Blur business registration file, uploaded PAN card image lacks legibility..."
                className="w-full text-sm font-semibold p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 resize-none transition-all placeholder-slate-300"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={submittingAction}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-100 flex items-center justify-center cursor-pointer"
              >
                {submittingAction ? <Loader2 className="animate-spin" size={14} /> : "Submit Rejection Flag"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

// --- Presentational UI Sub-Components Snippets ---
const StatBox = ({ label, val, trend }) => (
  <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-xl">
    <p className="text-[9px] text-slate-400 font-black mb-1 uppercase tracking-wider">{label}</p>
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-sm font-black text-slate-800 font-mono">{val}</span>
      <span className="text-[9px] text-emerald-500 font-bold shrink-0">{trend}</span>
    </div>
  </div>
);

export default MerchantsPage;