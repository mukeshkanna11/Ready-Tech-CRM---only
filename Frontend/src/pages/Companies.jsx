"use strict";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  CircleDollarSign,
  ClipboardList,
  Contact,
  Download,
  Edit3,
  Eye,
  ExternalLink,
  Filter,
  Flame,
  Globe2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

/* =========================================================
   API
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const COMPANIES_ENDPOINT = `${API_BASE}/companies`;

/* =========================================================
   OPTIONS
========================================================= */

const COMPANY_TYPE_OPTIONS = [
  "PROSPECT",
  "CUSTOMER",
  "PARTNER",
  "VENDOR",
  "COMPETITOR",
  "OTHER",
];

const STATUS_OPTIONS = [
  "PROSPECT",
  "CUSTOMER",
  "ACTIVE",
  "INACTIVE",
  "LEAD",
  "CHURNED",
];

const OWNERSHIP_OPTIONS = [
  "PRIVATE",
  "PUBLIC",
  "GOVERNMENT",
  "PARTNERSHIP",
  "SOLE_PROPRIETORSHIP",
  "OTHER",
];

const RATING_OPTIONS = [
  "HOT",
  "WARM",
  "COLD",
];

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

/* =========================================================
   EMPTY FORM
========================================================= */

const EMPTY_FORM = {
  name: "",
  legalName: "",
  companyCode: "",
  description: "",
  industry: "",
  companyType: "PROSPECT",
  ownership: "PRIVATE",

  employeeCount: "",
  annualRevenue: "",

  website: "",
  email: "",
  phone: "",
  alternatePhone: "",
  fax: "",

  billingAddressLine1: "",
  billingAddressLine2: "",
  billingCity: "",
  billingState: "",
  billingCountry: "India",
  billingPostalCode: "",

  shippingAddressLine1: "",
  shippingAddressLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingCountry: "India",
  shippingPostalCode: "",

  gstin: "",
  pan: "",
  taxId: "",
  registrationNumber: "",

  source: "WEBSITE",
  status: "PROSPECT",
  rating: "WARM",

  tags: "",
};
   
                
/* =========================================================
   TOKEN
========================================================= */

function getToken() {
  const accessToken = localStorage.getItem("accessToken");
  const token = localStorage.getItem("token");
  const sessionAccessToken = sessionStorage.getItem("accessToken");
  const sessionToken = sessionStorage.getItem("token");

  return (
    accessToken ||
    token ||
    sessionAccessToken ||
    sessionToken ||
    ""
  );
}



async function apiRequest(url, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please login again."
    );
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

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
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");

    throw new Error(
      "Your session has expired. Please login again."
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


/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );
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

function initials(name = "") {
  const result = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return result || "CO";
}

function displayEnum(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/* =========================================================
   CLASS HELPERS
========================================================= */

function statusClass(status) {
  const classes = {
    PROSPECT:
      "bg-blue-50 text-blue-700 border-blue-100",
    CUSTOMER:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    ACTIVE:
      "bg-green-50 text-green-700 border-green-100",
    INACTIVE:
      "bg-slate-100 text-slate-600 border-slate-200",
    LEAD:
      "bg-violet-50 text-violet-700 border-violet-100",
    CHURNED:
      "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    classes[status] ||
    "bg-slate-50 text-slate-700 border-slate-100"
  );
}

function ratingClass(rating) {
  const classes = {
    HOT:
      "bg-rose-50 text-rose-700 border-rose-100",
    WARM:
      "bg-amber-50 text-amber-700 border-amber-100",
    COLD:
      "bg-cyan-50 text-cyan-700 border-cyan-100",
  };

  return (
    classes[rating] ||
    "bg-slate-50 text-slate-600 border-slate-100"
  );
}

/* =========================================================
   MAP API -> FORM
========================================================= */

function mapCompanyToForm(company) {
  return {
    name: company?.name || "",
    legalName: company?.legalName || "",
    companyCode: company?.companyCode || "",
    description: company?.description || "",

    industry: company?.industry || "",
    companyType: company?.companyType || "PROSPECT",
    ownership: company?.ownership || "PRIVATE",

    employeeCount: company?.employeeCount ?? "",
    annualRevenue: company?.annualRevenue ?? "",

    website: company?.website || "",
    email: company?.email || "",
    phone: company?.phone || "",
    alternatePhone: company?.alternatePhone || "",
    fax: company?.fax || "",

    billingAddressLine1:
      company?.billingAddress?.addressLine1 || "",
    billingAddressLine2:
      company?.billingAddress?.addressLine2 || "",
    billingCity: company?.billingAddress?.city || "",
    billingState: company?.billingAddress?.state || "",
    billingCountry:
      company?.billingAddress?.country || "India",
    billingPostalCode:
      company?.billingAddress?.postalCode || "",

    shippingAddressLine1:
      company?.shippingAddress?.addressLine1 || "",
    shippingAddressLine2:
      company?.shippingAddress?.addressLine2 || "",
    shippingCity: company?.shippingAddress?.city || "",
    shippingState:
      company?.shippingAddress?.state || "",
    shippingCountry:
      company?.shippingAddress?.country || "India",
    shippingPostalCode:
      company?.shippingAddress?.postalCode || "",

    gstin: company?.gstin || "",
    pan: company?.pan || "",
    taxId: company?.taxId || "",
    registrationNumber:
      company?.registrationNumber || "",

    source: company?.source || "WEBSITE",
    status: company?.status || "PROSPECT",
    rating: company?.rating || "WARM",

    tags: Array.isArray(company?.tags)
      ? company.tags.join(", ")
      : company?.tags || "",
  };
}

/* =========================================================
   FORM -> API PAYLOAD
========================================================= */

function normalizePayload(form) {
  return {
    name: form.name.trim(),
    legalName: form.legalName.trim(),
    companyCode: form.companyCode.trim(),

    description: form.description.trim(),

    industry: form.industry.trim(),
    companyType: form.companyType,
    ownership: form.ownership,

    employeeCount: Number(form.employeeCount || 0),
    annualRevenue: Number(form.annualRevenue || 0),

    website: form.website.trim(),
    email: form.email.trim().toLowerCase(),

    phone: form.phone.trim(),
    alternatePhone: form.alternatePhone.trim(),
    fax: form.fax.trim(),

    billingAddress: {
      addressLine1: form.billingAddressLine1.trim(),
      addressLine2: form.billingAddressLine2.trim(),
      city: form.billingCity.trim(),
      state: form.billingState.trim(),
      country: form.billingCountry.trim(),
      postalCode: form.billingPostalCode.trim(),
    },

    shippingAddress: {
      addressLine1: form.shippingAddressLine1.trim(),
      addressLine2: form.shippingAddressLine2.trim(),
      city: form.shippingCity.trim(),
      state: form.shippingState.trim(),
      country: form.shippingCountry.trim(),
      postalCode: form.shippingPostalCode.trim(),
    },

    gstin: form.gstin.trim().toUpperCase(),
    pan: form.pan.trim().toUpperCase(),
    taxId: form.taxId.trim(),
    registrationNumber:
      form.registrationNumber.trim(),

    source: form.source,
    status: form.status,
    rating: form.rating,

    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconClass = "bg-slate-900",
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100 transition group-hover:scale-125" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg ${iconClass}`}
        >
          <Icon size={20} />
        </div>
      </div>
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
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <div
        className={`max-h-[94vh] w-full overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl ${
          wide ? "max-w-7xl" : "max-w-3xl"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">
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
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(94vh-90px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

/* =========================================================
   FORM SECTION
========================================================= */

function FormSection({
  icon: Icon,
  title,
  subtitle,
  children,
  iconClass = "bg-slate-900",
}) {
  return (
    <div className="border-t border-slate-100 pt-7 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${iconClass}`}
        >
          <Icon size={17} />
        </div>

        <div>
          <h3 className="font-black text-slate-900">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   COMPANY FORM
========================================================= */

function CompanyForm({
  form,
  setForm,
  onSubmit,
  saving,
  editing,
}) {
  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const copyBillingToShipping = () => {
    setForm((current) => ({
      ...current,

      shippingAddressLine1:
        current.billingAddressLine1,

      shippingAddressLine2:
        current.billingAddressLine2,

      shippingCity:
        current.billingCity,

      shippingState:
        current.billingState,

      shippingCountry:
        current.billingCountry,

      shippingPostalCode:
        current.billingPostalCode,
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* BASIC */}

      <FormSection
        icon={Building2}
        title="Company Information"
        subtitle="Basic organization and classification details"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name" required>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) =>
                update("name", e.target.value)
              }
              placeholder="GreenField Agro Industries Pvt Ltd"
              required
            />
          </Field>

          <Field label="Legal Name">
            <input
              className={inputClass}
              value={form.legalName}
              onChange={(e) =>
                update("legalName", e.target.value)
              }
              placeholder="GreenField Agro Industries Private Limited"
            />
          </Field>

          <Field label="Company Code">
            <input
              className={inputClass}
              value={form.companyCode}
              onChange={(e) =>
                update(
                  "companyCode",
                  e.target.value.toUpperCase()
                )
              }
              placeholder="GFA-001"
            />
          </Field>

          <Field label="Industry">
            <input
              className={inputClass}
              value={form.industry}
              onChange={(e) =>
                update("industry", e.target.value)
              }
              placeholder="Agriculture"
            />
          </Field>

          <Field label="Company Type">
            <select
              className={inputClass}
              value={form.companyType}
              onChange={(e) =>
                update("companyType", e.target.value)
              }
            >
              {COMPANY_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {displayEnum(item)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ownership">
            <select
              className={inputClass}
              value={form.ownership}
              onChange={(e) =>
                update("ownership", e.target.value)
              }
            >
              {OWNERSHIP_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {displayEnum(item)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employees">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.employeeCount}
              onChange={(e) =>
                update(
                  "employeeCount",
                  e.target.value
                )
              }
              placeholder="120"
            />
          </Field>

          <Field label="Annual Revenue">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.annualRevenue}
              onChange={(e) =>
                update(
                  "annualRevenue",
                  e.target.value
                )
              }
              placeholder="32000000"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Description">
              <textarea
                rows={4}
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  update(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Agricultural equipment manufacturing and agri technology solutions company."
              />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* CONTACT */}

      <FormSection
        icon={Phone}
        title="Contact Information"
        subtitle="Primary company communication channels"
        iconClass="bg-indigo-600"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) =>
                update("email", e.target.value)
              }
              placeholder="contact@company.com"
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) =>
                update("phone", e.target.value)
              }
              placeholder="+91 9876543210"
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
              placeholder="+91 9887654321"
            />
          </Field>

          <Field label="Fax">
            <input
              className={inputClass}
              value={form.fax}
              onChange={(e) =>
                update("fax", e.target.value)
              }
              placeholder="Fax number"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Website">
              <div className="relative">
                <Globe2
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="url"
                  className={`${inputClass} pl-10`}
                  value={form.website}
                  onChange={(e) =>
                    update(
                      "website",
                      e.target.value
                    )
                  }
                  placeholder="https://company.com"
                />
              </div>
            </Field>
          </div>
        </div>
      </FormSection>

      {/* BILLING */}

      <FormSection
        icon={MapPin}
        title="Billing Address"
        subtitle="Registered billing and office address"
        iconClass="bg-emerald-600"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address Line 1">
            <input
              className={inputClass}
              value={form.billingAddressLine1}
              onChange={(e) =>
                update(
                  "billingAddressLine1",
                  e.target.value
                )
              }
              placeholder="18 Industrial Estate Road"
            />
          </Field>

          <Field label="Address Line 2">
            <input
              className={inputClass}
              value={form.billingAddressLine2}
              onChange={(e) =>
                update(
                  "billingAddressLine2",
                  e.target.value
                )
              }
              placeholder="SIDCO Industrial Estate"
            />
          </Field>

          <Field label="City">
            <input
              className={inputClass}
              value={form.billingCity}
              onChange={(e) =>
                update(
                  "billingCity",
                  e.target.value
                )
              }
              placeholder="Coimbatore"
            />
          </Field>

          <Field label="State">
            <input
              className={inputClass}
              value={form.billingState}
              onChange={(e) =>
                update(
                  "billingState",
                  e.target.value
                )
              }
              placeholder="Tamil Nadu"
            />
          </Field>

          <Field label="Country">
            <input
              className={inputClass}
              value={form.billingCountry}
              onChange={(e) =>
                update(
                  "billingCountry",
                  e.target.value
                )
              }
              placeholder="India"
            />
          </Field>

          <Field label="Postal Code">
            <input
              className={inputClass}
              value={form.billingPostalCode}
              onChange={(e) =>
                update(
                  "billingPostalCode",
                  e.target.value
                )
              }
              placeholder="641021"
            />
          </Field>
        </div>
      </FormSection>

      {/* SHIPPING */}

      <FormSection
        icon={MapPin}
        title="Shipping Address"
        subtitle="Delivery and shipping location"
        iconClass="bg-cyan-600"
      >
        <div className="mb-4">
          <button
            type="button"
            onClick={copyBillingToShipping}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            <ClipboardList size={14} />
            Same as Billing Address
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address Line 1">
            <input
              className={inputClass}
              value={form.shippingAddressLine1}
              onChange={(e) =>
                update(
                  "shippingAddressLine1",
                  e.target.value
                )
              }
              placeholder="18 Industrial Estate Road"
            />
          </Field>

          <Field label="Address Line 2">
            <input
              className={inputClass}
              value={form.shippingAddressLine2}
              onChange={(e) =>
                update(
                  "shippingAddressLine2",
                  e.target.value
                )
              }
              placeholder="SIDCO Industrial Estate"
            />
          </Field>

          <Field label="City">
            <input
              className={inputClass}
              value={form.shippingCity}
              onChange={(e) =>
                update(
                  "shippingCity",
                  e.target.value
                )
              }
              placeholder="Coimbatore"
            />
          </Field>

          <Field label="State">
            <input
              className={inputClass}
              value={form.shippingState}
              onChange={(e) =>
                update(
                  "shippingState",
                  e.target.value
                )
              }
              placeholder="Tamil Nadu"
            />
          </Field>

          <Field label="Country">
            <input
              className={inputClass}
              value={form.shippingCountry}
              onChange={(e) =>
                update(
                  "shippingCountry",
                  e.target.value
                )
              }
              placeholder="India"
            />
          </Field>

          <Field label="Postal Code">
            <input
              className={inputClass}
              value={form.shippingPostalCode}
              onChange={(e) =>
                update(
                  "shippingPostalCode",
                  e.target.value
                )
              }
              placeholder="641021"
            />
          </Field>
        </div>
      </FormSection>

      {/* TAX */}

      <FormSection
        icon={CircleDollarSign}
        title="Tax & Registration"
        subtitle="Government and company registration information"
        iconClass="bg-amber-600"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="GSTIN">
            <input
              className={inputClass}
              value={form.gstin}
              onChange={(e) =>
                update(
                  "gstin",
                  e.target.value.toUpperCase()
                )
              }
              maxLength={15}
              placeholder="33AABCG5678L1Z2"
            />
          </Field>

          <Field label="PAN">
            <input
              className={inputClass}
              value={form.pan}
              onChange={(e) =>
                update(
                  "pan",
                  e.target.value.toUpperCase()
                )
              }
              maxLength={10}
              placeholder="AABCG5678L"
            />
          </Field>

          <Field label="Tax ID">
            <input
              className={inputClass}
              value={form.taxId}
              onChange={(e) =>
                update("taxId", e.target.value)
              }
              placeholder="TAX-GFA-001"
            />
          </Field>

          <Field label="Registration Number">
            <input
              className={inputClass}
              value={form.registrationNumber}
              onChange={(e) =>
                update(
                  "registrationNumber",
                  e.target.value
                )
              }
              placeholder="U29210TN2021PTC145678"
            />
          </Field>
        </div>
      </FormSection>

      {/* CRM */}

      <FormSection
        icon={Activity}
        title="CRM Classification"
        subtitle="Sales lifecycle, rating and source"
        iconClass="bg-violet-600"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Source">
            <select
              className={inputClass}
              value={form.source}
              onChange={(e) =>
                update("source", e.target.value)
              }
            >
              {SOURCE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {displayEnum(item)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value)
              }
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {displayEnum(item)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rating">
            <select
              className={inputClass}
              value={form.rating}
              onChange={(e) =>
                update("rating", e.target.value)
              }
            >
              {RATING_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tags">
            <div className="relative">
              <Tag
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                className={`${inputClass} pl-10`}
                value={form.tags}
                onChange={(e) =>
                  update("tags", e.target.value)
                }
                placeholder="Agriculture, Enterprise, Priority"
              />
            </div>
          </Field>
        </div>
      </FormSection>

      {/* ACTION */}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
            ? "Update Company"
            : "Create Company"}
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold text-slate-800">
            {value || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL
========================================================= */

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   COMPANY DETAILS
========================================================= */

function CompanyDetails({
  company,
  onClose,
  onEdit,
  onDelete,
}) {
  const billing = company?.billingAddress || {};
  const shipping = company?.shippingAddress || {};

  return (
    <Modal
      title="Company Details"
      subtitle={`${company.name} • ${
        company.companyCode || "No company code"
      }`}
      onClose={onClose}
      wide
    >
      <div className="space-y-6">
        {/* HERO */}

        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-900 shadow-xl">
                {initials(company.name)}
              </div>

              <div>
                <h3 className="text-2xl font-black">
                  {company.name}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {company.legalName ||
                    "Legal name not available"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                      company.status
                    )}`}
                  >
                    {displayEnum(company.status)}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${ratingClass(
                      company.rating
                    )}`}
                  >
                    {company.rating || "—"}
                  </span>

                  {company.companyType && (
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                      {displayEnum(
                        company.companyType
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs text-slate-400">
                Annual Revenue
              </p>

              <p className="mt-1 text-2xl font-black">
                {formatCurrency(
                  company.annualRevenue
                )}
              </p>
            </div>
          </div>
        </div>

        {/* KPI */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={Users}
            label="Employees"
            value={formatNumber(
              company.employeeCount
            )}
          />

          <InfoCard
            icon={TrendingUp}
            label="Annual Revenue"
            value={formatCurrency(
              company.annualRevenue
            )}
          />

          <InfoCard
            icon={ClipboardList}
            label="Leads"
            value={formatNumber(
              company.leadCount
            )}
          />

          <InfoCard
            icon={Contact}
            label="Contacts"
            value={formatNumber(
              company.contactCount
            )}
          />
        </div>

        {/* CONTACT */}

        <div className="rounded-2xl border border-slate-200 p-5">
          <h4 className="mb-4 text-base font-black text-slate-900">
            Contact Information
          </h4>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              icon={Mail}
              label="Email"
              value={company.email}
            />

            <InfoCard
              icon={Phone}
              label="Phone"
              value={company.phone}
            />

            <InfoCard
              icon={Phone}
              label="Alternate Phone"
              value={company.alternatePhone}
            />

            <InfoCard
              icon={Globe2}
              label="Website"
              value={company.website}
            />

            <InfoCard
              icon={Building2}
              label="Industry"
              value={company.industry}
            />

            <InfoCard
              icon={Users}
              label="Ownership"
              value={displayEnum(
                company.ownership
              )}
            />
          </div>
        </div>

        {/* BUSINESS */}

        <div className="rounded-2xl border border-slate-200 p-5">
          <h4 className="mb-4 text-base font-black text-slate-900">
            Business & Registration
          </h4>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail
              label="Company Code"
              value={company.companyCode}
            />

            <Detail
              label="Company Type"
              value={displayEnum(
                company.companyType
              )}
            />

            <Detail
              label="Source"
              value={displayEnum(company.source)}
            />

            <Detail
              label="GSTIN"
              value={company.gstin}
            />

            <Detail
              label="PAN"
              value={company.pan}
            />

            <Detail
              label="Tax ID"
              value={company.taxId}
            />

            <Detail
              label="Registration Number"
              value={
                company.registrationNumber
              }
            />

            <Detail
              label="Created"
              value={formatDate(
                company.createdAt
              )}
            />

            <Detail
              label="Updated"
              value={formatDate(
                company.updatedAt
              )}
            />
          </div>
        </div>

        {/* ADDRESSES */}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={18} />
              <h4 className="font-black text-slate-900">
                Billing Address
              </h4>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              {billing.addressLine1 || "—"}
              <br />

              {billing.addressLine2 && (
                <>
                  {billing.addressLine2}
                  <br />
                </>
              )}

              {billing.city &&
                `${billing.city}, `}

              {billing.state}
              <br />

              {billing.country &&
                `${billing.country} - `}

              {billing.postalCode}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={18} />
              <h4 className="font-black text-slate-900">
                Shipping Address
              </h4>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              {shipping.addressLine1 || "—"}
              <br />

              {shipping.addressLine2 && (
                <>
                  {shipping.addressLine2}
                  <br />
                </>
              )}

              {shipping.city &&
                `${shipping.city}, `}

              {shipping.state}
              <br />

              {shipping.country &&
                `${shipping.country} - `}

              {shipping.postalCode}
            </p>
          </div>
        </div>

        {/* DESCRIPTION */}

        {company.description && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="mb-2 font-black text-slate-900">
              Description
            </h4>

            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {company.description}
            </p>
          </div>
        )}

        {/* TAGS */}

        {Array.isArray(company.tags) &&
          company.tags.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Tag size={17} />
                <h4 className="font-black text-slate-900">
                  Tags
                </h4>
              </div>

              <div className="flex flex-wrap gap-2">
                {company.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* ACTIONS */}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink size={16} />
              Visit Website
            </a>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Edit3 size={16} />
            Edit Company
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 size={16} />
            Delete Company
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function Companies() {
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [industryFilter, setIndustryFilter] =
    useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [showForm, setShowForm] =
    useState(false);

  const [editingCompany, setEditingCompany] =
    useState(null);

  const [selectedCompany, setSelectedCompany] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] = useState(false);

  const [sortBy, setSortBy] =
    useState("createdAt");

  const [sortOrder, setSortOrder] =
    useState("desc");

  /* =====================================================
     FETCH COMPANIES
  ===================================================== */

  const fetchCompanies = useCallback(
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
          params.set(
            "search",
            search.trim()
          );
        }

        if (statusFilter !== "ALL") {
          params.set(
            "status",
            statusFilter
          );
        }

        if (typeFilter !== "ALL") {
          params.set(
            "companyType",
            typeFilter
          );
        }

        if (industryFilter !== "ALL") {
          params.set(
            "industry",
            industryFilter
          );
        }

        const result = await apiRequest(
          `${COMPANIES_ENDPOINT}?${params.toString()}`
        );

        const data = Array.isArray(
          result?.data
        )
          ? result.data
          : Array.isArray(result)
          ? result
          : [];

        setCompanies(data);

        setPagination(
          result?.pagination || {
            page,
            limit,
            total: data.length,
            pages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to load companies"
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
      typeFilter,
      industryFilter,
    ]
  );

  /* =====================================================
     INITIAL / FILTER FETCH
  ===================================================== */

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  /* =====================================================
     INDUSTRIES
  ===================================================== */

  const industries = useMemo(() => {
    const values = companies
      .map((company) => company?.industry)
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [companies]);

  /* =====================================================
     STATS
  ===================================================== */

  const stats = useMemo(() => {
    const total =
      pagination.total ||
      companies.length;

    const customers = companies.filter(
      (company) =>
        company.status === "CUSTOMER"
    ).length;

    const prospects = companies.filter(
      (company) =>
        company.status === "PROSPECT"
    ).length;

    const active = companies.filter(
      (company) =>
        ["ACTIVE", "CUSTOMER"].includes(
          company.status
        )
    ).length;

    const employees = companies.reduce(
      (sum, company) =>
        sum +
        Number(
          company.employeeCount || 0
        ),
      0
    );

    const revenue = companies.reduce(
      (sum, company) =>
        sum +
        Number(
          company.annualRevenue || 0
        ),
      0
    );

    const leads = companies.reduce(
      (sum, company) =>
        sum +
        Number(company.leadCount || 0),
      0
    );

    const contacts = companies.reduce(
      (sum, company) =>
        sum +
        Number(
          company.contactCount || 0
        ),
      0
    );

    return {
      total,
      customers,
      prospects,
      active,
      employees,
      revenue,
      leads,
      contacts,
    };
  }, [companies, pagination.total]);

  /* =====================================================
     SORT
  ===================================================== */

  const displayedCompanies = useMemo(() => {
    const copy = [...companies];

    copy.sort((a, b) => {
      let aValue = a?.[sortBy];
      let bValue = b?.[sortBy];

      if (
        sortBy === "annualRevenue" ||
        sortBy === "employeeCount"
      ) {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
      } else if (
        sortBy === "createdAt" ||
        sortBy === "updatedAt"
      ) {
        aValue = new Date(
          aValue || 0
        ).getTime();

        bValue = new Date(
          bValue || 0
        ).getTime();
      } else {
        aValue = String(
          aValue || ""
        ).toLowerCase();

        bValue = String(
          bValue || ""
        ).toLowerCase();
      }

      if (aValue < bValue) {
        return sortOrder === "asc"
          ? -1
          : 1;
      }

      if (aValue > bValue) {
        return sortOrder === "asc"
          ? 1
          : -1;
      }

      return 0;
    });

    return copy;
  }, [
    companies,
    sortBy,
    sortOrder,
  ]);

  /* =====================================================
     CREATE
  ===================================================== */

  const openCreate = () => {
    setEditingCompany(null);
    setForm({
      ...EMPTY_FORM,
    });
    setShowForm(true);
  };

  /* =====================================================
     EDIT
  ===================================================== */

  const openEdit = (company) => {
    setSelectedCompany(null);

    setEditingCompany(company);

    setForm(
      mapCompanyToForm(company)
    );

    setShowForm(true);
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload =
        normalizePayload(form);

      if (!payload.name) {
        throw new Error(
          "Company name is required."
        );
      }

      if (editingCompany?._id) {
        await apiRequest(
          `${COMPANIES_ENDPOINT}/${editingCompany._id}`,
          {
            method: "PATCH",
            body: JSON.stringify(
              payload
            ),
          }
        );
      } else {
        await apiRequest(
          COMPANIES_ENDPOINT,
          {
            method: "POST",
            body: JSON.stringify(
              payload
            ),
          }
        );
      }

      setShowForm(false);
      setEditingCompany(null);
      setForm({
        ...EMPTY_FORM,
      });

      await fetchCompanies(true);
    } catch (err) {
      setError(
        err.message ||
          "Unable to save company"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete = async (
    company
  ) => {
    const confirmed =
      window.confirm(
        `Delete company "${company.name}"? This action cannot be undone.`
      );

    if (!confirmed) return;

    try {
      setError("");

      await apiRequest(
        `${COMPANIES_ENDPOINT}/${company._id}`,
        {
          method: "DELETE",
        }
      );

      setSelectedCompany(null);

      await fetchCompanies(true);
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete company"
      );
    }
  };

  /* =====================================================
     SORT TOGGLE
  ===================================================== */

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((current) =>
        current === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  /* =====================================================
     CLEAR FILTER
  ===================================================== */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setIndustryFilter("ALL");
    setPage(1);
  };

  /* =====================================================
     CSV EXPORT
  ===================================================== */

  const exportCSV = () => {
    const headers = [
      "Company Name",
      "Legal Name",
      "Company Code",
      "Industry",
      "Company Type",
      "Status",
      "Rating",
      "Employees",
      "Annual Revenue",
      "Email",
      "Phone",
      "Website",
      "GSTIN",
      "PAN",
      "City",
      "State",
      "Country",
      "Postal Code",
      "Lead Count",
      "Contact Count",
      "Created At",
    ];

    const rows =
      displayedCompanies.map(
        (company) => [
          company.name,
          company.legalName,
          company.companyCode,
          company.industry,
          company.companyType,
          company.status,
          company.rating,
          company.employeeCount,
          company.annualRevenue,
          company.email,
          company.phone,
          company.website,
          company.gstin,
          company.pan,
          company.billingAddress
            ?.city,
          company.billingAddress
            ?.state,
          company.billingAddress
            ?.country,
          company.billingAddress
            ?.postalCode,
          company.leadCount,
          company.contactCount,
          formatDate(
            company.createdAt
          ),
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

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download = `companies-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    document.body.removeChild(
      anchor
    );

    URL.revokeObjectURL(url);
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                <Building2 size={14} />

                CRM COMPANY MANAGEMENT
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Companies
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Manage organizations,
                customers, prospects,
                business information and
                CRM relationships from one
                premium workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  fetchCompanies(true)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
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
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
              >
                <Download size={17} />

                Export
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                <Plus size={18} />

                New Company
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertCircle
              className="mt-0.5 shrink-0"
              size={19}
            />

            <div className="flex-1">
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
              className="rounded-lg p-1 hover:bg-rose-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Building2}
            label="Total Companies"
            value={stats.total}
            subtitle="All organizations"
          />

          <StatCard
            icon={CheckCircle2}
            label="Customers"
            value={stats.customers}
            subtitle="Active customer accounts"
            iconClass="bg-emerald-600"
          />

          <StatCard
            icon={Flame}
            label="Prospects"
            value={stats.prospects}
            subtitle="Potential customers"
            iconClass="bg-indigo-600"
          />

          <StatCard
            icon={Users}
            label="Employees"
            value={formatNumber(
              stats.employees
            )}
            subtitle="Across listed companies"
            iconClass="bg-violet-600"
          />

          <StatCard
            icon={CircleDollarSign}
            label="Revenue"
            value={formatCurrency(
              stats.revenue
            )}
            subtitle="Current page total"
            iconClass="bg-amber-600"
          />
        </div>

        {/* =================================================
            RELATION STATS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Linked Leads
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900">
                  {formatNumber(
                    stats.leads
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ClipboardList size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Linked Contacts
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900">
                  {formatNumber(
                    stats.contacts
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Contact size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

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
                  setSearch(
                    e.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search companies by name, email, phone, GSTIN or industry..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value
                  );
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-slate-100"
              >
                <option value="ALL">
                  All Status
                </option>

                {STATUS_OPTIONS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {displayEnum(
                        item
                      )}
                    </option>
                  )
                )}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(
                    e.target.value
                  );
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-slate-100"
              >
                <option value="ALL">
                  All Types
                </option>

                {COMPANY_TYPE_OPTIONS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {displayEnum(
                        item
                      )}
                    </option>
                  )
                )}
              </select>

              <select
                value={industryFilter}
                onChange={(e) => {
                  setIndustryFilter(
                    e.target.value
                  );
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-slate-100"
              >
                <option value="ALL">
                  All Industries
                </option>

                {industries.map(
                  (industry) => (
                    <option
                      key={industry}
                      value={industry}
                    >
                      {industry}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <Filter size={16} />

                Clear
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-black text-slate-900">
                Company Directory
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Showing{" "}
                {displayedCompanies.length}{" "}
                of{" "}
                {pagination.total || 0}{" "}
                companies
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
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium outline-none"
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
            <div className="flex min-h-[450px] items-center justify-center">
              <div className="text-center">
                <RefreshCw
                  size={32}
                  className="mx-auto animate-spin text-slate-400"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Loading companies...
                </p>
              </div>
            </div>
          ) : displayedCompanies.length ===
            0 ? (
            <div className="flex min-h-[450px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Building2
                  size={28}
                  className="text-slate-400"
                />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-900">
                No companies found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No companies match the
                current search or
                filters.
              </p>

              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                <Plus size={16} />

                Create Company
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-bold">
                        Company
                      </th>

                      <th className="px-5 py-4 font-bold">
                        Industry
                      </th>

                      <th className="px-5 py-4 font-bold">
                        Contact
                      </th>

                      <th className="px-5 py-4 font-bold">
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

                      <th className="px-5 py-4 font-bold">
                        Rating
                      </th>

                      <th className="px-5 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              "annualRevenue"
                            )
                          }
                          className="inline-flex items-center gap-1"
                        >
                          Revenue

                          {sortBy ===
                            "annualRevenue" &&
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

                      <th className="px-5 py-4 font-bold">
                        Relations
                      </th>

                      <th className="px-5 py-4 text-right font-bold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {displayedCompanies.map(
                      (company) => (
                        <tr
                          key={
                            company._id
                          }
                          className="group transition hover:bg-slate-50/80"
                        >
                          {/* COMPANY */}

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCompany(
                                  company
                                )
                              }
                              className="flex items-center gap-3 text-left"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-700 text-xs font-black text-white shadow-md">
                                {initials(
                                  company.name
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[230px] truncate font-black text-slate-900">
                                  {
                                    company.name
                                  }
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {company.companyCode ||
                                    "No company code"}
                                </p>
                              </div>
                            </button>
                          </td>

                          {/* INDUSTRY */}

                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-700">
                                {company.industry ||
                                  "—"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {displayEnum(
                                  company.companyType
                                )}
                              </p>
                            </div>
                          </td>

                          {/* CONTACT */}

                          <td className="px-5 py-4">
                            <div className="space-y-1 text-xs">
                              <p className="flex max-w-[230px] items-center gap-1.5 truncate text-slate-600">
                                <Mail
                                  size={12}
                                />

                                {company.email ||
                                  "—"}
                              </p>

                              <p className="flex items-center gap-1.5 text-slate-500">
                                <Phone
                                  size={12}
                                />

                                {company.phone ||
                                  "—"}
                              </p>
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(
                                company.status
                              )}`}
                            >
                              {displayEnum(
                                company.status
                              )}
                            </span>
                          </td>

                          {/* RATING */}

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${ratingClass(
                                company.rating
                              )}`}
                            >
                              {company.rating ||
                                "—"}
                            </span>
                          </td>

                          {/* REVENUE */}

                          <td className="px-5 py-4">
                            <p className="font-black text-slate-800">
                              {formatCurrency(
                                company.annualRevenue
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatNumber(
                                company.employeeCount
                              )}{" "}
                              employees
                            </p>
                          </td>

                          {/* RELATIONS */}

                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">
                                {company.leadCount ||
                                  0}{" "}
                                Leads
                              </span>

                              <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700">
                                {company.contactCount ||
                                  0}{" "}
                                Contacts
                              </span>
                            </div>
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCompany(
                                    company
                                  )
                                }
                                title="View"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Eye
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    company
                                  )
                                }
                                title="Edit"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit3
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    company
                                  )
                                }
                                title="Delete"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                title="More"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                              >
                                <MoreHorizontal
                                  size={16}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  PAGINATION
              ================================================= */}

              <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Page{" "}
                  {pagination.page ||
                    page}{" "}
                  of{" "}
                  {pagination.pages ||
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
                          current - 1
                      )
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                      (pagination.pages ||
                        1)
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1
                      )
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      {showForm && (
        <Modal
          title={
            editingCompany
              ? "Edit Company"
              : "Create New Company"
          }
          subtitle={
            editingCompany
              ? "Update company profile and CRM information"
              : "Add a new organization to your CRM"
          }
          onClose={() =>
            setShowForm(false)
          }
          wide
        >
          <CompanyForm
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            saving={saving}
            editing={Boolean(
              editingCompany
            )}
          />
        </Modal>
      )}

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedCompany && (
        <CompanyDetails
          company={selectedCompany}
          onClose={() =>
            setSelectedCompany(null)
          }
          onEdit={() =>
            openEdit(selectedCompany)
          }
          onDelete={() =>
            handleDelete(
              selectedCompany
            )
          }
        />
      )}
    </div>
  );
}