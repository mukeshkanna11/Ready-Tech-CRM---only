import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Barcode,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  DollarSign,
  Edit3,
  Eye,
  Filter,
  Grid3X3,
  Layers3,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";

/* ======================================================
   API CONFIG
====================================================== */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const PRODUCTS_API = "/products";

/* ======================================================
   CONSTANTS
====================================================== */

const PRODUCT_TYPES = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "digital", label: "Digital" },
  { value: "subscription", label: "Subscription" },
];

const BARCODE_TYPES = [
  "EAN13",
  "EAN8",
  "UPC",
  "CODE128",
  "CODE39",
  "ITF14",
  "QR",
  "CUSTOM",
];

const INVENTORY_TRACKING = [
  "none",
  "quantity",
  "batch",
  "serial",
  "expiry",
];

const TAX_TYPES = [
  { value: "exclusive", label: "Exclusive" },
  { value: "inclusive", label: "Inclusive" },
];

const UNITS = [
  "unit",
  "piece",
  "kg",
  "g",
  "ltr",
  "ml",
  "box",
  "pack",
  "dozen",
  "meter",
  "hour",
];

const EMPTY_FORM = {
  name: "",
  sku: "",
  description: "",
  shortDescription: "",

  barcode: "",
  barcodeType: "CODE128",

  productType: "product",

  category: "",
  subcategory: "",
  brand: "",
  tags: [],

  unit: "unit",

  purchasePrice: 0,
  sellingPrice: 0,
  mrp: 0,
  currency: "INR",

  taxRate: 0,
  discountRate: 0,

  taxType: "exclusive",
  hsnSacCode: "",
  gstRate: 0,

  trackInventory: true,
  currentStock: 0,
  openingStock: 0,
  reservedStock: 0,
  reorderLevel: 0,
  minimumStock: 0,
  maximumStock: 0,

  inventoryTracking: "quantity",

  hasBatchTracking: false,
  hasSerialTracking: false,
  hasExpiryTracking: false,

  vendor: null,
  manufacturer: "",
  warehouse: null,
  location: "",

  image: "",
  images: [],

  hasVariants: false,
  variants: [],

  isActive: true,
  isArchived: false,
};

/* ======================================================
   HELPERS
====================================================== */

const getToken = () => {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
};

const apiFetch = async (endpoint, options = {}) => {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt");

  if (!token) {
    throw new Error("Authentication required");
  }

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData
        ? {}
        : {
            "Content-Type": "application/json",
          }),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    throw new Error(
      data?.message || "Authentication required. Please login again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );
};

const stockStatusLabel = (status) => {
  switch (status) {
    case "out_of_stock":
      return "Out of stock";
    case "low_stock":
      return "Low stock";
    default:
      return "In stock";
  }
};

const getStockStatus = (product) => {
  const current = Number(product?.currentStock || 0);
  const reorder = Number(product?.reorderLevel || 0);

  if (current <= 0) return "out_of_stock";
  if (current <= reorder) return "low_stock";

  return "in_stock";
};

const getInitials = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
};

/* ======================================================
   STATUS BADGE
====================================================== */

const StatusBadge = ({ product }) => {
  const archived = product?.isArchived;
  const active = product?.isActive;

  if (archived) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        <Archive className="h-3.5 w-3.5" />
        Archived
      </span>
    );
  }

  if (!active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
        <XCircle className="h-3.5 w-3.5" />
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Active
    </span>
  );
};

/* ======================================================
   STOCK BADGE
====================================================== */

const StockBadge = ({ product }) => {
  const status =
    product?.stockSummary?.stockStatus ||
    getStockStatus(product);

  const current =
    product?.stockSummary?.currentStock ??
    product?.currentStock ??
    0;

  if (status === "out_of_stock") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
        <TrendingDown className="h-3.5 w-3.5" />
        Out of stock · {formatNumber(current)}
      </span>
    );
  }

  if (status === "low_stock") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
        <AlertCircle className="h-3.5 w-3.5" />
        Low · {formatNumber(current)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
      <TrendingUp className="h-3.5 w-3.5" />
      {formatNumber(current)} in stock
    </span>
  );
};

/* ======================================================
   PRODUCT FORM MODAL
====================================================== */

function ProductFormModal({
  open,
  mode,
  initialProduct,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialProduct) {
      setForm({
        ...EMPTY_FORM,
        ...initialProduct,
        id: undefined,
        _id: undefined,
        tags: Array.isArray(initialProduct.tags)
          ? initialProduct.tags
          : [],
        images: Array.isArray(initialProduct.images)
          ? initialProduct.images
          : [],
        variants: Array.isArray(initialProduct.variants)
          ? initialProduct.variants
          : [],
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setError("");
    setTagInput("");
  }, [open, initialProduct]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = () => {
    const value = tagInput.trim();

    if (!value) return;

    if (
      !form.tags.some(
        (tag) => tag.toLowerCase() === value.toLowerCase()
      )
    ) {
      setForm((prev) => ({
        ...prev,
        tags: [...prev.tags, value],
      }));
    }

    setTagInput("");
  };

  const removeTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== tag),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.sku.trim()) {
      setError("SKU is required.");
      return;
    }

    if (
      form.sellingPrice === "" ||
      Number(form.sellingPrice) < 0
    ) {
      setError("Valid selling price is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,

        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),

        barcode: form.barcode?.trim() || undefined,

        purchasePrice: Number(form.purchasePrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        mrp: Number(form.mrp || 0),

        taxRate: Number(form.taxRate || 0),
        discountRate: Number(form.discountRate || 0),
        gstRate: Number(form.gstRate || 0),

        currentStock: Number(form.currentStock || 0),
        openingStock: Number(form.openingStock || 0),
        reservedStock: Number(form.reservedStock || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        minimumStock: Number(form.minimumStock || 0),
        maximumStock: Number(form.maximumStock || 0),

        tags: form.tags,

        vendor: form.vendor || null,
        warehouse: form.warehouse || null,

        isActive: Boolean(form.isActive),
        isArchived: Boolean(form.isArchived),
      };

      delete payload.id;
      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.stockSummary;
      delete payload.status;

      const productId =
        initialProduct?._id ||
        initialProduct?.id;

      const url =
        mode === "edit"
          ? `${PRODUCTS_API}/${productId}`
          : PRODUCTS_API;

      const response = await apiFetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      await onSaved(response);

      onClose();
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Package className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {mode === "edit"
                    ? "Edit Product"
                    : "Create Product"}
                </h2>

                <p className="text-sm text-slate-500">
                  Manage product master, pricing and inventory.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div>{error}</div>
              </div>
            )}

            <div className="space-y-7">
              {/* BASIC */}

              <section>
                <SectionTitle
                  icon={<Package className="h-4 w-4" />}
                  title="Basic Information"
                  description="Core product identity and classification."
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Product Name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                    placeholder="Wireless Mouse Pro"
                  />

                  <Input
                    label="SKU"
                    required
                    value={form.sku}
                    onChange={(e) =>
                      updateField(
                        "sku",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="WM-001"
                  />

                  <Select
                    label="Product Type"
                    value={form.productType}
                    onChange={(e) =>
                      updateField(
                        "productType",
                        e.target.value
                      )
                    }
                    options={PRODUCT_TYPES}
                  />

                  <Input
                    label="Category"
                    value={form.category}
                    onChange={(e) =>
                      updateField(
                        "category",
                        e.target.value
                      )
                    }
                    placeholder="Electronics"
                  />

                  <Input
                    label="Subcategory"
                    value={form.subcategory}
                    onChange={(e) =>
                      updateField(
                        "subcategory",
                        e.target.value
                      )
                    }
                    placeholder="Computer Accessories"
                  />

                  <Input
                    label="Brand"
                    value={form.brand}
                    onChange={(e) =>
                      updateField("brand", e.target.value)
                    }
                    placeholder="TechPro"
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Textarea
                    label="Short Description"
                    value={form.shortDescription}
                    onChange={(e) =>
                      updateField(
                        "shortDescription",
                        e.target.value
                      )
                    }
                    placeholder="Short product description..."
                    rows={3}
                  />

                  <Textarea
                    label="Description"
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Detailed product description..."
                    rows={3}
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tags
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={(e) =>
                        setTagInput(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Type tag and press Enter"
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                      type="button"
                      onClick={addTag}
                      className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Add
                    </button>
                  </div>

                  {form.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}

                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-slate-400 hover:text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* BARCODE */}

              <section>
                <SectionTitle
                  icon={<Barcode className="h-4 w-4" />}
                  title="Barcode"
                  description="Barcode information for scanner and product lookup."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Barcode"
                    value={form.barcode}
                    onChange={(e) =>
                      updateField(
                        "barcode",
                        e.target.value
                      )
                    }
                    placeholder="8901234567890"
                  />

                  <Select
                    label="Barcode Type"
                    value={form.barcodeType}
                    onChange={(e) =>
                      updateField(
                        "barcodeType",
                        e.target.value
                      )
                    }
                    options={BARCODE_TYPES.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                  />
                </div>
              </section>

              {/* PRICING */}

              <section>
                <SectionTitle
                  icon={<DollarSign className="h-4 w-4" />}
                  title="Pricing & Tax"
                  description="Configure purchase, selling, MRP and GST."
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <NumberInput
                    label="Purchase Price"
                    value={form.purchasePrice}
                    onChange={(e) =>
                      updateField(
                        "purchasePrice",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Selling Price"
                    required
                    value={form.sellingPrice}
                    onChange={(e) =>
                      updateField(
                        "sellingPrice",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="MRP"
                    value={form.mrp}
                    onChange={(e) =>
                      updateField("mrp", e.target.value)
                    }
                  />

                  <Select
                    label="Tax Type"
                    value={form.taxType}
                    onChange={(e) =>
                      updateField(
                        "taxType",
                        e.target.value
                      )
                    }
                    options={TAX_TYPES}
                  />

                  <NumberInput
                    label="Tax Rate %"
                    value={form.taxRate}
                    onChange={(e) =>
                      updateField(
                        "taxRate",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="GST Rate %"
                    value={form.gstRate}
                    onChange={(e) =>
                      updateField(
                        "gstRate",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Discount %"
                    value={form.discountRate}
                    onChange={(e) =>
                      updateField(
                        "discountRate",
                        e.target.value
                      )
                    }
                  />

                  <Input
                    label="HSN / SAC Code"
                    value={form.hsnSacCode}
                    onChange={(e) =>
                      updateField(
                        "hsnSacCode",
                        e.target.value
                      )
                    }
                    placeholder="84716060"
                  />
                </div>
              </section>

              {/* INVENTORY */}

              <section>
                <SectionTitle
                  icon={<Layers3 className="h-4 w-4" />}
                  title="Inventory"
                  description="Configure stock tracking and thresholds."
                />

                <div className="mb-5 flex flex-wrap gap-3">
                  <Toggle
                    label="Track Inventory"
                    checked={form.trackInventory}
                    onChange={(value) =>
                      updateField(
                        "trackInventory",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="Batch Tracking"
                    checked={form.hasBatchTracking}
                    onChange={(value) =>
                      updateField(
                        "hasBatchTracking",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="Serial Tracking"
                    checked={form.hasSerialTracking}
                    onChange={(value) =>
                      updateField(
                        "hasSerialTracking",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="Expiry Tracking"
                    checked={form.hasExpiryTracking}
                    onChange={(value) =>
                      updateField(
                        "hasExpiryTracking",
                        value
                      )
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <NumberInput
                    label="Current Stock"
                    value={form.currentStock}
                    onChange={(e) =>
                      updateField(
                        "currentStock",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Opening Stock"
                    value={form.openingStock}
                    onChange={(e) =>
                      updateField(
                        "openingStock",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Reserved Stock"
                    value={form.reservedStock}
                    onChange={(e) =>
                      updateField(
                        "reservedStock",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Reorder Level"
                    value={form.reorderLevel}
                    onChange={(e) =>
                      updateField(
                        "reorderLevel",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Minimum Stock"
                    value={form.minimumStock}
                    onChange={(e) =>
                      updateField(
                        "minimumStock",
                        e.target.value
                      )
                    }
                  />

                  <NumberInput
                    label="Maximum Stock"
                    value={form.maximumStock}
                    onChange={(e) =>
                      updateField(
                        "maximumStock",
                        e.target.value
                      )
                    }
                  />

                  <Select
                    label="Inventory Tracking"
                    value={form.inventoryTracking}
                    onChange={(e) =>
                      updateField(
                        "inventoryTracking",
                        e.target.value
                      )
                    }
                    options={INVENTORY_TRACKING.map(
                      (item) => ({
                        value: item,
                        label:
                          item.charAt(0).toUpperCase() +
                          item.slice(1),
                      })
                    )}
                  />

                  <Select
                    label="Unit"
                    value={form.unit}
                    onChange={(e) =>
                      updateField(
                        "unit",
                        e.target.value
                      )
                    }
                    options={UNITS.map((item) => ({
                      value: item,
                      label:
                        item.charAt(0).toUpperCase() +
                        item.slice(1),
                    }))}
                  />
                </div>
              </section>

              {/* SUPPLIER */}

              <section>
                <SectionTitle
                  icon={<Box className="h-4 w-4" />}
                  title="Supplier & Location"
                  description="Supplier reference and storage information."
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Manufacturer"
                    value={form.manufacturer}
                    onChange={(e) =>
                      updateField(
                        "manufacturer",
                        e.target.value
                      )
                    }
                    placeholder="TechPro Industries"
                  />

                  <Input
                    label="Location"
                    value={form.location}
                    onChange={(e) =>
                      updateField(
                        "location",
                        e.target.value
                      )
                    }
                    placeholder="Rack A-01"
                  />

                  <Input
                    label="Currency"
                    value={form.currency}
                    onChange={(e) =>
                      updateField(
                        "currency",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="INR"
                  />
                </div>
              </section>

              {/* STATUS */}

              <section>
                <SectionTitle
                  icon={<Activity className="h-4 w-4" />}
                  title="Product Status"
                  description="Control product availability."
                />

                <div className="flex flex-wrap gap-3">
                  <Toggle
                    label="Active"
                    checked={form.isActive}
                    onChange={(value) =>
                      updateField("isActive", value)
                    }
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}

              {saving
                ? "Saving..."
                : mode === "edit"
                ? "Update Product"
                : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================================================
   VIEW PRODUCT MODAL
====================================================== */

function ProductViewModal({
  product,
  onClose,
  onEdit,
}) {
  if (!product) return null;

  const stock =
    product.stockSummary || {
      currentStock: product.currentStock || 0,
      reservedStock: product.reservedStock || 0,
      availableStock:
        Number(product.currentStock || 0) -
        Number(product.reservedStock || 0),
      reorderLevel: product.reorderLevel || 0,
      stockStatus: getStockStatus(product),
    };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-lg font-bold text-slate-600">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(product.name)
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {product.name}
                </h2>

                <StatusBadge product={product} />
              </div>

              <p className="mt-1 text-sm text-slate-500">
                SKU: {product.sku}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <InfoCard
              label="Selling Price"
              value={formatCurrency(
                product.sellingPrice,
                product.currency
              )}
              icon={<DollarSign className="h-4 w-4" />}
            />

            <InfoCard
              label="Current Stock"
              value={formatNumber(stock.currentStock)}
              icon={<Package className="h-4 w-4" />}
            />

            <InfoCard
              label="Available Stock"
              value={formatNumber(stock.availableStock)}
              icon={<Box className="h-4 w-4" />}
            />

            <InfoCard
              label="Reorder Level"
              value={formatNumber(stock.reorderLevel)}
              icon={<AlertCircle className="h-4 w-4" />}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <DetailSection title="Product Information">
              <DetailRow
                label="Product Type"
                value={product.productType}
              />

              <DetailRow
                label="Category"
                value={product.category || "—"}
              />

              <DetailRow
                label="Subcategory"
                value={product.subcategory || "—"}
              />

              <DetailRow
                label="Brand"
                value={product.brand || "—"}
              />

              <DetailRow
                label="Unit"
                value={product.unit || "—"}
              />

              <DetailRow
                label="Manufacturer"
                value={product.manufacturer || "—"}
              />
            </DetailSection>

            <DetailSection title="Barcode & SKU">
              <DetailRow
                label="SKU"
                value={product.sku}
              />

              <DetailRow
                label="Barcode"
                value={product.barcode || "—"}
              />

              <DetailRow
                label="Barcode Type"
                value={product.barcodeType || "—"}
              />

              <DetailRow
                label="HSN / SAC"
                value={product.hsnSacCode || "—"}
              />

              <DetailRow
                label="Tax"
                value={`${product.gstRate || 0}%`}
              />

              <DetailRow
                label="Discount"
                value={`${product.discountRate || 0}%`}
              />
            </DetailSection>

            <DetailSection title="Inventory">
              <DetailRow
                label="Current Stock"
                value={formatNumber(
                  stock.currentStock
                )}
              />

              <DetailRow
                label="Reserved Stock"
                value={formatNumber(
                  stock.reservedStock
                )}
              />

              <DetailRow
                label="Available Stock"
                value={formatNumber(
                  stock.availableStock
                )}
              />

              <DetailRow
                label="Reorder Level"
                value={formatNumber(
                  stock.reorderLevel
                )}
              />

              <DetailRow
                label="Tracking"
                value={
                  product.inventoryTracking || "quantity"
                }
              />

              <DetailRow
                label="Location"
                value={product.location || "—"}
              />
            </DetailSection>

            <DetailSection title="Pricing">
              <DetailRow
                label="Purchase Price"
                value={formatCurrency(
                  product.purchasePrice,
                  product.currency
                )}
              />

              <DetailRow
                label="Selling Price"
                value={formatCurrency(
                  product.sellingPrice,
                  product.currency
                )}
              />

              <DetailRow
                label="MRP"
                value={formatCurrency(
                  product.mrp,
                  product.currency
                )}
              />

              <DetailRow
                label="Tax Rate"
                value={`${product.taxRate || 0}%`}
              />

              <DetailRow
                label="GST Rate"
                value={`${product.gstRate || 0}%`}
              />

              <DetailRow
                label="Tax Type"
                value={product.taxType || "exclusive"}
              />
            </DetailSection>
          </div>

          {product.description && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                Description
              </h3>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {product.description}
              </p>
            </div>
          )}

          {Array.isArray(product.tags) &&
            product.tags.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-sm font-bold text-slate-900">
                  Tags
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>

            <button
              onClick={() => onEdit(product)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Edit3 className="h-4 w-4" />
              Edit Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   MAIN PRODUCTS COMPONENT
====================================================== */

export default function Products() {
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [stats, setStats] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);

  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);

  const [viewProduct, setViewProduct] = useState(null);

  const [actionProduct, setActionProduct] = useState(null);

  const [actionMenuId, setActionMenuId] = useState(null);

  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupType, setLookupType] = useState("barcode");
  const [lookupValue, setLookupValue] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const searchTimeout = useRef(null);

  /* ======================================================
     TOAST
  ====================================================== */

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

  /* ======================================================
   FETCH PRODUCTS
====================================================== */

const fetchProducts = useCallback(
  async ({
    silent = false,
    customPage = page,
  } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const params = new URLSearchParams();

      params.set("page", String(customPage));
      params.set("limit", String(limit));

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (category) {
        params.set("category", category);
      }

      if (brand) {
        params.set("brand", brand);
      }

      if (productType) {
        params.set("productType", productType);
      }

      /* ---------------- STATUS FILTER ---------------- */

      if (statusFilter === "active") {
        params.set("isActive", "true");
        params.set("isArchived", "false");
      }

      if (statusFilter === "inactive") {
        params.set("isActive", "false");
        params.set("isArchived", "false");
      }

      if (statusFilter === "archived") {
        params.set("isArchived", "true");
      }

      /* ---------------- STOCK FILTER ---------------- */

      if (stockFilter === "low") {
        params.set("lowStock", "true");
      }

      if (stockFilter === "out") {
        params.set("outOfStock", "true");
      }

      if (stockFilter === "in") {
        params.set("outOfStock", "false");
        params.set("lowStock", "false");
      }

      /* ---------------- SORT ---------------- */

      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      /* ---------------- API REQUEST ---------------- */

      const response = await apiFetch(
        `/products?${params.toString()}`
      );

      const data = response?.data;

      const list = Array.isArray(data)
        ? data
        : data?.products ||
          data?.items ||
          [];

      setProducts(list);

      setPagination(
        response?.pagination || {
          total: list.length,
          page: customPage,
          limit,
          totalPages: 1,
        }
      );
    } catch (err) {
      console.error(
        "Products fetch error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load products."
      );

      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [
    page,
    limit,
    search,
    category,
    brand,
    productType,
    statusFilter,
    stockFilter,
    sortBy,
    sortOrder,
  ]
);

  /* ======================================================
     FETCH STATS
  ====================================================== */

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch(
        `${PRODUCTS_API}/stats`
      );

      setStats(response?.data || null);
    } catch (err) {
      console.warn(
        "Product stats unavailable:",
        err.message
      );
    }
  }, []);

  /* ======================================================
     INITIAL LOAD
  ====================================================== */

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ======================================================
     SEARCH DEBOUNCE
  ====================================================== */

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 450);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchInput]);

  /* ======================================================
     REFRESH
  ====================================================== */

  const refreshAll = async () => {
    await Promise.all([
      fetchProducts({ silent: true }),
      fetchStats(),
    ]);

    showToast("Products refreshed.");
  };

  /* ======================================================
     OPEN CREATE
  ====================================================== */

  const openCreate = () => {
    setEditingProduct(null);
    setFormMode("create");
    setFormOpen(true);
  };

  /* ======================================================
     OPEN EDIT
  ====================================================== */

  const openEdit = async (product) => {
    try {
      const id = product?._id || product?.id;

      const response = await apiFetch(
        `${PRODUCTS_API}/${id}`
      );

      setEditingProduct(response?.data || product);
      setFormMode("edit");
      setFormOpen(true);
      setViewProduct(null);
    } catch (err) {
      showToast(
        err.message || "Unable to load product.",
        "error"
      );
    }
  };

  /* ======================================================
     SAVED
  ====================================================== */

  const handleSaved = async () => {
    await Promise.all([
      fetchProducts({ silent: true }),
      fetchStats(),
    ]);

    showToast(
      formMode === "edit"
        ? "Product updated successfully."
        : "Product created successfully."
    );
  };

  /* ======================================================
     STATUS UPDATE
  ====================================================== */

  const updateStatus = async (
    product,
    active
  ) => {
    try {
      const id = product?._id || product?.id;

      await apiFetch(
        `${PRODUCTS_API}/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: active,
          }),
        }
      );

      showToast(
        active
          ? "Product activated."
          : "Product deactivated."
      );

      await Promise.all([
        fetchProducts({ silent: true }),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        err.message || "Unable to update status.",
        "error"
      );
    }
  };

  /* ======================================================
     ARCHIVE
  ====================================================== */

  const archiveProduct = async (product) => {
    try {
      const id = product?._id || product?.id;

      await apiFetch(
        `${PRODUCTS_API}/${id}`,
        {
          method: "DELETE",
        }
      );

      showToast("Product archived.");

      await Promise.all([
        fetchProducts({ silent: true }),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        err.message || "Unable to archive product.",
        "error"
      );
    }
  };

  /* ======================================================
     RESTORE
  ====================================================== */

  const restoreProduct = async (product) => {
    try {
      const id = product?._id || product?.id;

      await apiFetch(
        `${PRODUCTS_API}/${id}/restore`,
        {
          method: "PATCH",
        }
      );

      showToast("Product restored.");

      await Promise.all([
        fetchProducts({ silent: true }),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        err.message || "Unable to restore product.",
        "error"
      );
    }
  };

  /* ======================================================
     PERMANENT DELETE
  ====================================================== */

  const permanentlyDelete = async (product) => {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const id = product?._id || product?.id;

      await apiFetch(
        `${PRODUCTS_API}/${id}/permanent`,
        {
          method: "DELETE",
        }
      );

      showToast(
        "Product permanently deleted."
      );

      await Promise.all([
        fetchProducts({ silent: true }),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        err.message ||
          "Unable to permanently delete product.",
        "error"
      );
    }
  };

  /* ======================================================
     BULK SELECT
  ====================================================== */

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const allSelected =
    products.length > 0 &&
    products.every((product) =>
      selectedIds.includes(
        product._id || product.id
      )
    );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      products.map(
        (product) => product._id || product.id
      )
    );
  };

  /* ======================================================
     BULK STATUS
  ====================================================== */

  const bulkStatus = async (active) => {
    if (selectedIds.length === 0) return;

    try {
      await apiFetch(
        `${PRODUCTS_API}/bulk/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            productIds: selectedIds,
            isActive: active,
          }),
        }
      );

      showToast(
        `${selectedIds.length} products updated.`
      );

      setSelectedIds([]);

      await Promise.all([
        fetchProducts({ silent: true }),
        fetchStats(),
      ]);
    } catch (err) {
      showToast(
        err.message ||
          "Unable to update selected products.",
        "error"
      );
    }
  };

  /* ======================================================
     LOOKUP
  ====================================================== */

  const performLookup = async (event) => {
    event?.preventDefault();

    if (!lookupValue.trim()) {
      showToast(
        `Enter a ${lookupType}.`,
        "error"
      );
      return;
    }

    setLookupLoading(true);

    try {
      const value =
        lookupType === "sku"
          ? lookupValue.trim().toUpperCase()
          : lookupValue.trim();

      const response = await apiFetch(
        `${PRODUCTS_API}/${lookupType}/${encodeURIComponent(
          value
        )}`
      );

      if (response?.data) {
        setViewProduct(response.data);
        setLookupOpen(false);
        setLookupValue("");
      } else {
        showToast(
          "Product not found.",
          "error"
        );
      }
    } catch (err) {
      showToast(
        err.message || "Product not found.",
        "error"
      );
    } finally {
      setLookupLoading(false);
    }
  };

  /* ======================================================
     FILTER OPTIONS
  ====================================================== */

  const categories = useMemo(() => {
    return [
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      ),
    ].sort();
  }, [products]);

  const brands = useMemo(() => {
    return [
      ...new Set(
        products
          .map((product) => product.brand)
          .filter(Boolean)
      ),
    ].sort();
  }, [products]);

  /* ======================================================
     PAGINATION
  ====================================================== */

  const totalPages =
    pagination?.totalPages ||
    Math.max(
      1,
      Math.ceil(
        Number(pagination?.total || 0) / limit
      )
    );

  const goToPage = (nextPage) => {
    const safePage = Math.min(
      Math.max(1, nextPage),
      totalPages
    );

    setPage(safePage);
  };

  /* ======================================================
     SORT
  ====================================================== */

  const changeSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }

    setPage(1);
  };

  /* ======================================================
     STATS FALLBACK
  ====================================================== */

  const visibleStats = useMemo(() => {
    const total =
      stats?.total ??
      stats?.totalProducts ??
      pagination?.total ??
      0;

    const active =
      stats?.active ??
      stats?.activeProducts ??
      products.filter(
        (product) =>
          product.isActive &&
          !product.isArchived
      ).length;

    const lowStock =
      stats?.lowStock ??
      stats?.lowStockProducts ??
      products.filter(
        (product) =>
          getStockStatus(product) ===
          "low_stock"
      ).length;

    const outOfStock =
      stats?.outOfStock ??
      stats?.outOfStockProducts ??
      products.filter(
        (product) =>
          getStockStatus(product) ===
          "out_of_stock"
      ).length;

    return {
      total,
      active,
      lowStock,
      outOfStock,
    };
  }, [stats, products, pagination]);

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* ==================================================
          TOP HEADER
      ================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <Package className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    Products
                  </h1>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Manage products, pricing, barcode and inventory.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLookupType("barcode");
                  setLookupOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Barcode className="h-4 w-4" />
                Lookup
              </button>

              <button
                type="button"
                onClick={refreshAll}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />

            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">
                Unable to load products
              </p>

              <p className="mt-1 text-sm text-rose-700">
                {error}
              </p>
            </div>

            <button
              onClick={() => fetchProducts()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Products"
            value={visibleStats.total}
            icon={<Package className="h-5 w-5" />}
            description="All product records"
          />

          <StatCard
            title="Active Products"
            value={visibleStats.active}
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            description="Currently available"
          />

          <StatCard
            title="Low Stock"
            value={visibleStats.lowStock}
            icon={
              <TrendingDown className="h-5 w-5" />
            }
            description="Needs replenishment"
          />

          <StatCard
            title="Out of Stock"
            value={visibleStats.outOfStock}
            icon={
              <AlertCircle className="h-5 w-5" />
            }
            description="Currently unavailable"
          />
        </div>

        {/* ==================================================
            TOOLBAR
        ================================================== */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
                placeholder="Search by product name, SKU, barcode, brand..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFilters((prev) => !prev)
              }
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                showFilters
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              <ChevronDown
                className={`h-4 w-4 transition ${
                  showFilters
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="createdAt">
                  Recently Added
                </option>
                <option value="updatedAt">
                  Recently Updated
                </option>
                <option value="name">
                  Product Name
                </option>
                <option value="sellingPrice">
                  Selling Price
                </option>
                <option value="purchasePrice">
                  Purchase Price
                </option>
                <option value="currentStock">
                  Current Stock
                </option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setSortOrder((prev) =>
                    prev === "asc"
                      ? "desc"
                      : "asc"
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Toggle sort direction"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* FILTER PANEL */}

          {showFilters && (
            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <FilterSelect
                  label="Category"
                  value={category}
                  onChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "",
                      label: "All Categories",
                    },
                    ...categories.map(
                      (item) => ({
                        value: item,
                        label: item,
                      })
                    ),
                  ]}
                />

                <FilterSelect
                  label="Brand"
                  value={brand}
                  onChange={(value) => {
                    setBrand(value);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "",
                      label: "All Brands",
                    },
                    ...brands.map(
                      (item) => ({
                        value: item,
                        label: item,
                      })
                    ),
                  ]}
                />

                <FilterSelect
                  label="Product Type"
                  value={productType}
                  onChange={(value) => {
                    setProductType(value);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "",
                      label: "All Types",
                    },
                    ...PRODUCT_TYPES,
                  ]}
                />

                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "",
                      label: "All Statuses",
                    },
                    {
                      value: "active",
                      label: "Active",
                    },
                    {
                      value: "inactive",
                      label: "Inactive",
                    },
                    {
                      value: "archived",
                      label: "Archived",
                    },
                  ]}
                />

                <FilterSelect
                  label="Stock"
                  value={stockFilter}
                  onChange={(value) => {
                    setStockFilter(value);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "",
                      label: "All Stock",
                    },
                    {
                      value: "in",
                      label: "In Stock",
                    },
                    {
                      value: "low",
                      label: "Low Stock",
                    },
                    {
                      value: "out",
                      label: "Out of Stock",
                    },
                  ]}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setBrand("");
                    setProductType("");
                    setStatusFilter("");
                    setStockFilter("");
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}

          {/* BULK TOOLBAR */}

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <span className="mr-2 text-sm font-semibold">
                {selectedIds.length} selected
              </span>

              <button
                onClick={() => bulkStatus(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Activate
              </button>

              <button
                onClick={() => bulkStatus(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                <XCircle className="h-3.5 w-3.5" />
                Deactivate
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="ml-auto rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ==================================================
            PRODUCT TABLE
        ================================================== */}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <LoadingState />
          ) : products.length === 0 ? (
            <EmptyState
              search={search}
              onCreate={openCreate}
              onClear={() => {
                setSearchInput("");
                setSearch("");
                setCategory("");
                setBrand("");
                setProductType("");
                setStatusFilter("");
                setStockFilter("");
                setPage(1);
              }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                        />
                      </th>

                      <th className="px-4 py-3 text-left">
                        <SortableHeader
                          label="Product"
                          field="name"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          onSort={changeSort}
                        />
                      </th>

                      <th className="px-4 py-3 text-left">
                        SKU / Barcode
                      </th>

                      <th className="px-4 py-3 text-left">
                        Category
                      </th>

                      <th className="px-4 py-3 text-left">
                        <SortableHeader
                          label="Price"
                          field="sellingPrice"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          onSort={changeSort}
                        />
                      </th>

                      <th className="px-4 py-3 text-left">
                        <SortableHeader
                          label="Stock"
                          field="currentStock"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          onSort={changeSort}
                        />
                      </th>

                      <th className="px-4 py-3 text-left">
                        Status
                      </th>

                      <th className="w-16 px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => {
                      const id =
                        product._id ||
                        product.id;

                      const selected =
                        selectedIds.includes(id);

                      return (
                        <tr
                          key={id}
                          className={`group transition hover:bg-slate-50 ${
                            selected
                              ? "bg-slate-50"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                toggleSelection(id)
                              }
                              className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(
                                    product.name
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewProduct(
                                      product
                                    )
                                  }
                                  className="block max-w-[260px] truncate text-sm font-bold text-slate-900 hover:text-slate-600"
                                >
                                  {product.name}
                                </button>

                                <div className="mt-1 flex items-center gap-2">
                                  {product.brand && (
                                    <span className="text-xs text-slate-500">
                                      {product.brand}
                                    </span>
                                  )}

                                  {product.productType && (
                                    <>
                                      <span className="text-slate-300">
                                        •
                                      </span>

                                      <span className="text-xs capitalize text-slate-400">
                                        {
                                          product.productType
                                        }
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">
                                  {product.sku}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard
                                      ?.writeText(
                                        product.sku
                                      );

                                    showToast(
                                      "SKU copied."
                                    );
                                  }}
                                  className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-slate-700"
                                >
                                  <Clipboard className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {product.barcode && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Barcode className="h-3.5 w-3.5" />

                                  <span className="font-mono">
                                    {product.barcode}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {product.category ||
                                  "—"}
                              </p>

                              {product.subcategory && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {
                                    product.subcategory
                                  }
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(
                                  product.sellingPrice,
                                  product.currency
                                )}
                              </p>

                              {product.mrp > 0 && (
                                <p className="mt-0.5 text-xs text-slate-400 line-through">
                                  {formatCurrency(
                                    product.mrp,
                                    product.currency
                                  )}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StockBadge
                              product={product}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              product={product}
                            />
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() =>
                                  setActionMenuId(
                                    actionMenuId ===
                                      id
                                      ? null
                                      : id
                                  )
                                }
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </button>

                              {actionMenuId ===
                                id && (
                                <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                                  <ActionItem
                                    icon={
                                      <Eye className="h-4 w-4" />
                                    }
                                    label="View Product"
                                    onClick={() => {
                                      setViewProduct(
                                        product
                                      );
                                      setActionMenuId(
                                        null
                                      );
                                    }}
                                  />

                                  <ActionItem
                                    icon={
                                      <Edit3 className="h-4 w-4" />
                                    }
                                    label="Edit Product"
                                    onClick={() => {
                                      setActionMenuId(
                                        null
                                      );
                                      openEdit(
                                        product
                                      );
                                    }}
                                  />

                                  {product.isArchived ? (
                                    <ActionItem
                                      icon={
                                        <ArchiveRestore className="h-4 w-4" />
                                      }
                                      label="Restore"
                                      onClick={() => {
                                        setActionMenuId(
                                          null
                                        );
                                        restoreProduct(
                                          product
                                        );
                                      }}
                                    />
                                  ) : (
                                    <>
                                      <ActionItem
                                        icon={
                                          product.isActive ? (
                                            <XCircle className="h-4 w-4" />
                                          ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                          )
                                        }
                                        label={
                                          product.isActive
                                            ? "Deactivate"
                                            : "Activate"
                                        }
                                        onClick={() => {
                                          setActionMenuId(
                                            null
                                          );
                                          updateStatus(
                                            product,
                                            !product.isActive
                                          );
                                        }}
                                      />

                                      <ActionItem
                                        icon={
                                          <Archive className="h-4 w-4" />
                                        }
                                        label="Archive"
                                        danger
                                        onClick={() => {
                                          setActionMenuId(
                                            null
                                          );
                                          archiveProduct(
                                            product
                                          );
                                        }}
                                      />
                                    </>
                                  )}

                                  {product.isArchived && (
                                    <ActionItem
                                      icon={
                                        <Trash2 className="h-4 w-4" />
                                      }
                                      label="Permanent Delete"
                                      danger
                                      onClick={() => {
                                        setActionMenuId(
                                          null
                                        );
                                        permanentlyDelete(
                                          product
                                        );
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {products.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {formatNumber(
                      pagination.total || 0
                    )}
                  </span>{" "}
                  products
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(
                        Number(e.target.value)
                      );
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 outline-none"
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

                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      goToPage(page - 1)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                    {page} / {totalPages}
                  </div>

                  <button
                    disabled={page >= totalPages}
                    onClick={() =>
                      goToPage(page + 1)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ==================================================
          PRODUCT FORM
      ================================================== */}

      <ProductFormModal
        open={formOpen}
        mode={formMode}
        initialProduct={editingProduct}
        onClose={() => {
          if (!loading) {
            setFormOpen(false);
          }
        }}
        onSaved={handleSaved}
      />

      {/* ==================================================
          PRODUCT VIEW
      ================================================== */}

      <ProductViewModal
        product={viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={openEdit}
      />

      {/* ==================================================
          LOOKUP MODAL
      ================================================== */}

      {lookupOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Barcode className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Product Lookup
                    </h2>

                    <p className="text-sm text-slate-500">
                      Find a product using SKU or barcode.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setLookupOpen(false);
                  setLookupValue("");
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={performLookup}
              className="p-6"
            >
              <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setLookupType("barcode")
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    lookupType === "barcode"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Barcode className="h-4 w-4" />
                    Barcode
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLookupType("sku")
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    lookupType === "sku"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    SKU
                  </span>
                </button>
              </div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {lookupType === "barcode"
                  ? "Barcode"
                  : "SKU"}
              </label>

              <div className="relative">
                <input
                  autoFocus
                  value={lookupValue}
                  onChange={(e) =>
                    setLookupValue(
                      e.target.value
                    )
                  }
                  placeholder={
                    lookupType === "barcode"
                      ? "8901234567890"
                      : "WM-001"
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 font-mono text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setLookupValue("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Barcode scanner input can be focused here and scanned directly.
              </p>

              <button
                type="submit"
                disabled={lookupLoading}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {lookupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}

                {lookupLoading
                  ? "Searching..."
                  : "Find Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          TOAST
      ================================================== */}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[200]">
          <div
            className={`flex min-w-[280px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-2xl ${
              toast.type === "error"
                ? "border-rose-200"
                : "border-emerald-200"
            }`}
          >
            {toast.type === "error" ? (
              <XCircle className="h-5 w-5 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}

            <p className="flex-1 text-sm font-semibold text-slate-700">
              {toast.message}
            </p>

            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   UI COMPONENTS
====================================================== */

function SectionTitle({
  icon,
  title,
  description,
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </span>

        {title}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Input({
  label,
  required,
  value,
  onChange,
  placeholder,
}) {
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

      <input
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function NumberInput({
  label,
  required,
  value,
  onChange,
}) {
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

      <input
        type="number"
        min="0"
        step="0.01"
        value={value ?? 0}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value ?? ""}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      >
        {options.map((option) => {
          const normalized =
            typeof option === "string"
              ? {
                  value: option,
                  label: option,
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
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
        checked
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked
            ? "bg-white/30"
            : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked
              ? "left-[18px]"
              : "left-0.5"
          }`}
        />
      </span>

      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {formatNumber(value)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <h3 className="mb-4 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      <span className="max-w-[60%] text-right text-sm font-semibold capitalize text-slate-700">
        {value}
      </span>
    </div>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
}) {
  const active = sortBy === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-900"
    >
      {label}

      {active &&
        (sortOrder === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        ))}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        Loading products...
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Fetching your product catalog
      </p>
    </div>
  );
}

function EmptyState({
  search,
  onCreate,
  onClear,
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
        <Package className="h-7 w-7 text-slate-400" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {search
          ? "No products found"
          : "No products yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {search
          ? "Try changing your search or clearing the active filters."
          : "Create your first product to start managing your catalog."}
      </p>

      <div className="mt-5 flex gap-2">
        {search && (
          <button
            onClick={onClear}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        )}

        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>
    </div>
  );
}