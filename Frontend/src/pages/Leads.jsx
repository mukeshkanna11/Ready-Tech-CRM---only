import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  Flame,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const LEADS_ENDPOINT = `${API_BASE}/leads`;

const SOURCE_OPTIONS = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "ADVERTISEMENT",
  "EMAIL",
  "PHONE",
  "WALK_IN",
  "IMPORT",
  "OTHER",
];

const STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const EMPTY_FORM = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  alternatePhone: "",
  companyName: "",
  gstin: "",
  panNumber: "",
  source: "WEBSITE",
  status: "NEW",
  assignedTo: "",
  value: "",
  currency: "INR",
  expectedCloseDate: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  tags: "",
  lostReason: "",
  notes: "",
  nextFollowUpAt: "",
};

function getToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    ""
  );
}

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

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

function formatCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status) {
  const classes = {
    NEW: "bg-blue-50 text-blue-700 border-blue-100",
    CONTACTED: "bg-cyan-50 text-cyan-700 border-cyan-100",
    QUALIFIED: "bg-violet-50 text-violet-700 border-violet-100",
    PROPOSAL: "bg-amber-50 text-amber-700 border-amber-100",
    NEGOTIATION: "bg-orange-50 text-orange-700 border-orange-100",
    WON: "bg-emerald-50 text-emerald-700 border-emerald-100",
    LOST: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return classes[status] || "bg-slate-50 text-slate-700 border-slate-100";
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "L"
  );
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function toDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function mapLeadToForm(lead) {
  return {
    name: lead?.name || "",
    designation: lead?.designation || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    alternatePhone: lead?.alternatePhone || "",
    companyName: lead?.companyName || "",
    gstin: lead?.gstin || "",
    panNumber: lead?.panNumber || "",
    source: lead?.source || "WEBSITE",
    status: lead?.status || "NEW",
    assignedTo: lead?.assignedTo?._id || lead?.assignedTo || "",
    value: lead?.value ?? "",
    currency: lead?.currency || "INR",
    expectedCloseDate: toDateInput(lead?.expectedCloseDate),
    address: lead?.address || "",
    city: lead?.city || "",
    state: lead?.state || "",
    country: lead?.country || "India",
    postalCode: lead?.postalCode || "",
    tags: Array.isArray(lead?.tags)
      ? lead.tags.join(", ")
      : lead?.tags || "",
    lostReason: lead?.lostReason || "",
    notes: lead?.notes || "",
    nextFollowUpAt: toDateTimeInput(lead?.nextFollowUpAt),
  };
}

function normalizePayload(form) {
  const payload = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    alternatePhone: form.alternatePhone.trim(),
    companyName: form.companyName.trim(),
    gstin: form.gstin.trim().toUpperCase(),
    panNumber: form.panNumber.trim().toUpperCase(),
    source: form.source,
    status: form.status,
    value: Number(form.value || 0),
    currency: form.currency.trim().toUpperCase() || "INR",
    expectedCloseDate: form.expectedCloseDate
      ? new Date(form.expectedCloseDate).toISOString()
      : null,
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: form.country.trim(),
    postalCode: form.postalCode.trim(),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim().toUpperCase())
      .filter(Boolean),
    lostReason: form.lostReason.trim(),
    notes: form.notes.trim(),
    nextFollowUpAt: form.nextFollowUpAt
      ? new Date(form.nextFollowUpAt).toISOString()
      : null,
  };

  if (form.assignedTo) {
    payload.assignedTo = form.assignedTo;
  }

  return payload;
}

