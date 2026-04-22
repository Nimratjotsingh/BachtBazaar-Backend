import { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../lib/api";
import { 
  Search, 
  RotateCcw, 
  UserCog, 
  Ban, 
  UserCheck, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Loader2,
  Phone,
  User as UserIcon
} from "lucide-react";

function UsersPage({ token }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadUsers = async () => {
    setLoading(true);
    setFeedback("");
    try {
      const response = await adminClient.get("/users", {
        headers,
        params: { page, limit: 10, search }
      });
      setItems(response.data.users || []);
      setTotalPages(response.data.pages || 1);
    } catch (requestError) {
      setFeedback(requestError.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const runAction = async (actionFn) => {
    setFeedback("");
    try {
      await actionFn();
      await loadUsers();
    } catch (requestError) {
      setFeedback(requestError.response?.data?.message || "Action failed");
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadUsers();
  };

  const resetSearch = () => {
    setSearch("");
    setPage(1);
    loadUsers();
  };

  const editUser = async (user) => {
    const name = window.prompt("Update Name", user.name || "");
    if (name === null) return;
    const address = window.prompt("Update Address", user.address || "");
    if (address === null) return;
    
    await runAction(() => 
      adminClient.put(`/users/${user._id}`, { name, address }, { headers })
    );
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Users Management</h1>
          <p className="text-blue-500 font-medium">Monitor account activity and enforce community guidelines.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <form className="relative flex-1 w-full" onSubmit={submitSearch}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" size={18} />
          <input
            className="h-12 w-full rounded-2xl border border-blue-50 bg-blue-50/30 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
          />
        </form>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={submitSearch}
            className="flex-1 md:flex-none h-12 px-8 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            Filter
          </button>
          <button 
            onClick={resetSearch}
            className="h-12 px-4 bg-white border border-blue-100 text-blue-600 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-all"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm font-bold">
          <ShieldAlert size={18} /> {feedback}
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-blue-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50/50 border-b border-blue-50">
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest">User Details</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest">Contact Info</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest text-center">KYC Check</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {loading ? (
                <tr>
                  <td className="px-8 py-24 text-center" colSpan="5">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-blue-600" size={40} />
                      <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">Updating Records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-8 py-24 text-center text-slate-400 font-medium" colSpan="5">No active users found.</td>
                </tr>
              ) : (
                items.map((user) => (
                  <tr key={user._id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-200">
                          {user.name?.[0]?.toUpperCase() || <UserIcon size={20} />}
                        </div>
                        <div>
                          <div className="font-black text-slate-900">{user.name || "Guest User"}</div>
                          <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">UID: {user._id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                        <Phone size={14} className="text-blue-400" />
                        {user.phone || "---"}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        user.status === 'banned' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {user.status || "active"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className={`inline-flex items-center gap-2 font-bold text-xs ${user.isVerified ? 'text-blue-600' : 'text-slate-300'}`}>
                        <UserCheck size={16} />
                        {user.isVerified ? "Verified" : "Pending"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-3">
                        <button
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          onClick={() => editUser(user)}
                        >
                          <UserCog size={18} />
                        </button>
                        <button
                          className={`p-2.5 rounded-xl transition-all shadow-sm ${
                            user.status === 'banned' 
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' 
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                          }`}
                          onClick={() => runAction(() => adminClient.put(`/users/${user._id}/status`, { status: user.status === "banned" ? "active" : "banned" }, { headers }))}
                        >
                          <Ban size={18} />
                        </button>
                        <button
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          onClick={() => {
                            if (window.confirm("Delete this user?")) 
                              runAction(() => adminClient.delete(`/users/${user._id}`, { headers }));
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Container */}
      <div className="flex flex-col items-center justify-between gap-6 py-6 md:flex-row bg-white/50 p-6 rounded-[2rem] border border-blue-50">
        <p className="text-xs font-black text-blue-900 uppercase tracking-[0.2em]">
          Page <span className="text-blue-600 px-2 py-1 bg-white rounded-lg shadow-sm">{page}</span> of {totalPages}
        </p>
        <div className="flex gap-3">
          <button
            className="h-12 px-6 flex items-center gap-2 rounded-2xl border border-blue-100 bg-white text-blue-600 font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={20} /> Prev
          </button>
          <button
            className="h-12 px-6 flex items-center gap-2 rounded-2xl border border-blue-100 bg-white text-blue-600 font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default UsersPage;