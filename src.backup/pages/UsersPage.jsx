import { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../lib/api";
import { 
  Search, RotateCcw, UserCog, Ban, UserCheck, Trash2, 
  ChevronLeft, ChevronRight, ShieldAlert, Loader2, Phone,
  User as UserIcon, X, Mail, MapPin, Calendar, Smartphone, Info
} from "lucide-react";

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
  const [editForm, setEditForm] = useState({ name: "", address: "", gender: "" });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const loadUsers = async () => {
    setLoading(true);
    setFeedback("");
    try {
      const response = await adminClient.get("/users", {
        headers,
        params: { page, limit: 10, search }
      });
      console.log(response.data)
      setItems(response.data.users || []);
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      setFeedback(err.response?.data?.message || "Failed to load users");
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
      return true;
    } catch (err) {
      setFeedback(err.response?.data?.message || "Action failed");
      return false;
    }
  };

  const openUserDrawer = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      address: user.address || "",
      gender: user.gender || "male"
    });
    setIsDrawerOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const success = await runAction(() => 
      adminClient.put(`/users/${selectedUser._id}`, editForm, { headers })
    );
    if (success) setIsDrawerOpen(false);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  return (
    <section className="relative flex flex-col space-y-6 animate-in fade-in duration-500 min-h-screen">
      
      {/* --- Main Content Area --- */}
      <div className={`transition-all duration-300 ${isDrawerOpen ? 'mr-96 opacity-50 pointer-events-none' : 'mr-0'}`}>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Users Management</h1>
          <p className="text-blue-500 font-medium">Monitor activity and manage identities.</p>
        </div>

        {/* Search Bar */}
        <div className="mt-6 bg-white p-4 rounded-[2rem] border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <form className="relative flex-1 w-full" onSubmit={submitSearch}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" size={18} />
            <input
              className="h-12 w-full rounded-2xl border border-blue-50 bg-blue-50/30 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
            />
          </form>
          <button onClick={submitSearch} className="h-12 px-8 bg-blue-600 text-white rounded-2xl font-bold text-sm">Filter</button>
          <button onClick={() => {setSearch(""); setPage(1); loadUsers();}} className="h-12 px-4 bg-white border border-blue-100 text-blue-600 rounded-2xl"><RotateCcw size={18} /></button>
        </div>

        {feedback && (
          <div className="mt-4 flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-bold">
            <ShieldAlert size={18} /> {feedback}
          </div>
        )}

        {/* Table */}
        <div className="mt-6 bg-white rounded-[2.5rem] border border-blue-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-50/50 border-b border-blue-50">
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest">Contact</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-xs font-black text-blue-900 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {loading ? (
                <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" /></td></tr>
              ) : (
                items.map((user) => (
                  <tr key={user._id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
                          {user.name?.[0]?.toUpperCase() || "G"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.name}</div>
                          
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-600">{user.phone}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${user.status === 'banned' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => openUserDrawer(user)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                        <UserCog size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-3xl border border-blue-50">
           <span className="text-xs font-black text-blue-900 uppercase">Page {page} of {totalPages}</span>
           <div className="flex gap-2">
             <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-xl disabled:opacity-30"><ChevronLeft size={20}/></button>
             <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-xl disabled:opacity-30"><ChevronRight size={20}/></button>
           </div>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR DRAWER --- */}
      <aside 
        className={`fixed top-0 right-0 h-full w-96 bg-white border-l border-blue-100 shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedUser && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">User Details</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* Profile Hero */}
            <div className="flex flex-col items-center p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 mb-8">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl">
                {selectedUser.name?.[0]?.toUpperCase()}
              </div>
              <h3 className="text-lg font-black text-slate-900">{selectedUser.name}</h3>
              <span className={`mt-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedUser.isVerified ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {selectedUser.isVerified ? "Verified Identity" : "Pending KYC"}
              </span>
            </div>

            {/* Info Grid */}
            <div className="space-y-4 mb-8">
              <DetailBox icon={<Mail size={16}/>} label="Email Address" value={selectedUser.email} />
              <DetailBox icon={<Smartphone size={16}/>} label="Phone Number" value={selectedUser.phone} />
              <DetailBox icon={<Calendar size={16}/>} label="Member Since" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
              
            </div>

            {/* Edit Form */}
            <form onSubmit={handleUpdateUser} className="space-y-4 bg-white border border-blue-50 p-6 rounded-[2rem] shadow-sm">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-2">Edit Records</h4>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Full Name</label>
                <input 
                  className="w-full h-11 px-4 rounded-xl border border-blue-50 bg-blue-50/30 text-sm focus:border-blue-400 outline-none transition-all"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Gender</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-blue-50 bg-blue-50/30 text-sm outline-none"
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Address</label>
                <textarea 
                  className="w-full p-4 rounded-xl border border-blue-50 bg-blue-50/30 text-sm focus:border-blue-400 outline-none h-24 resize-none"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                Save Changes
              </button>
            </form>

            {/* Danger Zone Actions */}
            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => runAction(() => adminClient.put(`/users/${selectedUser._id}/status`, { status: selectedUser.status === "banned" ? "active" : "banned" }, { headers }))}
                className="flex-1 flex items-center justify-center gap-2 h-11 border border-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <Ban size={14}/> {selectedUser.status === 'banned' ? 'Unban' : 'Ban User'}
              </button>
              <button 
                onClick={() => { if(window.confirm("Delete permanently?")) runAction(() => adminClient.delete(`/users/${selectedUser._id}`, { headers })); }}
                className="h-11 w-11 flex items-center justify-center border border-slate-100 text-slate-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
              >
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

// Helper component for detail rows
function DetailBox({ icon, label, value }) {
  return (
    <div className="flex items-start gap-4 p-2">
      <div className="mt-1 text-blue-400">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
        <p className="text-sm font-semibold text-slate-700 break-all">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

export default UsersPage;