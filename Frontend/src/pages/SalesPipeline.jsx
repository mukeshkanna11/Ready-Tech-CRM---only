import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Kanban,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";

import API from "../services/api";

// List API caps limit at 100; load up to MAX_PAGES pages for the board.
const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

const STAGE_ACCENTS = {
  QUALIFICATION: "border-t-slate-400",
  DISCOVERY: "border-t-blue-500",
  PROPOSAL: "border-t-violet-500",
  NEGOTIATION: "border-t-amber-500",
  CLOSED_WON: "border-t-emerald-500",
  CLOSED_LOST: "border-t-rose-500",
};

const PRIORITY_CLASSES = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-amber-50 text-amber-700",
  URGENT: "bg-rose-50 text-rose-700",
};

const getError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

const formatMoney = (value, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  } catch {
    return `${currency || ""} ${Number(value) || 0}`;
  }
};

const personName = (person) =>
  person?.name ||
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
  "";

export default function SalesPipeline() {
  const [stages, setStages] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const stageResponse = await API.get("/pipeline-stages");
      const stageData = stageResponse?.data?.data;

      const items = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await API.get("/opportunities", {
          params: { page, limit: PAGE_LIMIT },
        });
        const data = response?.data?.data;
        if (Array.isArray(data)) items.push(...data);
        totalPages = response?.data?.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages && page <= MAX_PAGES);

      if (totalPages > MAX_PAGES) {
        setNotice(
          `Showing the latest ${MAX_PAGES * PAGE_LIMIT} opportunities.`
        );
      }

      setStages(Array.isArray(stageData) ? stageData : []);
      setOpportunities(items);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Active stages + inactive stages that still hold opportunities.
  const columns = useMemo(
    () =>
      stages.filter(
        (stage) =>
          stage.isActive ||
          opportunities.some((item) => item.stage === stage.key)
      ),
    [stages, opportunities]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return opportunities;

    return opportunities.filter((item) =>
      [
        item.name,
        item.company?.name,
        personName(item.contact),
        personName(item.owner),
      ]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(term))
    );
  }, [opportunities, search]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(columns.map((stage) => [stage.key, []]));
    filtered.forEach((item) => {
      if (map[item.stage]) map[item.stage].push(item);
    });
    return map;
  }, [columns, filtered]);

  const moveOpportunity = async (id, stageKey) => {
    const target = opportunities.find((item) => item._id === id);
    if (!target || target.stage === stageKey) return;

    const previous = target.stage;
    setError("");
    setSavingId(id);

    // Optimistic move; revert if the API rejects it.
    setOpportunities((list) =>
      list.map((item) =>
        item._id === id ? { ...item, stage: stageKey } : item
      )
    );

    try {
      const response = await API.patch(`/opportunities/${id}/stage`, {
        stage: stageKey,
      });
      const updated = response?.data?.data;
      if (updated?._id) {
        setOpportunities((list) =>
          list.map((item) => (item._id === id ? updated : item))
        );
      }
    } catch (err) {
      setOpportunities((list) =>
        list.map((item) =>
          item._id === id ? { ...item, stage: previous } : item
        )
      );
      setError(getError(err));
    } finally {
      setSavingId(null);
    }
  };

  const handleDrop = (event, stage) => {
    event.preventDefault();
    setOverStage(null);
    const id = event.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (id && stage.isActive) moveOpportunity(id, stage.key);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Kanban className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Sales Pipeline
            </h1>
            <p className="text-sm text-slate-500">
              Drag opportunities between stages to update them.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals, companies, owners"
              className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            onClick={loadBoard}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            to="/opportunities"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Manage Opportunities
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400">
          Loading pipeline...
        </div>
      ) : columns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400">
          No pipeline stages configured.
        </div>
      ) : (
        <>
          {opportunities.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              No opportunities yet.{" "}
              <Link to="/opportunities" className="font-semibold text-indigo-600">
                Create one
              </Link>{" "}
              to start your pipeline.
            </div>
          )}

          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((stage) => {
              const items = grouped[stage.key] || [];
              const total = items.reduce(
                (sum, item) => sum + (Number(item.value) || 0),
                0
              );
              const isOver = overStage === stage.key && stage.isActive;

              return (
                <div
                  key={stage._id}
                  onDragOver={(e) => {
                    if (!stage.isActive) return;
                    e.preventDefault();
                    setOverStage(stage.key);
                  }}
                  onDragLeave={() => setOverStage(null)}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`flex w-72 shrink-0 flex-col rounded-2xl border border-t-4 bg-slate-50 ${
                    STAGE_ACCENTS[stage.key] || "border-t-indigo-400"
                  } ${isOver ? "border-indigo-300 bg-indigo-50" : "border-slate-200"} ${
                    stage.isActive ? "" : "opacity-70"
                  }`}
                >
                  <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">
                        {stage.name}
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatMoney(total)}
                      {!stage.isActive && " · Inactive"}
                    </p>
                  </div>

                  <div className="flex min-h-[200px] flex-1 flex-col gap-3 p-3">
                    {items.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">
                        {stage.isActive ? "Drop deals here" : "No deals"}
                      </p>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item._id}
                          draggable={savingId !== item._id}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item._id);
                            e.dataTransfer.effectAllowed = "move";
                            setDragId(item._id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setOverStage(null);
                          }}
                          className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
                            dragId === item._id || savingId === item._id
                              ? "opacity-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                              {item.name || "Untitled"}
                            </p>
                            {item.priority && (
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  PRIORITY_CLASSES[item.priority] ||
                                  PRIORITY_CLASSES.LOW
                                }`}
                              >
                                {item.priority}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-base font-bold text-indigo-600">
                            {formatMoney(item.value, item.currency)}
                            {item.probability !== undefined &&
                              item.probability !== null && (
                                <span className="ml-2 text-xs font-medium text-slate-400">
                                  {item.probability}%
                                </span>
                              )}
                          </p>

                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            {item.company?.name && (
                              <p className="flex items-center gap-1.5 truncate">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                {item.company.name}
                              </p>
                            )}
                            {personName(item.owner) && (
                              <p className="flex items-center gap-1.5 truncate">
                                <UserRound className="h-3.5 w-3.5 shrink-0" />
                                {personName(item.owner)}
                              </p>
                            )}
                            {item.expectedCloseDate && (
                              <p className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                {new Date(
                                  item.expectedCloseDate
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
