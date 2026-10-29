import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./pages/DashboardLayout";
import StaffDashboardLayout from "./staff-pages/StaffDashboardLayout.jsx"; // Import the staff layout we created earlier
import LoginPage from "./pages/LoginPage";
import StaffLoginPage from "./staff-pages/Login/StaffLogin.jsx"; // Dedicated or shared login page for staff
import StaffDashboard from "./staff-pages/Dashboard/DashboardPage.jsx"; // The welcome banner staff dashboard we created
import MerchantsPage from "./pages/Merchant/MerchantsPage";
import UsersPage from "./pages/Users/UsersPage";
import PolicyEditor from "./pages/PrivacyPage/Privacy";
import CategoryPage from "./pages/Categories/Categories";
import SubCategoryPage from "./pages/SubCategory/SubCategory";
import AdminDashboard from "./pages/Dashboard/Dashboard";
import LegalViewPage from "./pages/Slug/Slug";
import LandingPage from "./pages/Home";
import AdminOfferTypeManagement from "./pages/OfferType/OfferType";
import AdminTemplateImageManagement from "./pages/TemplateUpload/Template";
import AdminCalendarConfig from "./pages/Calender/Calender";
import AdminProductDashboard from "./pages/Products/Products";
import AdminOffersDashboard from "./pages/OffersListing/OffersListing";
import SubOfferTypePage from "./pages/SubOffer/SubOffer";
import AdminBanner from './pages/AdminBanner/AdminBanner'
import AdminAreasDashboard from "./pages/Area/Area";
import BannerTypesDashboard from "./pages/BannerTypes/BannerTypes";
import QuickOfferDashboard from './pages/QuickOffer/QuickOffer';
import AdminFaqManagement from "./pages/Faq/Faq";
import AdminHelpArticleManagement from "./pages/AdminHelpArticleManagement/AdminHelpArticleManagement";
import AdminLeagueManagement from "./pages/AdminLeague/AdminLeague";
import AdminTaskManagement from "./pages/TaskManagement/TaskManagement";
import AdminNotificationCenter from "./pages/Notification/Notification";
import AdminQuestManagement from "./pages/Quests/Quest";
import HelpSupportPage from "./pages/HelpSupportPage/HelpSupportPage";
import AdminQrTemplateManagement from "./pages/AdminQrTemplate/AdminQrTemplateManagement";
import OfferReviewsManager from "./pages/OfferReviewManager/OfferReviewManager";
import ProductSuggestionsManager from "./pages/ProductSuggestionManager/ProductSuggestionManager";
import ServiceSuggestionsManager from "./pages/ServiceSugesstionPage/ServiceSuggestion";
import ServiceVerificationManager from "./pages/ServicesManager/ServicesManager";
import TagSuggestionAdminPage from "./pages/TagSuggestion/TagSuggestion";
import AdminCallbackPage from './pages/Callback/AdminCallback.jsx'
import AdminOfferReviewDashboard from "./pages/AdminOfferReview/AdminOfferReview";
import AdminShopDetailView from "./pages/ShopDetailView/ShopDetailView";
import AdminMerchantEditRequests from "./pages/AdminMerchantEditRequest/AdminMerchantEditRequest";
import AdminStaffManagement from "./pages/AdminStaffManagement/AdminManagementPAge";
import StaffProductDashboard from "./staff-pages/Products/StaffProductsPage.jsx";
import StaffServiceVerificationManager from "./staff-pages/Services/StaffServices.jsx";
import StaffOfferReviewsManager from "./staff-pages/Offers/StaffOfferReviewManager.jsx";

const ADMIN_TOKEN_KEY = "bb_admin_token";
const STAFF_TOKEN_KEY = "bb_staff_token";
const gmaps_key = import.meta.env.VITE_API_GMAPS_KEY;

