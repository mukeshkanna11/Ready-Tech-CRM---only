import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  Edit3,
  Eye,
  Filter,
  Flame,
  Layers3,
  Loader2,
  Mail,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Users,
  X,
  XCircle,
  BriefcaseBusiness,
  CircleDollarSign,
  BarChart3,
} from "lucide-react";

import API from "../services/api";

/* =========================================================
   CONSTANTS
========================================================= */

const STAGES = [
  "QUALIFICATION",
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUSES = ["OPEN", "WON", "LOST"];

const SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "EMAIL",
  "PHONE",
  "SOCIAL_MEDIA",
  "CAMPAIGN",
  "ADVERTISEMENT",
  "PARTNER",
  "EXISTING_CUSTOMER",
  "LEAD",
  "OTHER",
];

const EMPTY_FORM = {
  name: "",
  description: "",
  company: "",
  contact: "",
  lead: "",
  owner: "",
  value: "",
  currency: "INR",
  stage: "QUALIFICATION",
  probability: 10,
  expectedCloseDate: "",
  priority: "MEDIUM",
  sourceType: "OTHER",
  source: "",
  nextFollowUpDate: "",
  tags: "",
  notes: "",
  products: [],
};

const EMPTY_PRODUCT = {
  product: "",
  quantity: 1,
  price: 0,
  discount: 0,
  tax: 0,
};

/* =========================================================
   HELPERS
========================================================= */

const money = (value, currency = "INR") => {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
};

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const titleCase = (value = "") =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
};

const getName = (value, fallback = "—") => {
  if (!value) return fallback;

  if (typeof value === "string") return value;

  return (
    value.name ||
    value.companyName ||
    value.firstName ||
    value.email ||
    fallback
  );
};

