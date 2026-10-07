import { useEffect, useState } from "react";
import {
  CalendarPlus,
  Gauge,
  Lightbulb,
  ListChecks,
  Mail,
  NotebookPen,
  Send,
  Sparkles,
} from "lucide-react";
import API from "../../services/api";

// AI tools for a Lead / Contact / Company record.
// Every AI call is triggered by a button; nothing is saved,
// sent or created until the user confirms the result.

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";
const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

const errorMessage = (err) => err?.response?.data?.message || err?.message || "AI request failed";
const label = (value) => String(value || "").replaceAll("_", " ");
const dueDate = (days) => new Date(Date.now() + Number(days || 0) * 86_400_000).toISOString();

const TONE_BADGE = {
  HOT: "badge-red", WARM: "badge-amber", COLD: "badge-blue", UNQUALIFIED: "badge-slate",
  STRONG: "badge-green", STABLE: "badge-blue", AT_RISK: "badge-red", UNKNOWN: "badge-slate",
  POSITIVE: "badge-green", NEUTRAL: "badge-slate", NEGATIVE: "badge-red",
  A: "badge-green", B: "badge-blue", C: "badge-amber", D: "badge-red",
};

// One AI request with loading/error/result state.
function useAI() {
  const [state, setState] = useState({ loading: false, error: "", data: null });
  const run = async (request) => {
    setState({ loading: true, error: "", data: null });
    try {
      const response = await request();
      setState({ loading: false, error: "", data: response.data?.data ?? null });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), data: null });
    }
  };
  return [state, run, (data) => setState((s) => ({ ...s, data }))];
}

function Section({ icon: Icon, title, hint, action, state, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon size={17} className="mt-0.5 text-brand-600" />
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
        </div>
        {action}
      </div>
      {state?.loading && (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      )}
      {state?.error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {children}
    </div>
  );
}

const Bullets = ({ title, items }) =>
  items?.length ? (
    <div>
      <p className="eyebrow mb-1">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  ) : null;

const Badge = ({ value }) => <span className={`badge ${TONE_BADGE[value] || "badge-slate"}`}>{label(value)}</span>;

const GenerateButton = ({ onClick, loading, children = "Generate" }) => (
  <button type="button" onClick={onClick} disabled={loading} className={secondaryButton}>
    <Sparkles size={14} /> {loading ? "Thinking…" : children}
  </button>
);

// Checklist of suggested tasks -> creates only the ticked ones.
function TaskPicker({ items, recordType, recordId, onDone, notify }) {
  const [picked, setPicked] = useState(() => items.map(() => true));
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const chosen = items.filter((_, i) => picked[i]);
    if (!chosen.length || !window.confirm(`Create ${chosen.length} task(s)?`)) return;
    setSaving(true);
    try {
      for (const item of chosen) {
        await API.post("/tasks", {
          title: item.title,
          description: item.reason || "Suggested by AI",
          dueAt: dueDate(item.dueInDays),
          [recordType]: recordId,
        });
      }
      notify(`${chosen.length} task(s) created`);
      onDone();
    } catch (err) {
      notify(errorMessage(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <label key={i} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 p-2 text-sm hover:bg-slate-50">
          <input type="checkbox" className="mt-1" checked={picked[i]} onChange={() => setPicked((p) => p.map((v, j) => (j === i ? !v : v)))} />
          <span>
            <span className="font-medium text-slate-900">{item.title}</span>
            <span className="text-slate-500"> · in {item.dueInDays} day(s){item.channel ? ` · ${label(item.channel)}` : ""}</span>
            {item.reason && <span className="block text-xs text-slate-500">{item.reason}</span>}
          </span>
        </label>
      ))}
      <button type="button" onClick={create} disabled={saving} className={primaryButton}>
        <CalendarPlus size={15} /> {saving ? "Creating…" : "Create selected tasks"}
      </button>
    </div>
  );
}

