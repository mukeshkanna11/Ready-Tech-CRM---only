import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Search,
  Plus,
  RefreshCw,
  CreditCard,
  Wallet,
  Banknote,
  Building2,
  Smartphone,
  Receipt,
  Eye,
  X,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Ban,
  ArrowUpRight,
  CalendarDays,
  Undo2,
  Hash,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Check,
  IndianRupee,
} from "lucide-react";

import API from "../services/api";

/*
  Backend routes (Backend/src/routes/payment.routes.js):

  POST   /payments
  GET    /payments
  GET    /payments/:id
  GET    /payments/invoice/:invoiceId
  PATCH  /payments/:id/cancel
*/

/* =========================================================
   CONSTANTS
   ========================================================= */

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Cash",
    icon: Banknote,
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: Building2,
  },
  {
    value: "UPI",
    label: "UPI",
    icon: Smartphone,
  },
  {
    value: "CARD",
    label: "Card",
    icon: CreditCard,
  },
  {
    value: "CHEQUE",
    label: "Cheque",
    icon: FileText,
  },
  {
    value: "OTHER",
    label: "Other",
    icon: Wallet,
  },
];

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400",
    icon: Clock3,
  },
  REFUNDED: {
    label: "Refunded",
    className:
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400",
    icon: Undo2,
  },
  FAILED: {
    label: "Failed",
    className:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400",
    icon: AlertCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/40 dark:text-slate-400",
    icon: Ban,
  },
};

const initialForm = {
  invoice: "",
  amount: "",
  paymentMethod: "BANK_TRANSFER",
  paymentDate: new Date().toISOString().slice(0, 10),
  transactionReference: "",
  notes: "",
};

/* =========================================================
   HELPERS
   ========================================================= */

const formatCurrency = (value = 0, currency = "INR") => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPaymentMethod = (method) => {
  return (
    PAYMENT_METHODS.find((item) => item.value === method) ||
    PAYMENT_METHODS.find((item) => item.value === "OTHER")
  );
};

const getStatus = (status) => {
  return (
    STATUS_CONFIG[String(status || "").toUpperCase()] ||
    STATUS_CONFIG.PENDING
  );
};

const normalizeList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.data?.payments)) return data.data.payments;

  return [];
};

const normalizeItem = (response) => {
  const data = response?.data;

  return data?.data || data?.payment || data;
};

const getInvoiceId = (payment) => {
  if (!payment?.invoice) return "";

  if (typeof payment.invoice === "string") {
    return payment.invoice;
  }

  return payment.invoice?._id || payment.invoice?.id || "";
};

const getInvoiceNumber = (payment) => {
  if (!payment?.invoice) return "—";

  if (typeof payment.invoice === "string") {
    return payment.invoice;
  }

  return (
    payment.invoice?.invoiceNumber ||
    payment.invoice?.number ||
    payment.invoice?.invoiceNo ||
    payment.invoice?._id ||
    "—"
  );
};

const getReference = (payment) => {
  return (
    payment?.transactionReference ||
    payment?.chequeNumber ||
    ""
  );
};

