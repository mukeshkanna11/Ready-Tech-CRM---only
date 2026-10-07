import { useMemo, useState } from "react";
import { Download, FileBarChart, Pencil, Play, Plus, Trash2, X } from "lucide-react";

import API from "../services/api";
import Modal from "../components/common/Modal";
import {
  DataTable,
  ErrorBox,
  PageHeader,
  Panel,
  Toast,
} from "../components/common/Analytics";
import {
  getError,
  titleCase,
  useReport,
  useToast,
} from "../utils/analytics";

const OP_LABELS = {
  eq: "equals",
  ne: "not equals",
  contains: "contains",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
};

const EMPTY = { name: "", source: "", columns: [], filters: [], sort: { field: "createdAt", dir: "desc" } };

const formatCell = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
};

const fieldLabel = (key) => titleCase(key.replace(/([a-z])([A-Z])/g, "$1_$2"));

export default function CustomReports() {
  const [toast, showToast, clearToast] = useToast();
  const sourcesReq = useReport("/reports/custom/sources");
  const listReq = useReport("/reports/custom");
  const sources = sourcesReq.data || [];
  const reports = listReq.data || [];
  const loading = sourcesReq.loading || listReq.loading;
  const error = sourcesReq.error || listReq.error;
  const [form, setForm] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState("");

  const load = () => {
    sourcesReq.reload();
    listReq.reload();
  };

  const source = sources.find((s) => s.key === form?.source);
  const fieldMap = useMemo(
    () => Object.fromEntries((source?.fields || []).map((f) => [f.key, f])),
    [source]
  );
  const sourceLabel = (key) => sources.find((s) => s.key === key)?.label || key;

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const toggleColumn = (key) =>
    update({
      columns: form.columns.includes(key)
        ? form.columns.filter((c) => c !== key)
        : [...form.columns, key],
    });
  const setFilter = (index, patch) =>
    update({ filters: form.filters.map((f, i) => (i === index ? { ...f, ...patch } : f)) });

  const run = async (report) => {
    setRunning(report._id);
    try {
      const res = await API.get(`/reports/custom/${report._id}/run`);
      setResult(res?.data?.data || null);
    } catch (err) {
      showToast(getError(err), "error");
    } finally {
      setRunning("");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, filters: form.filters.filter((f) => f.field) };
      const res = form._id
        ? await API.put(`/reports/custom/${form._id}`, payload)
        : await API.post("/reports/custom", payload);
      showToast(form._id ? "Report updated" : "Report created");
      setForm(null);
      listReq.reload();
      run(res.data.data);
    } catch (err) {
      showToast(getError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (report) => {
    if (!window.confirm(`Delete report "${report.name}"?`)) return;
    try {
      await API.delete(`/reports/custom/${report._id}`);
      showToast("Report deleted");
      if (result?.report?._id === report._id) setResult(null);
      listReq.reload();
    } catch (err) {
      showToast(getError(err), "error");
    }
  };

  const exportCsv = async (report) => {
    try {
      const res = await API.get(`/reports/custom/${report._id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.name}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(getError(err), "error");
    }
  };

  const reportColumns = [
    { key: "name", label: "Report", render: (r) => <span className="cell-strong">{r.name}</span> },
    { key: "source", label: "Source", render: (r) => <span className="badge badge-brand">{sourceLabel(r.source)}</span> },
    { key: "columns", label: "Columns", render: (r) => r.columns.length },
    { key: "filters", label: "Filters", render: (r) => r.filters.length },
    { key: "createdBy", label: "Owner", render: (r) => r.createdBy?.name || "—" },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button type="button" title="Run" onClick={() => run(r)} disabled={running === r._id} className="btn-icon">
            <Play size={15} />
          </button>
          <button type="button" title="Export CSV" onClick={() => exportCsv(r)} className="btn-icon">
            <Download size={15} />
          </button>
          <button type="button" title="Edit" onClick={() => setForm({ ...EMPTY, ...r })} className="btn-icon">
            <Pencil size={15} />
          </button>
          <button type="button" title="Delete" onClick={() => remove(r)} className="btn-icon text-rose-600">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
      <Toast toast={toast} onClose={clearToast} />
      <PageHeader
        icon={FileBarChart}
        title="Custom Reports"
        subtitle="Build, save and run reports on your CRM data."
        onRefresh={load}
        loading={loading}
      >
        <button type="button" onClick={() => setForm({ ...EMPTY })} className="btn btn-primary">
          <Plus size={16} /> New Report
        </button>
      </PageHeader>

      <ErrorBox error={error} onRetry={load} />

      <Panel title="Saved Reports">
        {listReq.loading && !reports.length ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : (
          <DataTable columns={reportColumns} rows={reports} rowKey={(r) => r._id} empty="No saved reports yet. Create one to get started." />
        )}
      </Panel>

      {result && (
        <Panel
          title={result.report?.name || "Results"}
          hint={`${result.rows.length} of ${result.total} rows${result.truncated ? " (showing first 1000)" : ""}`}
          actions={
            <button type="button" onClick={() => setResult(null)} className="btn-icon">
              <X size={16} />
            </button>
          }
        >
          <DataTable
            columns={result.columns.map((key) => ({ key, label: fieldLabel(key), render: (row) => formatCell(row[key]) }))}
            rows={result.rows}
            empty="No records match this report's filters."
          />
        </Panel>
      )}

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?._id ? "Edit Report" : "New Report"}
        subtitle="Choose a data source, columns, filters and sorting."
        size="max-w-3xl"
      >
        {form && (
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label label-required">Report name</label>
                <input className="input" value={form.name} maxLength={100} required onChange={(e) => update({ name: e.target.value })} />
              </div>
              <div>
                <label className="label label-required">Data source</label>
                <select
                  className="select"
                  value={form.source}
                  required
                  onChange={(e) => update({ source: e.target.value, columns: [], filters: [], sort: { field: "createdAt", dir: "desc" } })}
                >
                  <option value="">Select module…</option>
                  {sources.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {source && (
              <>
                <div>
                  <label className="label label-required">Columns ({form.columns.length})</label>
                  <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                    {source.fields.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => toggleColumn(f.key)}
                        className={`badge cursor-pointer ${form.columns.includes(f.key) ? "badge-brand" : "badge-slate"}`}
                      >
                        {fieldLabel(f.key)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label !mb-0">Filters</label>
                    <button
                      type="button"
                      disabled={form.filters.length >= 10}
                      onClick={() => update({ filters: [...form.filters, { field: "", op: "eq", value: "" }] })}
                      className="btn btn-sm btn-ghost"
                    >
                      <Plus size={14} /> Add filter
                    </button>
                  </div>
                  {form.filters.map((f, i) => {
                    const meta = fieldMap[f.field];
                    const inputType = meta?.type === "Number" ? "number" : meta?.type === "Date" ? "date" : "text";
                    return (
                      <div key={i} className="grid gap-2 sm:grid-cols-[1fr_130px_1fr_auto]">
                        <select className="select" value={f.field} onChange={(e) => setFilter(i, { field: e.target.value, op: "eq", value: "" })}>
                          <option value="">Field…</option>
                          {source.fields.map((x) => (
                            <option key={x.key} value={x.key}>{fieldLabel(x.key)}</option>
                          ))}
                        </select>
                        <select className="select" value={f.op} onChange={(e) => setFilter(i, { op: e.target.value })}>
                          {(meta?.ops || ["eq"]).map((op) => (
                            <option key={op} value={op}>{OP_LABELS[op]}</option>
                          ))}
                        </select>
                        {meta?.type === "Boolean" ? (
                          <select className="select" value={f.value} onChange={(e) => setFilter(i, { value: e.target.value })}>
                            <option value="">Select…</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            className="input"
                            type={inputType}
                            value={f.value}
                            placeholder={meta?.type === "ObjectId" ? "Record ID" : "Value"}
                            onChange={(e) => setFilter(i, { value: e.target.value })}
                          />
                        )}
                        <button type="button" onClick={() => update({ filters: form.filters.filter((_, j) => j !== i) })} className="btn-icon">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Sort by</label>
                    <select className="select" value={form.sort.field} onChange={(e) => update({ sort: { ...form.sort, field: e.target.value } })}>
                      <option value="createdAt">Created At</option>
                      {source.fields.filter((f) => f.key !== "createdAt").map((f) => (
                        <option key={f.key} value={f.key}>{fieldLabel(f.key)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Direction</label>
                    <select className="select" value={form.sort.dir} onChange={(e) => update({ sort: { ...form.sort, dir: e.target.value } })}>
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={saving || !form.columns.length} className="btn btn-primary">
                {saving ? "Saving…" : "Save & Run"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