export default function AIPanel({ recordType, recordId, onChanged }) {
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState(null);
  const base = `/ai/records/${recordType}/${recordId}`;
  const isLead = recordType === "lead";

  const [insights, runInsights] = useAI();
  const [qualify, runQualify] = useAI();
  const [score, runScore] = useAI();
  const [followUps, runFollowUps, setFollowUps] = useAI();
  const [summary, runSummary, setSummary] = useAI();
  const [draft, runDraft, setDraft] = useAI();

  const [draftForm, setDraftForm] = useState({ channel: "EMAIL", tone: "FRIENDLY", purpose: "" });
  const [meetingNotes, setMeetingNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Configuration check only - no AI call.
  useEffect(() => {
    API.get("/ai/status")
      .then((res) => setStatus(res.data?.data || { configured: false }))
      .catch(() => setStatus({ configured: false }));
  }, []);

  const notify = (message, error = false) => {
    setNotice({ message, error });
    window.setTimeout(() => setNotice(null), 4000);
  };

  // Shared confirm -> request -> feedback for save/send actions.
  const confirmAndRun = async (question, request, success) => {
    if (!window.confirm(question)) return false;
    setBusy(true);
    try {
      await request();
      notify(success);
      onChanged?.();
      return true;
    } catch (err) {
      notify(errorMessage(err), true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveNote = (content) =>
    confirmAndRun("Save this AI result as a note on the record?", () => API.post("/notes", { content, [recordType]: recordId }), "Saved to notes");

  if (!status) return <p className="py-6 text-center text-sm text-slate-500">Loading…</p>;

  if (!status.configured) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
        AI features are not configured. Ask an administrator to set <code>ANTHROPIC_API_KEY</code> on the server.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p className={`rounded-lg px-3 py-2 text-sm ${notice.error ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {notice.message}
        </p>
      )}

      {/* Customer insights */}
      <Section
        icon={Lightbulb}
        title="Customer Insights"
        hint="Health, risks and opportunities from this record's history."
        state={insights}
        action={<GenerateButton loading={insights.loading} onClick={() => runInsights(() => API.post(`${base}/insights`))} />}
      >
        {insights.data && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2"><Badge value={insights.data.health} /></div>
            <p className="text-sm text-slate-700">{insights.data.summary}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Bullets title="Opportunities" items={insights.data.opportunities} />
              <Bullets title="Risks" items={insights.data.risks} />
              <Bullets title="Recommended" items={insights.data.recommendedActions} />
            </div>
          </div>
        )}
      </Section>

      {isLead && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Lead qualification */}
          <Section
            icon={ListChecks}
            title="Lead Qualification"
            hint="Suggested status with reasons."
            state={qualify}
            action={<GenerateButton loading={qualify.loading} onClick={() => runQualify(() => API.post(`/ai/leads/${recordId}/qualify`))}>Qualify</GenerateButton>}
          >
            {qualify.data && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge value={qualify.data.qualification} />
                  <span className="text-sm text-slate-600">Suggested status: <b>{label(qualify.data.suggestedStatus)}</b></span>
                </div>
                <Bullets title="Reasons" items={qualify.data.reasons} />
                <Bullets title="Missing info" items={qualify.data.missingInfo} />
                {qualify.data.nextStep && <p className="text-sm text-slate-700"><b>Next step:</b> {qualify.data.nextStep}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || qualify.data.suggestedStatus === "LOST"}
                    title={qualify.data.suggestedStatus === "LOST" ? "Mark lost from the lead form (needs a reason)" : ""}
                    onClick={() =>
                      confirmAndRun(
                        `Change lead status to ${label(qualify.data.suggestedStatus)}?`,
                        () => API.patch(`/leads/${recordId}/status`, { status: qualify.data.suggestedStatus }),
                        "Lead status updated",
                      )
                    }
                    className={primaryButton}
                  >
                    Apply status
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      saveNote(`AI qualification: ${qualify.data.qualification} (suggested ${qualify.data.suggestedStatus}).\nReasons: ${qualify.data.reasons.join("; ")}\nNext step: ${qualify.data.nextStep}`)
                    }
                    className={secondaryButton}
                  >
                    Save as note
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Lead scoring */}
          <Section
            icon={Gauge}
            title="Lead Score"
            hint="0–100 likelihood to convert."
            state={score}
            action={<GenerateButton loading={score.loading} onClick={() => runScore(() => API.post(`/ai/leads/${recordId}/score`))}>Score</GenerateButton>}
          >
            {score.data && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-slate-900">{score.data.score}</span>
                  <Badge value={score.data.grade} />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${score.data.score}%` }} />
                </div>
                <p className="text-sm text-slate-700">{score.data.summary}</p>
                <ul className="space-y-1 text-sm">
                  {score.data.factors.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge value={f.impact} /> <span className="text-slate-700">{f.factor}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveNote(`AI lead score: ${score.data.score}/100 (grade ${score.data.grade}). ${score.data.summary}`)}
                  className={secondaryButton}
                >
                  Save as note
                </button>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Message drafting */}
      <Section icon={Mail} title="Draft Email / WhatsApp" hint="AI writes a draft; you review, edit and confirm before sending." state={draft}>
        <div className="mt-3 grid gap-2 sm:grid-cols-[140px_140px_1fr_auto]">
          <select className={inputClass} value={draftForm.channel} onChange={(e) => setDraftForm({ ...draftForm, channel: e.target.value })}>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <select className={inputClass} value={draftForm.tone} onChange={(e) => setDraftForm({ ...draftForm, tone: e.target.value })}>
            {["FRIENDLY", "FORMAL", "CONCISE", "PERSUASIVE"].map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
          <input
            className={inputClass}
            maxLength={300}
            placeholder="Purpose, e.g. follow up on yesterday's demo"
            value={draftForm.purpose}
            onChange={(e) => setDraftForm({ ...draftForm, purpose: e.target.value })}
          />
          <GenerateButton loading={draft.loading} onClick={() => draftForm.purpose.trim() && runDraft(() => API.post(`${base}/draft`, draftForm))}>Draft</GenerateButton>
        </div>
        {draft.data && (
          <div className="mt-3 space-y-2">
            {draft.data.channel === "EMAIL" && (
              <input className={inputClass} value={draft.data.subject} onChange={(e) => setDraft({ ...draft.data, subject: e.target.value })} />
            )}
            <textarea className={`${inputClass} min-h-[140px]`} value={draft.data.body} onChange={(e) => setDraft({ ...draft.data, body: e.target.value })} />
            <p className="text-xs text-slate-500">{"{{firstName}}"}, {"{{company}}"} and {"{{senderName}}"} are filled in automatically when sent.</p>
            {draft.data.canSend ? (
              <button
                type="button"
                disabled={busy || !draft.data.body.trim()}
                onClick={async () => {
                  const ok = await confirmAndRun(
                    `Send this ${draft.data.channel === "EMAIL" ? "email" : "WhatsApp message"} now?`,
                    () => API.post(`${base}/send`, { channel: draft.data.channel, subject: draft.data.subject, body: draft.data.body }),
                    "Message sent and logged",
                  );
                  if (ok) setDraft(null);
                }}
                className={primaryButton}
              >
                <Send size={15} /> Send {draft.data.channel === "EMAIL" ? "email" : "WhatsApp"}
              </button>
            ) : (
              <p className="text-sm text-amber-700">This record has no {draft.data.channel === "EMAIL" ? "email address" : "phone number"}; copy the draft instead.</p>
            )}
          </div>
        )}
      </Section>

      {/* Meeting / call summary */}
      <Section icon={NotebookPen} title="Meeting / Call Summary" hint="Paste rough notes or a transcript; save the summary as an activity." state={summary}>
        <textarea
          className={`${inputClass} mt-3 min-h-[100px]`}
          maxLength={8000}
          placeholder="Paste meeting or call notes…"
          value={meetingNotes}
          onChange={(e) => setMeetingNotes(e.target.value)}
        />
        <div className="mt-2">
          <GenerateButton loading={summary.loading} onClick={() => meetingNotes.trim() && runSummary(() => API.post(`${base}/summarize`, { notes: meetingNotes }))}>Summarize</GenerateButton>
        </div>
        {summary.data && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2"><Badge value={summary.data.sentiment} /></div>
            <p className="text-sm text-slate-700">{summary.data.summary}</p>
            <Bullets title="Key points" items={summary.data.keyPoints} />
            {["MEETING", "CALL"].map((type) => (
              <button
                key={type}
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await confirmAndRun(
                    `Save this summary as a completed ${label(type).toLowerCase()} activity?`,
                    () =>
                      API.post("/activities", {
                        type,
                        subject: `${type === "CALL" ? "Call" : "Meeting"} summary`,
                        description: `${summary.data.summary}\n\nKey points:\n- ${summary.data.keyPoints.join("\n- ")}`,
                        status: "COMPLETED",
                        scheduledAt: new Date().toISOString(),
                        [recordType]: recordId,
                      }),
                    "Summary saved to activities",
                  );
                  if (ok) setMeetingNotes("");
                }}
                className={`${secondaryButton} mr-2`}
              >
                Save as {label(type).toLowerCase()}
              </button>
            ))}
            {summary.data.actionItems.length > 0 && (
              <div>
                <p className="eyebrow mb-1">Action items</p>
                <TaskPicker items={summary.data.actionItems} recordType={recordType} recordId={recordId} notify={notify} onDone={() => { setSummary({ ...summary.data, actionItems: [] }); onChanged?.(); }} />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Follow-up suggestions */}
      <Section
        icon={CalendarPlus}
        title="Follow-up Suggestions"
        hint="Next touches based on status and recent activity."
        state={followUps}
        action={<GenerateButton loading={followUps.loading} onClick={() => runFollowUps(() => API.post(`${base}/follow-ups`))}>Suggest</GenerateButton>}
      >
        {followUps.data && (
          <div className="mt-3">
            {followUps.data.suggestions.length ? (
              <TaskPicker items={followUps.data.suggestions} recordType={recordType} recordId={recordId} notify={notify} onDone={() => { setFollowUps(null); onChanged?.(); }} />
            ) : (
              <p className="text-sm text-slate-500">No follow-ups suggested right now.</p>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
