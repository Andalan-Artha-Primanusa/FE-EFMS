import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
      {icon && <div className="text-slate-300 mb-1">{icon}</div>}
      <p className="font-bold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Tidak dapat memuat data",
  message,
  onRetry
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
      <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-black">!</div>
      <p className="font-bold text-slate-700">{title}</p>
      {message && <p className="text-sm text-slate-500 max-w-md">{message}</p>}
      {onRetry && (
        <button className="ghost compact mt-3" onClick={onRetry}>Coba Lagi</button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-wrap w-full overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3 px-4">
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="py-3.5 px-4">
                  <div className={`h-3 rounded bg-slate-100 animate-pulse ${c === 0 ? "w-24" : c % 2 ? "w-32" : "w-20"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
