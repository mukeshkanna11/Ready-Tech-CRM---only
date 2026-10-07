// Shared UI building blocks for the analytics pages
// (Forecast, Sales Performance, Conversion, Custom Reports, Teams).
// Helpers/hooks live in utils/analytics.js.

import { AlertCircle, Check, RefreshCw, X } from "lucide-react";

import { PERIODS } from "../../utils/analytics";


export function FilterBar({ filters, children }) {
  const { state, set, lists } = filters;
  const select = "select !w-auto min-w-[150px]";

  return (
    <div className="card card-pad flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Period</label>
        <select value={state.period} onChange={set("period")} className={select}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {state.period === "CUSTOM" && (
        <>
          <div>
            <label className="label">From</label>
            <input type="date" value={state.from} onChange={set("from")} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={state.to} onChange={set("to")} className="input" />
          </div>
        </>
      )}

      <div>
        <label className="label">Salesperson</label>
        <select value={state.owner} onChange={set("owner")} className={select}>
          <option value="">All salespeople</option>
          {lists.owners.map((u) => (
            <option key={u._id} value={u._id}>{u.name || u.email}</option>
          ))}
        </select>
      </div>

      {lists.teams.length > 0 && (
        <div>
          <label className="label">Team</label>
          <select value={state.team} onChange={set("team")} className={select}>
            <option value="">All teams</option>
            {lists.teams.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {lists.territories.length > 0 && (
        <div>
          <label className="label">Territory</label>
          <select value={state.territory} onChange={set("territory")} className={select}>
            <option value="">All territories</option>
            {lists.territories.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {children}
    </div>
  );
}

// ---------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------

export function PageHeader({ icon: Icon, title, subtitle, onRefresh, loading, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {children}
        {onRefresh && (
          <button type="button" onClick={onRefresh} disabled={loading} className="btn btn-secondary">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

const TONES = {
  slate: "text-slate-900",
  brand: "text-indigo-600",
  green: "text-emerald-600",
  red: "text-rose-600",
  amber: "text-amber-600",
};

export function StatTile({ label, value, hint, icon: Icon, tone = "slate" }) {
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {Icon && <Icon size={16} className="text-slate-400" />}
      </div>
      <p className={`mt-2 text-2xl font-bold ${TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Panel({ title, hint, actions, children, className = "" }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="card-header">
        <div>
          <h3 className="section-title">{title}</h3>
          {hint && <p className="section-hint">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function DataTable({ columns, rows, empty = "No data for the selected filters.", rowKey }) {
  if (!rows?.length) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="table-scroll">
      <table className="crm-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row) : index}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === "right" ? "text-right" : ""}>
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-sm text-red-700">{error}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-sm btn-secondary">
          Retry
        </button>
      )}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-slate-100" />
      ))}
    </div>
  );
}

// Same inline toast pattern used by Payments/Invoices.
export function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed right-4 top-4 z-[110] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl ${
          toast.type === "error" ? "border-red-200" : "border-emerald-200"
        }`}
      >
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            toast.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle size={17} /> : <Check size={17} />}
        </div>
        <p className="flex-1 text-sm font-medium text-slate-700">{toast.message}</p>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
