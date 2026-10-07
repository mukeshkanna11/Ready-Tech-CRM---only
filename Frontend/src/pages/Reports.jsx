import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  Users,
  Trophy,
  Receipt,
  Wallet,
  Activity as ActivityIcon,
  Target,
  Download,
} from "lucide-react";

import api from "../services/api";
import { LEAD_SOURCES } from "../utils/constants";
import {
  downloadCsv,
} from "../utils/analytics";

const LEAD_STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

const BAR_COLOR = "#6366f1";
const GRID_COLOR = "#e2e8f0";
const AXIS_COLOR = "#94a3b8";

const PERIODS = [
  { key: "ALL", label: "All Time" },
  { key: "THIS_MONTH", label: "This Month" },
  { key: "LAST_30", label: "Last 30 Days" },
  { key: "THIS_QUARTER", label: "This Quarter" },
  { key: "THIS_YEAR", label: "This Year" },
  { key: "CUSTOM", label: "Custom" },
];

const GROUP_BY = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const getRange = (period, customFrom, customTo) => {
  const now = new Date();

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  switch (period) {
    case "THIS_MONTH": {
      const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      return {
        from: startOfDay(from),
        to: endOfDay(now),
      };
    }

    case "LAST_30": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);

      return {
        from: startOfDay(from),
        to: endOfDay(now),
      };
    }

    case "THIS_QUARTER": {
      const quarterStartMonth =
        Math.floor(now.getMonth() / 3) * 3;

      const from = new Date(
        now.getFullYear(),
        quarterStartMonth,
        1
      );

      return {
        from: startOfDay(from),
        to: endOfDay(now),
      };
    }

    case "THIS_YEAR": {
      const from = new Date(
        now.getFullYear(),
        0,
        1
      );

      return {
        from: startOfDay(from),
        to: endOfDay(now),
      };
    }

    case "CUSTOM": {
      return {
        from: customFrom
          ? startOfDay(customFrom)
          : null,

        to: customTo
          ? endOfDay(customTo)
          : null,
      };
    }

    case "ALL":
    default:
      return {
        from: null,
        to: null,
      };
  }
};

const toInputDate = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const year = d.getFullYear();
  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    d.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(
    Number(value) || 0
  );
};

