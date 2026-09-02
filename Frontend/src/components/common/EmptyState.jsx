import { SearchX } from "lucide-react";

export default function EmptyState({
  title = "No records found",
  description = "There are no records to display.",
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-2xl bg-slate-100 p-4">
        <SearchX className="text-slate-400" size={30} />
      </div>

      <h3 className="text-lg font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}