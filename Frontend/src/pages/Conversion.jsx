import { useEffect, useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";

import API from "../services/api";
import { LEAD_SOURCES } from "../utils/constants";
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
  downloadCsv,
  formatMoney,
  formatNumber,
  formatPct,
  titleCase,
  useAnalyticsFilters,
  useReport,
} from "../utils/analytics";

const STAGE_COLUMNS = [
  { key: "stage", label: "Stage", render: (r) => <span className="cell-strong">{titleCase(r.stage)}</span> },
  { key: "count", label: "Reached", align: "right" },
  { key: "current", label: "Currently at", align: "right" },
  { key: "conversionRate", label: "From previous", align: "right", render: (r) => formatPct(r.conversionRate) },
  { key: "dropOff", label: "Drop-off", align: "right", render: (r) => r.dropOff ?? "—" },
];

const groupColumns = (key, label, render) => [
  { key, label, render: render || ((r) => <span className="cell-strong">{titleCase(r[key])}</span>) },
  { key: "total", label: "Leads", align: "right" },
  { key: "open", label: "Open", align: "right" },
  { key: "won", label: "Won", align: "right" },
  { key: "lost", label: "Lost", align: "right" },
  { key: "conversionRate", label: "Conversion", align: "right", render: (r) => formatPct(r.conversionRate) },
  { key: "wonValue", label: "Won value", align: "right", render: (r) => formatMoney(r.wonValue) },
];

const SOURCE_COLUMNS = groupColumns("source", "Source");
const OWNER_COLUMNS = groupColumns("name", "Salesperson", (r) => <span className="cell-strong">{r.name}</span>);

export default function Conversion() {
  const filters = useAnalyticsFilters();
  const [source, setSource] = useState("");
  const [sources, setSources] = useState(LEAD_SOURCES.map((key) => ({ key })));

  // Built-in sources + the workspace's custom sources.
  useEffect(() => {
    API.get("/leads/sources")
      .then((res) => {
        const custom = Array.isArray(res?.data?.data) ? res.data.data : [];
        setSources([...LEAD_SOURCES.map((key) => ({ key })), ...custom]);
      })
      .catch(() => {});
  }, []);

  const params = useMemo(() => ({ ...filters.params, ...(source ? { source } : {}) }), [filters.params, source]);
  const { data, loading, error, reload } = useReport("/reports/leads", params);

  const funnel = data?.funnel || [];
  const top = funnel[0]?.count || 0;
  const count = (stage) => funnel.find((f) => f.stage === stage)?.current ?? 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Filter}
        title="Conversion Analytics"
        subtitle="Lead lifecycle funnel, stage conversion and source performance."
        onRefresh={reload}
        loading={loading}
      >
        <button
          type="button"
          disabled={!funnel.length}
          onClick={() => downloadCsv("lead-conversion.csv", STAGE_COLUMNS.map(({ key, label }) => ({ key, label })), funnel)}
          className="btn btn-secondary"
        >
          <Download size={16} /> Export
        </button>
      </PageHeader>

      <FilterBar filters={filters}>
        <div>
          <label className="label">Lead source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="select !w-auto min-w-[150px]">
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.key} value={s.key}>{s.name || titleCase(s.key)}</option>
            ))}
          </select>
        </div>
      </FilterBar>

      <ErrorBox error={error} onRetry={reload} />

      {loading ? (
        <SkeletonGrid count={8} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total Leads" value={formatNumber(data.totalLeads)} hint={formatMoney(data.totalValue)} />
            <StatTile label="Lead → Win" value={formatPct(data.overallConversionRate)} tone="brand" hint={`${data.wonLeads} won`} />
            <StatTile label="Lost" value={formatNumber(data.lostLeads)} tone="red" />
            <StatTile
              label="Avg. Time to Win"
              value={data.avgConversionDays === null ? "—" : `${data.avgConversionDays} days`}
              hint={data.convertedWithDate ? `${data.convertedWithDate} leads with conversion date` : "No conversion dates recorded"}
            />
            {["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"].map((stage) => (
              <StatTile key={stage} label={titleCase(stage)} value={formatNumber(count(stage))} hint="Currently at stage" tone={stage === "WON" ? "green" : "slate"} />
            ))}
          </div>

          <Panel title="Lead Funnel" hint="Leads that reached each stage (a lead at a later stage has passed earlier ones).">
            {top ? (
              <div className="space-y-3 p-5">
                {funnel.map((row) => {
                  const width = Math.max((row.count / top) * 100, row.count ? 2 : 0);
                  return (
                    <div key={row.stage} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[140px_1fr_auto]">
                      <span className="font-medium text-slate-700">{titleCase(row.stage)}</span>
                      <div className="h-8 overflow-hidden rounded-lg bg-slate-100">
                        <div className="flex h-full items-center rounded-lg bg-indigo-500 px-2 text-xs font-semibold text-white" style={{ width: `${width}%` }}>
                          {row.count}
                        </div>
                      </div>
                      <span className="w-16 text-right text-xs font-semibold text-slate-500">{formatPct(row.conversionRate)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No leads for the selected filters.</p>
            )}
          </Panel>

          <Panel title="Stage-to-Stage Conversion">
            <DataTable columns={STAGE_COLUMNS} rows={funnel} rowKey={(r) => r.stage} />
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Lead Source Conversion">
              <DataTable columns={SOURCE_COLUMNS} rows={data.bySource} rowKey={(r) => r.source} />
            </Panel>
            <Panel title="Salesperson Conversion">
              <DataTable columns={OWNER_COLUMNS} rows={data.byOwner} rowKey={(r) => r.owner || "none"} />
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
