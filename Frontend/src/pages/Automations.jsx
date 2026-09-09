'use strict';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertCircle,
  Archive,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  Copy,
  Edit3,
  Eye,
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  TrendingUp,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';

/* =========================================================
   API
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const AUTOMATION_API = `${API_BASE.replace(/\/$/, '')}/automations`;

/* =========================================================
   CONSTANTS
========================================================= */

const MODULES = [
  'LEAD',
  'CONTACT',
  'CLIENT',
  'DEAL',
  'OPPORTUNITY',
  'TASK',
  'SALES_ORDER',
  'INVOICE',
  'PAYMENT',
  'PRODUCT',
  'INVENTORY',
  'PURCHASE_ORDER',
  'EXPENSE',
  'EMPLOYEE',
];

const STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED'];

const OPERATORS = [
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'NOT_CONTAINS',
  'STARTS_WITH',
  'ENDS_WITH',
  'GREATER_THAN',
  'LESS_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL',
  'IS_EMPTY',
  'IS_NOT_EMPTY',
  'IN',
  'NOT_IN',
];

const ACTION_TYPES = [
  'SEND_EMAIL',
  'CREATE_TASK',
  'UPDATE_RECORD',
  'ASSIGN_OWNER',
  'ADD_TAG',
  'REMOVE_TAG',
  'CREATE_NOTIFICATION',
];

const TRIGGER_EVENTS = {
  LEAD: ['LEAD_CREATED', 'LEAD_UPDATED'],
  CONTACT: ['CONTACT_CREATED', 'CONTACT_UPDATED'],
  CLIENT: ['CLIENT_CREATED', 'CLIENT_UPDATED'],
  DEAL: ['DEAL_CREATED', 'DEAL_UPDATED'],
  OPPORTUNITY: ['OPPORTUNITY_CREATED', 'OPPORTUNITY_UPDATED'],
  TASK: ['TASK_CREATED', 'TASK_UPDATED'],
  SALES_ORDER: ['SALES_ORDER_CREATED', 'SALES_ORDER_UPDATED'],
  INVOICE: ['INVOICE_CREATED', 'INVOICE_UPDATED'],
  PAYMENT: ['PAYMENT_CREATED', 'PAYMENT_UPDATED'],
  PRODUCT: ['PRODUCT_CREATED', 'PRODUCT_UPDATED'],
  INVENTORY: ['INVENTORY_CREATED', 'INVENTORY_UPDATED'],
  PURCHASE_ORDER: [
    'PURCHASE_ORDER_CREATED',
    'PURCHASE_ORDER_UPDATED',
  ],
  EXPENSE: ['EXPENSE_CREATED', 'EXPENSE_UPDATED'],
  EMPLOYEE: ['EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED'],
};

const EMPTY_CONDITION = {
  field: '',
  operator: 'EQUALS',
  value: '',
};

const createDefaultAction = () => ({
  type: 'SEND_EMAIL',
  config: {
    to: '',
    subject: '',
    message: '',
  },
  order: 0,
});

const createDefaultForm = () => ({
  name: '',
  description: '',
  module: 'LEAD',
  trigger: {
    event: 'LEAD_CREATED',
    config: {},
  },
  conditions: [],
  conditionLogic: 'AND',
  actions: [createDefaultAction()],
  status: 'DRAFT',
});

/* =========================================================
   HELPERS
========================================================= */

const getToken = () =>
  localStorage.getItem('token') ||
  localStorage.getItem('accessToken') ||
  sessionStorage.getItem('token') ||
  sessionStorage.getItem('accessToken');

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  'Something went wrong. Please try again.';

const prettyLabel = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value) => {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
};

const moduleIcon = (module) => {
  switch (module) {
    case 'LEAD':
      return <UserPlus size={15} />;
    case 'INVOICE':
      return <Archive size={15} />;
    case 'PAYMENT':
      return <TrendingUp size={15} />;
    case 'TASK':
      return <Check size={15} />;
    default:
      return <Zap size={15} />;
  }
};

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function StatusBadge({ status }) {
  const styles = {
    ACTIVE:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400',
    PAUSED:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400',
    DRAFT:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.DRAFT
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'ACTIVE'
            ? 'bg-emerald-500'
            : status === 'PAUSED'
              ? 'bg-amber-500'
              : 'bg-slate-400'
        }`}
      />
      {prettyLabel(status)}
    </span>
  );
}

function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-white dark:group-hover:text-slate-900">
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Zap size={28} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">
        No automations found
      </h3>

      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Create your first automation to automatically handle CRM
        events, conditions and actions.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <Plus size={17} />
        Create Automation
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse border-b border-slate-100 p-5 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2 h-3 w-72 rounded bg-slate-100 dark:bg-slate-800/70" />
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Automations() {
  const [automations, setAutomations] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modal, setModal] = useState(null);
  const [selectedAutomation, setSelectedAutomation] = useState(null);

  const [form, setForm] = useState(createDefaultForm());
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  const [testData, setTestData] = useState(
    JSON.stringify(
      {
        _id: '68c123456789abcdef123456',
        name: 'Test Lead',
        email: 'customer@example.com',
        status: 'NEW',
      },
      null,
      2
    )
  );

  const [executions, setExecutions] = useState([]);
  const [executionLoading, setExecutionLoading] = useState(false);

  /* =======================================================
     AXIOS INSTANCE
  ======================================================= */

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: AUTOMATION_API,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    instance.interceptors.request.use((config) => {
      const token = getToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    return instance;
  }, []);

  /* =======================================================
     TOAST
  ======================================================= */

  const showToast = useCallback((message, type = 'success') => {
    setToast({
      message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  /* =======================================================
     FETCH
  ======================================================= */

  const fetchAutomations = useCallback(
    async (page = 1, silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const params = {
          page,
          limit: pagination.limit,
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (moduleFilter) {
          params.module = moduleFilter;
        }

        if (statusFilter) {
          params.status = statusFilter;
        }

        const response = await api.get('/', {
          params,
        });

        const payload = response?.data;

        setAutomations(
          Array.isArray(payload?.data) ? payload.data : []
        );

        if (payload?.pagination) {
          setPagination((previous) => ({
            ...previous,
            ...payload.pagination,
          }));
        } else {
          setPagination((previous) => ({
            ...previous,
            page,
          }));
        }
      } catch (err) {
        console.error('Automation fetch error:', err);
        setError(getErrorMessage(err));
        setAutomations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      api,
      pagination.limit,
      search,
      moduleFilter,
      statusFilter,
    ]
  );

  useEffect(() => {
    fetchAutomations(1);
  }, [moduleFilter, statusFilter]);

  /* =======================================================
     FORM
  ======================================================= */

  const resetForm = () => {
    setForm(createDefaultForm());
  };

  const openCreate = () => {
    resetForm();
    setSelectedAutomation(null);
    setModal('create');
  };

  const openEdit = (automation) => {
    setSelectedAutomation(automation);

    setForm({
      name: automation.name || '',
      description: automation.description || '',
      module: automation.module || 'LEAD',
      trigger: {
        event:
          automation.trigger?.event ||
          TRIGGER_EVENTS[automation.module]?.[0] ||
          'LEAD_CREATED',
        config: automation.trigger?.config || {},
      },
      conditions: Array.isArray(automation.conditions)
        ? automation.conditions
        : [],
      conditionLogic:
        automation.conditionLogic || 'AND',
      actions:
        Array.isArray(automation.actions) &&
        automation.actions.length
          ? automation.actions
          : [createDefaultAction()],
      status: automation.status || 'DRAFT',
    });

    setModal('edit');
  };

  const openView = (automation) => {
    setSelectedAutomation(automation);
    setModal('view');
  };

  const updateForm = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateModule = (module) => {
    const event =
      TRIGGER_EVENTS[module]?.[0] || `${module}_CREATED`;

    setForm((previous) => ({
      ...previous,
      module,
      trigger: {
        ...previous.trigger,
        event,
      },
    }));
  };

  /* =======================================================
     CONDITIONS
  ======================================================= */

  const addCondition = () => {
    setForm((previous) => ({
      ...previous,
      conditions: [
        ...previous.conditions,
        {
          ...EMPTY_CONDITION,
        },
      ],
    }));
  };

  const updateCondition = (index, key, value) => {
    setForm((previous) => ({
      ...previous,
      conditions: previous.conditions.map(
        (condition, conditionIndex) =>
          conditionIndex === index
            ? {
                ...condition,
                [key]: value,
              }
            : condition
      ),
    }));
  };

  const removeCondition = (index) => {
    setForm((previous) => ({
      ...previous,
      conditions: previous.conditions.filter(
        (_, conditionIndex) =>
          conditionIndex !== index
      ),
    }));
  };

  /* =======================================================
     ACTIONS
  ======================================================= */

  const addAction = () => {
    setForm((previous) => ({
      ...previous,
      actions: [
        ...previous.actions,
        {
          ...createDefaultAction(),
          order: previous.actions.length,
        },
      ],
    }));
  };

  const updateActionType = (index, type) => {
    setForm((previous) => ({
      ...previous,
      actions: previous.actions.map((action, actionIndex) =>
        actionIndex === index
          ? {
              ...action,
              type,
              config: {},
            }
          : action
      ),
    }));
  };

  const updateActionConfig = (index, key, value) => {
    setForm((previous) => ({
      ...previous,
      actions: previous.actions.map((action, actionIndex) =>
        actionIndex === index
          ? {
              ...action,
              config: {
                ...action.config,
                [key]: value,
              },
            }
          : action
      ),
    }));
  };

  const removeAction = (index) => {
    setForm((previous) => ({
      ...previous,
      actions: previous.actions
        .filter(
          (_, actionIndex) => actionIndex !== index
        )
        .map((action, actionIndex) => ({
          ...action,
          order: actionIndex,
        })),
    }));
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = () => {
    if (!form.name.trim()) {
      showToast('Automation name is required', 'error');
      return false;
    }

    if (!form.module) {
      showToast('Please select a module', 'error');
      return false;
    }

    if (!form.trigger.event) {
      showToast('Please select a trigger event', 'error');
      return false;
    }

    if (!form.actions.length) {
      showToast('Add at least one action', 'error');
      return false;
    }

    for (const condition of form.conditions) {
      if (!condition.field.trim()) {
        showToast(
          'Every condition needs a field',
          'error'
        );
        return false;
      }
    }

    return true;
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const saveAutomation = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        module: form.module,
        trigger: {
          event: form.trigger.event,
          config: form.trigger.config || {},
        },
        conditions: form.conditions.map((condition) => ({
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
        })),
        conditionLogic: form.conditionLogic,
        actions: form.actions.map((action, index) => ({
          type: action.type,
          config: action.config || {},
          order: index,
        })),
        status: form.status,
      };

      if (
        modal === 'edit' &&
        selectedAutomation?._id
      ) {
        await api.put(
          `/${selectedAutomation._id}`,
          payload
        );

        showToast(
          'Automation updated successfully'
        );
      } else {
        await api.post('/', payload);

        showToast(
          'Automation created successfully'
        );
      }

      setModal(null);
      setSelectedAutomation(null);
      resetForm();

      await fetchAutomations(
        pagination.page,
        true
      );
    } catch (err) {
      console.error('Automation save error:', err);
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     STATUS
  ======================================================= */

  const activateAutomation = async (automation) => {
    try {
      await api.post(
        `/${automation._id}/activate`
      );

      showToast('Automation activated');

      await fetchAutomations(
        pagination.page,
        true
      );
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const pauseAutomation = async (automation) => {
    try {
      await api.post(
        `/${automation._id}/pause`
      );

      showToast('Automation paused');

      await fetchAutomations(
        pagination.page,
        true
      );
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  /* =======================================================
     DUPLICATE
  ======================================================= */

  const duplicateAutomation = async (
    automation
  ) => {
    try {
      await api.post(
        `/${automation._id}/duplicate`
      );

      showToast(
        'Automation duplicated successfully'
      );

      await fetchAutomations(
        pagination.page,
        true
      );
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteAutomation = async (
    automation
  ) => {
    const confirmed = window.confirm(
      `Delete "${automation.name}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/${automation._id}`
      );

      showToast(
        'Automation deleted successfully'
      );

      const nextPage =
        automations.length === 1 &&
        pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await fetchAutomations(
        nextPage,
        true
      );
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  /* =======================================================
     TEST
  ======================================================= */

  const openTest = (automation) => {
    setSelectedAutomation(automation);
    setModal('test');
  };

  const runTest = async () => {
    if (!selectedAutomation?._id) return;

    let parsed;

    try {
      parsed = JSON.parse(testData);
    } catch {
      showToast(
        'Test data must contain valid JSON',
        'error'
      );
      return;
    }

    try {
      setSaving(true);

      const response = await api.post(
        `/${selectedAutomation._id}/test`,
        {
          data: parsed,
        }
      );

      showToast(
        response?.data?.message ||
          'Automation test completed'
      );

      setModal(null);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     EXECUTIONS
  ======================================================= */

  const openExecutions = async (
    automation
  ) => {
    setSelectedAutomation(automation);
    setModal('executions');
    setExecutionLoading(true);
    setExecutions([]);

    try {
      const response = await api.get(
        `/${automation._id}/executions`
      );

      setExecutions(
        Array.isArray(response?.data?.data)
          ? response.data.data
          : []
      );
    } catch (err) {
      showToast(
        getErrorMessage(err),
        'error'
      );
    } finally {
      setExecutionLoading(false);
    }
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const submitSearch = (event) => {
    event.preventDefault();

    setSearch(searchInput.trim());

    setTimeout(() => {
      fetchAutomations(1);
    }, 0);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setModuleFilter('');
    setStatusFilter('');
  };

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const active = automations.filter(
      (item) => item.status === 'ACTIVE'
    ).length;

    const paused = automations.filter(
      (item) => item.status === 'PAUSED'
    ).length;

    const drafts = automations.filter(
      (item) => item.status === 'DRAFT'
    ).length;

    const executions = automations.reduce(
      (total, item) =>
        total + Number(item.executionCount || 0),
      0
    );

    return {
      active,
      paused,
      drafts,
      executions,
    };
  }, [automations]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const goToPage = (page) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    fetchAutomations(page);
  };

  /* =======================================================
     MODAL CLOSE
  ======================================================= */

  const closeModal = () => {
    if (saving) return;

    setModal(null);
    setSelectedAutomation(null);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* ===================================================
          TOAST
      =================================================== */}

      {toast && (
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl dark:bg-slate-900 ${
              toast.type === 'error'
                ? 'border-red-200 dark:border-red-900/50'
                : 'border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                toast.type === 'error'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle size={17} />
              ) : (
                <Check size={17} />
              )}
            </div>

            <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900">
                <Zap size={23} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    Automations
                  </h1>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    CRM
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Automate repetitive CRM workflows with triggers,
                  conditions and actions.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus size={18} />
              Create Automation
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            STATS
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total automations"
            value={pagination.total}
            subtitle="Configured workflows"
            icon={<Activity size={19} />}
          />

          <StatCard
            title="Active"
            value={summary.active}
            subtitle="Currently enabled"
            icon={<CirclePlay size={19} />}
          />

          <StatCard
            title="Paused"
            value={summary.paused}
            subtitle="Temporarily stopped"
            icon={<CirclePause size={19} />}
          />

          <StatCard
            title="Executions"
            value={summary.executions}
            subtitle="Loaded page"
            icon={<TrendingUp size={19} />}
          />
        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form
              onSubmit={submitSearch}
              className="relative flex-1"
            >
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Search automations..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:bg-slate-800"
              />
            </form>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex">
              <div className="relative">
                <Filter
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={moduleFilter}
                  onChange={(event) =>
                    setModuleFilter(event.target.value)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:min-w-[160px]"
                >
                  <option value="">All modules</option>
                  {MODULES.map((module) => (
                    <option
                      key={module}
                      value={module}
                    >
                      {prettyLabel(module)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-9 text-sm font-medium outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:min-w-[145px]"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {prettyLabel(status)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchAutomations(
                    pagination.page,
                    true
                  )
                }
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh
              </button>
            </div>
          </div>

          {(search ||
            moduleFilter ||
            statusFilter) && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filters are active
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="text-sm font-semibold">
                Unable to load automations
              </p>

              <p className="mt-1 text-xs opacity-80">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchAutomations(
                  pagination.page
                )
              }
              className="text-xs font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Automation workflows
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Manage your CRM automation rules
              </p>
            </div>

            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <Settings2 size={14} />
              {pagination.total} total
            </div>
          </div>

          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : automations.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Automation
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Trigger
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Conditions
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Last executed
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {automations.map((automation) => (
                    <tr
                      key={automation._id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      {/* AUTOMATION */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {moduleIcon(
                              automation.module
                            )}
                          </div>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                openView(
                                  automation
                                )
                              }
                              className="max-w-[250px] truncate text-left text-sm font-bold text-slate-900 hover:underline dark:text-white"
                            >
                              {automation.name}
                            </button>

                            <p className="mt-0.5 max-w-[280px] truncate text-xs text-slate-500 dark:text-slate-400">
                              {automation.description ||
                                'No description'}
                            </p>

                            <span className="mt-1 inline-flex text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {prettyLabel(
                                automation.module
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* TRIGGER */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Zap
                            size={14}
                            className="text-slate-400"
                          />

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {prettyLabel(
                              automation.trigger
                                ?.event
                            )}
                          </span>
                        </div>
                      </td>

                      {/* CONDITIONS */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {automation.conditions
                            ?.length || 0}
                        </span>

                        <span className="ml-1 text-xs text-slate-400">
                          condition
                          {(automation.conditions
                            ?.length || 0) !== 1
                            ? 's'
                            : ''}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {automation.actions
                              ?.length || 0}
                          </span>

                          <span className="text-xs text-slate-400">
                            action
                            {(automation.actions
                              ?.length || 0) !== 1
                              ? 's'
                              : ''}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            automation.status
                          }
                        />
                      </td>

                      {/* LAST EXECUTED */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Clock3 size={14} />

                          {automation.lastExecutedAt
                            ? formatDateTime(
                                automation.lastExecutedAt
                              )
                            : 'Never'}
                        </div>

                        {automation.executionCount >
                          0 && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {automation.executionCount}{' '}
                            execution
                            {automation.executionCount !==
                            1
                              ? 's'
                              : ''}
                          </p>
                        )}
                      </td>

                      {/* ACTION MENU */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View"
                            onClick={() =>
                              openView(
                                automation
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            title="Edit"
                            onClick={() =>
                              openEdit(
                                automation
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Edit3 size={16} />
                          </button>

                          {automation.status !==
                            'ACTIVE' && (
                            <button
                              type="button"
                              title="Activate"
                              onClick={() =>
                                activateAutomation(
                                  automation
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                            >
                              <CirclePlay
                                size={16}
                              />
                            </button>
                          )}

                          {automation.status ===
                            'ACTIVE' && (
                            <button
                              type="button"
                              title="Pause"
                              onClick={() =>
                                pauseAutomation(
                                  automation
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
                            >
                              <CirclePause
                                size={16}
                              />
                            </button>
                          )}

                          <button
                            type="button"
                            title="Duplicate"
                            onClick={() =>
                              duplicateAutomation(
                                automation
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Copy size={16} />
                          </button>

                          <button
                            type="button"
                            title="Execution logs"
                            onClick={() =>
                              openExecutions(
                                automation
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Activity
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete"
                            onClick={() =>
                              deleteAutomation(
                                automation
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================
              PAGINATION
          ================================================= */}

          {!loading &&
            automations.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Page {pagination.page} of{' '}
                  {pagination.totalPages}
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={
                      pagination.page <= 1
                    }
                    onClick={() =>
                      goToPage(
                        pagination.page - 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from(
                    {
                      length: Math.min(
                        pagination.totalPages,
                        5
                      ),
                    },
                    (_, index) => {
                      const page = index + 1;

                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() =>
                            goToPage(page)
                          }
                          className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition ${
                            page ===
                            pagination.page
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}

                  <button
                    type="button"
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      goToPage(
                        pagination.page + 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
        </div>
      </main>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      {(modal === 'create' ||
        modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <Zap size={18} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    {modal === 'edit'
                      ? 'Edit Automation'
                      : 'Create Automation'}
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure trigger, conditions and actions
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}
            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* BASIC */}
                <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <div className="mb-5">
                    <h3 className="text-sm font-bold">
                      Basic information
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Define what this automation is for.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                        Automation name *
                      </label>

                      <input
                        value={form.name}
                        onChange={(event) =>
                          updateForm(
                            'name',
                            event.target.value
                          )
                        }
                        placeholder="e.g. New Lead Welcome Email"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:border-slate-500 dark:focus:bg-slate-800"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                        Description
                      </label>

                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          updateForm(
                            'description',
                            event.target.value
                          )
                        }
                        rows={4}
                        placeholder="Describe what this automation does..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:border-slate-500 dark:focus:bg-slate-800"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                          Module *
                        </label>

                        <select
                          value={form.module}
                          onChange={(event) =>
                            updateModule(
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                        >
                          {MODULES.map(
                            (module) => (
                              <option
                                key={module}
                                value={module}
                              >
                                {prettyLabel(
                                  module
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                          Status
                        </label>

                        <select
                          value={form.status}
                          onChange={(event) =>
                            updateForm(
                              'status',
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                        >
                          {STATUSES.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {prettyLabel(
                                  status
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* TRIGGER */}
                <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <div className="mb-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Zap
                        size={16}
                        className="text-slate-500"
                      />
                      Trigger
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Choose the event that starts the automation.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                      Event *
                    </label>

                    <select
                      value={form.trigger.event}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          trigger: {
                            ...previous.trigger,
                            event:
                              event.target.value,
                          },
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                    >
                      {(
                        TRIGGER_EVENTS[
                          form.module
                        ] || []
                      ).map((event) => (
                        <option
                          key={event}
                          value={event}
                        >
                          {prettyLabel(event)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <div className="flex gap-3">
                      <div className="mt-0.5 text-slate-500">
                        <Activity size={16} />
                      </div>

                      <div>
                        <p className="text-xs font-bold">
                          Trigger preview
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          When{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {prettyLabel(
                              form.trigger.event
                            )}
                          </span>{' '}
                          occurs in{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
  {prettyLabel(form.module)}
</span>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CONDITIONS */}
                <section className="rounded-2xl border border-slate-200 p-5 lg:col-span-2 dark:border-slate-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold">
                        Conditions
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Optional rules that must be satisfied before actions run.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={form.conditionLogic}
                        onChange={(event) =>
                          updateForm(
                            'conditionLogic',
                            event.target.value
                          )
                        }
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                      >
                        <option value="AND">
                          Match ALL
                        </option>
                        <option value="OR">
                          Match ANY
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={addCondition}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white dark:bg-white dark:text-slate-900"
                      >
                        <Plus size={14} />
                        Add condition
                      </button>
                    </div>
                  </div>

                  {form.conditions.length ===
                  0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                      <Filter
                        size={20}
                        className="mx-auto text-slate-400"
                      />

                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        No conditions. Actions will run whenever the trigger occurs.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {form.conditions.map(
                        (
                          condition,
                          index
                        ) => (
                          <div
                            key={index}
                            className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] dark:bg-slate-800/60"
                          >
                            <input
                              value={
                                condition.field
                              }
                              onChange={(event) =>
                                updateCondition(
                                  index,
                                  'field',
                                  event.target
                                    .value
                                )
                              }
                              placeholder="Field e.g. status"
                              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                            />

                            <select
                              value={
                                condition.operator
                              }
                              onChange={(event) =>
                                updateCondition(
                                  index,
                                  'operator',
                                  event.target
                                    .value
                                )
                              }
                              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                            >
                              {OPERATORS.map(
                                (
                                  operator
                                ) => (
                                  <option
                                    key={
                                      operator
                                    }
                                    value={
                                      operator
                                    }
                                  >
                                    {prettyLabel(
                                      operator
                                    )}
                                  </option>
                                )
                              )}
                            </select>

                            <input
                              value={
                                condition.value ??
                                ''
                              }
                              onChange={(event) =>
                                updateCondition(
                                  index,
                                  'value',
                                  event.target
                                    .value
                                )
                              }
                              placeholder="Value"
                              disabled={[
                                'IS_EMPTY',
                                'IS_NOT_EMPTY',
                              ].includes(
                                condition.operator
                              )}
                              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeCondition(
                                  index
                                )
                              }
                              className="flex h-10 items-center justify-center rounded-lg px-3 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            >
                              <Trash2
                                size={15}
                              />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>

                {/* ACTIONS */}
                <section className="rounded-2xl border border-slate-200 p-5 lg:col-span-2 dark:border-slate-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold">
                        Actions
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Define what should happen when the automation runs.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addAction}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white dark:bg-white dark:text-slate-900"
                    >
                      <Plus size={14} />
                      Add action
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {form.actions.map(
                      (action, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {index + 1}
                              </div>

                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Action
                              </span>
                            </div>

                            {form.actions.length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeAction(
                                    index
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                              >
                                <Trash2
                                  size={15}
                                />
                              </button>
                            )}
                          </div>

                          <div className="mt-4">
                            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                              Action type
                            </label>

                            <select
                              value={action.type}
                              onChange={(event) =>
                                updateActionType(
                                  index,
                                  event.target
                                    .value
                                )
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                            >
                              {ACTION_TYPES.map(
                                (type) => (
                                  <option
                                    key={type}
                                    value={type}
                                  >
                                    {prettyLabel(
                                      type
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          {/* EMAIL */}
                          {action.type ===
                            'SEND_EMAIL' && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                                  To
                                </label>

                                <input
                                  value={
                                    action.config
                                      ?.to ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'to',
                                      event.target
                                        .value
                                    )
                                  }
                                  placeholder="{{lead.email}}"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                                  Subject
                                </label>

                                <input
                                  value={
                                    action.config
                                      ?.subject ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'subject',
                                      event.target
                                        .value
                                    )
                                  }
                                  placeholder="Welcome to Ready Tech Solutions"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                                  Message
                                </label>

                                <textarea
                                  value={
                                    action.config
                                      ?.message ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'message',
                                      event.target
                                        .value
                                    )
                                  }
                                  rows={3}
                                  placeholder="Enter email message..."
                                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            </div>
                          )}

                          {/* ASSIGN OWNER */}
                          {action.type ===
                            'ASSIGN_OWNER' && (
                            <div className="mt-4">
                              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                                Owner ID
                              </label>

                              <input
                                value={
                                  action.config
                                    ?.ownerId ||
                                  ''
                                }
                                onChange={(event) =>
                                  updateActionConfig(
                                    index,
                                    'ownerId',
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="MongoDB User ID"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                              />
                            </div>
                          )}

                          {/* TASK */}
                          {action.type ===
                            'CREATE_TASK' && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block text-xs font-bold">
                                  Title
                                </label>

                                <input
                                  value={
                                    action.config
                                      ?.title ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'title',
                                      event.target
                                        .value
                                    )
                                  }
                                  placeholder="Follow up with lead"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-bold">
                                  Due date
                                </label>

                                <input
                                  type="date"
                                  value={
                                    action.config
                                      ?.dueDate ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'dueDate',
                                      event.target
                                        .value
                                    )
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-xs font-bold">
                                  Description
                                </label>

                                <textarea
                                  value={
                                    action.config
                                      ?.description ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'description',
                                      event.target
                                        .value
                                    )
                                  }
                                  rows={2}
                                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            </div>
                          )}

                          {/* TAG */}
                          {(action.type ===
                            'ADD_TAG' ||
                            action.type ===
                              'REMOVE_TAG') && (
                            <div className="mt-4">
                              <label className="mb-1.5 block text-xs font-bold">
                                Tag
                              </label>

                              <input
                                value={
                                  action.config
                                    ?.tag ||
                                  ''
                                }
                                onChange={(event) =>
                                  updateActionConfig(
                                    index,
                                    'tag',
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="e.g. qualified"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                              />
                            </div>
                          )}

                          {/* NOTIFICATION */}
                          {action.type ===
                            'CREATE_NOTIFICATION' && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block text-xs font-bold">
                                  Title
                                </label>

                                <input
                                  value={
                                    action.config
                                      ?.title ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'title',
                                      event.target
                                        .value
                                    )
                                  }
                                  placeholder="New notification"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-bold">
                                  Message
                                </label>

                                <input
                                  value={
                                    action.config
                                      ?.message ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateActionConfig(
                                      index,
                                      'message',
                                      event.target
                                        .value
                                    )
                                  }
                                  placeholder="Notification message"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            </div>
                          )}

                          {/* UPDATE RECORD */}
                          {action.type ===
                            'UPDATE_RECORD' && (
                            <div className="mt-4">
                              <label className="mb-1.5 block text-xs font-bold">
                                Update configuration
                              </label>

                              <textarea
                                value={JSON.stringify(
                                  action.config ||
                                    {},
                                  null,
                                  2
                                )}
                                onChange={(event) => {
                                  try {
                                    const parsed =
                                      JSON.parse(
                                        event
                                          .target
                                          .value
                                      );

                                    setForm(
                                      (
                                        previous
                                      ) => ({
                                        ...previous,
                                        actions:
                                          previous.actions.map(
                                            (
                                              item,
                                              actionIndex
                                            ) =>
                                              actionIndex ===
                                              index
                                                ? {
                                                    ...item,
                                                    config:
                                                      parsed,
                                                  }
                                                : item
                                          ),
                                      })
                                    );
                                  } catch {
                                    // Allow temporary invalid JSON while editing.
                                  }
                                }}
                                rows={5}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                              />
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAutomation}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {modal === 'edit'
                  ? 'Save Changes'
                  : 'Create Automation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW MODAL
      ===================================================== */}

      {modal === 'view' &&
        selectedAutomation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {selectedAutomation.name}
                    </h2>

                    <StatusBadge
                      status={
                        selectedAutomation.status
                      }
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {prettyLabel(
                      selectedAutomation.module
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {selectedAutomation.description ||
                      'No description provided.'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Trigger
                    </p>

                    <p className="mt-2 text-sm font-bold">
                      {prettyLabel(
                        selectedAutomation.trigger
                          ?.event
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Condition logic
                    </p>

                    <p className="mt-2 text-sm font-bold">
                      {selectedAutomation.conditionLogic ||
                        'AND'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      Conditions
                    </h3>

                    <span className="text-xs text-slate-400">
                      {selectedAutomation.conditions
                        ?.length || 0}
                    </span>
                  </div>

                  {selectedAutomation.conditions
                    ?.length ? (
                    <div className="space-y-2">
                      {selectedAutomation.conditions.map(
                        (condition, index) => (
                          <div
                            key={index}
                            className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3 dark:bg-slate-800/60"
                          >
                            <span className="text-xs font-semibold">
                              {condition.field}
                            </span>

                            <span className="text-xs text-slate-500">
                              {prettyLabel(
                                condition.operator
                              )}
                            </span>

                            <span className="text-xs font-semibold">
                              {String(
                                condition.value ??
                                  ''
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-800/60">
                      No conditions configured.
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      Actions
                    </h3>

                    <span className="text-xs text-slate-400">
                      {selectedAutomation.actions
                        ?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedAutomation.actions?.map(
                      (action, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {action.type ===
                            'SEND_EMAIL' ? (
                              <Mail size={15} />
                            ) : action.type ===
                              'CREATE_NOTIFICATION' ? (
                              <Bell size={15} />
                            ) : (
                              <Zap size={15} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold">
                              {index + 1}.{' '}
                              {prettyLabel(
                                action.type
                              )}
                            </p>

                            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                              {JSON.stringify(
                                action.config ||
                                  {},
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Executions
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {selectedAutomation.executionCount ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {formatDate(
                        selectedAutomation.createdAt
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Last run
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {selectedAutomation.lastExecutedAt
                        ? formatDate(
                            selectedAutomation.lastExecutedAt
                          )
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          TEST MODAL
      ===================================================== */}

      {modal === 'test' &&
        selectedAutomation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold">
                    Test Automation
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedAutomation.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  Provide sample record data as JSON. The backend test
                  endpoint will create an execution record for this
                  automation.
                </div>

                <label className="mt-5 mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Test data
                </label>

                <textarea
                  value={testData}
                  onChange={(event) =>
                    setTestData(
                      event.target.value
                    )
                  }
                  rows={12}
                  spellCheck={false}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200 outline-none focus:border-slate-500 dark:border-slate-700"
                />

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={runTest}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                  >
                    {saving && (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    )}

                    Run Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          EXECUTIONS MODAL
      ===================================================== */}

      {modal === 'executions' &&
        selectedAutomation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold">
                    Execution Logs
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedAutomation.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="overflow-y-auto">
                {executionLoading ? (
                  <div className="space-y-3 p-5">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </div>
                ) : executions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <Activity
                      size={28}
                      className="text-slate-400"
                    />

                    <p className="mt-3 text-sm font-semibold">
                      No execution logs
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Run a test or trigger the automation to create an execution record.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {executions.map(
                      (execution) => (
                        <div
                          key={
                            execution._id
                          }
                          className="p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                  execution.status ===
                                  'SUCCESS'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : execution.status ===
                                        'FAILED'
                                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                }`}
                              >
                                {execution.status ===
                                'SUCCESS' ? (
                                  <Check
                                    size={17}
                                  />
                                ) : (
                                  <Activity
                                    size={17}
                                  />
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-bold">
                                  {prettyLabel(
                                    execution.triggerEvent
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDateTime(
                                    execution.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">
                                {execution.actionsExecuted ||
                                  0}{' '}
                                actions
                              </span>

                              <StatusBadge
                                status={
                                  execution.status
                                }
                              />
                            </div>
                          </div>

                          {execution.error && (
                            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                              {execution.error}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}