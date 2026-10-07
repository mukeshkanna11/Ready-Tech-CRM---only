import { useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Search, Trash2, Users } from "lucide-react";

import API from "../services/api";
import Modal from "../components/common/Modal";
import EmptyState from "../components/common/EmptyState";
import {
  ErrorBox,
  PageHeader,
  Toast,
} from "../components/common/Analytics";
import {
  getError,
  useReport,
  useToast,
} from "../utils/analytics";

const TABS = [
  { key: "teams", label: "Teams", icon: Users },
  { key: "territories", label: "Territories", icon: MapPin },
];

const ids = (list) => (list || []).map((x) => x?._id || x);

function CheckList({ items, selected, onChange, render }) {
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (!items.length) return <p className="text-sm text-slate-500">Nothing to choose from.</p>;

  return (
    <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2">
      {items.map((item) => (
        <label key={item._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
          <input type="checkbox" checked={selected.includes(item._id)} onChange={() => toggle(item._id)} />
          {render(item)}
        </label>
      ))}
    </div>
  );
}

export default function Teams() {
  const [toast, showToast, clearToast] = useToast();
  const [tab, setTab] = useState("teams");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const isTeam = tab === "teams";
  const label = isTeam ? "Team" : "Territory";

  const params = useMemo(() => (search ? { search } : {}), [search]);
  const { data, loading, error, reload: load } = useReport(`/${tab}`, params);
  const items = data || [];
  // Team choices for territory assignment.
  const teamsReq = useReport("/teams");
  const teams = teamsReq.data || [];

  useEffect(() => {
    API.get("/users", { params: { limit: 100 } })
      .then((res) => setUsers(Array.isArray(res?.data?.data) ? res.data.data : []))
      .catch(() => setUsers([]));
  }, []);

  const openForm = (item) =>
    setForm({
      _id: item?._id,
      name: item?.name || "",
      description: item?.description || "",
      region: item?.region || "",
      manager: item?.manager?._id || "",
      members: ids(item?.members),
      teams: ids(item?.teams),
    });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const { _id, manager, region, teams: teamIds, ...rest } = form;
    const payload = isTeam ? { ...rest, manager: manager || null } : { ...rest, region, teams: teamIds };
    try {
      if (_id) await API.put(`/${tab}/${_id}`, payload);
      else await API.post(`/${tab}`, payload);
      showToast(`${label} ${_id ? "updated" : "created"}`);
      setForm(null);
      load();
      teamsReq.reload();
    } catch (err) {
      showToast(getError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${label.toLowerCase()} "${item.name}"?`)) return;
    try {
      await API.delete(`/${tab}/${item._id}`);
      showToast(`${label} deleted`);
      load();
      teamsReq.reload();
    } catch (err) {
      showToast(getError(err), "error");
    }
  };

  const userName = (u) => u?.name || u?.email || "Unknown";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
      <Toast toast={toast} onClose={clearToast} />
      <PageHeader icon={Users} title="Teams & Territories" subtitle="Organise salespeople into teams and sales territories." onRefresh={load} loading={loading}>
        <button type="button" onClick={() => openForm(null)} className="btn btn-primary">
          <Plus size={16} /> New {label}
        </button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`tab ${tab === t.key ? "tab-active" : ""}`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder={`Search ${tab}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <ErrorBox error={error} onRetry={load} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="card h-40 animate-pulse bg-slate-100" />)}
        </div>
      ) : !items.length ? (
        <div className="card">
          <EmptyState title={`No ${tab} yet`} description={`Create a ${label.toLowerCase()} to group salespeople and filter analytics.`} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item._id} className="card card-pad flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  {item.region && <p className="text-xs text-slate-500">{item.region}</p>}
                  {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button type="button" title="Edit" onClick={() => openForm(item)} className="btn-icon"><Pencil size={15} /></button>
                  <button type="button" title="Delete" onClick={() => remove(item)} className="btn-icon text-rose-600"><Trash2 size={15} /></button>
                </div>
              </div>

              {isTeam && (
                <p className="text-sm text-slate-600">
                  <span className="eyebrow mr-2">Manager</span>
                  {item.manager ? userName(item.manager) : "—"}
                </p>
              )}

              {!isTeam && item.teams?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.teams.map((t) => <span key={t._id} className="badge badge-violet">{t.name}</span>)}
                </div>
              )}

              <div>
                <p className="eyebrow mb-1">Members ({item.members?.length || 0})</p>
                <div className="flex flex-wrap gap-1">
                  {item.members?.length
                    ? item.members.map((m) => <span key={m._id} className="badge badge-slate">{userName(m)}</span>)
                    : <span className="text-sm text-slate-500">No members</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={`${form?._id ? "Edit" : "New"} ${label}`}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label label-required">Name</label>
                <input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              {isTeam ? (
                <div>
                  <label className="label">Manager / Team lead</label>
                  <select className="select" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}>
                    <option value="">None</option>
                    {users.map((u) => <option key={u._id} value={u._id}>{userName(u)}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Region</label>
                  <input className="input" maxLength={120} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
              )}
            </div>

            <div>
              <label className="label">Description</label>
              <textarea className="textarea" rows={2} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {!isTeam && (
              <div>
                <label className="label">Assigned teams</label>
                <CheckList items={teams} selected={form.teams} onChange={(v) => setForm({ ...form, teams: v })} render={(t) => t.name} />
              </div>
            )}

            <div>
              <label className="label">Members</label>
              <CheckList items={users} selected={form.members} onChange={(v) => setForm({ ...form, members: v })} render={userName} />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
