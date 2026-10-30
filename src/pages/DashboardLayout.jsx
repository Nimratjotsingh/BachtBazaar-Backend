import React, { useState, useEffect, useMemo, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Store,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Workflow,
  LucideWorkflow,
  BookTemplate,
  Calendar,
  ToyBrick,
  LucideActivity,
  Building2Icon,
  FileQuestion,
  FlagTriangleLeft,
  FlagTriangleRight,
  Coins,
  MessageSquareCheck,
  Bell,
  CheckCheck,
  ExternalLink
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { adminClient, buildAuthHeaders } from "../lib/api"; // Adjust path as needed

const navItems = [
  { label: "Dashboard", to: "/dashboard/main", icon: LayoutDashboard },
  { label: "Users", to: "/dashboard/users", icon: Users },
  { label: "Merchants", to: "/dashboard/merchants", icon: Store },
  { label: "Merchant Edit Request", to: "/dashboard/merchant-edit-requests", icon: Coins },
  { label: "Privacy Policies", to: "/dashboard/privacy", icon: ShieldCheck },
  { label: "Categories", to: "/dashboard/categories", icon: Workflow },
  { label: "SubCategories", to: "/dashboard/subcategories", icon: LucideWorkflow },
  { label: "Offer Type", to: "/dashboard/offer-type", icon: LucideWorkflow },
  { label: "Sub-Offer Type", to: "/dashboard/suboffer-type", icon: LucideWorkflow },
  { label: "Templates", to: "/dashboard/templates", icon: BookTemplate },
  { label: "Areas", to: "/dashboard/area", icon: Building2Icon },
  { label: "Calender", to: "/dashboard/calendar", icon: Calendar },
  { label: "Product", to: "/dashboard/products", icon: ToyBrick },
  { label: "Product Suggestions", to: "/dashboard/product-suggestions", icon: MessageSquareCheck },
  { label: "Service Verification Suggestions", to: "/dashboard/service-verification-suggestions", icon: MessageSquareCheck },
  { label: "Service Suggestions", to: "/dashboard/service-suggestions", icon: MessageSquareCheck },
  { label: "Tag Suggestions", to: "/dashboard/tag-suggestions", icon: MessageSquareCheck },
  { label: "Offers", to: "/dashboard/offers", icon: LucideActivity },
  { label: "Offer Reviews from Merchants", to: "/dashboard/offer-reviews", icon: MessageSquareCheck },
  { label: "Offer Review", to: "/dashboard/offer-review", icon: MessageSquareCheck },
  { label: "AdminBanner", to: "/dashboard/adminbanner", icon: LucideActivity },
  { label: "Banner Types", to: "/dashboard/bannerTypes", icon: LucideActivity },
  { label: "Quick Offer Merchant Bid", to: "/dashboard/quickOffer", icon: LucideActivity },
  { label: "FAQ", to: "/dashboard/faq", icon: FileQuestion },
  { label: "Help Article Management", to: "/dashboard/helpArticle", icon: FileQuestion },
  { label: "League", to: "/dashboard/league", icon: FlagTriangleLeft },
  { label: "TaskManagement", to: "/dashboard/task-management", icon: FlagTriangleRight },
  { label: "Notifications", to: "/dashboard/notifications", icon: FlagTriangleRight },
  { label: "Quest", to: "/dashboard/quest", icon: Coins },
  { label: "Help & Support", to: "/dashboard/help-support", icon: Coins },
  { label: "QR Template Management", to: "/dashboard/qr-template", icon: Coins },
  { label: "Staff Management", to: "/dashboard/staff", icon: Coins },
  { label: "callbacks", to: "/dashboard/callback", icon: MessageSquareCheck },
];

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DashboardLayout = ({ token, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // --- Fetch Historical Notifications ---
  const fetchNotifications = async () => {
    try {
      const res = await adminClient.get("/admin/notifications", { headers });
      if (res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch admin notifications:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, headers]);

  // --- Socket.io Real-Time Listener & Teams Toast ---
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);

    socket.emit("join_admin_room");

    socket.on("admin_realtime_notification", (data) => {
      // Prepend to notification list and increment unread counter
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Render Microsoft Teams style toast notification
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-sm w-full bg-slate-900 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-slate-800 border border-slate-700/80 overflow-hidden`}
        >
          <div className="flex-1 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl mt-0.5 border border-blue-500/20">
                <Bell size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white uppercase tracking-wider truncate">
                  {data.title}
                </p>
                <p className="mt-1 text-xs text-slate-300 font-medium leading-relaxed">
                  {data.message}
                </p>
                <span className="text-[9px] text-slate-400 font-mono mt-1.5 block">
                  Just now
                </span>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-800 bg-slate-950/40">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                if (data.category === "merchant_verification") {
                  navigate("/dashboard/merchants");
                } else if (data.category === "offer_review") {
                  navigate("/dashboard/offer-reviews");
                } else {
                  navigate("/dashboard/main");
                }
              }}
              className="w-full px-4 flex items-center justify-center text-xs font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 hover:bg-slate-800/50 transition cursor-pointer"
            >
              View
            </button>
          </div>
        </div>
      ), {
        position: 'top-right',
        duration: 7000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  // --- Mark Notification as Read ---
  const handleMarkAsRead = async (id) => {
    try {
      await adminClient.patch(`/admin/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await adminClient.patch("/admin/notifications/mark-all-read", {}, { headers });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close sidebar automatically on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-sky-50 font-sans overflow-x-hidden">
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
          <button className="lg:hidden text-sky-400" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all group
                ${isActive ? "bg-sky-600 text-white shadow-lg shadow-sky-200" : "text-sky-700 hover:bg-sky-50 hover:text-sky-900"}
              `}
            >
              <item.icon size={22} className="shrink-0" />
              <span className={`font-semibold text-sm transition-opacity duration-200 ${!isSidebarOpen && "lg:hidden"}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sky-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-semibold text-sm cursor-pointer"
          >
            <LogOut size={22} className="shrink-0" />
            <span className={!isSidebarOpen && "lg:hidden"}>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-sky-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-sky-50 text-sky-600 transition-colors cursor-pointer"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4">
            
            {/* Notification Bell & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors cursor-pointer border border-sky-100 bg-white shadow-2xs"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider">Admin Notification Center</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{unreadCount} unread system alerts</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-slate-800 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        No notifications recorded.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (!n.isRead) handleMarkAsRead(n._id);
                          }}
                          className={`p-4 transition cursor-pointer hover:bg-slate-50 flex items-start gap-3 ${
                            !n.isRead ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-blue-600" : "bg-slate-300"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 truncate">{n.title}</p>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Details */}
            <div className="flex items-center gap-3">
              <div className="hidden xs:flex flex-col text-right">
                <span className="text-sm font-bold text-sky-900 leading-none">Super Admin</span>
                <span className="text-[10px] text-sky-500 font-medium uppercase">BankBazaar</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-sky-900 flex items-center justify-center text-white font-bold border-2 border-sky-100 shrink-0">
                A
              </div>
            </div>

          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        <footer className="py-4 px-6 sm:px-10 text-[10px] uppercase tracking-widest text-sky-400 font-bold flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-sky-100 bg-white">
          <span>© 2026 BankBazaar</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-sky-600">Support</a>
            <a href="#" className="hover:text-sky-600">Privacy</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;