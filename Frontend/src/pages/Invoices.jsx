import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import API from "../services/api";

// ======================================================
// CONSTANTS
// ======================================================

const STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

const TAX_MODES = [
  {
    value: "CGST_SGST",
    label: "CGST + SGST (Intra-State)",
  },
  {
    value: "IGST",
    label: "IGST (Inter-State)",
  },
];

const STATUS_STYLES = {
  DRAFT:
    "border-slate-200 bg-slate-100 text-slate-700",
  SENT:
    "border-blue-200 bg-blue-50 text-blue-700",
  PARTIALLY_PAID:
    "border-amber-200 bg-amber-50 text-amber-700",
  PAID:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  OVERDUE:
    "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED:
    "border-slate-200 bg-slate-100 text-slate-500",
};

const PAGE_SIZE = 20;

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

const LABEL_CLASS =
  "mb-1.5 block text-xs font-semibold text-slate-700";

// ======================================================
// HELPERS
// ======================================================

const getId = (value) =>
  value?._id || value?.id || "";

const money = (amount, currency = "INR") =>
  `${currency} ${Number(amount || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateInput = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data))
    return response.data.data;

  return [];
};

const customerLabel = (invoice) => {
  if (invoice?.company?.name) {
    return invoice.company.name;
  }

  const contact = invoice?.contact;

  const name = [contact?.firstName, contact?.lastName]
    .filter(Boolean)
    .join(" ");

  return name || "—";
};

const emptyItem = () => ({
  product: "",
  description: "",
  hsnSac: "",
  quantity: 1,
  unit: "PCS",
  unitPrice: 0,
  discountRate: 0,
  taxRate: 18,
});

const emptyForm = () => ({
  company: "",
  contact: "",
  salesOrder: "",
  issueDate: toDateInput(new Date()),
  dueDate: "",
  currency: "INR",
  placeOfSupply: "",
  taxMode: "CGST_SGST",
  reverseCharge: false,
  status: "DRAFT",
  amountPaid: 0,
  notes: "",
  termsAndConditions: "",
  items: [emptyItem()],
});

// ======================================================
// FRONTEND PREVIEW OF TOTALS
// ======================================================
//
// Mirrors the backend calculation so the form can show
// live totals. The backend remains the source of truth.
//
// ======================================================

const round = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

const computeTotals = (items, taxMode) => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let taxTotal = 0;

  (items || []).forEach((item) => {
    const lineSubtotal =
      (Number(item.quantity) || 0) *
      (Number(item.unitPrice) || 0);

    const discount =
      lineSubtotal *
      ((Number(item.discountRate) || 0) / 100);

    const taxable = Math.max(0, lineSubtotal - discount);

    const tax =
      taxable * ((Number(item.taxRate) || 0) / 100);

    subtotal += lineSubtotal;
    discountTotal += discount;
    taxableTotal += taxable;
    taxTotal += tax;
  });

  subtotal = round(subtotal);
  discountTotal = round(discountTotal);
  taxableTotal = round(taxableTotal);
  taxTotal = round(taxTotal);

  const cgstTotal =
    taxMode === "IGST" ? 0 : round(taxTotal / 2);

  const sgstTotal =
    taxMode === "IGST" ? 0 : round(taxTotal - cgstTotal);

  return {
    subtotal,
    discountTotal,
    taxableTotal,
    taxTotal,
    cgstTotal,
    sgstTotal,
    igstTotal: taxMode === "IGST" ? taxTotal : 0,
    grandTotal: round(taxableTotal + taxTotal),
  };
};

const lineTotal = (item) => {
  const lineSubtotal =
    (Number(item.quantity) || 0) *
    (Number(item.unitPrice) || 0);

  const discount =
    lineSubtotal *
    ((Number(item.discountRate) || 0) / 100);

  const taxable = Math.max(0, lineSubtotal - discount);

  return round(
    taxable * (1 + (Number(item.taxRate) || 0) / 100)
  );
};

// ======================================================
// SMALL COMPONENTS
// ======================================================

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        STATUS_STYLES[status] ||
        STATUS_STYLES.DRAFT
      }`}
    >
      {String(status || "DRAFT").replace("_", " ")}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint, required }) {
  return (
    <div>
      <label className={LABEL_CLASS}>
        {label}
        {required && (
          <span className="ml-0.5 text-rose-500">*</span>
        )}
      </label>

      {children}

      {hint && (
        <p className="mt-1 text-[11px] text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6">
      <div
        className={`my-auto w-full rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          wide ? "max-w-5xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-600">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================
// PAGE
// ======================================================

function Invoices() {
  // ----------------------------------------------------
  // LIST STATE
  // ----------------------------------------------------

  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // ----------------------------------------------------
  // REFERENCE DATA
  // ----------------------------------------------------

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);

  // ----------------------------------------------------
  // MODALS
  // ----------------------------------------------------

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewing, setViewing] = useState(null);

  const [payingInvoice, setPayingInvoice] =
    useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [deleting, setDeleting] = useState(null);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertOrderId, setConvertOrderId] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState(false);
  const [toast, setToast] = useState(null);

  // ----------------------------------------------------
  // TOAST
  // ----------------------------------------------------

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(null),
      3200
    );

    return () => clearTimeout(timer);
  }, [toast]);

  // ----------------------------------------------------
  // SEARCH DEBOUNCE
  // ----------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // ----------------------------------------------------
  // LOAD INVOICES
  // ----------------------------------------------------

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: PAGE_SIZE,
        sort: "-createdAt",
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (status) {
        params.status = status;
      }

      const response = await API.get("/invoices", {
        params,
      });

      setInvoices(getArray(response.data));

      setPagination(
        response.data?.pagination || {
          page,
          totalPages: 0,
          total: 0,
        }
      );
    } catch (err) {
      setError(
        err?.crmMessage ||
          err?.message ||
          "Unable to load invoices."
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // ----------------------------------------------------
  // LOAD REFERENCE DATA
  // ----------------------------------------------------

  useEffect(() => {
    let active = true;

    const load = async () => {
      const requests = [
        API.get("/companies", {
          params: { limit: 100 },
        }),
        API.get("/contacts", {
          params: { limit: 100 },
        }),
        API.get("/products", {
          params: { limit: 100 },
        }),
        API.get("/sales-orders", {
          params: { limit: 100 },
        }),
      ];

      const results = await Promise.allSettled(
        requests
      );

      if (!active) return;

      const [
        companyResult,
        contactResult,
        productResult,
        orderResult,
      ] = results;

      if (companyResult.status === "fulfilled") {
        setCompanies(
          getArray(companyResult.value.data)
        );
      }

      if (contactResult.status === "fulfilled") {
        setContacts(
          getArray(contactResult.value.data)
        );
      }

      if (productResult.status === "fulfilled") {
        setProducts(
          getArray(productResult.value.data)
        );
      }

      if (orderResult.status === "fulfilled") {
        setSalesOrders(
          getArray(orderResult.value.data)
        );
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  // ----------------------------------------------------
  // STATS
  // ----------------------------------------------------

  const stats = useMemo(() => {
    const active = invoices.filter(
      (invoice) => invoice.status !== "CANCELLED"
    );

    return {
      count: pagination.total || invoices.length,

      value: active.reduce(
        (sum, invoice) =>
          sum + Number(invoice.grandTotal || 0),
        0
      ),

      paid: active.reduce(
        (sum, invoice) =>
          sum + Number(invoice.amountPaid || 0),
        0
      ),

      balance: active.reduce(
        (sum, invoice) =>
          sum + Number(invoice.balanceDue || 0),
        0
      ),
    };
  }, [invoices, pagination.total]);

  const currency = invoices[0]?.currency || "INR";

  // ----------------------------------------------------
  // FORM TOTALS
  // ----------------------------------------------------

  const formTotals = useMemo(
    () => computeTotals(form.items, form.taxMode),
    [form.items, form.taxMode]
  );

  // ----------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------

  const setField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const setItemField = (index, name, value) => {
    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        [name]: value,
      };

      return { ...previous, items };
    });
  };

  const applyProduct = (index, productId) => {
    const product = products.find(
      (candidate) => getId(candidate) === productId
    );

    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        product: productId,

        ...(product
          ? {
              description:
                product.name ||
                items[index].description,

              hsnSac:
                product.hsnSac ||
                product.hsn ||
                items[index].hsnSac,

              unit:
                product.unit ||
                items[index].unit,

              unitPrice:
                product.sellingPrice ??
                product.price ??
                product.unitPrice ??
                items[index].unitPrice,

              taxRate:
                product.taxRate ??
                product.gstRate ??
                items[index].taxRate,
            }
          : {}),
      };

      return { ...previous, items };
    });
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, emptyItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((previous) => ({
      ...previous,
      items:
        previous.items.length > 1
          ? previous.items.filter(
              (_, position) => position !== index
            )
          : previous.items,
    }));
  };

  // ----------------------------------------------------
  // OPEN CREATE / EDIT
  // ----------------------------------------------------

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (invoice) => {
    setEditing(invoice);
    setFormError("");

    setForm({
      company: getId(invoice.company),
      contact: getId(invoice.contact),
      salesOrder: getId(invoice.salesOrder),
      issueDate: toDateInput(invoice.issueDate),
      dueDate: toDateInput(invoice.dueDate),
      currency: invoice.currency || "INR",
      placeOfSupply: invoice.placeOfSupply || "",
      taxMode: invoice.taxMode || "CGST_SGST",
      reverseCharge: Boolean(invoice.reverseCharge),
      status: invoice.status || "DRAFT",
      amountPaid: Number(invoice.amountPaid || 0),
      notes: invoice.notes || "",
      termsAndConditions:
        invoice.termsAndConditions || "",

      items:
        (invoice.items || []).length > 0
          ? invoice.items.map((item) => ({
              product: getId(item.product),
              description: item.description || "",
              hsnSac: item.hsnSac || "",
              quantity: Number(item.quantity || 1),
              unit: item.unit || "PCS",
              unitPrice: Number(item.unitPrice || 0),
              discountRate: Number(
                item.discountRate || 0
              ),
              taxRate: Number(item.taxRate || 0),
            }))
          : [emptyItem()],
    });

    setShowForm(true);
  };

  // ----------------------------------------------------
  // SAVE
  // ----------------------------------------------------

  const saveInvoice = async () => {
    setFormError("");

    if (!form.company && !form.contact) {
      setFormError(
        "Select a customer company or contact."
      );
      return;
    }

    const validItems = form.items.filter(
      (item) =>
        Number(item.quantity) > 0 &&
        (item.description.trim() || item.product)
    );

    if (validItems.length === 0) {
      setFormError(
        "Add at least one item with a description and quantity."
      );
      return;
    }

    const payload = {
      company: form.company || undefined,
      contact: form.contact || undefined,
      salesOrder: form.salesOrder || undefined,

      issueDate: form.issueDate || undefined,
      dueDate: form.dueDate || undefined,

      currency: form.currency,
      placeOfSupply:
        form.placeOfSupply || undefined,
      taxMode: form.taxMode,
      reverseCharge: form.reverseCharge,
      status: form.status,

      amountPaid: Number(form.amountPaid) || 0,

      notes: form.notes || undefined,
      termsAndConditions:
        form.termsAndConditions || undefined,

      items: validItems.map((item) => ({
        product: item.product || undefined,
        description: item.description,
        hsnSac: item.hsnSac || undefined,
        quantity: Number(item.quantity),
        unit: item.unit || undefined,
        unitPrice: Number(item.unitPrice),
        discountRate:
          Number(item.discountRate) || 0,
        taxRate: Number(item.taxRate) || 0,
      })),
    };

    try {
      setSaving(true);

      if (editing) {
        await API.put(
          `/invoices/${getId(editing)}`,
          payload
        );

        showToast("Invoice updated successfully.");
      } else {
        await API.post("/invoices", payload);

        showToast("Invoice created successfully.");
      }

      setShowForm(false);
      loadInvoices();
    } catch (err) {
      setFormError(
        err?.crmMessage ||
          err?.response?.data?.message ||
          "Unable to save invoice."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // SALES ORDER -> INVOICE
  // ----------------------------------------------------

  const convertSalesOrder = async () => {
    if (!convertOrderId) return;

    try {
      setActionLoading(true);

      const response = await API.post(
        `/invoices/from-sales-order/${convertOrderId}`,
        {}
      );

      showToast(
        "Invoice created from sales order."
      );

      setConvertOpen(false);
      setConvertOrderId("");

      loadInvoices();

      const created = response.data?.data;

      if (created) {
        setViewing(created);
      }
    } catch (err) {
      showToast(
        err?.crmMessage ||
          err?.response?.data?.message ||
          "Unable to convert sales order.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // PAYMENT
  // ----------------------------------------------------

  const savePayment = async () => {
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Enter a valid amount.", "error");
      return;
    }

    try {
      setActionLoading(true);

      await API.patch(
        `/invoices/${getId(payingInvoice)}/payment`,
        { amountPaid: amount }
      );

      showToast("Payment recorded.");

      setPayingInvoice(null);
      setPaymentAmount("");

      loadInvoices();
    } catch (err) {
      showToast(
        err?.crmMessage ||
          err?.response?.data?.message ||
          "Unable to record payment.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // STATUS
  // ----------------------------------------------------

  const changeStatus = async (invoice, next) => {
    try {
      setActionLoading(true);

      await API.patch(
        `/invoices/${getId(invoice)}/status`,
        { status: next }
      );

      showToast(`Invoice marked ${next}.`);

      loadInvoices();
    } catch (err) {
      showToast(
        err?.crmMessage ||
          err?.response?.data?.message ||
          "Unable to update status.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // CANCEL
  // ----------------------------------------------------

  const cancelInvoice = async () => {
    try {
      setActionLoading(true);

      await API.patch(
        `/invoices/${getId(cancelling)}/cancel`,
        { cancellationReason: cancelReason }
      );

      showToast("Invoice cancelled.");

      setCancelling(null);
      setCancelReason("");

      loadInvoices();
    } catch (err) {
      showToast(
        err?.crmMessage ||
          err?.response?.data?.message ||
          "Unable to cancel invoice.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // DELETE
  // ----------------------------------------------------

  const deleteInvoice = async () => {
    try {
      setActionLoading(true);

      await API.delete(
        `/invoices/${getId(deleting)}`
      );

      showToast("Invoice deleted.");

      setDeleting(null);
      loadInvoices();
    } catch (err) {
      showToast(
        err?.crmMessage ||
          err?.response?.data?.message ||
          "Unable to delete invoice.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // PDF - DOWNLOAD / PRINT
  // ----------------------------------------------------
  //
  // The PDF endpoint is authenticated, so it is fetched
  // through the shared API client (which attaches the
  // token) and turned into a blob URL.
  //
  // ----------------------------------------------------

  const fetchPdfBlobUrl = async (invoice, download) => {
    const response = await API.get(
      `/invoices/${getId(invoice)}/pdf`,
      {
        params: download ? { download: 1 } : {},
        responseType: "blob",
      }
    );

    return URL.createObjectURL(
      new Blob([response.data], {
        type: "application/pdf",
      })
    );
  };

  const downloadPdf = async (invoice) => {
    try {
      setActionLoading(true);

      const url = await fetchPdfBlobUrl(
        invoice,
        true
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(
        () => URL.revokeObjectURL(url),
        10000
      );
    } catch (err) {
      showToast(
        err?.crmMessage ||
          "Unable to download the invoice PDF.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const printPdf = async (invoice) => {
    try {
      setActionLoading(true);

      const url = await fetchPdfBlobUrl(
        invoice,
        false
      );

      const frame =
        document.createElement("iframe");

      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;

      frame.onload = () => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch {
          // Fall back to opening the PDF in a tab.
          window.open(url, "_blank");
        }
      };

      document.body.appendChild(frame);

      setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      showToast(
        err?.crmMessage ||
          "Unable to print the invoice PDF.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  const openOrders = salesOrders.filter(
    (order) => order.status !== "CANCELLED"
  );

  return (
    <div className="min-h-full bg-slate-50">
      {/* ===================================================
          TOAST
      =================================================== */}

      {toast && (
        <div
          className={`fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
            toast.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <p className="text-sm font-medium">
            {toast.message}
          </p>
        </div>
      )}

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[1800px] px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
                <FileText className="h-6 w-6 text-slate-700" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Invoices
                </h1>

                <p className="mt-1 text-sm text-slate-600">
                  Raise GST invoices, track payments and
                  share PDF copies.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={loadInvoices}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>

              <button
                onClick={() => setConvertOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <ShoppingCart className="h-4 w-4" />
                From Sales Order
              </button>

              <button
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                New Invoice
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
            title="Total Invoices"
            value={stats.count}
            subtitle="All invoices"
            icon={FileText}
          />

          <StatCard
            title="Invoiced Value"
            value={money(stats.value, currency)}
            subtitle="This page, excl. cancelled"
            icon={CircleDollarSign}
          />

          <StatCard
            title="Collected"
            value={money(stats.paid, currency)}
            subtitle="Amount received"
            icon={CheckCircle2}
          />

          <StatCard
            title="Outstanding"
            value={money(stats.balance, currency)}
            subtitle="Balance due"
            icon={Clock3}
          />
        </div>

        {/* TOOLBAR */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search invoice number..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-11 min-w-[150px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              >
                <option value="">All Status</option>

                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

            <p className="text-sm font-medium text-rose-800">
              {error}
            </p>
          </div>
        )}

        {/* TABLE */}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {[
                    "Invoice",
                    "Customer",
                    "Issue Date",
                    "Due Date",
                    "Grand Total",
                    "Balance",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600"
                    >
                      {heading}
                    </th>
                  ))}

                  <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center text-sm text-slate-500"
                    >
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-20 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                        <FileText className="h-6 w-6 text-slate-500" />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-700">
                        No invoices found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Create a new invoice or change
                        your filters.
                      </p>

                      <button
                        onClick={openCreate}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Create Invoice
                      </button>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      key={getId(invoice)}
                      className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {invoice.invoiceNumber}
                        </p>

                        {invoice.salesOrder
                          ?.salesOrderNumber && (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            SO:{" "}
                            {
                              invoice.salesOrder
                                .salesOrderNumber
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {customerLabel(invoice)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(invoice.issueDate)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(invoice.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                        {money(
                          invoice.grandTotal,
                          invoice.currency
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <span
                          className={
                            Number(
                              invoice.balanceDue
                            ) > 0
                              ? "font-semibold text-rose-600"
                              : "font-semibold text-emerald-600"
                          }
                        >
                          {money(
                            invoice.balanceDue,
                            invoice.currency
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={invoice.status}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton
                            title="View"
                            onClick={() =>
                              setViewing(invoice)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </IconButton>

                          <IconButton
                            title="Download PDF"
                            onClick={() =>
                              downloadPdf(invoice)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </IconButton>

                          <IconButton
                            title="Print"
                            onClick={() =>
                              printPdf(invoice)
                            }
                          >
                            <Printer className="h-4 w-4" />
                          </IconButton>

                          {invoice.status !==
                            "CANCELLED" && (
                            <>
                              <IconButton
                                title="Edit"
                                onClick={() =>
                                  openEdit(invoice)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>

                              <IconButton
                                title="Record payment"
                                onClick={() => {
                                  setPayingInvoice(
                                    invoice
                                  );

                                  setPaymentAmount(
                                    String(
                                      invoice.amountPaid ||
                                        0
                                    )
                                  );
                                }}
                              >
                                <Wallet className="h-4 w-4" />
                              </IconButton>

                              <IconButton
                                title="Cancel invoice"
                                onClick={() => {
                                  setCancelling(
                                    invoice
                                  );
                                  setCancelReason("");
                                }}
                              >
                                <Ban className="h-4 w-4" />
                              </IconButton>
                            </>
                          )}

                          <IconButton
                            title="Delete"
                            danger
                            onClick={() =>
                              setDeleting(invoice)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {invoices.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {pagination.total || 0}
              </span>{" "}
              invoices
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                className="h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-xs font-medium text-slate-600">
                Page {pagination.page || page} of{" "}
                {pagination.totalPages || 1}
              </span>

              <button
                disabled={
                  loading ||
                  page >=
                    (pagination.totalPages || 1)
                }
                onClick={() =>
                  setPage((current) => current + 1)
                }
                className="h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================
          CREATE / EDIT FORM
      =================================================== */}

      {showForm && (
        <ModalShell
          wide
          title={
            editing
              ? `Edit ${editing.invoiceNumber}`
              : "New Invoice"
          }
          subtitle="Totals, tax and balance are calculated by the server."
          onClose={() => setShowForm(false)}
          footer={
            <>
              <button
                onClick={() => setShowForm(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={saveInvoice}
                disabled={saving}
                className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Invoice"
                    : "Create Invoice"}
              </button>
            </>
          }
        >
          {formError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

              <p className="text-sm font-medium text-rose-800">
                {formError}
              </p>
            </div>
          )}

          {/* CUSTOMER */}

          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Customer
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer Company" required>
              <select
                value={form.company}
                onChange={(event) =>
                  setField(
                    "company",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              >
                <option value="">
                  Select a company
                </option>

                {companies.map((company) => (
                  <option
                    key={getId(company)}
                    value={getId(company)}
                  >
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Contact Person"
              hint="Optional, printed on the invoice."
            >
              <select
                value={form.contact}
                onChange={(event) =>
                  setField(
                    "contact",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              >
                <option value="">
                  Select a contact
                </option>

                {contacts.map((contact) => (
                  <option
                    key={getId(contact)}
                    value={getId(contact)}
                  >
                    {[
                      contact.firstName,
                      contact.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || contact.email}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Linked Sales Order"
              hint="Optional reference."
            >
              <select
                value={form.salesOrder}
                onChange={(event) =>
                  setField(
                    "salesOrder",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              >
                <option value="">None</option>

                {openOrders.map((order) => (
                  <option
                    key={getId(order)}
                    value={getId(order)}
                  >
                    {order.salesOrderNumber}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Place of Supply">
              <input
                value={form.placeOfSupply}
                onChange={(event) =>
                  setField(
                    "placeOfSupply",
                    event.target.value
                  )
                }
                placeholder="e.g. Tamil Nadu (33)"
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          {/* INVOICE DETAILS */}

          <h3 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Invoice Details
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Issue Date" required>
              <input
                type="date"
                value={form.issueDate}
                onChange={(event) =>
                  setField(
                    "issueDate",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setField(
                    "dueDate",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(event) =>
                  setField(
                    "currency",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="GST Type"
              hint="Decides CGST+SGST or IGST."
            >
              <select
                value={form.taxMode}
                onChange={(event) =>
                  setField(
                    "taxMode",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              >
                {TAX_MODES.map((mode) => (
                  <option
                    key={mode.value}
                    value={mode.value}
                  >
                    {mode.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Invoice Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setField(
                    "status",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              >
                {STATUSES.filter(
                  (item) => item !== "CANCELLED"
                ).map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Paid Amount"
              hint="Balance is derived by the server."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amountPaid}
                onChange={(event) =>
                  setField(
                    "amountPaid",
                    event.target.value
                  )
                }
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.reverseCharge}
              onChange={(event) =>
                setField(
                  "reverseCharge",
                  event.target.checked
                )
              }
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />

            <span className="text-sm font-medium text-slate-700">
              Tax payable under reverse charge
            </span>
          </label>

          {/* ITEMS */}

          <div className="mb-3 mt-7 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Items
            </h3>

            <button
              onClick={addItem}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Item {index + 1}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">
                      {money(
                        lineTotal(item),
                        form.currency
                      )}
                    </span>

                    {form.items.length > 1 && (
                      <button
                        onClick={() =>
                          removeItem(index)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Product">
                    <select
                      value={item.product}
                      onChange={(event) =>
                        applyProduct(
                          index,
                          event.target.value
                        )
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">
                        Custom item
                      </option>

                      {products.map((product) => (
                        <option
                          key={getId(product)}
                          value={getId(product)}
                        >
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Description"
                    required
                  >
                    <input
                      value={item.description}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Item description"
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="HSN / SAC">
                    <input
                      value={item.hsnSac}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "hsnSac",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 998314"
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="Unit">
                    <input
                      value={item.unit}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "unit",
                          event.target.value
                        )
                      }
                      placeholder="PCS"
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="Quantity" required>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.quantity}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "quantity",
                          event.target.value
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="Rate" required>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "unitPrice",
                          event.target.value
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="Discount (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discountRate}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "discountRate",
                          event.target.value
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="GST Rate (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.taxRate}
                      onChange={(event) =>
                        setItemField(
                          index,
                          "taxRate",
                          event.target.value
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          {/* LIVE TOTALS */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Summary
            </h3>

            <div className="ml-auto max-w-sm space-y-2 text-sm">
              <TotalRow
                label="Subtotal"
                value={money(
                  formTotals.subtotal,
                  form.currency
                )}
              />

              <TotalRow
                label="Discount"
                value={`- ${money(
                  formTotals.discountTotal,
                  form.currency
                )}`}
              />

              <TotalRow
                label="Taxable Amount"
                value={money(
                  formTotals.taxableTotal,
                  form.currency
                )}
              />

              {form.taxMode === "IGST" ? (
                <TotalRow
                  label="IGST"
                  value={money(
                    formTotals.igstTotal,
                    form.currency
                  )}
                />
              ) : (
                <>
                  <TotalRow
                    label="CGST"
                    value={money(
                      formTotals.cgstTotal,
                      form.currency
                    )}
                  />

                  <TotalRow
                    label="SGST"
                    value={money(
                      formTotals.sgstTotal,
                      form.currency
                    )}
                  />
                </>
              )}

              <div className="!mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-bold text-slate-900">
                  Grand Total
                </span>

                <span className="text-base font-bold text-slate-900">
                  {money(
                    formTotals.grandTotal,
                    form.currency
                  )}
                </span>
              </div>

              <TotalRow
                label="Balance Due"
                value={money(
                  Math.max(
                    0,
                    formTotals.grandTotal -
                      (Number(form.amountPaid) || 0)
                  ),
                  form.currency
                )}
              />
            </div>
          </div>

          {/* NOTES + TERMS */}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Notes">
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setField(
                    "notes",
                    event.target.value
                  )
                }
                placeholder="Visible on the invoice PDF."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              />
            </Field>

            <Field label="Terms & Conditions">
              <textarea
                rows={4}
                value={form.termsAndConditions}
                onChange={(event) =>
                  setField(
                    "termsAndConditions",
                    event.target.value
                  )
                }
                placeholder="Payment terms, warranty, jurisdiction..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              />
            </Field>
          </div>
        </ModalShell>
      )}

      {/* ===================================================
          VIEW INVOICE
      =================================================== */}

      {viewing && (
        <ModalShell
          wide
          title={viewing.invoiceNumber}
          subtitle={customerLabel(viewing)}
          onClose={() => setViewing(null)}
          footer={
            <>
              <button
                onClick={() => printPdf(viewing)}
                disabled={actionLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>

              <button
                onClick={() => downloadPdf(viewing)}
                disabled={actionLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={viewing.status} />

            <span className="text-xs text-slate-500">
              Issued {formatDate(viewing.issueDate)}
            </span>

            {viewing.dueDate && (
              <span className="text-xs text-slate-500">
                • Due {formatDate(viewing.dueDate)}
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoTile
              label="Grand Total"
              value={money(
                viewing.grandTotal,
                viewing.currency
              )}
            />

            <InfoTile
              label="Paid"
              value={money(
                viewing.amountPaid,
                viewing.currency
              )}
            />

            <InfoTile
              label="Balance Due"
              value={money(
                viewing.balanceDue,
                viewing.currency
              )}
            />
          </div>

          {/* ITEMS */}

          <h3 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Items
          </h3>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {[
                      "Item",
                      "HSN/SAC",
                      "Qty",
                      "Rate",
                      "Disc %",
                      "GST %",
                      "Amount",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(viewing.items || []).map(
                    (item, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {item.product?.name ||
                            item.description ||
                            "Item"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.hsnSac || "-"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.quantity}{" "}
                          {item.unit}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {Number(
                            item.unitPrice || 0
                          ).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.discountRate || 0}%
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.taxRate || 0}%
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {Number(
                            item.total || 0
                          ).toFixed(2)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALS */}

          <div className="mt-5 ml-auto max-w-sm space-y-2">
            <TotalRow
              label="Subtotal"
              value={money(
                viewing.subtotal,
                viewing.currency
              )}
            />

            <TotalRow
              label="Discount"
              value={`- ${money(
                viewing.discountTotal,
                viewing.currency
              )}`}
            />

            <TotalRow
              label="Taxable Amount"
              value={money(
                viewing.taxableTotal,
                viewing.currency
              )}
            />

            {viewing.taxMode === "IGST" ? (
              <TotalRow
                label="IGST"
                value={money(
                  viewing.igstTotal,
                  viewing.currency
                )}
              />
            ) : (
              <>
                <TotalRow
                  label="CGST"
                  value={money(
                    viewing.cgstTotal,
                    viewing.currency
                  )}
                />

                <TotalRow
                  label="SGST"
                  value={money(
                    viewing.sgstTotal,
                    viewing.currency
                  )}
                />
              </>
            )}

            <div className="!mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-bold text-slate-900">
                Grand Total
              </span>

              <span className="text-base font-bold text-slate-900">
                {money(
                  viewing.grandTotal,
                  viewing.currency
                )}
              </span>
            </div>
          </div>

          {/* STATUS ACTIONS */}

          {viewing.status !== "CANCELLED" && (
            <div className="mt-7 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
              {["SENT", "PAID", "OVERDUE"].map(
                (next) => (
                  <button
                    key={next}
                    disabled={
                      actionLoading ||
                      viewing.status === next
                    }
                    onClick={async () => {
                      await changeStatus(
                        viewing,
                        next
                      );

                      setViewing((current) =>
                        current
                          ? {
                              ...current,
                              status: next,
                            }
                          : current
                      );
                    }}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark {next.replace("_", " ")}
                  </button>
                )
              )}
            </div>
          )}

          {viewing.notes && (
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Notes
              </h4>

              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">
                {viewing.notes}
              </p>
            </div>
          )}

          {viewing.termsAndConditions && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Terms &amp; Conditions
              </h4>

              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">
                {viewing.termsAndConditions}
              </p>
            </div>
          )}
        </ModalShell>
      )}

      {/* ===================================================
          SALES ORDER -> INVOICE
      =================================================== */}

      {convertOpen && (
        <ModalShell
          title="Create Invoice from Sales Order"
          subtitle="Items, customer and totals are copied from the order."
          onClose={() => setConvertOpen(false)}
          footer={
            <>
              <button
                onClick={() => setConvertOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={convertSalesOrder}
                disabled={
                  actionLoading || !convertOrderId
                }
                className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading
                  ? "Converting..."
                  : "Create Invoice"}
              </button>
            </>
          }
        >
          <Field label="Sales Order" required>
            <select
              value={convertOrderId}
              onChange={(event) =>
                setConvertOrderId(
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            >
              <option value="">
                Select a sales order
              </option>

              {openOrders.map((order) => (
                <option
                  key={getId(order)}
                  value={getId(order)}
                >
                  {order.salesOrderNumber} —{" "}
                  {order.company?.name || "Customer"}{" "}
                  — {money(
                    order.grandTotal,
                    order.currency
                  )}
                </option>
              ))}
            </select>
          </Field>

          {openOrders.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              No invoiceable sales orders found.
            </p>
          )}
        </ModalShell>
      )}

      {/* ===================================================
          PAYMENT
      =================================================== */}

      {payingInvoice && (
        <ModalShell
          title="Record Payment"
          subtitle={`${
            payingInvoice.invoiceNumber
          } • Grand total ${money(
            payingInvoice.grandTotal,
            payingInvoice.currency
          )}`}
          onClose={() => setPayingInvoice(null)}
          footer={
            <>
              <button
                onClick={() =>
                  setPayingInvoice(null)
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={savePayment}
                disabled={actionLoading}
                className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {actionLoading
                  ? "Saving..."
                  : "Save Payment"}
              </button>
            </>
          }
        >
          <Field
            label="Total Amount Paid"
            hint="Cumulative amount received against this invoice."
          >
            <input
              type="number"
              min="0"
              step="0.01"
              max={payingInvoice.grandTotal}
              value={paymentAmount}
              onChange={(event) =>
                setPaymentAmount(
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            />
          </Field>

          <p className="mt-3 text-sm text-slate-600">
            Balance after this payment:{" "}
            <span className="font-semibold text-slate-900">
              {money(
                Math.max(
                  0,
                  Number(
                    payingInvoice.grandTotal || 0
                  ) - (Number(paymentAmount) || 0)
                ),
                payingInvoice.currency
              )}
            </span>
          </p>
        </ModalShell>
      )}

      {/* ===================================================
          CANCEL
      =================================================== */}

      {cancelling && (
        <ModalShell
          title="Cancel Invoice"
          subtitle={`${cancelling.invoiceNumber} will be marked CANCELLED.`}
          onClose={() => setCancelling(null)}
          footer={
            <>
              <button
                onClick={() => setCancelling(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep Invoice
              </button>

              <button
                onClick={cancelInvoice}
                disabled={actionLoading}
                className="h-10 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {actionLoading
                  ? "Cancelling..."
                  : "Cancel Invoice"}
              </button>
            </>
          }
        >
          <Field label="Reason">
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(event.target.value)
              }
              placeholder="Why is this invoice being cancelled?"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
            />
          </Field>
        </ModalShell>
      )}

      {/* ===================================================
          DELETE
      =================================================== */}

      {deleting && (
        <ModalShell
          title="Delete Invoice"
          subtitle={`${deleting.invoiceNumber} will be permanently removed.`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button
                onClick={() => setDeleting(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep Invoice
              </button>

              <button
                onClick={deleteInvoice}
                disabled={actionLoading}
                className="h-10 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {actionLoading
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            This cannot be undone. Consider cancelling
            the invoice instead so the record is kept
            for audit purposes.
          </p>
        </ModalShell>
      )}
    </div>
  );
}

// ======================================================
// SMALL SHARED BITS
// ======================================================

function IconButton({
  title,
  onClick,
  children,
  danger,
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
        danger
          ? "border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

export default Invoices;
