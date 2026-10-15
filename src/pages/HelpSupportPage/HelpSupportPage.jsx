import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  Send,
  Paperclip,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Tag,
  ShieldAlert,
  FileText,
  Eye,
  Maximize2,
  Download,
  X,
  Calendar,
  Hash,
  User,
  ShieldCheck,
  Check,
  ChevronRight
} from "lucide-react";
import { accountClient } from "../../lib/api";

const CATEGORIES = [
  "Account & Verification",
  "Offers & Redemptions",
  "Bachat Coins & Billing",
  "Technical Issue",
  "Report/Abuse",
  "Other",
];

const PRIORITIES = [
  { value: "Low", label: "Low Priority" },
  { value: "Medium", label: "Medium Priority" },
  { value: "High", label: "High Priority" },
  { value: "Urgent", label: "Urgent / Critical" },
];

const HelpSupportPage = () => {
  // --- States ---
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'Open', 'In_Progress', 'Resolved', 'Closed'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "Other",
    priority: "Medium",
    description: "",
  });

  // Reply Thread State
  const [replyMessage, setReplyMessage] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // Root-Level Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  useEffect(() => {
    fetchTickets();
  }, [activeTab]);

  // --- API Calls ---
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const statusFilter = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await accountClient.get(`/help/tickets/my-tickets${statusFilter}`);
      setTickets(res.data.data || []);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      setFetchingDetails(true);
      const res = await accountClient.get(`/help/tickets/${ticketId}`);
      setSelectedTicket(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load ticket details.");
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      return alert("Please fill in all mandatory fields.");
    }

    try {
      setCreateLoading(true);
      await accountClient.post("/help/tickets", newTicket);
      setShowCreateModal(false);
      setNewTicket({
        subject: "",
        category: "Other",
        priority: "Medium",
        description: "",
      });
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create support ticket.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setReplyLoading(true);
      await accountClient.post(`/help/tickets/${selectedTicket._id}/reply`, {
        message: replyMessage,
      });
      setReplyMessage("");
      await fetchTicketDetails(selectedTicket._id);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  // Status Badge Helpers
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Open":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} /> Open
          </span>
        );
      case "In_Progress":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw size={12} className="animate-spin" /> In Progress
          </span>
        );
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case "Closed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle size={12} /> Closed
          </span>
        );
      default:
        return null;
    }
  };

  const renderPriorityBadge = (priority) => {
    const colors = {
      Low: "bg-slate-100 text-slate-600 border-slate-200",
      Medium: "bg-blue-50 text-blue-600 border-blue-100",
      High: "bg-amber-50 text-amber-700 border-amber-200",
      Urgent: "bg-red-50 text-red-700 border-red-200 font-extrabold",
    };
    return (
      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md border ${colors[priority] || colors.Medium}`}>
        {priority}
      </span>
    );
  };

  return (
    <>
      {/* =========================================================
          SUB-VIEW 1: SINGLE TICKET AUDIT & DISCUSSION VIEW
          ========================================================= */}
      {selectedTicket ? (
        <TicketDetailsView
          ticket={selectedTicket}
          fetchingDetails={fetchingDetails}
          replyMessage={replyMessage}
          setReplyMessage={setReplyMessage}
          replyLoading={replyLoading}
          onBack={() => setSelectedTicket(null)}
          onSendReply={handleSendReply}
          renderStatusBadge={renderStatusBadge}
          renderPriorityBadge={renderPriorityBadge}
          onOpenLightbox={(src, label) => setLightboxImage({ src, label })}
        />
      ) : (
        /* =========================================================
            SUB-VIEW 2: PRIMARY LIST TABLE LEDGER VIEW
            ========================================================= */
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 bg-slate-50 min-h-screen font-sans antialiased text-slate-800">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <LifeBuoy className="text-blue-600" size={26} /> Help & Support Center
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Submit queries, track resolution progress, or communicate with our support desk
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-extrabold hover:bg-blue-700 shadow-md shadow-blue-100 transition cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} /> New Support Request
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
            {["all", "Open", "In_Progress", "Resolved", "Closed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-xs font-black"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {tab === "all" ? "All Requests" : tab.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Dedicated Table Ledger System */}
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Ticket Particulars</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Last Activity</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center">
                        <Loader2 className="animate-spin text-blue-600 inline-block mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fetching Support Records...</p>
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center font-bold text-slate-400 bg-slate-50/20 italic text-xs uppercase tracking-wider">
                        No support tickets found under this filter selection.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        onClick={() => fetchTicketDetails(ticket._id)}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      >
                        {/* Subject & ID */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] font-bold text-blue-600">
                              {ticket.ticketId || ticket._id?.slice(-8)}
                            </span>
                            <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 max-w-sm">
                              {ticket.subject}
                            </h4>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Tag size={11} className="text-slate-400" /> {ticket.category}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderPriorityBadge(ticket.priority)}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {renderStatusBadge(ticket.status)}
                        </td>

                        {/* Updated Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-[11px] text-slate-400 font-medium">
                          {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchTicketDetails(ticket._id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black transition cursor-pointer border border-blue-100"
                          >
                            <Eye size={13} /> View Thread
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          CREATE NEW TICKET MODAL
          ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <LifeBuoy className="text-blue-600" size={20} /> Create Support Ticket
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Subject / Summary *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Redemption QR scanner error, Bachat Coin payout query"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800 transition"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Category *
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Priority Level
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Describe what went wrong, including offer names or transaction codes..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800 resize-none transition"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 shadow-md shadow-blue-100"
                >
                  {createLoading && <Loader2 className="animate-spin" size={14} />} Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ROOT LEVEL FULLSCREEN IMAGE LIGHTBOX MODAL --- */}
      {lightboxImage && (
        <ImageLightboxModal 
          image={lightboxImage} 
          onClose={() => setLightboxImage(null)} 
        />
      )}
    </>
  );
};

// =========================================================
// SUB-COMPONENT: SINGLE TICKET DETAILS & DISCUSSION THREAD VIEW
// =========================================================
const TicketDetailsView = ({
  ticket,
  fetchingDetails,
  replyMessage,
  setReplyMessage,
  replyLoading,
  onBack,
  onSendReply,
  renderStatusBadge,
  renderPriorityBadge,
  onOpenLightbox
}) => {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 bg-slate-50 min-h-screen font-sans antialiased text-slate-800">
      
      {/* Return Ribbon & Direct Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Return to Support Directory
        </button>
        <span className="text-xs font-mono font-bold text-slate-400">
          ID: {ticket.ticketId || ticket._id}
        </span>
      </div>

      {fetchingDetails ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={36} />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Ticket Discussion...</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Banner & Metadata Dossier */}
          <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {ticket.ticketId || "TICKET"}
                  </span>
                  {renderStatusBadge(ticket.status)}
                  {renderPriorityBadge(ticket.priority)}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {ticket.subject}
                </h1>
              </div>

              <div className="text-left sm:text-right text-xs font-semibold text-slate-400 space-y-1 shrink-0">
                <p>Category: <strong className="text-slate-700">{ticket.category}</strong></p>
                <p>Created: <strong className="text-slate-700">{new Date(ticket.createdAt).toLocaleString()}</strong></p>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Category Focus</span>
                <p className="text-xs font-extrabold text-blue-600 mt-0.5">{ticket.category}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Current Status</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">{ticket.status?.replace("_", " ")}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Last Active</span>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-600" /> Discussion History
            </h3>

            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
              {ticket.messages?.map((msg, idx) => {
                const isAdmin = msg.senderType === "Admin";
                return (
                  <div
                    key={msg._id || idx}
                    className={`p-5 rounded-2xl border ${
                      isAdmin
                        ? "bg-blue-50/50 border-blue-100 ml-4 sm:ml-8"
                        : "bg-slate-50 border-slate-200/80 mr-4 sm:mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                        isAdmin ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {isAdmin ? "Support Agent Response" : "User Statement"}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>

                    {/* Image & Document Attachments with Fullscreen Lightbox Support */}
                    {msg.attachments?.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/50 space-y-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Attached Evidence</span>
                        <div className="flex gap-2 flex-wrap">
                          {msg.attachments.map((att, i) => {
                            const isImg = typeof att === "string" && (att.match(/\.(jpeg|jpg|gif|png|webp)/i) || att.startsWith("data:image"));
                            return isImg ? (
                              <div
                                key={i}
                                onClick={() => onOpenLightbox(att, `Attachment #${i + 1}`)}
                                className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-0.5 cursor-zoom-in hover:opacity-90 transition group relative"
                              >
                                <img src={att} alt="" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 size={12} className="text-white" />
                                </div>
                              </div>
                            ) : (
                              <a
                                key={i}
                                href={att}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-white px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50 transition"
                              >
                                <Paperclip size={12} /> Attachment #{i + 1}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form Console */}
            {ticket.status === "Closed" ? (
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                <ShieldAlert size={16} /> This support ticket is closed. Please submit a new ticket for further assistance.
              </div>
            ) : (
              <form onSubmit={onSendReply} className="pt-4 border-t border-slate-100 space-y-3">
                {ticket.status === "Resolved" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 flex items-center gap-2">
                    <AlertCircle size={15} /> Replying to this ticket will automatically reopen it for review.
                  </div>
                )}

                <textarea
                  rows="3"
                  required
                  placeholder="Type your response message or explanation here..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800 resize-none"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <p className="text-[10px] font-medium text-slate-400">
                    Non-realtime thread. You will receive updates as soon as our agent reviews your submission.
                  </p>
                  <button
                    type="submit"
                    disabled={replyLoading}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-extrabold rounded-xl text-xs hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {replyLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Send Message
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
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
          {image.label || "Attachment Preview"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download="ticket-attachment.jpg"
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

      {/* Scaled Center Image */}
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

export default HelpSupportPage;