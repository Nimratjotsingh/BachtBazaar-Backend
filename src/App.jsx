import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./pages/DashboardLayout";
import LoginPage from "./pages/LoginPage";
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

const TOKEN_STORAGE_KEY = "bb_admin_token";

function App() {
  const [token, setToken] = useState(() => 
    localStorage.getItem(TOKEN_STORAGE_KEY) || ""
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  const handleLogin = (nextToken) => setToken(nextToken);
  const handleLogout = () => setToken("");

  const isAuthenticated = !!token;

  return (
    <Routes>
      {/* 🌐 Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/legal/:slug" element={<LegalViewPage />} />

      {/* 🔐 Auth Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard/users" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />

      {/* 🛡️ Protected Dashboard Layout */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <DashboardLayout token={token} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {/* Default dashboard path redirects /dashboard directly to /dashboard/users */}
        <Route index element={<Navigate to="users" replace />} />
        
        {/* Dashboard Sub-routes */}
        <Route path="users" element={<UsersPage token={token} />} />
        <Route path="main" element={<AdminDashboard token={token} />} />
        <Route path="merchants" element={<MerchantsPage token={token} />} />
        <Route path="privacy" element={<PolicyEditor token={token} />} />
        <Route path="categories" element={<CategoryPage token={token} />} />
        <Route path="subcategories" element={<SubCategoryPage token={token} />} />
        <Route path="offer-type" element={<AdminOfferTypeManagement token={token} />} />
        <Route path="templates" element={<AdminTemplateImageManagement token={token} />} />
        <Route path="calendar" element={<AdminCalendarConfig token={token}/>}/>
        <Route path="products" element={<AdminProductDashboard token={token}/>}/>
        <Route path="offers" element={<AdminOffersDashboard token={token}/>}/>
        <Route path="suboffer-type" element={<SubOfferTypePage token={token}/>}/>
        <Route path="adminbanner" element={<AdminBanner token={token}/>}/> 
      </Route>

      {/* 🔁 Fallback Catch-All for unknown URLs */}
      {/* <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/dashboard/users" : "/login"} replace />
        }
      /> */}
    </Routes>
  );
}

export default App;