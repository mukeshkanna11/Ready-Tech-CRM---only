import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import API from "../services/api";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
];

const PAYMENT_STATUSES = [
  "UNPAID",
  "PARTIAL",
  "PAID",
];

const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
];

const PAYMENT_TERMS = [
  "DUE_ON_RECEIPT",
  "NET_7",
  "NET_15",
  "NET_30",
  "NET_45",
  "NET_60",
  "NET_90",
  "CUSTOM",
];

const EMPTY_ITEM = {
  product: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 18,
  discountRate: 0,
};

const EMPTY_FORM = {
  salesOrderNumber: "",
  quotation: "",
  opportunity: "",
  company: "",
  contact: "",
  owner: "",
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: "",
  currency: "INR",
  items: [{ ...EMPTY_ITEM }],
  status: "DRAFT",
  paymentStatus: "UNPAID",
  paymentTerms: "NET_30",
  customPaymentTerms: "",
  amountPaid: 0,
  deliveryTerms: "",
  shippingMethod: "",
  billingAddress: "",
  shippingAddress: "",
  customerNotes: "",
  internalNotes: "",
  termsAndConditions: "",
  tags: [],
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

const dateFormat = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
};

const getName = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  return (
    value.name ||
    value.displayName ||
    value.fullName ||
    `${value.firstName || ""} ${value.lastName || ""}`.trim() ||
    value.email ||
    ""
  );
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const statusMeta = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const paymentMeta = {
  UNPAID: {
    label: "Unpaid",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function StatusBadge({ status }) {
  const meta = statusMeta[status] || statusMeta.DRAFT;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  const meta = paymentMeta[status] || paymentMeta.UNPAID;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <CreditCard className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111827]/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-white/[0.12]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.025] blur-2xl transition group-hover:bg-white/[0.05]" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : (
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
              {value}
            </h3>
          )}

          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function SalesOrders() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [quotations, setQuotations] = useState([]);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  /* -------------------------------------------------------
     FILTERS
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [currency, setCurrency] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("");
  const [deliveryDateTo, setDeliveryDateTo] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* -------------------------------------------------------
     FORM
  ------------------------------------------------------- */

  const [form, setForm] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  /* =======================================================
     LOAD LOOKUPS
  ======================================================= */

  const loadLookups = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        API.get("/companies?limit=200"),
        API.get("/contacts?limit=200"),
        API.get("/opportunities?limit=200"),
        API.get("/products?limit=200"),
        API.get("/users?limit=200"),
        API.get("/quotations?limit=200"),
      ]);

      const extract = (result) => {
        if (result.status !== "fulfilled") return [];

        const data = result.value?.data?.data;

        if (Array.isArray(data)) return data;

        if (Array.isArray(data?.items)) return data.items;

        if (Array.isArray(data?.data)) return data.data;

        return [];
      };

      setCompanies(extract(results[0]));
      setContacts(extract(results[1]));
      setOpportunities(extract(results[2]));
      setProducts(extract(results[3]));
      setUsers(extract(results[4]));
      setQuotations(extract(results[5]));
    } catch {
      // Lookup failure should not break the Sales Orders page.
    }
  }, []);

  /* =======================================================
     LOAD SALES ORDERS
  ======================================================= */

  const loadOrders = useCallback(async () => {
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
      if (status) params.status = status;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (currency) params.currency = currency;
      if (companyFilter) params.company = companyFilter;
      if (ownerFilter) params.owner = ownerFilter;
      if (minAmount !== "") params.minAmount = minAmount;
      if (maxAmount !== "") params.maxAmount = maxAmount;
      if (orderDateFrom) params.orderDateFrom = orderDateFrom;
      if (orderDateTo) params.orderDateTo = orderDateTo;
      if (deliveryDateFrom) params.deliveryDateFrom = deliveryDateFrom;
      if (deliveryDateTo) params.deliveryDateTo = deliveryDateTo;

      const response = await API.get("/sales-orders", { params });

      const payload = response?.data?.data;

      let rows = [];

      if (Array.isArray(payload)) {
        rows = payload;
      } else if (Array.isArray(payload?.items)) {
        rows = payload.items;
      } else if (Array.isArray(payload?.salesOrders)) {
        rows = payload.salesOrders;
      } else if (Array.isArray(response?.data?.items)) {
        rows = response.data.items;
      }

      setOrders(rows);

      const pagination =
        response?.data?.pagination ||
        payload?.pagination ||
        {};

      setTotalPages(
        Number(
          pagination.totalPages ||
            Math.ceil(
              Number(pagination.total || 0) / limit
            ) ||
            1
        )
      );

      setTotalItems(
        Number(
          pagination.total ||
            pagination.totalItems ||
            rows.length
        )
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load sales orders."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    status,
    paymentStatus,
    currency,
    companyFilter,
    ownerFilter,
    minAmount,
    maxAmount,
    orderDateFrom,
    orderDateTo,
    deliveryDateFrom,
    deliveryDateTo,
    sortBy,
    sortOrder,
  ]);

  /* =======================================================
     LOAD STATS
  ======================================================= */

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const params = {};

      if (currency) params.currency = currency;
      if (companyFilter) params.company = companyFilter;
      if (ownerFilter) params.owner = ownerFilter;
      if (orderDateFrom) params.orderDateFrom = orderDateFrom;
      if (orderDateTo) params.orderDateTo = orderDateTo;

      const response = await API.get("/sales-orders/stats", {
        params,
      });

      setStats(response?.data?.data || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [
    currency,
    companyFilter,
    ownerFilter,
    orderDateFrom,
    orderDateTo,
  ]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* =======================================================
     TOAST AUTO CLEAR
  ======================================================= */

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [success]);

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      orderDate: new Date().toISOString().slice(0, 10),
      items: [{ ...EMPTY_ITEM }],
    });

    setTagInput("");
    setEditingOrder(null);
  };

  const openCreate = () => {
    resetForm();

    setForm((prev) => ({
      ...prev,
      salesOrderNumber: `SO-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-4)}`,
    }));

    setShowForm(true);
  };

  const openEdit = (order) => {
    if (
      order.status === "COMPLETED" ||
      order.status === "CANCELLED"
    ) {
      setError(
        "Completed or cancelled sales orders cannot be edited."
      );
      return;
    }

    setEditingOrder(order);

    setForm({
      salesOrderNumber: order.salesOrderNumber || "",
      quotation: getId(order.quotation),
      opportunity: getId(order.opportunity),
      company: getId(order.company),
      contact: getId(order.contact),
      owner: getId(order.owner),
      orderDate: order.orderDate
        ? new Date(order.orderDate)
            .toISOString()
            .slice(0, 10)
        : "",
      expectedDeliveryDate: order.expectedDeliveryDate
        ? new Date(order.expectedDeliveryDate)
            .toISOString()
            .slice(0, 10)
        : "",
      currency: order.currency || "INR",
      items:
        order.items?.length > 0
          ? order.items.map((item) => ({
              product: getId(item.product),
              description: item.description || "",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              taxRate: item.taxRate || 0,
              discountRate: item.discountRate || 0,
            }))
          : [{ ...EMPTY_ITEM }],
      status: order.status || "DRAFT",
      paymentStatus: order.paymentStatus || "UNPAID",
      paymentTerms: order.paymentTerms || "NET_30",
      customPaymentTerms: order.customPaymentTerms || "",
      amountPaid: order.amountPaid || 0,
      deliveryTerms: order.deliveryTerms || "",
      shippingMethod: order.shippingMethod || "",
      billingAddress: order.billingAddress || "",
      shippingAddress: order.shippingAddress || "",
      customerNotes: order.customerNotes || "",
      internalNotes: order.internalNotes || "",
      termsAndConditions:
        order.termsAndConditions || "",
      tags: Array.isArray(order.tags) ? order.tags : [],
    });

    setShowForm(true);
  };

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      if (field === "product") {
        const product = products.find(
          (item) => getId(item) === value
        );

        if (product) {
          items[index].description =
            items[index].description ||
            product.name ||
            "";

          items[index].unitPrice =
            Number(
              product.sellingPrice ??
                product.salePrice ??
                product.price ??
                0
            );
        }
      }

      return {
        ...prev,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...EMPTY_ITEM },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;

      return {
        ...prev,
        items: prev.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();

    if (!tag) return;

    setForm((prev) => {
      if (prev.tags.includes(tag)) return prev;

      return {
        ...prev,
        tags: [...prev.tags, tag],
      };
    });

    setTagInput("");
  };

  const removeTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter(
        (item) => item !== tag
      ),
    }));
  };

  /* =======================================================
     FRONTEND TOTALS
  ======================================================= */

  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const items = form.items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const taxRate = Number(item.taxRate || 0);
      const discountRate = Number(
        item.discountRate || 0
      );

      const lineSubtotal =
        quantity * unitPrice;

      const discountAmount =
        lineSubtotal * (discountRate / 100);

      const taxableAmount =
        lineSubtotal - discountAmount;

      const taxAmount =
        taxableAmount * (taxRate / 100);

      const lineTotal =
        taxableAmount + taxAmount;

      subtotal += lineSubtotal;
      discountTotal += discountAmount;
      taxTotal += taxAmount;

      return {
        ...item,
        lineSubtotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        lineTotal,
      };
    });

    const grandTotal =
      subtotal -
      discountTotal +
      taxTotal;

    const amountPaid =
      Number(form.amountPaid || 0);

    const balanceDue = Math.max(
      grandTotal - amountPaid,
      0
    );

    return {
      items,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      amountPaid,
      balanceDue,
    };
  }, [form.items, form.amountPaid]);

  /* =======================================================
     SAVE
  ======================================================= */

  const saveOrder = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.salesOrderNumber.trim()) {
        throw new Error(
          "Sales order number is required."
        );
      }

      if (!form.company) {
        throw new Error(
          "Please select a company."
        );
      }

      if (!form.contact) {
        throw new Error(
          "Please select a contact."
        );
      }

      if (!form.items.length) {
        throw new Error(
          "At least one item is required."
        );
      }

      const payload = {
        salesOrderNumber:
          form.salesOrderNumber.trim(),

        quotation:
          form.quotation || undefined,

        opportunity:
          form.opportunity || undefined,

        company: form.company,

        contact: form.contact,

        owner:
          form.owner || undefined,

        orderDate:
          form.orderDate || undefined,

        expectedDeliveryDate:
          form.expectedDeliveryDate ||
          undefined,

        currency: form.currency,

        items: form.items.map((item) => ({
          product: item.product,
          description:
            item.description || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          discountRate: Number(
            item.discountRate
          ),
        })),

        status:
          editingOrder?.status ||
          "DRAFT",

        paymentStatus:
          editingOrder?.paymentStatus ||
          "UNPAID",

        paymentTerms:
          form.paymentTerms,

        customPaymentTerms:
          form.customPaymentTerms || "",

        amountPaid:
          Number(form.amountPaid || 0),

        deliveryTerms:
          form.deliveryTerms || "",

        shippingMethod:
          form.shippingMethod || "",

        billingAddress:
          form.billingAddress || "",

        shippingAddress:
          form.shippingAddress || "",

        customerNotes:
          form.customerNotes || "",

        internalNotes:
          form.internalNotes || "",

        termsAndConditions:
          form.termsAndConditions || "",

        tags: form.tags || [],
      };

      if (editingOrder) {
        await API.put(
          `/sales-orders/${getId(editingOrder)}`,
          payload
        );

        setSuccess(
          "Sales order updated successfully."
        );
      } else {
        await API.post(
          "/sales-orders",
          payload
        );

        setSuccess(
          "Sales order created successfully."
        );
      }

      setShowForm(false);
      resetForm();

      await Promise.all([
        loadOrders(),
        loadStats(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to save sales order."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     ACTION HANDLER
  ======================================================= */

  const runAction = async (
    actionKey,
    callback,
    successMessage
  ) => {
    try {
      setActionLoading(actionKey);
      setError("");

      await callback();

      setSuccess(successMessage);

      setShowView(false);
      setShowPayment(false);
      setShowCancel(false);
      setShowDelete(false);

      await Promise.all([
        loadOrders(),
        loadStats(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to complete this action."
        )
      );
    } finally {
      setActionLoading("");
    }
  };

  /* =======================================================
     WORKFLOW ACTIONS
  ======================================================= */

  const confirmOrder = (order) => {
    runAction(
      `confirm-${getId(order)}`,
      () =>
        API.post(
          `/sales-orders/${getId(order)}/confirm`
        ),
      "Sales order confirmed successfully."
    );
  };

  const processOrder = (order) => {
    runAction(
      `process-${getId(order)}`,
      () =>
        API.post(
          `/sales-orders/${getId(order)}/process`
        ),
      "Sales order moved to processing."
    );
  };

  const completeOrder = (order) => {
    runAction(
      `complete-${getId(order)}`,
      () =>
        API.post(
          `/sales-orders/${getId(order)}/complete`,
          {
            actualDeliveryDate:
              new Date()
                .toISOString()
                .slice(0, 10),

            completionNotes:
              "Sales order completed successfully.",
          }
        ),
      "Sales order completed successfully."
    );
  };

  const cancelOrder = async () => {
    if (!selectedOrder) return;

    await runAction(
      `cancel-${getId(selectedOrder)}`,
      () =>
        API.post(
          `/sales-orders/${getId(selectedOrder)}/cancel`,
          {
            cancellationReason:
              cancelReason.trim() ||
              "Cancelled by user.",
          }
        ),
      "Sales order cancelled successfully."
    );

    setCancelReason("");
  };

  /* =======================================================
     PAYMENT
  ======================================================= */

  const openPayment = (order) => {
    setSelectedOrder(order);
    setPaymentAmount(
      String(order.amountPaid || 0)
    );
    setShowPayment(true);
  };

  const updatePayment = async () => {
    if (!selectedOrder) return;

    await runAction(
      `payment-${getId(selectedOrder)}`,
      () =>
        API.patch(
          `/sales-orders/${getId(
            selectedOrder
          )}/payment`,
          {
            amountPaid: Number(
              paymentAmount
            ),
          }
        ),
      "Payment updated successfully."
    );

    setPaymentAmount("");
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteOrder = async () => {
    if (!selectedOrder) return;

    await runAction(
      `delete-${getId(selectedOrder)}`,
      () =>
        API.delete(
          `/sales-orders/${getId(selectedOrder)}`
        ),
      "Sales order deleted successfully."
    );

    setSelectedOrder(null);
  };

  /* =======================================================
     VIEW
  ======================================================= */

  const openView = (order) => {
    setSelectedOrder(order);
    setShowView(true);
  };

  /* =======================================================
     FILTER RESET
  ======================================================= */

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setCurrency("");
    setCompanyFilter("");
    setOwnerFilter("");
    setMinAmount("");
    setMaxAmount("");
    setOrderDateFrom("");
    setOrderDateTo("");
    setDeliveryDateFrom("");
    setDeliveryDateTo("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  /* =======================================================
     DERIVED STATS
  ======================================================= */

  const summary = stats?.summary || {};

  const totalOrders =
    summary.totalOrders ??
    totalItems ??
    0;

  const totalValue =
    summary.totalValue ?? 0;

  const totalPaid =
    summary.totalPaid ?? 0;

  const totalBalance =
    summary.totalBalanceDue ?? 0;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200">
      {/* ===================================================
          TOASTS
      =================================================== */}

      {success && (
        <div className="fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-500/20 bg-[#0d1715] px-4 py-3 shadow-2xl">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

          <div>
            <p className="text-sm font-semibold text-white">
              Success
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {success}
            </p>
          </div>

          <button
            onClick={() => setSuccess("")}
            className="ml-auto text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed right-5 top-5 z-[100] mt-16 flex max-w-sm items-start gap-3 rounded-2xl border border-red-500/20 bg-[#190e12] px-4 py-3 shadow-2xl">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

          <div>
            <p className="text-sm font-semibold text-white">
              Action failed
            </p>

            <p className="mt-0.5 text-xs leading-5 text-slate-400">
              {error}
            </p>
          </div>

          <button
            onClick={() => setError("")}
            className="ml-auto text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="border-b border-white/[0.06] bg-[#0a0f1a]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1800px] px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                  <ShoppingCart className="h-6 w-6 text-slate-200" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Sales Orders
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage orders, fulfillment, payments and delivery workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  loadOrders();
                  loadStats();
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                New Sales Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <main className="mx-auto max-w-[1800px] px-5 py-6 lg:px-8">
        {/* STATS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={totalOrders}
            subtitle="All sales orders"
            icon={ShoppingCart}
            loading={statsLoading}
          />

          <StatCard
            title="Order Value"
            value={money(totalValue, currency || "INR")}
            subtitle="Gross order value"
            icon={CircleDollarSign}
            loading={statsLoading}
          />

          <StatCard
            title="Collected"
            value={money(totalPaid, currency || "INR")}
            subtitle="Total amount paid"
            icon={CheckCircle2}
            loading={statsLoading}
          />

          <StatCard
            title="Outstanding"
            value={money(
              totalBalance,
              currency || "INR"
            )}
            subtitle="Remaining balance"
            icon={Clock3}
            loading={statsLoading}
          />
        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#0d1421]/80 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search sales order number..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-white/[0.04]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-11 min-w-[140px] rounded-xl border border-white/[0.07] bg-[#111827] px-3 text-sm text-slate-300 outline-none focus:border-white/[0.16]"
              >
                <option value="">All Status</option>
                {STATUSES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {statusMeta[item].label}
                  </option>
                ))}
              </select>

              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-11 min-w-[140px] rounded-xl border border-white/[0.07] bg-[#111827] px-3 text-sm text-slate-300 outline-none focus:border-white/[0.16]"
              >
                <option value="">
                  All Payments
                </option>

                {PAYMENT_STATUSES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {paymentMeta[item].label}
                    </option>
                  )
                )}
              </select>

              <button
                onClick={() =>
                  setShowFilters(
                    (value) => !value
                  )
                }
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition ${
                  showFilters
                    ? "border-white/[0.15] bg-white/[0.08] text-white"
                    : "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <button
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-sm font-medium text-slate-500 transition hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          {/* ADVANCED FILTERS */}

          {showFilters && (
            <div className="mt-3 border-t border-white/[0.06] pt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <FilterSelect
                  label="Currency"
                  value={currency}
                  onChange={(value) => {
                    setCurrency(value);
                    setPage(1);
                  }}
                  options={CURRENCIES}
                />

                <FilterSelect
                  label="Company"
                  value={companyFilter}
                  onChange={(value) => {
                    setCompanyFilter(value);
                    setPage(1);
                  }}
                  options={companies}
                  objectOptions
                />

                <FilterSelect
                  label="Owner"
                  value={ownerFilter}
                  onChange={(value) => {
                    setOwnerFilter(value);
                    setPage(1);
                  }}
                  options={users}
                  objectOptions
                />

                <FilterInput
                  label="Min Amount"
                  value={minAmount}
                  onChange={(value) => {
                    setMinAmount(value);
                    setPage(1);
                  }}
                  type="number"
                  placeholder="0"
                />

                <FilterInput
                  label="Max Amount"
                  value={maxAmount}
                  onChange={(value) => {
                    setMaxAmount(value);
                    setPage(1);
                  }}
                  type="number"
                  placeholder="100000"
                />

                <FilterInput
                  label="Order From"
                  value={orderDateFrom}
                  onChange={(value) => {
                    setOrderDateFrom(value);
                    setPage(1);
                  }}
                  type="date"
                />

                <FilterInput
                  label="Order To"
                  value={orderDateTo}
                  onChange={(value) => {
                    setOrderDateTo(value);
                    setPage(1);
                  }}
                  type="date"
                />

                <FilterInput
                  label="Delivery From"
                  value={deliveryDateFrom}
                  onChange={(value) => {
                    setDeliveryDateFrom(value);
                    setPage(1);
                  }}
                  type="date"
                />

                <FilterInput
                  label="Delivery To"
                  value={deliveryDateTo}
                  onChange={(value) => {
                    setDeliveryDateTo(value);
                    setPage(1);
                  }}
                  type="date"
                />

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Sort
                  </label>

                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#111827] px-3 text-xs text-slate-300 outline-none"
                  >
                    <option value="createdAt">
                      Created
                    </option>
                    <option value="orderDate">
                      Order Date
                    </option>
                    <option value="grandTotal">
                      Grand Total
                    </option>
                    <option value="expectedDeliveryDate">
                      Delivery Date
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Direction
                  </label>

                  <button
                    onClick={() =>
                      setSortOrder(
                        (value) =>
                          value === "asc"
                            ? "desc"
                            : "asc"
                      )
                    }
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-[#111827] text-xs font-medium text-slate-300 hover:bg-white/[0.05]"
                  >
                    {sortOrder === "asc" ? (
                      <>
                        <ArrowUp className="h-3.5 w-3.5" />
                        Ascending
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3.5 w-3.5" />
                        Descending
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1421]/80 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.018]">
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Sales Order
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Order Date
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Total
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableLoading />
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-20 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025]">
                        <ShoppingCart className="h-6 w-6 text-slate-600" />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-300">
                        No sales orders found
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Create a new sales order or change your filters.
                      </p>

                      <button
                        onClick={openCreate}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950"
                      >
                        <Plus className="h-4 w-4" />
                        Create Sales Order
                      </button>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <SalesOrderRow
                      key={getId(order)}
                      order={order}
                      actionLoading={
                        actionLoading
                      }
                      onView={() =>
                        openView(order)
                      }
                      onEdit={() =>
                        openEdit(order)
                      }
                      onConfirm={() =>
                        confirmOrder(order)
                      }
                      onProcess={() =>
                        processOrder(order)
                      }
                      onComplete={() =>
                        completeOrder(order)
                      }
                      onPayment={() =>
                        openPayment(order)
                      }
                      onCancel={() => {
                        setSelectedOrder(
                          order
                        );
                        setCancelReason("");
                        setShowCancel(true);
                      }}
                      onDelete={() => {
                        setSelectedOrder(
                          order
                        );
                        setShowDelete(true);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-400">
                {orders.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-400">
                {totalItems}
              </span>{" "}
              orders
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() =>
                  setPage(
                    (value) =>
                      Math.max(
                        value - 1,
                        1
                      )
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white">
                {page} / {Math.max(totalPages, 1)}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() =>
                  setPage(
                    (value) =>
                      Math.min(
                        value + 1,
                        totalPages
                      )
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================
          CREATE / EDIT MODAL
      =================================================== */}

      {showForm && (
        <Modal
          title={
            editingOrder
              ? "Edit Sales Order"
              : "Create Sales Order"
          }
          subtitle={
            editingOrder
              ? "Update the sales order before fulfillment."
              : "Create a new order from your CRM pipeline."
          }
          onClose={() => {
            if (!saving) {
              setShowForm(false);
              resetForm();
            }
          }}
          wide
        >
          <form
            onSubmit={saveOrder}
            className="space-y-6"
          >
            {/* BASIC */}

            <section>
              <SectionTitle
                icon={FileText}
                title="Order Information"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  label="Sales Order Number"
                  required
                >
                  <input
                    value={
                      form.salesOrderNumber
                    }
                    onChange={(event) =>
                      updateField(
                        "salesOrderNumber",
                        event.target.value
                      )
                    }
                    className="input"
                    placeholder="SO-2026-0003"
                    disabled={Boolean(
                      editingOrder
                    )}
                  />
                </FormField>

                <FormField label="Quotation">
                  <select
                    value={form.quotation}
                    onChange={(event) =>
                      updateField(
                        "quotation",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select quotation
                    </option>

                    {quotations.map(
                      (quotation) => (
                        <option
                          key={getId(
                            quotation
                          )}
                          value={getId(
                            quotation
                          )}
                        >
                          {quotation.quotationNumber ||
                            getName(
                              quotation
                            )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField label="Opportunity">
                  <select
                    value={form.opportunity}
                    onChange={(event) =>
                      updateField(
                        "opportunity",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select opportunity
                    </option>

                    {opportunities.map(
                      (opportunity) => (
                        <option
                          key={getId(
                            opportunity
                          )}
                          value={getId(
                            opportunity
                          )}
                        >
                          {getName(
                            opportunity
                          )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField label="Owner">
                  <select
                    value={form.owner}
                    onChange={(event) =>
                      updateField(
                        "owner",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select owner
                    </option>

                    {users.map((user) => (
                      <option
                        key={getId(user)}
                        value={getId(user)}
                      >
                        {getName(user)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Company"
                  required
                >
                  <select
                    value={form.company}
                    onChange={(event) =>
                      updateField(
                        "company",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select company
                    </option>

                    {companies.map(
                      (company) => (
                        <option
                          key={getId(
                            company
                          )}
                          value={getId(
                            company
                          )}
                        >
                          {getName(company)}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField
                  label="Contact"
                  required
                >
                  <select
                    value={form.contact}
                    onChange={(event) =>
                      updateField(
                        "contact",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select contact
                    </option>

                    {contacts.map(
                      (contact) => (
                        <option
                          key={getId(
                            contact
                          )}
                          value={getId(
                            contact
                          )}
                        >
                          {getName(contact)}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField
                  label="Order Date"
                  required
                >
                  <input
                    type="date"
                    value={form.orderDate}
                    onChange={(event) =>
                      updateField(
                        "orderDate",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </FormField>

                <FormField label="Expected Delivery">
                  <input
                    type="date"
                    value={
                      form.expectedDeliveryDate
                    }
                    onChange={(event) =>
                      updateField(
                        "expectedDeliveryDate",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </FormField>
              </div>
            </section>

            {/* ITEMS */}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle
                  icon={Package}
                  title="Order Items"
                />

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {form.items.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                        <FormField
                          label="Product"
                          className="lg:col-span-2"
                        >
                          <select
                            value={
                              item.product
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "product",
                                event.target
                                  .value
                              )
                            }
                            className="input"
                          >
                            <option value="">
                              Select product
                            </option>

                            {products.map(
                              (
                                product
                              ) => (
                                <option
                                  key={getId(
                                    product
                                  )}
                                  value={getId(
                                    product
                                  )}
                                >
                                  {product.name ||
                                    getName(
                                      product
                                    )}
                                </option>
                              )
                            )}
                          </select>
                        </FormField>

                        <FormField label="Description">
                          <input
                            value={
                              item.description
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "description",
                                event.target
                                  .value
                              )
                            }
                            className="input"
                            placeholder="Item description"
                          />
                        </FormField>

                        <FormField label="Quantity">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "quantity",
                                event.target
                                  .value
                              )
                            }
                            className="input"
                          />
                        </FormField>

                        <FormField label="Unit Price">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.unitPrice
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "unitPrice",
                                event.target
                                  .value
                              )
                            }
                            className="input"
                          />
                        </FormField>

                        <FormField label="Tax %">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              item.taxRate
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "taxRate",
                                event.target
                                  .value
                              )
                            }
                            className="input"
                          />
                        </FormField>

                        <FormField label="Discount %">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              item.discountRate
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "discountRate",
                                event.target
                                  .value
                              )
                            }
                            className="input"
                          />
                        </FormField>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>
                            Subtotal{" "}
                            <b className="text-slate-300">
                              {money(
                                calculatedTotals
                                  .items[
                                  index
                                ]
                                  ?.lineSubtotal,
                                form.currency
                              )}
                            </b>
                          </span>

                          <span>
                            Discount{" "}
                            <b className="text-slate-300">
                              {money(
                                calculatedTotals
                                  .items[
                                  index
                                ]
                                  ?.discountAmount,
                                form.currency
                              )}
                            </b>
                          </span>

                          <span>
                            Tax{" "}
                            <b className="text-slate-300">
                              {money(
                                calculatedTotals
                                  .items[
                                  index
                                ]
                                  ?.taxAmount,
                                form.currency
                              )}
                            </b>
                          </span>

                          <span>
                            Total{" "}
                            <b className="text-white">
                              {money(
                                calculatedTotals
                                  .items[
                                  index
                                ]
                                  ?.lineTotal,
                                form.currency
                              )}
                            </b>
                          </span>
                        </div>

                        {form.items.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* TOTALS */}

            <div className="flex justify-end">
              <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="space-y-3 text-sm">
                  <TotalLine
                    label="Subtotal"
                    value={money(
                      calculatedTotals.subtotal,
                      form.currency
                    )}
                  />

                  <TotalLine
                    label="Discount"
                    value={`-${money(
                      calculatedTotals.discountTotal,
                      form.currency
                    )}`}
                  />

                  <TotalLine
                    label="Tax"
                    value={money(
                      calculatedTotals.taxTotal,
                      form.currency
                    )}
                  />

                  <div className="border-t border-white/[0.07] pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">
                        Grand Total
                      </span>

                      <span className="text-xl font-bold text-white">
                        {money(
                          calculatedTotals.grandTotal,
                          form.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT */}

            <section>
              <SectionTitle
                icon={CreditCard}
                title="Payment & Delivery"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField label="Currency">
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      updateField(
                        "currency",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    {CURRENCIES.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                <FormField label="Payment Terms">
                  <select
                    value={form.paymentTerms}
                    onChange={(event) =>
                      updateField(
                        "paymentTerms",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    {PAYMENT_TERMS.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item.replace(
                            /_/g,
                            " "
                          )}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                {form.paymentTerms ===
                  "CUSTOM" && (
                  <FormField label="Custom Terms">
                    <input
                      value={
                        form.customPaymentTerms
                      }
                      onChange={(event) =>
                        updateField(
                          "customPaymentTerms",
                          event.target.value
                        )
                      }
                      className="input"
                      placeholder="Enter custom terms"
                    />
                  </FormField>
                )}

                {!editingOrder && (
                  <FormField label="Initial Amount Paid">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.amountPaid
                      }
                      onChange={(event) =>
                        updateField(
                          "amountPaid",
                          event.target.value
                        )
                      }
                      className="input"
                    />
                  </FormField>
                )}

                <FormField label="Shipping Method">
                  <input
                    value={
                      form.shippingMethod
                    }
                    onChange={(event) =>
                      updateField(
                        "shippingMethod",
                        event.target.value
                      )
                    }
                    className="input"
                    placeholder="Digital Delivery"
                  />
                </FormField>

                <FormField
                  label="Delivery Terms"
                  className="lg:col-span-2"
                >
                  <input
                    value={
                      form.deliveryTerms
                    }
                    onChange={(event) =>
                      updateField(
                        "deliveryTerms",
                        event.target.value
                      )
                    }
                    className="input"
                    placeholder="Delivery according to agreed schedule."
                  />
                </FormField>
              </div>
            </section>

            {/* ADDRESSES */}

            <section>
              <SectionTitle
                icon={Truck}
                title="Addresses"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Billing Address">
                  <textarea
                    rows={4}
                    value={
                      form.billingAddress
                    }
                    onChange={(event) =>
                      updateField(
                        "billingAddress",
                        event.target.value
                      )
                    }
                    className="input resize-none py-3"
                  />
                </FormField>

                <FormField label="Shipping Address">
                  <textarea
                    rows={4}
                    value={
                      form.shippingAddress
                    }
                    onChange={(event) =>
                      updateField(
                        "shippingAddress",
                        event.target.value
                      )
                    }
                    className="input resize-none py-3"
                  />
                </FormField>
              </div>
            </section>

            {/* NOTES */}

            <section>
              <SectionTitle
                icon={FileText}
                title="Notes & Terms"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Customer Notes">
                  <textarea
                    rows={4}
                    value={
                      form.customerNotes
                    }
                    onChange={(event) =>
                      updateField(
                        "customerNotes",
                        event.target.value
                      )
                    }
                    className="input resize-none py-3"
                  />
                </FormField>

                <FormField label="Internal Notes">
                  <textarea
                    rows={4}
                    value={
                      form.internalNotes
                    }
                    onChange={(event) =>
                      updateField(
                        "internalNotes",
                        event.target.value
                      )
                    }
                    className="input resize-none py-3"
                  />
                </FormField>

                <FormField
                  label="Terms & Conditions"
                  className="md:col-span-2"
                >
                  <textarea
                    rows={4}
                    value={
                      form.termsAndConditions
                    }
                    onChange={(event) =>
                      updateField(
                        "termsAndConditions",
                        event.target.value
                      )
                    }
                    className="input resize-none py-3"
                  />
                </FormField>
              </div>
            </section>

            {/* TAGS */}

            <section>
              <FormField label="Tags">
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(event) =>
                      setTagInput(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                    className="input"
                    placeholder="Add tag"
                  />

                  <button
                    type="button"
                    onClick={addTag}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  >
                    Add
                  </button>
                </div>

                {form.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-xs text-slate-300"
                      >
                        {tag}

                        <button
                          type="button"
                          onClick={() =>
                            removeTag(tag)
                          }
                          className="text-slate-600 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormField>
            </section>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-sm font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-slate-950 shadow-lg shadow-white/10 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {editingOrder
                      ? "Update Order"
                      : "Create Order"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================
          VIEW MODAL
      =================================================== */}

      {showView &&
        selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() =>
              setShowView(false)
            }
            actionLoading={
              actionLoading
            }
            onEdit={() => {
              setShowView(false);
              openEdit(selectedOrder);
            }}
            onConfirm={() =>
              confirmOrder(
                selectedOrder
              )
            }
            onProcess={() =>
              processOrder(
                selectedOrder
              )
            }
            onComplete={() =>
              completeOrder(
                selectedOrder
              )
            }
            onPayment={() =>
              openPayment(
                selectedOrder
              )
            }
            onCancel={() => {
              setShowView(false);
              setCancelReason("");
              setShowCancel(true);
            }}
          />
        )}

      {/* ===================================================
          PAYMENT MODAL
      =================================================== */}

      {showPayment &&
        selectedOrder && (
          <Modal
            title="Update Payment"
            subtitle={`Record payment for ${selectedOrder.salesOrderNumber}`}
            onClose={() =>
              setShowPayment(false)
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric
                  label="Grand Total"
                  value={money(
                    selectedOrder.grandTotal,
                    selectedOrder.currency
                  )}
                />

                <MiniMetric
                  label="Current Paid"
                  value={money(
                    selectedOrder.amountPaid,
                    selectedOrder.currency
                  )}
                />

                <MiniMetric
                  label="Balance Due"
                  value={money(
                    selectedOrder.balanceDue,
                    selectedOrder.currency
                  )}
                />

                <MiniMetric
                  label="Payment Status"
                  value={
                    selectedOrder.paymentStatus
                  }
                />
              </div>

              <FormField label="New Total Amount Paid">
                <input
                  type="number"
                  min="0"
                  max={
                    selectedOrder.grandTotal
                  }
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(
                      event.target.value
                    )
                  }
                  className="input"
                />
              </FormField>

              <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-5">
                <button
                  onClick={() =>
                    setShowPayment(false)
                  }
                  className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={updatePayment}
                  disabled={
                    actionLoading ===
                    `payment-${getId(
                      selectedOrder
                    )}`
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  {actionLoading ===
                  `payment-${getId(
                    selectedOrder
                  )}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Update Payment
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* ===================================================
          CANCEL MODAL
      =================================================== */}

      {showCancel &&
        selectedOrder && (
          <Modal
            title="Cancel Sales Order"
            subtitle={`Cancel ${selectedOrder.salesOrderNumber}`}
            onClose={() =>
              setShowCancel(false)
            }
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />

                  <p className="text-xs leading-5 text-slate-400">
                    This action will move the sales order to
                    <span className="font-semibold text-red-400">
                      {" "}
                      CANCELLED
                    </span>
                    . Cancelled orders cannot be edited.
                  </p>
                </div>
              </div>

              <FormField label="Cancellation Reason">
                <textarea
                  rows={4}
                  value={cancelReason}
                  onChange={(event) =>
                    setCancelReason(
                      event.target.value
                    )
                  }
                  className="input resize-none py-3"
                  placeholder="Enter cancellation reason..."
                />
              </FormField>

              <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-5">
                <button
                  onClick={() =>
                    setShowCancel(false)
                  }
                  className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Keep Order
                </button>

                <button
                  onClick={cancelOrder}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-bold text-white hover:bg-red-400"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Order
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* ===================================================
          DELETE MODAL
      =================================================== */}

      {showDelete &&
        selectedOrder && (
          <Modal
            title="Delete Sales Order"
            subtitle={`Delete ${selectedOrder.salesOrderNumber}`}
            onClose={() =>
              setShowDelete(false)
            }
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-4">
                <div className="flex gap-3">
                  <Trash2 className="h-5 w-5 shrink-0 text-red-400" />

                  <p className="text-xs leading-5 text-slate-400">
                    This will permanently delete this sales order.
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-5">
                <button
                  onClick={() =>
                    setShowDelete(false)
                  }
                  className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={deleteOrder}
                  disabled={
                    actionLoading ===
                    `delete-${getId(
                      selectedOrder
                    )}`
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50"
                >
                  {actionLoading ===
                  `delete-${getId(
                    selectedOrder
                  )}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
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
   SALES ORDER ROW
========================================================= */

function SalesOrderRow({
  order,
  actionLoading,
  onView,
  onEdit,
  onConfirm,
  onProcess,
  onComplete,
  onPayment,
  onCancel,
  onDelete,
}) {
  const id = getId(order);

  const companyName =
    getName(order.company) ||
    "Unknown Company";

  const contactName =
    getName(order.contact) ||
    "No Contact";

  const status = order.status;

  const actionKey = (prefix) =>
    `${prefix}-${id}`;

  return (
    <tr className="group border-b border-white/[0.045] transition hover:bg-white/[0.018]">
      <td className="px-5 py-4">
        <button
          onClick={onView}
          className="text-left"
        >
          <p className="text-sm font-semibold text-white transition group-hover:text-slate-200">
            {order.salesOrderNumber}
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            {order.items?.length || 0} item
            {order.items?.length === 1
              ? ""
              : "s"}
          </p>
        </button>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-medium text-slate-300">
          {companyName}
        </p>

        <p className="mt-1 text-xs text-slate-600">
          {contactName}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5 text-slate-600" />
          {dateFormat(order.orderDate)}
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-bold text-white">
          {money(
            order.grandTotal,
            order.currency
          )}
        </p>

        <p className="mt-1 text-[11px] text-slate-600">
          Due{" "}
          {money(
            order.balanceDue,
            order.currency
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <PaymentBadge
          status={order.paymentStatus}
        />
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-1">
          <ActionButton
            title="View"
            onClick={onView}
            icon={Eye}
          />

          {(status === "DRAFT" ||
            status === "CONFIRMED" ||
            status === "PROCESSING") && (
            <ActionButton
              title="Edit"
              onClick={onEdit}
              icon={Edit3}
            />
          )}

          {status === "DRAFT" && (
            <ActionButton
              title="Confirm"
              onClick={onConfirm}
              icon={CheckCircle2}
              loading={
                actionLoading ===
                actionKey("confirm")
              }
            />
          )}

          {status === "CONFIRMED" && (
            <ActionButton
              title="Process"
              onClick={onProcess}
              icon={Zap}
              loading={
                actionLoading ===
                actionKey("process")
              }
            />
          )}

          {status === "PROCESSING" && (
            <ActionButton
              title="Complete"
              onClick={onComplete}
              icon={Check}
              loading={
                actionLoading ===
                actionKey("complete")
              }
            />
          )}

          {status !== "CANCELLED" &&
            status !== "COMPLETED" && (
              <ActionButton
                title="Payment"
                onClick={onPayment}
                icon={CreditCard}
              />
            )}

          {status !== "CANCELLED" &&
            status !== "COMPLETED" && (
              <ActionButton
                title="Cancel"
                onClick={onCancel}
                icon={XCircle}
                danger
              />
            )}

          {status === "DRAFT" && (
            <ActionButton
              title="Delete"
              onClick={onDelete}
              icon={Trash2}
              danger
            />
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   ORDER DETAILS MODAL
========================================================= */

function OrderDetailsModal({
  order,
  onClose,
  onEdit,
  onConfirm,
  onProcess,
  onComplete,
  onPayment,
  onCancel,
  actionLoading,
}) {
  const currency = order.currency || "INR";

  return (
    <Modal
      title={order.salesOrderNumber}
      subtitle="Sales order details"
      onClose={onClose}
      wide
    >
      <div className="space-y-6">
        {/* HEADER */}

        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={order.status}
              />

              <PaymentBadge
                status={
                  order.paymentStatus
                }
              />
            </div>

            <p className="mt-3 text-2xl font-bold text-white">
              {money(
                order.grandTotal,
                currency
              )}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Created{" "}
              {dateFormat(
                order.createdAt
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {order.status !==
              "COMPLETED" &&
              order.status !==
                "CANCELLED" && (
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}

            {order.status ===
              "DRAFT" && (
              <button
                onClick={onConfirm}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-950"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm
              </button>
            )}

            {order.status ===
              "CONFIRMED" && (
              <button
                onClick={onProcess}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-950"
              >
                <Zap className="h-3.5 w-3.5" />
                Process
              </button>
            )}

            {order.status ===
              "PROCESSING" && (
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-bold text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Complete
              </button>
            )}

            {order.status !==
              "COMPLETED" &&
              order.status !==
                "CANCELLED" && (
                <button
                  onClick={onPayment}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Payment
                </button>
              )}
          </div>
        </div>

        {/* CUSTOMER */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard
            title="Company"
            value={
              getName(order.company) ||
              "—"
            }
            subtitle={
              order.company?.email
            }
          />

          <InfoCard
            title="Contact"
            value={
              getName(order.contact) ||
              "—"
            }
            subtitle={
              order.contact?.email
            }
          />

          <InfoCard
            title="Owner"
            value={
              getName(order.owner) ||
              "—"
            }
            subtitle={
              order.owner?.email
            }
          />
        </div>

        {/* DATES */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniMetric
            label="Order Date"
            value={dateFormat(
              order.orderDate
            )}
          />

          <MiniMetric
            label="Expected Delivery"
            value={dateFormat(
              order.expectedDeliveryDate
            )}
          />

          <MiniMetric
            label="Actual Delivery"
            value={dateFormat(
              order.actualDeliveryDate
            )}
          />

          <MiniMetric
            label="Payment Terms"
            value={
              order.paymentTerms
                ?.replace(
                  /_/g,
                  " "
                ) || "—"
            }
          />
        </div>

        {/* ITEMS */}

        <section>
          <SectionTitle
            icon={Package}
            title="Items"
          />

          <div className="overflow-hidden rounded-xl border border-white/[0.07]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.025]">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-600">
                      Product
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                      Discount
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                      Tax
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {order.items?.map(
                    (item, index) => (
                      <tr
                        key={
                          item._id ||
                          index
                        }
                        className="border-b border-white/[0.045]"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-300">
                            {getName(
                              item.product
                            ) ||
                              item.description ||
                              "Item"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-600">
                            {
                              item.description
                            }
                          </p>
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-400">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-400">
                          {money(
                            item.unitPrice,
                            currency
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-500">
                          {item.discountRate ||
                            0}
                          %
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-500">
                          {item.taxRate ||
                            0}
                          %
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                          {money(
                            item.lineTotal,
                            currency
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* TOTAL */}

        <div className="flex justify-end">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <TotalLine
              label="Subtotal"
              value={money(
                order.subtotal,
                currency
              )}
            />

            <TotalLine
              label="Discount"
              value={`-${money(
                order.discountTotal,
                currency
              )}`}
            />

            <TotalLine
              label="Tax"
              value={money(
                order.taxTotal,
                currency
              )}
            />

            <div className="my-3 border-t border-white/[0.07]" />

            <TotalLine
              label="Grand Total"
              value={money(
                order.grandTotal,
                currency
              )}
              strong
            />

            <TotalLine
              label="Paid"
              value={money(
                order.amountPaid,
                currency
              )}
            />

            <TotalLine
              label="Balance Due"
              value={money(
                order.balanceDue,
                currency
              )}
              strong
            />
          </div>
        </div>

        {/* ADDRESSES */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoCard
            title="Billing Address"
            value={
              order.billingAddress ||
              "—"
            }
          />

          <InfoCard
            title="Shipping Address"
            value={
              order.shippingAddress ||
              "—"
            }
          />
        </div>

        {/* NOTES */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoCard
            title="Customer Notes"
            value={
              order.customerNotes ||
              "—"
            }
          />

          <InfoCard
            title="Internal Notes"
            value={
              order.internalNotes ||
              "—"
            }
          />
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   GENERIC COMPONENTS
========================================================= */

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b111d] shadow-[0_30px_120px_rgba(0,0,0,0.55)] ${
          wide
            ? "max-w-6xl"
            : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs text-slate-600">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
        {required && (
          <span className="ml-1 text-red-400">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035]">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>

      <h3 className="text-sm font-bold text-white">
        {title}
      </h3>
    </div>
  );
}

function TotalLine({
  label,
  value,
  strong = false,
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={
          strong
            ? "font-semibold text-slate-300"
            : "text-xs text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "font-bold text-white"
            : "text-sm text-slate-300"
        }
      >
        {value}
      </span>
    </div>
  );
}

function InfoCard({
  title,
  value,
  subtitle,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-300">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  title,
  onClick,
  icon: Icon,
  loading,
  danger = false,
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={loading}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:opacity-40 ${
        danger
          ? "border-red-500/10 bg-red-500/[0.04] text-red-400 hover:bg-red-500/10"
          : "border-white/[0.07] bg-white/[0.025] text-slate-500 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#111827] px-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-white/[0.15]"
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  objectOptions = false,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#111827] px-3 text-xs text-slate-300 outline-none"
      >
        <option value="">
          All
        </option>

        {options.map((option) => {
          const optionValue =
            objectOptions
              ? getId(option)
              : option;

          const optionLabel =
            objectOptions
              ? getName(option)
              : option;

          return (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function TableLoading() {
  return (
    <>
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <tr
            key={index}
            className="border-b border-white/[0.045]"
          >
            {Array.from({
              length: 7,
            }).map(
              (_, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-5 py-5"
                >
                  <div className="h-4 animate-pulse rounded bg-white/[0.045]" />
                </td>
              )
            )}
          </tr>
        )
      )}
    </>
  );
}