import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  Filter,
  ListTodo,
  Loader2,
  MoreHorizontal,
  PackageOpen,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Target,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const TASK_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const TASK_PRIORITY = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "PENDING",
  priority: "MEDIUM",
  startAt: "",
  dueAt: "",
  reminderEnabled: false,
  reminderAt: "",
  assignedTo: "",
  lead: "",
  company: "",
  contact: "",
  opportunity: "",
};

const TAB_CONFIG = [
  {
    key: "all",
    label: "All Tasks",
    icon: ListTodo,
  },
  {
    key: "my",
    label: "My Tasks",
    icon: UserCheck,
  },
  {
    key: "upcoming",
    label: "Upcoming",
    icon: CalendarDays,
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertCircle,
  },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getResponseData = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

const getTaskList = (response) => {
  const data = getResponseData(response);

  if (Array.isArray(data)) return data;

  return (
    data?.tasks ||
    data?.items ||
    data?.results ||
    []
  );
};

const getPagination = (response) => {
  const data = getResponseData(response);

  return (
    data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    }
  );
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const toInputDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const fromInputDateTime = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};

const isOverdueTask = (task) => {
  if (!task?.dueAt) return false;

  if (
    ["COMPLETED", "CANCELLED"].includes(task.status)
  ) {
    return false;
  }

  return new Date(task.dueAt).getTime() < Date.now();
};

const getDisplayName = (entity) => {
  if (!entity) return "";

  if (typeof entity === "string") return entity;

  return (
    entity.name ||
    entity.fullName ||
    entity.title ||
    entity.companyName ||
    entity.email ||
    entity._id ||
    ""
  );
};

const getId = (entity) => {
  if (!entity) return "";

  if (typeof entity === "string") return entity;

  return entity._id || entity.id || "";
};

const getInitials = (value = "") => {
  const text = String(value).trim();

  if (!text) return "T";

  const parts = text.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

/*
|--------------------------------------------------------------------------
| STYLE HELPERS
|--------------------------------------------------------------------------
*/

const statusConfig = {
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
};

const priorityConfig = {
  LOW: {
    label: "Low",
    className:
      "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  },
  MEDIUM: {
    label: "Medium",
    className:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
  HIGH: {
    label: "High",
    className:
      "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
  URGENT: {
    label: "Urgent",
    className:
      "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

/*
|--------------------------------------------------------------------------
| BADGES
|--------------------------------------------------------------------------
*/

function StatusBadge({ status }) {
  const config =
    statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        config.className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.dot
        )}
      />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const config =
    priorityConfig[priority] ||
    priorityConfig.MEDIUM;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| CONFIRM MODAL
|--------------------------------------------------------------------------
*/

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="p-6">
          <div
            className={cn(
              "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
              danger
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-600"
            )}
          >
            {danger ? (
              <Trash2 size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50",
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {loading && (
              <Loader2
                size={15}
                className="animate-spin"
              />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TASK FORM MODAL
|--------------------------------------------------------------------------
*/

function TaskFormModal({
  open,
  mode,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
          <div>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              {isEdit ? (
                <Edit3 size={18} />
              ) : (
                <Plus size={19} />
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit task" : "Create new task"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? "Update task details and workflow information."
                : "Create a follow-up task for your CRM workflow."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit}>
          <div className="space-y-6 p-6 sm:p-7">
            {/* Basic */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Task details
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Define what needs to be completed.
                </p>
              </div>

              <div className="grid gap-4">
                <Field
                  label="Task title"
                  required
                >
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    required
                    maxLength={200}
                    placeholder="e.g. Follow up with customer"
                    className={inputClass}
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    rows={4}
                    maxLength={5000}
                    placeholder="Add task details, context or instructions..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>
            </section>

            {/* Status */}
            <section className="border-t border-slate-100 pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Workflow
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Set priority and current task status.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className={inputClass}
                  >
                    {TASK_STATUS.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {statusConfig[status]?.label ||
                          status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Priority">
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={onChange}
                    className={inputClass}
                  >
                    {TASK_PRIORITY.map((priority) => (
                      <option
                        key={priority}
                        value={priority}
                      >
                        {priorityConfig[priority]?.label ||
                          priority}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {/* Schedule */}
            <section className="border-t border-slate-100 pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Schedule & reminder
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Set start, due and reminder times.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date & time">
                  <input
                    type="datetime-local"
                    name="startAt"
                    value={form.startAt}
                    onChange={onChange}
                    className={inputClass}
                  />
                </Field>

                <Field label="Due date & time">
                  <input
                    type="datetime-local"
                    name="dueAt"
                    value={form.dueAt}
                    onChange={onChange}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                        <Bell size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Enable reminder
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Add a reminder time for this task.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      name="reminderEnabled"
                      checked={form.reminderEnabled}
                      onChange={onChange}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </label>
                </div>

                {form.reminderEnabled && (
                  <Field
                    label="Reminder date & time"
                    className="sm:col-span-2"
                  >
                    <input
                      type="datetime-local"
                      name="reminderAt"
                      value={form.reminderAt}
                      onChange={onChange}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
            </section>

            {/* Assignment */}
            <section className="border-t border-slate-100 pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Assignment
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Assign this task to a CRM user.
                </p>
              </div>

              <Field label="Assigned user ID">
                <input
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={onChange}
                  placeholder="Paste user ID"
                  className={inputClass}
                />
              </Field>
            </section>

            {/* CRM links */}
            <section className="border-t border-slate-100 pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  CRM relationships
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Optionally link this task to a lead, company,
                  contact or opportunity.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lead ID">
                  <input
                    name="lead"
                    value={form.lead}
                    onChange={onChange}
                    placeholder="Lead ID"
                    className={inputClass}
                  />
                </Field>

                <Field label="Company ID">
                  <input
                    name="company"
                    value={form.company}
                    onChange={onChange}
                    placeholder="Company ID"
                    className={inputClass}
                  />
                </Field>

                <Field label="Contact ID">
                  <input
                    name="contact"
                    value={form.contact}
                    onChange={onChange}
                    placeholder="Contact ID"
                    className={inputClass}
                  />
                </Field>

                <Field label="Opportunity ID">
                  <input
                    name="opportunity"
                    value={form.opportunity}
                    onChange={onChange}
                    placeholder="Opportunity ID"
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| FIELD
|--------------------------------------------------------------------------
*/

function Field({
  label,
  required = false,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

/*
|--------------------------------------------------------------------------
| DETAILS DRAWER
|--------------------------------------------------------------------------
*/

function TaskDetailsDrawer({
  task,
  onClose,
  onEdit,
  onStart,
  onComplete,
  onCancel,
  onDelete,
  onRestore,
  actionLoading,
}) {
  if (!task) return null;

  const assignedName =
    getDisplayName(task.assignedTo) ||
    "Unassigned";

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 pr-4">
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>

            <h2 className="truncate text-xl font-bold text-slate-900">
              {task.title}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Task ID: {task._id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Description */}
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Description
              </h3>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {task.description || "No description added."}
              </div>
            </section>

            {/* Schedule */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Schedule
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem
                  icon={Calendar}
                  label="Start"
                  value={formatDateTime(task.startAt)}
                />

                <InfoItem
                  icon={Clock3}
                  label="Due"
                  value={formatDateTime(task.dueAt)}
                  danger={isOverdueTask(task)}
                />

                <InfoItem
                  icon={CheckCircle2}
                  label="Completed"
                  value={formatDateTime(
                    task.completedAt
                  )}
                />

                <InfoItem
                  icon={Bell}
                  label="Reminder"
                  value={
                    task.reminderEnabled
                      ? formatDateTime(task.reminderAt)
                      : "Disabled"
                  }
                />
              </div>
            </section>

            {/* Assignment */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Assignment
              </h3>

              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {getInitials(assignedName)}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {assignedName}
                    </p>

                    {task.assignedTo?.email && (
                      <p className="text-xs text-slate-400">
                        {task.assignedTo.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* CRM links */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                CRM relationships
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <RelationshipCard
                  icon={User}
                  label="Lead"
                  value={getDisplayName(task.lead)}
                />

                <RelationshipCard
                  icon={Building2}
                  label="Company"
                  value={getDisplayName(task.company)}
                />

                <RelationshipCard
                  icon={Users}
                  label="Contact"
                  value={getDisplayName(task.contact)}
                />

                <RelationshipCard
                  icon={Target}
                  label="Opportunity"
                  value={getDisplayName(
                    task.opportunity
                  )}
                />
              </div>
            </section>

            {/* Audit */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Activity
              </h3>

              <div className="space-y-2 text-xs text-slate-500">
                <p>
                  Created:{" "}
                  <span className="font-medium text-slate-700">
                    {formatDateTime(task.createdAt)}
                  </span>
                </p>

                <p>
                  Updated:{" "}
                  <span className="font-medium text-slate-700">
                    {formatDateTime(task.updatedAt)}
                  </span>
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {task.isDeleted ? (
              <button
                type="button"
                onClick={() => onRestore(task)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <RotateCcw size={15} />
                Restore
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Edit3 size={15} />
                  Edit
                </button>

                {task.status !== "IN_PROGRESS" &&
                  task.status !== "COMPLETED" &&
                  task.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => onStart(task)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Activity size={15} />
                      Start
                    </button>
                  )}

                {task.status !== "COMPLETED" &&
                  task.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => onComplete(task)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check size={15} />
                      Complete
                    </button>
                  )}

                {task.status !== "COMPLETED" &&
                  task.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => onCancel(task)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      Cancel
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => onDelete(task)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO ITEM
|--------------------------------------------------------------------------
*/

function InfoItem({
  icon: Icon,
  label,
  value,
  danger = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3.5">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <Icon size={15} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p
        className={cn(
          "text-sm font-semibold",
          danger ? "text-red-600" : "text-slate-700"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| RELATIONSHIP CARD
|--------------------------------------------------------------------------
*/

function RelationshipCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3.5">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <Icon size={15} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="truncate text-sm font-semibold text-slate-700">
        {value || "Not linked"}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MOBILE TASK CARD
|--------------------------------------------------------------------------
*/

function MobileTaskCard({
  task,
  onView,
  onStart,
  onComplete,
  onEdit,
  onDelete,
}) {
  const overdue = isOverdueTask(task);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onView(task)}
            className="block max-w-full truncate text-left text-sm font-bold text-slate-900 hover:text-blue-600"
          >
            {task.title}
          </button>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onView(task)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Eye size={17} />
        </button>
      </div>

      <div className="mt-4 space-y-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Calendar size={14} />

          <span
            className={
              overdue
                ? "font-semibold text-red-600"
                : ""
            }
          >
            {formatDateTime(task.dueAt)}
          </span>

          {overdue && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600">
              Overdue
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <User size={14} />

          <span className="truncate">
            {getDisplayName(task.assignedTo) ||
              "Unassigned"}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">
          {task.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {task.status !== "IN_PROGRESS" &&
          task.status !== "COMPLETED" &&
          task.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => onStart(task)}
              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
            >
              Start
            </button>
          )}

        {task.status !== "COMPLETED" &&
          task.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => onComplete(task)}
              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
            >
              Complete
            </button>
          )}

        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(task)}
          className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function Tasks() {
  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    upcoming: 0,
    urgent: 0,
    high: 0,
  });

  /*
  |--------------------------------------------------------------------------
  | UI STATE
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("all");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [sortBy, setSortBy] =
    useState("createdAt");
  const [sortOrder, setSortOrder] =
    useState("desc");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  /*
  |--------------------------------------------------------------------------
  | MODALS
  |--------------------------------------------------------------------------
  */

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] =
    useState("create");
  const [editingTask, setEditingTask] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [formSaving, setFormSaving] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [confirm, setConfirm] = useState({
    open: false,
    type: "",
    task: null,
  });

  /*
  |--------------------------------------------------------------------------
  | TOAST
  |--------------------------------------------------------------------------
  */

  const [toast, setToast] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | TOAST HELPER
  |--------------------------------------------------------------------------
  */

  const showToast = useCallback(
    (message, type = "success") => {
      setToast({
        message,
        type,
      });

      window.setTimeout(() => {
        setToast(null);
      }, 3500);
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | BUILD QUERY
  |--------------------------------------------------------------------------
  */

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(limit));

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (status) {
      params.set("status", status);
    }

    if (priority) {
      params.set("priority", priority);
    }

    if (fromDate) {
      params.set("from", fromDate);
    }

    if (toDate) {
      params.set("to", toDate);
    }

    if (sortBy) {
      params.set("sortBy", sortBy);
    }

    if (sortOrder) {
      params.set(
        "sortOrder",
        sortOrder
      );
    }

    return params.toString();
  }, [
    page,
    limit,
    search,
    status,
    priority,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FETCH TASKS
  |--------------------------------------------------------------------------
  */

  const fetchTasks = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        let endpoint =
          `/tasks?${buildQuery()}`;

        if (activeTab === "my") {
          endpoint =
            `/tasks/my?${buildQuery()}`;
        }

        if (activeTab === "upcoming") {
          endpoint =
            `/tasks/upcoming?page=${page}&limit=${limit}`;

          if (priority) {
            endpoint += `&priority=${encodeURIComponent(
              priority
            )}`;
          }
        }

        if (activeTab === "overdue") {
          endpoint =
            `/tasks/overdue?page=${page}&limit=${limit}`;

          if (priority) {
            endpoint += `&priority=${encodeURIComponent(
              priority
            )}`;
          }
        }

        const response =
          await API.get(endpoint);

        const list =
          getTaskList(response);

        const pageData =
          getPagination(response);

        setTasks(list);
        setPagination(pageData);
      } catch (err) {
        const message =
          getErrorMessage(err);

        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      activeTab,
      buildQuery,
      page,
      limit,
      priority,
      showToast,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | FETCH STATS
  |--------------------------------------------------------------------------
  */

  const fetchStats =
    useCallback(async () => {
      try {
        const response =
          await API.get("/tasks/stats");

        const data =
          getResponseData(response);

        if (data) {
          setStats({
            total: Number(data.total || 0),
            pending: Number(
              data.pending || 0
            ),
            inProgress: Number(
              data.inProgress || 0
            ),
            completed: Number(
              data.completed || 0
            ),
            cancelled: Number(
              data.cancelled || 0
            ),
            overdue: Number(
              data.overdue || 0
            ),
            upcoming: Number(
              data.upcoming || 0
            ),
            urgent: Number(
              data.urgent || 0
            ),
            high: Number(
              data.high || 0
            ),
          });
        }
      } catch (err) {
        // Stats should not block the main task list.
      }
    }, []);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD / FILTER LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /*
  |--------------------------------------------------------------------------
  | FORM HANDLERS
  |--------------------------------------------------------------------------
  */

  const handleFormChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormMode("create");
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditModal = (task) => {
    setSelectedTask(null);

    setEditingTask(task);
    setFormMode("edit");

    setForm({
      title: task.title || "",
      description: task.description || "",
      status:
        task.status || "PENDING",
      priority:
        task.priority || "MEDIUM",
      startAt: toInputDateTime(
        task.startAt
      ),
      dueAt: toInputDateTime(
        task.dueAt
      ),
      reminderEnabled:
        Boolean(task.reminderEnabled),
      reminderAt: toInputDateTime(
        task.reminderAt
      ),
      assignedTo:
        getId(task.assignedTo),
      lead: getId(task.lead),
      company: getId(task.company),
      contact: getId(task.contact),
      opportunity:
        getId(task.opportunity),
    });

    setFormOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE / UPDATE
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      showToast(
        "Task title is required",
        "error"
      );
      return;
    }

    try {
      setFormSaving(true);

      const payload = {
        title: form.title.trim(),
        description:
          form.description.trim(),
        status: form.status,
        priority: form.priority,
        startAt:
          fromInputDateTime(
            form.startAt
          ),
        dueAt:
          fromInputDateTime(
            form.dueAt
          ),
        reminderEnabled:
          Boolean(
            form.reminderEnabled
          ),
        reminderAt:
          form.reminderEnabled
            ? fromInputDateTime(
                form.reminderAt
              )
            : null,
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
      };

      if (formMode === "edit") {
        await API.put(
          `/tasks/${editingTask._id}`,
          payload
        );

        showToast(
          "Task updated successfully"
        );
      } else {
        await API.post(
          "/tasks",
          payload
        );

        showToast(
          "Task created successfully"
        );
      }

      setFormOpen(false);
      setEditingTask(null);
      setForm(EMPTY_FORM);

      await Promise.all([
        fetchTasks(true),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        getErrorMessage(err),
        "error"
      );
    } finally {
      setFormSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ACTION
  |--------------------------------------------------------------------------
  */

  const runTaskAction = async (
    task,
    action
  ) => {
    try {
      setActionLoading(true);

      if (action === "start") {
        await API.patch(
          `/tasks/${task._id}/start`
        );

        showToast(
          "Task started successfully"
        );
      }

      if (action === "complete") {
        await API.patch(
          `/tasks/${task._id}/complete`,
          {}
        );

        showToast(
          "Task completed successfully"
        );
      }

      if (action === "cancel") {
        await API.patch(
          `/tasks/${task._id}/cancel`,
          {}
        );

        showToast(
          "Task cancelled successfully"
        );
      }

      if (action === "delete") {
        await API.delete(
          `/tasks/${task._id}`
        );

        showToast(
          "Task deleted successfully"
        );
      }

      if (action === "restore") {
        await API.patch(
          `/tasks/${task._id}/restore`
        );

        showToast(
          "Task restored successfully"
        );
      }

      setConfirm({
        open: false,
        type: "",
        task: null,
      });

      setSelectedTask(null);

      await Promise.all([
        fetchTasks(true),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        getErrorMessage(err),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ASSIGN
  |--------------------------------------------------------------------------
  */

  const assignTask = async (task) => {
    const assignedTo = window.prompt(
      "Enter User ID to assign this task:"
    );

    if (!assignedTo?.trim()) return;

    try {
      setActionLoading(true);

      await API.patch(
        `/tasks/${task._id}/assign`,
        {
          assignedTo:
            assignedTo.trim(),
        }
      );

      showToast(
        "Task assigned successfully"
      );

      await Promise.all([
        fetchTasks(true),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        getErrorMessage(err),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CONFIRM ACTION
  |--------------------------------------------------------------------------
  */

  const requestAction = (
    type,
    task
  ) => {
    setConfirm({
      open: true,
      type,
      task,
    });
  };

  const confirmTitle = useMemo(() => {
    const type = confirm.type;

    if (type === "delete")
      return "Delete this task?";

    if (type === "cancel")
      return "Cancel this task?";

    if (type === "complete")
      return "Complete this task?";

    if (type === "start")
      return "Start this task?";

    if (type === "restore")
      return "Restore this task?";

    return "Confirm action";
  }, [confirm.type]);

  const confirmDescription =
    useMemo(() => {
      const title =
        confirm.task?.title ||
        "this task";

      if (confirm.type === "delete") {
        return `"${title}" will be soft deleted. You can restore it later.`;
      }

      if (confirm.type === "cancel") {
        return `"${title}" will be marked as cancelled.`;
      }

      if (confirm.type === "complete") {
        return `"${title}" will be marked as completed.`;
      }

      if (confirm.type === "start") {
        return `"${title}" will move to In Progress.`;
      }

      if (confirm.type === "restore") {
        return `"${title}" will be restored to your active tasks.`;
      }

      return "Please confirm this action.";
    }, [
      confirm.task,
      confirm.type,
    ]);

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setFromDate("");
    setToDate("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasFilters =
    Boolean(search) ||
    Boolean(status) ||
    Boolean(priority) ||
    Boolean(fromDate) ||
    Boolean(toDate);

  /*
  |--------------------------------------------------------------------------
  | TAB CHANGE
  |--------------------------------------------------------------------------
  */

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const currentPage =
    pagination.page || page || 1;

  const totalPages =
    pagination.pages || 1;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-[120] w-[min(380px,calc(100vw-2rem))]">
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl",
              toast.type === "error"
                ? "border-red-200"
                : "border-emerald-200"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                toast.type === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              )}
            >
              {toast.type === "error" ? (
                <AlertCircle size={17} />
              ) : (
                <Check size={17} />
              )}
            </div>

            <p className="flex-1 pt-1 text-sm font-medium text-slate-700">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Page */}
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Zap size={13} />
              CRM Workspace
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Tasks
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Organize follow-ups, assignments and
              customer actions in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTasks(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={17} />
              New Task
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard
            label="Total tasks"
            value={stats.total}
            icon={ListTodo}
            iconClass="bg-slate-100 text-slate-700"
          />

          <StatCard
            label="In progress"
            value={stats.inProgress}
            icon={Activity}
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            label="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            label="Upcoming"
            value={stats.upcoming}
            icon={CalendarDays}
            iconClass="bg-violet-50 text-violet-600"
          />

          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon={AlertCircle}
            iconClass="bg-red-50 text-red-600"
          />
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
          {/* Tabs */}
          <div className="border-b border-slate-100 px-4 pt-3 sm:px-6">
            <div className="flex gap-1 overflow-x-auto">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const active =
                  activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      handleTabChange(
                        tab.key
                      )
                    }
                    className={cn(
                      "relative inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold transition",
                      active
                        ? "text-slate-950"
                        : "text-slate-400 hover:text-slate-700"
                    )}
                  >
                    <Icon size={16} />

                    {tab.label}

                    {tab.key === "overdue" &&
                      stats.overdue > 0 && (
                        <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                          {stats.overdue}
                        </span>
                      )}

                    {active && (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-slate-100 bg-slate-50/40 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              {/* Search */}
              <div className="relative min-w-0 flex-1 xl:max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="Search tasks..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Status */}
              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="">
                  All statuses
                </option>

                {TASK_STATUS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {statusConfig[item]
                        ?.label || item}
                    </option>
                  )
                )}
              </select>

              {/* Priority */}
              <select
                value={priority}
                onChange={(event) => {
                  setPriority(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="">
                  All priorities
                </option>

                {TASK_PRIORITY.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {priorityConfig[item]
                        ?.label || item}
                    </option>
                  )
                )}
              </select>

              {/* From */}
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              {/* To */}
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-800"
                >
                  <X size={15} />
                  Clear
                </button>
              )}
            </div>

            {/* Sort row */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Filter size={14} />
                Sort:
              </div>

              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="createdAt">
                  Created
                </option>
                <option value="dueAt">
                  Due date
                </option>
                <option value="startAt">
                  Start date
                </option>
                <option value="title">
                  Title
                </option>
                <option value="priority">
                  Priority
                </option>
                <option value="status">
                  Status
                </option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSortOrder(
                    (current) =>
                      current === "asc"
                        ? "desc"
                        : "asc"
                  );
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp size={13} />
                ) : (
                  <ArrowDown size={13} />
                )}

                {sortOrder === "asc"
                  ? "Ascending"
                  : "Descending"}
              </button>

              <div className="ml-auto hidden items-center gap-2 text-xs text-slate-400 sm:flex">
                <span>
                  {pagination.total || 0} tasks
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="m-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:m-5">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  Unable to load tasks
                </p>

                <p className="mt-1 text-xs text-red-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchTasks(true)
                }
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <Loader2
                  size={28}
                  className="mx-auto animate-spin text-slate-400"
                />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  Loading tasks...
                </p>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            /* Empty */
            <div className="flex min-h-[420px] items-center justify-center px-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <PackageOpen size={28} />
                </div>

                <h3 className="mt-5 text-base font-bold text-slate-800">
                  No tasks found
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {hasFilters
                    ? "Try adjusting your filters or search criteria."
                    : "Create your first CRM task to start managing follow-ups."}
                </p>

                <div className="mt-5 flex justify-center gap-2">
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear filters
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus size={16} />
                    Create task
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Task
                      </th>

                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Status
                      </th>

                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Priority
                      </th>

                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Due
                      </th>

                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned
                      </th>

                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        CRM
                      </th>

                      <th className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => {
                      const overdue =
                        isOverdueTask(task);

                      const assignedName =
                        getDisplayName(
                          task.assignedTo
                        ) ||
                        "Unassigned";

                      const relation =
                        getDisplayName(
                          task.opportunity
                        ) ||
                        getDisplayName(
                          task.company
                        ) ||
                        getDisplayName(
                          task.lead
                        ) ||
                        getDisplayName(
                          task.contact
                        );

                      return (
                        <tr
                          key={task._id}
                          className="group transition hover:bg-slate-50/70"
                        >
                          {/* Task */}
                          <td className="px-6 py-4">
                            <div className="flex min-w-[270px] items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <ListTodo
                                  size={17}
                                />
                              </div>

                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedTask(
                                      task
                                    )
                                  }
                                  className="block max-w-[320px] truncate text-left text-sm font-bold text-slate-800 hover:text-blue-600"
                                >
                                  {task.title}
                                </button>

                                {task.description && (
                                  <p className="mt-1 max-w-[330px] truncate text-xs text-slate-400">
                                    {
                                      task.description
                                    }
                                  </p>
                                )}

                                {task.reminderEnabled && (
                                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-500">
                                    <Bell
                                      size={11}
                                    />
                                    Reminder
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                task.status
                              }
                            />
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-4">
                            <PriorityBadge
                              priority={
                                task.priority
                              }
                            />
                          </td>

                          {/* Due */}
                          <td className="px-4 py-4">
                            <div
                              className={cn(
                                "flex items-center gap-2 text-xs font-medium",
                                overdue
                                  ? "text-red-600"
                                  : "text-slate-600"
                              )}
                            >
                              <Clock3
                                size={14}
                              />

                              <div>
                                <p>
                                  {formatDate(
                                    task.dueAt
                                  )}
                                </p>

                                {task.dueAt && (
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {new Date(
                                      task.dueAt
                                    ).toLocaleTimeString(
                                      "en-IN",
                                      {
                                        hour: "2-digit",
                                        minute:
                                          "2-digit",
                                      }
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            {overdue && (
                              <span className="mt-1.5 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                Overdue
                              </span>
                            )}
                          </td>

                          {/* Assigned */}
                          <td className="px-4 py-4">
                            <div className="flex max-w-[150px] items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">
                                {getInitials(
                                  assignedName
                                )}
                              </div>

                              <span className="truncate text-xs font-semibold text-slate-600">
                                {assignedName}
                              </span>
                            </div>
                          </td>

                          {/* CRM */}
                          <td className="px-4 py-4">
                            {relation ? (
                              <div className="flex max-w-[150px] items-center gap-1.5 text-xs font-medium text-slate-600">
                                {task.opportunity ? (
                                  <Target
                                    size={13}
                                    className="shrink-0 text-violet-500"
                                  />
                                ) : task.company ? (
                                  <Building2
                                    size={13}
                                    className="shrink-0 text-blue-500"
                                  />
                                ) : (
                                  <User
                                    size={13}
                                    className="shrink-0 text-slate-400"
                                  />
                                )}

                                <span className="truncate">
                                  {relation}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">
                                —
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1 opacity-80 transition group-hover:opacity-100">
                              <IconButton
                                title="View"
                                onClick={() =>
                                  setSelectedTask(
                                    task
                                  )
                                }
                              >
                                <Eye
                                  size={15}
                                />
                              </IconButton>

                              {task.status !==
                                "IN_PROGRESS" &&
                                task.status !==
                                  "COMPLETED" &&
                                task.status !==
                                  "CANCELLED" && (
                                  <IconButton
                                    title="Start"
                                    onClick={() =>
                                      requestAction(
                                        "start",
                                        task
                                      )
                                    }
                                  >
                                    <Activity
                                      size={15}
                                    />
                                  </IconButton>
                                )}

                              {task.status !==
                                "COMPLETED" &&
                                task.status !==
                                  "CANCELLED" && (
                                  <IconButton
                                    title="Complete"
                                    onClick={() =>
                                      requestAction(
                                        "complete",
                                        task
                                      )
                                    }
                                    className="text-emerald-600 hover:bg-emerald-50"
                                  >
                                    <Check
                                      size={15}
                                    />
                                  </IconButton>
                                )}

                              <IconButton
                                title="Assign"
                                onClick={() =>
                                  assignTask(
                                    task
                                  )
                                }
                              >
                                <UserCheck
                                  size={15}
                                />
                              </IconButton>

                              <IconButton
                                title="Edit"
                                onClick={() =>
                                  openEditModal(
                                    task
                                  )
                                }
                              >
                                <Edit3
                                  size={15}
                                />
                              </IconButton>

                              <IconButton
                                title="Delete"
                                onClick={() =>
                                  requestAction(
                                    "delete",
                                    task
                                  )
                                }
                                className="text-red-500 hover:bg-red-50"
                              >
                                <Trash2
                                  size={15}
                                />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-3 p-4 lg:hidden">
                {tasks.map((task) => (
                  <MobileTaskCard
                    key={task._id}
                    task={task}
                    onView={setSelectedTask}
                    onStart={(item) =>
                      requestAction(
                        "start",
                        item
                      )
                    }
                    onComplete={(item) =>
                      requestAction(
                        "complete",
                        item
                      )
                    }
                    onEdit={openEditModal}
                    onDelete={(item) =>
                      requestAction(
                        "delete",
                        item
                      )
                    }
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs font-medium text-slate-400">
                  Showing page{" "}
                  <span className="font-bold text-slate-600">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-600">
                    {totalPages}
                  </span>
                  {pagination.total !==
                    undefined && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-bold text-slate-600">
                        {pagination.total}
                      </span>{" "}
                      total
                    </>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      currentPage <= 1
                    }
                    onClick={() =>
                      setPage(
                        (value) =>
                          Math.max(
                            value - 1,
                            1
                          )
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-bold text-white">
                    {currentPage}
                  </div>

                  <button
                    type="button"
                    disabled={
                      currentPage >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (value) =>
                          Math.min(
                            value + 1,
                            totalPages
                          )
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
      </div>

      {/* Form modal */}
      <TaskFormModal
        open={formOpen}
        mode={formMode}
        form={form}
        saving={formSaving}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        onClose={() => {
          if (!formSaving) {
            setFormOpen(false);
          }
        }}
      />

      {/* Details */}
      <TaskDetailsDrawer
        task={selectedTask}
        onClose={() =>
          setSelectedTask(null)
        }
        onEdit={openEditModal}
        onStart={(task) =>
          requestAction("start", task)
        }
        onComplete={(task) =>
          requestAction(
            "complete",
            task
          )
        }
        onCancel={(task) =>
          requestAction(
            "cancel",
            task
          )
        }
        onDelete={(task) =>
          requestAction(
            "delete",
            task
          )
        }
        onRestore={(task) =>
          requestAction(
            "restore",
            task
          )
        }
        actionLoading={actionLoading}
      />

      {/* Confirmation */}
      <ConfirmModal
        open={confirm.open}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={
          confirm.type === "delete"
            ? "Delete"
            : confirm.type === "cancel"
            ? "Cancel task"
            : confirm.type === "complete"
            ? "Complete"
            : confirm.type === "start"
            ? "Start task"
            : confirm.type === "restore"
            ? "Restore"
            : "Confirm"
        }
        danger={
          confirm.type === "delete" ||
          confirm.type === "cancel"
        }
        loading={actionLoading}
        onClose={() => {
          if (!actionLoading) {
            setConfirm({
              open: false,
              type: "",
              task: null,
            });
          }
        }}
        onConfirm={() => {
          if (
            confirm.task &&
            confirm.type
          ) {
            runTaskAction(
              confirm.task,
              confirm.type
            );
          }
        }}
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            iconClass
          )}
        >
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ICON BUTTON
|--------------------------------------------------------------------------
*/

function IconButton({
  children,
  title,
  onClick,
  className = "",
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
        className
      )}
    >
      {children}
    </button>
  );
}