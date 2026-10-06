import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";

import API from "../services/api";
import Modal from "../components/common/Modal";

// Permission keys match the backend seed (RESOURCE:ACTION).
const RESOURCES = [
  "DASHBOARD",
  "COMPANIES",
  "CONTACTS",
  "LEADS",
  "OPPORTUNITIES",
  "ACTIVITIES",
  "TASKS",
  "NOTES",
  "PRODUCTS",
  "QUOTATIONS",
  "INVOICES",
  "NOTIFICATIONS",
  "REPORTS",
  "USERS",
  "ROLES",
  "AUTOMATIONS",
];

const ACTIONS = ["READ", "CREATE", "UPDATE", "DELETE"];

const EXTRA_PERMISSIONS = [
  "LEADS:ASSIGN",
  "LEADS:CONVERT",
  "TASKS:ASSIGN",
  "INVOICES:PAYMENT",
  "REPORTS:EXPORT",
  "AUDIT_LOGS:READ",
];

const EMPTY_FORM = { name: "", description: "", permissions: [] };

const getError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/roles", { params: { limit: 100 } });
      const data = response?.data?.data;
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setForm({
      name: role.name || "",
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setOpen(true);
  };

  const hasPermission = (key) => form.permissions.includes(key);

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await API.put(`/roles/${editing._id}`, form);
      } else {
        await API.post("/roles", form);
      }
      setOpen(false);
      await loadRoles();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/roles/${role._id}`);
      await loadRoles();
    } catch (err) {
      setError(getError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Roles & Permissions
            </h1>
            <p className="text-sm text-slate-500">
              Manage what each role can access.
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Role
        </button>
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
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No roles found.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role._id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {role.name}
                    {role.isSystem && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        SYSTEM
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {role.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {role.permissions?.includes("*")
                      ? "All"
                      : role.permissions?.length || 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(role)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => handleDelete(role)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit Role: ${editing.name}` : "New Role"}
        size="max-w-4xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              value={form.name}
              disabled={editing?.isSystem}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Role name (e.g. SALES_LEAD)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Description"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {hasPermission("*") ? (
            <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              This role has full access (*).
            </p>
          ) : (
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Module</th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="px-3 py-2">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RESOURCES.map((resource) => (
                    <tr key={resource}>
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {resource}
                      </td>
                      {ACTIONS.map((action) => {
                        const key = `${resource}:${action}`;
                        return (
                          <td key={key} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={
                                hasPermission(key) ||
                                hasPermission(`${resource}:*`)
                              }
                              disabled={hasPermission(`${resource}:*`)}
                              onChange={() => togglePermission(key)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-wrap gap-4 border-t border-slate-200 px-3 py-3">
                {EXTRA_PERMISSIONS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-xs text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={hasPermission(key)}
                      onChange={() => togglePermission(key)}
                    />
                    {key}
                  </label>
                ))}
              </div>
            </div>
          )}

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
