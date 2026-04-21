import { useEffect, useMemo, useState } from "react";
import { adminClient, buildAuthHeaders } from "../lib/api";

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

  const submitSearch = async (event) => {
    event.preventDefault();
    setPage(1);
    await loadUsers();
  };

  const resetSearch = async () => {
    setSearch("");
    setPage(1);
    await loadUsers();
  };

  const editUser = async (user) => {
    const name = window.prompt("Name", user.name || "");
    if (name === null) return;
    const gender = window.prompt("Gender (male/female/other)", user.gender || "") || undefined;
    const address = window.prompt("Address", user.address || "") || undefined;
    await runAction(() => adminClient.put(`/users/${user._id}`, { name, gender, address }, { headers }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Users Management</h1>
          <p className="text-sm text-slate-600">Manage user accounts, status, roles, and profile data.</p>
        </div>
      </div>

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={submitSearch}>
        <input
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone"
        />
        <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">Search</button>
        <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={resetSearch}>Reset</button>
      </form>

      {/* <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Create User is currently disabled.</p>
      </div> */}

      {feedback && <p className="mb-4 text-sm font-semibold text-blue-700">{feedback}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-215 w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Verified</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4" colSpan="6">Loading users...</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-3 py-4" colSpan="6">No users found.</td>
              </tr>
            )}
            {!loading &&
              items.map((user) => (
                <tr key={user._id} className="border-t border-slate-100">
                  <td className="px-3 py-3">{user.name || "-"}</td>
                  <td className="px-3 py-3">{user.phone || "-"}</td>
                  <td className="px-3 py-3">{user.role || "user"}</td>
                  <td className="px-3 py-3">{user.status || "active"}</td>
                  <td className="px-3 py-3">{user.isVerified ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => editUser(user)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() =>
                          runAction(() =>
                            adminClient.put(
                              `/users/${user._id}/status`,
                              { status: user.status === "banned" ? "active" : "banned" },
                              { headers }
                            )
                          )
                        }
                      >
                        {user.status === "banned" ? "Unban" : "Ban"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => {
                          const role = window.prompt("Role (user/super_admin)", user.role || "user");
                          if (!role) return;
                          runAction(() => adminClient.put(`/users/${user._id}/role`, { role }, { headers }));
                        }}
                      >
                        Role
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                        onClick={() => {
                          if (!window.confirm("Delete this user?")) return;
                          runAction(() => adminClient.delete(`/users/${user._id}`, { headers }));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous
        </button>
        <span className="text-sm font-semibold text-slate-600">Page {page} of {totalPages}</span>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default UsersPage;
