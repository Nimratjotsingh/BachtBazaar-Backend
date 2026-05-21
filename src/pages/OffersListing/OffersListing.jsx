import React, { useState, useEffect, useMemo } from "react";
import { 
  Tag, Percent, ShieldCheck, Search, Filter, Layers, Inbox, 
  AlertCircle, Eye, Loader2, ChevronLeft, ChevronRight, 
  Store, User, Mail, Phone, MapPin, Calendar, Clock, ExternalLink, X,EyeOff,
  Sliders
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api"; // Your Axios setup

const AdminOffersDashboard = ({ token }) => {
  // Navigation & Data View States
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  
  // Pagination & Filtering State Metrics
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // 'all', 'active', 'expired'
  const [displayFilter, setDisplayFilter] = useState("all"); // 'all', 'banner', 'calendar'

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Trigger catalog fetch whenever structural filters, pagination, or search forms commit changes
  useEffect(() => {
    fetchOffers();
  }, [page, statusTab, displayFilter, appliedSearch]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await accountClient.get("/offers/admin/master-list", {
        params: { 
          page, 
          limit: 8, 
          search: appliedSearch, 
          display_type: displayFilter, 
          status: statusTab === "all" ? undefined : statusTab 
        },
        headers
      });
      console.log(response.data)
      setOffers(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Master catalog breakdown:", err);
    } finally {
      setLoading(false);
    }
  };

  // Drill down lookup fetching complete combined campaign + merchant profiles
  const handleSelectOffer = async (offerId) => {
    try {
      setDetailLoading(true);
      const response = await accountClient.get(`/offers/admin/detail/${offerId}`, { headers });
      setSelectedOffer(response.data.data);
    } catch (err) {
      alert("Failed to load cross-linked merchant asset details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchTerm);
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-[1800px] mx-auto text-slate-800 antialiased min-h-screen bg-slate-50/50">
      
      {/* Top Banner Branding Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-blue-100/60 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2.5 tracking-tight">
            <Tag className="text-blue-600 w-8 h-8" /> Campaign Oversight Control
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Audit global merchant marketing assets, runtime dates, and transactional parameters</p>
        </div>

        {/* Dynamic State Tab selectors */}
        <div className="flex bg-blue-950/5 p-1 rounded-xl border border-blue-950/5 shadow-inner backdrop-blur">
          {["all", "active", "expired"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setStatusTab(tab); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${statusTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-blue-950"}`}
            >
              {tab} Campaigns
            </button>
          ))}
        </div>
      </div>

      {/* Control Utility Toolbar Panel */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search campaigns by headline titles or tag descriptors..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-100 rounded-xl">
          <Filter size={14} className="text-slate-400" />
          <select 
            className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none py-2.5 cursor-pointer"
            value={displayFilter}
            onChange={(e) => { setDisplayFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Placement Layouts</option>
            <option value="banner">Top Banners Only</option>
            <option value="calendar">Calendar Slots Only</option>
          </select>
        </div>
        <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-100 cursor-pointer">
          Execute Filter Queues
        </button>
      </form>

      {/* Main Split Layout Matrix Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Left Hand: Master Directory Queue List */}
        <div className={`xl:col-span-2 space-y-4 transition-all duration-300`}>
          <div className="bg-white rounded-[24px] border border-blue-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-50/40 border-b border-blue-100">
                    <th className="px-6 py-4 text-xs font-bold text-blue-950 uppercase tracking-wider">Promotional Campaign</th>
                    <th className="px-6 py-4 text-xs font-bold text-blue-950 uppercase tracking-wider">Merchant Partner</th>
                    <th className="px-6 py-4 text-xs font-bold text-blue-950 uppercase tracking-wider">Layout Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-blue-950 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="py-24 text-center">
                        <Loader2 className="animate-spin mx-auto text-blue-500 w-10 h-10" />
                      </td>
                    </tr>
                  ) : offers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-24 text-center text-slate-400 font-medium">
                        <Inbox className="mx-auto mb-2 opacity-30 w-12 h-12" /> No campaign data found matches active filtering metrics.
                      </td>
                    </tr>
                  ) : offers.map((offer) => {
                    const isSelected = selectedOffer?._id === offer._id;
                    return (
                      <tr 
                        key={offer._id} 
                        onClick={() => handleSelectOffer(offer._id)}
                        className={`cursor-pointer transition-colors group ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/60"}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                              {offer.thumbnail ? (
                                <img src={offer.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="offer asset" />
                              ) : (
                                <Percent className="text-slate-400 w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-blue-950 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">{offer.title}</div>
                              <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                                <Clock size={12} /> Live: {formatTimestamp(offer.start_date)} - {formatTimestamp(offer.end_date)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                            <Store size={13} className="text-slate-400" /> {offer.merchant_id?.store_name || "Unknown Business"}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{offer.merchant_id?.email || "N/A"}</div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${offer.display_type === 'calendar' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-cyan-600 bg-cyan-50 border-cyan-100'}`}>
                            {offer.display_type}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-blue-600 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all shadow-sm">
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Pagination Footers */}
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-semibold text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Hand Side Details Drawer Panel */}
        <div className="xl:col-span-1">
          {detailLoading ? (
            <div className="bg-white rounded-[32px] border border-blue-100 p-12 text-center shadow-xl h-[500px] flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8 mb-2" />
              <p className="text-slate-400 text-sm font-medium">Resolving complete database profile mapping...</p>
            </div>
          ) : selectedOffer ? (
            <div className="bg-white rounded-[32px] border border-blue-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-5 duration-300 sticky top-6">
              
              {/* Drawer Top Branding Header */}
              <div className="p-5 bg-gradient-to-r from-blue-900 to-blue-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-blue-400" />
                  <h3 className="font-extrabold text-sm tracking-wide uppercase">Inspection Desk Panel</h3>
                </div>
                <button 
                  onClick={() => setSelectedOffer(null)} 
                  className="p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer text-blue-200 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto">
                
                {/* 1. Primary Banner Media Mock Preview Card */}
                <div className="space-y-3">
                  <div className="w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative group">
                    {selectedOffer.thumbnail ? (
                      <img src={selectedOffer.thumbnail} className="w-full h-full object-cover" alt="Campaign artwork" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400"><Percent size={32} /></div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-blue-950 leading-tight">{selectedOffer.title}</h4>
                    <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{selectedOffer.description || "No supplemental descriptions file configured for this run."}</p>
                  </div>
                </div>

                {/* 2. Campaign Parameters Matrix Metadata Specs */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                    <Sliders size={13} /> Campaign Configuration Parameters
                  </div>
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-medium mb-0.5">Discount Percentage</span>
                      <span className="font-extrabold text-slate-800 text-sm">{selectedOffer.discount_percentage ? `${selectedOffer.discount_percentage}%` : "N/A"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-medium mb-0.5">Flat Value Drop</span>
                      <span className="font-extrabold text-slate-800 text-sm">{selectedOffer.discount_value ? `₹${selectedOffer.discount_value}` : "N/A"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-medium mb-0.5">Min Basket Spend</span>
                      <span className="font-extrabold text-slate-800 text-sm">₹{selectedOffer.minimum_purchase_amount || 0}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-medium mb-0.5">Reward Logic Metric</span>
                      <span className="font-bold text-blue-600 truncate block mt-0.5">{selectedOffer.offer_type_id?.label || "General Deal"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Deep Parent Merchant Entity Identification File */}
                <div className="border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-950 font-bold text-xs uppercase tracking-wider">
                      <Store size={14} className="text-blue-600" /> Merchant Partner Profile
                    </div>
                    {selectedOffer.merchant_id?.is_verified && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">
                        <ShieldCheck size={10} /> Verified
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-3.5 text-xs text-slate-600 bg-white">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 uppercase shadow-inner">
                        {selectedOffer.merchant_id?.store_name?.substring(0, 2) || "M"}
                      </div>
                      <div>
                        <div className="font-black text-blue-950 text-sm">{selectedOffer.merchant_id?.store_name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <User size={10} /> Contact Owner: {selectedOffer.merchant_id?.owner_name || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 font-medium">
                      <div className="flex items-center gap-2.5 hover:text-blue-600 transition-colors">
                        <Mail size={13} className="text-slate-400" />
                        <span>{selectedOffer.merchant_id?.email || "No email profile registered."}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Phone size={13} className="text-slate-400" />
                        <span>{selectedOffer.merchant_id?.contact_phone || "N/A"}</span>
                      </div>
                      {selectedOffer.merchant_id?.alternative_phone && (
                        <div className="flex items-center gap-2.5 pl-5 text-slate-400">
                          <span>Alt: {selectedOffer.merchant_id.alternative_phone}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2.5 leading-relaxed">
                        <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{selectedOffer.merchant_id?.address || "No physical physical storefront mapping configured."}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-medium flex justify-between items-center">
                      <span>Onboarded: {formatTimestamp(selectedOffer.merchant_id?.createdAt)}</span>
                      <span className="uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px]">{selectedOffer.merchant_id?.business_type || "Retail"}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-100/50 rounded-[32px] border-2 border-dashed border-slate-200 p-12 text-center h-[400px] flex flex-col items-center justify-center text-slate-400">
              <EyeOff className="mb-2 opacity-40 w-10 h-10" />
              <h4 className="font-bold text-slate-500 text-sm">No Active Inspector File Selected</h4>
              <p className="text-xs max-w-xs mt-1">Select any row card template on the left table directory to audit detailed campaign and corporate variables.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminOffersDashboard;