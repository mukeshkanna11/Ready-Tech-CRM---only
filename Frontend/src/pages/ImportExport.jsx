import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Upload,
} from "lucide-react";
import API from "../services/api";

// CSV import/export via /data/:entity/{export,template,import}.

const ENTITIES = [
  { key: "leads", name: "Leads" },
  { key: "contacts", name: "Contacts" },
  { key: "companies", name: "Companies" },
];

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const errorMessage = async (err, fallback) => {
  const data = err?.response?.data;
  // Blob responses (export) carry the JSON error as a Blob.
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || err?.message || fallback;
};

const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const buttonClass =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export default function ImportExport() {
  const [entity, setEntity] = useState("leads");
  const [file, setFile] = useState(null);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const download = async (path, fallbackName) => {
    try {
      setBusy(true);
      setError("");
      const response = await API.get(path, { responseType: "blob" });
      const name =
        /filename="([^"]+)"/.exec(response.headers["content-disposition"] || "")?.[1] ||
        fallbackName;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(await errorMessage(err, "Download failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (selected) => {
    setResult(null);
    setError("");
    setCsv("");
    setFile(selected || null);
    if (!selected) return;

    if (!/\.csv$/i.test(selected.name)) {
      setError("Please choose a .csv file");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("CSV file must be smaller than 2 MB");
      return;
    }

    selected.text().then(setCsv);
  };

  const runImport = async (dryRun) => {
    try {
      setBusy(true);
      setError("");
      const response = await API.post(
        `/data/${entity}/import${dryRun ? "?dryRun=true" : ""}`,
        { csv }
      );
      setResult({ ...response.data.data, message: response.data.message });
    } catch (err) {
      setError(await errorMessage(err, "Import failed"));
    } finally {
      setBusy(false);
    }
  };

  const entityName = ENTITIES.find((e) => e.key === entity)?.name;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Import / Export</h1>
              <p className="text-sm text-slate-400">
                Move CRM records in and out as CSV
              </p>
            </div>
          </div>

          <div className="flex gap-2 rounded-2xl bg-white/10 p-1">
            {ENTITIES.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setEntity(item.key);
                  setResult(null);
                  setError("");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  entity === item.key
                    ? "bg-white text-slate-900"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-slate-900">Export {entityName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Download all {entityName?.toLowerCase()} you can access as a CSV file
            (up to 10,000 rows).
          </p>
          <button
            onClick={() => download(`/data/${entity}/export`, `${entity}.csv`)}
            disabled={busy}
            className={`${buttonClass} mt-5 bg-slate-900 text-white hover:bg-slate-800`}
          >
            <Download size={17} />
            Export CSV
          </button>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-bold text-slate-900">Import {entityName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each row is checked on its own. Valid rows are saved; rows with errors
            or duplicates are skipped and listed below.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() =>
                download(`/data/${entity}/template`, `${entity}-template.csv`)
              }
              disabled={busy}
              className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <FileSpreadsheet size={17} />
              Download template
            </button>

            <label
              className={`${buttonClass} cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <FileUp size={17} />
              {file ? file.name : "Choose CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => runImport(true)}
              disabled={busy || !csv}
              className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <CheckCircle2 size={17} />
              Validate
            </button>
            <button
              onClick={() => runImport(false)}
              disabled={busy || !csv}
              className={`${buttonClass} bg-slate-900 text-white hover:bg-slate-800`}
            >
              <Upload size={17} />
              {busy ? "Working..." : "Import"}
            </button>
          </div>
        </section>
      </div>

      {result && (
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-slate-900">
            {result.dryRun ? "Validation result" : "Import result"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{result.message}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Rows</p>
              <p className="text-2xl font-bold text-slate-900">{result.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">
                {result.dryRun ? "Valid" : "Imported"}
              </p>
              <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs text-rose-700">Errors</p>
              <p className="text-2xl font-bold text-rose-700">
                {result.failed.length}
              </p>
            </div>
          </div>

          {result.failed.length > 0 && (
            <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Row</th>
                    <th className="px-4 py-2">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.failed.map((item) => (
                    <tr key={item.row}>
                      <td className="px-4 py-2 font-semibold text-slate-700">
                        {item.row}
                      </td>
                      <td className="px-4 py-2 text-rose-700">
                        {item.errors.join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
