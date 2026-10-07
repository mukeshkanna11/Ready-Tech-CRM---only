import { useState } from "react";
import { LineChart, Download, Sparkles } from "lucide-react";

import API from "../services/api";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DataTable,
  ErrorBox,
  FilterBar,
  PageHeader,
  Panel,
  SkeletonGrid,
  StatTile,
} from "../components/common/Analytics";
import {
  CHART,
  downloadCsv,
  formatMoney,
  formatPct,
  getError,
  useAnalyticsFilters,
  useReport,
} from "../utils/analytics";

const formatMonth = (key) => {
  const [year, month] = String(key).split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

const money = (key) => ({ key, align: "right", render: (row) => formatMoney(row[key]) });

const MONTH_COLUMNS = [
  { key: "month", label: "Month", render: (row) => <span className="cell-strong">{formatMonth(row.month)}</span> },
  { ...money("openValue"), label: "Open" },
  { ...money("weightedValue"), label: "Weighted" },
  { ...money("wonValue"), label: "Won" },
  { ...money("lostValue"), label: "Lost" },
  { ...money("forecastValue"), label: "Expected" },
];

const STAGE_COLUMNS = [
  { key: "name", label: "Stage", render: (row) => <span className="cell-strong">{row.name}</span> },
  { key: "count", label: "Deals", align: "right" },
  { key: "probability", label: "Win prob.", align: "right", render: (row) => (row.probability ?? null) === null ? "—" : formatPct(row.probability) },
  { ...money("value"), label: "Value" },
  { ...money("weightedValue"), label: "Weighted" },
];

const OWNER_COLUMNS = [
  { key: "name", label: "Salesperson", render: (row) => <span className="cell-strong">{row.name}</span> },
  { key: "openCount", label: "Open deals", align: "right" },
  { ...money("openValue"), label: "Open value" },
  { ...money("weightedValue"), label: "Weighted" },
  { ...money("wonValue"), label: "Won" },
  { key: "winRate", label: "Win rate", align: "right", render: (row) => formatPct(row.winRate) },
  { ...money("forecastValue"), label: "Expected" },
];

export default function Forecast() {
  const filters = useAnalyticsFilters("THIS_QUARTER");
  const { data, loading, error, reload } = useReport("/opportunities/forecast", filters.params);

  // AI interpretation of the calculated forecast (user-triggered).
  const [ai, setAi] = useState({ loading: false, error: "", data: null, key: "" });
  const aiKey = JSON.stringify(filters.params);
  const explain = async () => {
    setAi({ loading: true, error: "", data: null, key: aiKey });
    try {
      const res = await API.post("/ai/forecast", filters.params);
      setAi({ loading: false, error: "", data: res.data?.data, key: aiKey });
    } catch (err) {
      setAi({ loading: false, error: getError(err), data: null, key: aiKey });
    }
  };
  // Hide insights that were generated for different filters.
  const aiView = ai.key === aiKey ? ai : { loading: false, error: "", data: null };

  const totals = data?.totals;
  const isEmpty = !loading && !error && (!totals || totals.count === 0);
  const chartRows = (data?.byMonth || []).map((row) => ({ ...row, label: formatMonth(row.month) }));

  const exportCsv = () =>
    downloadCsv(
      "sales-forecast.csv",
      MONTH_COLUMNS.map(({ key, label }) => ({ key, label })),
      data?.byMonth || []
    );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={LineChart}
        title="Sales Forecast"
        subtitle="Weighted revenue forecast from your opportunities."
        onRefresh={reload}
        loading={loading}
      >
        <button type="button" onClick={exportCsv} disabled={!data?.byMonth?.length} className="btn btn-secondary">
          <Download size={16} /> Export
        </button>
      </PageHeader>

      <FilterBar filters={filters} />
      <ErrorBox error={error} onRetry={reload} />

      {loading ? (
        <SkeletonGrid count={8} />
      ) : isEmpty ? (
        <div className="card px-4 py-16 text-center text-sm text-slate-500">
          No opportunities in this period.
          {data?.undatedOpen?.count > 0 &&
            ` ${data.undatedOpen.count} open opportunities have no expected close date.`}
        </div>
      ) : totals ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total Pipeline" value={formatMoney(totals.totalValue)} hint={`${totals.count} opportunities`} />
            <StatTile label="Open Pipeline" value={formatMoney(totals.openValue)} hint={`${totals.openCount} open`} />
            <StatTile label="Weighted Pipeline" value={formatMoney(totals.weightedValue)} hint="Open value × probability" tone="brand" />
            <StatTile label="Expected Revenue" value={formatMoney(totals.forecastValue)} hint="Won + weighted open" tone="brand" />
            <StatTile label="Won Revenue" value={formatMoney(totals.wonValue)} hint={`${totals.wonCount} won`} tone="green" />
            <StatTile label="Lost Value" value={formatMoney(totals.lostValue)} hint={`${totals.lostCount} lost`} tone="red" />
            <StatTile label="Win Probability" value={formatPct(totals.winRate)} hint="Won ÷ closed deals" />
            <StatTile
              label="Avg. Open Probability"
              value={formatPct(totals.openValue ? Math.round((totals.weightedValue / totals.openValue) * 1000) / 10 : 0)}
              hint="Value-weighted"
            />
          </div>

          {data.undatedOpen?.count > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {data.undatedOpen.count} open opportunities ({formatMoney(data.undatedOpen.value)}) have no
              expected close date and are not included in period totals.
            </div>
          )}

          <Panel
            title="AI Forecast Insights"
            hint="AI explains the figures above; the numbers themselves come from the CRM calculation."
            actions={
              <button type="button" onClick={explain} disabled={aiView.loading} className="btn btn-secondary">
                <Sparkles size={16} /> {aiView.loading ? "Analysing…" : aiView.data ? "Refresh insights" : "Explain forecast"}
              </button>
            }
          >
            <div className="p-5">
              {aiView.loading ? (
                <div className="space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              ) : aiView.error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{aiView.error}</p>
              ) : aiView.data ? (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-900">{aiView.data.headline}</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ["Observations", aiView.data.observations],
                      ["Risks", aiView.data.risks],
                      ["Recommendations", aiView.data.recommendations],
                    ].map(([title, items]) => (
                      <div key={title}>
                        <p className="eyebrow mb-1">{title}</p>
                        {items?.length ? (
                          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                            {items.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">None noted.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Click “Explain forecast” for an AI summary of this period.</p>
              )}
            </div>
          </Panel>

          <Panel title="Forecast by Month" hint="Won revenue, weighted open pipeline and expected revenue.">
            {chartRows.length ? (
              <div className="h-80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" stroke={CHART.axis} fontSize={12} />
                    <YAxis stroke={CHART.axis} fontSize={12} tickFormatter={(v) => formatMoney(v)} width={90} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Legend />
                    <Bar dataKey="wonValue" name="Won" stackId="f" fill={CHART.green} maxBarSize={64} />
                    <Bar dataKey="weightedValue" name="Weighted open" stackId="f" fill={CHART.brand} radius={[6, 6, 0, 0]} maxBarSize={64} />
                    <Line dataKey="openValue" name="Open (unweighted)" stroke={CHART.amber} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No dated opportunities.</p>
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Open Pipeline by Stage">
              <DataTable columns={STAGE_COLUMNS} rows={data.byStage} rowKey={(r) => r.stage} empty="No open opportunities." />
            </Panel>
            <Panel title="Forecast by Salesperson">
              <DataTable columns={OWNER_COLUMNS} rows={data.byOwner} rowKey={(r) => r.owner || "none"} />
            </Panel>
          </div>

          <Panel title="Forecast Table">
            <DataTable columns={MONTH_COLUMNS} rows={data.byMonth} rowKey={(r) => r.month} empty="No dated opportunities." />
          </Panel>
        </>
      ) : null}
    </div>
  );
}
