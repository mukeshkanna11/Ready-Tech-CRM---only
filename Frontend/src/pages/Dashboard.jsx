import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import API from "../services/api";

// ======================================================
// CONFIG
// ======================================================

const REQUEST_TIMEOUT = 15000;

// ======================================================
// API HELPER
// ======================================================

const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await API.request({
      url: endpoint,
      method: options.method || "GET",
      data: options.body
        ? typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body
        : undefined,
      headers: options.headers,
      timeout: REQUEST_TIMEOUT,
    });

    return response.data;
  } catch (error) {
    if (
      error?.code === "ECONNABORTED" ||
      error?.code === "ETIMEDOUT"
    ) {
      throw new Error(
        "Request timed out. Please try again.",
        { cause: error }
      );
    }

    throw new Error(
      error?.crmMessage ||
        error?.response?.data?.message ||
        error?.message ||
        `Request to ${endpoint} failed.`,
      { cause: error }
    );
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

const formatFullCurrency = (value = 0) => {
  const amount = Number(value) || 0;

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
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

const getSourceLabel = (source = "") => {
  return String(source)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

// ======================================================
// STATUS CONFIG
// ======================================================

const STATUS_CONFIG = {
  NEW: {
    label: "New",
    className:
      "bg-blue-50 text-blue-700 border-blue-100",
    dot: "bg-blue-500",
  },

  CONTACTED: {
    label: "Contacted",
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-100",
    dot: "bg-cyan-500",
  },

  QUALIFIED: {
    label: "Qualified",
    className:
      "bg-violet-50 text-violet-700 border-violet-100",
    dot: "bg-violet-500",
  },

  PROPOSAL: {
    label: "Proposal",
    className:
      "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-500",
  },

  NEGOTIATION: {
    label: "Negotiation",
    className:
      "bg-orange-50 text-orange-700 border-orange-100",
    dot: "bg-orange-500",
  },

  WON: {
    label: "Won",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    dot: "bg-emerald-500",
  },

  LOST: {
    label: "Lost",
    className:
      "bg-rose-50 text-rose-700 border-rose-100",
    dot: "bg-rose-500",
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
      dot: "bg-slate-400",
    };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${config.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
      />

      {config.label}
    </span>
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
          <Icon size={18} strokeWidth={2.2} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-black tracking-tight text-slate-900">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
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
// KPI CARD
// ======================================================

function KPI({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  accentClass,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${accentClass}`}
      />

      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={20} strokeWidth={2.3} />
        </div>
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
    <div className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={24} />
      </div>

      <h4 className="mt-4 text-sm font-black text-slate-700">
        {title}
      </h4>

      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

// ======================================================
// SKELETON
// ======================================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="h-[430px] animate-pulse rounded-2xl bg-slate-200 xl:col-span-2" />
          <div className="h-[430px] animate-pulse rounded-2xl bg-slate-200" />
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

// ======================================================
// ERROR STATE
// ======================================================

function DashboardError({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[75vh] max-w-7xl items-center justify-center">
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
            onClick={onRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
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
  // HELPDESK CHAT STATE
  // ====================================================

  const [chatOpen, setChatOpen] = useState(false);

  const [chatForm, setChatForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    message: "",
  });

  const [chatSubmitting, setChatSubmitting] =
    useState(false);

  const [chatSuccess, setChatSuccess] =
    useState("");

  const [chatError, setChatError] =
    useState("");

  // ====================================================
  // FETCH DASHBOARD DATA
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

        // Parallel: one failing request must not block the other.
        const [leadsResult, contactsResult] =
          await Promise.allSettled([
            apiFetch("/leads?limit=200"),
            apiFetch("/contacts?limit=200"),
          ]);

        if (leadsResult.status === "fulfilled") {
          setLeads(getArray(leadsResult.value));
        }

        if (contactsResult.status === "fulfilled") {
          setContacts(
            getArray(contactsResult.value)
          );
        }

        const failures = [
          leadsResult.status === "rejected" &&
            (leadsResult.reason?.message ||
              "Unable to load leads."),
          contactsResult.status === "rejected" &&
            (contactsResult.reason?.message ||
              "Unable to load contacts."),
        ].filter(Boolean);

        setError(failures.join(" "));
      } catch (err) {
        console.error(
          "[DASHBOARD] Fetch error:",
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

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ====================================================
  // HELPDESK CHAT - RESET
  // ====================================================

  const resetChatForm = useCallback(() => {
    setChatForm({
      name: "",
      email: "",
      phone: "",
      companyName: "",
      message: "",
    });
  }, []);

  // ====================================================
  // HELPDESK CHAT - VALIDATION
  // ====================================================

  const validateChatForm = useCallback(() => {
    const name = chatForm.name.trim();
    const email = chatForm.email.trim();
    const message = chatForm.message.trim();

    if (!name) {
      return "Please enter your name.";
    }

    if (name.length < 2) {
      return "Name must contain at least 2 characters.";
    }

    if (!email) {
      return "Please enter your email address.";
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return "Please provide a valid email address.";
    }

    if (!message) {
      return "Please enter your message.";
    }

    return "";
  }, [chatForm]);

  // ====================================================
  // HELPDESK CHAT - SUBMIT
  // ====================================================

  const handleChatSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (chatSubmitting) {
        return;
      }

      setChatError("");
      setChatSuccess("");

      // --------------------------------------------------
      // CLIENT-SIDE VALIDATION
      // --------------------------------------------------

      const validationError =
        validateChatForm();

      if (validationError) {
        setChatError(validationError);
        return;
      }

      // --------------------------------------------------
      // CLEAN PAYLOAD
      // --------------------------------------------------

      const payload = {
        name: chatForm.name.trim(),
        email: chatForm.email.trim().toLowerCase(),
        phone: chatForm.phone.trim(),
        companyName:
          chatForm.companyName.trim(),
        message: chatForm.message.trim(),
      };

      try {
        setChatSubmitting(true);

        // ------------------------------------------------
        // EXISTING BACKEND ENDPOINT
        //
        // POST /api/v1/email/enquiry
        //
        // Backend handles:
        // Website Enquiry
        //       ↓
        // Create / Update Lead
        //       ↓
        // source = WEBSITE
        // status = NEW for new lead
        //       ↓
        // Resend Email
        // ------------------------------------------------

        const response = await apiFetch(
          "/email/enquiry",
          {
            method: "POST",
            body: payload,
          }
        );

        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        const successMessage =
          response?.message ||
          "Your enquiry has been submitted successfully.";

        setChatSuccess(successMessage);

        // Clear submitted form.
        resetChatForm();

        // ------------------------------------------------
        // REFRESH DASHBOARD
        // ------------------------------------------------
        // Newly created website lead will appear in:
        // - Total Leads
        // - Recent Leads
        // - Lead Sources
        // - Pipeline
        // ------------------------------------------------

        try {
          await fetchDashboardData(true);
        } catch (refreshError) {
          // Lead submission already succeeded.
          // Dashboard refresh failure should NOT
          // show the enquiry as failed.
          console.error(
            "Dashboard refresh after enquiry failed:",
            refreshError
          );
        }

      } catch (err) {
        console.error(
          "Helpdesk enquiry submission error:",
          err
        );

        setChatError(
          err?.message ||
            "Unable to submit your enquiry. Please try again."
        );
      } finally {
        setChatSubmitting(false);
      }
    },
    [
      chatForm,
      chatSubmitting,
      validateChatForm,
      resetChatForm,
      fetchDashboardData,
    ]
  );

const handleChatChange = (event) => {
  const { name, value } = event.target;

  setChatForm((previous) => ({
    ...previous,
    [name]: value,
  }));

  if (chatError) {
    setChatError("");
  }

  if (chatSuccess) {
    setChatSuccess("");
  }
};

  // ====================================================
  // HELPDESK CHAT - OPEN / CLOSE
  // ====================================================

  const openHelpdesk = useCallback(() => {
    setChatOpen(true);
  }, []);

  const closeHelpdesk = useCallback(() => {
    setChatOpen(false);
    setChatError("");
    setChatSuccess("");
  }, []);

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

  const firstName =
    userName.split(" ")[0] || "there";

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

    const totalValue = leads.reduce(
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
      totalValue,
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
  // SOURCE STATS
  // ====================================================

  const sourceStats = useMemo(() => {
    const map = {};

    leads.forEach((lead) => {
      const source = lead.source || "OTHER";

      map[source] = (map[source] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
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
      .slice(0, 7);
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
          time >=
            now -
              24 *
                60 *
                60 *
                1000
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
  // QUICK ACTIONS
  // ====================================================

  const quickActions = [
    {
      label: "Create Lead",
      description: "Add a new sales opportunity",
      icon: Target,
      action: () => navigate("/leads"),
      className:
        "from-indigo-50 to-white text-indigo-700",
    },

    {
      label: "Add Contact",
      description: "Create a customer contact",
      icon: ContactRound,
      action: () => navigate("/contacts"),
      className:
        "from-emerald-50 to-white text-emerald-700",
    },

    {
      label: "Sales Pipeline",
      description: "Track your opportunities",
      icon: TrendingUp,
      action: () => navigate("/leads"),
      className:
        "from-amber-50 to-white text-amber-700",
    },
  ];

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return <DashboardSkeleton />;
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error &&
    !leads.length &&
    !contacts.length
  ) {
    return (
      <DashboardError
        error={error}
        onRetry={() =>
          fetchDashboardData(true)
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* ==================================================
            PREMIUM HERO
        ================================================== */}

        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-2xl">
          {/* Background effects */}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.18),transparent_35%)]" />

          <div className="absolute right-[-100px] top-[-100px] h-72 w-72 rounded-full border border-white/10" />

          <div className="absolute right-[-60px] top-[-60px] h-52 w-52 rounded-full border border-white/10" />

          <div className="absolute bottom-[-120px] left-[35%] h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:p-10">

            {/* Hero content */}

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-200">
                  CRM Command Center
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                {getGreeting()},
                <span className="text-indigo-300">
                  {" "}
                  {firstName}
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Monitor your sales pipeline,
                customer relationships and
                revenue performance from one
                centralized workspace.
              </p>

              {/* Hero actions */}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/leads")
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  <Target size={17} />
                  Manage Leads
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/contacts")
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
                >
                  <Users size={17} />
                  View Contacts
                </button>
              </div>

              {/* Mini stats */}

              <div className="mt-8 flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Open Pipeline
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {formatCurrency(
                      leadMetrics.pipelineValue
                    )}
                  </p>
                </div>

                <div className="h-10 w-px bg-white/10" />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Active Leads
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {leadMetrics.open}
                  </p>
                </div>

                <div className="h-10 w-px bg-white/10" />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Customers
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {contactMetrics.active}
                  </p>
                </div>
              </div>
            </div>

            {/* Win rate */}

            <div className="flex items-center justify-center lg:pr-8">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
                <div className="absolute inset-3 rounded-full border border-indigo-400/10" />

                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/10 shadow-inner">
                  <Zap
                    size={24}
                    className="text-indigo-300"
                  />

                  <p className="mt-1 text-4xl font-black text-white">
                    {leadMetrics.conversionRate}%
                  </p>

                  <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    Win Rate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            REFRESH BAR
        ================================================== */}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <Clock3 size={14} />

            <span>
              Dashboard overview
            </span>

            <span className="hidden text-slate-300 sm:inline">
              •
            </span>

            <span className="hidden sm:inline">
              Updated{" "}
              {new Date().toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </span>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              fetchDashboardData(true)
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
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
              : "Refresh dashboard"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            {error}
          </div>
        )}

        {/* ==================================================
            KPI
        ================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI
            title="Total Leads"
            value={leadMetrics.total}
            subtitle={`${leadMetrics.open} active opportunities`}
            icon={Target}
            iconClass="bg-indigo-50 text-indigo-600"
            accentClass="bg-indigo-500"
          />

          <KPI
            title="Total Contacts"
            value={contactMetrics.total}
            subtitle={`${contactMetrics.active} active contacts`}
            icon={ContactRound}
            iconClass="bg-emerald-50 text-emerald-600"
            accentClass="bg-emerald-500"
          />

          <KPI
            title="Pipeline Value"
            value={formatCurrency(
              leadMetrics.pipelineValue
            )}
            subtitle="Open opportunity value"
            icon={CircleDollarSign}
            iconClass="bg-amber-50 text-amber-600"
            accentClass="bg-amber-500"
          />

          <KPI
            title="Won Revenue"
            value={formatCurrency(
              leadMetrics.wonValue
            )}
            subtitle={`${leadMetrics.won} deals successfully won`}
            icon={Trophy}
            iconClass="bg-violet-50 text-violet-600"
            accentClass="bg-violet-500"
          />
        </section>

        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Zap
              size={15}
              className="text-indigo-600"
            />

            <p className="text-xs font-black uppercase tracking-wider text-slate-700">
              Quick actions
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  className={`group flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg ${className}`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">
                      {label}
                    </p>

                    <p className="mt-0.5 text-[11px] font-medium opacity-70">
                      {description}
                    </p>
                  </div>

                  <ChevronRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              )
            )}
          </div>
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
              description="Opportunity distribution across every stage"
              action={
                <button
                  type="button"
                  onClick={() =>
                    navigate("/leads")
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-700"
                >
                  View pipeline
                  <ChevronRight size={13} />
                </button>
              }
            />

            <div className="mt-7 space-y-5">
              {pipeline.map((item) => {
                const percentage =
                  leadMetrics.total > 0
                    ? Math.round(
                        (item.count /
                          leadMetrics.total) *
                          100
                      )
                    : 0;

                const width =
                  item.count > 0
                    ? Math.max(
                        percentage,
                        4
                      )
                    : 0;

                return (
                  <div
                    key={item.status}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={
                            item.status
                          }
                        />

                        <span className="text-[11px] font-semibold text-slate-400">
                          {item.count}{" "}
                          {item.count === 1
                            ? "lead"
                            : "leads"}
                        </span>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800">
                          {formatCurrency(
                            item.value
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-700"
                        style={{
                          width: `${width}%`,
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
              description="Your top acquisition channels"
            />

            <div className="mt-7 space-y-6">
              {sourceStats.map(
                ([source, count], index) => {
                  const width =
                    (count /
                      maxSourceCount) *
                    100;

                  const percentage =
                    leadMetrics.total > 0
                      ? Math.round(
                          (count /
                            leadMetrics.total) *
                            100
                        )
                      : 0;

                  return (
                    <div key={source}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                            {index + 1}
                          </span>

                          <span className="truncate text-xs font-bold text-slate-700">
                            {getSourceLabel(
                              source
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">
                            {percentage}%
                          </span>

                          <span className="text-xs font-black text-slate-900">
                            {count}
                          </span>
                        </div>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
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
                  description="Lead source analytics will appear once leads are created."
                />
              )}
            </div>

            {/* Source summary */}

            {sourceStats.length > 0 && (
              <div className="mt-7 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp
                    size={15}
                    className="text-indigo-600"
                  />

                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                    Top source
                  </span>
                </div>

                <p className="mt-2 text-sm font-black text-slate-900">
                  {getSourceLabel(
                    sourceStats[0][0]
                  )}
                </p>

                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  {sourceStats[0][1]} leads
                  generated
                </p>
              </div>
            )}
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
                description="Latest opportunities entering your CRM"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/leads")
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-700"
                  >
                    View all
                    <ChevronRight size={13} />
                  </button>
                }
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Lead
                    </th>

                    <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Company
                    </th>

                    <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Source
                    </th>

                    <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentLeads.map((lead) => (
                    <tr
                      key={
                        lead._id ||
                        lead.id
                      }
                      className="group border-b border-slate-100 transition hover:bg-slate-50/80"
                    >
                      {/* Lead */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-black text-white shadow-sm">
                            {getInitials(
                              lead.name
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[170px] truncate text-xs font-black text-slate-800">
                              {lead.name ||
                                "Unnamed Lead"}
                            </p>

                            <p className="mt-0.5 max-w-[170px] truncate text-[10px] font-medium text-slate-400">
                              {lead.email ||
                                lead.phone ||
                                "No contact"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Company */}

                      <td className="px-5 py-4">
                        <p className="max-w-[150px] truncate text-xs font-semibold text-slate-600">
                          {lead.companyName ||
                            "—"}
                        </p>
                      </td>

                      {/* Source */}

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                          {getSourceLabel(
                            lead.source ||
                              "OTHER"
                          )}
                        </span>
                      </td>

                      {/* Status */}

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            lead.status
                          }
                        />
                      </td>

                      {/* Value */}

                      <td className="px-5 py-4 text-right">
                        <p className="text-xs font-black text-slate-800">
                          {formatCurrency(
                            lead.value
                          )}
                        </p>

                        <p className="mt-0.5 text-[9px] font-medium text-slate-400">
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
                  description="Your latest sales opportunities will appear here."
                />
              )}
            </div>
          </div>

          {/* FOLLOW UPS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={CalendarClock}
              title="Follow-ups"
              description="Stay connected with prospects"
              action={
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-600">
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
                      lead._id ||
                      lead.id
                    }
                    onClick={() =>
                      navigate("/leads")
                    }
                    className="group w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50/40"
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
                          size={16}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-800">
                          {lead.name ||
                            "Unnamed Lead"}
                        </p>

                        <p className="mt-1 truncate text-[10px] font-medium text-slate-500">
                          {lead.companyName ||
                            lead.email ||
                            "Lead"}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[9px] font-semibold text-slate-400">
                            {formatDate(
                              lead.nextFollowUpAt
                            )}
                          </span>

                          <span
                            className={`text-[9px] font-black ${
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
              description="Latest people added to your customer database"
              action={
                <button
                  type="button"
                  onClick={() =>
                    navigate("/contacts")
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-700"
                >
                  View all
                  <ChevronRight size={13} />
                </button>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {recentContacts.map(
              (contact) => {
                const contactName =
                  contact.fullName ||
                  `${contact.firstName || ""} ${
                    contact.lastName || ""
                  }`.trim() ||
                  "Unnamed Contact";

                return (
                  <button
                    type="button"
                    key={
                      contact._id ||
                      contact.id
                    }
                    onClick={() =>
                      navigate(
                        "/contacts"
                      )
                    }
                    className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-black text-white shadow-sm">
                        {getInitials(
                          contactName
                        )}
                      </div>

                      <StatusBadge
                        status={
                          contact.status
                        }
                      />
                    </div>

                    <h4 className="mt-4 truncate text-xs font-black text-slate-800">
                      {contactName}
                    </h4>

                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                      {contact.designation ||
                        "Business Contact"}
                    </p>

                    <div className="mt-4 space-y-2">
                      {contact.email && (
                        <div className="flex min-w-0 items-center gap-2 text-[9px] font-medium text-slate-500">
                          <Mail
                            size={11}
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {
                              contact.email
                            }
                          </span>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex min-w-0 items-center gap-2 text-[9px] font-medium text-slate-500">
                          <Phone
                            size={11}
                            className="shrink-0"
                          />

                          <span>
                            {
                              contact.phone
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              }
            )}

            {!recentContacts.length && (
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-5">
                <EmptyState
                  icon={
                    ContactRound
                  }
                  title="No contacts yet"
                  description="Your customer contacts will appear here."
                />
              </div>
            )}
          </div>
        </section>

        {/* ==================================================
            PERFORMANCE SUMMARY
        ================================================== */}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Open */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BriefcaseBusiness
                  size={18}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Open Leads
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.open}
                </p>
              </div>
            </div>
          </div>

          {/* Qualified */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Target size={18} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Qualified
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.qualified}
                </p>
              </div>
            </div>
          </div>

          {/* Won */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2
                  size={18}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Won Deals
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.won}
                </p>
              </div>
            </div>
          </div>

          {/* Lost */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle size={18} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Lost Deals
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {leadMetrics.lost}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
    HELPDESK CHAT
================================================== */}

<div className="fixed bottom-5 right-5 z-[60] sm:bottom-6 sm:right-6">

  {/* ==================================================
      CHAT WINDOW
  ================================================== */}

  {chatOpen && (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close helpdesk"
        onClick={closeHelpdesk}
        className="fixed inset-0 -z-10 bg-slate-950/20 backdrop-blur-[2px] sm:hidden"
      />

      <div className="mb-4 w-[calc(100vw-24px)] max-w-[410px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] ring-1 ring-slate-950/5">

        {/* ==================================================
            CHAT HEADER
        ================================================== */}

        <div className="relative overflow-hidden bg-slate-950">

          {/* Background glow */}
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

          {/* Decorative circles */}
          <div className="absolute right-5 top-5 h-16 w-16 rounded-full border border-white/5" />
          <div className="absolute right-8 top-8 h-10 w-10 rounded-full border border-white/5" />

          <div className="relative px-5 pb-5 pt-5 sm:px-6">

            <div className="flex items-start justify-between gap-4">

              {/* Brand */}
              <div className="flex min-w-0 items-center gap-3">

                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/30">

                  <MessageCircle
                    size={22}
                    strokeWidth={2.2}
                  />

                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950 bg-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>

                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-2">

                    <p className="text-sm font-black tracking-tight text-white">
                      Ready Tech Helpdesk
                    </p>

                  </div>

                  <div className="mt-1 flex items-center gap-1.5">

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                    <span className="text-[10px] font-semibold text-slate-400">
                      Online • Enquiries welcome
                    </span>

                  </div>

                </div>

              </div>

              {/* Close */}
              <button
                type="button"
                onClick={closeHelpdesk}
                disabled={chatSubmitting}
                aria-label="Close helpdesk"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} />
              </button>

            </div>

            {/* Header message */}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 backdrop-blur">

              <div className="flex items-start gap-2.5">

                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                  <Zap
                    size={13}
                    strokeWidth={2.5}
                  />
                </div>

                <div>
                  <p className="text-[11px] font-bold text-white">
                    Need help with Ready Tech?
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
                    Send your requirement and our team will get back to you.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ==================================================
            FORM BODY
        ================================================== */}

        <form
          onSubmit={handleChatSubmit}
          className="max-h-[calc(100vh-190px)] overflow-y-auto bg-white p-5 sm:p-6"
        >

          {/* ==================================================
              SUCCESS STATE
          ================================================== */}

          {chatSuccess && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">

              <div className="flex items-start gap-3 p-4">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-black text-emerald-800">
                    Enquiry submitted successfully
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-emerald-700">
                    {chatSuccess}
                  </p>

                </div>

              </div>

              <div className="border-t border-emerald-200/70 px-4 py-2.5">
                <p className="text-[9px] font-semibold text-emerald-600">
                  Our team has received your enquiry.
                </p>
              </div>

            </div>
          )}

          {/* ==================================================
              ERROR STATE
          ================================================== */}

          {chatError && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <XCircle size={16} />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-black text-rose-800">
                  Unable to submit enquiry
                </p>

                <p className="mt-1 text-[10px] leading-4 text-rose-700">
                  {chatError}
                </p>

              </div>

            </div>
          )}

          {/* ==================================================
              FORM INTRO
          ================================================== */}

          {!chatSuccess && (
            <div className="mb-5">

              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-600">
                Contact our team
              </p>

              <h3 className="mt-1 text-base font-black tracking-tight text-slate-950">
                Tell us what you need
              </h3>

              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                Fill in your details and send us your requirement.
              </p>

            </div>
          )}

          {/* ==================================================
              NAME + EMAIL
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* Name */}

            <div>

              <label
                htmlFor="helpdesk-name"
                className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
              >
                Name
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <div className="relative">

                <UserRound
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="helpdesk-name"
                  name="name"
                  type="text"
                  value={chatForm.name}
                  onChange={handleChatChange}
                  placeholder="Full name"
                  maxLength={200}
                  autoComplete="name"
                  disabled={chatSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

            </div>

            {/* Email */}

            <div>

              <label
                htmlFor="helpdesk-email"
                className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
              >
                Email
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <div className="relative">

                <Mail
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="helpdesk-email"
                  name="email"
                  type="email"
                  value={chatForm.email}
                  onChange={handleChatChange}
                  placeholder="you@company.com"
                  maxLength={200}
                  autoComplete="email"
                  disabled={chatSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

            </div>

          </div>

          {/* ==================================================
              PHONE + COMPANY
          ================================================== */}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* Phone */}

            <div>

              <label
                htmlFor="helpdesk-phone"
                className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
              >
                Phone
                <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
                  Optional
                </span>
              </label>

              <div className="relative">

                <Phone
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="helpdesk-phone"
                  name="phone"
                  type="tel"
                  value={chatForm.phone}
                  onChange={handleChatChange}
                  placeholder="9876543210"
                  maxLength={30}
                  autoComplete="tel"
                  disabled={chatSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

            </div>

            {/* Company */}

            <div>

              <label
                htmlFor="helpdesk-company"
                className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
              >
                Company
                <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
                  Optional
                </span>
              </label>

              <div className="relative">

                <BriefcaseBusiness
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="helpdesk-company"
                  name="companyName"
                  type="text"
                  value={chatForm.companyName}
                  onChange={handleChatChange}
                  placeholder="Company name"
                  maxLength={200}
                  autoComplete="organization"
                  disabled={chatSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

            </div>

          </div>

          {/* ==================================================
              MESSAGE
          ================================================== */}

          <div className="mt-3">

            <div className="mb-1.5 flex items-center justify-between">

              <label
                htmlFor="helpdesk-message"
                className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
              >
                Message
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <span className="text-[9px] font-semibold text-slate-400">
                {chatForm.message.length}/5000
              </span>

            </div>

            <textarea
              id="helpdesk-message"
              name="message"
              value={chatForm.message}
              onChange={handleChatChange}
              placeholder="Tell us about your requirement, product enquiry or support request..."
              rows={5}
              maxLength={5000}
              disabled={chatSubmitting}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-medium leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

          </div>

          {/* ==================================================
              SUBMIT
          ================================================== */}

          <button
            type="submit"
            disabled={chatSubmitting}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-slate-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-600 hover:via-indigo-600 hover:to-violet-600 hover:shadow-xl hover:shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >

            {chatSubmitting ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                <span>
                  Sending enquiry...
                </span>
              </>
            ) : (
              <>
                <Send
                  size={15}
                  strokeWidth={2.4}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />

                <span>
                  Send Enquiry
                </span>

                <ChevronRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </>
            )}

          </button>

          {/* ==================================================
              TRUST FOOTER
          ================================================== */}

          <div className="mt-4 flex items-center justify-center gap-2">

            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={11} />
            </div>

            <p className="text-center text-[9px] font-semibold leading-4 text-slate-400">
              Your enquiry is securely submitted to the Ready Tech team.
            </p>

          </div>

        </form>

      </div>
    </>
  )}

  {/* ==================================================
      FLOATING LAUNCHER
  ================================================== */}

  {!chatOpen && (
    <div className="flex items-end gap-3">

      {/* Desktop label */}

      <button
        type="button"
        onClick={openHelpdesk}
        className="group hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl sm:flex"
      >

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
          <MessageCircle
            size={16}
            strokeWidth={2.3}
          />
        </div>

        <div>

          <p className="text-[10px] font-black text-slate-900">
            Need help?
          </p>

          <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
            Chat with our team
          </p>

        </div>

        <ChevronRight
          size={14}
          className="ml-1 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
        />

      </button>

      {/* Main floating button */}

      <button
        type="button"
        onClick={openHelpdesk}
        aria-label="Open helpdesk"
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_22px_55px_rgba(79,70,229,0.32)]"
      >

        {/* Glow */}

        <span className="absolute inset-0 rounded-2xl bg-indigo-500 opacity-0 blur-xl transition duration-300 group-hover:opacity-30" />

        {/* Icon */}

        <MessageCircle
          size={23}
          strokeWidth={2.2}
          className="relative transition-transform duration-300 group-hover:scale-110"
        />

        {/* Online badge */}

        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-slate-50 bg-emerald-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </span>

      </button>

    </div>
  )}

</div>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 py-5 text-[10px] font-semibold text-slate-400 sm:flex-row">
          <span>
            Ready Tech CRM
          </span>

          <span>
            Sales & Customer Relationship
            Management
          </span>
        </footer>
      </main>
    </div>
  );
}