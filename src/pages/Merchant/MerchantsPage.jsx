import React, { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../../lib/api";
import { 
  Search, UserKeyIcon, ShieldCheck, ShieldAlert, Trash2, 
  ChevronLeft, ChevronRight, Mail, Phone, RotateCcw, X,
  Store, FileBadge, MapPin, Loader2, ExternalLink, 
  CheckCircle2, AlertCircle, Eye, Hash, Calendar, Building2, UserCircle,
  XCircle, Ban, Hammer
} from "lucide-react";

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

  // CRITICAL FIX: Retain null if image doesn't exist so parent grid components can handle hiding it entirely
  if (!src) return null;

  return (
    <div className="space-y-2 group w-full animate-in fade-in duration-300">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
        <img src={src} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={() => {
              const win = window.open();
              win.document.write(`<title>${label}</title><body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center;"><img src="${src}" style="max-width:100%; max-height:100vh; shadow: 0 0 50px rgba(0,0,0,0.5);"></body>`);
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [editingMerchant, setEditingMerchant] = useState(null);
  
  const [fullData, setFullData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Rejection Modal State Managers
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadMerchants = async () => {
    setLoading(true);
    try {
      const response = await adminClient.get("/merchants", {
        headers, params: { page, limit: 10, search }
      });
      setItems(response.data.merchants || []);
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      setFeedback("Failed to sync records.");
    } finally { setLoading(false); }
  };

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

  // Intermediate status toggle intercept engine
  const handleRejectClickToggle = () => {
    if (editingMerchant.status === "rejected") {
      updateStatus('reject', { status: 'unverified' });
    } else {
      setRejectReasonInput("");
      setIsRejectModalOpen(true);
    }
  };

  // CRITICAL NAME FIX: Matches submission handler function variable naming perfectly
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

  useEffect(() => { loadMerchants(); }, [page]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#FDFDFD] min-h-screen relative">
      
      {/* HEADER AREA */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Merchant Central
          </h1>
          <p className="text-slate-500 font-medium">Full access control & document verification suite.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border p-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="text-center px-2">
              <p className="text-[9px] font-black text-slate-400 uppercase">Page</p>
              <p className="text-sm font-black text-slate-900">{page} / {totalPages}</p>
            </div>
          </div>
          <button onClick={loadMerchants} className="p-4 bg-white border rounded-2xl hover:bg-slate-50 text-slate-600 transition shadow-sm cursor-pointer">
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
        <input 
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[24px] shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-slate-700 font-medium"
          placeholder="Search by name, email, or merchant UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadMerchants()}
        />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Merchant Profile</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Flags</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="5" className="px-8 py-20 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" size={32} /></td></tr>
            ) : items.map((m) => {
              const profileImg = getImageUrl(m.profileImage);
              return (
                <tr key={m._id} className={`hover:bg-indigo-50/30 transition-colors group ${m.isBlocked ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center overflow-hidden text-white font-black text-lg shadow-lg ${m.isBlocked ? 'bg-slate-800' : 'bg-indigo-600'}`}>
                        {profileImg ? (
                          <img src={profileImg} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          m.name?.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900">{m.name}</p>
                          {m.isBlocked && <Ban size={14} className="text-red-600" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">{m._id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><Mail size={12} className="text-slate-300"/> {m.email}</div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><Phone size={12} className="text-slate-300"/> {m.phone}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex gap-1.5">
                      {console.log(m)}
                        <div className={`w-2 h-2 rounded-full ${m.isVerified ? 'bg-emerald-500' : 'bg-slate-200'}`} title="Verified Badge"/>
                        <div className={`w-2 h-2 rounded-full ${m.isBlocked ? 'bg-red-600' : 'bg-slate-200'}`} title="Ban Status"/>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border 
                      ${m.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' : 
                        m.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        'bg-slate-50 text-slate-600 border-slate-100'}`}>
                      {m.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => fetchMerchantAudit(m)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition shadow-sm group-hover:scale-105 cursor-pointer">
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Page Control</p>
            <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2.5 bg-white border rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"><ChevronLeft size={20}/></button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2.5 bg-white border rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>

      {/* --- AUDIT SLIDE PANEL --- */}
      {editingMerchant && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setEditingMerchant(null)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-500">
            
            <div className="sticky top-0 bg-white/90 backdrop-blur z-20 p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">Audit Terminal</h2>
                  {editingMerchant.isBlocked && <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded-full font-black">BANNED</span>}
                </div>
                <p className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">UID: {editingMerchant._id}</p>
              </div>
              <button onClick={() => setEditingMerchant(null)} className="p-3 hover:bg-slate-100 rounded-full transition cursor-pointer"><X size={28}/></button>
            </div>

            <div className="p-10 space-y-12">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 text-indigo-500">
                  <Loader2 className="animate-spin" size={48} />
                  <p className="text-sm font-black uppercase tracking-[0.3em]">Decoding Documents...</p>
                </div>
              ) : fullData && (
                <div className="space-y-14 animate-in fade-in slide-in-from-bottom-10">
                  
                  {/* PROFILE & SHOP INFO */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600">
                          <UserCircle size={20}/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Account Profile</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col items-center mb-4">
                              <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                                {getImageUrl(fullData.profile.profileImage) ? (
                                  <img src={getImageUrl(fullData.profile.profileImage)} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                                    <UserCircle size={40} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <InfoField label="Full Name" value={fullData.profile.name} icon={UserCircle} />
                            <InfoField label="Email Address" value={fullData.profile.email} icon={Mail} />
                            <InfoField label="Phone Number" value={fullData.profile.phone} icon={Phone} />
                            <InfoField label="System Role" value={fullData.profile.role} icon={ShieldCheck} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-emerald-600">
                          <Building2 size={20}/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Shop Information</h3>
                        </div>
                        {fullData.shop ? (
                          <div className="grid grid-cols-1 gap-4">
                             <InfoField label="Shop Name" value={fullData.shop.shopName} icon={Store} />
                             <InfoField label="Category" value={fullData.shop.categoryId?.label} icon={Hash} />
                             <InfoField label="Sub Category" value={fullData.shop.subCategoryId?.label} icon={Hash} />
                             <InfoField label="City" value={fullData.shop.city} icon={MapPin} />
                             <InfoField label="Full Address" value={fullData.shop.address} icon={MapPin} />
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center bg-slate-50 border-2 border-dashed rounded-3xl text-slate-400 font-bold text-xs uppercase italic min-h-[160px]">No Shop Linked</div>
                        )}
                    </div>
                  </section>

                  {/* SHOP MEDIA */}
                  {fullData.shop && (
                    (getImageUrl(fullData.shop.banner) || getImageUrl(fullData.shop.logo)) ? (
                      <section className="space-y-6">
                        <div className="flex items-center gap-3 text-pink-600">
                            <Eye size={20}/>
                            <h3 className="font-black text-sm uppercase tracking-widest">Store Branding</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {getImageUrl(fullData.shop.banner) && <DataImage imageObj={fullData.shop.banner} label="Shop Banner" />}
                            {getImageUrl(fullData.shop.logo) && (
                              <div className="max-w-xs">
                                 <DataImage imageObj={fullData.shop.logo} label="Store Logo" />
                              </div>
                            )}
                        </div>
                      </section>
                    ) : null
                  )}

                  {/* PERSONAL KYC */}
                  <section className="space-y-6">
                      <div className="flex items-center gap-3 text-indigo-600">
                          <UserKeyIcon size={20}/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Personal Identification</h3>
                      </div>
                      {fullData.documents?.personal && (getImageUrl(fullData.documents.personal.aadharImage) || getImageUrl(fullData.documents.personal.panImage)) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {getImageUrl(fullData.documents.personal.aadharImage) && <DataImage imageObj={fullData.documents.personal.aadharImage} label="Aadhar Card" />}
                            {getImageUrl(fullData.documents.personal.panImage) && <DataImage imageObj={fullData.documents.personal.panImage} label="PAN Card" />}
                        </div>
                      ) : (
                        <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 font-bold text-center text-xs uppercase tracking-widest">Missing Personal Documents</div>
                      )}
                  </section>

                  {/* BUSINESS KYC */}
                  <section className="space-y-6">
                      <div className="flex items-center gap-3 text-emerald-600">
                          <FileBadge size={20}/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Business Compliance</h3>
                      </div>
                      {fullData.documents?.business && 
                      (getImageUrl(fullData.documents.business.gstImage) || 
                       getImageUrl(fullData.documents.business.panImage) || 
                       getImageUrl(fullData.documents.business.tradeLicenseImage) || 
                       getImageUrl(fullData.documents.business.fssaiImage) || 
                       getImageUrl(fullData.documents.business.shopRegistrationImage)) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                            {getImageUrl(fullData.documents.business.gstImage) && <DataImage imageObj={fullData.documents.business.gstImage} label="GST Certificate" />}
                            {getImageUrl(fullData.documents.business.panImage) && <DataImage imageObj={fullData.documents.business.panImage} label="Business PAN" />}
                            {getImageUrl(fullData.documents.business.tradeLicenseImage) && <DataImage imageObj={fullData.documents.business.tradeLicenseImage} label="Trade License" />}
                            {getImageUrl(fullData.documents.business.fssaiImage) && <DataImage imageObj={fullData.documents.business.fssaiImage} label="FSSAI License" />}
                            {getImageUrl(fullData.documents.business.shopRegistrationImage) && <DataImage imageObj={fullData.documents.business.shopRegistrationImage} label="Shop Registration" />}
                        </div>
                      ) : (
                        <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 font-bold text-center text-xs uppercase tracking-widest">Missing Business Documents</div>
                      )}
                  </section>

                  {/* ACTIONS */}
                  <section className="bg-slate-900 rounded-[40px] p-10 shadow-2xl space-y-10 border border-white/5">
                    <div className="flex flex-col gap-8">
                      <div>
                        <h3 className="text-white text-xl font-black uppercase tracking-tight">Audit Decisions</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Enforce compliance and security protocols</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         {/* VERIFY TOGGLE (isVerified) */}
                         <button 
                            onClick={() => updateStatus('verify', { isVerified: !editingMerchant.isVerified })}
                            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${editingMerchant.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}
                         >
                           <ShieldCheck size={16} /> {editingMerchant.status ==='verified' ? 'Verified' : 'Verify'}
                         </button>

                         {/* REJECT OPTION (status) -> INTERCEPTED BY DYNAMIC MODAL OVERLAY */}
                         <button 
                            onClick={handleRejectClickToggle}
                            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${editingMerchant.status === 'rejected' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                         >
                           <AlertCircle size={16} /> {editingMerchant.status === 'rejected' ? 'Restore Status' : 'Reject Shop'}
                         </button>

                         {/* BAN OPTION (isBlocked) -> CALLS /block API */}
                         <button 
                            onClick={() => updateStatus('block', { isBlocked: !editingMerchant.isBlocked })}
                            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${editingMerchant.isBlocked ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white'}`}
                         >
                           <Ban size={16} /> {editingMerchant.isBlocked ? 'Unban Account' : 'Permanent Ban'}
                         </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="p-10 border-t bg-slate-50">
                <button onClick={() => setEditingMerchant(null)} className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-100 transition shadow-sm cursor-pointer">
                  Close Audit Panel
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECTION INPUT JUSTIFICATION MODAL --- */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form 
            onSubmit={handleConfirmRejectionSubmit}
            className="bg-white border border-slate-100 p-6 rounded-[2rem] max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Reject Registration Request</h3>
                <p className="text-xs text-slate-400 mt-0.5">State the specific compliance issue causing the documentation package to fail verification.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rejection Justification</label>
              <textarea
                required
                rows="3"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="e.g., Business trade license has expired, blurry or unreadable compliance certificate image file..."
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
                className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  "Submit Rejection"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default MerchantsPage;