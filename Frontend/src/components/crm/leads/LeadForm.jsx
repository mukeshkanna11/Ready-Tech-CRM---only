import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import toast from "react-hot-toast";
import leadService from "../../../services/crm/leadService";
import { LEAD_SOURCES, LEAD_STATUSES } from "../../../utils/constants";

const emptyForm = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  alternatePhone: "",
  companyName: "",
  gstin: "",
  panNumber: "",
  source: "OTHER",
  status: "NEW",
  value: 0,
  currency: "INR",
  expectedCloseDate: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  tags: "",
  notes: "",
  nextFollowUpAt: "",
};

export default function LeadForm({
  lead,
  onSuccess,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lead) {
      setForm(emptyForm);
      return;
    }

    setForm({
      ...emptyForm,
      ...lead,
      tags: Array.isArray(lead.tags)
        ? lead.tags.join(", ")
        : "",
      expectedCloseDate: lead.expectedCloseDate
        ? lead.expectedCloseDate.slice(0, 10)
        : "",
      nextFollowUpAt: lead.nextFollowUpAt
        ? lead.nextFollowUpAt.slice(0, 16)
        : "",
    });
  }, [lead]);

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Lead name is required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        designation: form.designation.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim(),
        companyName: form.companyName.trim(),
        gstin: form.gstin.trim(),
        panNumber: form.panNumber.trim(),
        source: form.source,
        status: form.status,
        value: Number(form.value || 0),
        currency: form.currency || "INR",
        expectedCloseDate:
          form.expectedCloseDate || null,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postalCode: form.postalCode.trim(),
        tags: form.tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        notes: form.notes.trim(),
        nextFollowUpAt:
          form.nextFollowUpAt || null,
      };

      if (lead?._id) {
        await leadService.update(lead._id, payload);
        toast.success("Lead updated successfully");
      } else {
        await leadService.create(payload);
        toast.success("Lead created successfully");
      }

      onSuccess();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save lead"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

  return (
    <form onSubmit={submit} className="space-y-6">

      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
          Basic Information
        </h3>

        <div className="grid gap-4 md:grid-cols-2">

          <Field label="Lead Name *">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) =>
                update("name", e.target.value)
              }
              placeholder="ABC Technologies"
            />
          </Field>

          <Field label="Designation">
            <input
              className={inputClass}
              value={form.designation}
              onChange={(e) =>
                update("designation", e.target.value)
              }
              placeholder="Managing Director"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) =>
                update("email", e.target.value)
              }
              placeholder="contact@example.com"
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) =>
                update("phone", e.target.value)
              }
              placeholder="9876543210"
            />
          </Field>

          <Field label="Alternate Phone">
            <input
              className={inputClass}
              value={form.alternatePhone}
              onChange={(e) =>
                update("alternatePhone", e.target.value)
              }
            />
          </Field>

          <Field label="Company Name">
            <input
              className={inputClass}
              value={form.companyName}
              onChange={(e) =>
                update("companyName", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
          Sales Information
        </h3>

        <div className="grid gap-4 md:grid-cols-3">

          <Field label="Source">
            <select
              className={inputClass}
              value={form.source}
              onChange={(e) =>
                update("source", e.target.value)
              }
            >
              {LEAD_SOURCES.map((source) => (
                <option key={source}>{source}</option>
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
              {LEAD_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>

          <Field label="Value">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.value}
              onChange={(e) =>
                update("value", e.target.value)
              }
            />
          </Field>

          <Field label="Expected Close">
            <input
              type="date"
              className={inputClass}
              value={form.expectedCloseDate}
              onChange={(e) =>
                update(
                  "expectedCloseDate",
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
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) =>
                update("tags", e.target.value)
              }
              placeholder="HOT, VIP, B2B"
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
          Business Information
        </h3>

        <div className="grid gap-4 md:grid-cols-2">

          <Field label="GSTIN">
            <input
              className={inputClass}
              value={form.gstin}
              onChange={(e) =>
                update("gstin", e.target.value)
              }
            />
          </Field>

          <Field label="PAN">
            <input
              className={inputClass}
              value={form.panNumber}
              onChange={(e) =>
                update("panNumber", e.target.value)
              }
            />
          </Field>

          <Field label="Address">
            <textarea
              className={inputClass}
              rows="3"
              value={form.address}
              onChange={(e) =>
                update("address", e.target.value)
              }
            />
          </Field>

          <Field label="Notes">
            <textarea
              className={inputClass}
              rows="3"
              value={form.notes}
              onChange={(e) =>
                update("notes", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <X size={17} className="mr-2 inline" />
          Cancel
        </button>

        <button
          disabled={loading}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 hover:bg-indigo-600 disabled:opacity-50"
        >
          <Save size={17} className="mr-2 inline" />
          {loading
            ? "Saving..."
            : lead
              ? "Update Lead"
              : "Create Lead"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}