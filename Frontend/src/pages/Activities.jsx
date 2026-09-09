import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  Eye,
  Filter,
  ListTodo,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";

/* ============================================================
   API CONFIG
   ============================================================ */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ============================================================
   CONSTANTS
   ============================================================ */

const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "MEETING",
  "TASK",
];

const ACTIVITY_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const ACTIVITY_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const ACTIVITY_OUTCOMES = [
  "NO_RESPONSE",
  "CONNECTED",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "MEETING_SCHEDULED",
  "DEMO_SCHEDULED",
  "PROPOSAL_REQUESTED",
  "CONVERTED",
  "LOST",
  "OTHER",
];

const EMPTY_FORM = {
  type: "CALL",
  subject: "",
  description: "",
  scheduledAt: "",
  dueAt: "",
  status: "PENDING",
  priority: "MEDIUM",
  outcome: "",
  outcomeNotes: "",
  assignedTo: "",
  lead: "",
  company: "",
  contact: "",
  opportunity: "",
  location: "",
  meetingLink: "",
  phoneNumber: "",
  emailAddress: "",
  reminderEnabled: false,
  reminderAt: "",
  isRecurring: false,
  recurrence: "",
  tags: "",
  internalNotes: "",
  durationMinutes: "",
};

/* ============================================================
   HELPERS
   ============================================================ */

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error?.details?.[0]?.message ||
    error?.message ||
    "Something went wrong."
  );
};

const getResponseData = (response) => {
  const payload = response?.data;

  if (payload?.data !== undefined) {
    return payload.data;
  }

  return payload;
};

const extractActivities = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.activities)) {
    return payload.activities;
  }

  if (Array.isArray(payload?.data?.activities)) {
    return payload.data.activities;
  }

  return [];
};

