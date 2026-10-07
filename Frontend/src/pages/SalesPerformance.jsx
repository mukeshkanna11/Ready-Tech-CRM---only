import { useState } from "react";
import { Award, Download, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  formatNumber,
  formatPct,
  useAnalyticsFilters,
  useReport,
} from "../utils/analytics";

const COLUMNS = [
  { key: "rank", label: "#", render: (r) => <span className="badge badge-brand">{r.rank}</span> },
  { key: "name", label: "Salesperson", render: (r) => <span className="cell-strong">{r.name}</span> },
  { key: "leadsAssigned", label: "Leads", align: "right" },
  { key: "conversionRate", label: "Lead conv.", align: "right", render: (r) => formatPct(r.conversionRate) },
  { key: "opportunitiesCreated", label: "Opps created", align: "right" },
  { key: "opportunitiesWon", label: "Won", align: "right" },
  { key: "opportunitiesLost", label: "Lost", align: "right" },
  { key: "winRate", label: "Win rate", align: "right", render: (r) => formatPct(r.winRate) },
  { key: "pipelineValue", label: "Pipeline", align: "right", render: (r) => formatMoney(r.pipelineValue) },
  { key: "wonRevenue", label: "Won revenue", align: "right", render: (r) => <span className="font-semibold text-emerald-600">{formatMoney(r.wonRevenue)}</span> },
  { key: "activitiesCompleted", label: "Activities done", align: "right" },
  { key: "followUps", label: "Follow-ups", align: "right", render: (r) => `${r.followUpsCompleted}/${r.followUps}` },
];

export default function SalesPerformance() {
  const filters = useAnalyticsFilters();
  const { data, loading, error, reload } = useReport("/reports/performance", filters.params);
  const [selected, setSelected] = useState("");

  const rows = data?.rows || [];
  const totals = data?.totals;
  const person = rows.find((r) => String(r.user) === selected) || rows[0];
  const chartRows = rows.slice(0, 10);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Trophy}
        title="Sales Performance"
        subtitle="Salesperson ranking from leads, opportunities and activities."
        onRefresh={reload}
        loading={loading}
      >
        <button
          type="button"
          disabled={!rows.length}
          onClick={() => downloadCsv("sales-performance.csv", COLUMNS.map(({ key, label }) => ({ key, label })), rows)}
          className="btn btn-secondary"
        >
          <Download size={16} /> Export
        </button>
      </PageHeader>

      <FilterBar filters={filters} />
      <ErrorBox error={error} onRetry={reload} />

      {loading ? (
        <SkeletonGrid count={8} />
      ) : totals ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Won Revenue" value={formatMoney(totals.wonRevenue)} tone="green" hint={`${totals.opportunitiesWon} deals won`} />
            <StatTile label="Open Pipeline" value={formatMoney(totals.pipelineValue)} tone="brand" />
            <StatTile label="Win Rate" value={formatPct(totals.winRate)} hint={`${totals.opportunitiesWon} won · ${totals.opportunitiesLost} lost`} />
            <StatTile label="Lead Conversion" value={formatPct(totals.conversionRate)} hint={`${totals.leadsWon} of ${totals.leadsAssigned} leads`} />
            <StatTile label="Leads Assigned" value={formatNumber(totals.leadsAssigned)} />
            <StatTile label="Opportunities Created" value={formatNumber(totals.opportunitiesCreated)} />
            <StatTile label="Activities Completed" value={formatNumber(totals.activitiesCompleted)} />
            <StatTile label="Follow-ups" value={formatNumber(totals.followUps)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Revenue by Salesperson" hint="Top 10 by won revenue." className="xl:col-span-2">
              {chartRows.some((r) => r.wonRevenue || r.pipelineValue) ? (
                <div className="h-80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={CHART.axis} fontSize={12} />
                      <YAxis stroke={CHART.axis} fontSize={12} tickFormatter={(v) => formatMoney(v)} width={90} />
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <Legend />
                      <Bar dataKey="wonRevenue" name="Won revenue" fill={CHART.green} radius={[6, 6, 0, 0]} maxBarSize={48} />
                      <Bar dataKey="pipelineValue" name="Open pipeline" fill={CHART.brand} radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-slate-500">No revenue or pipeline in this period.</p>
              )}
            </Panel>

            <Panel
              title="Individual Summary"
              actions={
                <select value={person ? String(person.user) : ""} onChange={(e) => setSelected(e.target.value)} className="select !w-auto">
                  {rows.map((r) => (
                    <option key={r.user} value={r.user}>{r.name}</option>
                  ))}
                </select>
              }
            >
              {person ? (
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <Award className="text-amber-500" size={20} />
                    <p className="font-semibold text-slate-900">
                      {person.name} <span className="text-sm font-normal text-slate-500">· Rank #{person.rank}</span>
                    </p>
                  </div>
                  {[
                    ["Won revenue", formatMoney(person.wonRevenue)],
                    ["Open pipeline", `${formatMoney(person.pipelineValue)} (${person.openOpportunities} deals)`],
                    ["Win rate", formatPct(person.winRate)],
                    ["Lead conversion", `${formatPct(person.conversionRate)} (${person.leadsWon}/${person.leadsAssigned})`],
                    ["Opportunities", `${person.opportunitiesCreated} created · ${person.opportunitiesWon} won · ${person.opportunitiesLost} lost`],
                    ["Activities completed", person.activitiesCompleted],
                    ["Follow-ups", `${person.followUpsCompleted} done of ${person.followUps}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-right font-medium text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-slate-500">No salespeople found.</p>
              )}
            </Panel>
          </div>

          <Panel title="Ranking" hint="Ranked by won revenue, then deals won.">
            <DataTable columns={COLUMNS} rows={rows} rowKey={(r) => r.user} empty="No salespeople match the filters." />
          </Panel>
        </>
      ) : null}
    </div>
  );
}