const titleCase = (value) => {
  if (!value) return "—";

  return String(value)
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const getError = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Failed to load reports"
  );
};

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
            {value}
          </p>

          {hint && (
            <p className="mt-1 text-xs text-slate-400">
              {hint}
            </p>
          )}
        </div>

        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Icon
              size={19}
              className="text-indigo-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-slate-500">
        {titleCase(label)}
      </p>

      {payload.map((item) => (
        <div
          key={item.dataKey || item.name}
          className="flex items-center justify-between gap-6 text-sm"
        >
          <span className="text-slate-500">
            {titleCase(item.name)}
          </span>

          <span className="font-semibold text-slate-800">
            {formatNumber(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BreakdownPanel({
  title,
  subtitle,
  rows,
  valueLabel = "Count",
}) {
  const safeRows = Array.isArray(rows)
    ? rows
    : [];

  const chartData = safeRows.map((row) => ({
    name:
      row.label ||
      row.name ||
      row._id ||
      "Unknown",

    count:
      Number(row.count) || 0,
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-semibold text-slate-800">
          {title}
        </h3>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {safeRows.length === 0 ? (
        <div className="flex min-h-[260px] items-center justify-center px-5">
          <p className="text-sm text-slate-400">
            No data available.
          </p>
        </div>
      ) : (
        <>
          <div className="h-[280px] p-5">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  stroke={GRID_COLOR}
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke={AXIS_COLOR}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke={AXIS_COLOR}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    titleCase(value)
                  }
                />

                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{
                    fill: "#f8fafc",
                  }}
                />

                <Bar
                  dataKey="count"
                  name={valueLabel}
                  fill={BAR_COLOR}
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Name
                    </th>

                    <th className="px-5 py-3 text-right">
                      {valueLabel}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {safeRows.map(
                    (row, index) => (
                      <tr
                        key={
                          row._id ||
                          row.id ||
                          row.name ||
                          index
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-medium text-slate-700">
                          {titleCase(
                            row.label ||
                              row.name ||
                              row._id
                          )}
                        </td>

                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          {formatNumber(
                            row.count
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PeriodTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload || {};

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-slate-600">
        {label}
      </p>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-6">
          <span className="text-slate-500">
            Won
          </span>

          <span className="font-semibold text-slate-800">
            {formatMoney(row.wonValue)}
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-slate-500">
            Lost
          </span>

          <span className="font-semibold text-slate-800">
            {formatMoney(row.lostValue)}
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-slate-500">
            Win Rate
          </span>

          <span className="font-semibold text-indigo-600">
            {row.winRate || 0}%
          </span>
        </div>
      </div>
    </div>
  );
}

const formatPeriod = (period, groupBy) => {
  if (!period) return "—";

  if (groupBy === "week") {
    return period;
  }

  if (groupBy === "month") {
    const [year, month] =
      period.split("-");

    if (!year || !month) {
      return period;
    }

    const date = new Date(
      Number(year),
      Number(month) - 1,
      1
    );

    return date.toLocaleDateString(
      "en-IN",
      {
        month: "short",
        year: "numeric",
      }
    );
  }

  const date = new Date(
    `${period}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return period;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

function SalesPerformance({
  sales,
  groupBy,
}) {
  const totals = sales?.totals || {};

  const byUser = Array.isArray(
    sales?.byUser
  )
    ? sales.byUser
    : [];

  const byPeriod = Array.isArray(
    sales?.byPeriod
  )
    ? sales.byPeriod
    : [];

  const chartData = byPeriod.map(
    (row) => ({
      ...row,
      periodLabel: formatPeriod(
        row.period,
        groupBy
      ),
    })
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">
          Sales Performance
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Closed sales and current pipeline performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Won Deals"
          value={formatNumber(
            totals.wonCount
          )}
          hint="Closed won opportunities"
          icon={Trophy}
        />

        <StatTile
          label="Won Value"
          value={formatMoney(
            totals.wonValue
          )}
          hint="Total won sales"
          icon={TrendingUp}
        />

        <StatTile
          label="Win Rate"
          value={`${totals.winRate || 0}%`}
          hint="Won vs closed deals"
          icon={Target}
        />

        <StatTile
          label="Avg Deal Size"
          value={formatMoney(
            totals.avgDealSize
          )}
          hint="Average won deal"
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-800">
              Sales by Period
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Won and lost sales across the selected period.
            </p>
          </div>

          <div className="h-[300px] p-5">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-400">
                  No sales data available.
                </p>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    stroke={GRID_COLOR}
                    vertical={false}
                  />

                  <XAxis
                    dataKey="periodLabel"
                    stroke={AXIS_COLOR}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    stroke={AXIS_COLOR}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      `₹${Number(
                        value
                      ).toLocaleString(
                        "en-IN"
                      )}`
                    }
                  />

                  <Tooltip
                    content={
                      <PeriodTooltip
                        groupBy={groupBy}
                      />
                    }
                  />

                  <Bar
                    dataKey="wonValue"
                    name="Won"
                    fill={BAR_COLOR}
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                    barSize={18}
                  />

                  <Bar
                    dataKey="lostValue"
                    name="Lost"
                    fill="#cbd5e1"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-800">
              Sales by Owner
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Performance breakdown by sales owner.
            </p>
          </div>

          {byUser.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <p className="text-sm text-slate-400">
                No owner data available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Owner
                    </th>

                    <th className="px-5 py-3 text-right">
                      Won
                    </th>

                    <th className="px-5 py-3 text-right">
                      Won Value
                    </th>

                    <th className="px-5 py-3 text-right">
                      Win Rate
                    </th>

                    <th className="px-5 py-3 text-right">
                      Open
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {byUser.map(
                    (row, index) => (
                      <tr
                        key={
                          row.owner ||
                          row.email ||
                          index
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-700">
                            {row.name ||
                              "Unassigned"}
                          </div>

                          {row.email && (
                            <div className="mt-0.5 text-xs text-slate-400">
                              {row.email}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3 text-right font-semibold text-slate-700">
                          {formatNumber(
                            row.wonCount
                          )}
                        </td>

                        <td className="px-5 py-3 text-right font-semibold text-slate-700">
                          {formatMoney(
                            row.wonValue
                          )}
                        </td>

                        <td className="px-5 py-3 text-right">
                          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600">
                            {row.winRate ||
                              0}
                            %
                          </span>
                        </td>

                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(
                            row.openCount
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ConversionAnalytics({
  conversion,
}) {
  if (!conversion) {
    return null;
  }

  const funnel = Array.isArray(
    conversion.funnel
  )
    ? conversion.funnel
    : [];

  const totalLeads =
    Number(
      conversion.totalLeads
    ) || 0;

  const wonLeads =
    Number(
      conversion.wonLeads
    ) || 0;

  const overallRate =
    Number(
      conversion.overallConversionRate
    ) || 0;

  const getBarWidth = (count) => {
    if (!totalLeads) {
      return 0;
    }

    return Math.max(
      2,
      Math.min(
        100,
        (Number(count || 0) /
          totalLeads) *
          100
      )
    );
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">
          Conversion Analytics
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Lead funnel performance and stage-to-stage conversion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Total Leads"
          value={formatNumber(
            totalLeads
          )}
          hint="Leads in selected period"
          icon={Users}
        />

        <StatTile
          label="Won Leads"
          value={formatNumber(
            wonLeads
          )}
          hint="Leads currently marked Won"
          icon={Trophy}
        />

        <StatTile
          label="Lead → Won"
          value={`${overallRate}%`}
          hint="Overall current conversion"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Funnel */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-800">
              Lead Funnel
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Current lead distribution across funnel stages.
            </p>
          </div>

          <div className="space-y-5 p-5">
            {funnel.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <p className="text-sm text-slate-400">
                  No conversion data available.
                </p>
              </div>
            ) : (
              funnel.map(
                (row, index) => (
                  <div
                    key={row.stage}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                          {index + 1}
                        </span>

                        <span className="truncate text-sm font-semibold text-slate-700">
                          {titleCase(
                            row.stage
                          )}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-bold text-slate-800">
                          {formatNumber(
                            row.count
                          )}
                        </span>

                        <span className="min-w-[50px] rounded-lg bg-indigo-50 px-2 py-1 text-center text-xs font-semibold text-indigo-600">
                          {row.conversionRate ??
                            0}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{
                          width: `${getBarWidth(
                            row.count
                          )}%`,
                        }}
                      />
                    </div>

                    {index > 0 && (
                      <div className="mt-1.5 flex justify-end">
                        <span className="text-[11px] text-slate-400">
                          {formatNumber(
                            row.dropOff ||
                              0
                          )}{" "}
                          drop-off
                        </span>
                      </div>
                    )}
                  </div>
                )
              )
            )}
          </div>
        </div>

        {/* Stage conversion */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-800">
              Stage Conversion
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Current stage counts and progression percentages.
            </p>
          </div>

          {funnel.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <p className="text-sm text-slate-400">
                No conversion data available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Stage
                    </th>

                    <th className="px-5 py-3 text-right">
                      Leads
                    </th>

                    <th className="px-5 py-3 text-right">
                      Conversion
                    </th>

                    <th className="px-5 py-3 text-right">
                      Drop-off
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {funnel.map(
                    (row, index) => (
                      <tr
                        key={row.stage}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />

                            <span className="font-medium text-slate-700">
                              {titleCase(
                                row.stage
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-right font-semibold text-slate-700">
                          {formatNumber(
                            row.count
                          )}
                        </td>

                        <td className="px-5 py-3 text-right">
                          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600">
                            {row.conversionRate ??
                              0}
                            %
                          </span>
                        </td>

                        <td className="px-5 py-3 text-right text-slate-500">
                          {index === 0
                            ? "—"
                            : formatNumber(
                                row.dropOff ||
                                  0
                              )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-5 text-amber-700">
          <span className="font-semibold">
            Note:
          </span>{" "}
          Conversion percentages are calculated from the
          current lead status counts. Historical stage-to-stage
          cohort conversion requires lead status history tracking.
        </p>
      </div>
    </section>
  );
}

export default function Reports() {
  const [period, setPeriod] =
    useState("ALL");

  const [customFrom, setCustomFrom] =
    useState("");

  const [customTo, setCustomTo] =
    useState("");

  const [reports, setReports] =
    useState({
      leads: [],
      conversion: null,
      sales: {},
      pipeline: [],
      activities: [],
      revenue: {
        billed: 0,
        paid: 0,
      },
      salesOrders: [],
    });

  // Phase 4 filters: team / territory / lead source / lead status / stage
  const [extra, setExtra] = useState({
    team: "",
    territory: "",
    source: "",
    status: "",
    stage: "",
  });

  const [scopes, setScopes] = useState({
    teams: [],
    territories: [],
  });

  const [stageNames, setStageNames] =
    useState({});

  const [owners, setOwners] =
    useState([]);

  const [owner, setOwner] =
    useState("");

  const [groupBy, setGroupBy] =
    useState("month");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const range = useMemo(
    () =>
      getRange(
        period,
        customFrom,
        customTo
      ),
    [
      period,
      customFrom,
      customTo,
    ]
  );

  const params = useMemo(() => {
    const result = {};

    if (range.from) {
      result.from = toInputDate(
        range.from
      );
    }

    if (range.to) {
      result.to = toInputDate(
        range.to
      );
    }

    return result;
  }, [range]);

  const loadReports = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const scope = {};

        if (owner) scope.owner = owner;
        if (extra.team) scope.team = extra.team;
        if (extra.territory) scope.territory = extra.territory;

        const reportParams = {
          ...params,
          ...scope,
        };

        const salesParams = {
          ...reportParams,
          groupBy,
        };

        const leadParams = { ...reportParams };
        if (extra.source) leadParams.source = extra.source;
        if (extra.status) leadParams.status = extra.status;

        const [
          leads,
          sales,
          pipeline,
          activities,
          revenue,
          salesOrders,
        ] = await Promise.all([
          api.get(
            "/reports/leads",
            {
              params: leadParams,
            }
          ),

          api.get(
            "/reports/sales",
            {
              params: salesParams,
            }
          ),

          api.get(
            "/reports/pipeline",
            {
              params: {
                ...scope,
                ...(extra.stage ? { stage: extra.stage } : {}),
              },
            }
          ),

          api.get(
            "/reports/activities",
            {
              params: reportParams,
            }
          ),

          api.get(
            "/reports/revenue",
            {
              params: reportParams,
            }
          ),

          api.get(
            "/reports/sales-orders",
            {
              params: reportParams,
            }
          ),
        ]);

        const leadResponse =
          leads?.data?.data;

        setReports({
          leads:
            leadResponse?.rows ||
            leadResponse?.data ||
            (Array.isArray(
              leadResponse
            )
              ? leadResponse
              : []),

          conversion:
            leadResponse || null,

          sales:
            sales?.data?.data || {
              count: 0,
              value: 0,
              totals: {},
              byUser: [],
              byPeriod: [],
            },

          pipeline:
            pipeline?.data?.data ||
            [],

          activities:
            activities?.data?.data ||
            [],

          revenue:
            revenue?.data?.data || {
              billed: 0,
              paid: 0,
            },

          salesOrders:
            salesOrders?.data?.data?.rows || [],
        });
      } catch (err) {
        setError(getError(err));
      } finally {
        setLoading(false);
      }
    },
    [params, groupBy, owner, extra]
  );

  const loadOwners =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/users",
            {
              params: {
                limit: 100,
              },
            }
          );

        const data =
          response?.data?.data;

        const list = Array.isArray(data)
          ? data
          : data?.users ||
            data?.items ||
            [];

        setOwners(list);
      } catch {
        setOwners([]);
      }
    }, []);

  const loadStages =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/pipeline-stages"
          );

        const data =
          response?.data?.data;

        const list = Array.isArray(data)
          ? data
          : data?.stages ||
            data?.items ||
            [];

        const map = {};

        list.forEach((stage) => {
          const key =
            stage.key ||
            stage.code ||
            stage.name;

          if (key) {
            map[key] =
              stage.name ||
              stage.label ||
              titleCase(key);
          }
        });

        setStageNames(map);
      } catch {
        setStageNames({});
      }
    }, []);

  useEffect(() => {
    Promise.all(
      ["/teams", "/territories"].map((url) =>
        api
          .get(url)
          .then((res) => res?.data?.data || [])
          .catch(() => [])
      )
    ).then(([teams, territories]) =>
      setScopes({ teams, territories })
    );
  }, []);

  useEffect(() => {
    loadOwners();
    loadStages();
  }, [
    loadOwners,
    loadStages,
  ]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const toRows = (
    data,
    labelResolver
  ) => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((row) => ({
      ...row,
      label: labelResolver
        ? labelResolver(row)
        : row._id,
    }));
  };

  const leadRows = useMemo(
    () =>
      toRows(
        reports.leads,
        (row) =>
          titleCase(row._id)
      ),
    [reports.leads]
  );

  const pipelineRows = useMemo(
    () =>
      toRows(
        reports.pipeline,
        (row) =>
          stageNames[row._id] ||
          titleCase(row._id)
      ),
    [
      reports.pipeline,
      stageNames,
    ]
  );

  const activityRows = useMemo(
    () =>
      toRows(
        reports.activities,
        (row) =>
          titleCase(row._id)
      ),
    [reports.activities]
  );

  const salesOrderRows = useMemo(
    () =>
      toRows(
        reports.salesOrders,
        (row) =>
          titleCase(row._id)
      ),
    [reports.salesOrders]
  );

  // Lead source performance (count + conversion).
  const sourceRows = useMemo(
    () =>
      (reports.conversion?.bySource || []).map(
        (row) => ({
          ...row,
          _id: row.source,
          count: row.total,
          label: `${titleCase(row.source)} · ${row.conversionRate}% won`,
        })
      ),
    [reports.conversion]
  );

  const handleExport = () => {
    const columns = [
      { key: "section", label: "Section" },
      { key: "label", label: "Item" },
      { key: "count", label: "Count" },
      { key: "value", label: "Value" },
    ];

    const section = (name, rows) =>
      rows.map((row) => ({
        section: name,
        label: row.label,
        count: row.count,
        value: row.value ?? "",
      }));

    downloadCsv("crm-report.csv", columns, [
      ...section("Leads by status", leadRows),
      ...section("Lead sources", sourceRows),
      ...section("Pipeline by stage", pipelineRows),
      ...section("Activities", activityRows),
      ...section("Sales orders", salesOrderRows),
      {
        section: "Revenue",
        label: "Billed / Collected",
        count: "",
        value: `${reports.revenue?.billed || 0} / ${reports.revenue?.paid || 0}`,
      },
    ]);
  };

  const setExtraField = (key) => (event) =>
    setExtra((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));

  const totalLeads = useMemo(
    () =>
      leadRows.reduce(
        (sum, row) =>
          sum +
          (Number(row.count) || 0),
        0
      ),
    [leadRows]
  );

  const totalWon = useMemo(
    () =>
      Number(
        reports?.sales?.totals
          ?.wonCount
      ) ||
      Number(
        reports?.sales?.count
      ) ||
      0,
    [reports.sales]
  );

  const billed = Number(
    reports?.revenue?.billed
  ) || 0;

  const paid = Number(
    reports?.revenue?.paid
  ) || 0;

  const totalActivities =
    activityRows.reduce(
      (sum, row) =>
        sum +
        (Number(row.count) || 0),
      0
    );

  const hasData =
    totalLeads > 0 ||
    totalWon > 0 ||
    billed > 0 ||
    paid > 0 ||
    totalActivities > 0 ||
    salesOrderRows.length > 0 ||
    pipelineRows.length > 0;

  const handlePeriodChange = (
    nextPeriod
  ) => {
    setPeriod(nextPeriod);

    if (nextPeriod !== "CUSTOM") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  const handleRefresh = () => {
    loadReports();
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
                <BarChart3
                  size={22}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Reports & Analytics
                </h1>

                <p className="mt-0.5 text-sm text-slate-500">
                  Monitor sales, leads, activities and conversion performance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map(
                (item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      handlePeriodChange(
                        item.key
                      )
                    }
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      period ===
                      item.key
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {period === "CUSTOM" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      From
                    </label>

                    <input
                      type="date"
                      value={customFrom}
                      onChange={(event) =>
                        setCustomFrom(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      To
                    </label>

                    <input
                      type="date"
                      value={customTo}
                      onChange={(event) =>
                        setCustomTo(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Owner
                </label>

                <select
                  value={owner}
                  onChange={(event) =>
                    setOwner(
                      event.target.value
                    )
                  }
                  className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">
                    All Owners
                  </option>

                  {owners.map(
                    (item) => (
                      <option
                        key={
                          item._id ||
                          item.id
                        }
                        value={
                          item._id ||
                          item.id
                        }
                      >
                        {item.name ||
                          item.email ||
                          "Unnamed User"}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Group By
                </label>

                <select
                  value={groupBy}
                  onChange={(event) =>
                    setGroupBy(
                      event.target.value
                    )
                  }
                  className="min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {GROUP_BY.map(
                    (item) => (
                      <option
                        key={item.key}
                        value={item.key}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              </div>
              {scopes.teams.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Team
                </label>

                <select
                  value={extra.team}
                  onChange={setExtraField("team")}
                  className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Teams</option>
                  {scopes.teams.map((t) => (<option key={t._id} value={t._id}>{t.name}</option>))}
                </select>
              </div>
              )}
              {scopes.territories.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Territory
                </label>

                <select
                  value={extra.territory}
                  onChange={setExtraField("territory")}
                  className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Territories</option>
                  {scopes.territories.map((t) => (<option key={t._id} value={t._id}>{t.name}</option>))}
                </select>
              </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Lead Source
                </label>

                <select
                  value={extra.source}
                  onChange={setExtraField("source")}
                  className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Sources</option>
                  {LEAD_SOURCES.map((key) => (<option key={key} value={key}>{titleCase(key)}</option>))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Lead Status
                </label>

                <select
                  value={extra.status}
                  onChange={setExtraField("status")}
                  className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Statuses</option>
                  {LEAD_STATUS_OPTIONS.map((key) => (<option key={key} value={key}>{titleCase(key)}</option>))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Deal Stage
                </label>

                <select
                  value={extra.stage}
                  onChange={setExtraField("stage")}
                  className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Stages</option>
                  {Object.entries(stageNames).map(([key, name]) => (<option key={key} value={key}>{name}</option>))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to load reports
                </p>

                <p className="mt-1 text-xs text-red-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !hasData ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Summary */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Overview
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  High-level business performance for the selected period.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="Leads"
                  value={formatNumber(
                    totalLeads
                  )}
                  hint="Leads created"
                  icon={Users}
                />

                <StatTile
                  label="Deals Won"
                  value={formatNumber(
                    totalWon
                  )}
                  hint="Closed won deals"
                  icon={Trophy}
                />

                <StatTile
                  label="Invoiced"
                  value={formatMoney(
                    billed
                  )}
                  hint="Total billed"
                  icon={Receipt}
                />

                <StatTile
                  label="Collected"
                  value={formatMoney(
                    paid
                  )}
                  hint="Total collected"
                  icon={Wallet}
                />
              </div>
            </section>

            {/* Sales */}
            <SalesPerformance
              sales={reports.sales}
              groupBy={groupBy}
            />

            {/* Conversion */}
            <ConversionAnalytics
              conversion={
                reports.conversion
              }
            />

            {/* Breakdowns */}
            <div className="grid gap-6 xl:grid-cols-2">
              <BreakdownPanel
                title="Leads by Status"
                subtitle="Current lead distribution across statuses."
                rows={leadRows}
                valueLabel="Leads"
              />

              <BreakdownPanel
                title="Pipeline by Stage"
                subtitle="Current opportunity pipeline distribution."
                rows={pipelineRows}
                valueLabel="Deals"
              />

              <BreakdownPanel
                title="Lead Source Performance"
                subtitle="Leads per source with win conversion."
                rows={sourceRows}
                valueLabel="Leads"
              />

              <BreakdownPanel
                title="Sales Orders by Status"
                subtitle="Orders placed during the selected period."
                rows={salesOrderRows}
                valueLabel="Orders"
              />

              <BreakdownPanel
                title="Activities by Type"
                subtitle="Activity volume during the selected period."
                rows={activityRows}
                valueLabel="Activities"
              />

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="font-semibold text-slate-800">
                    Revenue Summary
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Invoice billing and payment collection.
                  </p>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <Receipt
                        size={14}
                      />

                      Billed
                    </div>

                    <p className="mt-2 text-xl font-bold text-slate-800">
                      {formatMoney(
                        billed
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                      <Wallet
                        size={14}
                      />

                      Collected
                    </div>

                    <p className="mt-2 text-xl font-bold text-indigo-700">
                      {formatMoney(
                        paid
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Collection Rate
                      </span>

                      <span className="text-sm font-bold text-slate-700">
                        {billed
                          ? Math.round(
                              (paid /
                                billed) *
                                1000
                            ) / 10
                          : 0}
                        %
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{
                          width: `${
                            billed
                              ? Math.min(
                                  100,
                                  (paid /
                                    billed) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {!hasData && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <ActivityIcon
                    size={22}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-700">
                  No report data found
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                  There is no sales, lead, activity or revenue
                  data available for the selected filters.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}