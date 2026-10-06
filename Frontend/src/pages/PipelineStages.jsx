import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GitBranch,
  Pencil,
  Plus,
  Power,
  Trash2,
} from "lucide-react";

import API from "../services/api";
import Modal from "../components/common/Modal";

const SYSTEM_KEYS = ["CLOSED_WON", "CLOSED_LOST"];

const EMPTY_FORM = { name: "", isActive: true };

const getError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

export default function PipelineStages() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const loadStages = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/pipeline-stages");
      const data = response?.data?.data;
      setStages(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await loadStages();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;

    const ids = stages.map((stage) => stage._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    run(() => API.put("/pipeline-stages/reorder", { ids }));
  };

  const toggleActive = (stage) =>
    run(() =>
      API.put(`/pipeline-stages/${stage._id}`, { isActive: !stage.isActive })
    );

  const handleDelete = (stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"?`)) return;
    run(() => API.delete(`/pipeline-stages/${stage._id}`));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (stage) => {
    setEditing(stage);
    setForm({ name: stage.name, isActive: stage.isActive });
    setFormError("");
    setOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (editing) {
        await API.put(`/pipeline-stages/${editing._id}`, { name: form.name });
      } else {
        await API.post("/pipeline-stages", form);
      }
      setOpen(false);
      await loadStages();
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GitBranch className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Pipeline Stages
            </h1>
            <p className="text-sm text-slate-500">
              Configure opportunity stages, their order and availability.
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Stage
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
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Opportunities</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading stages...
                </td>
              </tr>
            ) : stages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No stages found.
                </td>
              </tr>
            ) : (
              stages.map((stage, index) => {
                const isSystem =
                  stage.isSystem || SYSTEM_KEYS.includes(stage.key);
                const inUse = stage.opportunityCount > 0;

                return (
                  <tr key={stage._id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={busy || index === 0}
                          onClick={() => move(index, -1)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          disabled={busy || index === stages.length - 1}
                          onClick={() => move(index, 1)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <span className="ml-1 text-slate-400">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {stage.name}
                      {isSystem && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          SYSTEM
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {stage.key}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {stage.opportunityCount || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          stage.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {stage.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(stage)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!isSystem && (
                          <button
                            disabled={busy}
                            onClick={() => toggleActive(stage)}
                            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                            title={stage.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                        {!isSystem && !inUse && (
                          <button
                            disabled={busy}
                            onClick={() => handleDelete(stage)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      <p className="text-xs text-slate-400">
        Stages used by opportunities cannot be deleted — deactivate them
        instead. Closed Won / Closed Lost are required and always active.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Rename Stage: ${editing.name}` : "New Stage"}
        size="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <input
            required
            maxLength={60}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Stage name (e.g. Site Visit)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          {!editing && (
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
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
