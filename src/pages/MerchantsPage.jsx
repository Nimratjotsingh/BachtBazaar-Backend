import React, { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../lib/api";
import { 
  Search, UserKeyIcon, ShieldCheck, ShieldAlert, Trash2, 
  ChevronLeft, ChevronRight, Mail, Phone, RotateCcw, X,
  Store, FileText, BadgeCheck, MapPin, Clock
} from "lucide-react";

function MerchantsPage({ token }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [editingMerchant, setEditingMerchant] = useState(null);
  
  // New States for Detail Modal
  const [selectedMerchantData, setSelectedMerchantData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadMerchants = async () => {
    setLoading(true);
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

  // 🔥 New Function: Fetch all merchant data for popup
  const viewMerchantDetails = async (id) => {
    setDetailsLoading(true);
    setFeedback("");
    try {
      // Calling your new "load all data" API
      const response = await adminClient.get(`/merchants/${id}`, { headers });
      setSelectedMerchantData(response.data.data);
    } catch (err) {
      setFeedback("Could not load merchant details");
    } finally {
      setDetailsLoading(false);
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
      setEditingMerchant(null);
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
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-sky-900 tracking-tight">Merchant Directory</h1>
          <p className="text-sky-500 font-medium">Click a merchant to view full business & KYC details.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex gap-4">
        <form onSubmit={submitSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchants..."
          />
        </form>
        <button onClick={loadMerchants} className="p-2.5 bg-white border border-sky-100 text-sky-600 rounded-xl"><RotateCcw size={20} /></button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sky-50/50 border-b border-sky-100">
              <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase">Merchant Profile</th>
              <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-sky-900 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {items.map((merchant) => (
              <tr key={merchant._id} className="hover:bg-sky-50/50 transition-colors cursor-pointer group" onClick={() => viewMerchantDetails(merchant._id)}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold">
                      {merchant.name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <p className="font-bold text-sky-900">{merchant.name || "Unnamed"}</p>
                      <p className="text-xs text-sky-400">{merchant.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${merchant.isVerified ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {merchant.isVerified ? "Verified" : "Pending"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={(e) => { e.stopPropagation(); setEditingMerchant(merchant); }} className="p-2 text-sky-400 hover:bg-sky-50 rounded-lg">
                    <UserKeyIcon size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔥 FULL DATA MODAL POPUP */}
      {selectedMerchantData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-sky-950/60 backdrop-blur-md" onClick={() => setSelectedMerchantData(null)} />
          
          <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-sky-50 flex justify-between items-center bg-sky-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white font-black text-xl">
                  {selectedMerchantData.profile.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-sky-900">{selectedMerchantData.profile.name}</h2>
                  <p className="text-xs text-sky-500 font-mono">ID: {selectedMerchantData.profile._id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMerchantData(null)} className="p-2 hover:bg-white rounded-full text-sky-300 transition">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* 1. Shop Info */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <Store size={14} /> Shop Details
                  </h3>
                  {selectedMerchantData.shop ? (
                    <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 space-y-3">
                      <p className="font-bold text-sky-900 text-lg">{selectedMerchantData.shop.shopName}</p>
                      <div className="text-xs text-sky-600 flex items-center gap-2">
                         <MapPin size={12}/> {selectedMerchantData.shop.address}, {selectedMerchantData.shop.city}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] bg-white px-2 py-1 rounded border border-sky-100 text-sky-600 font-bold">
                          {selectedMerchantData.shop.categoryId?.label || "No Category"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No shop registered yet.</p>
                  )}
                </div>

                {/* 2. KYC Status */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Documentation
                  </h3>
                  <div className="space-y-2">
                    <StatusItem label="Personal Docs" exists={selectedMerchantData.kycStatus.personal} />
                    <StatusItem label="Business Docs" exists={selectedMerchantData.kycStatus.business} />
                    <StatusItem label="Shop Profile" exists={selectedMerchantData.kycStatus.shop} />
                  </div>
                </div>

                {/* 3. Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <BadgeCheck size={14} /> Account Meta
                  </h3>
                  <div className="text-sm space-y-2">
                    <p className="flex items-center gap-2 text-sky-900 font-medium"><Mail size={14} className="text-sky-300"/> {selectedMerchantData.profile.email || "N/A"}</p>
                    <p className="flex items-center gap-2 text-sky-900 font-medium"><Phone size={14} className="text-sky-300"/> {selectedMerchantData.profile.phone}</p>
                    <p className="text-xs text-sky-400 mt-2">Member since: {new Date(selectedMerchantData.profile.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Document Numbers Section */}
              <div className="pt-6 border-t border-sky-50">
                <h3 className="text-sm font-bold text-sky-900 mb-4">Verification IDs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <IDBox label="Aadhaar" value={selectedMerchantData.documents.personal?.aadharNumber} />
                   <IDBox label="PAN (Personal)" value={selectedMerchantData.documents.personal?.panNumber} />
                   <IDBox label="GSTIN" value={selectedMerchantData.documents.business?.gstNumber} />
                   <IDBox label="PAN (Business)" value={selectedMerchantData.documents.business?.panNumber} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-sky-50 flex justify-end gap-3">
               <button onClick={() => setSelectedMerchantData(null)} className="px-6 py-2 text-sky-600 font-bold hover:bg-white rounded-xl transition">Close</button>
               <button 
                  onClick={() => {
                    const id = selectedMerchantData.profile._id;
                    const verified = selectedMerchantData.profile.isVerified;
                    runAction(() => adminClient.put(`/merchants/${id}/verify`, { isVerified: !verified }, { headers }));
                    setSelectedMerchantData(null);
                  }}
                  className={`px-6 py-2 rounded-xl font-bold shadow-lg transition ${selectedMerchantData.profile.isVerified ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'}`}
                >
                  {selectedMerchantData.profile.isVerified ? "Revoke Verification" : "Approve Merchant"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for fetching details */}
      {detailsLoading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/20 backdrop-blur-[2px]">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Your Existing Sidebar Quick Edit Panel code remains below... */}
    </div>
  );
}

// Helper Components
const StatusItem = ({ label, exists }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
    <span className="text-xs font-bold text-slate-600">{label}</span>
    {exists ? <BadgeCheck className="text-green-500" size={16} /> : <X className="text-red-300" size={16} />}
  </div>
);

const IDBox = ({ label, value }) => (
  <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
    <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xs font-mono font-bold text-sky-900">{value || "---"}</p>
  </div>
);

export default MerchantsPage;