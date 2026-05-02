import React, { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../../lib/api";
import { 
  Search, UserKeyIcon, ShieldCheck, ShieldAlert, Trash2, 
  ChevronLeft, ChevronRight, Mail, Phone, RotateCcw, X,
  Store, FileBadge, MapPin, Loader2, ExternalLink, 
  CheckCircle2, AlertCircle, Eye, Hash, Calendar, Building2, UserCircle
} from "lucide-react";

// --- Helper: Convert Buffer to Base64 ---
const getImageUrl = (imageObj) => {
  if (!imageObj || !imageObj.data || !imageObj.data.data) return null;
  // Convert the array of numbers from the Buffer to a base64 string
  const base64String = btoa(
    new Uint8Array(imageObj.data.data).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );
  return `data:${imageObj.contentType};base64,${base64String}`;
};

// --- Sub-Component: Image Display ---
const DataImage = ({ imageObj, label, fallbackIcon: Icon }) => {
  const src = getImageUrl(imageObj);

  if (!src) return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
      <Icon size={24} className="mb-2 opacity-50" />
      <span className="text-[10px] font-bold uppercase tracking-tighter">No {label}</span>
    </div>
  );

  return (
    <div className="space-y-2 group">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
        <img src={src} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={() => {
              const win = window.open();
              win.document.write(`<title>${label}</title><body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center;"><img src="${src}" style="max-width:100%; max-height:100vh; shadow: 0 0 50px rgba(0,0,0,0.5);"></body>`);
            }}
            className="p-2 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform shadow-xl"
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
      console.log(response.data)
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

  useEffect(() => { loadMerchants(); }, [page]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#FDFDFD] min-h-screen">
      
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
          <button onClick={loadMerchants} className="p-4 bg-white border rounded-2xl hover:bg-slate-50 text-slate-600 transition shadow-sm">
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
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">KYC Progress</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="5" className="px-8 py-20 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" size={32} /></td></tr>
            ) : items.map((m) => (
              <tr key={m._id} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">
                      {m.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{m.name}</p>
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
                      <div className={`w-2 h-2 rounded-full ${m.isVerified ? 'bg-emerald-500' : 'bg-slate-200'}`} title="Verified Status"/>
                      <div className={`w-2 h-2 rounded-full ${m.status !== 'rejected' ? 'bg-indigo-500' : 'bg-red-500'}`} title="Account Status"/>
                   </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${m.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    {m.status || 'Active'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => fetchMerchantAudit(m)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition shadow-sm group-hover:scale-105">
                    <Eye size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Page Control</p>
            <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2.5 bg-white border rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-30 transition"><ChevronLeft size={20}/></button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2.5 bg-white border rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-30 transition"><ChevronRight size={20}/></button>
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
                <h2 className="text-2xl font-black text-slate-900 uppercase">Audit Terminal</h2>
                <p className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">UID: {editingMerchant._id}</p>
              </div>
              <button onClick={() => setEditingMerchant(null)} className="p-3 hover:bg-slate-100 rounded-full transition"><X size={28}/></button>
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
                          <div className="h-full flex items-center justify-center bg-slate-50 border-2 border-dashed rounded-3xl text-slate-400 font-bold text-xs uppercase italic">No Shop Linked</div>
                        )}
                    </div>
                  </section>

                  {/* SHOP MEDIA */}
                  {fullData.shop && (
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 text-pink-600">
                          <Eye size={20}/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Store Branding</h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <DataImage imageObj={fullData.shop.banner} label="Shop Banner" fallbackIcon={Store} />
                          <div className="max-w-xs">
                             <DataImage imageObj={fullData.shop.logo} label="Store Logo" fallbackIcon={Store} />
                          </div>
                      </div>
                    </section>
                  )}

                  {/* PERSONAL KYC */}
                  <section className="space-y-6">
                      <div className="flex items-center gap-3 text-indigo-600">
                          <UserKeyIcon size={20}/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Personal Identification</h3>
                      </div>
                      {fullData.documents.personal ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <DataImage imageObj={fullData.documents.personal.aadharImage} label="Aadhar Card" fallbackIcon={FileBadge} />
                            <DataImage imageObj={fullData.documents.personal.panImage} label="PAN Card" fallbackIcon={FileBadge} />
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
                      {fullData.documents.business ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            <DataImage imageObj={fullData.documents.business.gstImage} label="GST Certificate" fallbackIcon={Building2} />
                            <DataImage imageObj={fullData.documents.business.panImage} label="Business PAN" fallbackIcon={Building2} />
                            <DataImage imageObj={fullData.documents.business.tradeLicenseImage} label="Trade License" fallbackIcon={Building2} />
                            <DataImage imageObj={fullData.documents.business.fssaiImage} label="FSSAI License" fallbackIcon={Building2} />
                            <DataImage imageObj={fullData.documents.business.shopRegistrationImage} label="Shop Registration" fallbackIcon={Building2} />
                        </div>
                      ) : (
                        <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 font-bold text-center text-xs uppercase tracking-widest">Missing Business Documents</div>
                      )}
                  </section>

                  {/* ACTIONS */}
                  <section className="bg-slate-900 rounded-[40px] p-10 shadow-2xl space-y-10 border border-white/5">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div>
                        <h3 className="text-white text-xl font-black uppercase tracking-tight">Audit Decisions</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Review results and enforce platform rules</p>
                      </div>
                      <div className="flex gap-3">
                         <button 
                            onClick={() => updateStatus('verify', { isVerified: !editingMerchant.isVerified })}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${editingMerchant.isVerified ? 'bg-white/10 text-white border border-white/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105'}`}
                         >
                           <ShieldCheck size={18} /> {editingMerchant.isVerified ? 'Revoke Verified' : 'Verify Merchant'}
                         </button>
                         <button 
                            onClick={() => updateStatus('status', { status: editingMerchant.status === 'rejected' ? 'verified' : 'rejected' })}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${editingMerchant.status === 'rejected' ? 'bg-emerald-500 text-white' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'}`}
                         >
                           <ShieldAlert size={18} /> {editingMerchant.status === 'rejected' ? 'Unban Account' : 'Ban Merchant'}
                         </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="p-10 border-t bg-slate-50">
                <button onClick={() => setEditingMerchant(null)} className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-100 transition shadow-sm">
                  Close Audit Panel
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MerchantsPage;