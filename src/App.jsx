import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./pages/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import MerchantsPage from "./pages/Merchant/MerchantsPage";
import UsersPage from "./pages/UsersPage";
import PolicyEditor from "./pages/PrivacyPage/Privacy";
import CategoryPage from "./pages/Categories/Categories";
import SubCategoryPage from "./pages/SubCategory/SubCategory";
import AdminDashboard from "./pages/Dashboard/Dashboard";
import LegalViewPage from "./pages/Slug/Slug";
import LandingPage from "./pages/Home";

const tokenStorageKey = "bb_admin_token";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem(tokenStorageKey) || ""
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem(tokenStorageKey, token);
    } else {
      localStorage.removeItem(tokenStorageKey);
    }
  }, [token]);

  const handleLogin = (nextToken) => {
    setToken(nextToken);
  };

  const handleLogout = () => {
    setToken("");
  };

  const isAuthenticated = !!token;

  return (
    <Routes>
      <Route path="/"element={<LandingPage/>}/>
      <Route path="/legal/:slug" element={<LegalViewPage />} />
      {/* 🔐 Login */}
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

      {/* 🛡️ Protected Dashboard */}
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
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UsersPage token={token} />} />
        <Route path="main" element={<AdminDashboard token={token} />} />
        <Route path="merchants" element={<MerchantsPage token={token} />} />
        <Route path="privacy" element={<PolicyEditor token={token} />} />
        <Route path="categories" element={<CategoryPage token={token} />} />
        <Route path="subcategories" element={<SubCategoryPage token={token} />} />
        
      </Route>
      {/* 🔁 Redirects */}
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated ? "/dashboard/users" : "/login"}
            replace
          />
        }
      />
      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? "/dashboard/users" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;