import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ContactRound,
  Flame,
  LayoutDashboard,
  Mail,
  Phone,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

// ======================================================
// CONFIG
// ======================================================

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

const REQUEST_TIMEOUT = 15000;

// ======================================================
// API HELPER
// ======================================================

const getToken = () => {
  const tokenKeys = [
    "accessToken",
    "token",
    "access_token",
  ];

  for (const key of tokenKeys) {
    const value = localStorage.getItem(key);

    if (
      value &&
      typeof value === "string" &&
      value.trim() &&
      value !== "null" &&
      value !== "undefined"
    ) {
      // Prevent double "Bearer Bearer ..."
      return value.replace(/^Bearer\\s+/i, "").trim();
    }
  }

  return "";
};

const clearAuthStorage = () => {
  [
    "accessToken",
    "token",
    "access_token",
    "refreshToken",
    "refresh_token",
    "user",
  ].forEach((key) => {
    localStorage.removeItem(key);
  });
};

const apiFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const token = getToken();

    if (!token) {
      clearAuthStorage();
      throw new Error(
        "Authentication required. Please login again."
      );
    }

    const response = await fetch(
      `${API_BASE}${endpoint}`,
      {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    let result;

    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();

      try {
        result = JSON.parse(text);
      } catch {
        result = { message: text };
      }
    }

    if (response.status === 401) {
      console.error(
        `Unauthorized API request: ${endpoint}`,
        result
      );

      clearAuthStorage();

      throw new Error(
        result?.message ||
          "Your session has expired. Please login again."
      );
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          result?.error ||
          `Request failed with status ${response.status}`
      );
    }

    return result;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Request timed out. Please try again."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// ======================================================
// SAFE ARRAY
// ======================================================

const getArray = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  return [];
};

// ======================================================
// HELPERS
// ======================================================

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatRelativeDate = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const diff = parsed.getTime() - Date.now();

  const days = Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return `${Math.abs(days)}d overdue`;
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `In ${days}d`;
};

const getInitials = (name = "") => {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((item) => item.charAt(0))
      .join("")
      .toUpperCase() || "NA"
  );
};

const getStatusLabel = (status = "") => {
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
};

// ======================================================
// STATUS CONFIG
// ======================================================

const STATUS_CONFIG = {
  NEW: {
    label: "New",
    className:
      "bg-blue-50 text-blue-700 border-blue-100",
  },

  CONTACTED: {
    label: "Contacted",
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-100",
  },

  QUALIFIED: {
    label: "Qualified",
    className:
      "bg-violet-50 text-violet-700 border-violet-100",
  },

  PROPOSAL: {
    label: "Proposal",
    className:
      "bg-amber-50 text-amber-700 border-amber-100",
  },

  NEGOTIATION: {
    label: "Negotiation",
    className:
      "bg-orange-50 text-orange-700 border-orange-100",
  },

  WON: {
    label: "Won",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
  },

  LOST: {
    label: "Lost",
    className:
      "bg-rose-50 text-rose-700 border-rose-100",
  },
};

// ======================================================
// STATUS BADGE
// ======================================================

