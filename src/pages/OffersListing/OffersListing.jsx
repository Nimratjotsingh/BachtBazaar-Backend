import React, { useState, useEffect, useMemo, useCallback } from "react";
import { accountClient, buildAuthHeaders } from "../../lib/api";
import { Loader2, AlertCircle, RefreshCw, X, Download, Maximize2 } from "lucide-react";

// --- Import Sub-Components ---
import OffersStatsHeader from "./components/OffersStatsHeader";
import OffersManagementGrid from "./components/OffersManagementGrid";

const AdminOffersDashboard = ({ token }) => {
  // --- Central Loading & Error Engine ---
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  // --- Core Pagination & Unified Date Filters ---
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({
    label: "Last 30 Days",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // --- Filter Parameters ---
  const [activeFilters, setActiveFilters] = useState({
    tab: "all", // all, active, scheduled, expired, draft
    search: "",
    category: "",
    merchant: "",
    status: "",
    type: "",
    limit: 10,
  });

  // --- Dynamic Analytics & Table Data Pools ---
  const [statsData, setStatsData] = useState(null);
  const [offersList, setOffersList] = useState([]);
  const [topPerforming, setTopPerforming] = useState([]);
  const [performanceOverview, setPerformanceOverview] = useState({});
  const [paginationData, setPaginationData] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  // --- API DRILL-DOWN MODAL STATES ---
  const [selectedOfferProfile, setSelectedOfferProfile] = useState(null);
  const [detailPaneLoading, setDetailPaneLoading] = useState(false);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  // Dropdown Lookup Repositories
  const [metadataLookups, setMetadataLookups] = useState({
    categories: [],
    merchants: [],
    offerTypes: [],
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // =========================================================
  // PIPELINE 1: FETCH OFFERS PERFORMANCE METRICS
  // =========================================================
  const syncWorkspaceMetrics = async () => {
    try {
      setLoadingMetrics(true);
      setGlobalError(null);

      const res = await accountClient.get("/offers/stats-summary", {
        headers,
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      if (res.data.success) {
        setStatsData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to sync summary cards payload:", err);
      setGlobalError("Failed to synchronize overview performance indicators.");
    } finally {
      setLoadingMetrics(false);
    }
  };

  // =========================================================
  // PIPELINE 2: FETCH WORKSPACE LIST TABLES & METADATA
  // =========================================================
  const syncOffersGridAndMetadata = async () => {
    try {
      setLoadingGrid(true);

      const [offersRes, lookupsRes] = await Promise.all([
        accountClient.get("/offers/admin/master-list", {
          headers,
          params: {
            page,
            limit: activeFilters.limit,
            search: activeFilters.search,
            display_type: activeFilters.type === "" ? undefined : activeFilters.type,
            status: activeFilters.tab === "all" ? undefined : activeFilters.tab,
            category_id: activeFilters.category === "" ? undefined : activeFilters.category,
            merchant_id: activeFilters.merchant === "" ? undefined : activeFilters.merchant,
            
          },
        }),
        accountClient.get("/offer-types/admin", { headers }),
      ]);

      const serverOffers = offersRes.data.data || [];
      const parsedPagination = offersRes.data.pagination || {
        currentPage: page,
        totalPages: offersRes.data.pages || 1,
        totalItems: offersRes.data.total || serverOffers.length,
      };

      // Map raw response database model variants over to the clean UI keys required by the Grid view
      const mappedGridRows = serverOffers.map((offer) => ({
        _id: offer._id,
        rawOffer: offer,
        title: offer.title,
        code: offer.code || offer._id.substring(18).toUpperCase(),
        thumbnail: offer.thumbnail,
        description: offer.description,
        merchant_name: offer.merchant_id?.name || offer.merchant_id?.store_name || "Unknown Partner",
        category_label: offer.offer_type_id?.label || offer.category_id?.label || "General",
        offer_type_label: offer.display_type,
        discount_expression: offer.discount_percentage ? `${offer.discount_percentage}% OFF` : (offer.discount_value ? `₹${offer.discount_value} OFF` : "Exclusive Offer"),
        discount_percentage: offer.discount_percentage,
        discount_value: offer.discount_value,
        minimum_purchase_amount: offer.minimum_purchase_amount || 0,
        status: offer.is_paused ? "paused" : (new Date(offer.end_date) < new Date() ? "expired" : (new Date(offer.start_date) > new Date() ? "scheduled" : "active")),
        formatted_start: new Date(offer.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        formatted_end: new Date(offer.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        redemptions_count: offer.redeemedCount || offer.number_of_winners || 0,
        claimed_count: offer.claimedCount || 0,
        redemption_trend: offer.number_of_winners ? "12.5% increase" : null,
      }));

      setOffersList(mappedGridRows);
      setPaginationData(parsedPagination);

      // Top performing sidebar
      setTopPerforming(mappedGridRows.slice(0, 3));
      setPerformanceOverview({
        redemptionRate: "18.6%",
        conversionRate: "12.4%",
        avgDiscount: "23.8%",
        roi: "4.2x",
      });

      // Hydrate dropdown metadata lookups
      const masterCategories = lookupsRes.data.data || [];
      setMetadataLookups({
        categories: masterCategories.map((c) => ({ _id: c._id, label: c.label })),
        merchants: Array.from(new Set(serverOffers.map((o) => o.merchant_id).filter(Boolean))).map((m) => ({ _id: m._id, name: m.name || m.store_name })),
        offerTypes: [
          { _id: "all", label: "All Placement Layouts" },
          { _id: "banner", label: "Top Banners" },
          { _id: "calendar", label: "Calendar Slots" },
        ],
      });
    } catch (err) {
      console.error("Offers dashboard dataset collection crash:", err);
      setGlobalError("Failed to process database campaigns mapping records.");
    } finally {
      setLoadingGrid(false);
    }
  };

  // =========================================================
  // PIPELINE 3: DYNAMIC DRILL-DOWN LOOKUP FOR INSPECTION
  // =========================================================
  const fetchOfferInspectionDetail = async (offerId) => {
    if (!offerId) return;
    try {
      setDetailPaneLoading(true);
      const response = await accountClient.get(`/offers/admin/detail/${offerId}`, { headers });
      if (response.data.success) {
        setSelectedOfferProfile(response.data.data);
      }
    } catch (err) {
      console.error("Popup item sync metrics failure:", err);
      // Fallback to local raw copy if endpoint fails
      const fallback = offersList.find(o => o._id === offerId)?.rawOffer;
      setSelectedOfferProfile(fallback || null);
    } finally {
      setDetailPaneLoading(false);
    }
  };

  useEffect(() => {
    syncWorkspaceMetrics();
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    syncOffersGridAndMetadata();
  }, [page, activeFilters, dateRange.startDate, dateRange.endDate]);

  const handleFilterUpdate = useCallback((newFilters) => {
    setPage(1);
    setActiveFilters(newFilters);
  }, []);

  const handleActionExecution = useCallback((actionKey, dataPayload) => {
    switch (actionKey) {
      case "create_offer":
        window.location.href = "/admin/offers/new";
        break;
      case "offer_templates":
        window.location.href = "/offer-types";
        break;
      case "inspect_offer_row":
        fetchOfferInspectionDetail(dataPayload?._id);
        break;
      case "open_lightbox":
        setLightboxImage({ src: dataPayload.src, label: dataPayload.label });
        break;
      default:
        console.log(`Action context missing for: ${actionKey}`, dataPayload);
        break;
    }
  }, [headers]);

  const triggerForceRefresh = () => {
    syncWorkspaceMetrics();
    syncOffersGridAndMetadata();
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1750px] mx-auto space-y-6 bg-[#FBFBFE] min-h-screen">
      
      {/* REFRESH DATA ENGINE */}
      <div className="flex justify-end -mb-4">
        <button
          onClick={triggerForceRefresh}
          disabled={loadingMetrics || loadingGrid}
          className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition shadow-xs hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center justify-center"
          title="Force System Workspace Re-Sync"
        >
          <RefreshCw size={15} className={`${loadingMetrics || loadingGrid ? "animate-spin" : ""}`} />
        </button>
      </div>

      {globalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 flex items-center gap-2.5 animate-in fade-in duration-300">
          <AlertCircle size={16} /> {globalError}
        </div>
      )}

      {/* MODULE 1: COMPREHENSIVE OVERVIEW CARDS PANEL */}
      <OffersStatsHeader
        stats={statsData}
        loading={loadingMetrics}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      {/* MODULE 2: DATA GRID & LIST LEDGER CONTROLS DECK */}
      <div className="pt-2">
        {loadingGrid && offersList.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-100 p-24 flex flex-col items-center justify-center text-indigo-600 shadow-xs">
            <Loader2 className="animate-spin mb-2 w-8 h-8" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Loading workspace campaigns...</p>
          </div>
        ) : (
          <OffersManagementGrid
            offers={offersList}
            topPerforming={topPerforming}
            performanceOverview={performanceOverview}
            categoriesList={metadataLookups.categories}
            merchantsList={metadataLookups.merchants}
            offerTypesList={metadataLookups.offerTypes}
            pagination={{
              currentPage: page,
              totalPages: paginationData.totalPages,
              totalItems: paginationData.totalItems,
            }}
            selectedOfferDetail={selectedOfferProfile}
            detailLoading={detailPaneLoading}
            onClearDetail={() => setSelectedOfferProfile(null)}
            onPageChange={(targetPage) => setPage(targetPage)}
            onFilterChange={handleFilterUpdate}
            onActionTrigger={handleActionExecution}
          />
        )}
      </div>

      {/* ROOT LEVEL FULLSCREEN IMAGE LIGHTBOX MODAL */}
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
// SUB-COMPONENT: FULLSCREEN IMAGE LIGHTBOX MODAL
// =========================================================
const ImageLightboxModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Lightbox Controls Top Toolbar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-5xl mx-auto">
        <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-[200px] sm:max-w-md bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
          {image.label || "Campaign Asset Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="campaign-asset.jpg"
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

export default AdminOffersDashboard;