function App() {
  const [adminToken, setAdminToken] = useState(() => 
    localStorage.getItem(ADMIN_TOKEN_KEY) || ""
  );

  const [staffToken, setStaffToken] = useState(() => 
    localStorage.getItem(STAFF_TOKEN_KEY) || ""
  );

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  }, [adminToken]);

  useEffect(() => {
    if (staffToken) {
      localStorage.setItem(STAFF_TOKEN_KEY, staffToken);
    } else {
      localStorage.removeItem(STAFF_TOKEN_KEY);
    }
  }, [staffToken]);

  const handleAdminLogin = (nextToken) => setAdminToken(nextToken);
  const handleAdminLogout = () => setAdminToken("");

  const handleStaffLogin = (nextToken) => setStaffToken(nextToken);
  const handleStaffLogout = () => setStaffToken("");

  const isAdminAuthenticated = !!adminToken;
  const isStaffAuthenticated = !!staffToken;

  return (
    <Routes>
      {/* 🌐 Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/legal/:slug" element={<LegalViewPage />} />

      {/* 🔐 Admin Auth Route */}
      <Route
        path="/login"
        element={
          isAdminAuthenticated ? (
            <Navigate to="/dashboard/users" replace />
          ) : (
            <LoginPage onLogin={handleAdminLogin} />
          )
        }
      />

      {/* 🔐 Staff Auth Route */}
      <Route
        path="/staff/login"
        element={
          isStaffAuthenticated ? (
            <Navigate to="/staff/dashboard" replace />
          ) : (
            <StaffLoginPage onLogin={handleStaffLogin} isStaff={true} />
          )
        }
      />

      {/* 🛡️ Protected Dashboard Layout (Admin) */}
      <Route
        path="/dashboard"
        element={
          isAdminAuthenticated ? (
            <DashboardLayout token={adminToken} onLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        
        <Route path="users" element={<UsersPage token={adminToken} />} />
        <Route path="main" element={<AdminDashboard token={adminToken} />} />
        <Route path="merchants" element={<MerchantsPage token={adminToken} />} />
        <Route path="merchant-edit-requests" element={<AdminMerchantEditRequests token={adminToken}/>}/>
        <Route path="privacy" element={<PolicyEditor token={adminToken} />} />
        <Route path="categories" element={<CategoryPage token={adminToken} />} />
        <Route path="subcategories" element={<SubCategoryPage token={adminToken} />} />
        <Route path="offer-type" element={<AdminOfferTypeManagement token={adminToken} />} />
        <Route path="templates" element={<AdminTemplateImageManagement token={adminToken} />} />
        <Route path="calendar" element={<AdminCalendarConfig token={adminToken}/>}/>
        <Route path="products" element={<AdminProductDashboard token={adminToken}/>}/>
        <Route path="offers" element={<AdminOffersDashboard token={adminToken}/>}/>
        <Route path="suboffer-type" element={<SubOfferTypePage token={adminToken}/>}/>
        <Route path="adminbanner" element={<AdminBanner token={adminToken}/>}/> 
        <Route path="area" element={<AdminAreasDashboard token={adminToken} googleMapsApiKey={gmaps_key}/>}/> 
        <Route path="bannerTypes" element={<BannerTypesDashboard token={adminToken}/>}/>
        <Route path="quickOffer" element={<QuickOfferDashboard token={adminToken}/>}/>
        <Route path="faq" element={<AdminFaqManagement token={adminToken}/>}/>
        <Route path="helpArticle" element={<AdminHelpArticleManagement token={adminToken}/>}/>
        <Route path="league" element={<AdminLeagueManagement token={adminToken}/>}/>
        <Route path="task-management" element={<AdminTaskManagement token={adminToken}/>}/>
        <Route path="notifications" element={<AdminNotificationCenter token={adminToken}/>}/>
        <Route path="quest" element={<AdminQuestManagement token={adminToken}/>}/>
        <Route path="help-support" element={<HelpSupportPage token={adminToken}/>}/>
        <Route path="qr-template" element={<AdminQrTemplateManagement token={adminToken}/>}/>
        <Route path="offer-reviews" element={<OfferReviewsManager token={adminToken}/>}/>
        <Route path="product-suggestions" element={<ProductSuggestionsManager token={adminToken}/>}/>
        <Route path="service-suggestions" element={<ServiceSuggestionsManager token={adminToken}/>}/>
        <Route path="service-verification-suggestions" element={<ServiceVerificationManager token={adminToken}/>}/>
        <Route path="tag-suggestions" element={<TagSuggestionAdminPage token={adminToken}/>}/>
        <Route path="callback" element={<AdminCallbackPage token={adminToken}/>}/>
        <Route path="offer-review" element={<AdminOfferReviewDashboard token={adminToken}/>}/>
        <Route path="shop/:shopId" element={<AdminShopDetailView token={adminToken}/>}/>
        <Route path="staff" element={<AdminStaffManagement token={adminToken}/>}/>
      </Route>

      {/* 🛡️ Protected Staff Dashboard Layout */}
      <Route
        path="/staff"
        element={
          isStaffAuthenticated ? (
            <StaffDashboardLayout token={staffToken} onLogout={handleStaffLogout} />
          ) : (
            <Navigate to="/staff/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard token={staffToken} />} />
        <Route path="products" element={<StaffProductDashboard token={staffToken} />} />
        <Route path="services" element={<StaffServiceVerificationManager token={staffToken} />} />
        
        <Route path="offers" element={<StaffOfferReviewsManager token={staffToken} />} />
        
      </Route>
    </Routes>
  );
}

export default App;