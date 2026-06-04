import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Check, X, Search, Filter, Layers, Inbox, AlertCircle, 
  Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, Info, RotateCcw
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminProductDashboard = ({ token }) => {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState("all"); // 'all' (Master Catalog) | 'queue' (Review Pipeline)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtering & Pagination Grid Control States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Review System Overlay States
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Memoize validation headers payload
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Synchronous Core Fetch Pipeline
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let response;

      if (activeTab === "queue") {
        // Enforces structural lookups on your backend review-queue endpoint
        response = await accountClient.get("/merchant/products/review-queue", {
          params: { page, limit: 10, status: "pending" },
          headers
        });
        
        setProducts(response.data.data || response.data.products || []);
      } else {
        // Hits your master admin list endpoint passing explicit query filters
        response = await accountClient.get("/merchant/products/all", {
          params: { 
            page, 
            limit: 10,
            search: searchTerm.trim() || undefined,
            approvalStatus: statusFilter === "all" ? undefined : statusFilter
          },
          headers
        });

        console.log(response.data)
        setProducts(response.data.products || response.data.data || []);
      }
      
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      console.error("BachatBazarr Data Matrix Fetch Exception:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, statusFilter, searchTerm, headers]);

  // Sync effect hooks for view state parameters
  useEffect(() => {
    setPage(1);
    fetchData();
  }, [activeTab, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // Process Item Verification States (PATCH Engine)
  const handleReviewAction = async (productId, status, reason = "") => {
    if (status === "rejected" && !reason.trim()) {
      alert("Please provide a valid reason for declining this product profile.");
      return;
    }

    try {
      setSubmittingReview(true);
      
      // Fires target state change requests straight into your router middleware parameters
      await accountClient.patch(`/merchant/products/${productId}/review`, {
        status,
        rejection_reason: reason
      }, { headers });

      setSelectedProduct(null);
      setRejectionReason("");
      
      // Refresh matching layout parameters cleanly
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Internal compliance evaluation processing failure.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 antialiased">
      
      {/* Upper Brand Info Layout Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-solid border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="text-blue-600" size={32} /> Master Catalog Control
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Evaluate merchant store additions and coordinate global listing access weights</p>
        </div>

        {/* Tab Selection Blocks */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-solid border-slate-200/60">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            Master Catalog
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${activeTab === "queue" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            Review Queue
            {activeTab !== "queue" && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive Search Matrix Filters Container */}
      {activeTab === "all" && (
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-solid border-slate-200/60">
          <div className="relative md:col-span-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search assets by string name profiles..." 
              className="w-full pl-11 pr-4 h-12 bg-white border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative md:col-span-4 bg-white border border-solid border-slate-200 rounded-xl px-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Filter size={16} className="text-slate-400" />
            <select 
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none h-full cursor-pointer py-3"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Verification Inclusions</option>
              <option value="approved">Approved Listings Only</option>
              <option value="pending">Pending Review Only</option>
              <option value="rejected">Rejected Entries Only</option>
            </select>
          </div>
          <button type="submit" className="md:col-span-2 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer">
            Filter View
          </button>
        </form>
      )}

      {/* Primary Component Data Ledger Grid Table */}
      <div className="bg-white rounded-2xl border border-solid border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-solid border-slate-100 text-slate-400">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Listing Particulars</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Price Matrix & Units</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Product Category Hierarchy</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Verification Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solid divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500" size={36} />
                    <p className="text-xs font-bold text-slate-400 mt-3 tracking-wider uppercase">Loading inventory segments...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <Inbox className="mx-auto mb-3 text-slate-300" size={44} /> 
                    <p className="text-sm font-bold text-slate-400">No product entities matched current database query fields.</p>
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product._id} className="hover:bg-slate-50/40 transition-colors">
                  
                  {/* Particulars Mapping Profile Block */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-solid border-slate-200/60 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} className="w-full h-full object-cover" alt="Display Preview" />
                        ) : (
                          <Inbox size={20} className="text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm tracking-tight">{product.name}</div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-solid border-slate-200/40 uppercase">
                          <Tag size={10} /> {product.sku || "UNASSIGNED-SKU"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Financial Layout metrics mapping info */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-900">₹{product.price}</div>
                    {product.discounted_price && (
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-solid border-emerald-100/60 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        Promo: ₹{product.discounted_price}
                      </div>
                    )}
                    <div className="text-[11px] font-medium text-slate-400 mt-1">Available: <span className="font-bold text-slate-600">{product.stock} items</span></div>
                  </td>

                  {/* Category Taxonomy mapping details */}
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-slate-700">{product.category_id?.[0]?.label || "Master Global"}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">{product.subcategory_id?.[0]?.label || "Root Leaf"}</div>
                  </td>

                  {/* Workflow Processing Badges */}
                  <td className="px-6 py-4">
                    {product.approval_status === "approved" && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-solid border-emerald-200/50 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified
                      </span>
                    )}
                    {product.approval_status === "pending" && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-solid border-amber-200/60 select-none animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending Review
                      </span>
                    )}
                    {product.approval_status === "rejected" && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-solid border-red-200/50 select-none" title={product.rejection_reason}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Declined
                      </span>
                    )}
                  </td>

                  {/* ACTIONS ENGINE RENDERING BLOCK */}
                  <td className="px-6 py-4 text-right">
                    {product.approval_status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReviewAction(product._id, "approved")}
                          className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:text-white hover:bg-emerald-500 border border-solid border-slate-200 hover:border-emerald-500 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                          title="Authorize Asset"
                        >
                          <Check size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="w-9 h-9 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 border border-solid border-slate-200 hover:border-red-500 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                          title="Decline Asset"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : product.approval_status === "approved" ? (
                      /* --- ADDED: UNVERIFY REVERSE TOGGLE BUTTON --- */
                      <div className="flex items-center justify-end">
                        <button
                          disabled={submittingReview}
                          onClick={() => handleReviewAction(product._id, "pending")}
                          className="px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 border border-solid border-slate-200 hover:border-amber-500 hover:bg-amber-50 rounded-xl transition-all bg-white cursor-pointer shadow-sm disabled:opacity-50"
                          title="Revert verification to pending review"
                        >
                          <RotateCcw size={13} strokeWidth={2.5} /> Unverify
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 border border-solid border-slate-100 px-2.5 py-1 rounded-lg select-none">
                        <Info size={12} /> Complete
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid Controller Pagination Footers */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-solid border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-sm cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-solid border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-sm cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Rejection Overlay Dialogue Panel Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 mountaineer z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-solid border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <MessageSquare size={22} />
              <h3 className="text-lg font-black tracking-tight">Rejection Feedback logs</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium -mt-2">
              Explain why <strong>{selectedProduct.name}</strong> fails platform guidelines. This contextual log feeds directly back into the merchant dashboard views.
            </p>
            
            <textarea
              rows="4"
              className="w-full text-sm px-4 py-3 bg-slate-50/50 border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 resize-none font-medium text-slate-700 transition-all"
              placeholder="e.g., Inaccurate catalog text pricing, placeholder image assets, or broken descriptions..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setSelectedProduct(null); setRejectionReason(""); }}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer border border-solid border-slate-200/40"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={submittingReview || !rejectionReason.trim()}
                onClick={() => handleReviewAction(selectedProduct._id, "rejected", rejectionReason)}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-100"
              >
                {submittingReview ? <Loader2 className="animate-spin" size={14} /> : "Decline Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductDashboard;