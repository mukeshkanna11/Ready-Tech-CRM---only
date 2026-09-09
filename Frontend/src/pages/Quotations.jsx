'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  DollarSign,
  Edit3,
  Eye,
  FileText,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';

import API from '../services/api';

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  'ALL',
  'DRAFT',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
];

const CURRENCY_OPTIONS = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
];

const EMPTY_ITEM = {
  product: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 18,
  discountRate: 0,
};

const EMPTY_FORM = {
  quotationNumber: '',
  company: '',
  contact: '',
  opportunity: '',
  owner: '',
  issueDate: new Date().toISOString().split('T')[0],
  validUntil: '',
  currency: 'INR',
  items: [{ ...EMPTY_ITEM }],
  status: 'DRAFT',
  notes: '',
  termsAndConditions: '',
  customerNotes: '',
  internalNotes: '',
  billingAddress: '',
  shippingAddress: '',
  tags: [],
};

/* =========================================================
   HELPERS
========================================================= */

const getId = (value) => {
  if (!value) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    return value._id || value.id || '';
  }

  return '';
};

const getName = (value) => {
  if (!value) return '';

  if (typeof value === 'string') return value;

  return (
    value.name ||
    value.companyName ||
    value.firstName ||
    value.email ||
    value._id ||
    ''
  );
};

const getPersonName = (value) => {
  if (!value) return '';

  if (typeof value === 'string') return value;

  return (
    [value.firstName, value.lastName].filter(Boolean).join(' ') ||
    value.name ||
    value.email ||
    ''
  );
};

const formatCurrency = (value, currency = 'INR') => {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (date) => {
  if (!date) return '-';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const calculateItem = (item) => {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const taxRate = Number(item.taxRate || 0);
  const discountRate = Number(item.discountRate || 0);

  const lineSubtotal = quantity * unitPrice;

  const discountAmount =
    lineSubtotal * (discountRate / 100);

  const taxableAmount =
    lineSubtotal - discountAmount;

  const taxAmount =
    taxableAmount * (taxRate / 100);

  const lineTotal =
    taxableAmount + taxAmount;

  return {
    lineSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
};

const calculateTotals = (items = []) => {
  return items.reduce(
    (acc, item) => {
      const calculated = calculateItem(item);

      acc.subtotal += calculated.lineSubtotal;
      acc.discountTotal += calculated.discountAmount;
      acc.taxTotal += calculated.taxAmount;
      acc.grandTotal += calculated.lineTotal;

      return acc;
    },
    {
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
    }
  );
};

const statusClasses = {
  DRAFT:
    'bg-slate-500/10 text-slate-700 border-slate-500/20',

  SENT:
    'bg-blue-50 text-blue-700 border-blue-200',

  VIEWED:
    'bg-violet-50 text-violet-700 border-violet-200',

  ACCEPTED:
    'bg-emerald-50 text-emerald-700 border-emerald-200',

  REJECTED:
    'bg-red-50 text-red-700 border-red-200',

  EXPIRED:
    'bg-orange-50 text-orange-700 border-orange-200',
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'DRAFT').toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        statusClasses[normalized] ||
        statusClasses.DRAFT
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalized}
    </span>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-slate-50 blur-2xl transition-all group-hover:bg-brand-100" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <Icon
              className="h-5 w-5 text-slate-700"
              strokeWidth={1.8}
            />
          </div>
        </div>

        <p className="text-xs font-medium text-slate-600">
          {title}
        </p>

        <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </h3>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-600">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   MODAL
========================================================= */

const Modal = ({
  open,
  title,
  children,
  onClose,
  size = 'max-w-5xl',
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative flex max-h-[92vh] w-full ${size} flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   INPUT
========================================================= */

const Input = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
}) => {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          {label}
          {required && (
            <span className="ml-1 text-red-700">*</span>
          )}
        </label>
      )}

      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15"
      />
    </div>
  );
};

/* =========================================================
   SELECT
========================================================= */

const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  required = false,
}) => {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          {label}
          {required && (
            <span className="ml-1 text-red-700">*</span>
          )}
        </label>
      )}

      <select
        value={value || ''}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 placeholder:text-slate-500 hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [showFilters, setShowFilters] = useState(false);

  const [modal, setModal] = useState(null);

  const [selectedQuotation, setSelectedQuotation] =
    useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [rejectReason, setRejectReason] = useState('');

  const [menuId, setMenuId] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  /* =======================================================
     FETCH MASTER DATA
  ======================================================= */

  const fetchMasterData = useCallback(async () => {
    try {
      const [
        companiesResponse,
        contactsResponse,
        opportunitiesResponse,
        productsResponse,
        usersResponse,
      ] = await Promise.all([
        API.get('/companies', {
          params: { limit: 200 },
        }),

        API.get('/contacts', {
          params: { limit: 200 },
        }),

        API.get('/opportunities', {
          params: { limit: 200 },
        }),

        API.get('/products', {
          params: { limit: 200 },
        }),

        API.get('/users', {
          params: { limit: 200 },
        }),
      ]);

      setCompanies(
        companiesResponse?.data?.data ||
          companiesResponse?.data?.companies ||
          []
      );

      setContacts(
        contactsResponse?.data?.data ||
          contactsResponse?.data?.contacts ||
          []
      );

      setOpportunities(
        opportunitiesResponse?.data?.data ||
          opportunitiesResponse?.data?.opportunities ||
          []
      );

      setProducts(
        productsResponse?.data?.data ||
          productsResponse?.data?.products ||
          []
      );

      setUsers(
        usersResponse?.data?.data ||
          usersResponse?.data?.users ||
          []
      );
    } catch (err) {
      console.error(
        'Quotation master data error:',
        err
      );
    }
  }, []);

  /* =======================================================
     FETCH QUOTATIONS
  ======================================================= */

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (status !== 'ALL') {
        params.status = status;
      }

      const response = await API.get(
        '/quotations',
        { params }
      );

      const responseData = response?.data;

      const list =
        responseData?.data ||
        responseData?.quotations ||
        [];

      setQuotations(
        Array.isArray(list) ? list : []
      );

      setPagination(
        responseData?.pagination || {
          page,
          limit,
          total: list.length,
          pages: 1,
        }
      );
    } catch (err) {
      console.error(
        'Quotation fetch error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          'Failed to load quotations.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    status,
    sortBy,
    sortOrder,
  ]);

  /* =======================================================
     FETCH STATS
  ======================================================= */

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const response = await API.get(
        '/quotations/stats'
      );

      setStats(
        response?.data?.data ||
          response?.data ||
          null
      );
    } catch (err) {
      console.error(
        'Quotation stats error:',
        err
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* =======================================================
     FORM TOTALS
  ======================================================= */

  const formTotals = useMemo(
    () => calculateTotals(form.items),
    [form.items]
  );

  /* =======================================================
     HANDLERS
  ======================================================= */

  const openCreateModal = () => {
    const nextQuotationNumber =
      `QT-${new Date().getFullYear()}-${String(
        (pagination.total || 0) + 1
      ).padStart(4, '0')}`;

    setForm({
      ...EMPTY_FORM,
      quotationNumber: nextQuotationNumber,
      issueDate: new Date()
        .toISOString()
        .split('T')[0],
      validUntil: '',
      items: [{ ...EMPTY_ITEM }],
    });

    setSelectedQuotation(null);
    setModal('create');
  };

  const openEditModal = (quotation) => {
    setSelectedQuotation(quotation);

    setForm({
      quotationNumber:
        quotation.quotationNumber || '',

      company: getId(quotation.company),

      contact: getId(quotation.contact),

      opportunity:
        getId(quotation.opportunity),

      owner: getId(quotation.owner),

      issueDate: quotation.issueDate
        ? new Date(quotation.issueDate)
            .toISOString()
            .split('T')[0]
        : '',

      validUntil: quotation.validUntil
        ? new Date(quotation.validUntil)
            .toISOString()
            .split('T')[0]
        : '',

      currency:
        quotation.currency || 'INR',

      items:
        quotation.items?.length > 0
          ? quotation.items.map((item) => ({
              product: getId(item.product),
              description:
                item.description || '',
              quantity:
                item.quantity ?? 1,
              unitPrice:
                item.unitPrice ?? 0,
              taxRate:
                item.taxRate ?? 0,
              discountRate:
                item.discountRate ?? 0,
            }))
          : [{ ...EMPTY_ITEM }],

      status:
        quotation.status || 'DRAFT',

      notes: quotation.notes || '',

      termsAndConditions:
        quotation.termsAndConditions || '',

      customerNotes:
        quotation.customerNotes || '',

      internalNotes:
        quotation.internalNotes || '',

      billingAddress:
        quotation.billingAddress || '',

      shippingAddress:
        quotation.shippingAddress || '',

      tags:
        quotation.tags || [],
    });

    setModal('edit');
  };

  const closeModal = () => {
    if (saving) return;

    setModal(null);
    setSelectedQuotation(null);
    setRejectReason('');
  };

  const handleFormChange = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateItem = (
    index,
    field,
    value
  ) => {
    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      if (field === 'product' && value) {
        const product = products.find(
          (item) =>
            getId(item) === value
        );

        if (product) {
          const price =
            product.sellingPrice ??
            product.salePrice ??
            product.unitPrice ??
            product.price ??
            0;

          items[index].unitPrice =
            Number(price);

          items[index].description =
            product.description ||
            product.name ||
            '';
        }
      }

      return {
        ...previous,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        { ...EMPTY_ITEM },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.quotationNumber.trim()) {
      setError(
        'Quotation number is required.'
      );
      return;
    }

    if (!form.items.length) {
      setError(
        'At least one quotation item is required.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        quotationNumber:
          form.quotationNumber.trim(),

        company:
          form.company || undefined,

        contact:
          form.contact || undefined,

        opportunity:
          form.opportunity || undefined,

        owner:
          form.owner || undefined,

        issueDate:
          form.issueDate || undefined,

        validUntil:
          form.validUntil || undefined,

        currency:
          form.currency || 'INR',

        items: form.items.map(
          (item) => ({
            product:
              item.product || undefined,

            description:
              item.description || '',

            quantity:
              Number(item.quantity || 1),

            unitPrice:
              Number(item.unitPrice || 0),

            taxRate:
              Number(item.taxRate || 0),

            discountRate:
              Number(
                item.discountRate || 0
              ),
          })
        ),

        status:
          form.status || 'DRAFT',

        notes:
          form.notes || '',

        termsAndConditions:
          form.termsAndConditions || '',

        customerNotes:
          form.customerNotes || '',

        internalNotes:
          form.internalNotes || '',

        billingAddress:
          form.billingAddress || '',

        shippingAddress:
          form.shippingAddress || '',

        tags: form.tags || [],
      };

      if (modal === 'create') {
        await API.post(
          '/quotations',
          payload
        );
      } else {
        await API.put(
          `/quotations/${getId(
            selectedQuotation
          )}`,
          payload
        );
      }

      closeModal();

      await Promise.all([
        fetchQuotations(),
        fetchStats(),
      ]);
    } catch (err) {
      console.error(
        'Quotation save error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          'Failed to save quotation.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     VIEW
  ======================================================= */

  const openViewModal = async (
    quotation
  ) => {
    try {
      setModal('view');
      setSelectedQuotation(quotation);

      const response = await API.get(
        `/quotations/${getId(
          quotation
        )}`
      );

      setSelectedQuotation(
        response?.data?.data ||
          response?.data?.quotation ||
          response?.data ||
          quotation
      );

      await fetchQuotations();
    } catch (err) {
      console.error(
        'Quotation details error:',
        err
      );
    }
  };

  /* =======================================================
     SEND
  ======================================================= */

  const handleSend = async (
    quotation
  ) => {
    try {
      await API.post(
        `/quotations/${getId(
          quotation
        )}/send`,
        {}
      );

      setMenuId(null);

      await Promise.all([
        fetchQuotations(),
        fetchStats(),
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to send quotation.'
      );
    }
  };

  /* =======================================================
     ACCEPT
  ======================================================= */

  const handleAccept = async (
    quotation
  ) => {
    const confirmed = window.confirm(
      `Accept quotation ${quotation.quotationNumber}?`
    );

    if (!confirmed) return;

    try {
      await API.post(
        `/quotations/${getId(
          quotation
        )}/accept`,
        {}
      );

      setMenuId(null);

      await Promise.all([
        fetchQuotations(),
        fetchStats(),
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to accept quotation.'
      );
    }
  };

  /* =======================================================
     REJECT
  ======================================================= */

  const openRejectModal = (
    quotation
  ) => {
    setSelectedQuotation(quotation);
    setRejectReason('');
    setMenuId(null);
    setModal('reject');
  };

  const handleReject = async (
    event
  ) => {
    event.preventDefault();

    try {
      setSaving(true);

      await API.post(
        `/quotations/${getId(
          selectedQuotation
        )}/reject`,
        {
          reason:
            rejectReason.trim() ||
            undefined,
        }
      );

      closeModal();

      await Promise.all([
        fetchQuotations(),
        fetchStats(),
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to reject quotation.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete = async (
    quotation
  ) => {
    const confirmed =
      window.confirm(
        `Delete quotation ${quotation.quotationNumber}? This action cannot be undone.`
      );

    if (!confirmed) return;

    try {
      await API.delete(
        `/quotations/${getId(
          quotation
        )}`
      );

      setMenuId(null);

      await Promise.all([
        fetchQuotations(),
        fetchStats(),
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to delete quotation.'
      );
    }
  };

  /* =======================================================
     STATUS UPDATE
  ======================================================= */

  const handleStatusChange = async (
    quotation,
    nextStatus
  ) => {
    try {
      await API.patch(
        `/quotations/${getId(
          quotation
        )}/status`,
        {
          status: nextStatus,
        }
      );

      setMenuId(null);

      await Promise.all([
        fetchQuotations(),
        fetchStats(),
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to update quotation status.'
      );
    }
  };

  /* =======================================================
     SORT
  ======================================================= */

  const handleSort = (
    field
  ) => {
    if (sortBy === field) {
      setSortOrder((previous) =>
        previous === 'asc'
          ? 'desc'
          : 'asc'
      );
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  /* =======================================================
     FILTER
  ======================================================= */

  const clearFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPage(1);
  };

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    pagination?.pages ||
    Math.ceil(
      (pagination?.total || 0) /
        (pagination?.limit || limit)
    ) ||
    1;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="min-h-screen bg-surface text-slate-900"
      onClick={() => setMenuId(null)}
    >
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                <FileText
                  className="h-4 w-4 text-slate-700"
                  strokeWidth={1.8}
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Sales
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Quotations
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Create, manage and track customer quotations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchQuotations();
                fetchStats();
              }}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              New Quotation
            </button>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-500/[0.06] px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />

            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-700 transition hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Quotations"
            value={
              statsLoading
                ? '—'
                : stats?.totalQuotations ??
                  stats?.total ??
                  0
            }
            subtitle="All quotations"
            icon={ClipboardList}
          />

          <StatCard
            title="Total Value"
            value={
              statsLoading
                ? '—'
                : formatCurrency(
                    stats?.totalValue || 0,
                    'INR'
                  )
            }
            subtitle="Quotation pipeline"
            icon={DollarSign}
          />

          <StatCard
            title="Accepted"
            value={
              statsLoading
                ? '—'
                : stats?.acceptedCount ?? 0
            }
            subtitle={
              stats?.acceptedValue
                ? formatCurrency(
                    stats.acceptedValue,
                    'INR'
                  )
                : 'Accepted quotations'
            }
            icon={CheckCircle2}
          />

          <StatCard
            title="Acceptance Rate"
            value={
              statsLoading
                ? '—'
                : `${Number(
                    stats?.acceptanceRate || 0
                  ).toFixed(1)}%`
            }
            subtitle="Quotation conversion"
            icon={Check}
          />
        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search quotations..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-brand-500 placeholder:text-slate-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {STATUS_OPTIONS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === 'ALL'
                      ? 'All Statuses'
                      : item}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (previous) =>
                    !previous
                )
              }
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                showFilters
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>

            {(search ||
              status !== 'ALL') && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="border-t border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">
                    Current status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {status === 'ALL'
                      ? 'All'
                      : status}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">
                    Results
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {pagination.total || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">
                    Sort
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {sortBy} · {sortOrder}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Quotation
                  </th>

                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Opportunity
                  </th>

                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Status
                  </th>

                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          'grandTotal'
                        )
                      }
                      className="flex items-center gap-1.5 transition hover:text-slate-900"
                    >
                      Amount

                      {sortBy ===
                        'grandTotal' &&
                        (sortOrder ===
                        'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ))}
                    </button>
                  </th>

                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Valid Until
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-slate-600" />

                        <p className="mt-3 text-sm text-slate-600">
                          Loading quotations...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : quotations.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          <FileText className="h-6 w-6 text-slate-500" />
                        </div>

                        <h3 className="mt-4 text-sm font-bold text-slate-900">
                          No quotations found
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Create your first quotation or adjust your filters.
                        </p>

                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-black"
                        >
                          <Plus className="h-4 w-4" />
                          Create Quotation
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map(
                    (quotation) => {
                      const company =
                        quotation.company;

                      const contact =
                        quotation.contact;

                      return (
                        <tr
                          key={getId(
                            quotation
                          )}
                          className="group border-b border-slate-200 transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                openViewModal(
                                  quotation
                                )
                              }
                              className="text-left"
                            >
                              <p className="text-sm font-bold text-slate-900 transition group-hover:text-slate-300">
                                {
                                  quotation.quotationNumber
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Issued{' '}
                                {formatDate(
                                  quotation.issueDate
                                )}
                              </p>
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                                <Building2 className="h-4 w-4 text-slate-600" />
                              </div>

                              <div>
                                <p className="max-w-[180px] truncate text-sm font-semibold text-slate-200">
                                  {getName(
                                    company
                                  ) ||
                                    'No company'}
                                </p>

                                <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-500">
                                  {getPersonName(
                                    contact
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[200px] truncate text-sm text-slate-700">
                              {getName(
                                quotation.opportunity
                              ) ||
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                quotation.status
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(
                                quotation.grandTotal,
                                quotation.currency
                              )}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {quotation.items
                                ?.length ||
                                0}{' '}
                              items
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />

                              {formatDate(
                                quotation.validUntil
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="relative flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openViewModal(
                                    quotation
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    quotation
                                  )
                                }
                                disabled={[
                                  'ACCEPTED',
                                  'REJECTED',
                                ].includes(
                                  quotation.status
                                )}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Edit"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  setMenuId(
                                    (previous) =>
                                      previous ===
                                      getId(
                                        quotation
                                      )
                                        ? null
                                        : getId(
                                            quotation
                                          )
                                  );
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {menuId ===
                                getId(
                                  quotation
                                ) && (
                                <div
                                  onClick={(
                                    event
                                  ) =>
                                    event.stopPropagation()
                                  }
                                  className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                                >
                                  {quotation.status !==
                                    'SENT' &&
                                    quotation.status !==
                                      'ACCEPTED' &&
                                    quotation.status !==
                                      'REJECTED' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSend(
                                            quotation
                                          )
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                        Send quotation
                                      </button>
                                    )}

                                  {[
                                    'SENT',
                                    'VIEWED',
                                  ].includes(
                                    quotation.status
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAccept(
                                          quotation
                                        )
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Accept
                                    </button>
                                  )}

                                  {[
                                    'SENT',
                                    'VIEWED',
                                  ].includes(
                                    quotation.status
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRejectModal(
                                          quotation
                                        )
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-red-700 transition hover:bg-red-50"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Reject
                                    </button>
                                  )}

                                  {quotation.status !==
                                    'ACCEPTED' &&
                                    quotation.status !==
                                      'REJECTED' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDelete(
                                            quotation
                                          )
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-red-700 transition hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                      </button>
                                    )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing{' '}
              {quotations.length
                ? (page - 1) *
                    limit +
                  1
                : 0}{' '}
              -{' '}
              {(page - 1) *
                  limit +
                quotations.length}{' '}
              of{' '}
              {pagination.total || 0}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.max(
                        1,
                        previous - 1
                      )
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-900">
                {page}
              </div>

              <button
                type="button"
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.min(
                        totalPages,
                        previous + 1
                      )
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      <Modal
        open={
          modal === 'create' ||
          modal === 'edit'
        }
        title={
          modal === 'create'
            ? 'Create Quotation'
            : 'Edit Quotation'
        }
        onClose={closeModal}
        size="max-w-6xl"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {/* BASIC INFORMATION */}

          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Quotation Information
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Basic quotation and customer details.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Quotation Number"
                value={
                  form.quotationNumber
                }
                onChange={(event) =>
                  handleFormChange(
                    'quotationNumber',
                    event.target.value
                  )
                }
                required
              />

              <Select
                label="Company"
                value={form.company}
                onChange={(event) =>
                  handleFormChange(
                    'company',
                    event.target.value
                  )
                }
                options={companies.map(
                  (company) => ({
                    value:
                      getId(company),
                    label:
                      getName(
                        company
                      ),
                  })
                )}
                placeholder="Select company"
              />

              <Select
                label="Contact"
                value={form.contact}
                onChange={(event) =>
                  handleFormChange(
                    'contact',
                    event.target.value
                  )
                }
                options={contacts.map(
                  (contact) => ({
                    value:
                      getId(contact),
                    label:
                      getPersonName(
                        contact
                      ),
                  })
                )}
                placeholder="Select contact"
              />

              <Select
                label="Opportunity"
                value={
                  form.opportunity
                }
                onChange={(event) =>
                  handleFormChange(
                    'opportunity',
                    event.target.value
                  )
                }
                options={opportunities.map(
                  (opportunity) => ({
                    value:
                      getId(
                        opportunity
                      ),
                    label:
                      getName(
                        opportunity
                      ),
                  })
                )}
                placeholder="Select opportunity"
              />

              <Select
                label="Owner"
                value={form.owner}
                onChange={(event) =>
                  handleFormChange(
                    'owner',
                    event.target.value
                  )
                }
                options={users.map(
                  (user) => ({
                    value:
                      getId(user),
                    label:
                      getPersonName(
                        user
                      ),
                  })
                )}
                placeholder="Select owner"
              />

              <Input
                label="Issue Date"
                type="date"
                value={form.issueDate}
                onChange={(event) =>
                  handleFormChange(
                    'issueDate',
                    event.target.value
                  )
                }
              />

              <Input
                label="Valid Until"
                type="date"
                value={form.validUntil}
                onChange={(event) =>
                  handleFormChange(
                    'validUntil',
                    event.target.value
                  )
                }
              />

              <Select
                label="Currency"
                value={
                  form.currency
                }
                onChange={(event) =>
                  handleFormChange(
                    'currency',
                    event.target.value
                  )
                }
                options={CURRENCY_OPTIONS.map(
                  (currency) => ({
                    value: currency,
                    label: currency,
                  })
                )}
              />
            </div>
          </div>

          {/* ITEMS */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Products & Services
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Add products, quantity, pricing, tax and discount.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-4 p-5">
              {form.items.map(
                (item, index) => {
                  const calculated =
                    calculateItem(
                      item
                    );

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {index + 1}
                          </div>

                          <span className="text-xs font-semibold text-slate-600">
                            Line Item
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
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <div className="lg:col-span-2">
                          <Select
                            label="Product"
                            value={
                              item.product
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                'product',
                                event
                                  .target
                                  .value
                              )
                            }
                            options={products.map(
                              (
                                product
                              ) => ({
                                value:
                                  getId(
                                    product
                                  ),
                                label:
                                  getName(
                                    product
                                  ),
                              })
                            )}
                            placeholder="Select product"
                          />
                        </div>

                        <Input
                          label="Description"
                          value={
                            item.description
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              'description',
                              event.target
                                .value
                            )
                          }
                          placeholder="Item description"
                        />

                        <Input
                          label="Quantity"
                          type="number"
                          value={
                            item.quantity
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              'quantity',
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                        />

                        <Input
                          label="Unit Price"
                          type="number"
                          value={
                            item.unitPrice
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              'unitPrice',
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                        />

                        <Input
                          label="Tax %"
                          type="number"
                          value={
                            item.taxRate
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              'taxRate',
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                        />

                        <Input
                          label="Discount %"
                          type="number"
                          value={
                            item.discountRate
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              'discountRate',
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            Subtotal
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatCurrency(
                              calculated.lineSubtotal,
                              form.currency
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            Discount
                          </p>

                          <p className="mt-1 text-sm font-semibold text-red-700">
                            -
                            {formatCurrency(
                              calculated.discountAmount,
                              form.currency
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            Tax
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatCurrency(
                              calculated.taxAmount,
                              form.currency
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            Line Total
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatCurrency(
                              calculated.lineTotal,
                              form.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* TOTALS */}

            <div className="border-t border-slate-200 bg-slate-50 p-5">
              <div className="ml-auto max-w-md space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Subtotal
                  </span>

                  <span className="font-semibold text-slate-700">
                    {formatCurrency(
                      formTotals.subtotal,
                      form.currency
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Discount
                  </span>

                  <span className="font-semibold text-red-700">
                    -
                    {formatCurrency(
                      formTotals.discountTotal,
                      form.currency
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Tax
                  </span>

                  <span className="font-semibold text-slate-700">
                    {formatCurrency(
                      formTotals.taxTotal,
                      form.currency
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-sm font-bold text-slate-900">
                    Grand Total
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(
                      formTotals.grandTotal,
                      form.currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ADDITIONAL DETAILS */}

          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Additional Details
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    handleFormChange(
                      'notes',
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Quotation notes..."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Terms & Conditions
                </label>

                <textarea
                  value={
                    form.termsAndConditions
                  }
                  onChange={(event) =>
                    handleFormChange(
                      'termsAndConditions',
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Payment terms, delivery terms..."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Customer Notes
                </label>

                <textarea
                  value={
                    form.customerNotes
                  }
                  onChange={(event) =>
                    handleFormChange(
                      'customerNotes',
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Customer-facing notes..."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Internal Notes
                </label>

                <textarea
                  value={
                    form.internalNotes
                  }
                  onChange={(event) =>
                    handleFormChange(
                      'internalNotes',
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Internal sales notes..."
                />
              </div>

              <Input
                label="Billing Address"
                value={
                  form.billingAddress
                }
                onChange={(event) =>
                  handleFormChange(
                    'billingAddress',
                    event.target.value
                  )
                }
                placeholder="Billing address"
              />

              <Input
                label="Shipping Address"
                value={
                  form.shippingAddress
                }
                onChange={(event) =>
                  handleFormChange(
                    'shippingAddress',
                    event.target.value
                  )
                }
                placeholder="Shipping address"
              />
            </div>
          </div>

          {/* FOOTER */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {modal === 'create'
                    ? 'Create Quotation'
                    : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* =====================================================
          VIEW MODAL
      ===================================================== */}

      <Modal
        open={modal === 'view'}
        title={
          selectedQuotation?.quotationNumber ||
          'Quotation Details'
        }
        onClose={closeModal}
        size="max-w-5xl"
      >
        {selectedQuotation && (
          <div className="space-y-6 p-6">
            {/* TOP */}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {
                        selectedQuotation.quotationNumber
                      }
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Created{' '}
                      {formatDate(
                        selectedQuotation.createdAt
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <StatusBadge
                status={
                  selectedQuotation.status
                }
              />
            </div>

            {/* CUSTOMER */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />

                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Company
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {getName(
                    selectedQuotation.company
                  ) || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />

                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Contact
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {getPersonName(
                    selectedQuotation.contact
                  ) || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" />

                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Opportunity
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {getName(
                    selectedQuotation.opportunity
                  ) || '—'}
                </p>
              </div>
            </div>

            {/* ITEMS */}

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Quotation Items
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Product
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Qty
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Unit Price
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Tax
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(
                      selectedQuotation.items ||
                      []
                    ).map(
                      (item, index) => {
                        const calculated =
                          calculateItem(
                            item
                          );

                        return (
                          <tr
                            key={
                              index
                            }
                            className="border-b border-slate-200"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {getName(
                                  item.product
                                ) ||
                                  item.description ||
                                  'Item'}
                              </p>

                              {item.description && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    item.description
                                  }
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-600">
                              {
                                item.quantity
                              }
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-600">
                              {formatCurrency(
                                item.unitPrice,
                                selectedQuotation.currency
                              )}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-600">
                              {
                                item.taxRate
                              }
                              %
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                              {formatCurrency(
                                calculated.lineTotal,
                                selectedQuotation.currency
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTAL */}

            <div className="flex justify-end">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Subtotal
                    </span>

                    <span className="text-slate-700">
                      {formatCurrency(
                        selectedQuotation.subtotal,
                        selectedQuotation.currency
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Discount
                    </span>

                    <span className="text-red-700">
                      -
                      {formatCurrency(
                        selectedQuotation.discountTotal,
                        selectedQuotation.currency
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Tax
                    </span>

                    <span className="text-slate-700">
                      {formatCurrency(
                        selectedQuotation.taxTotal,
                        selectedQuotation.currency
                      )}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Grand Total
                      </span>

                      <span className="text-xl font-bold text-slate-900">
                        {formatCurrency(
                          selectedQuotation.grandTotal,
                          selectedQuotation.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DATES */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Issue Date
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(
                    selectedQuotation.issueDate
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Valid Until
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(
                    selectedQuotation.validUntil
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Currency
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedQuotation.currency ||
                    'INR'}
                </p>
              </div>
            </div>

            {/* NOTES */}

            {(selectedQuotation.notes ||
              selectedQuotation.termsAndConditions ||
              selectedQuotation.customerNotes) && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {selectedQuotation.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Notes
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {
                        selectedQuotation.notes
                      }
                    </p>
                  </div>
                )}

                {selectedQuotation.termsAndConditions && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Terms & Conditions
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {
                        selectedQuotation.termsAndConditions
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ACTIONS */}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
              {[
                'DRAFT',
                'VIEWED',
              ].includes(
                selectedQuotation.status
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    handleAccept(
                      selectedQuotation
                    )
                  }
                  className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept
                </button>
              )}

              {[
                'DRAFT',
                'VIEWED',
              ].includes(
                selectedQuotation.status
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    openRejectModal(
                      selectedQuotation
                    )
                  }
                  className="flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              )}

              {selectedQuotation.status ===
                'DRAFT' && (
                <button
                  type="button"
                  onClick={() =>
                    handleSend(
                      selectedQuotation
                    )
                  }
                  className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-black"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================
          REJECT MODAL
      ===================================================== */}

      <Modal
        open={modal === 'reject'}
        title="Reject Quotation"
        onClose={closeModal}
        size="max-w-md"
      >
        <form
          onSubmit={handleReject}
          className="space-y-5 p-6"
        >
          <div className="rounded-xl border border-red-200 bg-red-500/[0.05] p-4">
            <div className="flex gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-red-700" />

              <div>
                <p className="text-sm font-semibold text-red-700">
                  Reject this quotation?
                </p>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  This will mark the quotation as rejected.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Rejection Reason
            </label>

            <textarea
              value={rejectReason}
              onChange={(event) =>
                setRejectReason(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Enter rejection reason..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500 transition hover:border-slate-400 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}

              Reject Quotation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}