function StatCard({ icon: Icon, label, value, subtitle, trend }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/70" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
          <Icon size={20} />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <TrendingUp size={14} />
          {trend}
        </div>
      )}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl ${
          wide ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

function LeadForm({ form, setForm, onSubmit, saving, editing }) {
  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <UserCheck size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Lead Information</h3>
            <p className="text-xs text-slate-500">
              Basic customer and contact details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Lead Name" required>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Rajesh Kumar"
              required
            />
          </Field>

          <Field label="Designation">
            <input
              className={inputClass}
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              placeholder="Chief Executive Officer"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="customer@example.com"
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="9876543210"
            />
          </Field>

          <Field label="Alternate Phone">
            <input
              className={inputClass}
              value={form.alternatePhone}
              onChange={(e) => update("alternatePhone", e.target.value)}
              placeholder="9123456780"
            />
          </Field>

          <Field label="Company Name">
            <input
              className={inputClass}
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Tech Solutions Private Limited"
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BriefcaseBusiness size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Sales Details</h3>
            <p className="text-xs text-slate-500">
              Qualification, source and commercial information
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Source">
            <select
              className={inputClass}
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lead Value">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.value}
              onChange={(e) => update("value", e.target.value)}
              placeholder="350000"
            />
          </Field>

          <Field label="Expected Close Date">
            <input
              type="date"
              className={inputClass}
              value={form.expectedCloseDate}
              onChange={(e) =>
                update("expectedCloseDate", e.target.value)
              }
            />
          </Field>

          <Field label="Next Follow-up">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.nextFollowUpAt}
              onChange={(e) =>
                update("nextFollowUpAt", e.target.value)
              }
            />
          </Field>

          <Field label="Assigned User ID">
            <input
              className={inputClass}
              value={form.assignedTo}
              onChange={(e) => update("assignedTo", e.target.value)}
              placeholder="User ObjectId"
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Target size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              Business Information
            </h3>
            <p className="text-xs text-slate-500">
              Tax, address and additional CRM information
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="GSTIN">
            <input
              className={inputClass}
              value={form.gstin}
              onChange={(e) => update("gstin", e.target.value)}
              placeholder="33ABCDE1234F1Z5"
              maxLength={15}
            />
          </Field>

          <Field label="PAN Number">
            <input
              className={inputClass}
              value={form.panNumber}
              onChange={(e) => update("panNumber", e.target.value)}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </Field>

          <Field label="Address">
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="100 Mount Road"
            />
          </Field>

          <Field label="City">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Chennai"
            />
          </Field>

          <Field label="State">
            <input
              className={inputClass}
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="Tamil Nadu"
            />
          </Field>

          <Field label="Country">
            <input
              className={inputClass}
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              placeholder="India"
            />
          </Field>

          <Field label="Postal Code">
            <input
              className={inputClass}
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
              placeholder="600006"
            />
          </Field>

          <Field label="Tags">
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="HOT, VIP, ENTERPRISE"
            />
          </Field>

          {form.status === "LOST" && (
            <Field label="Lost Reason" required>
              <input
                className={inputClass}
                value={form.lostReason}
                onChange={(e) => update("lostReason", e.target.value)}
                placeholder="Budget not approved"
                required
              />
            </Field>
          )}

          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea
                rows={4}
                className={inputClass}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Customer requested enterprise CRM demo..."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <RefreshCw className="animate-spin" size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {editing ? "Update Lead" : "Create Lead"}
        </button>
      </div>
    </form>
  );
}

function LeadDetails({ lead, onClose, onEdit, onConvert, onDelete }) {
  return (
    <Modal
      title="Lead Details"
      subtitle={`${lead.name} • ${lead.companyName || "No company"}`}
      onClose={onClose}
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                {initials(lead.name)}
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {lead.name}
                </h3>

                <p className="text-sm text-slate-500">
                  {lead.designation || "No designation"}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                      lead.status
                    )}`}
                  >
                    {lead.status}
                  </span>

                  {(lead.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon={Mail} label="Email" value={lead.email || "—"} />
            <InfoCard icon={Phone} label="Phone" value={lead.phone || "—"} />
            <InfoCard
              icon={BriefcaseBusiness}
              label="Company"
              value={lead.companyName || "—"}
            />
            <InfoCard
              icon={Target}
              label="Lead Value"
              value={formatCurrency(lead.value, lead.currency)}
            />
            <InfoCard
              icon={Calendar}
              label="Expected Close"
              value={formatDate(lead.expectedCloseDate)}
            />
            <InfoCard
              icon={Clock3}
              label="Next Follow-up"
              value={formatDateTime(lead.nextFollowUpAt)}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h4 className="mb-3 font-bold text-slate-900">
              Address & Business
            </h4>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Address" value={lead.address} />
              <Detail label="City" value={lead.city} />
              <Detail label="State" value={lead.state} />
              <Detail label="Country" value={lead.country} />
              <Detail label="Postal Code" value={lead.postalCode} />
              <Detail label="GSTIN" value={lead.gstin} />
              <Detail label="PAN" value={lead.panNumber} />
              <Detail label="Source" value={lead.source} />
            </div>
          </div>

          {lead.notes && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h4 className="mb-2 font-bold text-slate-900">Notes</h4>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {lead.notes}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-medium text-slate-400">Lead Value</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(lead.value, lead.currency)}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width:
                    lead.status === "WON"
                      ? "100%"
                      : lead.status === "NEGOTIATION"
                      ? "75%"
                      : lead.status === "PROPOSAL"
                      ? "60%"
                      : lead.status === "QUALIFIED"
                      ? "40%"
                      : "20%",
                }}
              />
            </div>
          </div>

          <button
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Edit3 size={17} />
            Edit Lead
          </button>

          {!lead.convertedOpportunity && (
            <button
              onClick={onConvert}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle2 size={17} />
              Convert Lead
            </button>
          )}

          {lead.convertedOpportunity && (
            <div className="rounded-xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
              ✓ Lead already converted
            </div>
          )}

          <button
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 size={17} />
            Delete Lead
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-800">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-700">{value || "—"}</p>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchLeads = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(limit));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (statusFilter !== "ALL") {
          params.set("status", statusFilter);
        }

        if (sourceFilter !== "ALL") {
          params.set("source", sourceFilter);
        }

        const result = await apiRequest(
          `${LEADS_ENDPOINT}?${params.toString()}`
        );

        const data = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];

        setLeads(data);

        setPagination(
          result?.pagination || {
            page,
            limit,
            total: data.length,
            totalPages: 1,
          }
        );
      } catch (err) {
        setError(err.message || "Unable to load leads");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, search, statusFilter, sourceFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const stats = useMemo(() => {
    const total = pagination.total || leads.length;

    const won = leads.filter((lead) => lead.status === "WON").length;
    const lost = leads.filter((lead) => lead.status === "LOST").length;
    const active = leads.filter(
      (lead) => !["WON", "LOST"].includes(lead.status)
    ).length;

    const pipelineValue = leads
      .filter((lead) => lead.status !== "LOST")
      .reduce((sum, lead) => sum + Number(lead.value || 0), 0);

    return {
      total,
      active,
      won,
      lost,
      pipelineValue,
    };
  }, [leads, pagination.total]);

  const displayedLeads = useMemo(() => {
    const copy = [...leads];

    copy.sort((a, b) => {
      let aValue = a?.[sortBy];
      let bValue = b?.[sortBy];

      if (sortBy === "value") {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;

      return 0;
    });

    return copy;
  }, [leads, sortBy, sortOrder]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (lead) => {
    setSelectedLead(null);
    setEditingLead(lead);
    setForm(mapLeadToForm(lead));
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = normalizePayload(form);

      if (!payload.name) {
        throw new Error("Lead name is required");
      }

      if (editingLead?._id) {
        await apiRequest(`${LEADS_ENDPOINT}/${editingLead._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(LEADS_ENDPOINT, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingLead(null);
      setForm(EMPTY_FORM);

      await fetchLeads(true);
    } catch (err) {
      setError(err.message || "Unable to save lead");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lead) => {
    const confirmed = window.confirm(
      `Delete lead "${lead.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");

      await apiRequest(`${LEADS_ENDPOINT}/${lead._id}`, {
        method: "DELETE",
      });

      setSelectedLead(null);

      await fetchLeads(true);
    } catch (err) {
      setError(err.message || "Unable to delete lead");
    }
  };

  const handleConvert = async (lead) => {
    if (lead.convertedOpportunity) {
      return;
    }

    const confirmed = window.confirm(
      `Convert "${lead.name}" into Company + Contact + Opportunity?`
    );

    if (!confirmed) return;

    try {
      setError("");

      const result = await apiRequest(
        `${LEADS_ENDPOINT}/${lead._id}/convert`,
        {
          method: "PATCH",
        }
      );

      setSelectedLead(result?.data?.lead || null);

      await fetchLeads(true);

      alert("Lead converted successfully.");
    } catch (err) {
      setError(err.message || "Unable to convert lead");
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Company",
      "Email",
      "Phone",
      "Source",
      "Status",
      "Value",
      "Expected Close",
    ];

    const rows = displayedLeads.map((lead) => [
      lead.name,
      lead.companyName,
      lead.email,
      lead.phone,
      lead.source,
      lead.status,
      lead.value,
      formatDate(lead.expectedCloseDate),
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `leads-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <Flame size={14} />
                CRM SALES PIPELINE
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Leads
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Manage prospects, qualification, follow-ups and
                conversion from one premium workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fetchLeads(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
              >
                <Download size={17} />
                Export
              </button>

              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                <Plus size={18} />
                New Lead
              </button>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <div className="flex-1">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>

            <button
              onClick={() => setError("")}
              className="rounded-lg p-1 hover:bg-rose-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Users}
            label="Total Leads"
            value={stats.total}
            subtitle="All pipeline records"
          />

          <StatCard
            icon={Activity}
            label="Active Pipeline"
            value={stats.active}
            subtitle="Open opportunities"
          />

          <StatCard
            icon={CheckCircle2}
            label="Won"
            value={stats.won}
            subtitle="Converted leads"
          />

          <StatCard
            icon={AlertCircle}
            label="Lost"
            value={stats.lost}
            subtitle="Closed lost"
          />

          <StatCard
            icon={TrendingUp}
            label="Pipeline Value"
            value={formatCurrency(stats.pipelineValue)}
            subtitle="Current page value"
          />
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search leads by name, email, phone or company..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-slate-100"
              >
                <option value="ALL">All Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-slate-100"
              >
                <option value="ALL">All Sources</option>
                {SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>
                    {source.replaceAll("_", " ")}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setSourceFilter("ALL");
                  setPage(1);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Filter size={16} />
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">Lead Pipeline</h2>
              <p className="mt-1 text-xs text-slate-400">
                Showing {displayedLeads.length} of {pagination.total || 0}{" "}
                leads
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <RefreshCw
                  size={30}
                  className="mx-auto animate-spin text-slate-400"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Loading leads...
                </p>
              </div>
            </div>
          ) : displayedLeads.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Users size={28} className="text-slate-400" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No leads found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No leads match the current search and filters.
              </p>

              <button
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Create First Lead
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-bold">Lead</th>
                      <th className="px-5 py-4 font-bold">Company</th>
                      <th className="px-5 py-4 font-bold">Contact</th>
                      <th className="px-5 py-4 font-bold">
                        <button
                          onClick={() => toggleSort("status")}
                          className="inline-flex items-center gap-1"
                        >
                          Status
                          {sortBy === "status" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            ))}
                        </button>
                      </th>
                      <th className="px-5 py-4 font-bold">
                        <button
                          onClick={() => toggleSort("value")}
                          className="inline-flex items-center gap-1"
                        >
                          Value
                          {sortBy === "value" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            ))}
                        </button>
                      </th>
                      <th className="px-5 py-4 font-bold">Follow-up</th>
                      <th className="px-5 py-4 text-right font-bold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {displayedLeads.map((lead) => (
                      <tr
                        key={lead._id}
                        className="group transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="flex items-center gap-3 text-left"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-bold text-white">
                              {initials(lead.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">
                                {lead.name}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {lead.designation || "No designation"}
                              </p>
                            </div>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[190px]">
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {lead.companyName || "—"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {lead.source || "OTHER"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1 text-xs">
                            <p className="flex items-center gap-1.5 text-slate-600">
                              <Mail size={12} />
                              {lead.email || "—"}
                            </p>

                            <p className="flex items-center gap-1.5 text-slate-500">
                              <Phone size={12} />
                              {lead.phone || "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(
                              lead.status
                            )}`}
                          >
                            {lead.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">
                            {formatCurrency(
                              lead.value,
                              lead.currency
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs">
                            <p className="font-semibold text-slate-700">
                              {formatDate(lead.nextFollowUpAt)}
                            </p>
                            <p className="mt-1 text-slate-400">
                              {formatDate(lead.expectedCloseDate)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setSelectedLead(lead)}
                              title="View"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => openEdit(lead)}
                              title="Edit"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(lead)}
                              title="Delete"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>

                            <button
                              title="More"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Page {pagination.page || page} of{" "}
                  {pagination.totalPages || 1}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <span className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                    {page}
                  </span>

                  <button
                    disabled={
                      page >= (pagination.totalPages || 1)
                    }
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* CREATE / EDIT */}
      {showForm && (
        <Modal
          title={editingLead ? "Edit Lead" : "Create New Lead"}
          subtitle={
            editingLead
              ? "Update existing CRM lead information"
              : "Add a new prospect to your sales pipeline"
          }
          onClose={() => setShowForm(false)}
          wide
        >
          <LeadForm
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            saving={saving}
            editing={Boolean(editingLead)}
          />
        </Modal>
      )}

      {/* DETAILS */}
      {selectedLead && (
        <LeadDetails
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEdit={() => openEdit(selectedLead)}
          onConvert={() => handleConvert(selectedLead)}
          onDelete={() => handleDelete(selectedLead)}
        />
      )}
    </div>
  );
}