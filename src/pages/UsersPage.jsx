import { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../lib/api";
import { 
  Search, RotateCcw, Ban, Trash2, 
  ChevronLeft, ChevronRight, ShieldAlert, Loader2,
  X, Mail, MapPin, Calendar, Smartphone, Eye, 
  User as UserIcon, ShieldCheck, Hash, UserCircle
} from "lucide-react";

// --- Sub-Component: Info Card ---
const InfoCard = ({ label, value, icon: Icon, colorClass }) => (
  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:bg-white group">
    <div className={`p-2 rounded-xl ${colorClass} transition-colors`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-700 break-words">{value || "Not Provided"}</p>
    </div>
  </div>
);

function UsersPage({ token }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  
  // Sidebar State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminClient.get("/users", {
        headers,
        params: { page, limit: 10, search }
      });
      setItems(response.data.users || []);
      setTotalPages(response.data.pages || 1);
      
      // CRITICAL: Re-sync the selected user data if the drawer is open
      if (selectedUser) {
        const freshUserData = (response.data.users || []).find(u => u._id === selectedUser._id);
        if (freshUserData) setSelectedUser(freshUserData);
      }
    } catch (err) {
      setFeedback(err.response?.data?.message || "Cloud sync failed");
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
      // Instantly reload to ensure "Truth" from server
      await loadUsers();
      return true;
    } catch (err) {
      setFeedback(err.response?.data?.message || "Action failed");
      return false;
    }
  };

  const openUserDrawer = (user) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 min-h-screen bg-[#F8FAFC]">
      
      {/* --- Dashboard Header --- */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Identity Management</h1>
          <p className="text-slate-500 font-medium mt-1">Audit user accounts, manage security status, and track platform growth.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Users</p>
                <p className="text-xl font-black text-slate-900">{items.length * totalPages}</p>
            </div>
            <button 
                onClick={() => {setSearch(""); setPage(1); loadUsers();}} 
                className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-indigo-600 transition shadow-sm"
            >
                <RotateCcw size={20} />
            </button>
        </div>
      </header>

      {/* --- Command Bar --- */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <form className="relative flex-1 group" onSubmit={submitSearch}>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-transparent rounded-[1.5rem] text-sm font-bold outline-none transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or unique ID..."
          />
        </form>
        <button onClick={submitSearch} className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200">
            Apply Filters
        </button>
      </div>

      {feedback && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert size={20} /> {feedback}
        </div>
      )}

      {/* --- Main Data Grid --- */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Node</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Security Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="py-32 text-center">
                    <Loader2 className="animate-spin inline-block text-indigo-600 mb-4" size={40} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Platform Identities...</p>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className="py-32 text-center text-slate-400 font-bold uppercase text-xs tracking-widest italic">No matching identities found</td></tr>
              ) : (
                items.map((user) => (
                  <tr key={user._id} className="group hover:bg-indigo-50/30 transition-all">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black text-xl shadow-sm group-hover:border-indigo-200 group-hover:scale-105 transition-all">
                          {user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-base">{user.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">{user._id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-bold text-slate-600 text-sm">
                        <div className="flex items-center gap-2 mb-1"><Smartphone size={12} className="text-slate-300"/> {user.phone}</div>
                        <div className="flex items-center gap-2"><Mail size={12} className="text-slate-300"/> {user.email || "No Email"}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${user.status === 'banned' ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-100'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button onClick={() => openUserDrawer(user)} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- Platform Pagination --- */}
        <div className="bg-slate-50/80 px-10 py-6 flex items-center justify-between border-t border-slate-100">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identities {((page - 1) * 10) + 1} - {page * items.length}</span>
           <div className="flex gap-3">
             <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-3 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><ChevronLeft size={20}/></button>
             <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-3 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><ChevronRight size={20}/></button>
           </div>
        </div>
      </div>

      {/* --- GLOBAL IDENTITY DRAWER --- */}
      <aside 
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] transform transition-transform duration-500 z-[100] overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedUser && (
          <div className="p-10 space-y-10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Identity Audit</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Verified Member File</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* Profile Avatar Section */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative flex flex-col items-center p-10 bg-white rounded-[2.8rem] border border-slate-100 shadow-xl">
                  <div className="h-28 w-28 rounded-[2.2rem] bg-indigo-600 flex items-center justify-center text-white text-5xl font-black mb-6 shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50">
                    {selectedUser.name?.[0]?.toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{selectedUser.name}</h3>
                  <div className="flex gap-2 mt-4">
                    <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedUser.isVerified ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {selectedUser.isVerified ? "Verified User" : "Unverified"}
                    </span>
                    <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedUser.status === 'banned' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {selectedUser.status}
                    </span>
                  </div>
                </div>
            </div>

            {/* Core Identity Records */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2 mb-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Metadata Records</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <InfoCard label="Email Access" value={selectedUser.email} icon={Mail} colorClass="bg-blue-50 text-blue-500" />
                <InfoCard label="Phone Node" value={selectedUser.phone} icon={Smartphone} colorClass="bg-indigo-50 text-indigo-500" />
                <InfoCard label="Gender Identity" value={selectedUser.gender} icon={UserCircle} colorClass="bg-purple-50 text-purple-500" />
                <InfoCard label="Member UID" value={selectedUser._id} icon={Hash} colorClass="bg-slate-100 text-slate-500" />
                <InfoCard label="Platform Join Date" value={new Date(selectedUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} icon={Calendar} colorClass="bg-emerald-50 text-emerald-500" />
              </div>
            </div>

            {/* Location Data */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2 mb-2">
                    <MapPin size={18} className="text-rose-500" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Primary Residence</h4>
                </div>
                <div className="p-6 bg-rose-50/30 border border-rose-100 rounded-3xl">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                        "{selectedUser.address || "No residence address recorded in profile metadata."}"
                    </p>
                </div>
            </div>

            {/* Platform Security Console */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
               <div className="space-y-1">
                  <h4 className="text-white font-black text-lg">Security Console</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Administrative Enforcement</p>
               </div>
               
               <div className="flex gap-4">
                  <button 
                    onClick={() => runAction(() => adminClient.put(`/users/${selectedUser._id}/status`, { status: selectedUser.status === "banned" ? "active" : "banned" }, { headers }))}
                    className={`flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-3xl border-2 transition-all ${selectedUser.status === 'banned' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'}`}
                  >
                    <Ban size={24}/> 
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedUser.status === 'banned' ? 'Revoke Ban' : 'Enforce Ban'}</span>
                  </button>
                  
                  <button 
                    onClick={() => { if(window.confirm("FATAL ACTION: Delete identity permanently?")) runAction(() => adminClient.delete(`/users/${selectedUser._id}`, { headers })).then(() => setIsDrawerOpen(false)); }}
                    className="w-24 flex flex-col items-center justify-center gap-3 py-6 border-2 border-white/10 rounded-3xl text-white/30 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all"
                  >
                    <Trash2 size={24}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Purge</span>
                  </button>
               </div>
            </div>
          </div>
        )}
      </aside>

      {/* --- Backdrop Blur for Drawer --- */}
      {isDrawerOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] animate-in fade-in" onClick={() => setIsDrawerOpen(false)} />}
    </div>
  );
}

export default UsersPage;