import { useState } from "react";
import { UserCheck } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

// Form body for PATCH /leads/:id/assign. Rendered inside the Leads page Modal.
export default function AssignLeadModal({
  lead,
  users = [],
  usersError = "",
  onSubmit,
  onCancel,
}) {
  const [userId, setUserId] = useState(
    lead?.assignedTo?._id || lead?.assignedTo || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId) {
      setError("Please select a user");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit(userId);
    } catch (err) {
      setError(err.message || "Unable to assign lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {(error || usersError) && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error || usersError}
        </div>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Assign To <span className="text-rose-500">*</span>
        </span>
        <select
          className={inputClass}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={saving}
        >
          <option value="">Select user</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.name}
              {user.email ? ` (${user.email})` : ""}
            </option>
          ))}
        </select>
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
          <UserCheck size={17} />
          {saving ? "Assigning..." : "Assign Lead"}
        </button>
      </div>
    </form>
  );
}