function StatusBadge({ status }) {
  const config =
    STATUS_CONFIG[status] || {
      label: getStatusLabel(status),
      className:
        "bg-slate-50 text-slate-600 border-slate-200",
    };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  iconClass,
}) {
  const positive =
    typeof trend === "number" ? trend >= 0 : true;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100 opacity-50 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} strokeWidth={2.2} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="relative mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold ${
              positive
                ? "text-emerald-600"
                : "text-rose-600"
            }`}
          >
            {positive ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}

            {Math.abs(trend)}%
          </span>

          <span className="text-xs text-slate-400">
            {trendLabel || "vs last period"}
          </span>
        </div>
      )}
    </div>
  );
}

// ======================================================
// SKELETON
// ======================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200 xl:col-span-2" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

// ======================================================
// EMPTY STATE
// ======================================================

function EmptyState({
  icon: Icon = Activity,
  title,
  description,
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={25} />
      </div>

      <h4 className="mt-4 text-sm font-bold text-slate-700">
        {title}
      </h4>

      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

// ======================================================
// SECTION HEADER
// ======================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-900">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

// ======================================================
// MAIN DASHBOARD
// ======================================================

export default function Dashboard() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  // ====================================================
  // FETCH DATA
  // ====================================================

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          leadsResponse,
          contactsResponse,
        ] = await Promise.all([
          apiFetch("/leads?limit=200"),
          apiFetch("/contacts?limit=200"),
        ]);

        setLeads(getArray(leadsResponse));
        setContacts(getArray(contactsResponse));
      } catch (err) {
        console.error(
          "Dashboard fetch error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ====================================================
  // CURRENT USER
  // ====================================================

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      return null;
    }
  }, []);

  const userName =
    currentUser?.name ||
    currentUser?.user?.name ||
    "CRM User";

  // ====================================================
  // LEAD METRICS
  // ====================================================

  const leadMetrics = useMemo(() => {
    const total = leads.length;

    const won = leads.filter(
      (lead) => lead.status === "WON"
    ).length;

    const lost = leads.filter(
      (lead) => lead.status === "LOST"
    ).length;

    const open = leads.filter(
      (lead) =>
        lead.status !== "WON" &&
        lead.status !== "LOST"
    ).length;

    const qualified = leads.filter(
      (lead) =>
        lead.status === "QUALIFIED" ||
        lead.status === "PROPOSAL" ||
        lead.status === "NEGOTIATION"
    ).length;

    const pipelineValue = leads
      .filter(
        (lead) =>
          lead.status !== "LOST" &&
          lead.status !== "WON"
      )
      .reduce(
        (sum, lead) =>
          sum + Number(lead.value || 0),
        0
      );

    const wonValue = leads
      .filter(
        (lead) => lead.status === "WON"
      )
      .reduce(
        (sum, lead) =>
          sum + Number(lead.value || 0),
        0
      );

    const conversionRate =
      total > 0
        ? Math.round((won / total) * 100)
        : 0;

    return {
      total,
      won,
      lost,
      open,
      qualified,
      pipelineValue,
      wonValue,
      conversionRate,
    };
  }, [leads]);

  // ====================================================
  // CONTACT METRICS
  // ====================================================

  const contactMetrics = useMemo(() => {
    const total = contacts.length;

    const active = contacts.filter(
      (contact) =>
        contact.status === "ACTIVE"
    ).length;

    const inactive = contacts.filter(
      (contact) =>
        contact.status === "INACTIVE"
    ).length;

    return {
      total,
      active,
      inactive,
    };
  }, [contacts]);

  // ====================================================
  // PIPELINE
  // ====================================================

  const pipeline = useMemo(() => {
    const statuses = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL",
      "NEGOTIATION",
      "WON",
      "LOST",
    ];

    return statuses.map((status) => {
      const items = leads.filter(
        (lead) => lead.status === status
      );

      const value = items.reduce(
        (sum, lead) =>
          sum + Number(lead.value || 0),
        0
      );

      return {
        status,
        count: items.length,
        value,
      };
    });
  }, [leads]);

  // ====================================================
  // LEAD SOURCES
  // ====================================================

  const sourceStats = useMemo(() => {
    const map = {};

    leads.forEach((lead) => {
      const source = lead.source || "OTHER";

      map[source] = (map[source] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [leads]);

  const maxSourceCount =
    sourceStats[0]?.[1] || 1;

  // ====================================================
  // RECENT LEADS
  // ====================================================

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 6);
  }, [leads]);

  // ====================================================
  // RECENT CONTACTS
  // ====================================================

  const recentContacts = useMemo(() => {
    return [...contacts]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 5);
  }, [contacts]);

  // ====================================================
  // FOLLOW UPS
  // ====================================================

  const followUps = useMemo(() => {
    const now = Date.now();

    return leads
      .filter((lead) => {
        if (!lead.nextFollowUpAt) {
          return false;
        }

        const time = new Date(
          lead.nextFollowUpAt
        ).getTime();

        return (
          !Number.isNaN(time) &&
          time >= now - 24 * 60 * 60 * 1000
        );
      })
      .sort(
        (a, b) =>
          new Date(a.nextFollowUpAt) -
          new Date(b.nextFollowUpAt)
      )
      .slice(0, 5);
  }, [leads]);

  // ====================================================
  // QUICK ACTION
  // ====================================================

  const quickActions = [
    {
      label: "New Lead",
      description: "Create sales opportunity",
      icon: Target,
      action: () => navigate("/leads"),
      className:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    },

    {
      label: "New Contact",
      description: "Add business contact",
      icon: ContactRound,
      action: () => navigate("/contacts"),
      className:
        "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },

    {
      label: "View Pipeline",
      description: "Track sales progress",
      icon: TrendingUp,
      action: () => navigate("/leads"),
      className:
        "bg-amber-50 text-amber-700 hover:bg-amber-100",
    },
  ];

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (error && !leads.length && !contacts.length) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <XCircle size={30} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              Dashboard unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                fetchDashboardData(true)
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ==================================================
            HERO
        ================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
          {/* decorative */}
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="absolute right-10 top-10 hidden h-24 w-24 rounded-full border border-white/10 lg:block" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-100 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                CRM Overview
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {getGreeting()}, {userName.split(" ")[0]} 👋
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Stay on top of your sales pipeline,
                manage customer relationships and
                turn opportunities into revenue.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/leads")
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  <Target size={17} />
                  Manage Leads
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/contacts")
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Users size={17} />
                  View Contacts
                </button>
              </div>
            </div>

            <div className="hidden shrink-0 lg:block">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur">
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10">
                  <Zap
                    size={26}
                    className="text-indigo-300"
                  />

                  <span className="mt-1 text-2xl font-black">
                    {leadMetrics.conversionRate}%
                  </span>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Win Rate
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            REFRESH / ERROR
        ================================================== */}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock3 size={14} />

            Last updated{" "}
            {new Date().toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              fetchDashboardData(true)
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        )}

        {/* ==================================================
            KPI CARDS
        ================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Leads"
            value={leadMetrics.total}
            subtitle={`${leadMetrics.open} active opportunities`}
            icon={Target}
            trend={leadMetrics.total ? 12 : 0}
            trendLabel="overall pipeline"
            iconClass="bg-indigo-50 text-indigo-600"
          />

          <StatCard
            title="Total Contacts"
            value={contactMetrics.total}
            subtitle={`${contactMetrics.active} active contacts`}
            icon={ContactRound}
            trend={contactMetrics.total ? 8 : 0}
            trendLabel="customer database"
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Pipeline Value"
            value={formatCurrency(
              leadMetrics.pipelineValue
            )}
            subtitle="Open lead opportunities"
            icon={CircleDollarSign}
            trend={leadMetrics.pipelineValue ? 15 : 0}
            trendLabel="potential revenue"
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            title="Won Revenue"
            value={formatCurrency(
              leadMetrics.wonValue
            )}
            subtitle={`${leadMetrics.won} deals won`}
            icon={Trophy}
            trend={leadMetrics.won ? 10 : 0}
            trendLabel="closed business"
            iconClass="bg-violet-50 text-violet-600"
          />
        </section>

        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map(
            ({
              label,
              description,
              icon: Icon,
              action,
              className,
            }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className={`group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${className}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">
                    {label}
                  </p>

                  <p className="mt-0.5 text-xs opacity-70">
                    {description}
                  </p>
                </div>

                <ChevronRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            )
          )}
        </section>

        {/* ==================================================
            PIPELINE + SOURCES
        ================================================== */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* PIPELINE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <SectionHeader
              icon={TrendingUp}
              title="Sales Pipeline"
              description="Lead distribution across every stage"
              action={
                <button
                  type="button"
                  onClick={() =>
                    navigate("/leads")
                  }
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  View all
                </button>
              }
            />

            <div className="mt-6 space-y-4">
              {pipeline.map((item) => {
                const percentage =
                  leadMetrics.total > 0
                    ? Math.max(
                        5,
                        Math.round(
                          (item.count /
                            leadMetrics.total) *
                            100
                        )
                      )
                    : 5;

                return (
                  <div key={item.status}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={item.status}
                        />

                        <span className="text-xs font-semibold text-slate-500">
                          {item.count} lead
                          {item.count !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-slate-700">
                        {formatCurrency(
                          item.value
                        )}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {!pipeline.some(
                (item) => item.count > 0
              ) && (
                <EmptyState
                  icon={Target}
                  title="No leads yet"
                  description="Create your first lead to start building your sales pipeline."
                />
              )}
            </div>
          </div>

          {/* SOURCES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={Activity}
              title="Lead Sources"
              description="Where your leads come from"
            />

            <div className="mt-6 space-y-5">
              {sourceStats.map(
                ([source, count], index) => {
                  const width =
                    (count / maxSourceCount) *
                    100;

                  return (
                    <div key={source}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                          {getStatusLabel(
                            source
                          )}
                        </span>

                        <span className="text-xs font-black text-slate-900">
                          {count}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                          style={{
                            width: `${width}%`,
                            transitionDelay: `${
                              index * 100
                            }ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}

              {!sourceStats.length && (
                <EmptyState
                  icon={Activity}
                  title="No source data"
                  description="Lead source analytics will appear here."
                />
              )}
            </div>
          </div>
        </section>

        {/* ==================================================
            RECENT LEADS + FOLLOW UPS
        ================================================== */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* RECENT LEADS */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="p-5">
              <SectionHeader
                icon={Flame}
                title="Recent Leads"
                description="Latest sales activity"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/leads")
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    View all
                    <ChevronRight size={14} />
                  </button>
                }
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Lead
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Company
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentLeads.map((lead) => (
                    <tr
                      key={lead._id || lead.id}
                      className="group border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-sm">
                            {getInitials(
                              lead.name
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {lead.name ||
                                "Unnamed Lead"}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {lead.email ||
                                lead.phone ||
                                "No contact"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[180px] truncate text-xs font-semibold text-slate-600">
                          {lead.companyName ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={lead.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="text-xs font-black text-slate-800">
                          {formatCurrency(
                            lead.value
                          )}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {formatDate(
                            lead.createdAt
                          )}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!recentLeads.length && (
                <EmptyState
                  icon={Target}
                  title="No recent leads"
                  description="Your latest leads will appear here."
                />
              )}
            </div>
          </div>

          {/* FOLLOW UPS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={CalendarClock}
              title="Upcoming Follow-ups"
              description="Stay connected with prospects"
              action={
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600">
                  {followUps.length}
                </span>
              }
            />

            <div className="mt-5 space-y-3">
              {followUps.map((lead) => {
                const relative =
                  formatRelativeDate(
                    lead.nextFollowUpAt
                  );

                const overdue =
                  relative.includes(
                    "overdue"
                  );

                return (
                  <button
                    type="button"
                    key={
                      lead._id || lead.id
                    }
                    onClick={() =>
                      navigate("/leads")
                    }
                    className="group w-full rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50/40"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          overdue
                            ? "bg-rose-50 text-rose-600"
                            : "bg-indigo-50 text-indigo-600"
                        }`}
                      >
                        <CalendarClock
                          size={17}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-800">
                          {lead.name}
                        </p>

                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {lead.companyName ||
                            lead.email ||
                            "Lead"}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {formatDate(
                              lead.nextFollowUpAt
                            )}
                          </span>

                          <span
                            className={`text-[10px] font-black ${
                              overdue
                                ? "text-rose-600"
                                : "text-indigo-600"
                            }`}
                          >
                            {relative}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!followUps.length && (
                <EmptyState
                  icon={CheckCircle2}
                  title="You're all caught up"
                  description="No upcoming follow-ups are currently scheduled."
                />
              )}
            </div>
          </div>
        </section>

        {/* ==================================================
            CONTACTS
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            <SectionHeader
              icon={Users}
              title="Recent Contacts"
              description="Your latest customer relationships"
              action={
                <button
                  type="button"
                  onClick={() =>
                    navigate("/contacts")
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  View all
                  <ChevronRight size={14} />
                </button>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-5">
            {recentContacts.map((contact) => (
              <button
                type="button"
                key={
                  contact._id || contact.id
                }
                onClick={() =>
                  navigate("/contacts")
                }
                className="group rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-black text-white shadow-sm">
                    {getInitials(
                      contact.fullName ||
                        `${contact.firstName || ""} ${
                          contact.lastName || ""
                        }`
                    )}
                  </div>

                  <StatusBadge
                    status={contact.status}
                  />
                </div>

                <h4 className="mt-4 truncate text-sm font-black text-slate-800">
                  {contact.fullName ||
                    `${contact.firstName || ""} ${
                      contact.lastName || ""
                    }`.trim() ||
                    "Unnamed Contact"}
                </h4>

                <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                  {contact.designation ||
                    "Business Contact"}
                </p>

                <div className="mt-4 space-y-2">
                  {contact.email && (
                    <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-500">
                      <Mail
                        size={12}
                        className="shrink-0"
                      />

                      <span className="truncate">
                        {contact.email}
                      </span>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-500">
                      <Phone
                        size={12}
                        className="shrink-0"
                      />

                      <span>
                        {contact.phone}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}

            {!recentContacts.length && (
              <div className="sm:col-span-2 xl:col-span-5">
                <EmptyState
                  icon={ContactRound}
                  title="No contacts yet"
                  description="Your customer contacts will appear here."
                />
              </div>
            )}
          </div>
        </section>

        {/* ==================================================
            FOOTER SUMMARY
        ================================================== */}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BriefcaseBusiness
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Open Leads
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.open}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Target size={18} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Qualified
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.qualified}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Won
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.won}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle size={18} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lost
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.lost}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            COPYRIGHT
        ================================================== */}

        <footer className="pb-4 pt-2 text-center text-[11px] font-medium text-slate-400">
          CRM Dashboard • Sales & Customer
          Relationship Management
        </footer>
      </main>
    </div>
  );
}