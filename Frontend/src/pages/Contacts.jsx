import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  Globe,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";

// ======================================================
// API CONFIG
// ======================================================

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

const CONTACTS_ENDPOINT = `${API_BASE}/contacts`;

const COMPANIES_ENDPOINT = `${API_BASE}/companies`;

const USERS_ENDPOINT = `${API_BASE}/users`;

// ======================================================
// OPTIONS
// ======================================================

const STATUS_OPTIONS = [
  "ACTIVE",
  "INACTIVE",
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  designation: "",
  department: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  company: "",
  owner: "",
  source: "",
  status: "ACTIVE",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  tags: "",
  notes: "",
  lastContactAt: "",
  nextFollowUpAt: "",
};

// ======================================================
// AUTH
// ======================================================

function getToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

// ======================================================
// API REQUEST
// ======================================================

async function apiRequest(url, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();

  let result = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }

  if (response.status === 401) {
    throw new Error(
      "Authentication required. Please login again."
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

// ======================================================
// HELPERS
// ======================================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
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
}

function toDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

function getFullName(contact) {
  return [
    contact?.firstName,
    contact?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "C"
  );
}

function statusClass(status) {
  const classes = {
    ACTIVE:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    INACTIVE:
      "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    classes[status] ||
    "bg-slate-50 text-slate-600 border-slate-100"
  );
}

function mapContactToForm(contact) {
  return {
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    designation: contact?.designation || "",
    department: contact?.department || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    alternatePhone:
      contact?.alternatePhone || "",
    website: contact?.website || "",
    company:
      contact?.company?._id ||
      contact?.company ||
      "",
    owner:
      contact?.owner?._id ||
      contact?.owner ||
      "",
    source: contact?.source || "",
    status: contact?.status || "ACTIVE",
    address: contact?.address || "",
    city: contact?.city || "",
    state: contact?.state || "",
    country: contact?.country || "",
    postalCode: contact?.postalCode || "",
    tags: Array.isArray(contact?.tags)
      ? contact.tags.join(", ")
      : contact?.tags || "",
    notes: contact?.notes || "",
    lastContactAt: toDateTimeInput(
      contact?.lastContactAt
    ),
    nextFollowUpAt: toDateTimeInput(
      contact?.nextFollowUpAt
    ),
  };
}

function normalizePayload(form) {
  const payload = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    designation: form.designation.trim(),
    department: form.department.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    alternatePhone:
      form.alternatePhone.trim(),
    website: form.website.trim(),
    source: form.source.trim(),
    status: form.status,
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: form.country.trim(),
    postalCode: form.postalCode.trim(),
    tags: form.tags
      .split(",")
      .map((tag) =>
        tag.trim().toUpperCase()
      )
      .filter(Boolean),
    notes: form.notes.trim(),
    lastContactAt: form.lastContactAt
      ? new Date(
          form.lastContactAt
        ).toISOString()
      : null,
    nextFollowUpAt: form.nextFollowUpAt
      ? new Date(
          form.nextFollowUpAt
        ).toISOString()
      : null,
  };

  if (form.company) {
    payload.company = form.company;
  } else {
    payload.company = null;
  }

  if (form.owner) {
    payload.owner = form.owner;
  } else {
    payload.owner = null;
  }

  return payload;
}

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconClass = "bg-slate-900",
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100 opacity-70 transition duration-500 group-hover:scale-125" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${iconClass}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

// ======================================================
// MODAL
// ======================================================

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-md sm:p-5">
      <div
        className={`max-h-[94vh] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[var(--shadow-overlay)] ${
          wide ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl font-black tracking-tight text-slate-900">
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
            className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(94vh-100px)] overflow-y-auto p-5 sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// FIELD
// ======================================================

function Field({
  label,
  children,
  required = false,
  hint,
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="text-rose-500">
            *
          </span>
        )}
      </span>

      {children}

      {hint && (
        <span className="mt-1.5 block text-[11px] text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

const textareaClass =
  "w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

// ======================================================
// CONTACT FORM
// ======================================================

function ContactForm({
  form,
  setForm,
  onSubmit,
  saving,
  editing,
  companies,
  users,
  loadingCompanies,
  loadingUsers,
}) {
  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8"
    >
      {/* PERSONAL */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <User size={17} />
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              Personal Information
            </h3>

            <p className="text-xs text-slate-500">
              Contact identity and professional details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="First Name"
            required
          >
            <input
              className={inputClass}
              value={form.firstName}
              onChange={(e) =>
                update(
                  "firstName",
                  e.target.value
                )
              }
              placeholder="Rajesh"
              required
              minLength={2}
              maxLength={100}
            />
          </Field>

          <Field label="Last Name">
            <input
              className={inputClass}
              value={form.lastName}
              onChange={(e) =>
                update(
                  "lastName",
                  e.target.value
                )
              }
              placeholder="Kumar"
              maxLength={100}
            />
          </Field>

          <Field label="Designation">
            <input
              className={inputClass}
              value={form.designation}
              onChange={(e) =>
                update(
                  "designation",
                  e.target.value
                )
              }
              placeholder="Chief Executive Officer"
              maxLength={150}
            />
          </Field>

          <Field label="Department">
            <input
              className={inputClass}
              value={form.department}
              onChange={(e) =>
                update(
                  "department",
                  e.target.value
                )
              }
              placeholder="Management"
              maxLength={150}
            />
          </Field>
        </div>
      </section>

      {/* CONTACT */}
      <section className="border-t border-slate-100 pt-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Phone size={17} />
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              Contact Information
            </h3>

            <p className="text-xs text-slate-500">
              Email, phone and digital contact details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) =>
                update(
                  "email",
                  e.target.value
                )
              }
              placeholder="customer@example.com"
              maxLength={254}
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) =>
                update(
                  "phone",
                  e.target.value
                )
              }
              placeholder="9876543210"
              maxLength={30}
            />
          </Field>

          <Field label="Alternate Phone">
            <input
              className={inputClass}
              value={form.alternatePhone}
              onChange={(e) =>
                update(
                  "alternatePhone",
                  e.target.value
                )
              }
              placeholder="9123456780"
              maxLength={30}
            />
          </Field>

          <Field label="Website">
            <div className="relative">
              <Globe
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                className={`${inputClass} pl-10`}
                value={form.website}
                onChange={(e) =>
                  update(
                    "website",
                    e.target.value
                  )
                }
                placeholder="https://company.com"
                maxLength={500}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* CRM */}
      <section className="border-t border-slate-100 pt-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Building2 size={17} />
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              CRM Information
            </h3>

            <p className="text-xs text-slate-500">
              Company ownership, source and contact status
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company">
            <select
              className={inputClass}
              value={form.company}
              onChange={(e) =>
                update(
                  "company",
                  e.target.value
                )
              }
            >
              <option value="">
                {loadingCompanies
                  ? "Loading companies..."
                  : "No Company"}
              </option>

              {companies.map((company) => (
                <option
                  key={company._id}
                  value={company._id}
                >
                  {company.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contact Owner">
            <select
              className={inputClass}
              value={form.owner}
              onChange={(e) =>
                update(
                  "owner",
                  e.target.value
                )
              }
            >
              <option value="">
                {loadingUsers
                  ? "Loading users..."
                  : "Unassigned"}
              </option>

              {users.map((user) => (
                <option
                  key={user._id}
                  value={user._id}
                >
                  {user.name ||
                    user.email ||
                    user._id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Source">
            <input
              className={inputClass}
              value={form.source}
              onChange={(e) =>
                update(
                  "source",
                  e.target.value
                )
              }
              placeholder="Website / Referral / Import"
              maxLength={100}
            />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) =>
                update(
                  "status",
                  e.target.value
                )
              }
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>
      </section>

      {/* ADDRESS */}
      <section className="border-t border-slate-100 pt-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <MapPin size={17} />
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              Address
            </h3>

            <p className="text-xs text-slate-500">
              Location and postal information
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Address">
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) =>
                  update(
                    "address",
                    e.target.value
                  )
                }
                placeholder="100 Mount Road"
                maxLength={500}
              />
            </Field>
          </div>

          <Field label="City">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) =>
                update(
                  "city",
                  e.target.value
                )
              }
              placeholder="Chennai"
              maxLength={100}
            />
          </Field>

          <Field label="State">
            <input
              className={inputClass}
              value={form.state}
              onChange={(e) =>
                update(
                  "state",
                  e.target.value
                )
              }
              placeholder="Tamil Nadu"
              maxLength={100}
            />
          </Field>

          <Field label="Country">
            <input
              className={inputClass}
              value={form.country}
              onChange={(e) =>
                update(
                  "country",
                  e.target.value
                )
              }
              placeholder="India"
              maxLength={100}
            />
          </Field>

          <Field label="Postal Code">
            <input
              className={inputClass}
              value={form.postalCode}
              onChange={(e) =>
                update(
                  "postalCode",
                  e.target.value
                )
              }
              placeholder="600006"
              maxLength={20}
            />
          </Field>
        </div>
      </section>

      {/* ACTIVITY */}
      <section className="border-t border-slate-100 pt-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Activity size={17} />
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              Activity & Follow-up
            </h3>

            <p className="text-xs text-slate-500">
              Track engagement and upcoming actions
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Last Contact">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.lastContactAt}
              onChange={(e) =>
                update(
                  "lastContactAt",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Next Follow-up">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.nextFollowUpAt}
              onChange={(e) =>
                update(
                  "nextFollowUpAt",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Tags">
            <div className="relative">
              <Tag
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                className={`${inputClass} pl-10`}
                value={form.tags}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value
                  )
                }
                placeholder="VIP, HOT, ENTERPRISE"
              />
            </div>
          </Field>

          <div />
          
          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea
                rows={5}
                className={textareaClass}
                value={form.notes}
                onChange={(e) =>
                  update(
                    "notes",
                    e.target.value
                  )
                }
                placeholder="Important customer notes, preferences, requirements..."
                maxLength={5000}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ACTION */}
      <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-5 pt-5 backdrop-blur sm:-mx-7 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          onClick={() =>
            window.history.back()
          }
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <RefreshCw
              size={17}
              className="animate-spin"
            />
          ) : (
            <CheckCircle2 size={17} />
          )}

          {editing
            ? "Update Contact"
            : "Create Contact"}
        </button>
      </div>
    </form>
  );
}

// ======================================================
// INFO CARD
// ======================================================

function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-bold text-slate-800">
            {value || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// DETAIL
// ======================================================

function Detail({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

// ======================================================
// CONTACT DETAILS
// ======================================================

function ContactDetails({
  contact,
  onClose,
  onEdit,
  onDelete,
}) {
  const fullName =
    getFullName(contact);

  return (
    <Modal
      title="Contact Details"
      subtitle={`${fullName} • ${
        contact?.company?.name ||
        "No company"
      }`}
      onClose={onClose}
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* MAIN */}
        <div className="space-y-6">
          {/* PROFILE */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/20 blur-2xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl font-black shadow-xl">
                {initials(fullName)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black">
                    {fullName ||
                      "Unnamed Contact"}
                  </h3>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(
                      contact.status
                    )}`}
                  >
                    {contact.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {contact.designation ||
                    "No designation"}

                  {contact.department
                    ? ` • ${contact.department}`
                    : ""}
                </p>

                {contact.company?.name && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                    <Building2 size={15} />

                    {contact.company.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="mb-3 font-black text-slate-900">
              Contact Information
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={Mail}
                label="Email"
                value={
                  contact.email
                }
              />

              <InfoCard
                icon={Phone}
                label="Phone"
                value={
                  contact.phone
                }
              />

              <InfoCard
                icon={Phone}
                label="Alternate Phone"
                value={
                  contact.alternatePhone
                }
              />

              <InfoCard
                icon={Globe}
                label="Website"
                value={
                  contact.website
                }
              />
            </div>
          </div>

          {/* CRM */}
          <div className="rounded-2xl border border-slate-200 p-5">
            <h4 className="mb-4 font-black text-slate-900">
              CRM Information
            </h4>

            <div className="grid gap-5 sm:grid-cols-2">
              <Detail
                label="Company"
                value={
                  contact.company?.name
                }
              />

              <Detail
                label="Owner"
                value={
                  contact.owner?.name ||
                  contact.owner?.email
                }
              />

              <Detail
                label="Source"
                value={
                  contact.source
                }
              />

              <Detail
                label="Status"
                value={
                  contact.status
                }
              />
            </div>
          </div>

          {/* ADDRESS */}
          <div className="rounded-2xl border border-slate-200 p-5">
            <h4 className="mb-4 font-black text-slate-900">
              Address
            </h4>

            <div className="grid gap-5 sm:grid-cols-2">
              <Detail
                label="Address"
                value={
                  contact.address
                }
              />

              <Detail
                label="City"
                value={
                  contact.city
                }
              />

              <Detail
                label="State"
                value={
                  contact.state
                }
              />

              <Detail
                label="Country"
                value={
                  contact.country
                }
              />

              <Detail
                label="Postal Code"
                value={
                  contact.postalCode
                }
              />
            </div>
          </div>

          {/* TAGS */}
          {Array.isArray(
            contact.tags
          ) &&
            contact.tags.length > 0 && (
              <div className="rounded-2xl border border-slate-200 p-5">
                <h4 className="mb-3 font-black text-slate-900">
                  Tags
                </h4>

                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                      >
                        #{tag}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          {/* NOTES */}
          {contact.notes && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h4 className="mb-3 font-black text-slate-900">
                Notes
              </h4>

              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {contact.notes}
              </p>
            </div>
          )}
        </div>

        {/* SIDE */}
        <div className="space-y-3">
          <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={15} />

              <span className="text-xs font-semibold">
                Next Follow-up
              </span>
            </div>

            <p className="mt-3 text-xl font-black">
              {formatDateTime(
                contact.nextFollowUpAt
              )}
            </p>

            <div className="mt-5 h-px bg-white/10" />

            <div className="mt-4 flex items-center gap-2 text-slate-500">
              <Clock3 size={15} />

              <span className="text-xs font-semibold">
                Last Contact
              </span>
            </div>

            <p className="mt-2 text-sm font-bold text-white">
              {formatDateTime(
                contact.lastContactAt
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm"
          >
            <Edit3 size={17} />
            Edit Contact
          </button>

          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Mail size={17} />
              Send Email
            </a>
          )}

          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <Phone size={17} />
              Call Contact
            </a>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 size={17} />
            Delete Contact
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ======================================================
// MAIN CONTACTS
// ======================================================

export default function Contacts() {
  const [contacts, setContacts] =
    useState([]);

  const [companies, setCompanies] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingCompanies, setLoadingCompanies] =
    useState(false);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [error, setError] =
    useState("");

  // SEARCH
  const [search, setSearch] =
    useState("");

  // FILTERS
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [companyFilter, setCompanyFilter] =
    useState("ALL");

  const [ownerFilter, setOwnerFilter] =
    useState("ALL");

  // PAGINATION
  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(20);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

  // MODALS
  const [showForm, setShowForm] =
    useState(false);

  const [editingContact, setEditingContact] =
    useState(null);

  const [selectedContact, setSelectedContact] =
    useState(null);

  // FORM
  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  // SORT
  const [sortBy, setSortBy] =
    useState("createdAt");

  const [sortOrder, setSortOrder] =
    useState("desc");

  // ======================================================
  // FETCH CONTACTS
  // ======================================================

  const fetchContacts =
    useCallback(
      async (showRefresh = false) => {
        try {
          setError("");

          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(page)
          );

          params.set(
            "limit",
            String(limit)
          );

          if (search.trim()) {
            params.set(
              "search",
              search.trim()
            );
          }

          if (
            statusFilter !==
            "ALL"
          ) {
            params.set(
              "status",
              statusFilter
            );
          }

          if (
            companyFilter !==
            "ALL"
          ) {
            params.set(
              "company",
              companyFilter
            );
          }

          if (
            ownerFilter !==
            "ALL"
          ) {
            params.set(
              "owner",
              ownerFilter
            );
          }

          const result =
            await apiRequest(
              `${CONTACTS_ENDPOINT}?${params.toString()}`
            );

          const data =
            Array.isArray(
              result?.data
            )
              ? result.data
              : Array.isArray(result)
              ? result
              : [];

          setContacts(data);

          setPagination(
            result?.pagination || {
              page,
              limit,
              total: data.length,
              totalPages: 1,
            }
          );
        } catch (err) {
          setError(
            err.message ||
              "Unable to load contacts"
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
        statusFilter,
        companyFilter,
        ownerFilter,
      ]
    );

  // ======================================================
  // FETCH COMPANIES
  // ======================================================

  const fetchCompanies =
    useCallback(async () => {
      try {
        setLoadingCompanies(true);

        const result =
          await apiRequest(
            `${COMPANIES_ENDPOINT}?page=1&limit=200`
          );

        const data =
          Array.isArray(
            result?.data
          )
            ? result.data
            : Array.isArray(result)
            ? result
            : [];

        setCompanies(data);
      } catch {
        setCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    }, []);

  // ======================================================
  // FETCH USERS
  // ======================================================

  const fetchUsers =
    useCallback(async () => {
      try {
        setLoadingUsers(true);

        const result =
          await apiRequest(
            USERS_ENDPOINT
          );

        const data =
          Array.isArray(
            result?.data
          )
            ? result.data
            : Array.isArray(result)
            ? result
            : [];

        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }, []);

  // ======================================================
  // INITIAL DATA
  // ======================================================

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, [
    fetchCompanies,
    fetchUsers,
  ]);

  // ======================================================
  // CONTACT FETCH
  // ======================================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        fetchContacts();
      }, 300);

    return () =>
      clearTimeout(timer);
  }, [fetchContacts]);

  // ======================================================
  // STATS
  // ======================================================

  const stats = useMemo(() => {
    const total =
      pagination.total ||
      contacts.length;

    const active =
      contacts.filter(
        (contact) =>
          contact.status ===
          "ACTIVE"
      ).length;

    const inactive =
      contacts.filter(
        (contact) =>
          contact.status ===
          "INACTIVE"
      ).length;

    const withEmail =
      contacts.filter(
        (contact) =>
          Boolean(
            contact.email
          )
      ).length;

    const upcoming =
      contacts.filter(
        (contact) => {
          if (
            !contact.nextFollowUpAt
          ) {
            return false;
          }

          const date = new Date(
            contact.nextFollowUpAt
          );

          return (
            date.getTime() >=
            Date.now()
          );
        }
      ).length;

    return {
      total,
      active,
      inactive,
      withEmail,
      upcoming,
    };
  }, [
    contacts,
    pagination.total,
  ]);

  // ======================================================
  // SORT
  // ======================================================

  const displayedContacts =
    useMemo(() => {
      const copy = [
        ...contacts,
      ];

      copy.sort((a, b) => {
        let aValue;
        let bValue;

        if (
          sortBy ===
          "fullName"
        ) {
          aValue =
            getFullName(
              a
            ).toLowerCase();

          bValue =
            getFullName(
              b
            ).toLowerCase();
        } else if (
          sortBy ===
          "company"
        ) {
          aValue =
            String(
              a?.company
                ?.name || ""
            ).toLowerCase();

          bValue =
            String(
              b?.company
                ?.name || ""
            ).toLowerCase();
        } else {
          aValue =
            String(
              a?.[sortBy] || ""
            ).toLowerCase();

          bValue =
            String(
              b?.[sortBy] || ""
            ).toLowerCase();
        }

        if (
          aValue <
          bValue
        ) {
          return sortOrder ===
            "asc"
            ? -1
            : 1;
        }

        if (
          aValue >
          bValue
        ) {
          return sortOrder ===
            "asc"
            ? 1
            : -1;
        }

        return 0;
      });

      return copy;
    }, [
      contacts,
      sortBy,
      sortOrder,
    ]);

  // ======================================================
  // CREATE
  // ======================================================

  const openCreate = () => {
    setEditingContact(null);
    setForm({
      ...EMPTY_FORM,
    });
    setShowForm(true);
  };

  // ======================================================
  // EDIT
  // ======================================================

  const openEdit = (
    contact
  ) => {
    setSelectedContact(null);

    setEditingContact(
      contact
    );

    setForm(
      mapContactToForm(
        contact
      )
    );

    setShowForm(true);
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      try {
        setSaving(true);
        setError("");

        const payload =
          normalizePayload(
            form
          );

        if (
          !payload.firstName
        ) {
          throw new Error(
            "First name is required"
          );
        }

        if (
          payload.firstName.length <
          2
        ) {
          throw new Error(
            "First name must be at least 2 characters"
          );
        }

        if (
          editingContact?._id
        ) {
          // IMPORTANT:
          // Backend route uses PUT
          await apiRequest(
            `${CONTACTS_ENDPOINT}/${editingContact._id}`,
            {
              method: "PUT",
              body: JSON.stringify(
                payload
              ),
            }
          );
        } else {
          await apiRequest(
            CONTACTS_ENDPOINT,
            {
              method: "POST",
              body: JSON.stringify(
                payload
              ),
            }
          );
        }

        setShowForm(false);
        setEditingContact(null);
        setForm({
          ...EMPTY_FORM,
        });

        await fetchContacts(
          true
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to save contact"
        );
      } finally {
        setSaving(false);
      }
    };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    async (contact) => {
      const fullName =
        getFullName(
          contact
        ) || "this contact";

      const confirmed =
        window.confirm(
          `Delete contact "${fullName}"? This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");

        await apiRequest(
          `${CONTACTS_ENDPOINT}/${contact._id}`,
          {
            method: "DELETE",
          }
        );

        setSelectedContact(
          null
        );

        await fetchContacts(
          true
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to delete contact"
        );
      }
    };

  // ======================================================
  // SORT
  // ======================================================

  const toggleSort =
    (field) => {
      if (
        sortBy === field
      ) {
        setSortOrder(
          (current) =>
            current ===
            "asc"
              ? "desc"
              : "asc"
        );
      } else {
        setSortBy(field);
        setSortOrder(
          "desc"
        );
      }
    };

  // ======================================================
  // CSV EXPORT
  // ======================================================

  const exportCSV = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Full Name",
      "Designation",
      "Department",
      "Email",
      "Phone",
      "Alternate Phone",
      "Website",
      "Company",
      "Owner",
      "Source",
      "Status",
      "Address",
      "City",
      "State",
      "Country",
      "Postal Code",
      "Tags",
      "Last Contact",
      "Next Follow-up",
      "Notes",
    ];

    const rows =
      displayedContacts.map(
        (contact) => [
          contact.firstName,
          contact.lastName,
          getFullName(
            contact
          ),
          contact.designation,
          contact.department,
          contact.email,
          contact.phone,
          contact.alternatePhone,
          contact.website,
          contact.company?.name ||
            "",
          contact.owner?.name ||
            contact.owner
              ?.email ||
            "",
          contact.source,
          contact.status,
          contact.address,
          contact.city,
          contact.state,
          contact.country,
          contact.postalCode,
          Array.isArray(
            contact.tags
          )
            ? contact.tags.join(
                " | "
              )
            : "",
          formatDateTime(
            contact.lastContactAt
          ),
          formatDateTime(
            contact.nextFollowUpAt
          ),
          contact.notes,
        ]
      );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(
                cell ?? ""
              ).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download = `contacts-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url
    );
  };

  // ======================================================
  // CLEAR FILTERS
  // ======================================================

  const clearFilters = () => {
    setSearch("");
    setStatusFilter(
      "ALL"
    );
    setCompanyFilter(
      "ALL"
    );
    setOwnerFilter(
      "ALL"
    );
    setPage(1);
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-surface p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* ==================================================
            PREMIUM HEADER
        ================================================== */}

        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                <Users size={13} />
                CRM CONTACT MANAGEMENT
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Contacts
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage customer contacts,
                companies, ownership and
                follow-ups from one
                intelligent workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  fetchContacts(
                    true
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <RefreshCw
                  size={17}
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
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <Download size={17} />

                Export
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl transition hover:bg-slate-100"
              >
                <Plus size={18} />

                New Contact
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 shadow-sm">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 transition hover:bg-rose-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Users}
            label="Total Contacts"
            value={stats.total}
            subtitle="All contact records"
            iconClass="bg-slate-950"
          />

          <StatCard
            icon={UserCheck}
            label="Active Contacts"
            value={stats.active}
            subtitle="Currently active"
            iconClass="bg-emerald-600"
          />

          <StatCard
            icon={Activity}
            label="Inactive"
            value={stats.inactive}
            subtitle="Inactive records"
            iconClass="bg-slate-500"
          />

          <StatCard
            icon={Mail}
            label="Email Available"
            value={stats.withEmail}
            subtitle="Contacts with email"
            iconClass="bg-blue-600"
          />

          <StatCard
            icon={Calendar}
            label="Upcoming Follow-ups"
            value={stats.upcoming}
            subtitle="Next actions scheduled"
            iconClass="bg-violet-600"
          />
        </div>

        {/* ==================================================
            FILTER BAR
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(
                    e.target.value
                  );

                  setPage(1);
                }}
                placeholder="Search contacts by name, email, phone, designation..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 text-slate-900 placeholder:text-slate-500 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={
                  statusFilter
                }
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value
                  );

                  setPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-brand-500/15 placeholder:text-slate-500 transition hover:border-slate-400 focus:border-brand-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="ALL">
                  All Status
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  companyFilter
                }
                onChange={(e) => {
                  setCompanyFilter(
                    e.target.value
                  );

                  setPage(1);
                }}
                className="max-w-[220px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-brand-500/15 placeholder:text-slate-500 transition hover:border-slate-400 focus:border-brand-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="ALL">
                  All Companies
                </option>

                {companies.map(
                  (company) => (
                    <option
                      key={
                        company._id
                      }
                      value={
                        company._id
                      }
                    >
                      {company.name}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  ownerFilter
                }
                onChange={(e) => {
                  setOwnerFilter(
                    e.target.value
                  );

                  setPage(1);
                }}
                className="max-w-[220px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-brand-500/15 placeholder:text-slate-500 transition hover:border-slate-400 focus:border-brand-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="ALL">
                  All Owners
                </option>

                {users.map(
                  (user) => (
                    <option
                      key={user._id}
                      value={user._id}
                    >
                      {user.name ||
                        user.email}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <Filter
                  size={16}
                />

                Clear
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================
            CONTACT TABLE
        ================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-black text-slate-900">
                Contact Directory
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing{" "}
                {
                  displayedContacts.length
                }{" "}
                of{" "}
                {pagination.total ||
                  0}{" "}
                contacts
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(
                    Number(
                      e.target.value
                    )
                  );

                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white placeholder:text-slate-500 transition hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value={10}>
                  10 / page
                </option>

                <option value={20}>
                  20 / page
                </option>

                <option value={50}>
                  50 / page
                </option>

                <option value={100}>
                  100 / page
                </option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[430px] items-center justify-center">
              <div className="text-center">
                <RefreshCw
                  size={32}
                  className="mx-auto animate-spin text-slate-500"
                />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  Loading contacts...
                </p>
              </div>
            </div>
          ) : displayedContacts.length ===
            0 ? (
            <div className="flex min-h-[430px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Users
                  size={28}
                  className="text-slate-500"
                />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-900">
                No contacts found
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                No contacts match your
                current search or
                filters.
              </p>

              <button
                type="button"
                onClick={
                  openCreate
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
              >
                <Plus size={17} />

                Create First Contact
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-black">
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              "fullName"
                            )
                          }
                          className="inline-flex items-center gap-1"
                        >
                          Contact

                          {sortBy ===
                            "fullName" &&
                            (sortOrder ===
                            "asc" ? (
                              <ArrowUp
                                size={12}
                              />
                            ) : (
                              <ArrowDown
                                size={12}
                              />
                            ))}
                        </button>
                      </th>

                      <th className="px-5 py-4 font-black">
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              "company"
                            )
                          }
                          className="inline-flex items-center gap-1"
                        >
                          Company

                          {sortBy ===
                            "company" &&
                            (sortOrder ===
                            "asc" ? (
                              <ArrowUp
                                size={12}
                              />
                            ) : (
                              <ArrowDown
                                size={12}
                              />
                            ))}
                        </button>
                      </th>

                      <th className="px-5 py-4 font-black">
                        Contact Info
                      </th>

                      <th className="px-5 py-4 font-black">
                        Owner
                      </th>

                      <th className="px-5 py-4 font-black">
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              "status"
                            )
                          }
                          className="inline-flex items-center gap-1"
                        >
                          Status

                          {sortBy ===
                            "status" &&
                            (sortOrder ===
                            "asc" ? (
                              <ArrowUp
                                size={12}
                              />
                            ) : (
                              <ArrowDown
                                size={12}
                              />
                            ))}
                        </button>
                      </th>

                      <th className="px-5 py-4 font-black">
                        Follow-up
                      </th>

                      <th className="px-5 py-4 text-right font-black">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {displayedContacts.map(
                      (
                        contact
                      ) => {
                        const fullName =
                          getFullName(
                            contact
                          );

                        return (
                          <tr
                            key={
                              contact._id
                            }
                            className="group transition hover:bg-slate-50/80"
                          >
                            {/* CONTACT */}
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedContact(
                                    contact
                                  )
                                }
                                className="flex items-center gap-3 text-left"
                              >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-700 text-xs font-black text-white shadow-sm">
                                  {initials(
                                    fullName
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[190px] truncate font-black text-slate-900">
                                    {fullName ||
                                      "Unnamed Contact"}
                                  </p>

                                  <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                                    {contact.designation ||
                                      "No designation"}
                                  </p>
                                </div>
                              </button>
                            </td>

                            {/* COMPANY */}
                            <td className="px-5 py-4">
                              <div className="max-w-[190px]">
                                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-700">
                                  <Building2
                                    size={14}
                                    className="shrink-0 text-slate-500"
                                  />

                                  {contact
                                    .company
                                    ?.name ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {contact.source ||
                                    "No source"}
                                </p>
                              </div>
                            </td>

                            {/* CONTACT INFO */}
                            <td className="px-5 py-4">
                              <div className="space-y-1.5 text-xs">
                                <p className="flex max-w-[240px] items-center gap-1.5 truncate text-slate-600">
                                  <Mail
                                    size={12}
                                  />

                                  <span className="truncate">
                                    {contact.email ||
                                      "—"}
                                  </span>
                                </p>

                                <p className="flex items-center gap-1.5 text-slate-500">
                                  <Phone
                                    size={12}
                                  />

                                  {contact.phone ||
                                    "—"}
                                </p>
                              </div>
                            </td>

                            {/* OWNER */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                  <User
                                    size={14}
                                  />
                                </div>

                                <div className="max-w-[130px]">
                                  <p className="truncate text-xs font-bold text-slate-700">
                                    {contact
                                      .owner
                                      ?.name ||
                                      "Unassigned"}
                                  </p>

                                  <p className="truncate text-[10px] text-slate-500">
                                    {contact
                                      .owner
                                      ?.email ||
                                      ""}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* STATUS */}
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(
                                  contact.status
                                )}`}
                              >
                                {contact.status}
                              </span>
                            </td>

                            {/* FOLLOWUP */}
                            <td className="px-5 py-4">
                              <div className="text-xs">
                                <p className="flex items-center gap-1.5 font-bold text-slate-700">
                                  <Calendar
                                    size={12}
                                  />

                                  {formatDate(
                                    contact.nextFollowUpAt
                                  )}
                                </p>

                                <p className="mt-1 text-slate-500">
                                  Last:{" "}
                                  {formatDate(
                                    contact.lastContactAt
                                  )}
                                </p>
                              </div>
                            </td>

                            {/* ACTIONS */}
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedContact(
                                      contact
                                    )
                                  }
                                  title="View"
                                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Eye
                                    size={
                                      16
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      contact
                                    )
                                  }
                                  title="Edit"
                                  className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Edit3
                                    size={
                                      16
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      contact
                                    )
                                  }
                                  title="Delete"
                                  className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2
                                    size={
                                      16
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  title="More"
                                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <MoreHorizontal
                                    size={
                                      16
                                    }
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs font-medium text-slate-500">
                  Page{" "}
                  {pagination.page ||
                    page}{" "}
                  of{" "}
                  {pagination.totalPages ||
                    1}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current -
                          1
                      )
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={17}
                    />
                  </button>

                  <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                    {page}
                  </span>

                  <button
                    type="button"
                    disabled={
                      page >=
                      (pagination.totalPages ||
                        1)
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current +
                          1
                      )
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight
                      size={17}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ==================================================
          CREATE / EDIT MODAL
      ================================================== */}

      {showForm && (
        <Modal
          title={
            editingContact
              ? "Edit Contact"
              : "Create New Contact"
          }
          subtitle={
            editingContact
              ? "Update existing CRM contact information"
              : "Add a new contact to your CRM directory"
          }
          onClose={() =>
            setShowForm(false)
          }
          wide
        >
          <ContactForm
            form={form}
            setForm={setForm}
            onSubmit={
              handleSubmit
            }
            saving={saving}
            editing={Boolean(
              editingContact
            )}
            companies={
              companies
            }
            users={users}
            loadingCompanies={
              loadingCompanies
            }
            loadingUsers={
              loadingUsers
            }
          />
        </Modal>
      )}

      {/* ==================================================
          DETAILS MODAL
      ================================================== */}

      {selectedContact && (
        <ContactDetails
          contact={
            selectedContact
          }
          onClose={() =>
            setSelectedContact(
              null
            )
          }
          onEdit={() =>
            openEdit(
              selectedContact
            )
          }
          onDelete={() =>
            handleDelete(
              selectedContact
            )
          }
        />
      )}
    </div>
  );
}