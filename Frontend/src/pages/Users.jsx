import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Search,
  Power,
} from "lucide-react";

import API from "../services/api";
import Modal from "../components/common/Modal";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "",
  isActive: true,
};

const getError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

// Logged-in user, used to hide self delete/deactivate.
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?._id || user?.id || null;
  } catch {
    return null;
  }
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const currentUserId = getCurrentUserId();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (status) params.isActive = status;

      const response = await API.get("/users", { params });
      const data = response?.data?.data;
      const pagination = response?.data?.pagination;

      setUsers(Array.isArray(data) ? data : []);
      setPages(pagination?.pages || 1);
      setTotal(pagination?.total || 0);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    API.get("/roles", { params: { limit: 100 } })
      .then((response) => {
        const data = response?.data?.data;
        setRoles(Array.isArray(data) ? data : []);
      })
      .catch(() => setRoles([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      role: user.role?._id || user.role || "",
      isActive: user.isActive !== false,
    });
    setFormError("");
    setOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        // Update schema is strict: email/password are not editable here.
        await API.put(`/users/${editing._id}`, {
          name: form.name,
          phone: form.phone,
          role: form.role,
          isActive: form.isActive,
        });
      } else {
        await API.post("/users", {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
        });
      }
      setOpen(false);
      await loadUsers();
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    setError("");
    try {
      await API.put(`/users/${user._id}`, { isActive: !user.isActive });
      await loadUsers();
    } catch (err) {
      setError(getError(err));
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/users/${user._id}`);
      await loadUsers();
    } catch (err) {
      setError(getError(err));
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCog className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Users</h1>
            <p className="text-sm text-slate-500">
              Manage CRM users, roles and access.
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = String(user._id) === String(currentUserId);
                return (
                  <tr key={user._id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-bold text-white">
                          {(user.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-medium text-indigo-500">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {user.phone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {user.role?.name || "No role"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              onClick={() => toggleStatus(user)}
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                              title={user.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {pages} · {total} users
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit User: ${editing.name}` : "New User"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className={inputClass}
            />
            <input
              required
              type="email"
              value={form.email}
              disabled={Boolean(editing)}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className={inputClass}
            />
            {!editing && (
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password (min 8 characters)"
                className={inputClass}
              />
            )}
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className={inputClass}
            />
            <select
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
            {editing && String(editing._id) !== String(currentUserId) && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                Active
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
