// Non-component helpers for the analytics pages.

import { useCallback, useEffect, useMemo, useState } from "react";

import API from "../services/api";

export const CHART = {
  brand: "#6366f1",
  green: "#10b981",
  red: "#f43f5e",
  amber: "#f59e0b",
  grid: "#e2e8f0",
  axis: "#94a3b8",
};

// ---------------------------------------------------------
// Formatting
// ---------------------------------------------------------

export const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

export const formatPct = (value) =>
  `${Number.isFinite(Number(value)) ? Number(value) : 0}%`;

export const titleCase = (value) =>
  String(value || "—")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const getError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

const listOf = (response) => {
  const data = response?.data?.data;
  return Array.isArray(data) ? data : data?.users || data?.items || [];
};

// Client-side CSV of the rows currently on screen.
export const downloadCsv = (filename, columns, rows) => {
  const cell = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [
    columns.map((c) => cell(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => cell(row[c.key])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------
// Filters: period + owner + team + territory
// ---------------------------------------------------------

export const PERIODS = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "THIS_QUARTER", label: "This quarter" },
  { value: "NEXT_QUARTER", label: "Next quarter" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "ALL", label: "All time" },
  { value: "CUSTOM", label: "Custom range" },
];

const toInputDate = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const getRange = (period) => {
  const now = new Date();
  const year = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3) * 3;
  const ranges = {
    THIS_MONTH: [new Date(year, now.getMonth(), 1), new Date(year, now.getMonth() + 1, 0)],
    THIS_QUARTER: [new Date(year, q, 1), new Date(year, q + 3, 0)],
    NEXT_QUARTER: [new Date(year, q + 3, 1), new Date(year, q + 6, 0)],
    THIS_YEAR: [new Date(year, 0, 1), new Date(year, 11, 31)],
  };
  return ranges[period] || [null, null];
};

export function useAnalyticsFilters(defaultPeriod = "THIS_YEAR") {
  const [state, setState] = useState({
    period: defaultPeriod,
    from: "",
    to: "",
    owner: "",
    team: "",
    territory: "",
  });
  const [lists, setLists] = useState({ owners: [], teams: [], territories: [] });

  useEffect(() => {
    Promise.all(
      ["/users", "/teams", "/territories"].map((url) =>
        API.get(url, { params: { limit: 100 } }).then(listOf).catch(() => [])
      )
    ).then(([owners, teams, territories]) => setLists({ owners, teams, territories }));
  }, []);

  const params = useMemo(() => {
    const result = {};
    const [from, to] =
      state.period === "CUSTOM" ? [state.from, state.to] : getRange(state.period).map((d) => d && toInputDate(d));
    if (from) result.from = from;
    if (to) result.to = to;
    ["owner", "team", "territory"].forEach((key) => {
      if (state[key]) result[key] = state[key];
    });
    return result;
  }, [state]);

  const set = (key) => (event) => setState((prev) => ({ ...prev, [key]: event.target.value }));

  return { state, set, params, lists };
}

// Loads `url` with `params`; reloads when params change.
// Loading is derived from the request key, so stale
// responses are ignored and no state is set synchronously.
export function useReport(url, params) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const key = JSON.stringify([url, params || {}, nonce]);

  useEffect(() => {
    let active = true;
    API.get(url, { params })
      .then((res) => active && setResult({ key, data: res?.data?.data ?? null, error: "" }))
      .catch((err) => active && setResult({ key, data: null, error: getError(err) }));
    return () => {
      active = false;
    };
    // `key` covers url, params and nonce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loading = result.key !== key;

  return { data: result.data, loading, error: loading ? "" : result.error, reload };
}

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  return [toast, showToast, () => setToast(null)];
}
