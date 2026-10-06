import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import API from "../services/api";

// Calendar events are Activities (GET /activities/calendar, CRUD on /activities).

const EVENT_TYPES = [
  "MEETING",
  "CALL",
  "DEMO",
  "FOLLOW_UP",
  "EMAIL",
  "WHATSAPP",
  "SMS",
  "TASK",
  "OTHER",
];
const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At start time" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_COLORS = {
  MEETING: "bg-violet-100 text-violet-800",
  CALL: "bg-cyan-100 text-cyan-800",
  DEMO: "bg-indigo-100 text-indigo-800",
  FOLLOW_UP: "bg-amber-100 text-amber-800",
  EMAIL: "bg-blue-100 text-blue-800",
  WHATSAPP: "bg-emerald-100 text-emerald-800",
  SMS: "bg-teal-100 text-teal-800",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

const label = (value) => String(value || "").replaceAll("_", " ");
const errorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

const toList = (response) => {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  return Object.values(data || {}).find(Array.isArray) || [];
};

const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const refId = (value) => value?._id || value || "";

function emptyEvent(date) {
  const start = new Date(date);
  start.setHours(10, 0, 0, 0);
  return {
    type: "MEETING",
    subject: "",
    description: "",
    scheduledAt: toDateTimeInput(start),
    durationMinutes: "30",
    status: "PENDING",
    priority: "MEDIUM",
    location: "",
    meetingLink: "",
    assignedTo: "",
    lead: "",
    contact: "",
    opportunity: "",
    reminder: "15",
  };
}

function eventToForm(event) {
  let reminder = "";
  if (event.reminderEnabled && event.reminderAt && event.scheduledAt) {
    const minutes = Math.round(
      (new Date(event.scheduledAt) - new Date(event.reminderAt)) / 60000
    );
    reminder = REMINDER_OPTIONS.some((o) => o.value === String(minutes))
      ? String(minutes)
      : "15";
  }
  return {
    type: event.type,
    subject: event.subject || "",
    description: event.description || "",
    scheduledAt: toDateTimeInput(event.scheduledAt),
    durationMinutes: event.durationMinutes ?? "",
    status: event.status || "PENDING",
    priority: event.priority || "MEDIUM",
    location: event.location || "",
    meetingLink: event.meetingLink || "",
    assignedTo: refId(event.assignedTo),
    lead: refId(event.lead),
    contact: refId(event.contact),
    opportunity: refId(event.opportunity),
    reminder,
  };
}

function Field({ label: text, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {text}
      </span>
      {children}
    </label>
  );
}

