import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import API from "../../services/api";

// Floating AI Sales Assistant. Answers questions about the
// pipeline; only calls the AI when the user asks a question.

const EXAMPLES = [
  "Which deals should I focus on this week?",
  "Where is my pipeline leaking?",
  "How can I improve my lead conversion?",
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (text = question) => {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/ai/assistant", { question: q });
      setHistory((h) => [...h.slice(-4), { q, ...res.data.data }]);
      setQuestion("");
    } catch (err) {
      setError(err?.response?.data?.message || "The assistant could not answer right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="AI Sales Assistant"
        className="fixed bottom-5 right-5 z-[90] flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20 transition hover:bg-slate-800"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-[90] flex max-h-[70vh] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles size={16} className="text-brand-600" /> AI Sales Assistant
            </p>
            <p className="text-xs text-slate-500">Answers from your pipeline and lead totals.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!history.length && !loading && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Try asking:</p>
                {EXAMPLES.map((e) => (
                  <button key={e} type="button" onClick={() => ask(e)} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    {e}
                  </button>
                ))}
              </div>
            )}

            {history.map((item, i) => (
              <div key={i} className="space-y-2">
                <p className="ml-auto w-fit max-w-[85%] rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">{item.q}</p>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p className="whitespace-pre-line">{item.answer}</p>
                  {item.suggestedActions?.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5">
                      {item.suggestedActions.map((a, j) => <li key={j}>{a}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            {loading && <div className="h-16 animate-pulse rounded-xl bg-slate-100" />}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="flex gap-2 border-t border-slate-200 p-3"
          >
            <input
              className="input"
              maxLength={500}
              placeholder="Ask about your pipeline…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit" disabled={loading || !question.trim()} className="btn btn-primary">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
