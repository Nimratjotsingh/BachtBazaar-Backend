import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Check, X, Search, Filter, Layers, Inbox, AlertCircle, 
  Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, Info, 
  RotateCcw, Eye, Store, Package, Scale, Droplets, Calendar, 
  ExternalLink, IndianRupee, Image as ImageIcon, CheckCircle2, XCircle,
  LayoutGrid, List, Maximize2, Download, Upload, Edit3, Save, Sparkles
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminProductDashboard = ({ token }) => {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState("all"); // 'all' (Master Catalog) | 'queue' (Review Pipeline)
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'table'
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

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

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
      console.error("Data Matrix Fetch Exception:", err);
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
  const handleReviewAction = async (productId, status, reason = "", thumbnailFile = null, updatedData = {}) => {
    if (status === "rejected" && !reason.trim()) {
      alert("Please provide a valid reason for declining this product profile.");
      return;
    }

    try {
      setSubmittingReview(true);
      
      const formData = new FormData();
      formData.append("status", status);
      if (reason) formData.append("rejection_reason", reason);
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }
      if (updatedData.name) formData.append("name", updatedData.name);
      if (updatedData.description !== undefined) formData.append("description", updatedData.description);
      if (updatedData.price !== undefined) formData.append("price", updatedData.price);

      const res = await accountClient.patch(`/merchant/products/${productId}/review`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      });

      const resProduct = res.data?.product || res.data?.data;
      const updatedThumbnail = res.data?.thumbnail || resProduct?.thumbnail;

      const updatedObj = {
        ...inspectedProduct,
        approval_status: status,
        rejection_reason: status === "rejected" ? reason : null,
        ...(updatedThumbnail ? { thumbnail: updatedThumbnail } : {}),
        ...updatedData
      };

      if (inspectedProduct && inspectedProduct._id === productId) {
        setInspectedProduct(prev => ({
          ...prev,
          ...updatedObj,
          ...(updatedThumbnail ? { thumbnail: updatedThumbnail } : {})
        }));
        if (updatedThumbnail) {
          setActiveGalleryImage(updatedThumbnail);
        }
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
    <div className="p-4 sm:p-8 space-y-6 max-w-[1700px] mx-auto text-slate-800 antialiased font-sans">
      
      {/* Upper Brand Info Layout Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-solid border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="text-blue-600" size={32} /> Master Catalog Control
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Evaluate merchant store additions, review media assets, and verify listing accuracy.
          </p>
        </div>

        {/* Tab Selection Blocks */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-solid border-slate-200/60 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            Master Catalog
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === "queue" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            Review Queue
            {activeTab !== "queue" && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Search & Status Filters + Grid/Table Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-solid border-slate-200/60">
        <form onSubmit={handleSearchSubmit} className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-7">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products by title, sku, or keywords..." 
              className="w-full pl-11 pr-4 h-11 bg-white border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {activeTab === "all" && (
            <div className="relative md:col-span-3 bg-white border border-solid border-slate-200 rounded-xl px-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <Filter size={16} className="text-slate-400 shrink-0" />
              <select 
                className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none h-full cursor-pointer py-2.5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved Listings</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Declined Entries</option>
              </select>
            </div>
          )}

          <button type="submit" className="md:col-span-2 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer">
            Filter View
          </button>
        </form>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-end lg:self-center shadow-2xs">
          <button
            type="button"
            onClick={() => setDisplayMode("grid")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              displayMode === "grid" 
                ? "bg-blue-600 text-white shadow-xs" 
                : "text-slate-400 hover:text-slate-700"
            }`}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("table")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              displayMode === "table" 
                ? "bg-blue-600 text-white shadow-xs" 
                : "text-slate-400 hover:text-slate-700"
            }`}
            title="List Table View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* =========================================================
          VIEW MODE 1: RESPONSIVE GRID VIEW (PROPORTIONAL CONTAINMENT)
          ========================================================= */}
      {displayMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {loading && products.length === 0 ? (
            <div className="col-span-full py-28 text-center text-blue-600">
              <Loader2 className="animate-spin mx-auto mb-2" size={36} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading catalog products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full py-24 text-center font-bold text-slate-400 bg-white border border-dashed border-slate-200 rounded-[28px]">
              <Inbox className="mx-auto mb-3 text-slate-300" size={44} />
              <p className="text-sm">No product entities matched current criteria.</p>
            </div>
          ) : (
            products.map((product, idx) => (
              <div
                key={`${product._id || 'prod'}-${idx}`}
                onClick={() => handleOpenDetails(product)}
                className="bg-white rounded-[24px] border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Proportional Containment Box */}
                  <div className="relative w-full aspect-square sm:aspect-[4/3] bg-slate-50 flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        alt={product.name}
                      />
                    ) : (
                      <Inbox size={32} className="text-slate-300" />
                    )}

                    {/* Status Pill */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 pointer-events-none">
                      {product.approval_status === "approved" && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-2xs">
                          Verified
                        </span>
                      )}
                      {product.approval_status === "pending" && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 shadow-2xs animate-pulse">
                          Pending
                        </span>
                      )}
                      {product.approval_status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 shadow-2xs">
                          Declined
                        </span>
                      )}
                    </div>

                    {/* Fullscreen Zoom Button */}
                    {product.thumbnail && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: product.thumbnail, label: `${product.name} - Product Showcase` });
                        }}
                        className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        title="Fullscreen Image"
                      >
                        <Maximize2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div>
                      <h3 className="font-extrabold text-[#0F172A] line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                        <span>SKU: {product.sku || "UNASSIGNED"}</span>
                      </div>
                    </div>

                    {/* Financial Matrix */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-base font-black text-slate-900">₹{product.price}</span>
                        {product.discounted_price && (
                          <span className="text-xs font-bold text-emerald-600 ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                            ₹{product.discounted_price}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        Stock: <strong className="text-slate-700">{product.stock ?? 0}</strong>
                      </span>
                    </div>

                    {/* Category Hierarchy */}
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {product.category_id?.[0]?.label || product.category_id?.[0]?.name || "Uncategorized"}
                      {product.subcategory_id?.[0]?.label && ` • ${product.subcategory_id[0].label}`}
                    </div>

                    {/* Merchant Tag */}
                    {product.merchant_id && (
                      <p className="text-[11px] text-slate-500 font-medium truncate pt-1 border-t border-slate-100">
                        By: <strong className="text-slate-800">{product.merchant_id.businessName || product.merchant_id.name || "Merchant"}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="px-4 sm:px-5 pb-4 pt-1">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Eye size={12} /> Inspect
                    </span>

                    <div className="flex items-center gap-1">
                      {product.approval_status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewAction(product._id, "approved");
                            }}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition cursor-pointer"
                            title="Approve"
                          >
                            <Check size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForRejection(product);
                            }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                            title="Decline"
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </>
                      ) : product.approval_status === "approved" ? (
                        <button
                          type="button"
                          disabled={submittingReview}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReviewAction(product._id, "pending");
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition cursor-pointer"
                          title="Revert"
                        >
                          <RotateCcw size={12} className="inline mr-1" /> Unverify
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* =========================================================
            VIEW MODE 2: TABLE LIST LEDGER VIEW
            ========================================================= */
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
              <tbody className="divide-y divide-solid divide-slate-100 text-xs font-semibold">
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
                ) : (
                  products.map((product, idx) => (
                    <tr key={`${product._id || 'tbl-prod'}-${idx}`} className="hover:bg-slate-50/40 transition-colors">
                      {/* Particulars */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={() => {
                              if (product.thumbnail) {
                                setLightboxImage({ src: product.thumbnail, label: `${product.name} - Showcase` });
                              }
                            }}
                            className={`w-14 h-14 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center p-1 overflow-hidden shrink-0 ${product.thumbnail ? 'cursor-zoom-in' : ''}`}
                          >
                            {product.thumbnail ? (
                              <img src={product.thumbnail} className="w-full h-full object-contain" alt="" />
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
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
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
                          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            Offer: ₹{product.discounted_price}
                          </div>
                        )}
                        <div className="text-[11px] font-medium text-slate-400 mt-1">
                          Stock: <span className="font-bold text-slate-700">{product.stock ?? 0}</span>
                        </div>
                      </td>

                      {/* Category Taxonomy */}
                      <td className="px-6 py-4 text-xs font-medium">
                        <div className="font-bold text-slate-700">{product.category_id?.[0]?.label || product.category_id?.[0]?.name || "Uncategorized"}</div>
                        <div className="text-slate-400 mt-0.5">{product.subcategory_id?.[0]?.label || product.subcategory_id?.[0]?.name || "None"}</div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {product.approval_status === "approved" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified
                          </span>
                        )}
                        {product.approval_status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 select-none animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending Review
                          </span>
                        )}
                        {product.approval_status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 select-none" title={product.rejection_reason}>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Declined
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(product)}
                            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all bg-white cursor-pointer shadow-2xs"
                            title="View Full Item Details"
                          >
                            <Eye size={16} />
                          </button>

                          {product.approval_status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleReviewAction(product._id, "approved")}
                                className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:text-white hover:bg-emerald-500 border border-slate-200 hover:border-emerald-500 rounded-xl transition-all bg-white cursor-pointer shadow-2xs"
                                title="Approve Listing"
                              >
                                <Check size={16} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => setSelectedProductForRejection(product)}
                                className="w-9 h-9 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 border border-slate-200 hover:border-red-500 rounded-xl transition-all bg-white cursor-pointer shadow-2xs"
                                title="Decline Listing"
                              >
                                <X size={16} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : product.approval_status === "approved" ? (
                            <button
                              disabled={submittingReview}
                              onClick={() => handleReviewAction(product._id, "pending")}
                              className="px-3 py-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-600 border border-slate-200 hover:border-amber-500 hover:bg-amber-50 rounded-xl transition-all bg-white cursor-pointer shadow-2xs disabled:opacity-50"
                              title="Revert to pending"
                            >
                              <RotateCcw size={13} strokeWidth={2.5} /> Unverify
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-2xs cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-30 shadow-2xs cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FULL PRODUCT DETAILS INSPECTION MODAL DRAWER */}
      {/* ========================================================= */}
      {inspectedProduct && (
        <ProductDetailsModal
          product={inspectedProduct}
          activeGalleryImage={activeGalleryImage}
          setActiveGalleryImage={setActiveGalleryImage}
          submittingReview={submittingReview}
          token={token}
          onClose={() => setInspectedProduct(null)}
          onReviewAction={handleReviewAction}
          onOpenReject={(prod) => setSelectedProductForRejection(prod)}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
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
              className="w-full text-xs px-4 py-3 bg-slate-50/50 border border-solid border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 resize-none font-medium text-slate-700 transition-all"
              placeholder="e.g., Inaccurate catalog text pricing, placeholder image assets, or broken descriptions..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setSelectedProductForRejection(null); setRejectionReason(""); }}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer border border-solid border-slate-200/40"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={submittingReview || !rejectionReason.trim()}
                onClick={() => handleReviewAction(selectedProductForRejection._id, "rejected", rejectionReason)}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-100"
              >
                {submittingReview ? <Loader2 className="animate-spin" size={14} /> : "Decline Listing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ROOT LEVEL FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {/* ========================================================= */}
      {lightboxImage && (
        <ImageLightboxModal 
          image={lightboxImage} 
          onClose={() => setLightboxImage(null)} 
        />
      )}

    </div>
  );
};

// =========================================================
// SUB-COMPONENT: PRODUCT DETAILS MODAL WITH SUGGESTION TOGGLE BUTTON
// =========================================================
const ProductDetailsModal = ({
  product,
  activeGalleryImage,
  setActiveGalleryImage,
  submittingReview,
  token,
  onClose,
  onReviewAction,
  onOpenReject,
  onOpenLightbox
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(product.name || "");
  const [editPrice, setEditPrice] = useState(product.price || 0);
  const [editDesc, setEditDesc] = useState(product.description || "");
  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(product.thumbnail || "");
  const fileInputRef = useRef(null);

  // Suggestion Toggle States
  const [isSuggested, setIsSuggested] = useState(Boolean(product.suggestion_id));
  const [togglingSuggestion, setTogglingSuggestion] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewThumbnailFile(file);
      setThumbnailPreviewUrl(URL.createObjectURL(file));
      setActiveGalleryImage(URL.createObjectURL(file));
    }
  };

  const handleSaveAndApprove = () => {
    onReviewAction(product._id, "approved", "", newThumbnailFile, {
      name: editName.trim(),
      description: editDesc.trim(),
      price: Number(editPrice)
    });
  };

  // Toggle Global Suggestion Handler
  const handleToggleSuggestion = async () => {
    try {
      setTogglingSuggestion(true);
      const res = await accountClient.patch(`/merchant/products/${product._id}/toggle-suggestion`, {}, { headers });
      if (res.data.success) {
        setIsSuggested(res.data.data.isSuggested);
        alert(res.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update global suggestion catalog.");
    } finally {
      setTogglingSuggestion(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col justify-between animate-in zoom-in-95 duration-200">
        
        {/* Modal Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
              product.approval_status === "approved"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : product.approval_status === "pending"
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {product.approval_status}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ID: {product._id}
            </span>
          </div>

          {/* NEW: Toggle Global Suggestion Button in Header */}
          <button
            type="button"
            disabled={togglingSuggestion}
            onClick={handleToggleSuggestion}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-2xs border ${
              isSuggested 
                ? "bg-purple-600 text-white border-purple-700 hover:bg-purple-700" 
                : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            }`}
            title="Publish or unpublish from global product suggestions"
          >
            {togglingSuggestion ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
            {isSuggested ? "In Global Suggestions" : "Copy to Suggestions"}
          </button>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
          
          {/* Product Header & Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* Left: Gallery & Hero Photo with Replace Thumbnail capability */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-3 shadow-inner group">
                {thumbnailPreviewUrl ? (
                  <img 
                    src={thumbnailPreviewUrl} 
                    alt="Product Showcase" 
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => onOpenLightbox(thumbnailPreviewUrl, `${product.name} - Showcase`)}
                  />
                ) : (
                  <ImageIcon size={48} className="text-slate-300" />
                )}

                {/* Edit & Replace Thumbnail Button */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-lg"
                  >
                    <Upload size={12} /> {newThumbnailFile ? "Staged" : "Replace Image"}
                  </button>

                  {thumbnailPreviewUrl && (
                    <button
                      type="button"
                      onClick={() => onOpenLightbox(thumbnailPreviewUrl, `${product.name} - Showcase`)}
                      className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition cursor-pointer shadow-lg"
                      title="Fullscreen Preview"
                    >
                      <Maximize2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Additional Thumbnail Strips */}
              {product.images && product.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.thumbnail && (
                    <button
                      key="thumb-main"
                      type="button"
                      onClick={() => setActiveGalleryImage(product.thumbnail)}
                      className={`w-14 h-14 rounded-xl border p-1 overflow-hidden shrink-0 cursor-pointer transition ${
                        activeGalleryImage === product.thumbnail
                          ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <img src={product.thumbnail} className="w-full h-full object-contain" alt="" />
                    </button>
                  )}
                  {product.images.map((imgSrc, idx) => (
                    <button
                      key={`thumb-img-${idx}`}
                      type="button"
                      onClick={() => setActiveGalleryImage(imgSrc)}
                      className={`w-14 h-14 rounded-xl border p-1 overflow-hidden shrink-0 cursor-pointer transition ${
                        activeGalleryImage === imgSrc
                          ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <img src={imgSrc} className="w-full h-full object-contain" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Primary Info, Financials & Merchant info */}
            <div className="md:col-span-7 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Product Details & Quick Editing
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} /> {isEditing ? "Lock Fields" : "Edit Title & Price"}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-3 p-4 bg-blue-50/40 rounded-2xl border border-blue-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-900 uppercase">Product Title</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-900 uppercase">Base Price (₹)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {editName || product.name}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    SKU: <strong className="text-slate-700">{product.sku || "UNASSIGNED"}</strong>
                  </p>
                </div>
              )}

              {/* Pricing Matrix Highlight Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Base Price</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">₹{editPrice || product.price}</div>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Offer Price</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                    {product.discounted_price ? `₹${product.discounted_price}` : "N/A"}
                  </div>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">In Stock</span>
                  <div className="text-base sm:text-lg font-black text-blue-700 mt-0.5">
                    {product.stock ?? 0}
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
                      {product.merchant_id?.businessName || product.merchant_id?.name || "Independent Merchant"}
                    </p>
                    <p className="text-slate-400 text-[11px] font-medium">
                      {product.merchant_id?.email || "No email"} • {product.merchant_id?.phone || "No phone"}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {product.is_active ? "Online Store" : "Offline"}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Specifications & Categorization Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Physical Dimensions */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Product Sizing & Packaging
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <Scale size={11} /> Unit Size
                  </span>
                  <strong className="text-slate-700">{product.unit_size || "Standard"}</strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <Package size={11} /> Weight
                  </span>
                  <strong className="text-slate-700">
                    {product.weight?.value ? `${product.weight.value} ${product.weight.unit}` : "Unspecified"}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <Droplets size={11} /> Volume
                  </span>
                  <strong className="text-slate-700">
                    {product.volume?.value ? `${product.volume.value} ${product.volume.unit}` : "Unspecified"}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <Calendar size={11} /> Registered Date
                  </span>
                  <strong className="text-slate-700">
                    {new Date(product.createdAt).toLocaleDateString("en-IN", {
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
                    {product.category_id?.[0]?.label || product.category_id?.[0]?.name || "Master"}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Sub-Category:</span>
                  <strong className="text-slate-700 font-bold">
                    {product.subcategory_id?.[0]?.label || product.subcategory_id?.[0]?.name || "None"}
                  </strong>
                </div>

                {/* Tags List */}
                {product.tags && product.tags.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Search Metadata Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag, i) => (
                        <span key={`tag-${i}`} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
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
            <div className="flex justify-between items-center">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Item Description & Specifications
              </h4>
            </div>
            {isEditing ? (
              <textarea
                rows={4}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full p-3 bg-blue-50/40 border border-blue-200 rounded-2xl text-xs text-slate-800 font-medium outline-none resize-none"
              />
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                {editDesc || product.description || "No formal product description was entered by the merchant."}
              </div>
            )}
          </div>

          {/* Rejection Log Notice */}
          {product.rejection_reason && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div>
                <strong className="block font-black uppercase tracking-wider text-[10px]">Previously Declined Reason</strong>
                <p className="mt-0.5 leading-relaxed">{product.rejection_reason}</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Bottom Action Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Drawer
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {product.approval_status === "approved" ? (
              <button
                disabled={submittingReview}
                onClick={() => onReviewAction(product._id, "pending")}
                className="px-4 sm:px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Revert To Pending
              </button>
            ) : (
              <>
                <button
                  disabled={submittingReview}
                  onClick={() => onOpenReject(product)}
                  className="px-4 sm:px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                >
                  <X size={15} /> Decline Listing
                </button>
                <button
                  disabled={submittingReview}
                  onClick={() => {
                    if (isEditing || newThumbnailFile) {
                      handleSaveAndApprove();
                    } else {
                      onReviewAction(product._id, "approved");
                    }
                  }}
                  className="px-5 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-100"
                >
                  {submittingReview ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                  {isEditing || newThumbnailFile ? "Save Edits & Authorize" : "Authorize & Publish"}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: FULLSCREEN IMAGE LIGHTBOX MODAL
// =========================================================
const ImageLightboxModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Lightbox Controls Top Toolbar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-5xl mx-auto">
        <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-[200px] sm:max-w-md bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
          {image.label || "Product Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="product-showcase.jpg"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Download Graphic"
          >
            <Download size={16} />
          </a>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10 cursor-pointer"
            title="Close Fullscreen View"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scaled Center Image Fitted for Handheld & Desktop Screens */}
      <div 
        className="w-full h-full flex items-center justify-center p-2 sm:p-4 max-w-[95vw] sm:max-w-5xl max-h-[80vh]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={image.src}
          alt={image.label}
          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none animate-in zoom-in-95 duration-200"
        />
      </div>
    </div>
  );
};

export default AdminProductDashboard;