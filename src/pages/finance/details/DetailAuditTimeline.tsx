import React, { useEffect, useState } from "react";
import { History, User } from "lucide-react";
import { generateAuditTimeline } from "../helpers";
import { api } from "../../../lib/api";

interface DetailAuditTimelineProps {
  type: string;
  data: any;
}

// Riwayat dari log audit server (snapshot before/after), bukan timeline turunan field dokumen.
const AUDIT_ENDPOINTS: Record<string, string> = { customer: "customers", payment: "payments" };
const ACTION_LABELS: Record<string, string> = { save: "Disimpan", delete: "Dihapus", verify: "Diverifikasi" };

/** Field yang berubah antara snapshot before & after (mis. "terminDays: 30 → 45"). */
function changedFields(before: any, after: any): string {
  if (!before || !after) return "";
  return Object.keys(after)
    .filter((k) => !/At$/.test(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => `${k}: ${JSON.stringify(before[k] ?? "-")} → ${JSON.stringify(after[k])}`)
    .join("; ");
}

export const DetailAuditTimeline: React.FC<DetailAuditTimelineProps> = ({
  type,
  data
}) => {
  const endpoint = AUDIT_ENDPOINTS[type];
  const [serverLogs, setServerLogs] = useState<any[] | null>(null);

  useEffect(() => {
    if (!endpoint || !data?.id) return;
    setServerLogs(null);
    api<any[]>(`/api/finance/${endpoint}/${data.id}/audit-logs`)
      .then((rows) => setServerLogs(Array.isArray(rows) ? rows : []))
      .catch(() => setServerLogs([]));
  }, [endpoint, data?.id]);

  const timelineLogs = endpoint
    ? (serverLogs || [])
        .slice()
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .map((l) => ({
          title: l.action === "save" ? (l.before ? "Data Diperbarui" : "Data Dibuat") : ACTION_LABELS[l.action] || l.action,
          user: l.user,
          role: l.module,
          time: l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID") : "-",
          status: l.action === "delete" ? "rejected" : "completed",
          desc: changedFields(l.before, l.after) || (l.before ? "Tidak ada perubahan field." : `IP ${l.ipAddress || "-"}`),
        }))
    : generateAuditTimeline(type, data);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1612] flex items-center gap-1.5">
          <History size={16} className="text-[#A57C50]" /> Audit Trail & Flow Tracking
        </h4>
        <span className="text-[11px] text-slate-400 font-bold">Jejak Aktivitas User</span>
      </div>

      {endpoint && (serverLogs === null || timelineLogs.length === 0) && (
        <p className="text-[11px] text-slate-500 italic">
          {serverLogs === null ? "Memuat log audit..." : "Belum ada log audit tercatat untuk data ini."}
        </p>
      )}

      {/* Vertical Stepper Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {timelineLogs.map((log: any, idx: number) => {
          let circleColor = "bg-[#A57C50] text-white shadow-xs ring-2 ring-[#A57C50]/20";
          if (log.status === "pending") circleColor = "bg-slate-200 text-slate-500 ring-0";
          else if (log.status === "warning") circleColor = "bg-amber-600 text-white ring-2 ring-amber-200";
          else if (log.status === "rejected") circleColor = "bg-rose-700 text-white ring-2 ring-rose-200";

          return (
            <div key={idx} className="relative group">
              {/* Circle Node */}
              <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${circleColor}`}>
                {idx + 1}
              </div>

              {/* Log Content Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-3 shadow-xs space-y-1">
                <div className="flex justify-between items-start">
                  <h5 className="font-extrabold text-slate-900 text-xs">{log.title}</h5>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{log.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <User size={12} className="text-[#A57C50]" />
                  <span className="font-bold text-slate-900">{log.user}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-[3px] bg-slate-100 border border-slate-200 text-slate-700 font-bold">{log.role}</span>
                </div>
                <p className="text-[11px] text-slate-600 pt-0.5 font-medium leading-relaxed break-words">{log.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
