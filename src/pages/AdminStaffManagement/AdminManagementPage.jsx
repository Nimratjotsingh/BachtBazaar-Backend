import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, UserPlus, Shield, Mail, Phone, Lock, Unlock, 
  Trash2, Edit2, Loader2, AlertCircle, RefreshCw, X, Check, Search, ShieldCheck
} from "lucide-react";
import { adminClient, buildAuthHeaders } from "../../lib/api";

const AdminStaffManagement = ({ token }) => {
  // --- Core Lifecycle States ---
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --- Pagination & Search States ---
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // --- Modal / Form Drawer States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "support",
    permissions: []
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const availableRoles = [
    { label: "Admin Manager", value: "admin_manager" },
    { label: "Support Agent", value: "support" },
    { label: "Operations", value: "operations" },
    { label: "Moderator", value: "moderator" }
  ];

  // Available Granular Permissions matching the Staff Model
  const availablePermissions = [
    { key: "view_dashboard", label: "View Staff Dashboard" },
    { key: "manage_products", label: "Manage Products" },
    { key: "manage_product_suggestions", label: "Manage Product Suggestions" },
    { key: "manage_services", label: "Manage Services" },
    { key: "manage_service_suggestions", label: "Manage Service Suggestions" },
    { key: "manage_offers", label: "Manage Offers" }
  ];

  // =========================================================
  // PIPELINE 1: FETCH STAFF DIRECTORY
  // =========================================================
  const fetchStaffList = async () => {
    try {
      setLoading(true);
      setGlobalError("");
      
      const res = await adminClient.get("/staff", {
        headers,
        params: {
          page,
          limit: 10,
          search: searchQuery || undefined,
          role: roleFilter || undefined
        }
      });

      if (res.data.success) {
        setStaffList(res.data.data || []);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch staff directory:", err);
      setGlobalError(err.response?.data?.message || "Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, [page, roleFilter]);

  // =========================================================
  // PIPELINE 2: CREATE / UPDATE MUTATION
  // =========================================================
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedStaffId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "support",
      permissions: availablePermissions.map(p => p.key) // Default to all selected
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setIsEditing(true);
    setSelectedStaffId(staff._id);
    setFormData({
      name: staff.name || "",
      email: staff.email || "",
      phone: staff.phone || "",
      password: "", // Keep password blank unless changing
      role: staff.role || "support",
      permissions: staff.permissions || []
    });
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (permissionKey) => {
    setFormData(prev => {
      const current = prev.permissions || [];
      if (current.includes(permissionKey)) {
        return { ...prev, permissions: current.filter(p => p !== permissionKey) };
      } else {
        return { ...prev, permissions: [...current, permissionKey] };
      }
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setGlobalError("");

      const payload = { ...formData };
      if (isEditing && (!payload.password || payload.password.trim() === "")) {
        delete payload.password; // Do not overwrite with empty string
      }

      const res = isEditing
        ? await adminClient.put(`/staff/${selectedStaffId}`, payload, { headers })
        : await adminClient.post("/staff", payload, { headers });

      if (res.data.success) {
        setSuccessMessage(isEditing ? "Staff member updated successfully." : "New staff account created successfully.");
        setIsModalOpen(false);
        fetchStaffList();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch (err) {
      console.error("Staff mutation error:", err);
      setGlobalError(err.response?.data?.message || "Failed to process staff operation.");
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // PIPELINE 3: DELETE STAFF
  // =========================================================
  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      setActionLoading(true);
      const res = await adminClient.delete(`/staff/${id}`, { headers });
      if (res.data.success) {
        setSuccessMessage("Staff member deleted successfully.");
        fetchStaffList();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch (err) {
      setGlobalError(err.response?.data?.message || "Failed to delete staff member.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto text-slate-800 antialiased font-sans">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2.5 tracking-tight">
            <Users className="text-blue-600 w-8 h-8" /> Staff Management Console
          </h1>
          <p className="text-blue-500 text-sm mt-0.5">Provision and manage internal administrative staff accounts and roles</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStaffList} 
            className="p-2.5 bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 rounded-2xl transition cursor-pointer shadow-xs"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-100 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={15} /> Add New Staff
          </button>
        </div>
      </div>

      {globalError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertCircle size={16} /> {globalError}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-700 flex items-center gap-2">
          <Check size={16} /> {successMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-blue-100 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search staff by name, email, or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStaffList()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
        >
          <option value="">All Staff Roles</option>
          {availableRoles.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <button
          onClick={fetchStaffList}
          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
        >
          Search
        </button>
      </div>

      {/* Staff Table / Ledger */}
      <div className="bg-white rounded-[32px] border border-blue-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-blue-50 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-blue-50/20">
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4">Assigned Role</th>
                <th className="px-6 py-4">Permissions Matrix</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center text-blue-500">
                    <Loader2 className="animate-spin inline-block mb-2" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Staff Ledger...</p>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400 font-bold italic">
                    No staff members found matching criteria.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                          {staff.name?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="font-extrabold text-blue-950 text-sm">{staff.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">ID: {staff._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <p className="text-slate-800 font-bold flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {staff.phone}</p>
                      <p className="text-slate-500 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {staff.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">
                        {staff.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(staff.permissions || []).length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">No permissions</span>
                        ) : (
                          staff.permissions.map((p, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono font-bold">
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        staff.isBlocked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${staff.isBlocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        {staff.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenEditModal(staff)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition cursor-pointer inline-flex items-center"
                        title="Edit Staff"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(staff._id)}
                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer inline-flex items-center"
                        title="Delete Staff"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
          <span>Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong></span>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)} 
              className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 cursor-pointer shadow-2xs"
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)} 
              className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          CREATE / EDIT STAFF MODAL / DRAWER
         ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleFormSubmit}
            className="bg-white p-8 rounded-[32px] max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-blue-950 uppercase tracking-tight">
                {isEditing ? "Modify Staff Account" : "Provision New Staff Member"}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., John Doe" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@company.com" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <input 
                    type="text" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEditing ? "New Password (Leave blank to keep current)" : "Password"}
                </label>
                <input 
                  type="password" 
                  required={!isEditing}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Staff Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 cursor-pointer text-xs"
                >
                  {availableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Permissions Checkbox Matrix */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Granular Permissions Matrix
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  {availablePermissions.map((perm) => {
                    const isChecked = (formData.permissions || []).includes(perm.key);
                    return (
                      <label 
                        key={perm.key} 
                        className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-300 transition select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePermissionToggle(perm.key)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500/20 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-800">Block Access</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isBlocked: !formData.isBlocked })}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${formData.isBlocked ? 'bg-rose-500 justify-end' : 'bg-slate-300 justify-start'}`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                {actionLoading && <Loader2 className="animate-spin" size={14} />}
                {isEditing ? "Save Changes" : "Create Staff Account"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminStaffManagement;