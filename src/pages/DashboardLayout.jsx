import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Store,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Workflow,
  LucideWorkflow,
  BookTemplate,
  Calendar,
  ToyBrick,
  LucideActivity,
  Building2Icon
} from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/dashboard/main", icon: LayoutDashboard },
  { label: "Users", to: "/dashboard/users", icon: Users },
  { label: "Merchants", to: "/dashboard/merchants", icon: Store },
  { label: "Privacy Policies", to: "/dashboard/privacy", icon: ShieldCheck },
  { label: "Categories", to: "/dashboard/categories", icon: Workflow },
  { label: "SubCategories", to: "/dashboard/subcategories", icon: LucideWorkflow },
  { label: "Offer Type", to: "/dashboard/offer-type", icon: LucideWorkflow },
  { label: "Sub-Offer Type", to: "/dashboard/suboffer-type", icon: LucideWorkflow },
  { label: "Templates", to: "/dashboard/templates", icon: BookTemplate },
  { label: "Areas", to: "/dashboard/area", icon: Building2Icon },
  { label: "Calender", to: "/dashboard/calendar", icon: Calendar },
  { label: "Product", to: "/dashboard/products", icon: ToyBrick },
  { label: "Offers", to: "/dashboard/offers", icon: LucideActivity },
  { label: "AdminBanner", to: "/dashboard/adminbanner", icon: LucideActivity },
  { label: "Banner Types", to: "/dashboard/bannerTypes", icon: LucideActivity },
  { label: "Quick Offer Merchant Bid", to: "/dashboard/quickOffer", icon: LucideActivity },
  
];

const DashboardLayout = ({token,onLogout}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar automatically when navigating on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-sky-50 font-sans overflow-x-hidden">
      {/* --- Sidebar Overlay (Mobile Only) --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-sky-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-sky-100 flex flex-col transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-20"}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 border-b border-sky-50 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="min-w-[40px] h-10 bg-sky-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl italic">B</span>
            </div>
            {(isSidebarOpen || window.innerWidth < 1024) && (
              <span className="text-xl font-extrabold text-sky-900 tracking-tighter">
                Bachtt<span className="text-sky-500">Bazaar</span>
              </span>
            )}
          </div>
          {/* Mobile Close Button */}
          <button
            className="lg:hidden text-sky-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all group
                ${
                  isActive
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-200"
                    : "text-sky-700 hover:bg-sky-50 hover:text-sky-900"
                }
              `}
            >
              <item.icon size={22} className="shrink-0" />
              <span
                className={`font-semibold text-sm transition-opacity duration-200 ${!isSidebarOpen && "lg:hidden"}`}
              >
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-sky-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-semibold text-sm"
          >
            <LogOut size={22} className="shrink-0" />
            <span className={!isSidebarOpen && "lg:hidden"}>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}
      >
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-sky-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-sky-50 text-sky-600 transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden xs:flex flex-col text-right">
              <span className="text-sm font-bold text-sky-900 leading-none">
                Super Admin
              </span>
              <span className="text-[10px] text-sky-500 font-medium uppercase">
                BankBazaar
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-sky-900 flex items-center justify-center text-white font-bold border-2 border-sky-100 shrink-0">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Responsive Footer */}
        <footer className="py-4 px-6 sm:px-10 text-[10px] uppercase tracking-widest text-sky-400 font-bold flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-sky-100 bg-white">
          <span>© 2026 BankBazaar</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-sky-600">
              Support
            </a>
            <a href="#" className="hover:text-sky-600">
              Privacy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
