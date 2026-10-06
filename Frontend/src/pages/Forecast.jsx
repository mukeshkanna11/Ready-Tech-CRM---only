import { useCallback, useEffect, useMemo, useState } from "react";
import { LineChart, RefreshCw } from "lucide-react";

import API from "../services/api";

const PERIODS = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "THIS_QUARTER", label: "This quarter" },
  { value: "NEXT_QUARTER", label: "Next quarter" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "ALL", label: "All time" },
  { value: "CUSTOM", label: "Custom range" },
];

const toInputDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const getRange = (period) => {
  const now = new Date();
  const year = now.getFullYear();
  const quarterStart = Math.floor(now.getMonth() / 3) * 3;

  switch (period) {
    case "THIS_MONTH":
      return [new Date(year, now.getMonth(), 1), new Date(year, now.getMonth() + 1, 0)];
    case "THIS_QUARTER":
      return [new Date(year, quarterStart, 1), new Date(year, quarterStart + 3, 0)];
    case "NEXT_QUARTER":
      return [new Date(year, quarterStart + 3, 1), new Date(year, quarterStart + 6, 0)];
    case "THIS_YEAR":
      return [new Date(year, 0, 1), new Date(year, 11, 31)];
    default:
      return [null, null];
  }
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatMonth = (key) => {
  const [year, month] = String(key).split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

const getError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

function StatTile({ label, value, hint, accent = "text-slate-800" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function Forecast() {
  const [period, setPeriod] = useState("THIS_QUARTER");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [owner, setOwner] = useState("");
  const [owners, setOwners] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const result = {};
    if (period === "CUSTOM") {
      if (customFrom) result.from = customFrom;
      if (customTo) result.to = customTo;
    } else {
      const [from, to] = getRange(period);
      if (from) result.from = toInputDate(from);
      if (to) result.to = toInputDate(to);
    }
    if (owner) result.owner = owner;
    return result;
  }, [period, customFrom, customTo, owner]);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/opportunities/forecast", { params });
      setData(response?.data?.data || null);
    } catch (err) {
      setError(getError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    API.get("/users", { params: { limit: 100 } })
      .then((response) => {
        const list = response?.data?.data;
        setOwners(Array.isArray(list) ? list : []);
      })
      .catch(() => setOwners([]));
  }, []);

  const totals = data?.totals;
  const isEmpty = !loading && !error && (!totals || totals.count === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LineChart className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Sales Forecast
            </h1>
            <p className="text-sm text-slate-500">
              Weighted revenue forecast from your opportunities.
            </p>
          </div>
        </div>

        <button
          onClick={loadForecast}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {PERIODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {period === "CUSTOM" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </>
        )}

        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All owners</option>
          {owners.map((user) => (
            <option key={user._id} value={user._id}>
              {user.name || user.email}
            </option>
          ))}
        </select>

        {params.from || params.to ? (
          <span className="text-xs text-slate-400">
            {params.from || "…"} → {params.to || "…"}
          </span>
        ) : null}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400">
          Calculating forecast...
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400">
          No opportunities in this period.
          {data?.undatedOpen?.count > 0 &&
            ` ${data.undatedOpen.count} open opportunities have no expected close date.`}
        </div>
      ) : totals ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Total Pipeline Value"
              value={formatMoney(totals.totalValue)}
              hint={`${totals.count} opportunities`}
            />
            <StatTile
              label="Weighted Forecast"
              value={formatMoney(totals.weightedValue)}
              hint="Open value × probability"
              accent="text-indigo-600"
            />
            <StatTile
              label="Won Value"
              value={formatMoney(totals.wonValue)}
              hint={`${totals.wonCount} won · ${totals.winRate}% win rate`}
              accent="text-emerald-600"
            />
            <StatTile
              label="Open Value"
              value={formatMoney(totals.openValue)}
              hint={`${totals.openCount} open`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile
              label="Expected Revenue (Won + Weighted)"
              value={formatMoney(totals.forecastValue)}
              accent="text-indigo-600"
            />
            <StatTile
              label="Lost Value"
              value={formatMoney(totals.lostValue)}
              hint={`${totals.lostCount} lost`}
              accent="text-rose-600"
            />
          </div>

          {data.undatedOpen?.count > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {data.undatedOpen.count} open opportunities (
              {formatMoney(data.undatedOpen.value)}) have no expected close
              date and are not included in period totals.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <p className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">
                By Month
              </p>
              {data.byMonth?.length ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Month</th>
                      <th className="px-4 py-2 text-right">Open</th>
                      <th className="px-4 py-2 text-right">Weighted</th>
                      <th className="px-4 py-2 text-right">Won</th>
                      <th className="px-4 py-2 text-right">Forecast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byMonth.map((row) => (
                      <tr key={row.month}>
                        <td className="px-4 py-2 font-medium text-slate-700">
                          {formatMonth(row.month)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {formatMoney(row.openValue)}
                        </td>
                        <td className="px-4 py-2 text-right text-indigo-600">
                          {formatMoney(row.weightedValue)}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-600">
                          {formatMoney(row.wonValue)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">
                          {formatMoney(row.forecastValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No dated opportunities.
                </p>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <p className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">
                Open Pipeline by Stage
              </p>
              {data.byStage?.length ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Stage</th>
                      <th className="px-4 py-2 text-right">Deals</th>
                      <th className="px-4 py-2 text-right">Value</th>
                      <th className="px-4 py-2 text-right">Weighted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byStage.map((row) => (
                      <tr key={row.stage}>
                        <td className="px-4 py-2 font-medium text-slate-700">
                          {row.name}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {row.count}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {formatMoney(row.value)}
                        </td>
                        <td className="px-4 py-2 text-right text-indigo-600">
                          {formatMoney(row.weightedValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No open opportunities.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
