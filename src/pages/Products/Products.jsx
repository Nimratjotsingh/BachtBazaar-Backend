import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Check, X, Search, Filter, Layers, Inbox, AlertCircle, 
  Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, Info, 
  RotateCcw, Eye, Store, Package, Scale, Droplets, Calendar, 
  ExternalLink, IndianRupee, Image as ImageIcon, CheckCircle2, XCircle
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

  // Detailed Product Inspection Drawer State
  const [inspectedProduct, setInspectedProduct] = useState(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState(null);

  // Review System Overlay States
  const [selectedProductForRejection, setSelectedProductForRejection] = useState(null);
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
        response = await accountClient.get("/merchant/products/review-queue", {
          params: { page, limit: 10, status: "pending" },
          headers
        });
        setProducts(response.data.data || response.data.products || []);
      } else {
        response = await accountClient.get("/merchant/products/all", {
          params: { 
            page, 
            limit: 10, 
            search: searchTerm.trim() || undefined, 
            approvalStatus: statusFilter === "all" ? undefined : statusFilter 
          },
          headers
        });
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

  // Inspect Trigger (Sets product and primary active image)
  const handleOpenDetails = (product) => {
    setInspectedProduct(product);
    setActiveGalleryImage(product.thumbnail || (product.images && product.images[0]) || null);
  };

  // Process Item Verification States (PATCH Engine)
  const handleReviewAction = async (productId, status, reason = "") => {
    if (status === "rejected" && !reason.trim()) {
      alert("Please provide a valid reason for declining this product profile.");
      return;
    }

    try {
      setSubmittingReview(true);
      
      await accountClient.patch(`/merchant/products/${productId}/review`, {
        status,
        rejection_reason: reason
      }, { headers });

      // Update state locally if the product is being viewed in drawer
      if (inspectedProduct && inspectedProduct._id === productId) {
        setInspectedProduct(prev => ({
          ...prev,
          approval_status: status,
          rejection_reason: status === "rejected" ? reason : null
        }));
      }

      setSelectedProductForRejection(null);
      setRejectionReason("");
      
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Internal compliance evaluation processing failure.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto text-slate-800 antialiased font-sans">
      
      {/* Upper Brand Info Layout Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-solid border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="text-blue-600" size={32} /> Master Catalog Control
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Evaluate merchant store additions, review media assets, and verify listing accuracy.
          </p>
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

      {/* Search & Status Filters */}
      {activeTab === "all" && (
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-solid border-slate-200/60">
          <div className="relative md:col-span-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products by title or keywords..." 
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
              <option value="all">All Verification Statuses</option>
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
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-solid border-slate-100 text-slate-400">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Listing Particulars</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Price Matrix & Stock</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Category Hierarchy</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-right">Actions</th>
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
                    <p className="text-sm font-bold text-slate-400">No product entities matched current criteria.</p>
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product._id} className="hover:bg-slate-50/40 transition-colors">
                  
                  {/* Particulars */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-solid border-slate-200/60 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Inbox size={20} className="text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <button 
                          onClick={() => handleOpenDetails(product)}
                          className="font-bold text-slate-900 text-sm tracking-tight hover:text-blue-600 text-left transition-colors cursor-pointer"
                        >
                          {product.name}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-solid border-slate-200/40 uppercase">
                            <Tag size={10} /> {product.sku || "NO-SKU"}
                          </span>
                          {product.merchant_id && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              By: <strong className="text-slate-700">{product.merchant_id.businessName || product.merchant_id.name || "Merchant"}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Financial & Stock */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-900">₹{product.price}</div>
                    {product.discounted_price && (
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-solid border-emerald-100/60 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        Offer: ₹{product.discounted_price}
                      </div>
                    )}
                    <div className="text-[11px] font-medium text-slate-400 mt-1">
                      Stock: <span className="font-bold text-slate-700">{product.stock ?? 0}</span>
                    </div>
                  </td>

                  {/* Category Taxonomy */}
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-slate-700">{product.category_id?.[0]?.label || product.category_id?.[0]?.name || "Uncategorized"}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">{product.subcategory_id?.[0]?.label || product.subcategory_id?.[0]?.name || "None"}</div>
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

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenDetails(product)}
                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                        title="View Full Item Details"
                      >
                        <Eye size={16} />
                      </button>

                      {product.approval_status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleReviewAction(product._id, "approved")}
                            className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:text-white hover:bg-emerald-500 border border-slate-200 hover:border-emerald-500 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                            title="Approve Listing"
                          >
                            <Check size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => setSelectedProductForRejection(product)}
                            className="w-9 h-9 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 border border-slate-200 hover:border-red-500 rounded-xl transition-all bg-white cursor-pointer shadow-sm"
                            title="Decline Listing"
                          >
                            <X size={16} strokeWidth={2.5} />
                          </button>
                        </>
                      ) : product.approval_status === "approved" ? (
                        <button
                          disabled={submittingReview}
                          onClick={() => handleReviewAction(product._id, "pending")}
                          className="px-3 py-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-600 border border-slate-200 hover:border-amber-500 hover:bg-amber-50 rounded-xl transition-all bg-white cursor-pointer shadow-sm disabled:opacity-50"
                          title="Revert verification to pending review"
                        >
                          <RotateCcw size={13} strokeWidth={2.5} /> Unverify
                        </button>
                      ) : null}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footers */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-sm cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-sm cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FULL PRODUCT DETAILS INSPECTION MODAL DRAWER */}
      {/* ========================================================= */}
      {inspectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col justify-between animate-in zoom-in-95 duration-200">
            
            {/* Modal Sticky Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-8 py-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  inspectedProduct.approval_status === "approved"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : inspectedProduct.approval_status === "pending"
                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}>
                  {inspectedProduct.approval_status}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ID: {inspectedProduct._id}
                </span>
              </div>
              <button 
                onClick={() => setInspectedProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-8 space-y-8">
              
              {/* Product Header & Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Left: Gallery & Hero Photo */}
                <div className="md:col-span-5 space-y-3">
                  <div className="w-full h-72 rounded-2xl bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                    {activeGalleryImage ? (
                      <img 
                        src={activeGalleryImage} 
                        alt="Product Showcase" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon size={48} className="text-slate-300" />
                    )}
                  </div>

                  {/* Additional Thumbnail Strips */}
                  {inspectedProduct.images && inspectedProduct.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {inspectedProduct.thumbnail && (
                        <button
                          type="button"
                          onClick={() => setActiveGalleryImage(inspectedProduct.thumbnail)}
                          className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 cursor-pointer transition ${
                            activeGalleryImage === inspectedProduct.thumbnail
                              ? "border-blue-600 ring-2 ring-blue-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <img src={inspectedProduct.thumbnail} className="w-full h-full object-cover" alt="" />
                        </button>
                      )}
                      {inspectedProduct.images.map((imgSrc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveGalleryImage(imgSrc)}
                          className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 cursor-pointer transition ${
                            activeGalleryImage === imgSrc
                              ? "border-blue-600 ring-2 ring-blue-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <img src={imgSrc} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Primary Info, Financials & Merchant info */}
                <div className="md:col-span-7 space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                      {inspectedProduct.name}
                    </h2>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      SKU: <strong className="text-slate-700">{inspectedProduct.sku || "UNASSIGNED"}</strong>
                    </p>
                  </div>

                  {/* Pricing Matrix Highlight Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Base Price</span>
                      <div className="text-lg font-black text-slate-900 mt-0.5">₹{inspectedProduct.price}</div>
                    </div>
                    <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Offer Price</span>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">
                        {inspectedProduct.discounted_price ? `₹${inspectedProduct.discounted_price}` : "N/A"}
                      </div>
                    </div>
                    <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">In Stock</span>
                      <div className="text-lg font-black text-blue-700 mt-0.5">
                        {inspectedProduct.stock ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Merchant & Shop Reference Profile */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Store size={13} className="text-slate-500" /> Originating Merchant Information
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800 text-sm">
                          {inspectedProduct.merchant_id?.businessName || inspectedProduct.merchant_id?.name || "Independent Merchant"}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          {inspectedProduct.merchant_id?.email || "No direct email listed"} • {inspectedProduct.merchant_id?.phone || "No phone listed"}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        inspectedProduct.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}>
                        {inspectedProduct.is_active ? "Online Store" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Specifications & Categorization Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                
                {/* Physical Dimensions / Measurement */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Product Sizing & Packaging
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <Scale size={11} /> Unit Size
                      </span>
                      <strong className="text-slate-700">{inspectedProduct.unit_size || "Standard"}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <Package size={11} /> Weight
                      </span>
                      <strong className="text-slate-700">
                        {inspectedProduct.weight?.value ? `${inspectedProduct.weight.value} ${inspectedProduct.weight.unit}` : "Unspecified"}
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <Droplets size={11} /> Volume
                      </span>
                      <strong className="text-slate-700">
                        {inspectedProduct.volume?.value ? `${inspectedProduct.volume.value} ${inspectedProduct.volume.unit}` : "Unspecified"}
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <Calendar size={11} /> Date Registered
                      </span>
                      <strong className="text-slate-700">
                        {new Date(inspectedProduct.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Categorization & Taxonomy */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Category Hierarchy & Tags
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Category:</span>
                      <strong className="text-blue-600 font-black">
                        {inspectedProduct.category_id?.[0]?.label || inspectedProduct.category_id?.[0]?.name || "Master"}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Sub-Category:</span>
                      <strong className="text-slate-700 font-bold">
                        {inspectedProduct.subcategory_id?.[0]?.label || inspectedProduct.subcategory_id?.[0]?.name || "None"}
                      </strong>
                    </div>

                    {/* Tags List */}
                    {inspectedProduct.tags && inspectedProduct.tags.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Search Metadata Tags</span>
                        <div className="flex flex-wrap gap-1.5">
                          {inspectedProduct.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Description Body */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Item Description & Specifications
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {inspectedProduct.description || "No formal product description was entered by the merchant."}
                </div>
              </div>

              {/* Rejection Log Notice (If rejected) */}
              {inspectedProduct.rejection_reason && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <strong className="block font-black uppercase tracking-wider text-[10px]">Previously Declined Reason</strong>
                    <p className="mt-0.5 leading-relaxed">{inspectedProduct.rejection_reason}</p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Sticky Bottom Action Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-8 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectedProduct(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Drawer
              </button>

              <div className="flex items-center gap-3">
                {inspectedProduct.approval_status === "approved" ? (
                  <button
                    disabled={submittingReview}
                    onClick={() => handleReviewAction(inspectedProduct._id, "pending")}
                    className="px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} /> Revert To Pending
                  </button>
                ) : (
                  <>
                    <button
                      disabled={submittingReview}
                      onClick={() => setSelectedProductForRejection(inspectedProduct)}
                      className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    >
                      <X size={15} /> Decline Listing
                    </button>
                    <button
                      disabled={submittingReview}
                      onClick={() => handleReviewAction(inspectedProduct._id, "approved")}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-100"
                    >
                      {submittingReview ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                      Authorize & Publish
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECTION OVERLAY DIALOGUE MODAL */}
      {/* ========================================================= */}
      {selectedProductForRejection && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-solid border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <MessageSquare size={22} />
              <h3 className="text-lg font-black tracking-tight">Rejection Feedback Logs</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium -mt-2">
              Explain why <strong>{selectedProductForRejection.name}</strong> fails platform guidelines. This feedback is shared with the merchant.
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
                onClick={() => { setSelectedProductForRejection(null); setRejectionReason(""); }}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer border border-solid border-slate-200/40"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={submittingReview || !rejectionReason.trim()}
                onClick={() => handleReviewAction(selectedProductForRejection._id, "rejected", rejectionReason)}
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