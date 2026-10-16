import React, { useEffect, useMemo, useState, } from "react";
import { adminClient, buildAuthHeaders } from "../../lib/api";
import { 
  Search, ShieldCheck, ShieldAlert, Trash2, ChevronLeft, ChevronRight, 
  Mail, Phone, RotateCcw, X, Store, FileBadge, MapPin, Loader2, 
  ExternalLink, CheckCircle2, AlertCircle, Eye, Hash, Calendar, 
  Building2, UserCircle, Ban, Filter, Utensils, Shirt, Smartphone, 
  Heart, Home, ShoppingBag, MoreVertical, Plus, BadgeCheck, Check, 
  Truck, Moon, Zap, Clock, Download, Maximize2
} from "lucide-react";
import MerchantStats from "./component/Stats";
import { useNavigate } from "react-router-dom";


// --- Helper: Convert Buffer to Base64 ---
const getImageUrl = (imageObj) => {
  if (!imageObj) return null;
  if (typeof imageObj === "string" && imageObj.trim().length > 0) return imageObj;
  if (!imageObj.data || !imageObj.data.data) return null;
  try {
    const base64String = btoa(
      new Uint8Array(imageObj.data.data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    return `data:${imageObj.contentType};base64,${base64String}`;
  } catch (err) {
    return null;
  }
};

// --- Sub-Component: Interactive Image Card ---
const DataImage = ({ imageObj, label, onImageClick }) => {
  const src = getImageUrl(imageObj);
  if (!src) return null;

  return (
    <div className="space-y-2 group w-full animate-in fade-in duration-300">
      <div 
        onClick={() => onImageClick(src, label)}
        className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs cursor-pointer group"
      >
        <img 
          src={src} 
          alt={label} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="p-2 bg-white/90 text-slate-900 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
            <Maximize2 size={16} />
          </span>
          <span className="text-[10px] font-black uppercase text-white tracking-wider">Inspect Fullscreen</span>
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{label}</p>
    </div>
  );
};

// --- Sub-Component: Info Pill ---
const InfoField = ({ label, value, icon: Icon, badge }) => (
  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
    {Icon && <Icon size={16} className="text-slate-400 mt-0.5 shrink-0" />}
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">{label}</p>
      {badge ? (
        badge
      ) : (
        <p className="text-xs font-bold text-slate-800 break-words leading-tight">{value ?? "N/A"}</p>
      )}
    </div>
  </div>
);

function MerchantsPage({ token }) {
  const navigate = useNavigate();
  // --- Core Lifecycle States ---
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Tab-based Filters State
  const [activeTab, setActiveTab] = useState("all"); // all, active, inactive, pending, bluetick
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

  // Fullscreen Image Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Fetch Main Table Ledger Listings ---
  const loadMerchants = async () => {
    setLoading(true);
    try {
      let statusParam = undefined;
      let blueTickParam = undefined;

      if (activeTab === "active") statusParam = "verified";
      if (activeTab === "inactive") statusParam = "unverified";
      if (activeTab === "pending") statusParam = "pending";
      if (activeTab === "bluetick") blueTickParam = "true";

      const response = await adminClient.get("/merchants", {
        headers, 
        params: { 
          page, 
          limit: 10, 
          search,
          status: statusParam,
          isBlueTickEnabled: blueTickParam,
          plan: selectedPlan || undefined,
          city: selectedCity || undefined
        }
      });
      setItems(response.data.merchants || response.data.data || []);
      setTotalPages(response.data.pages || response.data.totalPages || 1);
      setTotalCount(response.data.total || response.data.count || 0);
    } catch (err) {
      setFeedback("Failed to sync records.");
    } finally { 
      setLoading(false); 
    }
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
    } finally { 
      setLoadingDetails(false); 
    }
  };

  // --- Status Modifiers ---
  const updateStatus = async (endpoint, payload) => {
    try {
      await adminClient.put(`/merchants/${editingMerchant._id}/${endpoint}`, payload, { headers });
      await loadMerchants();
      const res = await adminClient.get(`/merchants/${editingMerchant._id}`, { headers });
      setFullData(res.data.data);
      setEditingMerchant(res.data.data.profile || res.data.data);
    } catch (err) {
      setFeedback("Status update failed.");
    }
  };

  // --- Toggle Blue Tick Verified Badge ---
  const handleToggleBlueTick = async (merchantId, currentVal) => {
    try {
      const targetVal = !currentVal;
      // Optimistic update in table
      setItems(prev => prev.map(m => m._id === merchantId ? { ...m, isBlueTickEnabled: targetVal } : m));
      if (editingMerchant && editingMerchant._id === merchantId) {
        setEditingMerchant(prev => ({ ...prev, isBlueTickEnabled: targetVal }));
      }
      if (fullData?.profile?._id === merchantId) {
        setFullData(prev => ({ ...prev, profile: { ...prev.profile, isBlueTickEnabled: targetVal } }));
      }

      await adminClient.patch(`/merchants/${merchantId}/blue-tick`, {
        isBlueTickEnabled: targetVal
      }, { headers });

      setFeedback(`Blue tick ${targetVal ? 'granted' : 'revoked'} successfully.`);
      setTimeout(() => setFeedback(""), 3500);
    } catch (err) {
      setFeedback("Failed to update verified badge.");
      await loadMerchants();
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
      setEditingMerchant(res.data.data.profile || res.data.data);
      setIsRejectModalOpen(false);
    } catch (err) {
      setFeedback("Failed to log verification rejection parameters.");
    } finally {
      setSubmittingAction(false);
    }
  };

  useEffect(() => { 
    loadMerchants(); 
  }, [page, activeTab, selectedPlan, selectedCity]);

  const getCategoryStyles = (categoryName) => {
    switch (categoryName) {
      case "Food & Beverages": return { icon: <Utensils size={13} />, color: "text-blue-600 bg-blue-50 border-blue-100" };
      case "Fashion": return { icon: <Shirt size={13} />, color: "text-purple-600 bg-purple-50 border-purple-100" };
      case "Electronics": return { icon: <Smartphone size={13} />, color: "text-cyan-600 bg-cyan-50 border-cyan-100" };
      case "Beauty & Health": return { icon: <Heart size={13} />, color: "text-pink-600 bg-pink-50 border-pink-100" };
      case "Home & Living": return { icon: <Home size={13} />, color: "text-orange-600 bg-orange-50 border-orange-100" };
      default: return { icon: <ShoppingBag size={13} />, color: "text-slate-600 bg-slate-50 border-slate-200" };
    }
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto space-y-6 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans">
      
      {/* Top Header Intelligence Widget */}
      <MerchantStats token={token} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Directory Ledger (9 cols) */}
        <div className="xl:col-span-9 space-y-5 bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs">
          
          {/* Sub-Tabs Filter */}
          <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 pb-3 text-xs font-bold text-slate-400">
            {[
              { label: "All Merchants", key: "all" },
              { label: "Active Verified", key: "active" },
              { label: "Inactive Unverified", key: "inactive" },
              { label: "Pending Approval", key: "pending" },
              { label: "Blue Tick Holders", key: "bluetick" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`pb-3 relative uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.key ? "text-blue-600 font-black" : "hover:text-slate-700"
                }`}
              >
                {tab.key === "bluetick" && <BadgeCheck size={14} className="text-blue-500" />}
                {tab.label}
                {activeTab === tab.key && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Interactive Search & Filter Bar */}
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
              <option value="">All Cities</option>
              <option value="Delhi">Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Bathinda">Bathinda</option>
            </select>

            <button 
              onClick={loadMerchants} 
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition shadow-xs cursor-pointer"
            >
              Filter
            </button>
            <button 
              onClick={() => { setSearch(""); setSelectedPlan(""); setSelectedCity(""); setPage(1); loadMerchants(); }} 
              className="p-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {feedback && (
            <div className="p-3.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} /> {feedback}
              </span>
              <button onClick={() => setFeedback("")} className="text-blue-400 hover:text-blue-700 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Ledger Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 pb-3">Merchant Partner</th>
                  <th className="px-4 pb-3">Contact Nodes</th>
                  
                  <th className="px-4 pb-3 text-center">Blue Tick Badge</th>
                  <th className="px-4 pb-3">Verification</th>
                  <th className="px-4 pb-3 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-24 text-center">
                      <Loader2 className="animate-spin inline-block text-blue-500 mb-2" size={30} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loading Directory...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center font-bold text-slate-400 italic">
                      No partners resolved matching active parameters.
                    </td>
                  </tr>
                ) : (
                  items.map((m) => {
                    const profileImg = getImageUrl(m.profileImage);
                    const catDecor = getCategoryStyles(m.business_type || "General");
                    return (
                      <tr key={m._id} className={`hover:bg-slate-50/70 transition-colors group ${m.isBlocked ? 'opacity-50' : ''}`}>
                        {/* Avatar & Title */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => profileImg && setLightboxImage({ src: profileImg, label: `${m.name} - Profile Image` })}
                              className={`w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-xs overflow-hidden shrink-0 border border-slate-200 ${profileImg ? 'cursor-zoom-in' : ''}`}
                            >
                              {profileImg ? (
                                <img src={profileImg} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                              ) : (
                                m.name?.charAt(0).toUpperCase() || "M"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-extrabold text-slate-900 truncate max-w-[140px] group-hover:text-blue-600 transition-colors">
                                  {m.name || "Unnamed Merchant"}
                                </p>
                                {m.isBlueTickEnabled && (
                                  <BadgeCheck size={15} className="text-blue-500 fill-blue-50 shrink-0" title="Verified Blue Tick Active" />
                                )}
                                {m.isBlocked && <Ban size={12} className="text-red-500 shrink-0" title="Account Banned" />}
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 font-mono mt-0.5 uppercase tracking-tighter truncate max-w-[160px]">
                                ID: {m._id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contacts */}
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-500">
                          <p className="text-slate-800 font-bold flex items-center gap-1">
                            <Phone size={11} className="text-slate-300"/>{m.phone || "N/A"}
                          </p>
                          <p className="flex items-center gap-1 mt-0.5 truncate max-w-[170px]">
                            <Mail size={11} className="text-slate-300 shrink-0"/>{m.email || "No email"}
                          </p>
                        </td>

                        {/* Category */}
                        

                        {/* Blue Tick Quick Toggle */}
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleBlueTick(m._id, m.isBlueTickEnabled)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              m.isBlueTickEnabled
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-200"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                            }`}
                            title={m.isBlueTickEnabled ? "Revoke Blue Tick" : "Grant Verified Blue Tick"}
                          >
                            <BadgeCheck size={14} className={m.isBlueTickEnabled ? "text-white" : "text-slate-400"} />
                            <span>{m.isBlueTickEnabled ? "Enabled" : "Enable"}</span>
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            m.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            m.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${m.status === 'verified' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {m.status || 'unverified'}
                          </span>
                        </td>

                        {/* Audit Details Trigger */}
                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={() => fetchMerchantAudit(m)} 
                            className="p-2 bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50/70 hover:border-blue-200 rounded-xl transition cursor-pointer shadow-2xs"
                            title="Inspect Merchant Profile"
                          >
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

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-xs font-bold text-slate-400">
            <p>Page <span className="text-slate-800 font-black">{page}</span> of <span className="text-slate-800 font-black">{totalPages}</span></p>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)} 
                className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              >
                <ChevronLeft size={16}/>
              </button>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)} 
                className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              >
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>

        {/* Right Info Column (3 cols) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl shadow-xs flex items-center justify-center text-white">
                <Store size={22} />
              </div>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-blue-100">
                Workspace
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Inspector Overview</h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Click the eye icon on any merchant row to inspect their KYC compliance documents, storefront graphics, delivery configs, and toggle verified status.</p>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Quick Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <BadgeCheck size={16} className="text-blue-500 shrink-0" />
                <span className="font-bold text-slate-700">Verified Blue Tick:</span>
                <span className="text-slate-400 font-medium">Public credibility badge displayed to end users.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-700">Account Verified:</span>
                <span className="text-slate-400 font-medium">Passed phone & backend verification.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          FULL AUDIT TERMINAL DRAWER PANEL
         ========================================================= */}
      {editingMerchant && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setEditingMerchant(null)} 
          />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 z-10">
            
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Merchant Compliance Terminal</h2>
                  {editingMerchant.isBlueTickEnabled && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      <BadgeCheck size={12} /> Blue Tick
                    </span>
                  )}
                  {editingMerchant.isBlocked && (
                    <span className="bg-red-600 text-white text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full">
                      RESTRICTED
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-black text-slate-400 tracking-wider mt-0.5 font-mono">
                  ID: {editingMerchant._id}
                </p>
              </div>
              <div className="flex">
                {fullData?.shop?.id &&<button className="flex mt-2 cursor-pointer mr-2" onClick={()=>navigate(`/dashboard/shop/${fullData.shop.id}`)}>
                  <ExternalLink size={20} className="text-slate-400 hover:text-blue-600 transition cursor-pointer"/>
                  <h1 className="text-xs mt-1 ">Open Business Profile</h1>
                </button>}
              <button 
                onClick={() => setEditingMerchant(null)} 
                className="p-2 hover:bg-slate-100 rounded-full transition cursor-pointer text-slate-400 hover:text-slate-800"
              >
                <X size={20}/>
              </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-10 flex-1">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-40 gap-3 text-blue-600">
                  <Loader2 className="animate-spin" size={36} />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Merchant Records...</p>
                </div>
              ) : fullData && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  
                  {/* Row 1: Profile & Store Info */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Owner Particulars */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                        <UserCircle size={16}/><span>Personal & Account Metadata</span>
                      </div>
                      
                      {/* Avatar Hero */}
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div 
                          onClick={() => {
                            const src = getImageUrl(fullData.profile?.profileImage);
                            if (src) setLightboxImage({ src, label: `${fullData.profile?.name} - Avatar` });
                          }}
                          className={`w-16 h-16 rounded-2xl overflow-hidden shadow-xs border-2 border-white bg-slate-200 shrink-0 ${getImageUrl(fullData.profile?.profileImage) ? 'cursor-zoom-in' : ''}`}
                        >
                          {getImageUrl(fullData.profile?.profileImage) ? (
                            <img src={getImageUrl(fullData.profile.profileImage)} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                              {fullData.profile?.name?.charAt(0) || "M"}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-900 text-sm">{fullData.profile?.name || "N/A"}</h4>
                            {fullData.profile?.isBlueTickEnabled && <BadgeCheck size={16} className="text-blue-500 fill-blue-50" />}
                          </div>
                          <p className="text-slate-400 text-xs font-medium">{fullData.profile?.city || "City not set"}</p>
                          <span className="text-[10px] font-mono text-slate-400">Gender: {fullData.profile?.gender || "Not specified"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        <InfoField label="Primary Contact Phone" value={fullData.profile?.phone} icon={Phone} />
                        <InfoField label="Primary Contact Email" value={fullData.profile?.email} icon={Mail} />
                        <InfoField label="System Role" value={fullData.profile?.role} icon={ShieldCheck} />
                        <InfoField 
                          label="Blue Tick Verified Badge" 
                          icon={BadgeCheck}
                          badge={
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold ${fullData.profile?.isBlueTickEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                                {fullData.profile?.isBlueTickEnabled ? 'Active Verified' : 'Disabled'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleBlueTick(fullData.profile?._id, fullData.profile?.isBlueTickEnabled)}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 text-blue-600 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                              >
                                {fullData.profile?.isBlueTickEnabled ? "Revoke" : "Enable"}
                              </button>
                            </div>
                          }
                        />
                      </div>
                    </div>

                    {/* Shop Particulars */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                        <Building2 size={16}/><span>Storefront Mapping</span>
                      </div>
                      {fullData.shop ? (
                        <div className="grid grid-cols-1 gap-2.5">
                          <InfoField label="Registered Shop Name" value={fullData.shop.shopName} icon={Store} />
                          <InfoField label="Assigned Category" value={fullData.shop.categoryId?.label || fullData.shop.categoryId?.name} icon={Hash} />
                          <InfoField label="City Location" value={fullData.shop.city} icon={MapPin} />
                          <InfoField label="Verifiable Storefront Address" value={fullData.shop.address} icon={MapPin} />
                          <InfoField 
                            label="Geographic Coordinates" 
                            value={fullData.shop.latitude && fullData.shop.longitude ? `Lat: ${fullData.shop.latitude}, Lng: ${fullData.shop.longitude}` : "Unset"} 
                            icon={MapPin} 
                          />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs p-8 text-center">
                          No Storefront Registered
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Row 2: Delivery & Pricing Configurations */}
                  {fullData.profile?.deliveryPricing && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider">
                        <Truck size={16}/><span>Delivery Pricing & Operational Windows</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <InfoField 
                          label="Delivery Service Active" 
                          value={fullData.profile?.isDeliveryEnabled ? "Yes, Active" : "No, Disabled"} 
                          icon={Truck} 
                        />
                        <InfoField 
                          label="Base Fee / Min Delivery Charge" 
                          value={`Base: ₹${fullData.profile?.deliveryPricing?.baseFee || 0} | Min: ₹${fullData.profile?.deliveryPricing?.minimumDeliveryFee || 0}`} 
                          icon={Store} 
                        />
                        <InfoField 
                          label="Rate Per KM" 
                          value={`₹${fullData.profile?.deliveryPricing?.ratePerKm || 0} / KM`} 
                          icon={Hash} 
                        />
                      </div>

                      {/* Night & Peak Surges */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="flex items-center gap-1.5 font-black text-slate-400 uppercase text-[9px]">
                            <Moon size={12} /> Night Surcharge Config
                          </span>
                          <p className="font-bold text-slate-800">
                            {fullData.profile?.deliveryPricing?.nightConfig?.isEnabled ? (
                              `Active (₹${fullData.profile?.deliveryPricing?.nightConfig?.ratePerKm}/km) • ${fullData.profile?.deliveryPricing?.nightConfig?.startTime} - ${fullData.profile?.deliveryPricing?.nightConfig?.endTime}`
                            ) : "Disabled"}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="flex items-center gap-1.5 font-black text-slate-400 uppercase text-[9px]">
                            <Zap size={12} /> Peak Surcharge Config
                          </span>
                          <p className="font-bold text-slate-800">
                            {fullData.profile?.deliveryPricing?.peakConfig?.isEnabled ? (
                              `Active (₹${fullData.profile?.deliveryPricing?.peakConfig?.ratePerKm}/km) • ${fullData.profile?.deliveryPricing?.peakConfig?.startTime} - ${fullData.profile?.deliveryPricing?.peakConfig?.endTime}`
                            ) : "Disabled"}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Row 3: Store Graphics / Media */}
                  {fullData.shop && (getImageUrl(fullData.shop.banner) || getImageUrl(fullData.shop.logo)) && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-pink-600 font-bold text-xs uppercase tracking-wider">
                        <Eye size={16}/><span>Storefront Branding Media</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {getImageUrl(fullData.shop.banner) && (
                          <DataImage 
                            imageObj={fullData.shop.banner} 
                            label="Store Front Banner" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                        {getImageUrl(fullData.shop.logo) && (
                          <div className="max-w-xs">
                            <DataImage 
                              imageObj={fullData.shop.logo} 
                              label="Corporate Vector Logo" 
                              onImageClick={(src, label) => setLightboxImage({ src, label })} 
                            />
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Row 4: KYC Personal Identification */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                      <FileBadge size={16}/><span>KYC Personal Identification</span>
                    </div>
                    {fullData.documents?.personal && (
                      getImageUrl(fullData.documents.personal.aadharImage) || 
                      getImageUrl(fullData.documents.personal.panImage)
                    ) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {getImageUrl(fullData.documents.personal.aadharImage) && (
                          <DataImage 
                            imageObj={fullData.documents.personal.aadharImage} 
                            label="National Identification Document" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                        {getImageUrl(fullData.documents.personal.panImage) && (
                          <DataImage 
                            imageObj={fullData.documents.personal.panImage} 
                            label="Income Tax PAN Card" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-center text-xs">
                        KYC identification documents missing or unsubmitted.
                      </div>
                    )}
                  </section>

                  {/* Row 5: Corporate Business Compliance */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider">
                      <FileBadge size={16}/><span>Corporate Compliance Documentation</span>
                    </div>
                    {fullData.documents?.business && (
                      getImageUrl(fullData.documents.business.gstImage) || 
                      getImageUrl(fullData.documents.business.panImage) || 
                      getImageUrl(fullData.documents.business.tradeLicenseImage) || 
                      getImageUrl(fullData.documents.business.shopRegistrationImage)
                    ) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
                        {getImageUrl(fullData.documents.business.gstImage) && (
                          <DataImage 
                            imageObj={fullData.documents.business.gstImage} 
                            label="GSTIN Registration Certificate" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                        {getImageUrl(fullData.documents.business.panImage) && (
                          <DataImage 
                            imageObj={fullData.documents.business.panImage} 
                            label="Business PAN Mapping" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                        {getImageUrl(fullData.documents.business.tradeLicenseImage) && (
                          <DataImage 
                            imageObj={fullData.documents.business.tradeLicenseImage} 
                            label="Municipal Trade License" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                        {getImageUrl(fullData.documents.business.shopRegistrationImage) && (
                          <DataImage 
                            imageObj={fullData.documents.business.shopRegistrationImage} 
                            label="Shop & Commercial Establishment Act" 
                            onImageClick={(src, label) => setLightboxImage({ src, label })} 
                          />
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 font-bold text-center text-xs">
                        No corporate business documentation uploaded.
                      </div>
                    )}
                  </section>

                  {/* Admin Command Terminal Controls */}
                  <section className="bg-slate-900 rounded-[28px] p-7 space-y-5 text-white shadow-xl">
                    <div>
                      <h4 className="text-white text-sm font-black uppercase tracking-wider">Administrative Actions</h4>
                      <p className="text-slate-400 text-xs mt-0.5 font-medium">Update account authorization and compliance statuses</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Verify Account */}
                      <button 
                        onClick={() => updateStatus('verify', { isVerified: !editingMerchant.isVerified })}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                          editingMerchant.status === 'verified' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                        }`}
                      >
                        <ShieldCheck size={14} /> 
                        {editingMerchant.status === 'verified' ? 'Verified Active' : 'Approve & Verify'}
                      </button>

                      {/* Toggle Blue Tick */}
                      <button
                        onClick={() => handleToggleBlueTick(editingMerchant._id, editingMerchant.isBlueTickEnabled)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                          editingMerchant.isBlueTickEnabled
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
                        }`}
                      >
                        <BadgeCheck size={14} />
                        {editingMerchant.isBlueTickEnabled ? 'Revoke Blue Tick' : 'Grant Blue Tick'}
                      </button>

                      {/* Reject Application */}
                      <button 
                        onClick={handleRejectClickToggle}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                          editingMerchant.status === 'rejected' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
                        }`}
                      >
                        <AlertCircle size={14} /> 
                        {editingMerchant.status === 'rejected' ? 'Revoke Rejection' : 'Reject Partner'}
                      </button>

                      {/* Account Ban */}
                      <button 
                        onClick={() => updateStatus('block', { isBlocked: !editingMerchant.isBlocked })}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                          editingMerchant.isBlocked 
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        <Ban size={14} /> 
                        {editingMerchant.isBlocked ? 'Lift Ban' : 'Enforce Ban'}
                      </button>
                    </div>
                  </section>

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/80">
              <button 
                onClick={() => setEditingMerchant(null)} 
                className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-2xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          REJECTION FEEDBACK MODAL
         ========================================================= */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleConfirmRejectionSubmit}
            className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-slate-100"
          >
            <div className="flex items-start gap-3 text-amber-500">
              <div className="p-2 bg-amber-50 rounded-xl"><AlertCircle size={22} /></div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Reject Registration Application</h3>
                <p className="text-xs text-slate-400 mt-0.5">Specify why verification could not be granted.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Rejection Reason
              </label>
              <textarea
                required
                rows="3"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="e.g., Business document resolution is unreadable..."
                className="w-full text-xs font-semibold p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 resize-none transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={submittingAction}
                className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center cursor-pointer"
              >
                {submittingAction ? <Loader2 className="animate-spin" size={14} /> : "Submit Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          FULLSCREEN IMAGE LIGHTBOX MODAL
         ========================================================= */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Lightbox Controls Toolbar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-6xl mx-auto">
            <span className="text-white font-black text-sm uppercase tracking-wider truncate max-w-md bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
              {lightboxImage.label}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.src}
                download={`${lightboxImage.label || 'merchant-asset'}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
                title="Download Full Resolution Asset"
              >
                <Download size={18} />
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
                title="Close Fullscreen View"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scaled Image */}
          <div 
            className="w-full h-full flex items-center justify-center p-4 max-w-6xl max-h-[85vh]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxImage(null);
            }}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.label}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none animate-in zoom-in-95 duration-200"
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default MerchantsPage;