import type { ReactNode } from "react";

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T>({ 
  data, 
  columns, 
  keyExtractor,
  emptyMessage = "No data available.",
  loading = false
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="table-wrap p-8 text-center text-slate-500">
        <p className="animate-pulse">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="table-wrap w-full overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index} 
                className={`py-3 px-4 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={keyExtractor(row, rowIndex)} className="hover:bg-slate-50/50 transition-colors">
                {columns.map((col, colIndex) => {
                  let content: ReactNode = null;
                  if (col.cell) {
                    content = col.cell(row);
                  } else if (col.accessorKey) {
                    content = String((row as any)[col.accessorKey] ?? "");
                  }
                  
                  return (
                    <td 
                      key={colIndex} 
                      className={`py-3 px-4 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.className ?? ""}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-8 px-4 text-center text-slate-500 italic">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function statusClass(status: string) {
  const norm = status?.toLowerCase() || "";
  if (["approved", "available", "paid", "posted", "active"].includes(norm)) return "ok";
  if (["warning", "waiting approval", "submitted", "draft"].includes(norm)) return "wait";
  if (["rejected", "blocked", "overdue", "void"].includes(norm)) return "bad";
  return "neutral";
}