function EventModal({ event, initialDate, lookups, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    event ? eventToForm(event) : emptyEvent(initialDate)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.subject.trim()) return setError("Title is required");
    if (!form.scheduledAt) return setError("Date and time are required");

    const start = new Date(form.scheduledAt);
    const payload = {
      type: form.type,
      subject: form.subject.trim(),
      description: form.description.trim(),
      scheduledAt: start.toISOString(),
      status: form.status,
      priority: form.priority,
      location: form.location.trim(),
      meetingLink: form.meetingLink.trim(),
      reminderEnabled: form.reminder !== "",
      reminderAt:
        form.reminder !== ""
          ? new Date(start.getTime() - Number(form.reminder) * 60000).toISOString()
          : null,
      lead: form.lead || null,
      contact: form.contact || null,
      opportunity: form.opportunity || null,
      ...(form.durationMinutes !== ""
        ? { durationMinutes: Number(form.durationMinutes) }
        : {}),
      ...(form.assignedTo ? { assignedTo: form.assignedTo } : {}),
    };

    try {
      setSaving(true);
      setError("");
      if (event) {
        await API.put(`/activities/${event._id}`, payload);
      } else {
        await API.post("/activities", payload);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Unable to save event"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${event.subject}"?`)) return;
    try {
      setSaving(true);
      await API.delete(`/activities/${event._id}`);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Unable to delete event"));
      setSaving(false);
    }
  };

  const select = (field, options, getLabel, placeholder) => (
    <select
      className={inputClass}
      value={form[field]}
      onChange={(e) => update(field, e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option._id} value={option._id}>
          {getLabel(option)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[var(--shadow-overlay)]">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">
            {event ? "Edit Event" : "New Event"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-90px)] space-y-4 overflow-y-auto p-6"
        >
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <Field label="Title *">
            <input
              className={inputClass}
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="e.g. Product demo with Acme"
              maxLength={200}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {label(type)}
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
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {label(priority)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date & time *">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.scheduledAt}
                onChange={(e) => update("scheduledAt", e.target.value)}
              />
            </Field>
            <Field label="Duration (min)">
              <input
                type="number"
                min="0"
                max="1440"
                className={inputClass}
                value={form.durationMinutes}
                onChange={(e) => update("durationMinutes", e.target.value)}
              />
            </Field>
            <Field label="Reminder">
              <select
                className={inputClass}
                value={form.reminder}
                onChange={(e) => update("reminder", e.target.value)}
              >
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location">
              <input
                className={inputClass}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </Field>
            <Field label="Meeting link">
              <input
                className={inputClass}
                value={form.meetingLink}
                onChange={(e) => update("meetingLink", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assigned to">
              {select("assignedTo", lookups.users, (u) => u.name, "Me")}
            </Field>
            <Field label="Lead">
              {select("lead", lookups.leads, (l) => l.name, "None")}
            </Field>
            <Field label="Contact">
              {select(
                "contact",
                lookups.contacts,
                (c) => [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email,
                "None"
              )}
            </Field>
            <Field label="Deal / Opportunity">
              {select("opportunity", lookups.opportunities, (o) => o.name, "None")}
            </Field>
          </div>

          <div className="flex justify-between gap-3 border-t border-slate-200 pt-5">
            <div>
              {event && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : event ? "Update Event" : "Create Event"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [lookups, setLookups] = useState({
    users: [],
    leads: [],
    contacts: [],
    opportunities: [],
  });

  // 6-week grid starting on the Sunday before the 1st.
  const days = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [month]);

  const load = useCallback(() => {
    const from = dayKey(days[0]);
    const to = dayKey(days[days.length - 1]);
    return API.get(`/activities/calendar?from=${from}&to=${to}`)
      .then((response) => {
        setEvents(response.data?.data?.activities || []);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, "Unable to load calendar")))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  // Lookups are optional: a missing permission only empties that dropdown.
  useEffect(() => {
    Promise.allSettled([
      API.get("/users?limit=100&isActive=true"),
      API.get("/leads?limit=100"),
      API.get("/contacts?limit=100"),
      API.get("/opportunities?limit=100"),
    ]).then(([users, leads, contacts, opportunities]) => {
      const list = (result) =>
        result.status === "fulfilled" ? toList(result.value) : [];
      setLookups({
        users: list(users),
        leads: list(leads),
        contacts: list(contacts),
        opportunities: list(opportunities),
      });
    });
  }, []);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const key = dayKey(new Date(event.scheduledAt));
      (map[key] = map[key] || []).push(event);
    });
    return map;
  }, [events]);

  const todayKey = dayKey(new Date());
  const shiftMonth = (delta) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calendar</h1>
              <p className="text-sm text-slate-400">
                Meetings, calls, demos and follow-ups
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="rounded-xl border border-white/10 bg-white/10 p-3 transition hover:bg-white/15"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-[150px] text-center text-sm font-semibold">
              {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="rounded-xl border border-white/10 bg-white/10 p-3 transition hover:bg-white/15"
            >
              <ChevronRight size={17} />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
            >
              Today
            </button>
            <button
              onClick={load}
              className="rounded-xl border border-white/10 bg-white/10 p-3 transition hover:bg-white/15"
            >
              <RefreshCw size={17} />
            </button>
            <button
              onClick={() => setModal({ date: new Date() })}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              <Plus size={18} />
              New Event
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-center text-xs font-bold uppercase text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dayKey(day);
            const inMonth = day.getMonth() === month.getMonth();
            const dayEvents = eventsByDay[key] || [];
            return (
              <div
                key={key}
                onClick={() => setModal({ date: day })}
                className={`min-h-[110px] cursor-pointer border-b border-r border-slate-100 p-2 transition hover:bg-slate-50 ${
                  inMonth ? "bg-white" : "bg-slate-50/60"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    key === todayKey
                      ? "bg-slate-900 text-white"
                      : inMonth
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ event });
                      }}
                      className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold ${
                        TYPE_COLORS[event.type] || "bg-slate-100 text-slate-700"
                      } ${event.status === "CANCELLED" ? "line-through opacity-60" : ""}`}
                      title={event.subject}
                    >
                      {new Date(event.scheduledAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {event.subject}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="px-1.5 text-[11px] font-semibold text-slate-500">
                      +{dayEvents.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {loading && (
          <p className="p-4 text-center text-sm text-slate-500">Loading...</p>
        )}
      </section>

      {modal && (
        <EventModal
          event={modal.event}
          initialDate={modal.date}
          lookups={lookups}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