const getContactName = (contact) => {
  if (!contact) return "—";

  if (typeof contact === "string") return contact;

  return (
    `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
    contact.name ||
    contact.email ||
    "—"
  );
};

const getUserName = (user) => {
  if (!user) return "—";

  if (typeof user === "string") return user;

  return (
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.name ||
    user.email ||
    "—"
  );
};

const getProductName = (product) => {
  if (!product) return "—";

  if (typeof product === "string") return product;

  return (
    product.name ||
    product.productName ||
    product.title ||
    product.sku ||
    "Product"
  );
};

const calculateProductTotal = (item) => {
  const quantity = Number(item.quantity || 0);
  const price = Number(item.price || 0);
  const discount = Number(item.discount || 0);
  const tax = Number(item.tax || 0);

  const gross = quantity * price;
  const discountAmount = gross * (discount / 100);
  const taxable = gross - discountAmount;
  const taxAmount = taxable * (tax / 100);

  return Number((taxable + taxAmount).toFixed(2));
};

/* =========================================================
   STYLE HELPERS
========================================================= */

const stageClass = (stage) => {
  const map = {
    QUALIFICATION: "bg-slate-100 text-slate-700 border-slate-200",
    DISCOVERY: "bg-blue-50 text-blue-700 border-blue-200",
    PROPOSAL: "bg-violet-50 text-violet-700 border-violet-200",
    NEGOTIATION: "bg-amber-50 text-amber-700 border-amber-200",
    CLOSED_WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CLOSED_LOST: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return map[stage] || "bg-slate-100 text-slate-700 border-slate-200";
};

const priorityClass = (priority) => {
  const map = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-blue-50 text-blue-600",
    HIGH: "bg-orange-50 text-orange-600",
    URGENT: "bg-red-50 text-red-600",
  };

  return map[priority] || "bg-slate-100 text-slate-600";
};

const statusClass = (status) => {
  if (status === "WON") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "LOST") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-blue-50 text-blue-700 border-blue-200";
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Opportunities() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [opportunities, setOpportunities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState([]);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [editingOpportunity, setEditingOpportunity] = useState(null);

  const [closeResult, setCloseResult] = useState("WON");
  const [closeReason, setCloseReason] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT);

  /* -------------------------------------------------------
     FILTERS
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [owner, setOwner] = useState("");
  const [company, setCompany] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  /* =======================================================
     LOAD MASTER DATA
  ======================================================= */

  const loadMasterData = useCallback(async () => {
    try {
      const requests = [
        API.get("/companies", {
          params: { page: 1, limit: 200 },
        }),
        API.get("/contacts", {
          params: { page: 1, limit: 200 },
        }),
        API.get("/leads", {
          params: { page: 1, limit: 200 },
        }),
        API.get("/users", {
          params: { page: 1, limit: 200 },
        }),
        API.get("/products", {
          params: { page: 1, limit: 200 },
        }),
      ];

      const results = await Promise.allSettled(requests);

      const extract = (result) => {
        if (result.status !== "fulfilled") return [];

        const data = result.value?.data;

        if (Array.isArray(data)) return data;

        if (Array.isArray(data?.data)) return data.data;

        if (Array.isArray(data?.companies)) return data.companies;

        if (Array.isArray(data?.contacts)) return data.contacts;

        if (Array.isArray(data?.leads)) return data.leads;

        if (Array.isArray(data?.users)) return data.users;

        if (Array.isArray(data?.products)) return data.products;

        return [];
      };

      setCompanies(extract(results[0]));
      setContacts(extract(results[1]));
      setLeads(extract(results[2]));
      setUsers(extract(results[3]));
      setProducts(extract(results[4]));
    } catch (err) {
      console.warn("Opportunity master data error:", err);
    }
  }, []);

  /* =======================================================
     LOAD OPPORTUNITIES
  ======================================================= */

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (stage) params.stage = stage;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (sourceType) params.sourceType = sourceType;
      if (owner) params.owner = owner;
      if (company) params.company = company;

      const response = await API.get("/opportunities", { params });

      const payload = response?.data || {};

      const rows =
        Array.isArray(payload)
          ? payload
          : payload.data ||
            payload.opportunities ||
            payload.results ||
            [];

      setOpportunities(rows);

      if (payload.pagination) {
        setPagination(payload.pagination);
      } else {
        setPagination({
          page,
          limit,
          total: payload.total || rows.length,
          totalPages:
            payload.totalPages ||
            Math.max(1, Math.ceil((payload.total || rows.length) / limit)),
        });
      }
    } catch (err) {
      console.error("Opportunity fetch error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load opportunities."
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    stage,
    status,
    priority,
    sourceType,
    owner,
    company,
  ]);

  /* =======================================================
     LOAD STATS
  ======================================================= */

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const [statsResponse, pipelineResponse] = await Promise.all([
        API.get("/opportunities/stats"),
        API.get("/opportunities/pipeline"),
      ]);

      const statsPayload = statsResponse?.data || {};

      setStats(
        statsPayload.data ||
          statsPayload.stats ||
          statsPayload
      );

      const pipelinePayload = pipelineResponse?.data || {};

      setPipeline(
        Array.isArray(pipelinePayload)
          ? pipelinePayload
          : pipelinePayload.data ||
              pipelinePayload.pipeline ||
              pipelinePayload.stages ||
              []
      );
    } catch (err) {
      console.warn("Opportunity stats error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshAll = async () => {
    await Promise.all([
      loadOpportunities(),
      loadStats(),
      loadMasterData(),
    ]);
  };

  /* =======================================================
     FORM
  ======================================================= */

  const openCreate = () => {
    setEditingOpportunity(null);
    setForm(EMPTY_FORM);
    setProductDraft(EMPTY_PRODUCT);
    setShowForm(true);
    setError("");
  };

  const openEdit = (opportunity) => {
    setEditingOpportunity(opportunity);

    setForm({
      name: opportunity.name || "",
      description: opportunity.description || "",
      company: getId(opportunity.company),
      contact: getId(opportunity.contact),
      lead: getId(opportunity.lead),
      owner: getId(opportunity.owner),
      value: opportunity.value ?? "",
      currency: opportunity.currency || "INR",
      stage: opportunity.stage || "QUALIFICATION",
      probability: opportunity.probability ?? 10,
      expectedCloseDate:
        formatDateInput(opportunity.expectedCloseDate),
      priority: opportunity.priority || "MEDIUM",
      sourceType: opportunity.sourceType || "OTHER",
      source: opportunity.source || "",
      nextFollowUpDate:
        formatDateInput(opportunity.nextFollowUpDate),
      tags: Array.isArray(opportunity.tags)
        ? opportunity.tags.join(", ")
        : "",
      notes: opportunity.notes || "",
      products: Array.isArray(opportunity.products)
        ? opportunity.products.map((item) => ({
            product: getId(item.product),
            quantity: item.quantity ?? 1,
            price: item.price ?? 0,
            discount: item.discount ?? 0,
            tax: item.tax ?? 0,
          }))
        : [],
    });

    setShowForm(true);
    setError("");
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =======================================================
     PRODUCTS
  ======================================================= */

  const addProduct = () => {
    if (!productDraft.product) {
      setError("Please select a product.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          ...productDraft,
          quantity: Number(productDraft.quantity || 1),
          price: Number(productDraft.price || 0),
          discount: Number(productDraft.discount || 0),
          tax: Number(productDraft.tax || 0),
        },
      ],
    }));

    setProductDraft(EMPTY_PRODUCT);
    setError("");
  };

  const removeProduct = (index) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  const productGrandTotal = useMemo(() => {
    return form.products.reduce(
      (sum, item) => sum + calculateProductTotal(item),
      0
    );
  }, [form.products]);

  /* =======================================================
     SAVE
  ======================================================= */

  const saveOpportunity = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Opportunity name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        company: form.company || undefined,
        contact: form.contact || undefined,
        lead: form.lead || undefined,
        owner: form.owner || undefined,
        value: Number(form.value || 0),
        currency: form.currency || "INR",
        stage: form.stage,
        probability: Number(form.probability || 0),
        expectedCloseDate:
          form.expectedCloseDate || undefined,
        priority: form.priority,
        sourceType: form.sourceType,
        source: form.source.trim() || undefined,
        nextFollowUpDate:
          form.nextFollowUpDate || undefined,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: form.notes.trim(),
        products: form.products.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          discount: Number(item.discount || 0),
          tax: Number(item.tax || 0),
        })),
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (editingOpportunity) {
        await API.put(
          `/opportunities/${editingOpportunity._id}`,
          payload
        );
      } else {
        await API.post("/opportunities", payload);
      }

      setShowForm(false);
      setEditingOpportunity(null);
      setForm(EMPTY_FORM);

      await refreshAll();
    } catch (err) {
      console.error("Save opportunity error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to save opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     STAGE UPDATE
  ======================================================= */

  const updateStage = async (opportunity, newStage) => {
    try {
      setSaving(true);

      await API.patch(
        `/opportunities/${opportunity._id}/stage`,
        {
          stage: newStage,
          probability:
            newStage === "CLOSED_WON"
              ? 100
              : newStage === "CLOSED_LOST"
              ? 0
              : opportunity.probability,
        }
      );

      await refreshAll();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update opportunity stage."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     CLOSE
  ======================================================= */

  const openClose = (opportunity, result) => {
    setSelectedOpportunity(opportunity);
    setCloseResult(result);
    setCloseReason("");
    setShowClose(true);
  };

  const closeOpportunity = async () => {
    if (!selectedOpportunity) return;

    if (!closeReason.trim()) {
      setError("Please enter a closing reason.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await API.post(
        `/opportunities/${selectedOpportunity._id}/close`,
        {
          result: closeResult,
          reason: closeReason.trim(),
          actualCloseDate: new Date().toISOString(),
        }
      );

      setShowClose(false);
      setSelectedOpportunity(null);

      await refreshAll();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to close opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const openDelete = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDelete(true);
  };

  const deleteOpportunity = async () => {
    if (!selectedOpportunity) return;

    try {
      setSaving(true);

      await API.delete(
        `/opportunities/${selectedOpportunity._id}`
      );

      setShowDelete(false);
      setSelectedOpportunity(null);

      await refreshAll();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DETAILS
  ======================================================= */

  const openDetails = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetails(true);
  };

  /* =======================================================
     STATS
  ======================================================= */

  const dashboardStats = useMemo(() => {
    const s = stats || {};

    return {
      total:
        s.total ??
        s.totalOpportunities ??
        pagination.total ??
        0,

      open:
        s.open ??
        s.openOpportunities ??
        0,

      won:
        s.won ??
        s.wonOpportunities ??
        0,

      lost:
        s.lost ??
        s.lostOpportunities ??
        0,

      pipelineValue:
        s.openPipelineValue ??
        s.pipelineValue ??
        s.totalPipelineValue ??
        0,

      weightedValue:
        s.weightedPipelineValue ??
        s.weightedValue ??
        0,

      wonRevenue:
        s.wonRevenue ??
        s.totalWonRevenue ??
        0,

      winRate:
        s.winRate ??
        0,
    };
  }, [stats, pagination.total]);

  /* =======================================================
     ACTIVE FILTER COUNT
  ======================================================= */

  const activeFilters = [
    stage,
    status,
    priority,
    sourceType,
    owner,
    company,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStage("");
    setStatus("");
    setPriority("");
    setSourceType("");
    setOwner("");
    setCompany("");
    setSearch("");
    setPage(1);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
                <BriefcaseBusiness className="h-4 w-4" />
                Sales CRM
                <span className="text-slate-300">/</span>
                Opportunities
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                  <Target className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Opportunities
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage your sales pipeline, deals, revenue and follow-ups.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={refreshAll}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>

              <button
                onClick={openCreate}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700"
              >
                <Plus className="h-4 w-4" />
                New Opportunity
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>

            <button
              onClick={() => setError("")}
              className="rounded-lg p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* =================================================
            KPI CARDS
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Opportunities"
            value={numberFormat(dashboardStats.total)}
            subtitle="All active and closed deals"
            icon={Layers3}
            iconClass="bg-indigo-50 text-indigo-600"
          />

          <StatCard
            title="Open Pipeline"
            value={money(dashboardStats.pipelineValue)}
            subtitle={`${numberFormat(
              dashboardStats.open
            )} open opportunities`}
            icon={TrendingUp}
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            title="Won Revenue"
            value={money(dashboardStats.wonRevenue)}
            subtitle={`${numberFormat(
              dashboardStats.won
            )} won opportunities`}
            icon={Trophy}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Win Rate"
            value={`${Number(dashboardStats.winRate || 0).toFixed(
              1
            )}%`}
            subtitle={`${money(
              dashboardStats.weightedValue
            )} weighted pipeline`}
            icon={BarChart3}
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>

        {/* =================================================
            PIPELINE
        ================================================= */}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Sales Pipeline
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Track opportunities across every stage.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <CircleDollarSign className="h-4 w-4 text-indigo-500" />
                Weighted:{" "}
                <span className="font-bold text-slate-900">
                  {money(dashboardStats.weightedValue)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
            {STAGES.map((item) => {
              const pipelineItem = pipeline.find(
                (entry) =>
                  entry.stage === item ||
                  entry._id === item ||
                  entry.name === item
              );

              const count =
                pipelineItem?.count ??
                pipelineItem?.total ??
                pipelineItem?.opportunities ??
                0;

              const value =
                pipelineItem?.value ??
                pipelineItem?.totalValue ??
                0;

              return (
                <div
                  key={item}
                  className="group p-4 transition hover:bg-slate-50"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${stageClass(
                        item
                      )}`}
                    >
                      {titleCase(item)}
                    </span>

                    <span className="text-xs font-bold text-slate-400">
                      {count}
                    </span>
                  </div>

                  <p className="truncate text-lg font-bold text-slate-900">
                    {money(value)}
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(8, count * 12)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search opportunities, descriptions or notes..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                showFilters || activeFilters
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilters > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] text-white">
                  {activeFilters}
                </span>
              )}
            </button>

            <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3">
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] =
                    e.target.value.split(":");

                  setSortBy(field);
                  setSortOrder(order);
                  setPage(1);
                }}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none"
              >
                <option value="createdAt:desc">
                  Newest
                </option>
                <option value="createdAt:asc">
                  Oldest
                </option>
                <option value="value:desc">
                  Highest Value
                </option>
                <option value="value:asc">
                  Lowest Value
                </option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <FilterSelect
                label="Stage"
                value={stage}
                onChange={(value) => {
                  setStage(value);
                  setPage(1);
                }}
                options={STAGES}
              />

              <FilterSelect
                label="Status"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={STATUSES}
              />

              <FilterSelect
                label="Priority"
                value={priority}
                onChange={(value) => {
                  setPriority(value);
                  setPage(1);
                }}
                options={PRIORITIES}
              />

              <FilterSelect
                label="Source"
                value={sourceType}
                onChange={(value) => {
                  setSourceType(value);
                  setPage(1);
                }}
                options={SOURCES}
              />

              <FilterSelect
                label="Owner"
                value={owner}
                onChange={(value) => {
                  setOwner(value);
                  setPage(1);
                }}
                options={users.map((user) => ({
                  value: getId(user),
                  label: getUserName(user),
                }))}
              />

              <FilterSelect
                label="Company"
                value={company}
                onChange={(value) => {
                  setCompany(value);
                  setPage(1);
                }}
                options={companies.map((item) => ({
                  value: getId(item),
                  label: getName(item),
                }))}
              />

              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6">
                <button
                  onClick={clearFilters}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Opportunity List
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {pagination.total || 0} opportunities found
              </p>
            </div>

            {statsLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating analytics...
              </div>
            )}
          </div>

          {loading ? (
            <LoadingState />
          ) : opportunities.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1500px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <TableHead>Opportunity</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Expected Revenue</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {opportunities.map((opportunity) => (
                      <OpportunityRow
                        key={opportunity._id}
                        opportunity={opportunity}
                        onView={openDetails}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        onCloseWon={(item) =>
                          openClose(item, "WON")
                        }
                        onCloseLost={(item) =>
                          openClose(item, "LOST")
                        }
                        onStageChange={updateStage}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}

              <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>Rows per page</span>

                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>

                  <span>
                    Page {pagination.page || page} of{" "}
                    {pagination.totalPages || 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1)
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white">
                    {page}
                  </div>

                  <button
                    disabled={
                      page >= (pagination.totalPages || 1)
                    }
                    onClick={() =>
                      setPage((current) => current + 1)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ===================================================
          CREATE / EDIT MODAL
      =================================================== */}

      {showForm && (
        <Modal
          title={
            editingOpportunity
              ? "Edit Opportunity"
              : "Create New Opportunity"
          }
          subtitle="Complete all relevant sales and pipeline information."
          onClose={() => setShowForm(false)}
          wide
        >
          <form onSubmit={saveOpportunity}>
            <div className="space-y-7">
              {/* Basic */}

              <FormSection
                title="Basic Information"
                icon={BriefcaseBusiness}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField
                    label="Opportunity Name"
                    required
                    value={form.name}
                    onChange={(value) =>
                      updateField("name", value)
                    }
                    placeholder="Enterprise CRM Implementation"
                    className="md:col-span-2"
                  />

                  <TextareaField
                    label="Description"
                    value={form.description}
                    onChange={(value) =>
                      updateField("description", value)
                    }
                    placeholder="Describe the opportunity..."
                    className="md:col-span-2"
                  />
                </div>
              </FormSection>

              {/* Relations */}

              <FormSection
                title="Relationships"
                icon={Users}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <SelectField
                    label="Company"
                    value={form.company}
                    onChange={(value) =>
                      updateField("company", value)
                    }
                    options={companies.map((item) => ({
                      value: getId(item),
                      label: getName(item),
                    }))}
                  />

                  <SelectField
                    label="Contact"
                    value={form.contact}
                    onChange={(value) =>
                      updateField("contact", value)
                    }
                    options={contacts.map((item) => ({
                      value: getId(item),
                      label: getContactName(item),
                    }))}
                  />

                  <SelectField
                    label="Lead"
                    value={form.lead}
                    onChange={(value) =>
                      updateField("lead", value)
                    }
                    options={leads.map((item) => ({
                      value: getId(item),
                      label:
                        getName(item, "") ||
                        getContactName(item),
                    }))}
                  />

                  <SelectField
                    label="Owner"
                    value={form.owner}
                    onChange={(value) =>
                      updateField("owner", value)
                    }
                    options={users.map((item) => ({
                      value: getId(item),
                      label: getUserName(item),
                    }))}
                  />
                </div>
              </FormSection>

              {/* Commercial */}

              <FormSection
                title="Commercial Details"
                icon={DollarSign}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <InputField
                    label="Opportunity Value"
                    type="number"
                    value={form.value}
                    onChange={(value) =>
                      updateField("value", value)
                    }
                    placeholder="250000"
                  />

                  <SelectField
                    label="Currency"
                    value={form.currency}
                    onChange={(value) =>
                      updateField("currency", value)
                    }
                    options={[
                      { value: "INR", label: "INR - Indian Rupee" },
                      { value: "USD", label: "USD - US Dollar" },
                      { value: "EUR", label: "EUR - Euro" },
                      { value: "GBP", label: "GBP - Pound" },
                    ]}
                  />

                  <InputField
                    label="Probability %"
                    type="number"
                    min="0"
                    max="100"
                    value={form.probability}
                    onChange={(value) =>
                      updateField("probability", value)
                    }
                    placeholder="60"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Expected Revenue
                    </label>

                    <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-emerald-600">
                      {money(
                        Number(form.value || 0) *
                          (Number(form.probability || 0) / 100),
                        form.currency
                      )}
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* Pipeline */}

              <FormSection
                title="Pipeline & Forecast"
                icon={TrendingUp}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <SelectField
                    label="Stage"
                    required
                    value={form.stage}
                    onChange={(value) =>
                      updateField("stage", value)
                    }
                    options={STAGES}
                  />

                  <SelectField
                    label="Priority"
                    value={form.priority}
                    onChange={(value) =>
                      updateField("priority", value)
                    }
                    options={PRIORITIES}
                  />

                  <InputField
                    label="Expected Close Date"
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(value) =>
                      updateField(
                        "expectedCloseDate",
                        value
                      )
                    }
                  />

                  <InputField
                    label="Next Follow-up"
                    type="date"
                    value={form.nextFollowUpDate}
                    onChange={(value) =>
                      updateField(
                        "nextFollowUpDate",
                        value
                      )
                    }
                  />
                </div>
              </FormSection>

              {/* Source */}

              <FormSection
                title="Lead Source"
                icon={Flame}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SelectField
                    label="Source Type"
                    value={form.sourceType}
                    onChange={(value) =>
                      updateField("sourceType", value)
                    }
                    options={SOURCES}
                  />

                  <InputField
                    label="Source"
                    value={form.source}
                    onChange={(value) =>
                      updateField("source", value)
                    }
                    placeholder="CRM Website / Referral / Campaign"
                  />
                </div>
              </FormSection>

              {/* Products */}

              <FormSection
                title="Products & Line Items"
                icon={Package}
              >
                <div className="rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 gap-3 bg-slate-50 p-4 md:grid-cols-6">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Product
                      </label>

                      <select
                        value={productDraft.product}
                        onChange={(e) =>
                          setProductDraft((prev) => ({
                            ...prev,
                            product: e.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        <option value="">
                          Select Product
                        </option>

                        {products.map((item) => (
                          <option
                            key={getId(item)}
                            value={getId(item)}
                          >
                            {getProductName(item)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <SmallInput
                      label="Qty"
                      type="number"
                      value={productDraft.quantity}
                      onChange={(value) =>
                        setProductDraft((prev) => ({
                          ...prev,
                          quantity: value,
                        }))
                      }
                    />

                    <SmallInput
                      label="Price"
                      type="number"
                      value={productDraft.price}
                      onChange={(value) =>
                        setProductDraft((prev) => ({
                          ...prev,
                          price: value,
                        }))
                      }
                    />

                    <SmallInput
                      label="Discount %"
                      type="number"
                      value={productDraft.discount}
                      onChange={(value) =>
                        setProductDraft((prev) => ({
                          ...prev,
                          discount: value,
                        }))
                      }
                    />

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addProduct}
                        className="h-10 w-full rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700"
                      >
                        Add Product
                      </button>
                    </div>
                  </div>

                  {form.products.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {form.products.map((item, index) => (
                        <div
                          key={`${item.product}-${index}`}
                          className="grid grid-cols-1 gap-3 p-4 md:grid-cols-7 md:items-center"
                        >
                          <div className="md:col-span-2">
                            <p className="font-semibold text-slate-900">
                              {getProductName(
                                products.find(
                                  (product) =>
                                    getId(product) ===
                                    item.product
                                ) || item.product
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Product ID: {item.product}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Quantity
                            </p>
                            <p className="font-semibold">
                              {item.quantity}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Price
                            </p>
                            <p className="font-semibold">
                              {money(
                                item.price,
                                form.currency
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Discount
                            </p>
                            <p className="font-semibold">
                              {item.discount}%
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Tax
                            </p>
                            <p className="font-semibold">
                              {item.tax}%
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-400">
                                Total
                              </p>
                              <p className="font-bold text-emerald-600">
                                {money(
                                  calculateProductTotal(item),
                                  form.currency
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeProduct(index)
                              }
                              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-end bg-slate-50 px-4 py-4">
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Products Total
                          </p>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {money(
                              productGrandTotal,
                              form.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      No products added yet.
                    </div>
                  )}
                </div>
              </FormSection>

              {/* Notes */}

              <FormSection
                title="Tags & Notes"
                icon={Activity}
              >
                <div className="grid grid-cols-1 gap-4">
                  <InputField
                    label="Tags"
                    value={form.tags}
                    onChange={(value) =>
                      updateField("tags", value)
                    }
                    placeholder="Enterprise, Hot Deal, Renewal"
                  />

                  <TextareaField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) =>
                      updateField("notes", value)
                    }
                    placeholder="Internal notes..."
                  />
                </div>
              </FormSection>
            </div>

            {/* Footer */}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {editingOpportunity
                  ? "Update Opportunity"
                  : "Create Opportunity"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================
          DETAILS DRAWER
      =================================================== */}

      {showDetails && selectedOpportunity && (
        <DetailsDrawer
          opportunity={selectedOpportunity}
          onClose={() => {
            setShowDetails(false);
            setSelectedOpportunity(null);
          }}
          onEdit={(item) => {
            setShowDetails(false);
            openEdit(item);
          }}
          onDelete={(item) => {
            setShowDetails(false);
            openDelete(item);
          }}
          onWon={(item) => {
            setShowDetails(false);
            openClose(item, "WON");
          }}
          onLost={(item) => {
            setShowDetails(false);
            openClose(item, "LOST");
          }}
          products={products}
        />
      )}

      {/* ===================================================
          CLOSE MODAL
      =================================================== */}

      {showClose && selectedOpportunity && (
        <Modal
          title={
            closeResult === "WON"
              ? "Close Opportunity as Won"
              : "Close Opportunity as Lost"
          }
          subtitle={`Update the final outcome for "${selectedOpportunity.name}".`}
          onClose={() => setShowClose(false)}
        >
          <div className="space-y-5">
            <div
              className={`rounded-2xl border p-4 ${
                closeResult === "WON"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {closeResult === "WON" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-rose-600" />
                )}

                <div>
                  <p className="font-bold">
                    {closeResult === "WON"
                      ? "Mark as WON"
                      : "Mark as LOST"}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Value:{" "}
                    {money(
                      selectedOpportunity.value,
                      selectedOpportunity.currency
                    )}
                  </p>
                </div>
              </div>
            </div>

            <TextareaField
              label="Closing Reason"
              required
              value={closeReason}
              onChange={setCloseReason}
              placeholder={
                closeResult === "WON"
                  ? "Customer approved the proposal..."
                  : "Customer selected another provider..."
              }
            />

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                onClick={() => setShowClose(false)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={closeOpportunity}
                disabled={saving}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white ${
                  closeResult === "WON"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Confirm{" "}
                {closeResult === "WON" ? "Won" : "Lost"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================
          DELETE MODAL
      =================================================== */}

      {showDelete && selectedOpportunity && (
        <Modal
          title="Delete Opportunity"
          subtitle="This action cannot be undone."
          onClose={() => setShowDelete(false)}
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex items-start gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 text-rose-600" />

                <div>
                  <p className="font-bold text-rose-800">
                    Permanent deletion
                  </p>

                  <p className="mt-1 text-sm leading-6 text-rose-700">
                    You are about to delete{" "}
                    <strong>
                      {selectedOpportunity.name}
                    </strong>
                    . All opportunity data will be permanently
                    removed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={deleteOpportunity}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Delete Permanently
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE HEAD
========================================================= */

function TableHead({ children }) {
  return (
    <th className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

/* =========================================================
   OPPORTUNITY ROW
========================================================= */

function OpportunityRow({
  opportunity,
  onView,
  onEdit,
  onDelete,
  onCloseWon,
  onCloseLost,
  onStageChange,
}) {
  const [menu, setMenu] = useState(false);

  return (
    <tr className="group transition hover:bg-slate-50/70">
      <td className="px-4 py-4">
        <button
          onClick={() => onView(opportunity)}
          className="text-left"
        >
          <p className="max-w-[220px] truncate font-bold text-slate-900 group-hover:text-indigo-600">
            {opportunity.name}
          </p>

          <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
            ID: {opportunity._id}
          </p>
        </button>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Building2 className="h-4 w-4 text-slate-500" />
          </div>

          <span className="max-w-[170px] truncate text-sm font-semibold text-slate-700">
            {getName(opportunity.company)}
          </span>
        </div>
      </td>

      <td className="px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {getContactName(opportunity.contact)}
          </p>

          {opportunity.contact?.email && (
            <p className="mt-1 text-xs text-slate-400">
              {opportunity.contact.email}
            </p>
          )}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <User className="h-4 w-4" />
          </div>

          <span className="text-sm font-medium text-slate-700">
            {getUserName(opportunity.owner)}
          </span>
        </div>
      </td>

      <td className="px-4 py-4">
        <div>
          <p className="font-bold text-slate-900">
            {money(
              opportunity.value,
              opportunity.currency
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {opportunity.currency || "INR"}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        <select
          value={opportunity.stage || "QUALIFICATION"}
          onChange={(e) =>
            onStageChange(opportunity, e.target.value)
          }
          className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none ${stageClass(
            opportunity.stage
          )}`}
        >
          {STAGES.map((item) => (
            <option key={item} value={item}>
              {titleCase(item)}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusClass(
            opportunity.status
          )}`}
        >
          {titleCase(opportunity.status || "OPEN")}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="w-24">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {opportunity.probability || 0}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    Number(opportunity.probability || 0)
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <p className="font-bold text-emerald-600">
          {money(
            opportunity.expectedRevenue,
            opportunity.currency
          )}
        </p>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${priorityClass(
            opportunity.priority
          )}`}
        >
          {titleCase(opportunity.priority || "MEDIUM")}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
          <Calendar className="h-4 w-4 text-slate-400" />
          {formatDate(opportunity.expectedCloseDate)}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
          <Clock3 className="h-4 w-4 text-slate-400" />
          {formatDate(opportunity.nextFollowUpDate)}
        </div>
      </td>

      <td className="px-4 py-4">
        <div>
          <p className="text-xs font-bold text-slate-700">
            {titleCase(opportunity.sourceType || "OTHER")}
          </p>

          <p className="mt-1 max-w-[130px] truncate text-xs text-slate-400">
            {opportunity.source || "—"}
          </p>
        </div>
      </td>

      <td className="relative px-4 py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(opportunity)}
            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={() => onEdit(opportunity)}
            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenu((value) => !value)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menu && (
              <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {opportunity.status !== "WON" && (
                  <button
                    onClick={() => {
                      setMenu(false);
                      onCloseWon(opportunity);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Won
                  </button>
                )}

                {opportunity.status !== "LOST" && (
                  <button
                    onClick={() => {
                      setMenu(false);
                      onCloseLost(opportunity);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Mark Lost
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenu(false);
                    onDelete(opportunity);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   DETAILS DRAWER
========================================================= */

function DetailsDrawer({
  opportunity,
  onClose,
  onEdit,
  onDelete,
  onWon,
  onLost,
  products,
}) {
  const productItems = Array.isArray(opportunity.products)
    ? opportunity.products
    : [];

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Opportunity Details
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {opportunity.name}
              </h2>

              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${stageClass(
                    opportunity.stage
                  )}`}
                >
                  {titleCase(opportunity.stage)}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                    opportunity.status
                  )}`}
                >
                  {titleCase(opportunity.status)}
                </span>

                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${priorityClass(
                    opportunity.priority
                  )}`}
                >
                  {titleCase(opportunity.priority)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniMetric
              label="Value"
              value={money(
                opportunity.value,
                opportunity.currency
              )}
            />

            <MiniMetric
              label="Probability"
              value={`${opportunity.probability || 0}%`}
            />

            <MiniMetric
              label="Expected Revenue"
              value={money(
                opportunity.expectedRevenue,
                opportunity.currency
              )}
            />

            <MiniMetric
              label="Weighted Value"
              value={money(
                opportunity.weightedValue,
                opportunity.currency
              )}
            />
          </div>
        </div>

        <div className="space-y-7 p-5 sm:p-7">
          {/* Actions */}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => onEdit(opportunity)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              onClick={() => onWon(opportunity)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Won
            </button>

            <button
              onClick={() => onLost(opportunity)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
            >
              <XCircle className="h-4 w-4" />
              Lost
            </button>

            <button
              onClick={() => onDelete(opportunity)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>

          {/* Overview */}

          <DetailSection title="Overview" icon={BriefcaseBusiness}>
            <DetailGrid>
              <DetailItem
                label="Opportunity ID"
                value={opportunity._id}
              />

              <DetailItem
                label="Description"
                value={opportunity.description}
              />

              <DetailItem
                label="Currency"
                value={opportunity.currency}
              />

              <DetailItem
                label="Status"
                value={titleCase(opportunity.status)}
              />

              <DetailItem
                label="Stage"
                value={titleCase(opportunity.stage)}
              />

              <DetailItem
                label="Priority"
                value={titleCase(opportunity.priority)}
              />
            </DetailGrid>
          </DetailSection>

          {/* Relations */}

          <DetailSection title="Relationships" icon={Users}>
            <DetailGrid>
              <DetailItem
                label="Company"
                value={getName(opportunity.company)}
              />

              <DetailItem
                label="Contact"
                value={getContactName(opportunity.contact)}
              />

              <DetailItem
                label="Lead"
                value={getName(opportunity.lead)}
              />

              <DetailItem
                label="Owner"
                value={getUserName(opportunity.owner)}
              />

              <DetailItem
                label="Created By"
                value={getUserName(opportunity.createdBy)}
              />

              <DetailItem
                label="Updated By"
                value={getUserName(opportunity.updatedBy)}
              />
            </DetailGrid>
          </DetailSection>

          {/* Forecast */}

          <DetailSection title="Forecast & Dates" icon={Calendar}>
            <DetailGrid>
              <DetailItem
                label="Value"
                value={money(
                  opportunity.value,
                  opportunity.currency
                )}
              />

              <DetailItem
                label="Probability"
                value={`${opportunity.probability || 0}%`}
              />

              <DetailItem
                label="Expected Revenue"
                value={money(
                  opportunity.expectedRevenue,
                  opportunity.currency
                )}
              />

              <DetailItem
                label="Weighted Value"
                value={money(
                  opportunity.weightedValue,
                  opportunity.currency
                )}
              />

              <DetailItem
                label="Expected Close"
                value={formatDate(
                  opportunity.expectedCloseDate
                )}
              />

              <DetailItem
                label="Actual Close"
                value={formatDate(
                  opportunity.actualCloseDate
                )}
              />

              <DetailItem
                label="Next Follow-up"
                value={formatDate(
                  opportunity.nextFollowUpDate
                )}
              />

              <DetailItem
                label="Last Contacted"
                value={formatDate(
                  opportunity.lastContactedAt
                )}
              />
            </DetailGrid>
          </DetailSection>

          {/* Source */}

          <DetailSection title="Source" icon={Flame}>
            <DetailGrid>
              <DetailItem
                label="Source Type"
                value={titleCase(
                  opportunity.sourceType
                )}
              />

              <DetailItem
                label="Source"
                value={opportunity.source}
              />
            </DetailGrid>
          </DetailSection>

          {/* Products */}

          <DetailSection title="Products" icon={Package}>
            {productItems.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No products attached to this opportunity.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Discount
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Tax
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {productItems.map((item, index) => (
                        <tr key={item._id || index}>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                            {getProductName(
                              item.product ||
                                products.find(
                                  (product) =>
                                    getId(product) ===
                                    item.product
                                )
                            )}
                          </td>

                          <td className="px-4 py-3 text-right text-sm">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-3 text-right text-sm">
                            {money(
                              item.price,
                              opportunity.currency
                            )}
                          </td>

                          <td className="px-4 py-3 text-right text-sm">
                            {item.discount}%
                          </td>

                          <td className="px-4 py-3 text-right text-sm">
                            {item.tax}%
                          </td>

                          <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                            {money(
                              item.total,
                              opportunity.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DetailSection>

          {/* Tags */}

          <DetailSection title="Tags" icon={Layers3}>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(opportunity.tags) &&
              opportunity.tags.length ? (
                opportunity.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">
                  No tags
                </span>
              )}
            </div>
          </DetailSection>

          {/* Reasons */}

          {(opportunity.wonReason ||
            opportunity.lostReason) && (
            <DetailSection
              title="Closing Information"
              icon={Trophy}
            >
              <DetailGrid>
                <DetailItem
                  label="Won Reason"
                  value={opportunity.wonReason}
                />

                <DetailItem
                  label="Lost Reason"
                  value={opportunity.lostReason}
                />
              </DetailGrid>
            </DetailSection>
          )}

          {/* Notes */}

          <DetailSection title="Notes" icon={Activity}>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              {opportunity.notes || "No notes added."}
            </div>
          </DetailSection>
        </div>
      </aside>
    </div>
  );
}

/* =========================================================
   MINI METRIC
========================================================= */

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   DETAIL SECTION
========================================================= */

function DetailSection({ title, icon: Icon, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>

        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   DETAIL GRID
========================================================= */

function DetailGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {children}
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   FORM SECTION
========================================================= */

function FormSection({ title, icon: Icon, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {title}
          </h3>

          <div className="mt-1 h-0.5 w-8 rounded-full bg-indigo-600" />
        </div>
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      <input
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
      />
    </div>
  );
}

/* =========================================================
   TEXTAREA
========================================================= */

function TextareaField({
  label,
  required,
  value,
  onChange,
  placeholder,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
      />
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  required,
  value,
  onChange,
  options = [],
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
        >
          <option value="">Select {label}</option>

          {options.map((option) => {
            const normalized =
              typeof option === "string"
                ? {
                    value: option,
                    label: titleCase(option),
                  }
                : option;

            return (
              <option
                key={normalized.value}
                value={normalized.value}
              >
                {normalized.label}
              </option>
            );
          })}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  label,
  value,
  onChange,
  options = [],
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-indigo-400"
      >
        <option value="">All {label}</option>

        {options.map((option) => {
          const normalized =
            typeof option === "string"
              ? {
                  value: option,
                  label: titleCase(option),
                }
              : option;

          return (
            <option
              key={normalized.value}
              value={normalized.value}
            >
              {normalized.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/* =========================================================
   SMALL INPUT
========================================================= */

function SmallInput({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
      />
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${
          wide ? "max-w-6xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>

      <p className="mt-4 font-semibold text-slate-700">
        Loading opportunities...
      </p>

      <p className="mt-1 text-sm text-slate-400">
        Fetching your sales pipeline.
      </p>
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({ onCreate }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
        <Target className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        No opportunities found
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create your first opportunity or adjust your filters
        to see more sales pipeline records.
      </p>

      <button
        onClick={onCreate}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Create Opportunity
      </button>
    </div>
  );
}