const getInvoiceBalance = (invoice) => {
  const balance = Number(
    invoice?.balanceDue ??
      Number(invoice?.grandTotal || 0) -
        Number(invoice?.amountPaid || 0)
  );

  return Number.isFinite(balance) && balance > 0
    ? balance
    : 0;
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function Payments() {
  const [payments, setPayments] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] =
    useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] =
    useState(false);

  const [invoiceHistory, setInvoiceHistory] =
    useState(null);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [selectedPayment, setSelectedPayment] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [copied, setCopied] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useState(null);

  /* =======================================================
     TOAST
     ======================================================= */

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  /* =======================================================
     FETCH PAYMENTS
     ======================================================= */

  const fetchPayments = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = {
          page,
          limit: pageSize,
          sortBy: "paymentDate",
          sortOrder: "desc",
        };

        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        if (statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        if (methodFilter !== "ALL") {
          params.paymentMethod = methodFilter;
        }

        const response = await API.get("/payments", {
          params,
        });

        setPayments(normalizeList(response));

        setPagination(
          response.data?.pagination || {
            page,
            limit: pageSize,
            total: 0,
            totalPages: 1,
          }
        );

        setError("");
      } catch (err) {
        console.error("Failed to fetch payments:", err);

        setError(
          err?.crmMessage ||
            "Unable to load payments. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      pageSize,
      debouncedSearch,
      statusFilter,
      methodFilter,
    ]
  );

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  /* =======================================================
     SEARCH DEBOUNCE
     ======================================================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  /* =======================================================
     INVOICES (FOR PAYMENT FORM)
     ======================================================= */

  const loadInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true);

      const response = await API.get("/invoices", {
        params: {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });

      const data = response?.data;

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setInvoices(
        list.filter(
          (invoice) =>
            String(
              invoice?.status || ""
            ).toUpperCase() !== "CANCELLED"
        )
      );
    } catch (err) {
      console.error("Failed to load invoices:", err);

      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  const openCreateModal = () => {
    setForm(initialForm);
    setShowCreateModal(true);
    loadInvoices();
  };

  const selectedInvoice = useMemo(() => {
    if (!form.invoice) return null;

    return (
      invoices.find(
        (invoice) =>
          String(invoice?._id || invoice?.id) ===
          String(form.invoice)
      ) || null
    );
  }, [invoices, form.invoice]);

  /* =======================================================
     DATE FILTER (BACKEND HAS NO DATE PARAM)
     ======================================================= */

  const filteredPayments = useMemo(() => {
    if (!dateFilter) return payments;

    return payments.filter(
      (payment) =>
        String(
          payment.paymentDate ||
            payment.createdAt ||
            ""
        ).slice(0, 10) === dateFilter
    );
  }, [payments, dateFilter]);

  /* =======================================================
     SUMMARY
     ======================================================= */

  const summary = useMemo(() => {
    const activePayments = payments.filter(
      (payment) =>
        String(payment.status || "").toUpperCase() !== "CANCELLED"
    );

    const total = activePayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const completed = activePayments.filter((payment) => {
      const status = String(payment.status || "").toUpperCase();

      return status === "COMPLETED" || status === "PAID";
    });

    const pending = activePayments.filter(
      (payment) =>
        String(payment.status || "").toUpperCase() === "PENDING"
    );

    const cancelled = payments.filter(
      (payment) =>
        String(payment.status || "").toUpperCase() === "CANCELLED"
    );

    return {
      total,
      completedAmount: completed.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
      pendingAmount: pending.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
      transactionCount: payments.length,
      cancelledCount: cancelled.length,
    };
  }, [payments]);

  /* =======================================================
     PAGINATION (SERVER SIDE)
     ======================================================= */

  const totalPages = Math.max(
    1,
    Number(pagination.totalPages) || 1
  );

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  /* =======================================================
     CREATE PAYMENT
     ======================================================= */

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    if (!form.invoice.trim()) {
      showToast("Please select an invoice.", "error");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      showToast("Enter a valid payment amount.", "error");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        invoice: form.invoice.trim(),
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        transactionReference:
          form.transactionReference.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      await API.post("/payments", payload);

      setForm(initialForm);
      setShowCreateModal(false);

      if (page === 1) {
        await fetchPayments(true);
      } else {
        setPage(1);
      }

      loadInvoices();

      showToast("Payment recorded successfully.");
    } catch (err) {
      console.error("Create payment error:", err);

      showToast(
        err?.crmMessage ||
          "Unable to create payment.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     VIEW PAYMENT
     ======================================================= */

  const handleViewPayment = async (payment) => {
    const paymentId = payment?._id || payment?.id;

    if (!paymentId) {
      setSelectedPayment(payment);
      setShowDetailsModal(true);
      return;
    }

    try {
      const response = await API.get(
        `/payments/${paymentId}`
      );

      setSelectedPayment(normalizeItem(response));
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Payment details error:", err);

      setSelectedPayment(payment);
      setShowDetailsModal(true);
    }
  };

  /* =======================================================
     INVOICE PAYMENT HISTORY
     ======================================================= */

  const openInvoiceHistory = async (payment) => {
    const invoiceId = getInvoiceId(payment);

    if (!invoiceId) {
      showToast(
        "This payment has no linked invoice.",
        "error"
      );
      return;
    }

    try {
      setHistoryLoading(true);
      setShowHistoryModal(true);
      setInvoiceHistory(null);

      const response = await API.get(
        `/payments/invoice/${invoiceId}`
      );

      const data =
        response?.data?.data || response?.data || {};

      setInvoiceHistory({
        invoice: data.invoice || null,
        payments: Array.isArray(data.payments)
          ? data.payments
          : [],
      });
    } catch (err) {
      console.error("Invoice history error:", err);

      setShowHistoryModal(false);

      showToast(
        err?.crmMessage ||
          "Unable to load invoice payment history.",
        "error"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  /* =======================================================
     CANCEL PAYMENT
     ======================================================= */

  const openCancelModal = (payment) => {
    setSelectedPayment(payment);
    setShowCancelModal(true);
  };

  const handleCancelPayment = async () => {
    const paymentId =
      selectedPayment?._id || selectedPayment?.id;

    if (!paymentId) {
      showToast("Payment ID is missing.", "error");
      return;
    }

    try {
      setCanceling(true);

      await API.patch(
        `/payments/${paymentId}/cancel`
      );

      setShowCancelModal(false);
      setSelectedPayment(null);

      await fetchPayments(true);

      loadInvoices();

      showToast("Payment cancelled successfully.");
    } catch (err) {
      console.error("Cancel payment error:", err);

      showToast(
        err?.crmMessage ||
          "Unable to cancel payment.",
        "error"
      );
    } finally {
      setCanceling(false);
    }
  };

  /* =======================================================
     COPY
     ======================================================= */

  const copyToClipboard = async (value, key) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(String(value));

      setCopied(key);

      setTimeout(() => {
        setCopied("");
      }, 1600);
    } catch {
      showToast("Unable to copy.", "error");
    }
  };

  /* =======================================================
     RESET FILTERS
     ======================================================= */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setDateFilter("");
    setPage(1);
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Wallet className="h-4 w-4" />
              Finance
              <span>/</span>
              Payments
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Payments
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track collections, payment activity and invoice settlements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchPayments(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total collected"
            value={formatCurrency(summary.total)}
            subtitle={`${summary.transactionCount} of ${
              pagination.total || summary.transactionCount
            } transactions`}
            icon={Wallet}
            trend="Current page"
          />

          <SummaryCard
            title="Completed"
            value={formatCurrency(summary.completedAmount)}
            subtitle="Successfully received"
            icon={CheckCircle2}
            trend="Settled payments"
            positive
          />

          <SummaryCard
            title="Pending"
            value={formatCurrency(summary.pendingAmount)}
            subtitle="Awaiting completion"
            icon={Clock3}
            trend="Requires attention"
          />

          <SummaryCard
            title="Cancelled"
            value={summary.cancelledCount}
            subtitle="Cancelled transactions"
            icon={Ban}
            trend="Excluded from collection"
          />
        </div>

        {/* =================================================
            FILTER TOOLBAR
        ================================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => fetchPayments(true)}
              className="shrink-0 rounded-lg px-3 py-1 text-xs font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              {/* Search */}

              <div className="relative min-w-0 flex-1 xl:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    handleSearchChange(
                      event.target.value
                    )
                  }
                  placeholder="Search payment no, reference, bank or cheque no..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:focus:border-slate-600 dark:focus:bg-slate-800 dark:focus:ring-slate-800"
                />
              </div>

              {/* Status */}

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-slate-800"
              >
                <option value="ALL">All statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>

              {/* Method */}

              <select
                value={methodFilter}
                onChange={(event) => {
                  setMethodFilter(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-slate-800"
              >
                <option value="ALL">All methods</option>

                {PAYMENT_METHODS.map((method) => (
                  <option
                    key={method.value}
                    value={method.value}
                  >
                    {method.label}
                  </option>
                ))}
              </select>

              {/* Date */}

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-slate-800"
                />
              </div>

              {(search ||
                statusFilter !== "ALL" ||
                methodFilter !== "ALL" ||
                dateFilter) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-11 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left dark:border-slate-800 dark:bg-slate-800/40">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment
                  </th>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Invoice
                  </th>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Method
                  </th>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Reference
                  </th>

                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <PaymentTableSkeleton />
                ) : filteredPayments.length === 0 ? (
                  <EmptyState
                    hasFilters={
                      Boolean(search) ||
                      statusFilter !== "ALL" ||
                      methodFilter !== "ALL" ||
                      Boolean(dateFilter)
                    }
                    onCreate={openCreateModal}
                    onClear={resetFilters}
                  />
                ) : (
                  filteredPayments.map((payment) => (
                    <PaymentRow
                      key={payment._id || payment.id}
                      payment={payment}
                      onView={handleViewPayment}
                      onCancel={openCancelModal}
                      onInvoiceHistory={
                        openInvoiceHistory
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          {!loading && filteredPayments.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>
                  Showing{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {(page - 1) * pageSize + 1}
                  </strong>{" "}
                  –{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {(page - 1) * pageSize +
                      payments.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {pagination.total || payments.length}
                  </strong>
                </span>

                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(
                      Number(event.target.value)
                    );
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                  {page}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          CREATE PAYMENT MODAL
      ===================================================== */}

      {showCreateModal && (
        <Modal
          title="Record payment"
          subtitle="Add a payment against an invoice."
          onClose={() => !submitting && setShowCreateModal(false)}
          size="lg"
        >
          <form
            onSubmit={handleCreatePayment}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Receipt className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Invoice payment
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    The payment will be linked directly to the selected
                    invoice and reflected in its payment balance.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Invoice"
                required
                icon={Receipt}
                hint={
                  invoicesLoading ? "Loading..." : undefined
                }
              >
                <select
                  value={form.invoice}
                  onChange={(event) => {
                    const invoiceId = event.target.value;

                    const invoice = invoices.find(
                      (item) =>
                        String(
                          item?._id || item?.id
                        ) === String(invoiceId)
                    );

                    const balance =
                      getInvoiceBalance(invoice);

                    setForm((previous) => ({
                      ...previous,
                      invoice: invoiceId,
                      amount: balance
                        ? String(balance)
                        : previous.amount,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">
                    {invoicesLoading
                      ? "Loading invoices..."
                      : "Select an invoice"}
                  </option>

                  {invoices.map((invoice) => {
                    const invoiceId =
                      invoice?._id || invoice?.id;

                    return (
                      <option
                        key={invoiceId}
                        value={invoiceId}
                      >
                        {invoice?.invoiceNumber ||
                          invoiceId}{" "}
                        — Balance{" "}
                        {formatCurrency(
                          getInvoiceBalance(invoice),
                          invoice?.currency
                        )}
                      </option>
                    );
                  })}
                </select>

                {selectedInvoice && (
                  <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Total{" "}
                    {formatCurrency(
                      selectedInvoice.grandTotal,
                      selectedInvoice.currency
                    )}{" "}
                    · Paid{" "}
                    {formatCurrency(
                      selectedInvoice.amountPaid,
                      selectedInvoice.currency
                    )}{" "}
                    · Balance{" "}
                    {formatCurrency(
                      getInvoiceBalance(selectedInvoice),
                      selectedInvoice.currency
                    )}
                  </p>
                )}
              </FormField>

              <FormField
                label="Payment amount"
                required
                icon={IndianRupee}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={
                      selectedInvoice
                        ? getInvoiceBalance(
                            selectedInvoice
                          ) || undefined
                        : undefined
                    }
                    value={form.amount}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </FormField>

              <FormField
                label="Payment method"
                required
                icon={CreditCard}
              >
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      paymentMethod: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option
                      key={method.value}
                      value={method.value}
                    >
                      {method.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Payment date"
                required
                icon={CalendarDays}
              >
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      paymentDate: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField
              label="Reference number"
              icon={Hash}
              hint="Optional"
            >
              <input
                value={form.transactionReference}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    transactionReference:
                      event.target.value,
                  }))
                }
                placeholder="Transaction / cheque / UTR reference"
                className={inputClass}
              />
            </FormField>

            <FormField
              label="Notes"
              icon={FileText}
              hint="Optional"
            >
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                placeholder="Add internal notes..."
                className={`${inputClass} resize-none py-3`}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowCreateModal(false)}
                className="h-11 rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <>
                    <Spinner />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          PAYMENT DETAILS MODAL
      ===================================================== */}

      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayment(null);
          }}
          onCancel={() => {
            setShowDetailsModal(false);
            openCancelModal(selectedPayment);
          }}
          onCopy={copyToClipboard}
          copied={copied}
        />
      )}

      {/* =====================================================
          INVOICE PAYMENT HISTORY MODAL
      ===================================================== */}

      {showHistoryModal && (
        <Modal
          title="Invoice payment history"
          subtitle="All payments recorded against this invoice."
          onClose={() => {
            setShowHistoryModal(false);
            setInvoiceHistory(null);
          }}
          size="lg"
        >
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  />
                )
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {invoiceHistory?.invoice && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Receipt className="h-4 w-4" />
                      {invoiceHistory.invoice
                        .invoiceNumber || "Invoice"}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset ${
                        getStatus(
                          invoiceHistory.invoice.status
                        ).className
                      }`}
                    >
                      {invoiceHistory.invoice.status ||
                        "—"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Invoice total
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        {formatCurrency(
                          invoiceHistory.invoice
                            .grandTotal,
                          invoiceHistory.invoice.currency
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Amount paid
                      </p>

                      <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(
                          invoiceHistory.invoice
                            .amountPaid,
                          invoiceHistory.invoice.currency
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Balance due
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        {formatCurrency(
                          invoiceHistory.invoice
                            .balanceDue,
                          invoiceHistory.invoice.currency
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {invoiceHistory?.payments?.length ? (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {invoiceHistory.payments.map(
                    (item) => {
                      const itemStatus = getStatus(
                        item.status
                      );

                      const itemMethod =
                        getPaymentMethod(
                          item.paymentMethod
                        );

                      return (
                        <div
                          key={item._id || item.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {item.paymentNumber ||
                                String(
                                  item._id || ""
                                ).slice(-6)}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {formatDate(
                                item.paymentDate
                              )}{" "}
                              · {itemMethod.label}
                              {getReference(item)
                                ? ` · ${getReference(
                                    item
                                  )}`
                                : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${itemStatus.className}`}
                            >
                              {itemStatus.label}
                            </span>

                            <strong className="text-sm">
                              {formatCurrency(
                                item.amount,
                                item.currency
                              )}
                            </strong>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                  No payments recorded for this invoice
                  yet.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* =====================================================
          CANCEL MODAL
      ===================================================== */}

      {showCancelModal && selectedPayment && (
        <Modal
          title="Cancel payment"
          subtitle="This action should only be used for incorrect or invalid payment entries."
          onClose={() =>
            !canceling && setShowCancelModal(false)
          }
          size="md"
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-300">
                    Cancel this payment?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700/80 dark:text-red-300/70">
                    The payment will be marked as cancelled and should no
                    longer contribute to the invoice's paid amount.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Payment amount
                </span>

                <strong className="text-lg">
                  {formatCurrency(
                    selectedPayment.amount,
                    selectedPayment.currency
                  )}
                </strong>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Invoice
                </span>

                <strong className="text-sm">
                  {getInvoiceNumber(selectedPayment)}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <button
                type="button"
                disabled={canceling}
                onClick={() => setShowCancelModal(false)}
                className="h-11 rounded-xl px-5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Keep Payment
              </button>

              <button
                type="button"
                disabled={canceling}
                onClick={handleCancelPayment}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canceling ? (
                  <>
                    <Spinner />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Cancel Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] w-[min(420px,calc(100vw-2rem))]">
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl dark:bg-slate-900 ${
              toast.type === "error"
                ? "border-red-200 dark:border-red-500/20"
                : "border-emerald-200 dark:border-emerald-500/20"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                toast.type === "error"
                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>

            <div className="pt-1">
              <p className="text-sm font-semibold">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
   ========================================================= */

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  positive,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl transition group-hover:scale-125 dark:bg-slate-800/60" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon className="h-5 w-5" />
          </div>

          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              positive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {positive && (
              <ArrowUpRight className="h-3 w-3" />
            )}
            {trend}
          </div>
        </div>

        <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight">
          {value}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PAYMENT ROW
   ========================================================= */

function PaymentRow({
  payment,
  onView,
  onCancel,
  onInvoiceHistory,
}) {
  const method = getPaymentMethod(payment.paymentMethod);
  const MethodIcon = method.icon;

  const status = getStatus(payment.status);
  const StatusIcon = status.icon;

  const paymentId = payment._id || payment.id;

  return (
    <tr className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
      {/* Payment */}

      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <CreditCard className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">
                {payment.paymentNumber || "Payment"}
              </p>

              {!payment.paymentNumber && paymentId && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-slate-800">
                  {String(paymentId).slice(-6)}
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-slate-400">
              {formatDate(payment.createdAt)}
            </p>
          </div>
        </div>
      </td>

      {/* Invoice */}

      <td className="px-5 py-4">
        <button
          type="button"
          onClick={() => onInvoiceHistory(payment)}
          title="View invoice payment history"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Receipt className="h-3.5 w-3.5" />
          {getInvoiceNumber(payment)}
        </button>
      </td>

      {/* Date */}

      <td className="px-5 py-4">
        <p className="text-sm font-medium">
          {formatDate(
            payment.paymentDate || payment.createdAt
          )}
        </p>
      </td>

      {/* Method */}

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <MethodIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </div>

          <span className="text-sm font-semibold">
            {method.label}
          </span>
        </div>
      </td>

      {/* Reference */}

      <td className="px-5 py-4">
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {getReference(payment) || "—"}
        </span>
      </td>

      {/* Amount */}

      <td className="px-5 py-4 text-right">
        <p className="text-sm font-bold">
          {formatCurrency(
            payment.amount,
            payment.currency
          )}
        </p>
      </td>

      {/* Status */}

      <td className="px-5 py-4 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </td>

      {/* Actions */}

      <td className="px-5 py-4">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onView(payment)}
            title="View payment"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Eye className="h-4 w-4" />
          </button>

          {String(payment.status || "").toUpperCase() !==
            "CANCELLED" && (
            <button
              type="button"
              onClick={() => onCancel(payment)}
              title="Cancel payment"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   PAYMENT DETAILS
   ========================================================= */

function PaymentDetailsModal({
  payment,
  onClose,
  onCancel,
  onCopy,
  copied,
}) {
  const method = getPaymentMethod(payment.paymentMethod);
  const MethodIcon = method.icon;

  const status = getStatus(payment.status);
  const StatusIcon = status.icon;

  const paymentId = payment._id || payment.id;

  return (
    <Modal
      title="Payment details"
      subtitle="Review the complete payment transaction."
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">
        {/* Hero */}

        <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white dark:bg-slate-800">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <CreditCard className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium text-white/50">
                  Payment amount
                </p>

                <p className="mt-0.5 text-3xl font-bold tracking-tight">
                  {formatCurrency(
                    payment.amount,
                    payment.currency
                  )}
                </p>

                {payment.paymentNumber && (
                  <p className="mt-1 text-xs font-semibold text-white/60">
                    {payment.paymentNumber}
                  </p>
                )}
              </div>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${status.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>
        </div>

        {/* Details */}

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="Invoice"
            value={getInvoiceNumber(payment)}
            icon={Receipt}
            copyValue={getInvoiceId(payment)}
            copyKey="invoice"
            onCopy={onCopy}
            copied={copied}
          />

          <DetailItem
            label="Payment method"
            value={method.label}
            icon={MethodIcon}
          />

          <DetailItem
            label="Payment date"
            value={formatDate(payment.paymentDate)}
            icon={CalendarDays}
          />

          <DetailItem
            label="Reference number"
            value={getReference(payment) || "—"}
            icon={Hash}
            copyValue={getReference(payment)}
            copyKey="reference"
            onCopy={onCopy}
            copied={copied}
          />

          {payment.bankName && (
            <DetailItem
              label="Bank"
              value={payment.bankName}
              icon={Building2}
            />
          )}

          <DetailItem
            label="Payment ID"
            value={paymentId || "—"}
            icon={CreditCard}
            copyValue={paymentId}
            copyKey="payment"
            onCopy={onCopy}
            copied={copied}
            full
          />
        </div>

        {payment.notes && (
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </div>

            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {payment.notes}
            </p>
          </div>
        )}

        {/* Footer */}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="text-xs text-slate-400">
            Created {formatDate(payment.createdAt)}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>

            {String(payment.status || "").toUpperCase() !==
              "CANCELLED" && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              >
                <Ban className="h-4 w-4" />
                Cancel Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   DETAIL ITEM
   ========================================================= */

function DetailItem({
  label,
  value,
  icon: Icon,
  copyValue,
  copyKey,
  onCopy,
  copied,
  full,
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-bold">
          {value}
        </p>

        {copyValue && onCopy && (
          <button
            type="button"
            onClick={() =>
              onCopy(copyValue, copyKey)
            }
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
            title="Copy"
          >
            {copied === copyKey ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
   ========================================================= */

function FormField({
  label,
  required,
  icon: Icon,
  hint,
  children,
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
          {required && (
            <span className="text-red-500">*</span>
          )}
        </label>

        {hint && (
          <span className="text-[11px] font-medium text-slate-400">
            {hint}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   MODAL
   ========================================================= */

function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = "md",
}) {
  const sizeClass =
    size === "lg"
      ? "max-w-2xl"
      : size === "xl"
      ? "max-w-4xl"
      : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative max-h-[92vh] w-full ${sizeClass} overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-100px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function EmptyState({
  hasFilters,
  onCreate,
  onClear,
}) {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Wallet className="h-7 w-7" />
          </div>

          <h3 className="mt-5 text-base font-bold">
            {hasFilters
              ? "No matching payments"
              : "No payments yet"}
          </h3>

          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            {hasFilters
              ? "Try adjusting your search or filters to find the payment you're looking for."
              : "Start recording payments against invoices to keep your collections up to date."}
          </p>

          <div className="mt-5 flex gap-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={onClear}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   SKELETON
   ========================================================= */

function PaymentTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 8 }).map((__, cell) => (
            <td
              key={cell}
              className="px-5 py-5"
            >
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* =========================================================
   SPINNER
   ========================================================= */

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

/* =========================================================
   GLOBAL INPUT STYLE
   ========================================================= */

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";