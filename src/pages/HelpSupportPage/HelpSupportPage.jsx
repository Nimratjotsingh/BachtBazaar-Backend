import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { accountClient } from "../../lib/api"; // Adjust API import path as needed

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
      // Refresh thread messages
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
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} /> Open
          </span>
        );
      case "In_Progress":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw size={12} className="animate-spin" /> In Progress
          </span>
        );
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case "Closed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle size={12} /> Closed
          </span>
        );
      default:
        return null;
    }
  };

  const renderPriorityBadge = (priority) => {
    const colors = {
      Low: "bg-slate-100 text-slate-600",
      Medium: "bg-blue-50 text-blue-600",
      High: "bg-amber-50 text-amber-700",
      Urgent: "bg-red-50 text-red-700 font-extrabold",
    };
    return (
      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${colors[priority] || colors.Medium}`}>
        {priority}
      </span>
    );
  };

  // --- VIEWS ---

  // 1. Thread Message Detail View
  if (selectedTicket) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen font-sans antialiased text-slate-800">
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-xs font-extrabold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Support Directory
        </button>

        {fetchingDetails ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Ticket History...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ticket Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-black text-slate-400">{selectedTicket.ticketId}</span>
                    {renderStatusBadge(selectedTicket.status)}
                    {renderPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h1 className="text-xl font-black text-slate-900">{selectedTicket.subject}</h1>
                </div>

                <div className="text-right text-[11px] font-bold text-slate-400">
                  <p>Category: <span className="text-slate-700">{selectedTicket.category}</span></p>
                  <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-600" /> Discussion History
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {selectedTicket.messages?.map((msg, idx) => {
                  const isAdmin = msg.senderType === "Admin";
                  return (
                    <div
                      key={msg._id || idx}
                      className={`p-4 rounded-2xl border ${
                        isAdmin
                          ? "bg-blue-50/50 border-blue-100 ml-6"
                          : "bg-slate-50 border-slate-200/80 mr-6"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isAdmin ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {isAdmin ? "Support Agent Response" : "Your Message"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>

                      {msg.attachments?.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-blue-200"
                            >
                              <Paperclip size={12} /> Attachment #{i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              {selectedTicket.status === "Closed" ? (
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                  <ShieldAlert size={16} /> This support ticket has been closed. Create a new request for further assistance.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 space-y-3">
                  {selectedTicket.status === "Resolved" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-700 flex items-center gap-2">
                      <AlertCircle size={14} /> Replying to this resolved ticket will automatically reopen it.
                    </div>
                  )}

                  <textarea
                    rows="3"
                    required
                    placeholder="Type your follow-up message or explanation..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800 resize-none"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                  />

                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-medium text-slate-400">
                      Non-realtime thread. You will receive an update once an agent responds.
                    </p>
                    <button
                      type="submit"
                      disabled={replyLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition cursor-pointer shadow-sm"
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
  }

  // 2. Ticket Directory Main View
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <LifeBuoy className="text-blue-600" size={26} /> Help & Support Center
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Submit queries, track resolution progress, or communicate with our support desk
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-extrabold hover:bg-blue-700 shadow-md transition cursor-pointer"
        >
          <Plus size={16} /> New Support Request
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {["all", "Open", "In_Progress", "Resolved", "Closed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            {tab === "all" ? "All Requests" : tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching Tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <FileText className="text-slate-300 mx-auto" size={40} />
            <h3 className="text-sm font-extrabold text-slate-700">No Support Tickets Found</h3>
            <p className="text-xs text-slate-400 font-medium">You have no active support requests under this filter.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              onClick={() => fetchTicketDetails(ticket._id)}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-black text-slate-400">{ticket.ticketId}</span>
                  {renderStatusBadge(ticket.status)}
                  {renderPriorityBadge(ticket.priority)}
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                  {ticket.subject}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <Tag size={12} /> {ticket.category} • Updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3.5 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                View Thread <ArrowLeft size={14} className="rotate-180" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <LifeBuoy className="text-blue-600" size={20} /> Create Support Ticket
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
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
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
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
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 resize-none"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 transition"
                >
                  {createLoading && <Loader2 className="animate-spin" size={14} />} Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupportPage;