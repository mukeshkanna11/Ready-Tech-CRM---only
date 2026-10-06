import { useState } from "react";
import { Clock3 } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

function toDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

// Form body for PATCH /leads/:id/follow-up. Rendered inside the Leads page Modal.
export default function FollowUpModal({ lead, onSubmit, onCancel }) {
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    toDateTimeInput(lead?.nextFollowUpAt)
  );
  const [markContacted, setMarkContacted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      // Empty value clears the scheduled follow-up.
      nextFollowUpAt: nextFollowUpAt
        ? new Date(nextFollowUpAt).toISOString()
        : null,
    };

    if (markContacted) {
      payload.lastContactAt = new Date().toISOString();
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Unable to update follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Next Follow-up
        </span>
        <input
          type="datetime-local"
          className={inputClass}
          value={nextFollowUpAt}
          onChange={(e) => setNextFollowUpAt(e.target.value)}
          disabled={saving}
        />
        <span className="mt-1.5 block text-xs text-slate-500">
          Leave empty to clear the scheduled follow-up.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={markContacted}
          onChange={(e) => setMarkContacted(e.target.checked)}
          disabled={saving}
        />
        Mark as contacted now
      </label>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Clock3 size={17} />
          {saving ? "Saving..." : "Save Follow-up"}
        </button>
      </div>
    </form>
  );
}
