import React, { useState, useEffect, useMemo, useCallback } from "react";
import { accountClient, buildAuthHeaders } from "../../lib/api";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

// --- Import Refactored Sub-Components ---
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
    startDate: "2026-04-30",
    endDate: "2026-05-30",
  });

  // --- Intercept Pipeline Filter Parameters ---
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

      // Fetch dynamic workspace elements and base system offer types concurrently
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
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        }),
        accountClient.get("/offer-types/admin", { headers }),
      ]);

      // 1. Map Data Grid Records
      const serverOffers = offersRes.data.data || [];
      const parsedPagination = offersRes.data.pagination || {
        currentPage: page,
        totalPages: offersRes.data.pages || 1,
        totalItems: offersRes.data.total || serverOffers.length,
      };

      // Map raw response database model variants over to the clean UI keys required by the Grid view
      const mappedGridRows = serverOffers.map((offer) => ({
        _id: offer._id,
        title: offer.title,
        code: offer.code || offer._id.substring(18).toUpperCase(),
        thumbnail: offer.thumbnail,
        merchant_name: offer.merchant_id?.name || "Unknown Partner",
        category_label: offer.offer_type_id?.label || "General",
        offer_type_label: offer.display_type,
        discount_expression: offer.discount_percentage ? `${offer.discount_percentage}% OFF` : `₹${offer.discount_value} OFF`,
        minimum_purchase_amount: offer.minimum_purchase_amount || 0,
        status: new Date(offer.end_date) < new Date() ? "expired" : "active",
        formatted_start: new Date(offer.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        formatted_end: new Date(offer.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        redemptions_count: offer.number_of_winners || 0,
        redemption_trend: offer.number_of_winners ? "12.5% increase" : null,
      }));

      setOffersList(mappedGridRows);
      setPaginationData(parsedPagination);

      // Mock dynamic parameters mapping if secondary analytics data is not ready yet on backend
      setTopPerforming(mappedGridRows.slice(0, 3));
      setPerformanceOverview({
        redemptionRate: "18.6%",
        conversionRate: "12.4%",
        avgDiscount: "23.8%",
        roi: "4.2x",
      });

      // 2. Hydrate Dropdown filters components mapping
      const masterCategories = lookupsRes.data.data || [];
      setMetadataLookups({
        categories: masterCategories.map((c) => ({ _id: c._id, label: c.label })),
        merchants: Array.from(new Set(serverOffers.map((o) => o.merchant_id).filter(Boolean))).map((m) => ({ _id: m._id, name: m.name })),
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

  // Run synchronization sequences safely matching hooks updates
  useEffect(() => {
    syncWorkspaceMetrics();
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    syncOffersGridAndMetadata();
  }, [page, activeFilters, dateRange.startDate, dateRange.endDate]);

  // --- Event Handlers Callback Interceptors ---
  const handleFilterUpdate = useCallback((newFilters) => {
    setPage(1); // Force reset view to page index frame 1 upon filter changes
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
      case "open_options":
        alert(`Inspecting configuration context parameters for Offer ID: ${dataPayload._id}`);
        break;
      default:
        console.log(`Action context missing for: ${actionKey}`, dataPayload);
        break;
    }
  }, []);

  const triggerForceRefresh = () => {
    syncWorkspaceMetrics();
    syncOffersGridAndMetadata();
  };

  return (
    <div className="p-8 max-w-[1750px] mx-auto space-y-6 bg-[#FBFBFE] min-h-screen">
      
      {/* --- REFRESH DATA ENGINE OVERLAY ATTACHMENT --- */}
      <div className="flex justify-end -mb-4">
        <button
          onClick={triggerForceRefresh}
          disabled={loadingMetrics || loadingGrid}
          className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition shadow-sm hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center justify-center"
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

      {/* --- MODULE 1: COMPREHENSIVE OVERVIEW CARDS PANEL --- */}
      <OffersStatsHeader
        stats={statsData}
        loading={loadingMetrics}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      {/* --- MODULE 2: DATA GRID LEDGER CONTROLS DECK --- */}
      <div className="pt-2">
        {loadingGrid && offersList.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-100 p-24 flex flex-col items-center justify-center text-indigo-600 shadow-sm">
            <Loader2 className="animate-spin mb-2 w-8 h-8" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Loading workspace datagrid templates...</p>
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
            onPageChange={(targetPage) => setPage(targetPage)}
            onFilterChange={handleFilterUpdate}
            onActionTrigger={handleActionExecution}
          />
        )}
      </div>

    </div>
  );
};

export default AdminOffersDashboard;