const extractPagination = (payload, fallbackPage, fallbackLimit) => {
  const pagination =
    payload?.pagination ||
    payload?.data?.pagination ||
    {};

  return {
    page:
      Number(pagination.page) ||
      fallbackPage,

    limit:
      Number(pagination.limit) ||
      fallbackLimit,

    total:
      Number(pagination.total) || 0,

    totalPages:
      Number(pagination.totalPages) ||
      Number(pagination.pages) ||
      1,

    hasNextPage:
      pagination.hasNextPage ??
      (
        (Number(pagination.page) || fallbackPage) <
        (Number(pagination.totalPages) || 1)
      ),

    hasPreviousPage:
      pagination.hasPreviousPage ??
      (
        (Number(pagination.page) || fallbackPage) > 1
      ),
  };
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toISOStringOrUndefined = (value) => {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
};

const prettyText = (value = "") => {
  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const getActivityName = (value) => {
  if (!value) return "—";

  if (typeof value === "string") {
    return value;
  }

  return (
    value.name ||
    value.fullName ||
    value.companyName ||
    value.title ||
    value.email ||
    value._id ||
    "—"
  );
};

const getInitials = (value = "") => {
  const words = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "?";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const isOverdue = (activity) => {
  if (!activity?.scheduledAt) return false;

  if (
    activity.status === "COMPLETED" ||
    activity.status === "CANCELLED"
  ) {
    return false;
  }

  return new Date(activity.scheduledAt) < new Date();
};

/* ============================================================
   UI CONFIG
   ============================================================ */

const TYPE_META = {
  CALL: {
    icon: Phone,
    label: "Call",
    className:
      "bg-blue-50 text-blue-700 border-blue-100",
  },

  EMAIL: {
    icon: Mail,
    label: "Email",
    className:
      "bg-violet-50 text-violet-700 border-violet-100",
  },

  MEETING: {
    icon: Calendar,
    label: "Meeting",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
  },

  TASK: {
    icon: ListTodo,
    label: "Task",
    className:
      "bg-amber-50 text-amber-700 border-amber-100",
  },
};

const STATUS_META = {
  PENDING: {
    className:
      "bg-amber-50 text-amber-700 border-amber-100",
  },

  IN_PROGRESS: {
    className:
      "bg-blue-50 text-blue-700 border-blue-100",
  },

  COMPLETED: {
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
  },

  CANCELLED: {
    className:
      "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const PRIORITY_META = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-red-50 text-red-700",
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function Activities() {
  /* ----------------------------------------------------------
     DATA
  ---------------------------------------------------------- */

  const [activities, setActivities] =
    useState([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    byType: [],
    byPriority: [],
    byOutcome: [],
  });

  /* ----------------------------------------------------------
     UI STATE
  ---------------------------------------------------------- */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [showDetails, setShowDetails] =
    useState(false);

  const [showComplete, setShowComplete] =
    useState(false);

  const [showDelete, setShowDelete] =
    useState(false);

  const [showAssign, setShowAssign] =
    useState(false);

  const [menuId, setMenuId] =
    useState(null);

  /* ----------------------------------------------------------
     PAGINATION / FILTER
  ---------------------------------------------------------- */

  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(20);

  const [total, setTotal] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const [filters, setFilters] =
    useState({
      type: "",
      status: "",
      priority: "",
      outcome: "",
      assignedTo: "",
      lead: "",
      company: "",
      contact: "",
      opportunity: "",
      from: "",
      to: "",
      reminderEnabled: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

  /* ----------------------------------------------------------
     SELECTED ACTIVITY
  ---------------------------------------------------------- */

  const [selectedActivity, setSelectedActivity] =
    useState(null);

  const [editingActivity, setEditingActivity] =
    useState(null);

  /* ----------------------------------------------------------
     FORM
  ---------------------------------------------------------- */

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [completeForm, setCompleteForm] =
    useState({
      outcome: "CONNECTED",
      outcomeNotes: "",
      durationMinutes: "",
    });

  const [assignUserId, setAssignUserId] =
    useState("");

  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  const notifySuccess = useCallback(
    (message) => {
      setSuccess(message);
      setError("");

      window.setTimeout(() => {
        setSuccess("");
      }, 3500);
    },
    []
  );

  const notifyError = useCallback(
    (message) => {
      setError(message);
      setSuccess("");

      window.setTimeout(() => {
        setError("");
      }, 5000);
    },
    []
  );

  /* ==========================================================
     LOAD ACTIVITIES
  ========================================================== */

  const loadActivities = useCallback(
    async ({
      silent = false,
      customPage,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const params = {
          page:
            customPage ||
            page,

          limit,

          ...(search.trim()
            ? {
                search:
                  search.trim(),
              }
            : {}),

          ...(filters.type
            ? {
                type:
                  filters.type,
              }
            : {}),

          ...(filters.status
            ? {
                status:
                  filters.status,
              }
            : {}),

          ...(filters.priority
            ? {
                priority:
                  filters.priority,
              }
            : {}),

          ...(filters.outcome
            ? {
                outcome:
                  filters.outcome,
              }
            : {}),

          ...(filters.assignedTo
            ? {
                assignedTo:
                  filters.assignedTo,
              }
            : {}),

          ...(filters.lead
            ? {
                lead:
                  filters.lead,
              }
            : {}),

          ...(filters.company
            ? {
                company:
                  filters.company,
              }
            : {}),

          ...(filters.contact
            ? {
                contact:
                  filters.contact,
              }
            : {}),

          ...(filters.opportunity
            ? {
                opportunity:
                  filters.opportunity,
              }
            : {}),

          ...(filters.from
            ? {
                from:
                  filters.from,
              }
            : {}),

          ...(filters.to
            ? {
                to:
                  filters.to,
              }
            : {}),

          ...(filters.reminderEnabled !== ""
            ? {
                reminderEnabled:
                  filters.reminderEnabled,
              }
            : {}),

          sortBy:
            filters.sortBy,

          sortOrder:
            filters.sortOrder,
        };

        const response =
          await api.get(
            "/activities",
            {
              params,
            }
          );

        const payload =
          getResponseData(response);

        const rows =
          extractActivities(payload);

        const pagination =
          extractPagination(
            payload,
            customPage || page,
            limit
          );

        setActivities(rows);
        setTotal(pagination.total);
        setTotalPages(
          pagination.totalPages
        );
      } catch (requestError) {
        notifyError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      filters,
      notifyError,
    ]
  );

  /* ==========================================================
     LOAD STATS
  ========================================================== */

  const loadStats =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/activities/stats"
          );

        const payload =
          getResponseData(response);

        setStats({
          total:
            Number(payload?.total) || 0,

          pending:
            Number(payload?.pending) || 0,

          inProgress:
            Number(payload?.inProgress) || 0,

          completed:
            Number(payload?.completed) || 0,

          cancelled:
            Number(payload?.cancelled) || 0,

          overdue:
            Number(payload?.overdue) || 0,

          byType:
            payload?.byType || [],

          byPriority:
            payload?.byPriority || [],

          byOutcome:
            payload?.byOutcome || [],
        });
      } catch (requestError) {
        // Stats should not block the activities page.
        console.error(
          "Activity stats error:",
          requestError
        );
      }
    }, []);

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = async () => {
    await Promise.all([
      loadActivities({
        silent: true,
      }),
      loadStats(),
    ]);
  };

  /* ==========================================================
     FORM HANDLERS
  ========================================================== */

  const updateForm = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingActivity(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (activity) => {
    setEditingActivity(activity);

    setForm({
      type:
        activity.type ||
        "CALL",

      subject:
        activity.subject ||
        "",

      description:
        activity.description ||
        "",

      scheduledAt:
        formatDateInput(
          activity.scheduledAt
        ),

      dueAt:
        formatDateInput(
          activity.dueAt
        ),

      status:
        activity.status ||
        "PENDING",

      priority:
        activity.priority ||
        "MEDIUM",

      outcome:
        activity.outcome ||
        "",

      outcomeNotes:
        activity.outcomeNotes ||
        "",

      assignedTo:
        activity.assignedTo?._id ||
        activity.assignedTo ||
        "",

      lead:
        activity.lead?._id ||
        activity.lead ||
        "",

      company:
        activity.company?._id ||
        activity.company ||
        "",

      contact:
        activity.contact?._id ||
        activity.contact ||
        "",

      opportunity:
        activity.opportunity?._id ||
        activity.opportunity ||
        "",

      location:
        activity.location ||
        "",

      meetingLink:
        activity.meetingLink ||
        "",

      phoneNumber:
        activity.phoneNumber ||
        "",

      emailAddress:
        activity.emailAddress ||
        "",

      reminderEnabled:
        Boolean(
          activity.reminderEnabled
        ),

      reminderAt:
        formatDateInput(
          activity.reminderAt
        ),

      isRecurring:
        Boolean(
          activity.isRecurring
        ),

      recurrence:
        activity.recurrence ||
        "",

      tags:
        Array.isArray(
          activity.tags
        )
          ? activity.tags.join(", ")
          : activity.tags || "",

      internalNotes:
        activity.internalNotes ||
        "",

      durationMinutes:
        activity.durationMinutes ||
        "",
    });

    setMenuId(null);
    setShowForm(true);
  };

  /* ==========================================================
     CREATE / UPDATE
  ========================================================== */

  const buildPayload = () => {
    const payload = {
      type: form.type,
      subject: form.subject.trim(),
      description:
        form.description.trim() ||
        undefined,

      status:
        form.status,

      priority:
        form.priority,

      scheduledAt:
        toISOStringOrUndefined(
          form.scheduledAt
        ),

      dueAt:
        toISOStringOrUndefined(
          form.dueAt
        ),

      outcome:
        form.outcome ||
        undefined,

      outcomeNotes:
        form.outcomeNotes.trim() ||
        undefined,

      assignedTo:
        form.assignedTo.trim() ||
        undefined,

      lead:
        form.lead.trim() ||
        undefined,

      company:
        form.company.trim() ||
        undefined,

      contact:
        form.contact.trim() ||
        undefined,

      opportunity:
        form.opportunity.trim() ||
        undefined,

      location:
        form.location.trim() ||
        undefined,

      meetingLink:
        form.meetingLink.trim() ||
        undefined,

      phoneNumber:
        form.phoneNumber.trim() ||
        undefined,

      emailAddress:
        form.emailAddress.trim() ||
        undefined,

      reminderEnabled:
        Boolean(
          form.reminderEnabled
        ),

      reminderAt:
        toISOStringOrUndefined(
          form.reminderAt
        ),

      isRecurring:
        Boolean(
          form.isRecurring
        ),

      recurrence:
        form.recurrence.trim() ||
        undefined,

      tags:
        form.tags
          ? form.tags
              .split(",")
              .map((tag) =>
                tag.trim()
              )
              .filter(Boolean)
          : undefined,

      internalNotes:
        form.internalNotes.trim() ||
        undefined,

      durationMinutes:
        form.durationMinutes
          ? Number(
              form.durationMinutes
            )
          : undefined,
    };

    Object.keys(payload).forEach(
      (key) => {
        if (
          payload[key] ===
            undefined ||
          payload[key] === ""
        ) {
          delete payload[key];
        }
      }
    );

    return payload;
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!form.subject.trim()) {
      notifyError(
        "Activity subject is required."
      );
      return;
    }

    try {
      setActionLoading(
        editingActivity
          ? `edit-${editingActivity._id}`
          : "create"
      );

      const payload =
        buildPayload();

      if (editingActivity) {
        await api.put(
          `/activities/${editingActivity._id}`,
          payload
        );

        notifySuccess(
          "Activity updated successfully."
        );
      } else {
        await api.post(
          "/activities",
          payload
        );

        notifySuccess(
          "Activity created successfully."
        );
      }

      setShowForm(false);
      resetForm();

      await Promise.all([
        loadActivities(),
        loadStats(),
      ]);
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ==========================================================
     VIEW
  ========================================================== */

  const openDetails = async (
    activity
  ) => {
    try {
      setActionLoading(
        `view-${activity._id}`
      );

      const response =
        await api.get(
          `/activities/${activity._id}`
        );

      const payload =
        getResponseData(response);

      setSelectedActivity(
        payload?.activity ||
          payload ||
          activity
      );

      setShowDetails(true);
      setMenuId(null);
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ==========================================================
     START
  ========================================================== */

  const handleStart = async (
    activity
  ) => {
    try {
      setActionLoading(
        `start-${activity._id}`
      );

      await api.patch(
        `/activities/${activity._id}/start`,
        {}
      );

      notifySuccess(
        "Activity started."
      );

      await Promise.all([
        loadActivities(),
        loadStats(),
      ]);
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
      setMenuId(null);
    }
  };

  /* ==========================================================
     COMPLETE
  ========================================================== */

  const openComplete = (
    activity
  ) => {
    setSelectedActivity(
      activity
    );

    setCompleteForm({
      outcome:
        activity.outcome ||
        "CONNECTED",

      outcomeNotes:
        activity.outcomeNotes ||
        "",

      durationMinutes:
        activity.durationMinutes ||
        "",
    });

    setShowComplete(true);
    setMenuId(null);
  };

  const handleComplete = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedActivity) {
      return;
    }

    try {
      setActionLoading(
        `complete-${selectedActivity._id}`
      );

      const payload = {
        outcome:
          completeForm.outcome,

        outcomeNotes:
          completeForm.outcomeNotes.trim() ||
          undefined,

        durationMinutes:
          completeForm.durationMinutes
            ? Number(
                completeForm.durationMinutes
              )
            : undefined,
      };

      await api.patch(
        `/activities/${selectedActivity._id}/complete`,
        payload
      );

      notifySuccess(
        "Activity completed successfully."
      );

      setShowComplete(false);
      setSelectedActivity(null);

      await Promise.all([
        loadActivities(),
        loadStats(),
      ]);
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ==========================================================
     CANCEL
  ========================================================== */

  const handleCancel = async (
    activity
  ) => {
    try {
      setActionLoading(
        `cancel-${activity._id}`
      );

      await api.patch(
        `/activities/${activity._id}/cancel`,
        {}
      );

      notifySuccess(
        "Activity cancelled."
      );

      await Promise.all([
        loadActivities(),
        loadStats(),
      ]);
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
      setMenuId(null);
    }
  };

  /* ==========================================================
     ASSIGN
  ========================================================== */

  const openAssign = (
    activity
  ) => {
    setSelectedActivity(
      activity
    );

    setAssignUserId(
      activity.assignedTo?._id ||
        activity.assignedTo ||
        ""
    );

    setShowAssign(true);
    setMenuId(null);
  };

  const handleAssign = async (
    event
  ) => {
    event.preventDefault();

    if (
      !selectedActivity ||
      !assignUserId.trim()
    ) {
      notifyError(
        "User ID is required."
      );
      return;
    }

    try {
      setActionLoading(
        `assign-${selectedActivity._id}`
      );

      await api.patch(
        `/activities/${selectedActivity._id}/assign`,
        {
          assignedTo:
            assignUserId.trim(),
        }
      );

      notifySuccess(
        "Activity assigned successfully."
      );

      setShowAssign(false);
      setSelectedActivity(null);

      await loadActivities();
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ==========================================================
     DELETE
  ========================================================== */

  const openDelete = (
    activity
  ) => {
    setSelectedActivity(
      activity
    );

    setShowDelete(true);
    setMenuId(null);
  };

  const handleDelete = async () => {
    if (!selectedActivity) {
      return;
    }

    try {
      setActionLoading(
        `delete-${selectedActivity._id}`
      );

      await api.delete(
        `/activities/${selectedActivity._id}`
      );

      notifySuccess(
        "Activity moved to trash."
      );

      setShowDelete(false);
      setSelectedActivity(null);

      if (
        activities.length === 1 &&
        page > 1
      ) {
        setPage(
          (current) =>
            current - 1
        );
      } else {
        await loadActivities();
      }

      await loadStats();
    } catch (requestError) {
      notifyError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ==========================================================
     RESET FILTERS
  ========================================================== */

  const clearFilters = () => {
    setSearch("");

    setFilters({
      type: "",
      status: "",
      priority: "",
      outcome: "",
      assignedTo: "",
      lead: "",
      company: "",
      contact: "",
      opportunity: "",
      from: "",
      to: "",
      reminderEnabled: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    setPage(1);
  };

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const goToPage = (
    nextPage
  ) => {
    const safePage = Math.max(
      1,
      Math.min(
        totalPages,
        nextPage
      )
    );

    setPage(safePage);
  };

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const visibleStats =
    useMemo(
      () => [
        {
          label: "Total",
          value: stats.total,
          icon: ListTodo,
          className:
            "from-slate-900 to-slate-700",
        },

        {
          label: "Pending",
          value: stats.pending,
          icon: Clock3,
          className:
            "from-amber-500 to-orange-500",
        },

        {
          label: "In Progress",
          value: stats.inProgress,
          icon: Zap,
          className:
            "from-blue-600 to-indigo-600",
        },

        {
          label: "Completed",
          value: stats.completed,
          icon: CheckCircle2,
          className:
            "from-emerald-500 to-teal-600",
        },

        {
          label: "Overdue",
          value: stats.overdue,
          icon: AlertCircle,
          className:
            "from-rose-500 to-red-600",
        },
      ],
      [stats]
    );

  const activeFilterCount =
    useMemo(() => {
      let count = 0;

      Object.entries(filters).forEach(
        ([key, value]) => {
          if (
            key === "sortBy" ||
            key === "sortOrder"
          ) {
            return;
          }

          if (
            value !== "" &&
            value !== null &&
            value !== undefined
          ) {
            count += 1;
          }
        }
      );

      return count;
    }, [filters]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      className="min-h-screen bg-[#f6f8fc] text-slate-900"
      onClick={() =>
        setMenuId(null)
      }
    >
      {/* ======================================================
          TOP HEADER
      ====================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <Sparkles
                    size={18}
                  />
                </div>

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  CRM Workspace
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Activities
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage calls, meetings,
                emails and follow-ups
                from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              <button
                type="button"
                onClick={
                  openCreate
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Plus
                  size={17}
                />

                New Activity
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          ALERTS
      ====================================================== */}

      <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-3 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span className="flex-1">
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-3 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span className="flex-1">
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* ====================================================
            STAT CARDS
        ==================================================== */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visibleStats.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <div
                  key={item.label}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.label}
                      </p>

                      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {item.value}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.className} text-white shadow-sm`}
                    >
                      <Icon
                        size={18}
                      />
                    </div>
                  </div>

                  <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-slate-100/60 transition group-hover:scale-125" />
                </div>
              );
            }
          )}
        </div>

        {/* ====================================================
            TOOLBAR
        ==================================================== */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* Search */}

            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search activities..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>

            {/* Quick filters */}

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={
                  filters.type
                }
                onChange={(event) => {
                  setFilters(
                    (current) => ({
                      ...current,
                      type: event
                        .target
                        .value,
                    })
                  );
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="">
                  All types
                </option>

                {ACTIVITY_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {prettyText(
                        type
                      )}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  filters.status
                }
                onChange={(event) => {
                  setFilters(
                    (current) => ({
                      ...current,
                      status: event
                        .target
                        .value,
                    })
                  );
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="">
                  All statuses
                </option>

                {ACTIVITY_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {prettyText(
                        status
                      )}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (current) =>
                      !current
                  )
                }
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                  showFilters ||
                  activeFilterCount
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal
                  size={16}
                />

                Filters

                {activeFilterCount >
                  0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-slate-900">
                    {
                      activeFilterCount
                    }
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Advanced filters */}

          {showFilters && (
            <div className="mt-3 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <FilterSelect
                  label="Priority"
                  value={
                    filters.priority
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        priority:
                          value,
                      })
                    );
                    setPage(1);
                  }}
                  options={
                    ACTIVITY_PRIORITIES
                  }
                />

                <FilterSelect
                  label="Outcome"
                  value={
                    filters.outcome
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        outcome:
                          value,
                      })
                    );
                    setPage(1);
                  }}
                  options={
                    ACTIVITY_OUTCOMES
                  }
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    From
                  </label>

                  <input
                    type="date"
                    value={
                      filters.from
                    }
                    onChange={(event) => {
                      setFilters(
                        (current) => ({
                          ...current,
                          from: event
                            .target
                            .value,
                        })
                      );
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    To
                  </label>

                  <input
                    type="date"
                    value={
                      filters.to
                    }
                    onChange={(event) => {
                      setFilters(
                        (current) => ({
                          ...current,
                          to: event
                            .target
                            .value,
                        })
                      );
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <FilterInput
                  label="Assigned User ID"
                  value={
                    filters.assignedTo
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        assignedTo:
                          value,
                      })
                    );
                    setPage(1);
                  }}
                />

                <FilterInput
                  label="Lead ID"
                  value={
                    filters.lead
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        lead: value,
                      })
                    );
                    setPage(1);
                  }}
                />

                <FilterInput
                  label="Company ID"
                  value={
                    filters.company
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        company:
                          value,
                      })
                    );
                    setPage(1);
                  }}
                />

                <FilterInput
                  label="Contact ID"
                  value={
                    filters.contact
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        contact:
                          value,
                      })
                    );
                    setPage(1);
                  }}
                />

                <FilterInput
                  label="Opportunity ID"
                  value={
                    filters.opportunity
                  }
                  onChange={(value) => {
                    setFilters(
                      (current) => ({
                        ...current,
                        opportunity:
                          value,
                      })
                    );
                    setPage(1);
                  }}
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sort by
                  </label>

                  <select
                    value={
                      filters.sortBy
                    }
                    onChange={(event) => {
                      setFilters(
                        (current) => ({
                          ...current,
                          sortBy:
                            event
                              .target
                              .value,
                        })
                      );
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="createdAt">
                      Created date
                    </option>

                    <option value="scheduledAt">
                      Scheduled date
                    </option>

                    <option value="dueAt">
                      Due date
                    </option>

                    <option value="priority">
                      Priority
                    </option>

                    <option value="status">
                      Status
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Order
                  </label>

                  <select
                    value={
                      filters.sortOrder
                    }
                    onChange={(event) => {
                      setFilters(
                        (current) => ({
                          ...current,
                          sortOrder:
                            event
                              .target
                              .value,
                        })
                      );
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="desc">
                      Newest first
                    </option>

                    <option value="asc">
                      Oldest first
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw
                    size={15}
                  />

                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            ACTIVITY TABLE
        ==================================================== */}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Activity list
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {total} activities found
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-slate-500 sm:block">
                Rows
              </span>

              <select
                value={limit}
                onChange={(event) => {
                  setLimit(
                    Number(
                      event.target
                        .value
                    )
                  );
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>
            </div>
          </div>

          {loading ? (
            <ActivityTableSkeleton />
          ) : activities.length === 0 ? (
            <EmptyState
              search={search}
              onCreate={
                openCreate
              }
              onClear={
                clearFilters
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Activity
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Type
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Schedule
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Priority
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Assigned
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {activities.map(
                      (
                        activity
                      ) => {
                        const typeMeta =
                          TYPE_META[
                            activity.type
                          ] ||
                          TYPE_META.TASK;

                        const TypeIcon =
                          typeMeta.icon;

                        const overdue =
                          isOverdue(
                            activity
                          );

                        const statusMeta =
                          STATUS_META[
                            activity.status
                          ] ||
                          STATUS_META.PENDING;

                        const assignedName =
                          getActivityName(
                            activity.assignedTo
                          );

                        return (
                          <tr
                            key={
                              activity._id
                            }
                            className={`group transition hover:bg-slate-50/80 ${
                              overdue
                                ? "bg-red-50/20"
                                : ""
                            }`}
                          >
                            {/* Activity */}

                            <td className="px-5 py-4">
                              <div className="flex min-w-[330px] items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                  <TypeIcon
                                    size={17}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openDetails(
                                        activity
                                      )
                                    }
                                    className="block max-w-[350px] truncate text-left text-sm font-bold text-slate-900 hover:text-blue-600"
                                  >
                                    {activity.subject ||
                                      "Untitled activity"}
                                  </button>

                                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                    {activity.lead && (
                                      <>
                                        <span>
                                          Lead:
                                        </span>

                                        <span className="max-w-[120px] truncate font-medium text-slate-700">
                                          {getActivityName(
                                            activity.lead
                                          )}
                                        </span>
                                      </>
                                    )}

                                    {activity.company && (
                                      <>
                                        <span>
                                          •
                                        </span>

                                        <span className="max-w-[120px] truncate font-medium text-slate-700">
                                          {getActivityName(
                                            activity.company
                                          )}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {overdue && (
                                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                                      <AlertCircle
                                        size={11}
                                      />

                                      Overdue
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Type */}

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${typeMeta.className}`}
                              >
                                <TypeIcon
                                  size={12}
                                />

                                {
                                  typeMeta.label
                                }
                              </span>
                            </td>

                            {/* Schedule */}

                            <td className="px-4 py-4">
                              <div className="flex items-start gap-2">
                                <Clock3
                                  size={14}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />

                                <div>
                                  <p className="text-xs font-semibold text-slate-700">
                                    {formatDateTime(
                                      activity.scheduledAt
                                    )}
                                  </p>

                                  {activity.dueAt && (
                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Due{" "}
                                      {formatDateTime(
                                        activity.dueAt
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Priority */}

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_META[
                                  activity.priority
                                ] ||
                                  PRIORITY_META.MEDIUM}`}
                              >
                                {prettyText(
                                  activity.priority ||
                                    "MEDIUM"
                                )}
                              </span>
                            </td>

                            {/* Status */}

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                              >
                                {prettyText(
                                  activity.status ||
                                    "PENDING"
                                )}
                              </span>
                            </td>

                            {/* Assigned */}

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                  {getInitials(
                                    assignedName
                                  )}
                                </div>

                                <span className="max-w-[120px] truncate text-xs font-semibold text-slate-700">
                                  {
                                    assignedName
                                  }
                                </span>
                              </div>
                            </td>

                            {/* Actions */}

                            <td className="px-5 py-4 text-right">
                              <div
                                className="relative flex justify-end"
                                onClick={(
                                  event
                                ) =>
                                  event.stopPropagation()
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMenuId(
                                      menuId ===
                                        activity._id
                                        ? null
                                        : activity._id
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
                                >
                                  <MoreHorizontal
                                    size={18}
                                  />
                                </button>

                                {menuId ===
                                  activity._id && (
                                  <ActivityMenu
                                    activity={
                                      activity
                                    }
                                    onView={() =>
                                      openDetails(
                                        activity
                                      )
                                    }
                                    onEdit={() =>
                                      openEdit(
                                        activity
                                      )
                                    }
                                    onStart={() =>
                                      handleStart(
                                        activity
                                      )
                                    }
                                    onComplete={() =>
                                      openComplete(
                                        activity
                                      )
                                    }
                                    onCancel={() =>
                                      handleCancel(
                                        activity
                                      )
                                    }
                                    onAssign={() =>
                                      openAssign(
                                        activity
                                      )
                                    }
                                    onDelete={() =>
                                      openDelete(
                                        activity
                                      )
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Page{" "}
                  <span className="font-bold text-slate-800">
                    {page}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-800">
                    {totalPages}
                  </span>
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      goToPage(
                        page - 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  {Array.from(
                    {
                      length: Math.min(
                        totalPages,
                        5
                      ),
                    },
                    (_, index) => {
                      let pageNumber =
                        index + 1;

                      if (
                        totalPages >
                        5
                      ) {
                        if (
                          page >
                            3
                        ) {
                          pageNumber =
                            page -
                            2 +
                            index;
                        }

                        if (
                          page >=
                            totalPages -
                              2
                        ) {
                          pageNumber =
                            totalPages -
                            4 +
                            index;
                        }
                      }

                      return (
                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          onClick={() =>
                            goToPage(
                              pageNumber
                            )
                          }
                          className={`h-9 min-w-9 rounded-lg px-2 text-xs font-bold transition ${
                            page ===
                            pageNumber
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {
                            pageNumber
                          }
                        </button>
                      );
                    }
                  )}

                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      goToPage(
                        page + 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {showForm && (
        <Modal
          title={
            editingActivity
              ? "Edit Activity"
              : "Create Activity"
          }
          subtitle={
            editingActivity
              ? "Update the activity details and save your changes."
              : "Create a new CRM activity and keep your workflow moving."
          }
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
          width="max-w-5xl"
        >
          <form
            onSubmit={
              handleSubmit
            }
          >
            <div className="max-h-[70vh] overflow-y-auto px-1 pr-2">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  label="Activity type"
                  required
                >
                  <select
                    value={
                      form.type
                    }
                    onChange={(event) =>
                      updateForm(
                        "type",
                        event
                          .target
                          .value
                      )
                    }
                    className="input"
                  >
                    {ACTIVITY_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={
                            type
                          }
                        >
                          {prettyText(
                            type
                          )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField
                  label="Priority"
                >
                  <select
                    value={
                      form.priority
                    }
                    onChange={(event) =>
                      updateForm(
                        "priority",
                        event
                          .target
                          .value
                      )
                    }
                    className="input"
                  >
                    {ACTIVITY_PRIORITIES.map(
                      (priority) => (
                        <option
                          key={
                            priority
                          }
                          value={
                            priority
                          }
                        >
                          {prettyText(
                            priority
                          )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField
                  label="Subject"
                  required
                  className="md:col-span-2"
                >
                  <input
                    value={
                      form.subject
                    }
                    onChange={(event) =>
                      updateForm(
                        "subject",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. Customer follow-up call"
                    className="input"
                    required
                  />
                </FormField>

                <FormField
                  label="Description"
                  className="md:col-span-2"
                >
                  <textarea
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Describe the activity..."
                    rows={4}
                    className="input resize-none py-3"
                  />
                </FormField>

                <FormField label="Scheduled at">
                  <input
                    type="datetime-local"
                    value={
                      form.scheduledAt
                    }
                    onChange={(event) =>
                      updateForm(
                        "scheduledAt",
                        event
                          .target
                          .value
                      )
                    }
                    className="input"
                  />
                </FormField>

                <FormField label="Due at">
                  <input
                    type="datetime-local"
                    value={
                      form.dueAt
                    }
                    onChange={(event) =>
                      updateForm(
                        "dueAt",
                        event
                          .target
                          .value
                      )
                    }
                    className="input"
                  />
                </FormField>

                <FormField label="Status">
                  <select
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event
                          .target
                          .value
                      )
                    }
                    className="input"
                  >
                    {ACTIVITY_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={
                            status
                          }
                        >
                          {prettyText(
                            status
                          )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField label="Duration (minutes)">
                  <input
                    type="number"
                    min="0"
                    value={
                      form.durationMinutes
                    }
                    onChange={(event) =>
                      updateForm(
                        "durationMinutes",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="30"
                    className="input"
                  />
                </FormField>

                <div className="md:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      CRM relationships
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                </div>

                <FormField label="Assigned User ID">
                  <input
                    value={
                      form.assignedTo
                    }
                    onChange={(event) =>
                      updateForm(
                        "assignedTo",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="User ObjectId"
                    className="input"
                  />
                </FormField>

                <FormField label="Lead ID">
                  <input
                    value={
                      form.lead
                    }
                    onChange={(event) =>
                      updateForm(
                        "lead",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Lead ObjectId"
                    className="input"
                  />
                </FormField>

                <FormField label="Company ID">
                  <input
                    value={
                      form.company
                    }
                    onChange={(event) =>
                      updateForm(
                        "company",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Company ObjectId"
                    className="input"
                  />
                </FormField>

                <FormField label="Contact ID">
                  <input
                    value={
                      form.contact
                    }
                    onChange={(event) =>
                      updateForm(
                        "contact",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Contact ObjectId"
                    className="input"
                  />
                </FormField>

                <FormField label="Opportunity ID">
                  <input
                    value={
                      form.opportunity
                    }
                    onChange={(event) =>
                      updateForm(
                        "opportunity",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Opportunity ObjectId"
                    className="input"
                  />
                </FormField>

                <div className="md:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Contact details
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                </div>

                <FormField label="Phone number">
                  <input
                    value={
                      form.phoneNumber
                    }
                    onChange={(event) =>
                      updateForm(
                        "phoneNumber",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="+91..."
                    className="input"
                  />
                </FormField>

                <FormField label="Email address">
                  <input
                    type="email"
                    value={
                      form.emailAddress
                    }
                    onChange={(event) =>
                      updateForm(
                        "emailAddress",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="customer@example.com"
                    className="input"
                  />
                </FormField>

                <FormField label="Location">
                  <input
                    value={
                      form.location
                    }
                    onChange={(event) =>
                      updateForm(
                        "location",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Meeting location"
                    className="input"
                  />
                </FormField>

                <FormField label="Meeting link">
                  <input
                    type="url"
                    value={
                      form.meetingLink
                    }
                    onChange={(event) =>
                      updateForm(
                        "meetingLink",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="https://..."
                    className="input"
                  />
                </FormField>

                <div className="md:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Reminder & notes
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={
                      form.reminderEnabled
                    }
                    onChange={(event) =>
                      updateForm(
                        "reminderEnabled",
                        event
                          .target
                          .checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Enable reminder
                    </span>

                    <span className="block text-xs text-slate-500">
                      Send a reminder for this activity.
                    </span>
                  </span>
                </label>

                <FormField label="Reminder at">
                  <input
                    type="datetime-local"
                    value={
                      form.reminderAt
                    }
                    onChange={(event) =>
                      updateForm(
                        "reminderAt",
                        event
                          .target
                          .value
                      )
                    }
                    className="input"
                  />
                </FormField>

                <FormField label="Tags">
                  <input
                    value={
                      form.tags
                    }
                    onChange={(event) =>
                      updateForm(
                        "tags",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="vip, follow-up, sales"
                    className="input"
                  />
                </FormField>

                <FormField label="Internal notes">
                  <textarea
                    value={
                      form.internalNotes
                    }
                    onChange={(event) =>
                      updateForm(
                        "internalNotes",
                        event
                          .target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Internal CRM notes..."
                    className="input resize-none py-3"
                  />
                </FormField>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(
                    false
                  );
                  resetForm();
                }}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  actionLoading !==
                  null
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading !==
                  null && (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                )}

                {editingActivity
                  ? "Save changes"
                  : "Create activity"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {showDetails &&
        selectedActivity && (
          <Modal
            title="Activity details"
            subtitle="Complete activity information"
            onClose={() => {
              setShowDetails(
                false
              );
              setSelectedActivity(
                null
              );
            }}
            width="max-w-3xl"
          >
            <ActivityDetails
              activity={
                selectedActivity
              }
              onEdit={() => {
                setShowDetails(
                  false
                );
                openEdit(
                  selectedActivity
                );
              }}
              onComplete={() => {
                setShowDetails(
                  false
                );
                openComplete(
                  selectedActivity
                );
              }}
            />
          </Modal>
        )}

      {/* ======================================================
          COMPLETE MODAL
      ====================================================== */}

      {showComplete &&
        selectedActivity && (
          <Modal
            title="Complete activity"
            subtitle="Record the outcome of this activity."
            onClose={() => {
              setShowComplete(
                false
              );
              setSelectedActivity(
                null
              );
            }}
            width="max-w-lg"
          >
            <form
              onSubmit={
                handleComplete
              }
            >
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Activity
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {
                      selectedActivity.subject
                    }
                  </p>
                </div>

                <FormField
                  label="Outcome"
                  required
                >
                  <select
                    value={
                      completeForm.outcome
                    }
                    onChange={(event) =>
                      setCompleteForm(
                        (current) => ({
                          ...current,
                          outcome:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="input"
                    required
                  >
                    {ACTIVITY_OUTCOMES.map(
                      (outcome) => (
                        <option
                          key={
                            outcome
                          }
                          value={
                            outcome
                          }
                        >
                          {prettyText(
                            outcome
                          )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField label="Outcome notes">
                  <textarea
                    value={
                      completeForm.outcomeNotes
                    }
                    onChange={(event) =>
                      setCompleteForm(
                        (current) => ({
                          ...current,
                          outcomeNotes:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    rows={4}
                    placeholder="What happened during the activity?"
                    className="input resize-none py-3"
                  />
                </FormField>

                <FormField label="Duration (minutes)">
                  <input
                    type="number"
                    min="0"
                    value={
                      completeForm.durationMinutes
                    }
                    onChange={(event) =>
                      setCompleteForm(
                        (current) => ({
                          ...current,
                          durationMinutes:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="30"
                    className="input"
                  />
                </FormField>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowComplete(
                      false
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={
                    actionLoading !==
                    null
                  }
                >
                  <CheckCircle2
                    size={16}
                  />

                  Complete activity
                </button>
              </div>
            </form>
          </Modal>
        )}

      {/* ======================================================
          ASSIGN MODAL
      ====================================================== */}

      {showAssign &&
        selectedActivity && (
          <Modal
            title="Assign activity"
            subtitle="Assign this activity to another CRM user."
            onClose={() => {
              setShowAssign(
                false
              );
              setSelectedActivity(
                null
              );
            }}
            width="max-w-lg"
          >
            <form
              onSubmit={
                handleAssign
              }
            >
              <FormField
                label="User ID"
                required
              >
                <input
                  value={
                    assignUserId
                  }
                  onChange={(event) =>
                    setAssignUserId(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter user ObjectId"
                  className="input"
                  required
                />
              </FormField>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowAssign(
                      false
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  <Users
                    size={16}
                  />

                  Assign
                </button>
              </div>
            </form>
          </Modal>
        )}

      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      {showDelete &&
        selectedActivity && (
          <Modal
            title="Delete activity?"
            subtitle="This activity will be soft-deleted and can be restored later."
            onClose={() => {
              setShowDelete(
                false
              );
              setSelectedActivity(
                null
              );
            }}
            width="max-w-md"
          >
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-sm font-bold text-red-900">
                    {
                      selectedActivity.subject
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Are you sure you want to
                    delete this activity?
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    false
                  )
                }
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
              >
                Keep activity
              </button>

              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  actionLoading !==
                  null
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2
                  size={15}
                />

                Delete
              </button>
            </div>
          </Modal>
        )}
    </div>
  );
}

/* ============================================================
   FILTER COMPONENTS
   ============================================================ */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      >
        <option value="">
          All
        </option>

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {prettyText(
                option
              )}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder="ObjectId"
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </div>
  );
}

/* ============================================================
   FORM FIELD
   ============================================================ */

function FormField({
  label,
  required = false,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

/* ============================================================
   MODAL
   ============================================================ */

function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-xl",
}) {
  useEffect(() => {
    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          onClose();
        }
      };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${width} overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ACTIVITY MENU
   ============================================================ */

function ActivityMenu({
  activity,
  onView,
  onEdit,
  onStart,
  onComplete,
  onCancel,
  onAssign,
  onDelete,
}) {
  return (
    <div
      className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-xl shadow-slate-900/10"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <MenuItem
        icon={Eye}
        label="View details"
        onClick={onView}
      />

      <MenuItem
        icon={Edit3}
        label="Edit activity"
        onClick={onEdit}
      />

      {activity.status !==
        "COMPLETED" &&
        activity.status !==
          "CANCELLED" && (
          <>
            {activity.status !==
              "IN_PROGRESS" && (
              <MenuItem
                icon={Zap}
                label="Start activity"
                onClick={
                  onStart
                }
              />
            )}

            <MenuItem
              icon={CheckCircle2}
              label="Complete"
              onClick={
                onComplete
              }
            />

            <MenuItem
              icon={XCircle}
              label="Cancel"
              onClick={
                onCancel
              }
            />
          </>
        )}

      <MenuItem
        icon={UserRound}
        label="Assign"
        onClick={onAssign}
      />

      <div className="my-1 border-t border-slate-100" />

      <MenuItem
        icon={Trash2}
        label="Delete"
        danger
        onClick={onDelete}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon
        size={15}
      />

      {label}
    </button>
  );
}

/* ============================================================
   DETAILS
   ============================================================ */

function ActivityDetails({
  activity,
  onEdit,
  onComplete,
}) {
  const typeMeta =
    TYPE_META[
      activity.type
    ] ||
    TYPE_META.TASK;

  const TypeIcon =
    typeMeta.icon;

  return (
    <div>
      <div className="rounded-2xl bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <TypeIcon
                size={20}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {prettyText(
                  activity.type
                )}
              </p>

              <h3 className="mt-1 text-xl font-bold">
                {activity.subject ||
                  "Untitled activity"}
              </h3>
            </div>
          </div>

          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
            {prettyText(
              activity.status
            )}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailCard
          label="Scheduled"
          value={formatDateTime(
            activity.scheduledAt
          )}
          icon={Calendar}
        />

        <DetailCard
          label="Due"
          value={formatDateTime(
            activity.dueAt
          )}
          icon={Clock3}
        />

        <DetailCard
          label="Priority"
          value={prettyText(
            activity.priority
          )}
          icon={Target}
        />

        <DetailCard
          label="Assigned to"
          value={getActivityName(
            activity.assignedTo
          )}
          icon={UserRound}
        />

        <DetailCard
          label="Lead"
          value={getActivityName(
            activity.lead
          )}
          icon={Users}
        />

        <DetailCard
          label="Company"
          value={getActivityName(
            activity.company
          )}
          icon={Users}
        />

        <DetailCard
          label="Contact"
          value={getActivityName(
            activity.contact
          )}
          icon={UserRound}
        />

        <DetailCard
          label="Opportunity"
          value={getActivityName(
            activity.opportunity
          )}
          icon={Target}
        />
      </div>

      {activity.description && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Description
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {
              activity.description
            }
          </div>
        </div>
      )}

      {activity.outcome && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Outcome
          </p>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              {prettyText(
                activity.outcome
              )}
            </p>

            {activity.outcomeNotes && (
              <p className="mt-1 text-sm leading-6 text-emerald-700">
                {
                  activity.outcomeNotes
                }
              </p>
            )}
          </div>
        </div>
      )}

      {activity.location && (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <MapPin
            size={16}
          />

          {
            activity.location
          }
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={
            onEdit
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Edit3
            size={15}
          />

          Edit
        </button>

        {activity.status !==
          "COMPLETED" &&
          activity.status !==
            "CANCELLED" && (
            <button
              type="button"
              onClick={
                onComplete
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Check
                size={15}
              />

              Complete
            </button>
          )}
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon
          size={14}
        />

        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  search,
  onCreate,
  onClear,
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <ListTodo
          size={27}
        />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        No activities found
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {search
          ? "Try changing your search or filters."
          : "Create your first activity to start managing customer follow-ups."}
      </p>

      <div className="mt-5 flex gap-2">
        {search && (
          <button
            type="button"
            onClick={
              onClear
            }
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}

        <button
          type="button"
          onClick={
            onCreate
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Plus
            size={15}
          />

          Create activity
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */

function ActivityTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-0">
        {Array.from(
          { length: 7 },
          (_, index) => (
            <div
              key={index}
              className="flex items-center gap-5 border-b border-slate-100 px-5 py-5"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-100" />

              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 rounded bg-slate-100" />
                <div className="h-2.5 w-32 rounded bg-slate-100" />
              </div>

              <div className="h-6 w-20 rounded-full bg-slate-100" />

              <div className="h-6 w-24 rounded-full bg-slate-100" />

              <div className="h-6 w-20 rounded-full bg-slate-100" />

              <div className="h-8 w-8 rounded-full bg-slate-100" />
            </div>
          )
        )}
      </div>
    </div>
  );
}