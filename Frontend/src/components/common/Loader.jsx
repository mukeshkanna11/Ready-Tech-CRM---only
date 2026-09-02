export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

      <p className="text-sm font-medium text-slate-500">
        {text}
      </p>
    </div>
  );
}