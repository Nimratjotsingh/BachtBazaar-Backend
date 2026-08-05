import React, { useState } from "react";
import {
  Send, Users, Store, Globe, UserCheck, ShieldAlert,
  Bell, CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCw
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const TARGET_OPTIONS = [
  {
    id: "both",
    label: "All Users & Merchants",
    description: "Broadcast message to every active device in the network",
    icon: Globe,
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    id: "all_users",
    label: "All App Users",
    description: "Send campaign or updates exclusively to customer accounts",
    icon: Users,
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "all_merchants",
    label: "All Merchants",
    description: "Send merchant alerts, task notifications, or policy changes",
    icon: Store,
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    id: "single_user",
    label: "Specific User ID",
    description: "Target a single customer account using their MongoDB ID",
    icon: UserCheck,
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    id: "single_merchant",
    label: "Specific Merchant ID",
    description: "Target a single merchant partner using their MongoDB ID",
    icon: ShieldAlert,
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
  },
];

const AdminNotificationCenter = ({ token }) => {
  const [targetType, setTargetType] = useState("both");
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [loading, setLoading] = useState(false);

  // Status banners & recent logs
  const [statusMessage, setStatusMessage] = useState(null);
  const [history, setHistory] = useState([]);

  const headers = buildAuthHeaders(token);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if ((targetType === "single_user" || targetType === "single_merchant") && !recipientId.trim()) {
      setStatusMessage({
        type: "error",
        text: "Recipient MongoDB ID is required for targeted single delivery.",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        targetType,
        recipientId: recipientId.trim() || undefined,
        title: title.trim(),
        body: body.trim(),
        data: deepLink.trim() ? { url: deepLink.trim() } : {},
      };

      const res = await accountClient.post("/notifications/send", payload, { headers });

      const logItem = {
        id: Date.now(),
        title,
        body,
        targetType,
        recipientId: recipientId || "Broadcast",
        sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        successCount: res.data.successCount ?? 0,
        failureCount: res.data.failureCount ?? 0,
      };

      setHistory((prev) => [logItem, ...prev]);

      setStatusMessage({
        type: "success",
        text: res.data.message || `Dispatched successfully to targeted audience.`,
      });

      // Reset Form
      setTitle("");
      setBody("");
      setDeepLink("");
      setRecipientId("");
    } catch (err) {
      console.error("Send Notification Error:", err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to dispatch push notification.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-700 antialiased font-sans max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] flex items-center gap-3 tracking-tight">
            <Bell className="text-blue-600 w-8 h-8" /> Push Broadcast Center
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Dispatch real-time FCM mobile push notifications to users, merchants, or global audiences
          </p>
        </div>
      </div>

      {/* Response Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-extrabold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Notification Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSendNotification}
            className="bg-white p-8 rounded-[32px] border border-slate-200/80 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-blue-600" /> Compose Push Message
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                Firebase FCM
              </span>
            </div>

            {/* Target Audience Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                1. Select Target Audience *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TARGET_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = targetType === option.id;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setTargetType(option.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20"
                          : "border-slate-200/70 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`p-2 rounded-xl ${option.badgeColor}`}>
                          <Icon size={16} />
                        </span>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{option.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient ID input if targeted */}
            {(targetType === "single_user" || targetType === "single_merchant") && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Target Account MongoDB ObjectId *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Enter ${targetType === "single_user" ? "User" : "Merchant"} ID (e.g. 6632f1a...)`}
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                />
              </div>
            )}

            {/* Title & Body */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  2. Notification Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🎉 Special Flash Sale Today! / 🚀 Tier Upgrade"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  3. Notification Message Body *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Write message content here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700 resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  4. Action URL / Deep Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /offers, /merchant/dashboard, or https://..."
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} strokeWidth={2.5} />
              )}
              {loading ? "Transmitting FCM Broadcast..." : "Dispatch Push Notification"}
            </button>
          </form>
        </div>

        {/* Right Column: Live Mobile Preview & Transmission History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mobile Phone Mockup Preview */}
          <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Live Device Banner Preview
              </span>
              <span className="text-[10px] text-slate-500 font-mono">BachatBazarr OS</span>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center font-black text-[9px] text-white">
                    BB
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-200">BachatBazarr</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">now</span>
              </div>
              <div>
                <div className="text-xs font-extrabold text-white leading-tight">
                  {title || "Notification Title Placeholder"}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {body || "Notification message content will display here on user devices..."}
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast History Log */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Recent Session Broadcasts
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{history.length} sent</span>
            </div>

            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs italic">
                No notifications sent during this session.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 line-clamp-1">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">{item.sentAt}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{item.body}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="font-mono font-bold text-blue-600 uppercase">
                        {item.targetType}
                      </span>
                      <span className="font-mono text-emerald-600 font-bold">
                        ✓ {item.successCount} delivered
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationCenter;