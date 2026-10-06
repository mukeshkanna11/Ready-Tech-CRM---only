import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  Edit3,
  FileText,
  History,
  Mail,
  MessageCircle,
  MessagesSquare,
  Paperclip,
  Phone,
  Plus,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import API from "../../services/api";

// Shared panel for Lead / Contact / Company details:
// interaction history, communication logs, notes & attachments.
// `recordType` is the link field used by the APIs: "lead" | "contact" | "company".

const COMM_TYPES = ["CALL", "EMAIL", "MEETING", "WHATSAPP", "DEMO", "FOLLOW_UP"];

const OUTCOMES = [
  "CONNECTED",
  "NO_RESPONSE",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "MEETING_SCHEDULED",
  "DEMO_SCHEDULED",
  "PROPOSAL_REQUESTED",
  "CONVERTED",
  "LOST",
  "OTHER",
];

const TYPE_ICONS = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  DEMO: Users,
  WHATSAPP: MessageCircle,
  FOLLOW_UP: CalendarClock,
  NOTE: StickyNote,
  TASK: FileText,
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

const errorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

const label = (value) => String(value || "").replaceAll("_", " ");

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

function toDateTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const TIMELINE_PATHS = {
  lead: (id) => [`/activities/lead/${id}`, `/tasks/lead/${id}`],
  contact: (id) => [`/activities/contact/${id}`, `/tasks/contact/${id}`],
  company: (id) => [`/activities/company/${id}`, `/tasks/company/${id}`],
};

// ======================================================
// HISTORY
// ======================================================

function HistoryTab({ activities, notes, tasks, followUpAt }) {
  const items = useMemo(() => {
    const list = [
      ...activities.map((a) => ({
        id: `a-${a._id}`,
        kind: a.type,
        title: a.subject,
        body: a.description || a.outcomeNotes,
        meta: [label(a.status), a.outcome && label(a.outcome)]
          .filter(Boolean)
          .join(" • "),
        date: a.completedAt || a.scheduledAt || a.createdAt,
      })),
      ...notes.map((n) => ({
        id: `n-${n._id}`,
        kind: "NOTE",
        title: `Note by ${n.author?.name || "user"}`,
        body: n.content,
        meta: n.attachments?.length
          ? `${n.attachments.length} attachment(s)`
          : "",
        date: n.createdAt,
      })),
      ...tasks.map((t) => ({
        id: `t-${t._id}`,
        kind: "TASK",
        title: t.title,
        body: t.description,
        meta: `Task • ${label(t.status)}`,
        date: t.completedAt || t.dueAt || t.createdAt,
      })),
    ];

    if (followUpAt) {
      list.push({
        id: "follow-up",
        kind: "FOLLOW_UP",
        title: "Next follow-up scheduled",
        meta: "Follow-up",
        date: followUpAt,
      });
    }

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [activities, notes, tasks, followUpAt]);

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        No interactions recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-6">
      {items.map((item) => {
        const Icon = TYPE_ICONS[item.kind] || History;
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
              <Icon size={13} />
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                <span className="mr-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {label(item.kind)}
                </span>
                {item.title}
              </p>
              <span className="text-xs text-slate-500">
                {formatDateTime(item.date)}
              </span>
            </div>
            {item.body && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                {item.body}
              </p>
            )}
            {item.meta && (
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ======================================================
// COMMUNICATIONS
// ======================================================

const emptyComm = () => ({
  type: "CALL",
  subject: "",
  description: "",
  outcome: "",
  durationMinutes: "",
  scheduledAt: toDateTimeInput(),
  status: "COMPLETED",
});

function CommunicationsTab({ recordType, recordId, activities, onChanged }) {
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const logs = activities.filter((a) => COMM_TYPES.includes(a.type));

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const openEdit = (activity) => {
    setEditingId(activity._id);
    setForm({
      type: activity.type,
      subject: activity.subject || "",
      description: activity.description || "",
      outcome: activity.outcome || "",
      durationMinutes: activity.durationMinutes ?? "",
      scheduledAt: toDateTimeInput(activity.scheduledAt || activity.createdAt),
      status: activity.status || "COMPLETED",
    });
  };

  const close = () => {
    setForm(null);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.subject.trim()) {
      setError("Subject is required");
      return;
    }

    const payload = {
      type: form.type,
      subject: form.subject.trim(),
      description: form.description.trim(),
      status: form.status,
      scheduledAt: form.scheduledAt
        ? new Date(form.scheduledAt).toISOString()
        : undefined,
      ...(form.outcome ? { outcome: form.outcome } : {}),
      ...(form.durationMinutes !== ""
        ? { durationMinutes: Number(form.durationMinutes) }
        : {}),
    };

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await API.put(`/activities/${editingId}`, payload);
      } else {
        await API.post("/activities", { ...payload, [recordType]: recordId });
      }
      close();
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "Unable to save communication"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity) => {
    if (!window.confirm(`Delete "${activity.subject}"?`)) return;
    try {
      setError("");
      await API.delete(`/activities/${activity._id}`);
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "Unable to delete communication"));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {form ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
            >
              {COMM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className={inputClass}
              value={form.scheduledAt}
              onChange={(e) => update("scheduledAt", e.target.value)}
            />
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Planned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <input
            className={inputClass}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Subject, e.g. Discussed pricing"
            maxLength={200}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Summary / details"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className={inputClass}
              value={form.outcome}
              onChange={(e) => update("outcome", e.target.value)}
            >
              <option value="">No outcome</option>
              {OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {label(outcome)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              max="1440"
              className={inputClass}
              value={form.durationMinutes}
              onChange={(e) => update("durationMinutes", e.target.value)}
              placeholder="Duration (minutes)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Saving..." : editingId ? "Update" : "Save Log"}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setForm(emptyComm())} className={primaryButton}>
          <Plus size={16} />
          Log Communication
        </button>
      )}

      {logs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No calls, emails, meetings or messages logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {logs.map((activity) => {
            const Icon = TYPE_ICONS[activity.type] || MessagesSquare;
            return (
              <li key={activity._id} className="flex gap-3 px-4 py-3">
                <Icon size={17} className="mt-0.5 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {activity.subject}
                  </p>
                  <p className="text-xs text-slate-500">
                    {label(activity.type)} •{" "}
                    {formatDateTime(activity.scheduledAt || activity.createdAt)}{" "}
                    • {label(activity.status)}
                    {activity.outcome && ` • ${label(activity.outcome)}`}
                    {activity.durationMinutes
                      ? ` • ${activity.durationMinutes} min`
                      : ""}
                  </p>
                  {activity.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {activity.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(activity)}
                  className="self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  title="Edit"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(activity)}
                  className="self-start rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ======================================================
// NOTES & ATTACHMENTS
// ======================================================

function NotesTab({ recordType, recordId, notes, onChanged }) {
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action, fallback) => {
    try {
      setBusy(true);
      setError("");
      await action();
      await onChanged();
      return true;
    } catch (err) {
      setError(errorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    const done = await run(
      () => API.post("/notes", { content: content.trim(), [recordType]: recordId }),
      "Unable to add note"
    );
    if (done) setContent("");
  };

  const handleUpdate = async (note) => {
    const done = await run(
      () => API.put(`/notes/${note._id}`, { content: editContent }),
      "Unable to update note"
    );
    if (done) setEditingId(null);
  };

  const handleDelete = (note) => {
    if (!window.confirm("Delete this note and its attachments?")) return;
    run(() => API.delete(`/notes/${note._id}`), "Unable to delete note");
  };

  const handleUpload = (note, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    run(
      () =>
        API.post(`/notes/${note._id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      "Unable to upload files"
    );
  };

  const handleDownload = async (note, attachment) => {
    try {
      setError("");
      const response = await API.get(
        `/notes/${note._id}/attachments/${attachment._id}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, "Unable to download file"));
    }
  };

  const handleRemoveAttachment = (note, attachment) => {
    if (!window.confirm(`Delete "${attachment.name}"?`)) return;
    run(
      () => API.delete(`/notes/${note._id}/attachments/${attachment._id}`),
      "Unable to delete file"
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-2">
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note..."
          maxLength={10000}
          disabled={busy}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className={primaryButton}
          >
            <Plus size={16} />
            Add Note
          </button>
        </div>
      </form>

      <p className="text-xs text-slate-500">
        Attachments: JPG, PNG, PDF, CSV, XLSX • max 5 MB per file
      </p>

      {notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No notes yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note._id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {note.author?.name || "User"} •{" "}
                  {formatDateTime(note.createdAt)}
                  {note.updatedAt !== note.createdAt && " • edited"}
                </p>
                <div className="flex shrink-0 gap-1">
                  <label
                    className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Attach files"
                  >
                    <Paperclip size={15} />
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.csv,.xlsx"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        handleUpload(note, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      setEditingId(note._id);
                      setEditContent(note.content);
                    }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Edit"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(note)}
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {editingId === note._id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className={secondaryButton}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(note)}
                      disabled={busy || !editContent.trim()}
                      className={primaryButton}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {note.content}
                </p>
              )}

              {note.attachments?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {note.attachments.map((attachment) => (
                    <li
                      key={attachment._id}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <Paperclip size={14} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {attachment.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatSize(attachment.size)}
                      </span>
                      <button
                        onClick={() => handleDownload(note, attachment)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveAttachment(note, attachment)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-white"
                        title="Delete file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ======================================================
// PANEL
// ======================================================

const TABS = [
  { key: "history", name: "History", icon: History },
  { key: "communications", name: "Communications", icon: MessagesSquare },
  { key: "notes", name: "Notes & Files", icon: StickyNote },
];

export default function RecordActivityPanel({ recordType, recordId, followUpAt }) {
  const [tab, setTab] = useState("history");
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Each source loads independently, so a missing permission
  // (e.g. TASKS) only hides that part of the history.
  const load = useCallback(() => {
    const [activityPath, taskPath] = TIMELINE_PATHS[recordType](recordId);
    return Promise.allSettled([
      API.get(activityPath),
      API.get(`/notes?${recordType}=${recordId}`),
      API.get(taskPath),
    ]).then(([activityResult, noteResult, taskResult]) => {
      const data = (result) =>
        result.status === "fulfilled" ? result.value.data?.data : null;
      setActivities(data(activityResult)?.activities || []);
      setNotes(Array.isArray(data(noteResult)) ? data(noteResult) : []);
      setTasks(data(taskResult)?.tasks || []);
      setLoading(false);
    });
  }, [recordType, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(({ key, name, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />
            {name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading...</p>
      ) : tab === "history" ? (
        <HistoryTab
          activities={activities}
          notes={notes}
          tasks={tasks}
          followUpAt={followUpAt}
        />
      ) : tab === "communications" ? (
        <CommunicationsTab
          recordType={recordType}
          recordId={recordId}
          activities={activities}
          onChanged={load}
        />
      ) : (
        <NotesTab
          recordType={recordType}
          recordId={recordId}
          notes={notes}
          onChanged={load}
        />
      )}
    </div>
  );
}
